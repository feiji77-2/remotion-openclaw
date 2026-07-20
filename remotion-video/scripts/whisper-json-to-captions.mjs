#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const input = valueFor('--input');
const captionsOut = valueFor('--captions-out');
const transcriptOut = valueFor('--transcript-out');

if (!input || !captionsOut || !transcriptOut) {
  console.error('Usage: npm run audio:captions -- --input <whisper.json> --captions-out <captions.json> --transcript-out <script.txt>');
  process.exit(1);
}

// Product and technology names that local models routinely split or mishear.
// This is a deterministic display-layer normalization, not a replacement for
// the transcription source or its timing.
const TERM_NORMALIZATIONS = [
  [/work\s*body/giu, 'WorkBuddy'],
  [/workbuddy/giu, 'WorkBuddy'],
  [/carpacy/giu, 'Karpathy'],
  [/karpacy/giu, 'Karpathy'],
  [/skill/giu, 'Skill'],
  [/remotion/giu, 'Remotion'],
  [/hyper\s*frames/giu, 'HyperFrames'],
  [/ppt\s*master/giu, 'PPT Master'],
  [/power\s*point/giu, 'PowerPoint'],
  [/ui\s*scale/giu, 'UI Skill'],
  [/html/giu, 'HTML'],
  [/react/giu, 'React'],
  [/agent/giu, 'Agent'],
];

const normalizeText = (value) => TERM_NORMALIZATIONS.reduce(
  (text, [pattern, replacement]) => text.replace(pattern, replacement),
  String(value ?? '').replace(/\s+/gu, ' ').trim(),
);

const asMilliseconds = (seconds) => Math.max(0, Math.round(Number(seconds) * 1000));
const toProjectPath = (file) => path.resolve(PROJECT_ROOT, file);

const whisper = JSON.parse(await fs.readFile(toProjectPath(input), 'utf8'));
if (!Array.isArray(whisper.segments) || whisper.segments.length === 0) {
  throw new Error('[WHISPER_SEGMENTS_MISSING] input must contain a non-empty segments array');
}

const captions = whisper.segments
  .map((segment) => {
    const text = normalizeText(segment.text);
    const startMs = asMilliseconds(segment.start);
    const endMs = asMilliseconds(segment.end);
    if (!text || endMs <= startMs) return null;
    return {
      text,
      startMs,
      endMs,
      timestampMs: startMs,
      // Whisper avg_logprob is not a 0–1 probability. Do not mislabel it.
      confidence: null,
    };
  })
  .filter(Boolean);

if (captions.length === 0) {
  throw new Error('[WHISPER_CAPTIONS_EMPTY] no usable timed captions were produced');
}

const captionsPath = toProjectPath(captionsOut);
const transcriptPath = toProjectPath(transcriptOut);
await fs.mkdir(path.dirname(captionsPath), {recursive: true});
await fs.mkdir(path.dirname(transcriptPath), {recursive: true});
await fs.writeFile(captionsPath, `${JSON.stringify(captions, null, 2)}\n`, 'utf8');
await fs.writeFile(transcriptPath, `${captions.map((caption) => caption.text).join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  source: toProjectPath(input),
  captions: captionsPath,
  transcript: transcriptPath,
  segments: captions.length,
  durationMs: captions.at(-1).endMs,
  confidencePolicy: 'null (Whisper avg_logprob is not a normalized probability)',
}, null, 2));
