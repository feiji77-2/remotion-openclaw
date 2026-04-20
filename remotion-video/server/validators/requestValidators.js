const path = require('path');
const {assertWebhookAllowed, getSecurityConfig, normalizeString} = require('../security/apiSecurity');

const MAX_SCRIPT_LENGTH = 8_000;
const MAX_PROJECT_ID_LENGTH = 64;
const MAX_SHOTS = 24;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function sanitizeProjectId(value, fallback = 'default') {
  const safe = normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_PROJECT_ID_LENGTH);
  return safe || fallback;
}

function normalizePositiveInt(value, {min = 1, max = Number.MAX_SAFE_INTEGER} = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) {
    return null;
  }
  return rounded;
}

function normalizePublicAssetPath(value, {allowRemote = false} = {}) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    if (!allowRemote) {
      throw badRequest('Remote media URLs are disabled');
    }
    return normalized;
  }

  const stripped = normalized
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^public\//, '')
    .replace(/^\.?\//, '');
  const publicPath = stripped.startsWith('assets/') ? `/${stripped}` : stripped.startsWith('/assets/') ? stripped : null;
  if (!publicPath) {
    throw badRequest('Only public /assets/* paths are accepted');
  }

  const normalizedPath = path.posix.normalize(publicPath);
  if (!normalizedPath.startsWith('/assets/') || normalizedPath.includes('..')) {
    throw badRequest('Asset path must stay inside /assets');
  }
  return normalizedPath;
}

function normalizeAudioSegments(audioSegments, securityConfig = getSecurityConfig()) {
  if (audioSegments == null) {
    return null;
  }
  if (!Array.isArray(audioSegments)) {
    throw badRequest('audioSegments must be an array');
  }

  return audioSegments.map((segment, index) => {
    if (!segment || typeof segment !== 'object') {
      throw badRequest(`audioSegments[${index}] must be an object`);
    }
    return {
      src: normalizePublicAssetPath(segment.src, {allowRemote: securityConfig.allowRemoteMedia}),
      startFrame: normalizePositiveInt(segment.startFrame, {min: 0, max: 500_000}) ?? 0,
      durationInFrames: normalizePositiveInt(segment.durationInFrames, {min: 1, max: 500_000}) ?? 1,
    };
  });
}

function normalizeSubtitlePayload(subtitleData) {
  if (subtitleData == null) {
    return null;
  }
  if (!Array.isArray(subtitleData)) {
    throw badRequest('subtitleData must be an array');
  }
  return subtitleData.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw badRequest(`subtitleData[${index}] must be an object`);
    }
    const text = normalizeString(item.text);
    if (!text) {
      throw badRequest(`subtitleData[${index}].text is required`);
    }
    return {
      ...item,
      text,
      startFrame: normalizePositiveInt(item.startFrame, {min: 0, max: 500_000}) ?? 0,
      endFrame: normalizePositiveInt(item.endFrame, {min: 1, max: 500_000}) ?? 1,
    };
  });
}

function normalizeShots(shots) {
  if (shots == null) {
    return null;
  }
  if (!Array.isArray(shots)) {
    throw badRequest('shots must be an array');
  }
  if (shots.length > MAX_SHOTS) {
    throw badRequest(`shots must not exceed ${MAX_SHOTS}`);
  }
  return shots.map((shot, index) => {
    if (!shot || typeof shot !== 'object') {
      throw badRequest(`shots[${index}] must be an object`);
    }
    return {
      ...shot,
      id: normalizeString(shot.id) || `shot-${index + 1}`,
      title: normalizeString(shot.title) || `Shot ${index + 1}`,
      narration: normalizeString(shot.narration || shot.text),
      durationSeconds: Number.isFinite(Number(shot.durationSeconds)) ? Number(shot.durationSeconds) : 0,
    };
  });
}

function normalizeRenderOptions(options) {
  if (options == null) {
    return {};
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw badRequest('options must be an object');
  }
  const next = {...options};
  if (Array.isArray(options.frameRange) && options.frameRange.length === 2) {
    next.frameRange = [
      normalizePositiveInt(options.frameRange[0], {min: 0, max: 500_000}) ?? 0,
      normalizePositiveInt(options.frameRange[1], {min: 0, max: 500_000}) ?? 0,
    ];
  } else {
    delete next.frameRange;
  }
  if ('smokeTest' in next) {
    next.smokeTest = Boolean(options.smokeTest);
  }
  if ('smokeDurationFrames' in next) {
    next.smokeDurationFrames = normalizePositiveInt(options.smokeDurationFrames, {min: 1, max: 10_000});
  }
  return next;
}

