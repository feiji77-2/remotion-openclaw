const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const QWEN_VOICE_DIR = path.join(PROJECT_ROOT, 'runtime', 'voices', 'qwen');
const QWEN_VOICE_REGISTRY_PATH = path.join(QWEN_VOICE_DIR, 'voice-registry.json');
const DEFAULT_DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
const DEFAULT_QWEN_TTS_CLONE_MODEL = 'qwen3-tts-vc-2026-01-22';
const DEFAULT_QWEN_TTS_SYSTEM_MODEL = 'qwen3-tts-flash';
const DEFAULT_QWEN_TTS_VOICE = 'Cherry';
const QWEN_VOICE_ENROLLMENT_MODEL = 'qwen-voice-enrollment';
const DEFAULT_QWEN_REQUEST_TIMEOUT_MS = 120000;
const DEFAULT_QWEN_RETRY_ATTEMPTS = 4;
const DEFAULT_QWEN_RETRY_BACKOFF_MS = 2000;

const MIME_BY_EXT = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
};

const LANGUAGE_TYPE_MAP = {
  auto: 'Auto',
  zh: 'Chinese',
  'zh-cn': 'Chinese',
  chinese: 'Chinese',
  en: 'English',
  'en-us': 'English',
  english: 'English',
  de: 'German',
  german: 'German',
  it: 'Italian',
  italian: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese',
  portuguese: 'Portuguese',
  es: 'Spanish',
  spanish: 'Spanish',
  ja: 'Japanese',
  jp: 'Japanese',
  japanese: 'Japanese',
  ko: 'Korean',
  kr: 'Korean',
  korean: 'Korean',
  fr: 'French',
  french: 'French',
  ru: 'Russian',
  russian: 'Russian',
};

const CLONE_LANGUAGE_MAP = {
  zh: 'zh',
  'zh-cn': 'zh',
  chinese: 'zh',
  en: 'en',
  'en-us': 'en',
  english: 'en',
  de: 'de',
  german: 'de',
  it: 'it',
  italian: 'it',
  pt: 'pt',
  'pt-br': 'pt',
  portuguese: 'pt',
  es: 'es',
  spanish: 'es',
  ja: 'ja',
  jp: 'ja',
  japanese: 'ja',
  ko: 'ko',
  kr: 'ko',
  korean: 'ko',
  fr: 'fr',
  french: 'fr',
  ru: 'ru',
  russian: 'ru',
};

function safeString(value) {
  return String(value || '').trim();
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {recursive: true});
  }
}

function resolveDashscopeBaseUrl(env = process.env) {
  return safeString(env.QWEN_TTS_BASE_URL || env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL)
    .replace(/\/+$/, '');
}

function resolveDashscopeApiKey(env = process.env) {
  return safeString(env.DASHSCOPE_API_KEY || env.QWEN_TTS_API_KEY);
}

function resolveQwenTtsModel(voiceSettings = {}, env = process.env) {
  return safeString(
    voiceSettings.model
      || voiceSettings.voiceModel
      || voiceSettings.qwenModel
      || env.QWEN_TTS_MODEL,
  );
}

function resolveQwenCloneModel(voiceSettings = {}, env = process.env) {
  return resolveQwenTtsModel(voiceSettings, env)
    || safeString(env.QWEN_TTS_CLONE_MODEL)
    || DEFAULT_QWEN_TTS_CLONE_MODEL;
}

function resolveQwenSystemModel(env = process.env) {
  return safeString(env.QWEN_TTS_SYSTEM_MODEL) || DEFAULT_QWEN_TTS_SYSTEM_MODEL;
}

function resolveQwenTtsDefaultVoice(env = process.env) {
  return safeString(env.QWEN_TTS_DEFAULT_VOICE) || DEFAULT_QWEN_TTS_VOICE;
}

function resolveQwenTtsLanguageType(language) {
  const normalized = safeString(language).toLowerCase();
  return LANGUAGE_TYPE_MAP[normalized] || 'Auto';
}

function resolveQwenCloneLanguage(language) {
  const normalized = safeString(language).toLowerCase();
  return CLONE_LANGUAGE_MAP[normalized] || '';
}

function sanitizeVoiceName(value) {
  const safe = safeString(value)
    .toLowerCase()
    .replace(/[^a-z]+/g, '')
    .slice(0, 64);
  if (safe) {
    return safe;
  }
  return `qwenvoice${crypto.randomBytes(4).toString('hex').replace(/[0-9]/g, 'a')}`.slice(0, 64);
}

