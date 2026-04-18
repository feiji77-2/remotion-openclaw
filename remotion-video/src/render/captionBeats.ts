const SENTENCE_END_RE = /([。！？!?]+)/;
const SOFT_BREAK_RE = /([，、；：])/;

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
  framesPerWord: number;
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
    const proportional = Math.round((availableFrames - minimum * beats.length) * (weights[index] / totalWeight));
    const duration = index === beats.length - 1
      ? remainingFrames
      : Math.max(minimum, Math.min(remainingFrames - minReserve, minimum + proportional));
    const wordCount = Math.max(1, beat.length > 0 ? Math.ceil(beat.replace(/\s+/g, '').length / 8) : 1);
    const framesPerWord = Math.max(7, Math.floor((duration - 6) / wordCount));
    const start = cursor;
    const end = cursor + duration;

    cursor = end;

    return {
      text: beat,
      start,
      end,
      framesPerWord,
    };
  });
};
