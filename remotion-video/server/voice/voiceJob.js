const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ensureQwenCloneVoice,
  getQwenTtsHealth,
  resolveQwenCloneModel,
  resolveQwenSynthesisModel,
  resolveQwenTtsDefaultVoice,
  synthesizeQwenTtsToFile,
} = require('./qwenTtsClient');
const {
  getCosyVoiceHealth,
  resolveCosyVoiceInstruction,
  resolveCosyVoiceModel,
  resolveCosyVoiceRate,
  resolveCosyVoiceVoiceId,
  synthesizeCosyVoiceToFile,
} = require('./cosyvoiceBailianClient');

const PROJECT_ROOT = path.join(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const VOICE_DIR = path.join(PUBLIC_DIR, 'assets/voice');
const SYSTEM_SAY_BIN = '/usr/bin/say';
const AFCONVERT_BIN = '/usr/bin/afconvert';
const AFINFO_BIN = '/usr/bin/afinfo';

// ─── Engine URLs ───────────────────────────────────────────────────────────────
const ENGINES = {
  chattts: {
    healthUrl: process.env.CHATTTS_HTTP_HEALTH_URL || 'http://127.0.0.1:18084/health',
    synthUrl: process.env.CHATTTS_HTTP_SYNTH_URL || 'http://127.0.0.1:18084/synthesize',
    defaultVoice: '42',
  },
  melo: {
    healthUrl: process.env.MELO_HTTP_HEALTH_URL || 'http://127.0.0.1:18081/health',
    synthUrl: process.env.MELO_HTTP_SYNTH_URL || 'http://127.0.0.1:18081/synthesize',
    defaultVoice: 'melo',
  },
  openvoice: {
    healthUrl: process.env.OV_HTTP_HEALTH_URL || 'http://127.0.0.1:18082/health',
    synthUrl: process.env.OV_HTTP_SYNTH_URL || 'http://127.0.0.1:18082/synthesize',
    defaultVoice: 'zh',
  },
  xtts: {
    healthUrl: process.env.XTTS_HTTP_HEALTH_URL || 'http://127.0.0.1:18083/health',
    synthUrl: process.env.XTTS_HTTP_SYNTH_URL || 'http://127.0.0.1:18083/synthesize',
    defaultVoice: 'speaker',
  },
  'qwen-tts': {
    healthUrl: null,
    synthUrl: null,
    defaultVoice: resolveQwenTtsDefaultVoice(process.env),
  },
  cosyvoice: {
    healthUrl: null,
    synthUrl: null,
    defaultVoice: resolveCosyVoiceVoiceId({}, process.env),
  },
};

// Fallback order
const ENGINE_ORDER = ['chattts', 'melo', 'openvoice'];
const SYSTEM_SAY_ENGINE = 'system-say';
const CHINESE_DIGITS = {
  '0': '零',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四',
  '5': '五',
  '6': '六',
  '7': '七',
  '8': '八',
  '9': '九',
};
const ZH_PRONUNCIATION_MAP = [
  [/\bChatGPT\b/gi, 'Chat G P T'],
  [/\bOpenAI\b/gi, 'Open A I'],
  [/\bDeepSeek\b/gi, 'Deep Seek'],
  [/\bClaude\b/gi, '克劳德'],
  [/\bGemini\b/gi, '杰米奈'],
  [/\bCopilot\b/gi, 'Co pilot'],
  [/\bCursor\b/gi, 'Cursor'],
  [/\bGithub\b/gi, 'Git Hub'],
  [/\bGitHub\b/g, 'Git Hub'],
  [/\bAPI\b/g, 'A P I'],
  [/\bSDK\b/g, 'S D K'],
  [/\bGPU\b/g, 'G P U'],
  [/\bCPU\b/g, 'C P U'],
  [/\bNPU\b/g, 'N P U'],
  [/\bAIGC\b/g, 'A I G C'],
  [/\bAGI\b/g, 'A G I'],
  [/\bAI\b/g, 'A I'],
];


function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFileSegment(value) {
  return String(value || 'clip')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'clip';
}

function hasSystemSayRuntime() {
  return fs.existsSync(SYSTEM_SAY_BIN) && fs.existsSync(AFCONVERT_BIN) && fs.existsSync(AFINFO_BIN);
}

function resolveEngine(engine, preset) {
  const requested = String(engine || '').trim().toLowerCase();
  if (requested && ENGINES[requested]) {
    return requested;
  }
  if (requested === 'say' || requested === 'system-say' || requested === 'macos-say') {
    return SYSTEM_SAY_ENGINE;
  }

  const normalized = String(preset || '').toLowerCase();
  if (normalized.includes('chattts') || normalized.includes('chat tts')) {
    return 'chattts';
  }
  if (normalized.includes('xtts') || normalized.includes('coqui')) {
    return 'xtts';
  }
  if (normalized.includes('cosyvoice') || normalized.includes('cosy')) {
    return 'cosyvoice';
  }
  if (normalized.includes('qwen') || normalized.includes('dashscope') || normalized.includes('bailian')) {
    return 'qwen-tts';
  }
  if (normalized.includes('openvoice') || normalized.includes('ov') || normalized.includes('clone')) {
    return 'openvoice';
  }
  if (!preset) return 'chattts';
  return 'melo';
}

function resolveVoiceSystemSay(voiceSettings) {
  const explicitVoice = String(
    voiceSettings?.voice
    || voiceSettings?.speakerSeed
    || voiceSettings?.speaker_seed
    || '',
  ).trim();
  if (explicitVoice) {
    return explicitVoice;
  }

  const normalized = String(voiceSettings?.preset || '').toLowerCase();
  if (normalized.includes('male') || normalized.includes('男') || normalized.includes('eddy')) {
    return 'Eddy (中文（中国大陆）)';
  }
  if (normalized.includes('flo')) {
    return 'Flo (中文（中国大陆）)';
  }
  if (normalized.includes('meijia')) {
    return 'Meijia';
  }

  return 'Tingting';
}

function resolveVoiceCode(value, fallback = 'zh') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'zh-cn' || normalized === 'zh') return 'zh';
  if (normalized === 'en-us' || normalized === 'en') return 'en';
  if (normalized === 'es-es' || normalized === 'es') return 'es';
  if (normalized === 'fr-fr' || normalized === 'fr') return 'fr';
  if (normalized === 'ja' || normalized === 'jp') return 'jp';
  if (normalized === 'ko' || normalized === 'kr') return 'kr';
  return normalized;
}

