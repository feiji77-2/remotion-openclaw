// Builders utilities — inferAccent, inferManualGlyph, normalizeDurationInFrames, collectListTokens

const {ACCENT_ROTATION} = require('./constants.js');
const {safeString, toNumber, uniqueList: uList, asArray} = require('./text-utils.js');
const {getDisplayPoints} = require('./extractors.js');
const {splitNarrationUnits} = require('./text-utils.js');

const inferAccent = (shot, index) => {
  const tone = `${safeString(shot?.style)} ${safeString(shot?.mood)} ${safeString(shot?.title)} ${safeString(shot?.visualFocusZh)}`.toLowerCase();
  if (/warm|发布|升级|结论|收束|里程碑|spark|cta/.test(tone)) {
    return index % 2 === 0 ? 'orange' : 'yellow';
  }
  if (/cool|tech|并行|system|security|terminal|code|memory|tool/.test(tone)) {
    return index % 2 === 0 ? 'cyan' : 'green';
  }
  return ACCENT_ROTATION[index % ACCENT_ROTATION.length];
};

const buildOverlay = (project, width, height) => {
  if (project?.defaultPlatformOverlay === false || project?.overlay === false) {
    return false;
  }
  const projectId = safeString(project?.projectId) || 'openclaw';
  const title = safeString(project?.title);
  return {
    brand: safeString(project?.brand) || 'OpenClaw',
    account: safeString(project?.account) || `@${projectId}`,
    searchLabel: safeString(project?.searchLabel) || title || 'Search reusable scenes',
    watermark: safeString(project?.watermark) || `${width}x${height}`,
  };
};

const normalizeDurationInFrames = (shot, fps) => {
  const durationSeconds = Math.max(1.8, toNumber(shot?.durationSeconds, 6));
  return Math.max(54, Math.round(durationSeconds * fps));
};

const collectListTokens = (shot, max = 4) => {
  const narrationUnits = splitNarrationUnits(shot?.narration);
  return uList(
    [
      ...getDisplayPoints(shot),
      ...asArray(shot?.keywords),
      ...narrationUnits,
    ],
    max,
  );
};

const inferManualGlyph = (value) => {
  const text = safeString(value);
  return /^(?:[A-Za-z0-9#+*?]{1,3})$/.test(text) ? text : '';
};

module.exports = {
  inferAccent,
  buildOverlay,
  normalizeDurationInFrames,
  collectListTokens,
  inferManualGlyph,
};