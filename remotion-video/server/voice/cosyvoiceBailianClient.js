const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../..');
const DEFAULT_DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
const DEFAULT_COSYVOICE_MODEL = 'cosyvoice-v3.5-plus';
const DEFAULT_COSYVOICE_SAMPLE_RATE = 24000;
const COSYVOICE_MODEL_CANDIDATES = [
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'cosyvoice-v2',
];

const LANGUAGE_HINT_MAP = {
  zh: 'zh',
  'zh-cn': 'zh',
  chinese: 'zh',
  en: 'en',
  'en-us': 'en',
  english: 'en',
  fr: 'fr',
  french: 'fr',
  de: 'de',
  german: 'de',
  ja: 'ja',
  jp: 'ja',
  japanese: 'ja',
  ko: 'ko',
  kr: 'ko',
  korean: 'ko',
  ru: 'ru',
  russian: 'ru',
  pt: 'pt',
  'pt-br': 'pt',
  portuguese: 'pt',
  th: 'th',
  thai: 'th',
  id: 'id',
  indonesian: 'id',
  vi: 'vi',
  vietnamese: 'vi',
};

function safeString(value) {
  return String(value || '').trim();
}

function resolveDashscopeBaseUrl(env = process.env) {
  return safeString(env.COSYVOICE_BASE_URL || env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL)
    .replace(/\/+$/, '');
}

function resolveDashscopeApiKey(env = process.env) {
  return safeString(env.DASHSCOPE_API_KEY || env.COSYVOICE_API_KEY);
}

function ensureDashscopeApiKey(env = process.env) {
  const apiKey = resolveDashscopeApiKey(env);
  if (!apiKey) {
    throw new Error('阿里云百炼 CosyVoice 需要配置 DASHSCOPE_API_KEY。');
  }
  return apiKey;
}

function buildDashscopeHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function requestDashscopeJson(url, payload, {env = process.env, fetchImpl = fetch} = {}) {
  const apiKey = ensureDashscopeApiKey(env);
  return fetchImpl(url, {
    method: 'POST',
    headers: buildDashscopeHeaders(apiKey),
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const bodyText = await response.text().catch(() => '');
    let json = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(`DashScope 请求失败: HTTP ${response.status} ${bodyText}`.trim());
    }

    return json || {};
  });
}

async function downloadRemoteFile(url, outputPath, {fetchImpl = fetch} = {}) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`下载 CosyVoice 音频失败: HTTP ${response.status} ${detail}`.trim());
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

function inferCosyVoiceModelFromVoiceId(voiceId) {
  const normalized = safeString(voiceId);
  if (!normalized) {
    return '';
  }
  const matched = COSYVOICE_MODEL_CANDIDATES.find((candidate) => normalized.startsWith(candidate));
  return matched || '';
}

function resolveCosyVoiceModel(voiceSettings = {}, env = process.env) {
  const explicitModel = safeString(
    voiceSettings.model
      || voiceSettings.voiceModel
      || voiceSettings.cosyvoiceModel
      || env.COSYVOICE_MODEL,
  );
  if (explicitModel) {
    return explicitModel;
  }

  const inferredModel = inferCosyVoiceModelFromVoiceId(
    voiceSettings.voice || voiceSettings.speaker || voiceSettings.speakerSeed,
  );
  return inferredModel || DEFAULT_COSYVOICE_MODEL;
}

function resolveCosyVoiceVoiceId(voiceSettings = {}, env = process.env) {
  return safeString(
    voiceSettings.voice
      || voiceSettings.speaker
      || voiceSettings.speakerSeed
      || env.COSYVOICE_DEFAULT_VOICE
      || '',
  );
}

function resolveCosyVoiceRate(speed) {
  const parsed = Number(speed);
  if (!Number.isFinite(parsed)) {
    return 1.0;
  }
  return Math.max(0.5, Math.min(2.0, parsed));
}