function ensureDashscopeApiKey(env = process.env) {
  const apiKey = resolveDashscopeApiKey(env);
  if (!apiKey) {
    throw new Error('阿里云百炼 Qwen TTS 需要配置 DASHSCOPE_API_KEY。');
  }
  return apiKey;
}

function buildDashscopeHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveQwenRequestTimeoutMs(env = process.env) {
  return parsePositiveInt(env.QWEN_TTS_REQUEST_TIMEOUT_MS, DEFAULT_QWEN_REQUEST_TIMEOUT_MS);
}

function resolveQwenRetryAttempts(env = process.env) {
  return parsePositiveInt(env.QWEN_TTS_RETRY_ATTEMPTS, DEFAULT_QWEN_RETRY_ATTEMPTS);
}

function resolveQwenRetryBackoffMs(env = process.env) {
  return parsePositiveInt(env.QWEN_TTS_RETRY_BACKOFF_MS, DEFAULT_QWEN_RETRY_BACKOFF_MS);
}

function isRetryableDashscopeStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isRetryableDashscopeBody(bodyText) {
  const normalized = safeString(bodyText).toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    'responsetimeout',
    'timeout',
    'temporarily unavailable',
    'temporarily_unavailable',
    'rate limit',
    'throttl',
    'too many requests',
    'internalerror',
    'internal error',
  ].some((needle) => normalized.includes(needle));
}

function isRetryableNetworkError(error) {
  const message = safeString(error?.message).toLowerCase();
  return [
    'econnreset',
    'econnrefused',
    'etimedout',
    'timeout',
    'networkerror',
    'socket hang up',
    'fetch failed',
    'terminated',
    'aborted',
  ].some((needle) => message.includes(needle));
}

function buildRetryDelay(attempt, env = process.env) {
  const base = resolveQwenRetryBackoffMs(env);
  const multiplier = 2 ** Math.max(0, attempt - 1);
  return base * multiplier;
}

function resolveLocalAudioPath(value) {
  const normalized = safeString(value);
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('/assets/')) {
    return path.join(PUBLIC_DIR, normalized.replace(/^\/+/, ''));
  }

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(PROJECT_ROOT, normalized);
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(safeString(value));
}

function resolveAudioMimeType(filePath) {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'audio/wav';
}

function resolveQwenOutputSpeed(speed) {
  const parsed = Number(speed);
  if (!Number.isFinite(parsed)) {
    return 1.0;
  }
  return Math.max(0.5, Math.min(2.0, parsed));
}

function buildAtempoChain(tempoFactor) {
  const factors = [];
  let remaining = tempoFactor;

  while (remaining > 2) {
    factors.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    factors.push(0.5);
    remaining /= 0.5;
  }

  factors.push(remaining);
  return factors.map((value) => `atempo=${value.toFixed(6)}`).join(',');
}

function applyAudioSpeedToFile(sourcePath, speed) {
  const normalizedSpeed = resolveQwenOutputSpeed(speed);
  if (Math.abs(normalizedSpeed - 1.0) < 0.001) {
    return;
  }

  const tempPath = sourcePath.replace(/\.wav$/i, '.speed.wav');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      sourcePath,
      '-filter:a',
      buildAtempoChain(normalizedSpeed),
      '-ar',
      '24000',
      '-ac',
      '1',
      tempPath,
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`Qwen TTS 速度调整失败: ${detail || `exit ${result.status}`}`);
  }

  fs.renameSync(tempPath, sourcePath);
}