function resolveVoiceMelo(voiceSettings) {
  const directVoice = String(voiceSettings?.voice || '').trim().toLowerCase();
  if (['melo', 'meijia', 'eddy', 'flo'].includes(directVoice)) {
    return directVoice;
  }

  const normalized = String(voiceSettings?.preset || '').toLowerCase();
  if (normalized.includes('eddy') || normalized.includes('男')) return 'eddy';
  if (normalized.includes('flo')) return 'flo';
  if (normalized.includes('meijia')) return 'meijia';
  return 'melo';
}

function resolveVoiceChatTTSSpeakerSeed(voiceSettings) {
  const candidate =
    voiceSettings?.speakerSeed ??
    voiceSettings?.speaker_seed ??
    voiceSettings?.voiceSeed ??
    voiceSettings?.voice_seed ??
    voiceSettings?.voice;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? Math.round(parsed) : 42;
}

function resolveVoiceOpenVoice(voiceSettings) {
  const explicitVoice = resolveVoiceCode(voiceSettings?.voice || voiceSettings?.language, 'zh');
  if (['zh', 'en', 'es', 'fr', 'jp', 'kr'].includes(explicitVoice)) {
    return explicitVoice;
  }

  const normalized = String(voiceSettings?.preset || '').toLowerCase();
  if (normalized.includes('en') || normalized.includes('english')) return 'en';
  if (normalized.includes('es') || normalized.includes('spanish')) return 'es';
  if (normalized.includes('fr') || normalized.includes('french')) return 'fr';
  if (normalized.includes('jp') || normalized.includes('japanese')) return 'jp';
  if (normalized.includes('kr') || normalized.includes('korean')) return 'kr';
  return 'zh';
}

function resolveVoiceXTTS(voiceSettings) {
  const explicitVoice = String(
    voiceSettings?.voice
    || voiceSettings?.speaker
    || voiceSettings?.speakerSeed
    || voiceSettings?.speaker_seed
    || '',
  ).trim();

  return explicitVoice || ENGINES.xtts.defaultVoice;
}