async function normalizeRenderRequest(body, securityConfig = getSecurityConfig()) {
  const script = normalizeString(body.script);
  const rawProjectId = normalizeString(body.projectId);
  const projectId = sanitizeProjectId(rawProjectId);
  if (!script && !rawProjectId) {
    throw badRequest('script or projectId required');
  }
  if (script && script.length > MAX_SCRIPT_LENGTH) {
    throw badRequest(`script must be <= ${MAX_SCRIPT_LENGTH} characters`);
  }

  return {
    script: script || null,
    template: normalizeString(body.template) || 'caption',
    voice: normalizeString(body.voice) || 'chattts',
    webhook: await assertWebhookAllowed(body.webhook, securityConfig),
    projectId,
    quality: normalizeString(body.quality) || 'high',
    audioSegments: normalizeAudioSegments(body.audioSegments, securityConfig),
    subtitleFile: body.subtitleFile == null ? null : normalizePublicAssetPath(body.subtitleFile, {allowRemote: false}),
    subtitleStyle: normalizeString(body.subtitleStyle) || 'caption',
    subtitleText: normalizeString(body.subtitleText) || null,
    subtitleData: normalizeSubtitlePayload(body.subtitleData),
    typewriter: Boolean(body.typewriter),
    designJson: body.designJson && typeof body.designJson === 'object' ? body.designJson : null,
    shots: normalizeShots(body.shots),
    durationInFrames: normalizePositiveInt(body.durationInFrames, {min: 1, max: 500_000}),
    renderFps: normalizePositiveInt(body.renderFps, {min: 1, max: 240}),
    renderWidth: normalizePositiveInt(body.renderWidth, {min: 16, max: 7_680}),
    renderHeight: normalizePositiveInt(body.renderHeight, {min: 16, max: 7_680}),
    options: normalizeRenderOptions(body.options),
    submittedAt: new Date().toISOString(),
    submittedBy: normalizeString(body.userId) || 'api',
  };
}

function normalizeVoiceSettings(voiceSettings) {
  if (!voiceSettings || typeof voiceSettings !== 'object' || Array.isArray(voiceSettings)) {
    return {};
  }
  return {...voiceSettings};
}

function normalizeVoiceRequest(body) {
  const shots = normalizeShots(body.shots);
  if (!shots || shots.length === 0) {
    throw badRequest('shots required');
  }

  return {
    projectId: sanitizeProjectId(body.projectId),
    shots,
    voiceSettings: normalizeVoiceSettings(body.voiceSettings),
    submittedAt: new Date().toISOString(),
    submittedBy: normalizeString(body.userId) || 'api',
  };
}

function normalizeWorkflowRequest(body) {
  const stepId = normalizePositiveInt(body.stepId, {min: 1, max: 8});
  if (!stepId) {
    throw badRequest('stepId is required');
  }

  return {
    stepId,
    generationMeta: body.generationMeta && typeof body.generationMeta === 'object' ? body.generationMeta : {},
    projectState: body.projectState && typeof body.projectState === 'object' ? body.projectState : {},
    shotsState: Array.isArray(body.shotsState) ? body.shotsState : [],
    pipelineState: body.pipelineState && typeof body.pipelineState === 'object' ? body.pipelineState : {},
  };
}

function normalizeImageRequest(body) {
  const prompts = body.prompts && typeof body.prompts === 'object' ? body.prompts : null;
  if (!prompts) {
    throw badRequest('prompts is required');
  }
  return {
    projectId: sanitizeProjectId(body.projectId),
    prompts,
    shots: normalizeShots(body.shots) || [],
  };
}

module.exports = {
  badRequest,
  sanitizeProjectId,
  normalizePublicAssetPath,
  normalizeRenderRequest,
  normalizeVoiceRequest,
  normalizeWorkflowRequest,
  normalizeImageRequest,
  normalizePositiveInt,
};
