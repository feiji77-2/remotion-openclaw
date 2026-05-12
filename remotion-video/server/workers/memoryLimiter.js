const { createLogger } = require('../utils/logger');
const logger = createLogger({ scope: 'memory-limiter' });

const TOTAL_MEMORY_LIMIT_MB = Number(process.env.PIPELINE_MEMORY_LIMIT_MB || '4096');
const PER_PROCESS_MEMORY_LIMIT_MB = Number(process.env.PIPELINE_PROCESS_MEMORY_MB || '2048');
const CHECK_INTERVAL_MS = Number(process.env.PIPELINE_MEMORY_CHECK_MS || '5000');
const SIGKILL_GRACE_MS = Number(process.env.PIPELINE_MEMORY_KILL_GRACE_MS || '10000');

const trackedProcesses = new Map();
let monitoringInterval = null;
let isShuttingDown = false;

function trackProcess(proc, label) {
  const pid = proc.pid;
  trackedProcesses.set(String(pid), {
    proc, pid, label: String(label || 'unknown'),
    startTime: Date.now(), rssMb: 0, killed: false,
  });
  logger.info('process-tracked', { pid, label });
  proc.once('close', () => {
    trackedProcesses.delete(String(pid));
    logger.info('process-untracked', { pid, label });
  });
}

function readProcessRssMb(pid) {
  try {
    const { execSync } = require('child_process');
    const stdout = execSync(`ps -o rss= -p ${pid}`, {
      encoding: 'utf8', timeout: 2000, killSignal: 'SIGTERM',
    });
    const rssKb = Number(String(stdout || '').trim());
    return Number.isFinite(rssKb) && rssKb > 0 ? Math.round(rssKb / 1024) : 0;
  } catch { return 0; }
}

function updateMemoryStats() {
  for (const entry of trackedProcesses.values()) {
    if (!entry.killed) entry.rssMb = readProcessRssMb(entry.pid);
  }
}

function getTotalRssMb() {
  let total = 0;
  for (const entry of trackedProcesses.values()) total += entry.rssMb || 0;
  return total;
}

function killProcess(pid, signal = 'SIGTERM') {
  const entry = trackedProcesses.get(String(pid));
  if (!entry || entry.killed) return false;
  try {
    entry.proc.kill(signal);
    entry.killed = true;
    logger.warn('process-killed', { pid, label: entry.label, signal, rssMb: entry.rssMb });
    return true;
  } catch (err) {
    logger.error('process-kill-failed', { pid, error: err.message });
    return false;
  }
}

function enforceMemoryLimit() {
  if (trackedProcesses.size === 0 || isShuttingDown) return null;
  updateMemoryStats();
  const totalMb = getTotalRssMb();
  if (totalMb <= TOTAL_MEMORY_LIMIT_MB) return null;

  logger.warn('memory-limit-exceeded', { totalRssMb: totalMb, limitMb: TOTAL_MEMORY_LIMIT_MB, trackedCount: trackedProcesses.size });

  let maxPid = null, maxRss = -1, maxStartTime = Infinity;
  for (const [pid, entry] of trackedProcesses.entries()) {
    if (entry.killed) continue;
    if (entry.rssMb > PER_PROCESS_MEMORY_LIMIT_MB && entry.startTime < maxStartTime) {
      maxPid = pid; maxRss = entry.rssMb; maxStartTime = entry.startTime;
    }
  }
  if (!maxPid) {
    for (const [pid, entry] of trackedProcesses.entries()) {
      if (entry.killed) continue;
      if (entry.rssMb > maxRss) { maxPid = pid; maxRss = entry.rssMb; }
    }
  }
  if (maxPid) {
    killProcess(maxPid, 'SIGTERM');
    setTimeout(() => {
      const entry = trackedProcesses.get(String(maxPid));
      if (entry && !entry.killed) killProcess(maxPid, 'SIGKILL');
    }, SIGKILL_GRACE_MS);
    return maxPid;
  }
  return null;
}

