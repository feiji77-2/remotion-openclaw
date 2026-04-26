import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..', '..');
const ACTIVE_ENGINE = 'qwen-tts';

const safeString = (value) => String(value || '').trim();

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const normalizeEngine = (value) => {
  const normalized = safeString(value).toLowerCase();
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
};

export async function resolveWorkflowVoiceDefaults(
  options,
  {
    cwd = REMOTION_ROOT,
    fileExistsImpl = fileExists,
    env = process.env,
  } = {},
) {
  const nextOptions = {...options};
  const defaultVoiceSpeed = safeString(env.WORKFLOW_DEFAULT_VOICE_SPEED);
  const voiceSpeedExplicit = Boolean(options?.voiceSpeedExplicit);
  const defaultVoice = safeString(env.QWEN_TTS_DEFAULT_VOICE) || 'Cherry';
  const defaultLanguage = safeString(
    env.WORKFLOW_DEFAULT_QWEN_LANGUAGE
      || env.QWEN_TTS_DEFAULT_LANGUAGE
      || 'zh-cn',
  ) || 'zh-cn';
  const defaultModel = safeString(env.QWEN_TTS_MODEL || env.QWEN_TTS_SYSTEM_MODEL);
  const explicit = {
    engine: Boolean(options?.voiceEngineExplicit),
    speaker: Boolean(options?.speakerExplicit),
    language: Boolean(options?.voiceLanguageExplicit),
    model: Boolean(options?.voiceModelExplicit),
  };
  const requestedEngine = normalizeEngine(nextOptions.voiceEngine || env.WORKFLOW_DEFAULT_VOICE_ENGINE);
  const hasSpeakerAliasInRegistry = await fileExistsImpl(path.resolve(cwd, 'runtime', 'voices', 'qwen', 'voice-registry.json'));

  nextOptions.voiceEngine = requestedEngine;

  if (!voiceSpeedExplicit && defaultVoiceSpeed) {
    nextOptions.voiceSpeed = defaultVoiceSpeed;
  }

  if (!explicit.speaker && !safeString(nextOptions.speaker)) {
    nextOptions.speaker = defaultVoice;
  }

  if (!explicit.language && !safeString(nextOptions.voiceLanguage)) {
    nextOptions.voiceLanguage = defaultLanguage;
  }

  if (!explicit.model && !safeString(nextOptions.voiceModel) && defaultModel) {
    nextOptions.voiceModel = defaultModel;
  }

  return {
    options: nextOptions,
    profile: {
      engine: ACTIVE_ENGINE,
      speaker: safeString(nextOptions.speaker) || defaultVoice,
      language: safeString(nextOptions.voiceLanguage) || defaultLanguage,
      model: safeString(nextOptions.voiceModel) || defaultModel || null,
      hasSpeakerAliasInRegistry,
    },
    applied: {
      forcedQwenEngine: requestedEngine === ACTIVE_ENGINE,
      filledSpeaker: !explicit.speaker && !safeString(options?.speaker),
      filledLanguage: !explicit.language && !safeString(options?.voiceLanguage),
      filledModel: !explicit.model && !safeString(options?.voiceModel) && Boolean(defaultModel),
    },
  };
}
