const fs = require('node:fs');
const os = require('node:os');

const BROWSER_CANDIDATES = [
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const VALID_OPENGL_RENDERERS = new Set(['swangle', 'angle', 'egl', 'swiftshader', 'vulkan', 'angle-egl']);
const VALID_HARDWARE_ACCELERATION = new Set(['disable', 'if-possible', 'required']);

const normalizeString = (value) => String(value || '').trim();

const normalizePositiveInteger = (value) => {
  const normalized = Number.parseInt(normalizeString(value), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
};

const parseBooleanEnv = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
};

const isManagedBrowserExecutable = (browserExecutable) => {
  return /Chrome for Testing|chrome-headless-shell|headless_shell/.test(browserExecutable);
};

const hasCliFlag = (args, flag) => {
  const normalizedFlag = flag.startsWith('--') ? flag : `--${flag}`;
  return args.some((arg, index) => {
    return arg === normalizedFlag
      || arg.startsWith(`${normalizedFlag}=`)
      || (index > 0 && args[index - 1] === normalizedFlag);
  });
};

const getBrowserCandidates = () => {
  return BROWSER_CANDIDATES.filter((candidate) => fs.existsSync(candidate));
};

const detectPreferredBrowserExecutable = () => {
  const fromEnv = normalizeString(process.env.REMOTION_BROWSER_EXECUTABLE);
  if (fromEnv) {
    return fs.existsSync(fromEnv) ? fromEnv : null;
  }

  const allowSystemBrowser = parseBooleanEnv(process.env.REMOTION_ALLOW_SYSTEM_BROWSER);
  // Default to Remotion-managed Chromium unless the caller explicitly opts in to
  // a system browser. This avoids macOS GPU/compositor glitches where video
  // renders can show tiled or repeated frames while single-frame still renders
  // remain correct.
  if (allowSystemBrowser !== true) {
    return null;
  }

  return getBrowserCandidates()[0] || null;
};

const resolveChromeMode = (browserExecutable) => {
  const explicitMode = normalizeString(process.env.REMOTION_CHROME_MODE);
  if (explicitMode) {
    return explicitMode;
  }

  if (!browserExecutable) {
    return null;
  }

  return /Google Chrome(?: for Testing)?/.test(browserExecutable) ? 'chrome-for-testing' : null;
};

const resolvePreferredOpenGlRenderer = (browserExecutable) => {
  const explicitRenderer = normalizeString(process.env.REMOTION_GL || process.env.REMOTION_OPENGL_RENDERER);
  if (explicitRenderer) {
    return VALID_OPENGL_RENDERERS.has(explicitRenderer) ? explicitRenderer : null;
  }

  if (parseBooleanEnv(process.env.REMOTION_DISABLE_GPU) === true) {
    return null;
  }

  return null;
};

const resolvePreferredHardwareAcceleration = (env = process.env) => {
  const explicitMode = normalizeString(env.REMOTION_HARDWARE_ACCELERATION);
  if (explicitMode) {
    return VALID_HARDWARE_ACCELERATION.has(explicitMode) ? explicitMode : null;
  }

  if (parseBooleanEnv(env.REMOTION_DISABLE_GPU) === true) {
    return 'disable';
  }

  return null;
};

const getDefaultRenderConcurrency = ({
  cpuCount = os.cpus().length,
  totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024)),
} = {}) => {
  const safeCpuCount = Math.max(1, Number(cpuCount) || 1);
  const safeMemoryMb = Math.max(1024, Number(totalMemoryMb) || 1024);
  const memoryBound = Math.max(2, Math.floor(safeMemoryMb / 4096));
  const cpuBound = Math.max(2, safeCpuCount - 2);
  return Math.min(8, memoryBound, cpuBound);
};

const buildRenderPerformanceFlags = ({
  existingArgs = [],
  env = process.env,
  cpuCount = os.cpus().length,
  totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024)),
} = {}) => {
  const flags = [];
  const concurrency = normalizePositiveInteger(env.REMOTION_CONCURRENCY)
    ?? getDefaultRenderConcurrency({cpuCount, totalMemoryMb});
  const codec = normalizeString(env.REMOTION_CODEC) || 'h264';
  const crf = normalizePositiveInteger(env.REMOTION_CRF) ?? 18;
  const audioBitrate = normalizeString(env.REMOTION_AUDIO_BITRATE) || '320k';

  if (!hasCliFlag(existingArgs, '--concurrency')) {
    flags.push('--concurrency', String(concurrency));
  }

  if (!hasCliFlag(existingArgs, '--codec')) {
    flags.push('--codec', codec);
  }

  if (!hasCliFlag(existingArgs, '--crf')) {
    flags.push('--crf', String(crf));
  }

  if (!hasCliFlag(existingArgs, '--audio-bitrate')) {
    flags.push('--audio-bitrate', audioBitrate);
  }

  return flags;
};

const buildPreferredRemotionFlags = ({existingArgs = [], browserExecutable, env = process.env} = {}) => {
  const resolvedBrowserExecutable = typeof browserExecutable === 'string'
    ? browserExecutable
    : detectPreferredBrowserExecutable();
  const chromeMode = resolveChromeMode(resolvedBrowserExecutable);
  const gl = resolvePreferredOpenGlRenderer(resolvedBrowserExecutable);
  const hardwareAcceleration = resolvePreferredHardwareAcceleration(env);
  const flags = [];

  if (resolvedBrowserExecutable && !hasCliFlag(existingArgs, '--browser-executable')) {
    flags.push('--browser-executable', resolvedBrowserExecutable);
  }

  if (chromeMode && !hasCliFlag(existingArgs, '--chrome-mode')) {
    flags.push('--chrome-mode', chromeMode);
  }

  if (gl && !hasCliFlag(existingArgs, '--gl')) {
    flags.push('--gl', gl);
  }

  if (hardwareAcceleration && !hasCliFlag(existingArgs, '--hardware-acceleration')) {
    flags.push('--hardware-acceleration', hardwareAcceleration);
  }

  return {
    browserExecutable: resolvedBrowserExecutable,
    chromeMode,
    gl,
    hardwareAcceleration,
    flags,
  };
};

module.exports = {
  BROWSER_CANDIDATES,
  getBrowserCandidates,
  isManagedBrowserExecutable,
  detectPreferredBrowserExecutable,
  resolveChromeMode,
  resolvePreferredOpenGlRenderer,
  resolvePreferredHardwareAcceleration,
  getDefaultRenderConcurrency,
  buildRenderPerformanceFlags,
  buildPreferredRemotionFlags,
};