function startMonitoring() {
  if (monitoringInterval) return;
  monitoringInterval = setInterval(() => { enforceMemoryLimit(); }, CHECK_INTERVAL_MS);
  monitoringInterval.unref();
  logger.info('memory-monitoring-started', { totalLimitMb: TOTAL_MEMORY_LIMIT_MB, perProcessLimitMb: PER_PROCESS_MEMORY_LIMIT_MB });
}

function stopMonitoring() {
  if (monitoringInterval) { clearInterval(monitoringInterval); monitoringInterval = null; }
}

function getMemoryStats() {
  updateMemoryStats();
  return {
    totalRssMb: getTotalRssMb(), limitMb: TOTAL_MEMORY_LIMIT_MB,
    perProcessLimitMb: PER_PROCESS_MEMORY_LIMIT_MB,
    trackedCount: trackedProcesses.size,
    processes: Array.from(trackedProcesses.entries()).map(([pid, entry]) => ({
      pid, label: entry.label, rssMb: entry.rssMb,
      startTime: entry.startTime, killed: entry.killed,
    })),
  };
}

async function shutdownAll(timeoutMs = 10000) {
  isShuttingDown = true;
  stopMonitoring();
  if (trackedProcesses.size === 0) return { killed: 0 };
  let count = 0;
  for (const entry of trackedProcesses.values()) {
    if (!entry.killed) { killProcess(entry.pid, 'SIGTERM'); count++; }
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      for (const entry of trackedProcesses.values()) {
        if (!entry.killed) { killProcess(entry.pid, 'SIGKILL'); count++; }
      }
      isShuttingDown = false;
      resolve({ killed: count, timedOut: true });
    }, timeoutMs);
    const checkDone = () => {
      const alive = Array.from(trackedProcesses.values()).filter(e => !e.killed).length;
      if (alive === 0) { clearTimeout(timer); isShuttingDown = false; resolve({ killed: count, timedOut: false }); }
      else setTimeout(checkDone, 100);
    };
    setTimeout(checkDone, 500);
  });
}

// P2: 前置限流 API — 在渲染任务开始前检查内存是否就绪

/**
 * 前置限流：检查是否能接受新的渲染任务
 * @returns {{ accept: boolean, reason?: string }}
 */
function canAcceptRender() {
  if (isShuttingDown) {
    return { accept: false, reason: 'worker-shutting-down' };
  }
  updateMemoryStats();
  const totalMb = getTotalRssMb();
  const highWaterMark = Number(process.env.PIPELINE_MEMORY_HIGH_WATER || '0.85');
  const limitMb = TOTAL_MEMORY_LIMIT_MB * highWaterMark;
  if (totalMb >= limitMb) {
    return {
      accept: false,
      reason: `memory-pressure ${totalMb}MB >= ${Math.round(limitMb)}MB (${Math.round(highWaterMark * 100)}% high water)`,
    };
  }
  return { accept: true };
}

/**
 * 根据当前内存状态推荐并发数
 * @param {number} maxConcurrency - 配置的最大并发数
 * @returns {number}
 */
function getRecommendedConcurrency(maxConcurrency) {
  updateMemoryStats();
  const totalMb = getTotalRssMb();
  const usedPct = totalMb / TOTAL_MEMORY_LIMIT_MB;
  if (usedPct < 0.5) return maxConcurrency;
  if (usedPct < 0.7) return Math.max(1, Math.floor(maxConcurrency * 0.8));
  if (usedPct < 0.85) return Math.max(1, Math.floor(maxConcurrency * 0.5));
  return 1; // 串行安全模式
}

/**
 * 等待内存就绪
 * @param {number} intervalMs
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} true=就绪, false=超时
 */
async function waitForMemory(intervalMs = 3000, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (canAcceptRender().accept) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

module.exports = {
  trackProcess,
  startMonitoring,
  stopMonitoring,
  getMemoryStats,
  shutdownAll,
  enforceMemoryLimit,
  canAcceptRender,
  getRecommendedConcurrency,
  waitForMemory,
  TOTAL_MEMORY_LIMIT_MB,
  PER_PROCESS_MEMORY_LIMIT_MB,
};