function toAudioDataValue(referenceUrl) {
  const normalized = safeString(referenceUrl);
  if (!normalized) {
    throw new Error('Qwen TTS 声音复刻需要 referenceUrl 或本地参考音频路径。');
  }

  if (isRemoteUrl(normalized)) {
    return normalized;
  }

  const localPath = resolveLocalAudioPath(normalized);
  if (!fs.existsSync(localPath)) {
    throw new Error(`找不到 Qwen TTS 参考音频: ${localPath}`);
  }

  const mimeType = resolveAudioMimeType(localPath);
  const base64 = fs.readFileSync(localPath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function computeReferenceFingerprint(referenceUrl) {
  const normalized = safeString(referenceUrl);
  if (!normalized) {
    return '';
  }

  if (isRemoteUrl(normalized)) {
    return crypto.createHash('sha1').update(normalized).digest('hex');
  }

  const localPath = resolveLocalAudioPath(normalized);
  if (!fs.existsSync(localPath)) {
    return crypto.createHash('sha1').update(normalized).digest('hex');
  }

  return crypto.createHash('sha1').update(fs.readFileSync(localPath)).digest('hex');
}

function readVoiceRegistry(registryPath = QWEN_VOICE_REGISTRY_PATH) {
  try {
    if (!fs.existsSync(registryPath)) {
      return {voices: []};
    }
    const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return parsed && Array.isArray(parsed.voices) ? parsed : {voices: []};
  } catch {
    return {voices: []};
  }
}

function findQwenVoiceRegistryEntry(voice, registryPath = QWEN_VOICE_REGISTRY_PATH) {
  const normalizedVoice = safeString(voice);
  if (!normalizedVoice) {
    return null;
  }

  const registry = readVoiceRegistry(registryPath);
  return registry.voices.find((item) => safeString(item.voice) === normalizedVoice) || null;
}

function writeVoiceRegistry(registry, registryPath = QWEN_VOICE_REGISTRY_PATH) {
  ensureDir(path.dirname(registryPath));
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function upsertVoiceRegistryEntry(entry, registryPath = QWEN_VOICE_REGISTRY_PATH) {
  const registry = readVoiceRegistry(registryPath);
  const voices = registry.voices.filter((item) => !(
    safeString(item.voice) === safeString(entry.voice)
    || (
      safeString(item.referenceFingerprint) === safeString(entry.referenceFingerprint)
      && safeString(item.targetModel) === safeString(entry.targetModel)
      && safeString(item.preferredName) === safeString(entry.preferredName)
    )
  ));
  voices.unshift({
    ...entry,
    updatedAt: new Date().toISOString(),
  });
  writeVoiceRegistry({voices}, registryPath);
}

function removeVoiceRegistryEntry(voice, registryPath = QWEN_VOICE_REGISTRY_PATH) {
  const registry = readVoiceRegistry(registryPath);
  const nextVoices = registry.voices.filter((item) => safeString(item.voice) !== safeString(voice));
  writeVoiceRegistry({voices: nextVoices}, registryPath);
}

async function requestDashscopeJson(url, payload, {env = process.env, fetchImpl = fetch} = {}) {
  const apiKey = ensureDashscopeApiKey(env);
  const maxAttempts = resolveQwenRetryAttempts(env);
  const timeoutMs = resolveQwenRequestTimeoutMs(env);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error(`DashScope 请求超时 (${timeoutMs}ms)`)), timeoutMs);
      let response;

      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: buildDashscopeHeaders(apiKey),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const bodyText = await response.text().catch(() => '');
      let json = null;
      try {
        json = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        json = null;
      }

      if (!response.ok) {
        const retryable = isRetryableDashscopeStatus(response.status) || isRetryableDashscopeBody(bodyText);
        const message = `DashScope 请求失败: HTTP ${response.status} ${bodyText}`.trim();
        if (retryable && attempt < maxAttempts) {
          await sleep(buildRetryDelay(attempt, env));
          continue;
        }
        throw new Error(message);
      }

      return json || {};
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw error;
      }
      await sleep(buildRetryDelay(attempt, env));
    }
  }

  throw lastError || new Error('DashScope 请求失败');
}

async function downloadRemoteFile(url, outputPath, {fetchImpl = fetch} = {}) {
  const env = process.env;
  const maxAttempts = resolveQwenRetryAttempts(env);
  const timeoutMs = resolveQwenRequestTimeoutMs(env);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error(`Qwen TTS 音频下载超时 (${timeoutMs}ms)`)), timeoutMs);
      let response;

      try {
        response = await fetchImpl(url, {signal: controller.signal});
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const message = `下载 Qwen TTS 音频失败: HTTP ${response.status} ${detail}`.trim();
        if ((isRetryableDashscopeStatus(response.status) || isRetryableDashscopeBody(detail)) && attempt < maxAttempts) {
          await sleep(buildRetryDelay(attempt, env));
          continue;
        }
        throw new Error(message);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw error;
      }
      await sleep(buildRetryDelay(attempt, env));
    }
  }

  throw lastError || new Error('下载 Qwen TTS 音频失败');
}

