import {FPS} from './data/storyboard';
import {STORYBOARD} from './data/storyboard';
import {VOICE_SCRIPT} from './data/voiceScript';

export type CaptionChunk = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type CaptionShot = {
  shotId: string;
  shotIndex: number;
  startFrame: number;
  endFrame: number;
  title: string;
  durationSec: number;
  chunks: CaptionChunk[];
};

const MAX_CHARS_PER_CHUNK = 22;
const MAX_CHARS_PER_LINE = 12;
const MIN_CHUNK_FRAMES = 18;

function splitClauses(text: string): string[] {
  const normalized = text.replace(/\s+/g, '').trim();
  const matches = normalized.match(/[^，。！？；：,.!?;:]+[，。！？；：,.!?;:]*/g) ?? [normalized];
  return matches.map((part) => part.trim()).filter(Boolean);
}

function chunkClauses(clauses: string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      chunks.push(trimmed);
    }
    current = '';
  };

  for (const clause of clauses) {
    const next = `${current}${clause}`;
    if (current && next.length > MAX_CHARS_PER_CHUNK) {
      flush();
    }
    current += clause;
  }
  flush();

  return chunks.length > 0 ? chunks : clauses;
}

function formatCaptionChunk(text: string): string {
  if (text.length <= MAX_CHARS_PER_LINE) {
    return text;
  }

  const midpoint = Math.ceil(text.length / 2);
  let splitAt = midpoint;
  for (let i = midpoint; i > 4; i -= 1) {
    if ('，。！？；：,.!?;:'.includes(text[i] ?? '')) {
      splitAt = i + 1;
      break;
    }
  }

  const firstLine = text.slice(0, splitAt).trim();
  const secondLine = text.slice(splitAt).trim();
  return secondLine ? `${firstLine}\n${secondLine}` : firstLine;
}

function buildCaptionChunks(text: string, durationSec: number): CaptionChunk[] {
  const chunks = chunkClauses(splitClauses(text)).map((chunk) => formatCaptionChunk(chunk));
  const totalChars = Math.max(
    1,
    chunks.reduce((sum, chunk) => sum + chunk.replace(/\n/g, '').length, 0),
  );
  const totalFrames = Math.max(1, Math.round(durationSec * FPS));

  let cursor = 0;
  return chunks.map((chunk, index) => {
    const remainingFrames = totalFrames - cursor;
    const remainingChunks = chunks.length - index;
    const rawWeight = chunk.replace(/\n/g, '').length / totalChars;
    const weightedFrames =
      index === chunks.length - 1
        ? remainingFrames
        : Math.max(
            MIN_CHUNK_FRAMES,
            Math.round(rawWeight * totalFrames),
            remainingFrames - (remainingChunks - 1) * MIN_CHUNK_FRAMES,
          );

    const startFrame = cursor;
    const endFrame = index === chunks.length - 1 ? totalFrames : cursor + weightedFrames;
    cursor = endFrame;

    return {
      text: chunk,
      startFrame,
      endFrame,
    };
  });
}

export const CAPTION_TIMELINE: CaptionShot[] = (() => {
  let offset = 0;
  return STORYBOARD.map((shot, shotIndex) => {
    const voice = VOICE_SCRIPT.find((segment) => segment.shotId === shot.id);
    const durationSec = voice?.durationSec ?? shot.durationSec;
    const durationFrames = Math.round(durationSec * FPS);
    const result: CaptionShot = {
      shotId: shot.id,
      shotIndex,
      startFrame: offset,
      endFrame: offset + durationFrames,
      title: shot.onScreenText.title,
      durationSec,
      chunks: voice ? buildCaptionChunks(voice.text, durationSec) : [],
    };
    offset += durationFrames;
    return result;
  });
})();

