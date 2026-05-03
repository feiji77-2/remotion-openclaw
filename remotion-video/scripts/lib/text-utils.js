// Text manipulation utilities — safeString, compactText, deduplication, splitting

const {
  PLACEHOLDER_TEXT_RE,
} = require('./constants.js');

const safeString = (value) => String(value || '').trim();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const compactText = (value, max = 80) => {
  const text = safeString(value);
  if (!text) {
    return '';
  }
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
};

const compactSimilarityKey = (value) => {
  return safeString(value)
    .replace(/[""'"''（）()【】[\]，,、。！？!?\s…:：;；/\\|+-]+/g, '')
    .toLowerCase();
};

const isCompactDuplicate = (left, right) => {
  const leftKey = compactSimilarityKey(left);
  const rightKey = compactSimilarityKey(right);
  if (!leftKey || !rightKey) {
    return false;
  }
  if (leftKey === rightKey) {
    return true;
  }
  const minLength = Math.min(leftKey.length, rightKey.length);
  return minLength >= 6 && (leftKey.includes(rightKey) || rightKey.includes(leftKey));
};

const isCompactDuplicateByKey = (leftKey, rightKey) => {
  if (!leftKey || !rightKey) {
    return false;
  }
  if (leftKey === rightKey) {
    return true;
  }
  const minLength = Math.min(leftKey.length, rightKey.length);
  return minLength >= 6 && (leftKey.includes(rightKey) || rightKey.includes(leftKey));
};

const compactUniqueItems = (items, maxChars, max = Infinity) => {
  const output = [];
  for (const item of items) {
    const candidate = compactText(item, maxChars);
    if (!candidate) {
      continue;
    }
    if (output.some((entry) => isCompactDuplicate(entry, candidate))) {
      continue;
    }
    output.push(candidate);
    if (output.length >= max) {
      break;
    }
  }
  return output;
};

const asArray = (value) => {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
};

const isPlaceholderText = (value) => {
  const text = safeString(value);
  if (!text) {
    return true;
  }
  if (PLACEHOLDER_TEXT_RE.test(text)) {
    return true;
  }
  if (/^(?:scene ready|summary|detail|focus)$/i.test(text)) {
    return true;
  }
  if (/^\d+(?:\.\d+)?$/.test(text) && text.length <= 4) {
    return true;
  }
  return false;
};

const uniqueList = (items, max = Infinity) => {
  const seen = new Set();
  const output = [];
  for (const item of items.map((entry) => safeString(entry)).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
    if (output.length >= max) {
      break;
    }
  }
  return output;
};

const semanticArray = (value, max = Infinity) => {
  return uniqueList(
    asArray(value)
      .map((item) => safeString(item))
      .filter((item) => !isPlaceholderText(item)),
    max,
  );
};

const splitTextUnits = (value) => {
  return uniqueList(
    safeString(value)
      .replace(/\s+/g, ' ')
      .split(/[。！？!?\n]|(?<=，)|(?<=；)|(?<=：)|(?<=,)|(?<=;)|(?<=:)/u)
      .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
      .filter(Boolean),
    12,
  );
};

const splitNarrationUnits = (value) => {
  const parts = splitTextUnits(value);
  const output = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.length > 40) {
      const mid = Math.floor(part.length / 2);
      const commaIndex = part.indexOf('，', mid - 20);
      const semicolonIndex = part.indexOf('；', mid - 20);
      const splitIndex = commaIndex !== -1 ? commaIndex : semicolonIndex;
      if (splitIndex !== -1 && splitIndex > 0 && splitIndex < part.length - 1) {
        output.push(part.slice(0, splitIndex + 1), part.slice(splitIndex + 1));
        continue;
      }
    }
    output.push(part);
  }
  return output;
};

module.exports = {
  safeString,
  toNumber,
  compactText,
  compactSimilarityKey,
  isCompactDuplicate,
  isCompactDuplicateByKey,
  compactUniqueItems,
  asArray,
  isPlaceholderText,
  uniqueList,
  semanticArray,
  splitTextUnits,
  splitNarrationUnits,
};