async function listQwenClonedVoices({
  pageSize = 100,
  pageIndex = 0,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const baseUrl = resolveDashscopeBaseUrl(env);
  const payload = {
    model: QWEN_VOICE_ENROLLMENT_MODEL,
    input: {
      action: 'list',
      page_size: Math.max(1, Math.min(100, Number(pageSize) || 100)),
      page_index: Math.max(0, Number(pageIndex) || 0),
    },
  };

  const json = await requestDashscopeJson(
    `${baseUrl}/services/audio/tts/customization`,
    payload,
    {env, fetchImpl},
  );
  return Array.isArray(json?.output?.voice_list) ? json.output.voice_list : [];
}

async function createQwenClonedVoice({
  referenceUrl,
  preferredName,
  targetModel,
  referenceText,
  referenceLanguage,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const baseUrl = resolveDashscopeBaseUrl(env);
  const payload = {
    model: QWEN_VOICE_ENROLLMENT_MODEL,
    input: {
      action: 'create',
      target_model: safeString(targetModel) || resolveQwenCloneModel({}, env),
      preferred_name: sanitizeVoiceName(preferredName),
      audio: {
        data: toAudioDataValue(referenceUrl),
      },
    },
  };

  const cloneLanguage = resolveQwenCloneLanguage(referenceLanguage);
  if (safeString(referenceText)) {
    payload.input.text = safeString(referenceText);
  }
  if (cloneLanguage) {
    payload.input.language = cloneLanguage;
  }

  const json = await requestDashscopeJson(
    `${baseUrl}/services/audio/tts/customization`,
    payload,
    {env, fetchImpl},
  );
  const voice = safeString(json?.output?.voice);
  if (!voice) {
    throw new Error(`创建 Qwen 克隆音色失败：未返回 voice。响应=${JSON.stringify(json)}`);
  }

  return {
    voice,
    targetModel: safeString(json?.output?.target_model) || safeString(targetModel) || resolveQwenCloneModel({}, env),
    requestId: safeString(json?.request_id),
    usageCount: Number(json?.usage?.count) || 0,
  };
}

async function ensureQwenCloneVoice({
  referenceUrl,
  preferredName,
  targetModel,
  referenceText,
  referenceLanguage,
  env = process.env,
  fetchImpl = fetch,
  registryPath = QWEN_VOICE_REGISTRY_PATH,
} = {}) {
  const fingerprint = computeReferenceFingerprint(referenceUrl);
  const normalizedPreferredName = sanitizeVoiceName(preferredName);
  const normalizedTargetModel = safeString(targetModel) || resolveQwenCloneModel({}, env);
  const registry = readVoiceRegistry(registryPath);
  const registryHit = registry.voices.find((item) => (
    safeString(item.referenceFingerprint) === fingerprint
    && safeString(item.preferredName) === normalizedPreferredName
    && safeString(item.targetModel) === normalizedTargetModel
  ));
  if (registryHit?.voice) {
    return {
      voice: registryHit.voice,
      targetModel: normalizedTargetModel,
      source: 'registry',
    };
  }

  const voices = await listQwenClonedVoices({pageSize: 100, pageIndex: 0, env, fetchImpl});
  const listedHit = voices.find((item) => (
    safeString(item.voice) === normalizedPreferredName
    && safeString(item.target_model) === normalizedTargetModel
  ));
  if (listedHit?.voice) {
    upsertVoiceRegistryEntry({
      voice: listedHit.voice,
      preferredName: normalizedPreferredName,
      targetModel: normalizedTargetModel,
      referenceFingerprint: fingerprint,
      referenceUrl: safeString(referenceUrl),
      createdAt: listedHit.gmt_create || new Date().toISOString(),
    }, registryPath);
    return {
      voice: listedHit.voice,
      targetModel: normalizedTargetModel,
      source: 'list',
    };
  }

  const created = await createQwenClonedVoice({
    referenceUrl,
    preferredName: normalizedPreferredName,
    targetModel: normalizedTargetModel,
    referenceText,
    referenceLanguage,
    env,
    fetchImpl,
  });
  upsertVoiceRegistryEntry({
    voice: created.voice,
    preferredName: normalizedPreferredName,
    targetModel: created.targetModel,
    referenceFingerprint: fingerprint,
    referenceUrl: safeString(referenceUrl),
    createdAt: new Date().toISOString(),
    requestId: created.requestId,
  }, registryPath);
  return {
    voice: created.voice,
    targetModel: created.targetModel,
    source: 'create',
  };
}

async function deleteQwenClonedVoice({
  voice,
  env = process.env,
  fetchImpl = fetch,
  registryPath = QWEN_VOICE_REGISTRY_PATH,
} = {}) {
  const normalizedVoice = safeString(voice);
  if (!normalizedVoice) {
    throw new Error('删除 Qwen 克隆音色时必须提供 voice。');
  }

  const baseUrl = resolveDashscopeBaseUrl(env);
  const payload = {
    model: QWEN_VOICE_ENROLLMENT_MODEL,
    input: {
      action: 'delete',
      voice: normalizedVoice,
    },
  };

  const json = await requestDashscopeJson(
    `${baseUrl}/services/audio/tts/customization`,
    payload,
    {env, fetchImpl},
  );
  removeVoiceRegistryEntry(normalizedVoice, registryPath);
  return {
    requestId: safeString(json?.request_id),
    usageCount: Number(json?.usage?.count) || 0,
  };
}

function resolveQwenSynthesisModel({
  voiceSettings = {},
  voice = '',
  referenceUrl = '',
  env = process.env,
  registryPath = QWEN_VOICE_REGISTRY_PATH,
} = {}) {
  const explicitModel = resolveQwenTtsModel(voiceSettings, env);
  if (explicitModel) {
    return explicitModel;
  }

  if (safeString(referenceUrl)) {
    return resolveQwenCloneModel(voiceSettings, env);
  }

  const registryEntry = findQwenVoiceRegistryEntry(voice, registryPath);
  if (registryEntry?.targetModel) {
    return safeString(registryEntry.targetModel);
  }

  return resolveQwenSystemModel(env);
}

async function synthesizeQwenTtsToFile({
  text,
  voice,
  language,
  outputPath,
  model,
  speed,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const baseUrl = resolveDashscopeBaseUrl(env);
  const normalizedVoice = safeString(voice) || resolveQwenTtsDefaultVoice(env);
  const payload = {
    model: safeString(model) || resolveQwenSynthesisModel({voice: normalizedVoice, env}),
    input: {
      text: safeString(text),
      voice: normalizedVoice,
      language_type: resolveQwenTtsLanguageType(language),
    },
  };

  const json = await requestDashscopeJson(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    payload,
    {env, fetchImpl},
  );
  const audioUrl = safeString(json?.output?.audio?.url);
  if (!audioUrl) {
    throw new Error(`Qwen TTS 未返回音频 URL。响应=${JSON.stringify(json)}`);
  }

  await downloadRemoteFile(audioUrl, outputPath, {fetchImpl});
  applyAudioSpeedToFile(outputPath, speed);
  return {
    audioUrl,
    audioId: safeString(json?.output?.audio?.id),
    expiresAt: Number(json?.output?.audio?.expires_at) || 0,
    requestId: safeString(json?.request_id),
    usage: json?.usage || null,
    voice: normalizedVoice,
    languageType: payload.input.language_type,
    speed: resolveQwenOutputSpeed(speed),
  };
}

function getQwenTtsHealth(env = process.env) {
  const apiKey = resolveDashscopeApiKey(env);
  const baseUrl = resolveDashscopeBaseUrl(env);
  if (!apiKey) {
    return {
      status: 'error',
      engine: 'qwen-tts',
      configured: false,
      message: '缺少 DASHSCOPE_API_KEY',
      baseUrl,
    };
  }

  return {
    status: 'ok',
    engine: 'qwen-tts',
    configured: true,
    baseUrl,
    cloneModel: resolveQwenCloneModel({}, env),
    systemModel: resolveQwenSystemModel(env),
    defaultVoice: resolveQwenTtsDefaultVoice(env),
  };
}

module.exports = {
  QWEN_VOICE_DIR,
  QWEN_VOICE_REGISTRY_PATH,
  resolveDashscopeApiKey,
  resolveDashscopeBaseUrl,
  resolveQwenTtsModel,
  resolveQwenCloneModel,
  resolveQwenSystemModel,
  resolveQwenSynthesisModel,
  resolveQwenTtsDefaultVoice,
  resolveQwenTtsLanguageType,
  resolveQwenCloneLanguage,
  resolveQwenOutputSpeed,
  sanitizeVoiceName,
  readVoiceRegistry,
  findQwenVoiceRegistryEntry,
  getQwenTtsHealth,
  listQwenClonedVoices,
  createQwenClonedVoice,
  ensureQwenCloneVoice,
  deleteQwenClonedVoice,
  synthesizeQwenTtsToFile,
};