function resolveVoiceXTTSLanguage(voiceSettings) {
  const normalized = String(voiceSettings?.language || voiceSettings?.voiceLanguage || 'zh-cn')
    .trim()
    .toLowerCase();

  if (!normalized) return 'zh-cn';
  if (normalized === 'auto') return 'auto';
  if (normalized === 'zh' || normalized === 'zh-cn') return 'zh-cn';
  if (normalized === 'chinese') return 'zh-cn';
  if (normalized === 'en' || normalized === 'en-us') return 'en';
  if (normalized === 'english') return 'en';
  if (normalized === 'ja' || normalized === 'jp') return 'ja';
  if (normalized === 'ko' || normalized === 'kr') return 'ko';
  if (normalized === 'pt' || normalized === 'pt-br') return 'pt';

  return normalized;
}

function resolveSpeed(speedValue) {
  const raw = String(speedValue || '1.0').trim().replace(/x$/i, '');
  return clamp(Number(raw) || 1, 0.5, 2.0);
}

function resolveVoiceQwenTts(voiceSettings) {
  return String(
    voiceSettings?.voice
    || voiceSettings?.speaker
    || voiceSettings?.speakerSeed
    || voiceSettings?.speaker_seed
    || '',
  ).trim();
}

function resolveVoiceCosyVoice(voiceSettings) {
  return resolveCosyVoiceVoiceId(voiceSettings, process.env);
}

function resolveSystemSayRate(speedValue) {
  const normalizedSpeed = resolveSpeed(speedValue);
  return Math.round(clamp(225 * normalizedSpeed, 140, 320));
}

function resolveShotText(shot, voiceSettings) {
  const byShotId = voiceSettings?.byShotId && typeof voiceSettings.byShotId === 'object'
    ? voiceSettings.byShotId
    : {};
  const candidate = byShotId[shot.id];
  const text = typeof candidate?.text === 'string' && candidate.text.trim()
    ? candidate.text.trim()
    : typeof shot.narration === 'string'
      ? shot.narration.trim()
      : '';
  return text;
}

function countMatches(value, pattern) {
  return (String(value || '').match(pattern) || []).length;
}

function spaceUppercaseToken(token) {
  const safe = String(token || '').trim();
  return safe ? safe.toUpperCase().split('').join(' ') : '';
}

