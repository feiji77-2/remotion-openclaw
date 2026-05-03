// Extractors — getDisplayTitle, getDisplaySummary, getDisplayPoints, heading rules

const {safeString, compactText, isPlaceholderText} = require('./text-utils.js');
const {FEATURE_RAIL_HEADING_RULES} = require('./output-builders.js');

const getDisplayTitle = (shot, fallback = '') => {
  return safeString(shot?.displayTitle || shot?.title || fallback);
};

const getDisplaySummary = (shot, fallback = '') => {
  return safeString(shot?.displaySummary || shot?.narration || fallback);
};

const getDisplayPoints = (shot, max = Infinity) => {
  const {semanticArray} = require('./text-utils.js');
  const preferred = semanticArray(shot?.displayPoints, max);
  if (preferred.length > 0) {
    return preferred;
  }
  return semanticArray(shot?.dataPoints, max);
};

const buildHeroHighlightWord = (shot, primaryText) => {
  const {extractTargetModel} = require('./extractors.js');
  const keywordModel = extractTargetModel(`${safeString(shot?.narration)} ${getDisplayTitle(shot)}`);
  if (keywordModel) {
    return keywordModel.toLowerCase();
  }
  const {extractAsciiPhrases} = require('./extractors.js');
  const asciiPhrase = extractAsciiPhrases(`${safeString(shot?.narration)} ${getDisplayTitle(shot)}`)
    .find((item) => item.length >= 4);
  if (asciiPhrase) {
    return asciiPhrase.toLowerCase();
  }
  const {splitTitleTokens} = require('./extractors.js');
  const titleTokens = splitTitleTokens(primaryText);
  const longToken = titleTokens.find((item) => item.length >= 4);
  return safeString(longToken || titleTokens[0] || '');
};

const buildFeatureRailHeading = (shot, fallbackTitle) => {
  const summary = getDisplaySummary(shot, shot?.narration);
  const {buildSceneSummary} = require('./scene-items.js');
  for (const rule of FEATURE_RAIL_HEADING_RULES) {
    if (rule.matchAll) {
      if (rule.patterns.every((p) => p.test(summary))) {
        return rule.replacement;
      }
    } else if (rule.patterns[0].test(summary)) {
      return rule.replacement;
    }
  }
  return compactText(buildSceneSummary(shot, getDisplayTitle(shot), 28) || fallbackTitle, 28);
};

const splitTitleTokens = (value) => {
  return safeString(value)
    .replace(/\s+/g, ' ')
    .split(/[·•、，,;；:：/\\|+-]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const splitListPhrases = (value) => {
  return safeString(value)
    .split(/[,，;；、\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const extractModelTokens = (value) => {
  return safeString(value).match(/(?:K2\.?6|GPT-5\.?5?|GPT-4(?:\.\d+)?|Claude-?\d(?:\.\d+)?|Gemini-?\d(?:\.\d+)?|Llama-?\d(?:\.\d+)?|Qwen-?\d(?:\.\d+)?|DeepSeek-?\d(?:\.\d+)?|Mistral-?\w+|Yi-?\w+|GLM-?\w+|InternLM(?:-?\w+)?)/gi) || [];
};

const extractAsciiPhrases = (value) => {
  const text = safeString(value);
  const variants = [
    /[a-zA-Z][a-zA-Z0-9_+-]{2,}(?:\s*[/-]\s*[a-zA-Z][a-zA-Z0-9_+-]{2,})*/g,
    /[A-Z]{2,}(?:[a-z][a-zA-Z0-9]*)?(?:\s+[A-Z]{2,})*/g,
    /[a-z][a-zA-Z0-9]{3,}(?:\s+[a-z][a-zA-Z0-9]{3,})*/g,
  ];
  const results = new Set();
  for (const re of variants) {
    for (const match of text.match(re) || []) {
      results.add(match.trim());
    }
  }
  return Array.from(results);
};

const normalizeEvidenceChip = (value) => {
  const text = safeString(value);
  return text
    .replace(/^[""''""«»‹›<>《》【】\[\]]+|[""''""«»‹›<>《》【】\[\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractEvidenceChips = (value, max = 3) => {
  const {uniqueList: uList} = require('./text-utils.js');
  const text = safeString(value);
  const chips = text.split(/[,，;；|]/).map((s) => normalizeEvidenceChip(s)).filter(Boolean);
  return uList(chips, max);
};

const extractTargetModel = (value) => {
  const {safeString: sStr} = require('./text-utils.js');
  const candidates = extractModelTokens(sStr(value));
  if (candidates.length === 0) {
    return '';
  }
  return candidates.reduce((longest, current) => (current.length > longest.length ? current : longest), '');
};

module.exports = {
  getDisplayTitle,
  getDisplaySummary,
  getDisplayPoints,
  buildHeroHighlightWord,
  buildFeatureRailHeading,
  splitTitleTokens,
  splitListPhrases,
  extractModelTokens,
  extractAsciiPhrases,
  normalizeEvidenceChip,
  extractEvidenceChips,
  extractTargetModel,
};