function resolveCosyVoiceInstruction(voiceSettings = {}, env = process.env) {
  return safeString(
    voiceSettings.instruction
      || voiceSettings.voiceInstruction
      || voiceSettings.styleInstruction
      || env.COSYVOICE_DEFAULT_INSTRUCTION,
  );
}

function resolveCosyVoiceLanguageHints(language) {
  const normalized = safeString(language).toLowerCase();
  const hint = LANGUAGE_HINT_MAP[normalized];
  return hint ? [hint] : [];
}

function getCosyVoiceHealth(env = process.env) {
  const apiKey = resolveDashscopeApiKey(env);
  const baseUrl = resolveDashscopeBaseUrl(env);
  const defaultVoice = safeString(env.COSYVOICE_DEFAULT_VOICE);

  if (!apiKey) {
    return {
      status: 'error',
      engine: 'cosyvoice',
      configured: false,
      message: '缺少 DASHSCOPE_API_KEY',
      baseUrl,
    };
  }

  if (!defaultVoice) {
    return {
      status: 'ok',
      engine: 'cosyvoice',
      configured: true,
      baseUrl,
      model: safeString(env.COSYVOICE_MODEL) || DEFAULT_COSYVOICE_MODEL,
      defaultVoice: null,
    };
  }

  return {
    status: 'ok',
    engine: 'cosyvoice',
    configured: true,
    baseUrl,
    model: inferCosyVoiceModelFromVoiceId(defaultVoice) || safeString(env.COSYVOICE_MODEL) || DEFAULT_COSYVOICE_MODEL,
    defaultVoice,
  };
}

async function synthesizeCosyVoiceToFile({
  text,
  voice,
  language,
  outputPath,
  model,
  speed,
  instruction,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const normalizedVoice = safeString(voice) || resolveCosyVoiceVoiceId({}, env);
  if (!normalizedVoice) {
    throw new Error('CosyVoice 合成需要提供 voice id。');
  }

  const payload = {
    model: safeString(model) || inferCosyVoiceModelFromVoiceId(normalizedVoice) || DEFAULT_COSYVOICE_MODEL,
    input: {
      text: safeString(text),
      voice: normalizedVoice,
      format: 'wav',
      sample_rate: DEFAULT_COSYVOICE_SAMPLE_RATE,
      rate: resolveCosyVoiceRate(speed),
    },
  };

  const languageHints = resolveCosyVoiceLanguageHints(language);
  if (languageHints.length > 0) {
    payload.input.language_hints = languageHints;
  }

  const normalizedInstruction = safeString(instruction);
  if (normalizedInstruction) {
    payload.input.instruction = normalizedInstruction;
  }

  const baseUrl = resolveDashscopeBaseUrl(env);
  const json = await requestDashscopeJson(
    `${baseUrl}/services/audio/tts/SpeechSynthesizer`,
    payload,
    {env, fetchImpl},
  );
  const audioUrl = safeString(json?.output?.audio?.url);
  if (!audioUrl) {
    throw new Error(`CosyVoice 未返回音频 URL。响应=${JSON.stringify(json)}`);
  }

  await downloadRemoteFile(audioUrl, outputPath, {fetchImpl});
  return {
    audioUrl,
    audioId: safeString(json?.output?.audio?.id),
    expiresAt: Number(json?.output?.audio?.expires_at) || 0,
    requestId: safeString(json?.request_id),
    usage: json?.usage || null,
    voice: normalizedVoice,
    model: payload.model,
    rate: payload.input.rate,
    instruction: normalizedInstruction || null,
  };
}

module.exports = {
  inferCosyVoiceModelFromVoiceId,
  resolveCosyVoiceModel,
  resolveCosyVoiceVoiceId,
  resolveCosyVoiceRate,
  resolveCosyVoiceInstruction,
  resolveCosyVoiceLanguageHints,
  getCosyVoiceHealth,
  synthesizeCosyVoiceToFile,
};
