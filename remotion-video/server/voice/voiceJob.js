const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {
  ensureQwenCloneVoice,
  getQwenTtsHealth,
  resolveQwenCloneModel,
  resolveQwenSynthesisModel,
  resolveQwenTtsDefaultVoice,
  synthesizeQwenTtsToFile,
} = require('./qwenTtsClient');
const {enrichSegmentsWithWaveform} = require('./voiceTTSAnalyzer');

const PROJECT_ROOT = path.join(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const VOICE_DIR = path.join(PUBLIC_DIR, 'assets/voice');
const AFINFO_BIN = '/usr/bin/afinfo';
const ACTIVE_ENGINE = 'qwen-tts';
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

function safeString(value) {
  return String(value || '').trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
}

function sanitizeFileSegment(value) {
  return String(value || 'clip')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'clip';
}

function resolveEngine(engine, preset) {
  const normalized = safeString(engine || preset).toLowerCase();
  if (!normalized) {
    return ACTIVE_ENGINE;
  }

  if (
    normalized.includes('qwen')
    || normalized.includes('dashscope')
    || normalized.includes('bailian')
    || normalized.includes('aliyun')
    || normalized.includes('tongyi')
  ) {
    return ACTIVE_ENGINE;
  }

  return ACTIVE_ENGINE;
}

function resolveSpeed(speedValue) {
  const raw = String(speedValue || '1.0').trim().replace(/x$/i, '');
  return clamp(Number(raw) || 1, 0.5, 2.0);
}

function resolveVoiceLanguage(voiceSettings) {
  const normalized = safeString(
    voiceSettings?.language || voiceSettings?.voiceLanguage || 'zh-cn',
  ).toLowerCase();

  if (!normalized) return 'zh-cn';
  if (normalized === 'auto') return 'auto';
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'chinese') return 'zh-cn';
  if (normalized === 'en' || normalized === 'en-us' || normalized === 'english') return 'en';
  if (normalized === 'ja' || normalized === 'jp' || normalized === 'japanese') return 'ja';
  if (normalized === 'ko' || normalized === 'kr' || normalized === 'korean') return 'ko';
  if (normalized === 'pt' || normalized === 'pt-br' || normalized === 'portuguese') return 'pt';
  return normalized;
}