function normalizeVersionForZh(value) {
  const prepared = String(value || '')
    .replace(/mini/gi, ' 迷你 ')
    .replace(/turbo/gi, ' turbo ')
    .replace(/plus/gi, ' plus ')
    .replace(/max/gi, ' max ')
    .replace(/pro/gi, ' pro ')
    .replace(/ultra/gi, ' ultra ');

  return prepared
    .split('')
    .map((char) => {
      if (CHINESE_DIGITS[char]) {
        return CHINESE_DIGITS[char];
      }
      if (char === '.') {
        return '点';
      }
      if (char === '-' || char === '_' || char === '/') {
        return ' ';
      }
      if (char === 'o' || char === 'O') {
        return '欧';
      }
      if (/[A-Za-z]/.test(char)) {
        return char.toUpperCase();
      }
      return char;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVersionForEn(value) {
  return String(value || '')
    .replace(/\./g, ' point ')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpeechTextForTts(value, { language } = {}) {
  const text = String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  const normalizedLanguage = resolveVoiceXTTSLanguage({language});
  let next = text;

  if (normalizedLanguage === 'zh-cn') {
    for (const [pattern, replacement] of ZH_PRONUNCIATION_MAP) {
      next = next.replace(pattern, replacement);
    }

    next = next.replace(/\b([A-Z]{2,8})\s*[- ]\s*([0-9][A-Za-z0-9.+-]*)/g, (_, acronym, version) => {
      return `${spaceUppercaseToken(acronym)} ${normalizeVersionForZh(version)}`.trim();
    });
    next = next.replace(/\b([A-Z][A-Za-z]{0,2}|o)\s*([0-9][A-Za-z0-9.+-]*)\b/g, (_, token, version) => {
      return `${spaceUppercaseToken(token)} ${normalizeVersionForZh(version)}`.trim();
    });

    next = next.replace(/\b([A-Z]{2,8})(?=\d)/g, (token) => spaceUppercaseToken(token));
    next = next.replace(/\b([A-Z]{2,8})\b/g, (token) => spaceUppercaseToken(token));
  } else if (normalizedLanguage === 'en') {
    next = next.replace(/\b([A-Z]{2,8})\s*[- ]\s*([0-9][A-Za-z0-9.+-]*)/g, (_, acronym, version) => {
      return `${spaceUppercaseToken(acronym)} ${normalizeVersionForEn(version)}`.trim();
    });
    next = next.replace(/\b([A-Z][A-Za-z]{0,2}|o)\s*([0-9][A-Za-z0-9.+-]*)\b/g, (_, token, version) => {
      return `${spaceUppercaseToken(token)} ${normalizeVersionForEn(version)}`.trim();
    });
    next = next.replace(/\bAI\b/g, 'A I');
    next = next.replace(/\bAPI\b/g, 'A P I');
    next = next.replace(/\bGPU\b/g, 'G P U');
    next = next.replace(/\bCPU\b/g, 'C P U');
  }

  return next
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveTtsLanguageForText(text, voiceSettings, engine) {
  if (engine === 'cosyvoice') {
    if (voiceSettings?.languageExplicit) {
      return resolveVoiceXTTSLanguage(voiceSettings);
    }

    const latinCount = countMatches(text, /[A-Za-z]/g);
    const cjkCount = countMatches(text, /[\u3400-\u9FFF]/g);
    if (latinCount >= 12 && latinCount > cjkCount * 1.5) {
      return 'en';
    }
    if (cjkCount > 0) {
      return 'zh-cn';
    }
    return 'auto';
  }

  if (engine === 'qwen-tts') {
    if (voiceSettings?.languageExplicit) {
      return resolveVoiceXTTSLanguage(voiceSettings);
    }

    const latinCount = countMatches(text, /[A-Za-z]/g);
    const cjkCount = countMatches(text, /[\u3400-\u9FFF]/g);
    if (latinCount >= 12 && latinCount > cjkCount * 1.5) {
      return 'en';
    }
    if (cjkCount > 0) {
      return 'zh-cn';
    }
    return 'auto';
  }

  if (engine !== 'xtts') {
    return engine === 'openvoice'
      ? resolveVoiceCode(voiceSettings?.language, 'zh')
      : resolveVoiceXTTSLanguage(voiceSettings);
  }

  const fallbackLanguage = resolveVoiceXTTSLanguage(voiceSettings);
  if (voiceSettings?.languageExplicit) {
    return fallbackLanguage;
  }

  const latinCount = countMatches(text, /[A-Za-z]/g);
  const cjkCount = countMatches(text, /[\u3400-\u9FFF]/g);
  const englishWordCount = countMatches(text, /\b[A-Za-z][A-Za-z0-9.+-]*\b/g);

  if (latinCount >= 12 && englishWordCount >= 4 && latinCount > cjkCount * 1.5) {
    return 'en';
  }

  return fallbackLanguage;
}

function resolveShotSpeechPlan(shot, voiceSettings, engine) {
  const rawText = resolveShotText(shot, voiceSettings);
  const language = resolveTtsLanguageForText(rawText, voiceSettings, engine);
  const spokenText = normalizeSpeechTextForTts(rawText, {language});
  return {
    rawText,
    spokenText,
    language,
  };
}

async function checkVoiceService(engine) {
  const cfg = ENGINES[engine];
  if (!cfg) throw new Error(`Unknown voice engine: ${engine}`);
  const response = await fetch(cfg.healthUrl);
  if (!response.ok) {
    throw new Error(`Voice engine ${engine} unavailable: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload || (payload.status !== 'ok' && payload.status !== 'loading')) {
    throw new Error(`Unexpected voice payload: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function resolveHealthyVoiceEngine(requestedEngine, update) {
  if (requestedEngine === SYSTEM_SAY_ENGINE) {
    if (!hasSystemSayRuntime()) {
      throw new Error('system-say 不可用：缺少 macOS say/afconvert/afinfo');
    }
    update?.(5, '检查语音引擎 (system-say)...');
    return {
      engine: SYSTEM_SAY_ENGINE,
      health: {
        status: 'ok',
        engine: SYSTEM_SAY_ENGINE,
        source: 'macOS system say',
      },
      failures: [],
    };
  }

  if (requestedEngine === 'qwen-tts') {
    update?.(5, '检查语音引擎 (qwen-tts)...');
    const health = getQwenTtsHealth(process.env);
    if (health.status !== 'ok') {
      throw new Error(`Qwen TTS 不可用：${health.message || '未完成配置'}`);
    }
    return {
      engine: 'qwen-tts',
      health,
      failures: [],
    };
  }

  if (requestedEngine === 'cosyvoice') {
    update?.(5, '检查语音引擎 (cosyvoice)...');
    const health = getCosyVoiceHealth(process.env);
    if (health.status !== 'ok') {
      throw new Error(`CosyVoice 不可用：${health.message || '未完成配置'}`);
    }
    return {
      engine: 'cosyvoice',
      health,
      failures: [],
    };
  }

  const candidates = [requestedEngine, ...ENGINE_ORDER.filter((engine) => engine !== requestedEngine)];
  const failures = [];

  for (const candidate of candidates) {
    update?.(5, `检查语音引擎 (${candidate})...`);
    try {
      const health = await checkVoiceService(candidate);
      return {
        engine: candidate,
        health,
        failures,
      };
    } catch (error) {
      failures.push(`${candidate}: ${error.message}`);
    }
  }

  if (hasSystemSayRuntime()) {
    update?.(5, '本地 HTTP TTS 不可用，切换 system-say...');
    return {
      engine: SYSTEM_SAY_ENGINE,
      health: {
        status: 'ok',
        engine: SYSTEM_SAY_ENGINE,
        source: 'macOS system say',
      },
      failures,
    };
  }

  throw new Error(`没有可用的语音引擎。${failures.join(' | ')}`);
}

async function synthesizeClip({ text, engine, voice, speed, language, referenceUrl, outputPath, temperature, topP, topK, model, instruction }) {
  if (engine === SYSTEM_SAY_ENGINE) {
    const tempAiffPath = outputPath.replace(/\.wav$/i, '.aiff');
    const sayRate = String(resolveSystemSayRate(speed));
    const sayResult = spawnSync(
      SYSTEM_SAY_BIN,
      ['-v', voice || 'Tingting', '-r', sayRate, '-o', tempAiffPath, text],
      { cwd: PROJECT_ROOT, encoding: 'utf8' },
    );

    if (sayResult.status !== 0) {
      const detail = [sayResult.stdout, sayResult.stderr].filter(Boolean).join('\n').trim();
      throw new Error(`system-say 合成失败: ${detail || `exit ${sayResult.status}`}`);
    }

    const convertResult = spawnSync(
      AFCONVERT_BIN,
      ['-f', 'WAVE', '-d', 'LEI16', tempAiffPath, outputPath],
      { cwd: PROJECT_ROOT, encoding: 'utf8' },
    );
    fs.rmSync(tempAiffPath, {force: true});

    if (convertResult.status !== 0) {
      const detail = [convertResult.stdout, convertResult.stderr].filter(Boolean).join('\n').trim();
      throw new Error(`system-say 音频转换失败: ${detail || `exit ${convertResult.status}`}`);
    }

    return outputPath;
  }

  const cfg = ENGINES[engine];
  if (!cfg) throw new Error(`Unknown engine: ${engine}`);

  if (engine === 'qwen-tts') {
    return await synthesizeQwenTtsToFile({
      text,
      voice: voice || resolveQwenTtsDefaultVoice(process.env),
      language,
      outputPath,
      model,
      speed,
      env: process.env,
    }).then(() => outputPath);
  }

  if (engine === 'cosyvoice') {
    return await synthesizeCosyVoiceToFile({
      text,
      voice,
      language,
      outputPath,
      model,
      speed,
      instruction,
      env: process.env,
    }).then(() => outputPath);
  }

  const payload = {
    text,
    speed,
  };

  if (engine === 'chattts') {
    payload.speaker_seed = toNumber(voice, 42);
    payload.skip_refine_text = true;
    if (Number.isFinite(Number(temperature))) {
      payload.temperature = clamp(Number(temperature), 0.05, 2.0);
    }
    if (Number.isFinite(Number(topP))) {
      payload.top_p = clamp(Number(topP), 0.1, 1.0);
    }
    if (Number.isFinite(Number(topK))) {
      payload.top_k = Math.round(clamp(Number(topK), 1, 100));
    }
  } else if (engine === 'melo') {
    payload.voice = voice || cfg.defaultVoice;
  } else if (engine === 'openvoice') {
    payload.voice = voice || cfg.defaultVoice;
    if (referenceUrl) {
      payload.reference_url = referenceUrl;
    }
  } else if (engine === 'xtts') {
    payload.voice = voice || cfg.defaultVoice;
    payload.language = resolveVoiceXTTSLanguage({language});
    if (referenceUrl) {
      payload.reference_url = referenceUrl;
    }
  }

  const response = await fetch(cfg.synthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Voice synthesis (${engine}) failed: HTTP ${response.status} ${errText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function probeDurationSeconds(filePath) {
  const ffprobe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  if (ffprobe.status === 0) {
    const duration = Number(ffprobe.stdout.trim());
    if (Number.isFinite(duration) && duration > 0) {
      return Math.round(duration * 1000) / 1000;
    }
  }

  const afinfo = spawnSync(AFINFO_BIN, [filePath], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
  if (afinfo.status !== 0) {
    const detail = [ffprobe.stdout, ffprobe.stderr, afinfo.stdout, afinfo.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`无法探测音频时长: ${filePath}\n${detail}`);
  }
  const combined = [afinfo.stdout, afinfo.stderr].filter(Boolean).join('\n');
  const match = combined.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
  const duration = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration for ${filePath}`);
  }
  return Math.round(duration * 1000) / 1000;
}

async function processVoiceJob(job, update) {
  const projectId = job.data.projectId || 'default';
  const shots = Array.isArray(job.data.shots) ? job.data.shots : [];
  const voiceSettings = job.data.voiceSettings && typeof job.data.voiceSettings === 'object'
    ? job.data.voiceSettings
    : {};

  if (shots.length === 0) {
    throw new Error('Voice job requires shots');
  }

  // Resolve engine: try user preference, then check availability
  let engine = resolveEngine(voiceSettings.engine, voiceSettings.preset);
  const resolvedEngine = await resolveHealthyVoiceEngine(engine, update);
  const health = resolvedEngine.health;
  if (resolvedEngine.engine !== engine) {
    console.warn(`[VoiceJob] Engine ${engine} unavailable, falling back to ${resolvedEngine.engine}`);
    update(8, `默认引擎 ${engine} 不可用，已切换 ${resolvedEngine.engine}`);
    engine = resolvedEngine.engine;
  }

  let voiceRequest = engine === 'chattts'
    ? resolveVoiceChatTTSSpeakerSeed(voiceSettings)
    : engine === 'melo'
      ? resolveVoiceMelo(voiceSettings)
      : engine === 'xtts'
      ? resolveVoiceXTTS(voiceSettings)
      : engine === 'qwen-tts'
        ? resolveVoiceQwenTts(voiceSettings)
      : engine === 'cosyvoice'
        ? resolveVoiceCosyVoice(voiceSettings)
      : engine === SYSTEM_SAY_ENGINE
        ? resolveVoiceSystemSay(voiceSettings)
        : resolveVoiceOpenVoice(voiceSettings);

  const referenceUrl = voiceSettings.referenceUrl || voiceSettings.reference_url || null;
  const requestLanguage = resolveVoiceXTTSLanguage(voiceSettings);
  const requestSpeed = resolveSpeed(voiceSettings.speed);
  const requestTemperature = clamp(toNumber(voiceSettings.temperature, 0.3), 0.05, 2.0);
  const requestTopP = clamp(toNumber(voiceSettings.topP ?? voiceSettings.top_p, 0.7), 0.1, 1.0);
  const requestTopK = Math.round(clamp(toNumber(voiceSettings.topK ?? voiceSettings.top_k, 20), 1, 100));
  let requestModel = engine === 'qwen-tts'
    ? resolveQwenSynthesisModel({
        voiceSettings,
        voice: voiceRequest,
        referenceUrl,
        env: process.env,
      })
    : null;
  const requestInstruction = engine === 'cosyvoice'
    ? resolveCosyVoiceInstruction(voiceSettings, process.env)
    : null;
  if (engine === 'cosyvoice') {
    requestModel = resolveCosyVoiceModel(voiceSettings, process.env);
  }

  if (engine === 'xtts' && !referenceUrl && !String(voiceSettings?.voice || voiceSettings?.speaker || '').trim()) {
    throw new Error('XTTS 需要提供参考音频 referenceUrl，或使用 --speaker 指定已缓存的本地音色别名。');
  }
  if (engine === 'cosyvoice' && !String(voiceRequest).trim()) {
    throw new Error('CosyVoice 需要提供现成的 voice id，例如 cosyvoice-v3.5-plus-bailian-...。');
  }
  if (engine === 'qwen-tts' && referenceUrl && !String(voiceRequest).trim()) {
    update?.(8, '准备 Qwen 克隆音色...');
    const clonedVoice = await ensureQwenCloneVoice({
      referenceUrl,
      preferredName: String(
        voiceSettings?.cloneVoiceName
        || voiceSettings?.preferredName
        || voiceSettings?.clone_name
        || path.basename(String(referenceUrl)).replace(path.extname(String(referenceUrl)), ''),
      ).trim() || 'qwen-clone',
      targetModel: resolveQwenCloneModel(voiceSettings, process.env),
      referenceText: voiceSettings?.referenceText || voiceSettings?.cloneText || '',
      referenceLanguage: voiceSettings?.referenceLanguage || requestLanguage,
      env: process.env,
    });
    voiceRequest = clonedVoice.voice;
    requestModel = clonedVoice.targetModel || resolveQwenCloneModel(voiceSettings, process.env);
  }
  if (engine === 'qwen-tts' && !String(voiceRequest).trim()) {
    voiceRequest = resolveQwenTtsDefaultVoice(process.env);
    requestModel = resolveQwenSynthesisModel({
      voiceSettings,
      voice: voiceRequest,
      referenceUrl,
      env: process.env,
    });
  }
  const voiceName = engine === 'chattts' ? `seed-${voiceRequest}` : voiceRequest;

  const jobVoiceDir = path.join(VOICE_DIR, projectId, job.id);
  ensureDir(jobVoiceDir);

  const generatedQueue = [];
  const segments = [];

  update(10, `准备分镜配音 [${engine}]...`);

  const manifestData = {
    projectId,
    engine,
    voiceName,
    referenceUrl,
    requestLanguage: engine === 'xtts' || engine === 'qwen-tts' || engine === 'cosyvoice' ? requestLanguage : null,
    requestSpeed,
    requestTemperature: engine === 'chattts' ? requestTemperature : null,
    requestTopP: engine === 'chattts' ? requestTopP : null,
    requestTopK: engine === 'chattts' ? requestTopK : null,
    requestModel,
    requestInstruction,
    generatedAt: new Date().toISOString(),
    shots: shots.map((shot) => {
      const speech = resolveShotSpeechPlan(shot, voiceSettings, engine);
      return {
        id: shot.id,
        title: shot.title,
        text: speech.rawText,
        spokenText: speech.spokenText,
        language: speech.language,
      };
    }),
  };
  const scriptsManifestPath = path.join(jobVoiceDir, 'voice-job.json');
  fs.writeFileSync(scriptsManifestPath, JSON.stringify(manifestData, null, 2));

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const speech = resolveShotSpeechPlan(shot, voiceSettings, engine);
    const text = speech.spokenText;
    if (!speech.rawText) {
      throw new Error(`Shot ${shot.id} has no narration text`);
    }

    update(
      clamp(15 + Math.round(((index + 1) / shots.length) * 75), 15, 90),
      `生成配音 ${index + 1}/${shots.length}: ${shot.title || shot.id} [${engine}]`,
    );

    const fileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFileSegment(shot.id)}.wav`;
    const outputPath = path.join(jobVoiceDir, fileName);

    await synthesizeClip({
      text,
      engine,
      voice: voiceRequest,
      speed: requestSpeed,
      language: speech.language || requestLanguage,
      referenceUrl,
      outputPath,
      temperature: requestTemperature,
      topP: requestTopP,
      topK: requestTopK,
      model: requestModel,
      instruction: requestInstruction,
    });

    const durationSeconds = probeDurationSeconds(outputPath);
    const relativeAssetPath = `/assets/voice/${projectId}/${job.id}/${fileName}`;

    segments.push({
      id: shot.id,
      text: speech.rawText,
      spokenText: text,
      outputPath,
      relativeAssetPath,
      durationSeconds,
    });

    generatedQueue.push({
      id: `tts-${shot.id}`,
      shotId: shot.id,
      status: 'done',
      durationSeconds,
      voiceFile: relativeAssetPath,
      language: speech.language || requestLanguage,
    });
  }

  update(95, '整理语音任务结果...');

  const manifestPath = path.join(jobVoiceDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    engine: engine === SYSTEM_SAY_ENGINE ? SYSTEM_SAY_ENGINE : `${engine}-http`,
    engineName: engine,
    voice: voiceName,
    referenceUrl,
    requestLanguage: engine === 'xtts' || engine === 'qwen-tts' || engine === 'cosyvoice' ? requestLanguage : null,
    requestSpeed,
    requestTemperature: engine === 'chattts' ? requestTemperature : null,
    requestTopP: engine === 'chattts' ? requestTopP : null,
    requestTopK: engine === 'chattts' ? requestTopK : null,
    requestModel,
    requestInstruction,
    health,
    generatedAt: new Date().toISOString(),
    queue: generatedQueue,
  }, null, 2));

  update(100, '语音任务完成');
  return {
    jobId: job.id,
    type: 'voice',
    engine: engine === SYSTEM_SAY_ENGINE ? SYSTEM_SAY_ENGINE : `${engine}-http`,
    engineName: engine,
    voice: voiceName,
    referenceUrl,
    requestLanguage: engine === 'xtts' || engine === 'qwen-tts' || engine === 'cosyvoice' ? requestLanguage : null,
    requestSpeed,
    requestModel,
    requestInstruction,
    manifestFile: `/assets/voice/${projectId}/${job.id}/manifest.json`,
    queue: generatedQueue,
    totalClips: generatedQueue.length,
    totalDurationSeconds: Math.round(
      generatedQueue.reduce((sum, item) => sum + item.durationSeconds, 0) * 1000,
    ) / 1000,
  };
}

function getVoiceCapabilities() {
  return {
    engines: {
      'system-say': {
        healthUrl: null,
        synthUrl: null,
        name: 'macOS system say',
        description: '系统级中文 TTS 兜底，适合本地 HTTP 语音服务不可用时继续出声',
        voices: ['Tingting', 'Eddy (中文（中国大陆）)', 'Flo (中文（中国大陆）)', 'Meijia'],
      },
      melo: {
        healthUrl: ENGINES.melo.healthUrl,
        synthUrl: ENGINES.melo.synthUrl,
        name: 'MeloTTS',
        description: '高质量中文 TTS (本地)',
        voices: ['melo', 'meijia', 'eddy', 'flo'],
      },
      chattts: {
        healthUrl: ENGINES.chattts.healthUrl,
        synthUrl: ENGINES.chattts.synthUrl,
        name: 'ChatTTS',
        description: '本地对话式中文 TTS，当前默认使用固定 speaker seed',
        voices: ['speaker_seed'],
      },
      openvoice: {
        healthUrl: ENGINES.openvoice.healthUrl,
        synthUrl: ENGINES.openvoice.synthUrl,
        name: 'OpenVoice V2',
        description: '本地语音克隆 + 多语言 TTS (支持参考音频音色克隆)',
        voices: ['zh', 'en', 'es', 'fr', 'jp', 'kr'],
        supportsCloning: true,
      },
      xtts: {
        healthUrl: ENGINES.xtts.healthUrl,
        synthUrl: ENGINES.xtts.synthUrl,
        name: 'XTTS-v2',
        description: '本地真人音色克隆 + 多语言配音，适合 macOS 本地部署',
        voices: ['speaker-alias'],
        supportsCloning: true,
        requiresReference: true,
      },
      'qwen-tts': {
        healthUrl: null,
        synthUrl: null,
        name: 'Qwen TTS (DashScope)',
        description: '阿里云百炼千问语音合成，支持自定义克隆音色并直接落地为 wav',
        voices: ['system-voice', 'cloned-voice'],
        supportsCloning: true,
        requiresReference: false,
      },
      cosyvoice: {
        healthUrl: null,
        synthUrl: null,
        name: 'CosyVoice (DashScope)',
        description: '阿里云百炼 CosyVoice 合成，支持现成 voice id、语速 rate 和 instruct 控制',
        voices: ['cosyvoice-v3.5-plus-bailian-*'],
        supportsCloning: false,
        requiresReference: false,
        supportsInstruction: true,
      },
    },
    defaultEngine: 'chattts',
  };
}

module.exports = {
  processVoiceJob,
  getVoiceCapabilities,
  normalizeSpeechTextForTts,
  resolveTtsLanguageForText,
};
