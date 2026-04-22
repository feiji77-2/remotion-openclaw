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
  const defaultSpeaker = safeString(env.WORKFLOW_DEFAULT_XTTS_SPEAKER) || 'anchor';
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
  const shouldAutoSelectXtts = !hasAnyExplicitVoiceOverride && hasDefaultReference;
  const isOrWillBeXtts = currentEngine === 'xtts' || shouldAutoSelectXtts;

  if (shouldAutoSelectXtts) {
    nextOptions.voiceEngine = 'xtts';
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
      : null,
    applied: {
      autoSelectedEngine: shouldAutoSelectXtts,
      filledSpeaker: isOrWillBeXtts && hasDefaultReference && !explicit.speaker && !safeString(options?.speaker),
      filledReference: isOrWillBeXtts && hasDefaultReference && !explicit.reference && !safeString(options?.reference),
      filledLanguage: isOrWillBeXtts && hasDefaultReference && !explicit.language && !safeString(options?.voiceLanguage),
    },
  };
}
