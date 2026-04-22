import {spawn} from 'node:child_process';
import {closeSync, openSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_XTTS_HEALTH_URL = 'http://127.0.0.1:18083/health';
const DEFAULT_HEALTH_TIMEOUT_MS = 4000;
const DEFAULT_WAIT_TIMEOUT_MS = 300000;
const DEFAULT_POLL_INTERVAL_MS = 2000;

export const XTTS_START_SCRIPT_PATH = path.join(REMOTION_ROOT, 'scripts', 'voice', 'start-xtts-server.sh');
export const XTTS_LOG_PATH = path.join(REMOTION_ROOT, 'runtime', 'logs', 'xtts-server.log');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const resolveXttsHealthUrl = () => process.env.XTTS_HTTP_HEALTH_URL || DEFAULT_XTTS_HEALTH_URL;

const buildFetchOptions = (timeoutMs) => {
  if (timeoutMs > 0 && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return {signal: AbortSignal.timeout(timeoutMs)};
  }
  return {};
};

export const summarizeVoiceHealthProbe = (probe) => {
  if (!probe) {
    return '未知状态';
  }

  if (probe.state === 'ready') {
    return '服务可用';
  }

  if (probe.payload?.error) {
    return String(probe.payload.error);
  }

  if (probe.payload?.message) {
    return String(probe.payload.message);
  }

  if (probe.error?.message) {
    return String(probe.error.message);
  }

  if (probe.responseStatus) {
    return `HTTP ${probe.responseStatus}`;
  }

  return probe.message || probe.state || '未知错误';
};

export async function probeVoiceService(healthUrl, {fetchImpl = fetch, timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS} = {}) {
  try {
    const response = await fetchImpl(healthUrl, buildFetchOptions(timeoutMs));
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const status = String(payload?.status || '').trim().toLowerCase();

    if (response.ok && status === 'ok') {
      return {
        state: 'ready',
        reachable: true,
        responseStatus: response.status,
        payload,
      };
    }

    if (status === 'loading') {
      return {
        state: 'loading',
        reachable: true,
        responseStatus: response.status,
        payload,
      };
    }

    if (status === 'error') {
      return {
        state: 'error',
        reachable: true,
        responseStatus: response.status,
        payload,
      };
    }

    return {
      state: 'unhealthy',
      reachable: true,
      responseStatus: response.status,
      payload,
      message: `unexpected health payload: ${JSON.stringify(payload)}`,
    };
  } catch (error) {
    return {
      state: 'unreachable',
      reachable: false,
      error,
      message: error?.message || String(error),
    };
  }
}

export async function waitForVoiceServiceReady({
  serviceName,
  healthUrl,
  update,
  timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetchImpl = fetch,
  sleepImpl = sleep,
} = {}) {
  const startedAt = Date.now();
  let lastProbe = null;

  while ((Date.now() - startedAt) <= timeoutMs) {
    lastProbe = await probeVoiceService(healthUrl, {fetchImpl});

    if (lastProbe.state === 'ready') {
      return lastProbe;
    }

    if (lastProbe.state === 'error') {
      throw new Error(`${serviceName} 启动失败：${summarizeVoiceHealthProbe(lastProbe)}`);
    }

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    update?.(`${serviceName} 启动中，等待服务就绪... ${elapsedSeconds}s`);
    await sleepImpl(pollIntervalMs);
  }

  throw new Error(`${serviceName} 启动超时：${summarizeVoiceHealthProbe(lastProbe)}`);
}

const deriveStartupEnvFromHealthUrl = (healthUrl, baseEnv) => {
  const nextEnv = {};

  try {
    const parsed = new URL(healthUrl);
    if (!baseEnv.XTTS_HOST) {
      nextEnv.XTTS_HOST = parsed.hostname;
    }
    if (!baseEnv.XTTS_PORT) {
      nextEnv.XTTS_PORT = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    }
  } catch {
    // Ignore invalid custom health URLs and fall back to the script defaults.
  }

  return nextEnv;
};

export async function startXttsBackgroundService({
  cwd = REMOTION_ROOT,
  scriptPath = XTTS_START_SCRIPT_PATH,
  logPath = XTTS_LOG_PATH,
  healthUrl = resolveXttsHealthUrl(),
  env = process.env,
  spawnImpl = spawn,
  mkdirImpl = fs.mkdir,
  openLogFdImpl = openSync,
  closeLogFdImpl = closeSync,
} = {}) {
  await mkdirImpl(path.dirname(logPath), {recursive: true});

  const logFd = openLogFdImpl(logPath, 'a');

  try {
    const child = spawnImpl('bash', [scriptPath], {
      cwd,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      shell: false,
      env: {
        ...process.env,
        ...env,
        ...deriveStartupEnvFromHealthUrl(healthUrl, env || process.env),
      },
    });

    child.unref?.();

    return {
      pid: child.pid || null,
      logPath,
    };
  } finally {
    closeLogFdImpl(logFd);
  }
}

export async function ensureXttsServiceReady({
  update,
  healthUrl = resolveXttsHealthUrl(),
  timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetchImpl = fetch,
  sleepImpl = sleep,
  spawnImpl = spawn,
  mkdirImpl = fs.mkdir,
  openLogFdImpl = openSync,
  closeLogFdImpl = closeSync,
  env = process.env,
} = {}) {
  update?.('检查 XTTS 服务...');
  const initialProbe = await probeVoiceService(healthUrl, {fetchImpl});

  if (initialProbe.state === 'ready') {
    return {
      started: false,
      pid: null,
      logPath: XTTS_LOG_PATH,
      health: initialProbe.payload,
    };
  }

  if (initialProbe.state === 'error') {
    throw new Error(`XTTS 当前处于错误状态：${summarizeVoiceHealthProbe(initialProbe)}`);
  }

  let startup = {
    pid: null,
    logPath: XTTS_LOG_PATH,
  };

  if (initialProbe.state === 'unreachable') {
    update?.('XTTS 未启动，自动拉起本地服务...');
    startup = await startXttsBackgroundService({
      healthUrl,
      env,
      spawnImpl,
      mkdirImpl,
      openLogFdImpl,
      closeLogFdImpl,
    });
  } else {
    update?.('XTTS 已在运行，等待模型加载完成...');
  }

  const readyProbe = await waitForVoiceServiceReady({
    serviceName: 'XTTS',
    healthUrl,
    update,
    timeoutMs,
    pollIntervalMs,
    fetchImpl,
    sleepImpl,
  });

  return {
    started: initialProbe.state === 'unreachable',
    pid: startup.pid,
    logPath: startup.logPath,
    health: readyProbe.payload,
  };
}
