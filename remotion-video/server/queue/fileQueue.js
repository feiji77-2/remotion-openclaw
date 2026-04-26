/**
 * 文件版任务队列（仅限本地开发）
 *
 * 任务状态保存在私有 runtime/jobs/ 目录，不再暴露到 public/。
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {JOBS_DIR, ensureDir} = require('../config/runtimePaths');
const {createLogger} = require('../utils/logger');

ensureDir(JOBS_DIR);
const logger = createLogger({scope: 'file-queue'});

const DEFAULT_POLL_INTERVAL_MS = 1000;
const MAX_POLL_INTERVAL_MS = 5000;
const IDLE_BACKOFF_FACTOR = 1.5;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;

function sortJobsByCreatedAt(jobs, direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...jobs].sort((left, right) => {
    const leftTime = Date.parse(left?.createdAt || 0);
    const rightTime = Date.parse(right?.createdAt || 0);
    return (leftTime - rightTime) * multiplier;
  });
}

function resolveNextIdlePollDelay(previousDelayMs = DEFAULT_POLL_INTERVAL_MS) {
  return Math.min(
    MAX_POLL_INTERVAL_MS,
    Math.max(DEFAULT_POLL_INTERVAL_MS, Math.round(previousDelayMs * IDLE_BACKOFF_FACTOR)),
  );
}

// ─── 添加任务 ─────────────────────────────────────────────
function addJob(jobType, data) {
  const jobId = `job_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const job = {
    id: jobId,
    type: jobType,
    data,
    status: 'pending',  // pending | running | done | error
    progress: 0,
    progressMsg: '等待执行',
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };

  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  logger.info('job-enqueued', {jobId, jobType});
  return jobId;
}

// ─── 查询任务 ─────────────────────────────────────────────
function getJob(jobId) {
  const p = getJobPath(jobId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getJobPath(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function removeJob(jobId) {
  const jobPath = getJobPath(jobId);
  if (!fs.existsSync(jobPath)) {
    return false;
  }
  fs.unlinkSync(jobPath);
  return true;
}

// ─── 更新进度 ─────────────────────────────────────────────
function updateProgress(jobId, progress, msg) {
  const job = getJob(jobId);
  if (!job) return;
  job.progress = progress;
  job.progressMsg = msg;
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
}

// ─── 完成任务 ─────────────────────────────────────────────
function completeJob(jobId, result) {
  const job = getJob(jobId);
  if (!job) return;
  job.status = 'done';
  job.progress = 100;
  job.progressMsg = '完成';
  job.result = result;
  job.completedAt = new Date().toISOString();
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  logger.info('job-completed', {jobId});
}

// ─── 标记错误 ─────────────────────────────────────────────
function failJob(jobId, error) {
  const job = getJob(jobId);
  if (!job) return;
  job.status = 'error';
  job.error = error;
  job.completedAt = new Date().toISOString();
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  logger.error('job-failed', {jobId, error});
}

function retryJob(jobId) {
  const job = getJob(jobId);
  if (!job) {
    return false;
  }
  job.status = 'pending';
  job.progress = 0;
  job.progressMsg = '等待重试';
  job.result = null;
  job.error = null;
  job.startedAt = null;
  job.completedAt = null;
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2));
  return true;
}

// ─── 列出所有任务 ─────────────────────────────────────────
function listJobs(filterStatus) {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs = files.map(f => {
    const job = JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), 'utf8'));
    delete job.data; // 不返回完整数据，节省带宽
    return job;
  });

  if (filterStatus) {
    const filtered = jobs.filter(j => j.status === filterStatus);
    return sortJobsByCreatedAt(filtered, filterStatus === 'pending' ? 'asc' : 'desc');
  }
  return sortJobsByCreatedAt(jobs, 'desc');
}

// ─── 轮询 worker ─────────────────────────────────────────
/**
 * 简单轮询 worker（适合单进程）
 * 文件变更优先唤醒，空闲时使用退避轮询
 */
