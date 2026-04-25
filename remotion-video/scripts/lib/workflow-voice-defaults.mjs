import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..', '..');

const safeString = (value) => String(value || '').trim();

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const toRelativeVoicePath = (value) => {
  const normalized = safeString(value).replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }
  return path.isAbsolute(normalized)
    ? normalized
    : normalized.replace(/^\.?\//, '');
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
  const defaultVoiceEngine = safeString(env.WORKFLOW_DEFAULT_VOICE_ENGINE).toLowerCase();
  const defaultVoiceSpeed = safeString(env.WORKFLOW_DEFAULT_VOICE_SPEED);
  const voiceSpeedExplicit = Boolean(options?.voiceSpeedExplicit);
  const defaultCosyVoice = safeString(env.COSYVOICE_DEFAULT_VOICE);
  const defaultCosyLanguage = safeString(env.COSYVOICE_DEFAULT_LANGUAGE) || 'zh-cn';
  const defaultCosyInstruction = safeString(env.COSYVOICE_DEFAULT_INSTRUCTION);
  const defaultSpeaker = safeString(env.WORKFLOW_DEFAULT_XTTS_SPEAKER) || 'daman-business-001';
  const defaultLanguage = safeString(env.WORKFLOW_DEFAULT_XTTS_LANGUAGE) || 'zh-cn';
  const configuredReference = safeString(env.WORKFLOW_DEFAULT_XTTS_REFERENCE)
    || path.join('runtime', 'voices', 'xtts', `${defaultSpeaker}.wav`);
  const defaultReference = toRelativeVoicePath(configuredReference);
  const defaultReferenceAbsolute = path.isAbsolute(defaultReference)
    ? defaultReference
    : path.resolve(cwd, defaultReference);
  const hasDefaultReference = await fileExistsImpl(defaultReferenceAbsolute);

  const explicit = {
    engine: Boolean(options?.voiceEngineExplicit),
    speaker: Boolean(options?.speakerExplicit),
    reference: Boolean(options?.referenceExplicit),
    language: Boolean(options?.voiceLanguageExplicit),
  };
  const hasAnyExplicitVoiceOverride = Object.values(explicit).some(Boolean);
  const currentEngine = safeString(nextOptions.voiceEngine).toLowerCase();
  const shouldAutoSelectCosyVoice = (
    !hasAnyExplicitVoiceOverride
    && defaultVoiceEngine === 'cosyvoice'
    && Boolean(defaultCosyVoice)
  );
  const shouldAutoSelectXtts = !hasAnyExplicitVoiceOverride && hasDefaultReference;
  const isOrWillBeXtts = currentEngine === 'xtts' || shouldAutoSelectXtts;
  const isOrWillBeCosyVoice = currentEngine === 'cosyvoice' || shouldAutoSelectCosyVoice;

  if (shouldAutoSelectCosyVoice) {
    nextOptions.voiceEngine = 'cosyvoice';
  } else if (shouldAutoSelectXtts) {
    nextOptions.voiceEngine = 'xtts';
  }

  if (isOrWillBeCosyVoice && defaultCosyVoice) {
    if (!voiceSpeedExplicit && defaultVoiceSpeed) {
      nextOptions.voiceSpeed = defaultVoiceSpeed;
    }
    if (!explicit.speaker && !safeString(nextOptions.speaker)) {
      nextOptions.speaker = defaultCosyVoice;
    }

    if (!explicit.language && !safeString(nextOptions.voiceLanguage)) {
      nextOptions.voiceLanguage = defaultCosyLanguage;
    }

    if (!safeString(nextOptions.voiceInstruction) && defaultCosyInstruction) {
      nextOptions.voiceInstruction = defaultCosyInstruction;
    }
  }

  if (!voiceSpeedExplicit && defaultVoiceSpeed) {
    nextOptions.voiceSpeed = defaultVoiceSpeed;
  }

  if (isOrWillBeXtts && hasDefaultReference) {
    if (!explicit.speaker && !safeString(nextOptions.speaker)) {
      nextOptions.speaker = defaultSpeaker;
    }

    if (!explicit.reference && !safeString(nextOptions.reference)) {
      nextOptions.reference = defaultReference;
    }

    if (!explicit.language && !safeString(nextOptions.voiceLanguage)) {
      nextOptions.voiceLanguage = defaultLanguage;
    }
  }

  return {
    options: nextOptions,
    profile: hasDefaultReference
      ? {
          engine: 'xtts',
          speaker: defaultSpeaker,
          language: defaultLanguage,
          reference: defaultReference,
          referenceAbsolutePath: defaultReferenceAbsolute,
        }
      : shouldAutoSelectCosyVoice
        ? {
            engine: 'cosyvoice',
            speaker: defaultCosyVoice,
            language: defaultCosyLanguage,
            instruction: defaultCosyInstruction || '',
          }
      : null,
    applied: {
      autoSelectedCosyVoice: shouldAutoSelectCosyVoice,
      autoSelectedEngine: shouldAutoSelectXtts,
      filledSpeaker: isOrWillBeXtts && hasDefaultReference && !explicit.speaker && !safeString(options?.speaker),
      filledReference: isOrWillBeXtts && hasDefaultReference && !explicit.reference && !safeString(options?.reference),
      filledLanguage: isOrWillBeXtts && hasDefaultReference && !explicit.language && !safeString(options?.voiceLanguage),
    },
  };
}