function resolveVoiceQwenTts(voiceSettings) {
  return safeString(
    voiceSettings?.voice
      || voiceSettings?.speaker
      || voiceSettings?.speakerSeed
      || voiceSettings?.speaker_seed
      || '',
  );
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
      : typeof shot.text === 'string'
        ? shot.text.trim()
        : typeof shot.scriptExcerpt === 'string'
          ? shot.scriptExcerpt.trim()
          : typeof shot.scriptSourceText === 'string'
            ? shot.scriptSourceText.trim()
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

function normalizeSpeechTextForTts(value, {language} = {}) {
  const text = String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  const normalizedLanguage = resolveVoiceLanguage({language});
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

function resolveTtsLanguageForText(text, voiceSettings) {
  const fallbackLanguage = resolveVoiceLanguage(voiceSettings);
  if (voiceSettings?.languageExplicit) {
    return fallbackLanguage;
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

function resolveShotSpeechPlan(shot, voiceSettings) {
  const rawText = resolveShotText(shot, voiceSettings);
  const language = resolveTtsLanguageForText(rawText, voiceSettings);
  const spokenText = normalizeSpeechTextForTts(rawText, {language});
  return {
    rawText,
    spokenText,
    language,
  };
}

async function resolveHealthyVoiceEngine(update) {
  update?.(5, '检查语音引擎 (qwen-tts)...');
  const health = getQwenTtsHealth(process.env);
  if (health.status !== 'ok') {
    throw new Error(`Qwen TTS 不可用：${health.message || '未完成配置'}`);
  }
  return {
    engine: ACTIVE_ENGINE,
    health,
  };
}

async function prepareVoiceSynthesisPlan(voiceSettings = {}, update) {
  const requestedEngine = resolveEngine(voiceSettings.engine, voiceSettings.preset);
  const resolvedEngine = await resolveHealthyVoiceEngine(update);
  if (resolvedEngine.engine !== requestedEngine) {
    update?.(8, `已忽略旧引擎 ${requestedEngine}，统一切换到 qwen-tts`);
  }

  let voiceRequest = resolveVoiceQwenTts(voiceSettings);
  const referenceUrl = voiceSettings.referenceUrl || voiceSettings.reference_url || null;
  const requestLanguage = resolveVoiceLanguage(voiceSettings);
  const requestSpeed = resolveSpeed(voiceSettings.speed);
  let requestModel = resolveQwenSynthesisModel({
    voiceSettings,
    voice: voiceRequest,
    referenceUrl,
    env: process.env,
  });

  if (safeString(voiceSettings.instruction || voiceSettings.voiceInstruction)) {
    update?.(7, 'Qwen TTS 链路不使用 instruction，已忽略该字段');
  }

  if (referenceUrl && !voiceRequest) {
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

  if (!voiceRequest) {
    voiceRequest = resolveQwenTtsDefaultVoice(process.env);
    requestModel = resolveQwenSynthesisModel({
      voiceSettings,
      voice: voiceRequest,
      referenceUrl,
      env: process.env,
    });
  }

  return {
    resolvedEngine,
    voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
  };
}

async function synthesizeClip({text, voice, speed, language, referenceUrl, outputPath, model}) {
  return await synthesizeQwenTtsToFile({
    text,
    voice: voice || resolveQwenTtsDefaultVoice(process.env),
    language,
    outputPath,
    model: model || resolveQwenSynthesisModel({
      voiceSettings: {},
      voice,
      referenceUrl,
      env: process.env,
    }),
    speed,
    env: process.env,
  }).then(() => outputPath);
}

function probeDurationSeconds(filePath) {
  const ffprobe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
    {cwd: PROJECT_ROOT, encoding: 'utf8'},
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

  const {
    resolvedEngine,
    voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
  } = await prepareVoiceSynthesisPlan(voiceSettings, update);

  const jobVoiceDir = path.join(VOICE_DIR, projectId, job.id);
  ensureDir(jobVoiceDir);

  const generatedQueue = [];
  const manifestData = {
    projectId,
    engine: ACTIVE_ENGINE,
    voiceName: voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
    generatedAt: new Date().toISOString(),
    shots: shots.map((shot) => {
      const speech = resolveShotSpeechPlan(shot, voiceSettings);
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

  update(10, '准备分镜配音 [qwen-tts]...');

  // P1: 全并行合成 — 6-12 分镜从串行 ~60s → 并行 ~10s
  const safeConcurrency = Math.min(
    Number(process.env.TTS_CONCURRENCY) || shots.length,
    shots.length,
  );

  // 每个 shot 的合成任务（异步）
  const synthesisPromises = shots.map(async (shot, index) => {
    const speech = resolveShotSpeechPlan(shot, voiceSettings);
    const text = speech.spokenText;
    if (!speech.rawText) {
      throw new Error(`Shot ${shot.id} has no narration text`);
    }
    const fileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFileSegment(shot.id)}.wav`;
    const outputPath = path.join(jobVoiceDir, fileName);
    await synthesizeClip({
      text,
      voice: voiceRequest,
      speed: requestSpeed,
      language: speech.language || requestLanguage,
      referenceUrl,
      outputPath,
      model: requestModel,
    });
    return { shot, speech, index, fileName, outputPath };
  });

  // 分批并行执行（避免同时打开太多 HTTP 连接）
  const batches = [];
  for (let i = 0; i < shots.length; i += safeConcurrency) {
    batches.push(synthesisPromises.slice(i, i + safeConcurrency));
  }

  for (const batch of batches) {
    await Promise.all(batch);
  }

  // 全部合成完毕，顺序收集结果并探测时长
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const speech = resolveShotSpeechPlan(shot, voiceSettings);
    const fileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFileSegment(shot.id)}.wav`;
    const outputPath = path.join(jobVoiceDir, fileName);
    const durationSeconds = probeDurationSeconds(outputPath);
    const relativeAssetPath = `/assets/voice/${projectId}/${job.id}/${fileName}`;
    generatedQueue.push({
      id: `tts-${shot.id}`,
      shotId: shot.id,
      status: 'done',
      durationSeconds,
      voiceFile: relativeAssetPath,
      language: speech.language || requestLanguage,
      spokenText: speech.spokenText,
      rawText: speech.rawText,
      text: speech.rawText,
    });
    update(
      clamp(15 + Math.round(((index + 1) / shots.length) * 75), 15, 90),
      `生成配音 ${index + 1}/${shots.length}: ${shot.title || shot.id} [qwen-tts]`,
    );
  }

  // Attach waveform and peakTime data to TTS segments (using real WAV analysis)
  const enrichedQueue = enrichSegmentsWithWaveform(generatedQueue, { publicDir: PUBLIC_DIR });

  update(95, '整理语音任务结果...');

  const manifestPath = path.join(jobVoiceDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    engine: ACTIVE_ENGINE,
    engineName: ACTIVE_ENGINE,
    voice: voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
    health: resolvedEngine.health,
    generatedAt: new Date().toISOString(),
    queue: enrichedQueue,
  }, null, 2));

  update(100, '语音任务完成');
  return {
    jobId: job.id,
    type: 'voice',
    engine: ACTIVE_ENGINE,
    engineName: ACTIVE_ENGINE,
    voice: voiceRequest,
    referenceUrl,
    requestLanguage,
    requestSpeed,
    requestModel,
    manifestFile: `/assets/voice/${projectId}/${job.id}/manifest.json`,
    queue: enrichedQueue,
    totalClips: enrichedQueue.length,
    totalDurationSeconds: Math.round(
      enrichedQueue.reduce((sum, item) => sum + item.durationSeconds, 0) * 1000,
    ) / 1000,
  };
}

function getVoiceCapabilities() {
  return {
    engines: {
      'qwen-tts': {
        healthUrl: null,
        synthUrl: null,
        name: 'Qwen TTS (DashScope)',
        description: '阿里云百炼千问语音合成，支持系统音色和参考音频克隆',
        voices: ['system-voice', 'cloned-voice'],
        supportsCloning: true,
        requiresReference: false,
      },
    },
    defaultEngine: ACTIVE_ENGINE,
  };
}

module.exports = {
  processVoiceJob,
  getVoiceCapabilities,
  normalizeSpeechTextForTts,
  prepareVoiceSynthesisPlan,
  probeDurationSeconds,
  resolveTtsLanguageForText,
  resolveShotSpeechPlan,
  sanitizeFileSegment,
};