function startSimpleWorker(handlers = {}) {
  logger.info('worker-started', {
    mode: 'file',
    strategy: 'adaptive-polling-fs-watch',
    defaultPollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
  });
  let isProcessing = false;
  let isStopped = false;
  let idlePollDelayMs = DEFAULT_POLL_INTERVAL_MS;
  let timer = null;
  let watcher = null;
  let activeJobId = null;
  let activeRun = null;

  const schedule = (delayMs) => {
    if (isStopped) {
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(runLoop, Math.max(0, delayMs));
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  };

  const wake = () => {
    idlePollDelayMs = DEFAULT_POLL_INTERVAL_MS;
    if (!isProcessing) {
      schedule(0);
    }
  };

  const runLoop = () => {
    if (isStopped) {
      return;
    }
    if (isProcessing) {
      schedule(DEFAULT_POLL_INTERVAL_MS);
      return;
    }
    const jobs = listJobs('pending');
    if (jobs.length === 0) {
      idlePollDelayMs = resolveNextIdlePollDelay(idlePollDelayMs);
      schedule(idlePollDelayMs);
      return;
    }

    const job = jobs[0];
    const handler = handlers[job.type];

    if (typeof handler !== 'function') {
      failJob(job.id, `No handler registered for job type: ${job.type}`);
      schedule(0);
      return;
    }

    logger.info('job-processing', {jobId: job.id, jobType: job.type});

    // 标记为运行中
    const fullJob = getJob(job.id);
    if (!fullJob) {
      schedule(0);
      return;
    }
    fullJob.status = 'running';
    fullJob.startedAt = new Date().toISOString();
    fs.writeFileSync(getJobPath(job.id), JSON.stringify(fullJob, null, 2));
    isProcessing = true;
    idlePollDelayMs = DEFAULT_POLL_INTERVAL_MS;
    activeJobId = job.id;

    // 执行处理函数
    activeRun = Promise.resolve()
      .then(() => handler(fullJob, (pct, msg) => updateProgress(job.id, pct, msg)))
      .then(result => completeJob(job.id, result))
      .catch(err => failJob(job.id, err.message))
      .finally(() => {
        isProcessing = false;
        activeJobId = null;
        activeRun = null;
        if (!isStopped) {
          schedule(0);
        }
      });
  };

  try {
    watcher = fs.watch(JOBS_DIR, {persistent: false}, () => {
      wake();
    });
    watcher.on('error', (error) => {
      logger.warn('watch-degraded', {error});
    });
  } catch (error) {
    logger.warn('watch-unavailable', {error});
  }

  schedule(0);

  return {
    getState() {
      return {
        isProcessing,
        isStopped,
        activeJobId,
        idlePollDelayMs,
      };
    },
    async stop({
      graceful = true,
      timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
    } = {}) {
      const normalizedTimeoutMs = Math.max(0, Number(timeoutMs) || DEFAULT_SHUTDOWN_TIMEOUT_MS);

      if (!isStopped) {
        isStopped = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (watcher) {
          watcher.close();
          watcher = null;
        }
        logger.info('worker-stopping', {
          mode: 'file',
          graceful,
          timeoutMs: normalizedTimeoutMs,
          activeJobId,
        });
      }

      if (!graceful || !activeRun) {
        logger.info('worker-stopped', {
          mode: 'file',
          graceful,
          timedOut: false,
          activeJobId: activeRun ? activeJobId : null,
        });
        return {
          timedOut: false,
          activeJobId: activeRun ? activeJobId : null,
        };
      }

      const currentActiveJobId = activeJobId;
      let timedOut = false;
      let shutdownTimer = null;
      await Promise.race([
        activeRun,
        new Promise((resolve) => {
          shutdownTimer = setTimeout(() => {
            timedOut = true;
            resolve();
          }, normalizedTimeoutMs);
          if (typeof shutdownTimer.unref === 'function') {
            shutdownTimer.unref();
          }
        }),
      ]);
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }

      logger.info('worker-stopped', {
        mode: 'file',
        graceful,
        timedOut,
        activeJobId: timedOut ? currentActiveJobId : null,
      });

      return {
        timedOut,
        activeJobId: timedOut ? currentActiveJobId : null,
      };
    },
  };
}

module.exports = {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  MAX_POLL_INTERVAL_MS,
  resolveNextIdlePollDelay,
  sortJobsByCreatedAt,
  addJob,
  getJob,
  updateProgress,
  completeJob,
  failJob,
  removeJob,
  retryJob,
  listJobs,
  startSimpleWorker,
  JOBS_DIR,
};
