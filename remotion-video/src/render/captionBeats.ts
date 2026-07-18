/**
 * captionBeats.ts — 口播文案切分与字幕节拍生成
 *
 * 将完整的口播文案按语义切分为字幕段落（beats），再按可用帧数
 * 分配每段时长，生成 CaptionBeat 时间线。
 *
 * v2 改进：增加 CJK（中日韩）文本检测，对中文等高密度表意文字
 * 使用字符级帧率计算而非英文单词级。
 */

const SENTENCE_END_RE = /([。！？!?]+)/;
const SOFT_BREAK_RE = /([，、；：])/;

/** CJK 统一表意文字范围（中日韩统一表意文字 + 常用标点） */
const CJK_RE = /[一-鿿㐀-䶿豈-﫿　-〿＀-￯]/;

/**
 * 判断文本是否为 CJK 主导（中/日/韩文字占比 >= 40%）。
 * 用于选择帧率计算策略：字符级 vs 单词级。
 */
const isCJKText = (text: string): boolean => {
  if (!text) return false;
  const charCount = text.length;
  let cjkCount = 0;
  for (let i = 0; i < charCount; i++) {
    if (CJK_RE.test(text[i])) cjkCount++;
  }
  return cjkCount / charCount >= 0.4;
};

const sanitizeBeat = (text: string) => text.replace(/\s+/g, ' ').trim();

const splitWithDelimiters = (text: string, delimiter: RegExp) => {
  const parts = text.split(delimiter);
  const result: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i] || '';
    const tail = parts[i + 1] || '';
    const chunk = sanitizeBeat(`${body}${tail}`);
    if (chunk) result.push(chunk);
  }

  return result;
};

const packClauses = (clauses: string[], targetChars: number) => {
  const beats: string[] = [];
  let current = '';

  clauses.forEach((clause) => {
    const candidate = sanitizeBeat(`${current}${clause}`);
    const currentLen = current.replace(/\s+/g, '').length;
    const candidateLen = candidate.replace(/\s+/g, '').length;

    if (!current) {
      current = clause;
      return;
    }

    if (currentLen < 8 || candidateLen <= targetChars) {
      current = candidate;
      return;
    }

    beats.push(sanitizeBeat(current));
    current = clause;
  });

  if (current) beats.push(sanitizeBeat(current));

  return beats;
};

const splitLongSentence = (sentence: string) => {
  const normalized = sanitizeBeat(sentence);
  const plainLength = normalized.replace(/\s+/g, '').length;
  if (plainLength <= 22) return [normalized];

  const clauses = splitWithDelimiters(normalized, SOFT_BREAK_RE);
  if (clauses.length <= 1) return [normalized];

  return packClauses(clauses, 18);
};

export const splitCaptionBeats = (text: string) => {
  const sentences = splitWithDelimiters(text, SENTENCE_END_RE);
  const beats = sentences.flatMap(splitLongSentence).map(sanitizeBeat).filter(Boolean);

  if (beats.length === 0) {
    const fallback = sanitizeBeat(text);
    return fallback ? [fallback] : [];
  }

  const packed: string[] = [];
  beats.forEach((beat) => {
    const plainLength = beat.replace(/\s+/g, '').length;
    const prev = packed[packed.length - 1];
    const prevLength = prev ? prev.replace(/\s+/g, '').length : 0;

    if (prev && plainLength <= 6 && prevLength <= 18) {
      packed[packed.length - 1] = sanitizeBeat(`${prev}${beat}`);
      return;
    }

    packed.push(beat);
  });

  return packed;
};

export type CaptionBeat = {
  text: string;
  start: number;
  end: number;
  /** 每"单位"的帧数 — 对英文文本是每词帧数，对 CJK 文本是每字帧数 */
  framesPerWord: number;
};

/**
 * 计算 CJK 文本的帧率节拍。
 * 中文每个字视为一个"单位"，每分钟约 240-360 字的阅读速度（30fps 下每字约 5-8 帧）。
 */
const estimateCjkFrameRate = (text: string, duration: number): number => {
  const charCount = text.replace(/\s+/g, '').length;
  if (charCount <= 1) return duration;
  // 中文阅读参考：每个字至少 3 帧（30fps 下 100ms/字），不超过 12 帧
  return Math.max(3, Math.min(12, Math.floor(duration / charCount)));
};

/**
 * 计算拉丁文本的帧率节拍。
 * 每 8 个字符视为一个"单词"，每词至少 7 帧。
 */
const estimateLatinFrameRate = (text: string, duration: number): number => {
  const wordCount = Math.max(1, Math.ceil(text.replace(/\s+/g, '').length / 8));
  return Math.max(7, Math.floor((duration - 6) / wordCount));
};

export const buildCaptionBeatTimeline = (text: string, availableFrames: number): CaptionBeat[] => {
  const beats = splitCaptionBeats(text);
  if (beats.length === 0 || availableFrames <= 0) return [];

  const weights = beats.map((beat) => Math.max(6, beat.replace(/\s+/g, '').length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const minimum = Math.max(18, Math.floor(availableFrames / beats.length * 0.48));

  let cursor = 0;

  return beats.map((beat, index) => {
    const remainingFrames = availableFrames - cursor;
    const remainingBeats = beats.length - index;
    const minReserve = minimum * (remainingBeats - 1);
    const proportional = Math.round(
      (availableFrames - minimum * beats.length) * (weights[index] / totalWeight),
    );
    const duration =
      index === beats.length - 1
        ? remainingFrames
        : Math.max(minimum, Math.min(remainingFrames - minReserve, minimum + proportional));
    const start = cursor;
    const end = cursor + duration;

    cursor = end;

    // CJK 与 Latin 采用不同的帧率计算策略
    const cjk = isCJKText(beat);
    const framesPerWord = cjk
      ? estimateCjkFrameRate(beat, duration)
      : estimateLatinFrameRate(beat, duration);

    return {
      text: beat,
      start,
      end,
      framesPerWord,
    };
  });
};
