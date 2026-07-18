#!/usr/bin/env node

import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

// ─── Constants ───────────────────────────────────────────────────────────────

const FPS = 30;
const QUALITY_MODE = 'fast';
const DEFAULT_TRANSITION = {type: 'fade', durationInFrames: 6};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6-20250514';
const MAX_TOKENS = 8192;
const TEMPERATURE = 0.3;
const API_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;

// ─── SRT parsing ─────────────────────────────────────────────────────────────

/** Regex capturing an SRT block: index, start time, end time, multi-line text. */
const SRT_BLOCK_REGEX =
  /(\d+)\s*\n(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n([\s\S]*?)(?=\n\s*\n|\n$|$)/g;

const parseTimestamp = (ts) => {
  const m = ts.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!m) throw new Error(`invalid SRT timestamp: ${ts}`);
  return Number(m[1]) * 3_600_000 + Number(m[2]) * 60_000 + Number(m[3]) * 1000 + Number(m[4]);
};

const formatMsToSrtTimestamp = (ms) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

/**
 * Parse standard SRT content into an array of caption blocks.
 * Strips HTML tags from text.
 */
const parseSrt = (content) => {
  const blocks = [];
  let match;
  while ((match = SRT_BLOCK_REGEX.exec(content)) !== null) {
    const startMs = parseTimestamp(match[2]);
    const endMs = parseTimestamp(match[3]);
    const text = match[4].trim().replace(/\r\n/g, '\n').replace(/<[^>]+>/g, '');
    if (text.length === 0) continue;
    blocks.push({text, startMs, endMs});
  }
  return blocks;
};

// ─── JSON extraction from Claude response ────────────────────────────────────

/**
 * Extract a JSON object from the response text.
 * Handles markdown code fences (```json ... ```) and bare JSON.
 */
const extractJson = (text) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
};

// ─── System prompt ───────────────────────────────────────────────────────────

const buildSystemPrompt = () => [
  'You are a video scene analyzer for a Remotion video rendering system. ',
  'Given SRT subtitle content, you need to:',
  '',
  '1. **Group subtitles into scenes**: Merge consecutive subtitles that form a coherent',
  '   semantic unit (same topic, cause-effect, or narrative flow) into a single scene.',
  '2. **Assign a visual family**: Pick the most appropriate family from the 8 types below.',
  '3. **Generate payload data**: Extract and structure the subtitle content to fit the',
  '   chosen family\'s payload schema.',
  '4. **Preserve captions**: Each output scene must include the original caption entries',
  '   (with their exact text and time ranges).',
  '',
  '### Available Scene Families',
  '',
  '**spoken-title** — Title card for opening or closing.',
  'Payload: { "title": string (required), "subtitle"?: string, "kicker"?: string, "accent"?: string }',
  '',
  '**spoken-metric** — Key numbers, statistics, or data points.',
  'Payload: { "heading"?: string, "items": [{ "label": string, "value": string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-process** — Sequential steps or workflow (max 5 steps).',
  'Payload: { "steps": [{ "label": string, "detail"?: string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-ranking** — Ranked or ordered list.',
  'Payload: { "heading"?: string, "items": [{ "label": string, "value": string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-compare** — Comparison of two or more items.',
  'Payload: { "heading"?: string, "items": [{ "label": string, "value": string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-tags** — Keywords or tags display.',
  'Payload: { "heading"?: string, "items": [{ "label": string, "value": string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-code** — Code snippets, commands, or technical references.',
  'Payload: { "heading"?: string, "items": [{ "label": string, "value": string, "accent"?: string }], "accent"?: string }',
  '',
  '**spoken-takeaway** — Final conclusion or key takeaway (same payload shape as spoken-title).',
  'Payload: { "title": string (required), "subtitle"?: string, "kicker"?: string, "accent"?: string }',
  '',
  '### Guidelines',
  '',
  '- The first scene should typically be **spoken-title** (introduction).',
  '- The last scene should typically be **spoken-takeaway** (conclusion).',
  '- Match content to family: metrics → spoken-metric, steps → spoken-process,',
  '  comparison → spoken-compare, ranking → spoken-ranking, tags → spoken-tags,',
  '  code → spoken-code.',
  '- Each scene covers a continuous range of subtitles — do not reorder or merge',
  '  non-consecutive blocks.',
  '- Scene "id" values must be unique kebab-case identifiers (e.g., "intro", "key-insights").',
  '- Accent options: "cyan", "green", "amber", "purple", "blue", "red", "pink", "orange".',
  '',
  'Respond ONLY with valid JSON matching this structure (no markdown, no code fences):',
  '',
  JSON.stringify({
    title: 'brief video title (max 200 chars)',
    scenes: [
      {
        id: 'unique-kebab-case-id',
        family: 'spoken-family-name',
        payload: {},
        captions: [
          {text: 'original subtitle text', startMs: 0, endMs: 1000},
        ],
      },
    ],
  }, null, 2),
].join('\n');

// ─── Claude API call ─────────────────────────────────────────────────────────

const callClaudeOnce = async (srtText) => {
  const systemPrompt = buildSystemPrompt();
  const userMessage = [
    'Analyze the following SRT subtitle content and produce a video project structure:',
    '',
    '```',
    srtText,
    '```',
  ].join('\n');

  // Try @anthropic-ai/sdk first
  try {
    const {Anthropic} = await import('@anthropic-ai/sdk');
    const client = new Anthropic({apiKey: ANTHROPIC_API_KEY});

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: [{role: 'user', content: userMessage}],
      });
      clearTimeout(timeout);
      return extractJson(response.content[0].text);
    } finally {
      clearTimeout(timeout);
    }
  } catch (sdkErr) {
    const isModuleNotFound =
      sdkErr.code === 'ERR_MODULE_NOT_FOUND' || sdkErr.code === 'MODULE_NOT_FOUND';
    if (!isModuleNotFound) {
      // Real SDK error (auth, rate limit, etc.) — surface it
      throw sdkErr;
    }
    // SDK not installed — fall through to fetch
    console.warn('[info] @anthropic-ai/sdk not found; falling back to fetch API.');
    console.warn('[info] Install it with: npm install @anthropic-ai/sdk');
  }

  // Fallback: direct fetch to Anthropic REST API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: [{role: 'user', content: userMessage}],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    clearTimeout(timeout);
    return extractJson(data.content[0].text);
  } finally {
    // Timeout is cleared on success above; on error it expires harmlessly
  }
};

const callClaudeWithRetry = async (srtText) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callClaudeOnce(srtText);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** attempt, 10_000);
        console.warn(
          `[warn] Claude API attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}. Retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};

// ─── Project JSON assembly ───────────────────────────────────────────────────

const msToFrames = (ms) => Math.ceil((ms * FPS) / 1000);

const assembleProject = (analysis, projectId, renderConfig, originalCaptions = []) => {
  const allCaptions = [];

  // Build a lookup map from original captions by trimmed text
  const originalMap = new Map();
  for (const cap of originalCaptions) {
    const key = cap.text.trim();
    if (!originalMap.has(key)) {
      originalMap.set(key, cap);
    }
  }

  const scenes = analysis.scenes.map((scene, index) => {
    const firstCap = scene.captions[0];
    const lastCap = scene.captions[scene.captions.length - 1];

    // Determine scene duration using original timestamps if available
    let sceneStartMs = firstCap.startMs;
    let sceneEndMs = lastCap.endMs;

    const origFirst = originalMap.get(firstCap.text.trim());
    const origLast = originalMap.get(lastCap.text.trim());
    if (origFirst) sceneStartMs = origFirst.startMs;
    if (origLast) sceneEndMs = origLast.endMs;

    const durationMs = sceneEndMs - sceneStartMs;
    const durationInFrames = Math.max(1, msToFrames(durationMs));

    for (const cap of scene.captions) {
      // Look up the original caption by text to preserve original timestamps
      const orig = originalMap.get(cap.text.trim());
      const startMs = orig ? orig.startMs : cap.startMs;
      const endMs = orig ? orig.endMs : cap.endMs;

      allCaptions.push({
        text: cap.text,
        startMs,
        endMs,
        timestampMs: startMs,
        confidence: 1,
      });
    }

    const sceneObj = {
      id: scene.id,
      family: scene.family,
      durationInFrames,
      payload: scene.payload,
      assetIds: [],
    };

    // Non-last scenes get a default transition
    if (index < analysis.scenes.length - 1) {
      sceneObj.transition = {...DEFAULT_TRANSITION};
    }

    return sceneObj;
  });

  return {
    schemaVersion: 1,
    projectId,
    title: analysis.title,
    render: {
      fps: FPS,
      width: renderConfig.width,
      height: renderConfig.height,
      qualityMode: QUALITY_MODE,
      orientation: renderConfig.orientation,
    },
    scenes,
    captions: allCaptions,
    audio: {},
    assets: {},
  };
};

// ─── Main ────────────────────────────────────────────────────────────────────

const main = async () => {
  const args = process.argv.slice(2);

  let width = 1920;
  let height = 1080;
  let srtFile = null;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.error('Usage: node scripts/srt-to-project.mjs [--width <px>] [--height <px>] <srt-file>');
      console.error('');
      console.error('Reads an SRT subtitle file, analyzes it with Claude AI,');
      console.error('and outputs a valid Remotion Project JSON to stdout.');
      console.error('');
      console.error('Options:');
      console.error('  --width <px>   Output video width in pixels (default: 1920)');
      console.error('  --height <px>  Output video height in pixels (default: 1080)');
      console.error('');
      console.error('Examples:');
      console.error('  node scripts/srt-to-project.mjs transcription.srt > my-project.json');
      console.error('  node scripts/srt-to-project.mjs --width 1080 --height 1920 input.srt > vertical.json');
      console.error('  ANTHROPIC_API_KEY=sk-... node scripts/srt-to-project.mjs input.srt > out.json');
      process.exit(0);
    } else if (arg === '--width' && i + 1 < args.length) {
      width = parseInt(args[++i], 10);
      if (isNaN(width) || width <= 0) {
        console.error('[error] Invalid --width value.');
        process.exit(1);
      }
    } else if (arg === '--height' && i + 1 < args.length) {
      height = parseInt(args[++i], 10);
      if (isNaN(height) || height <= 0) {
        console.error('[error] Invalid --height value.');
        process.exit(1);
      }
    } else if (!arg.startsWith('--')) {
      srtFile = arg;
    } else {
      console.error(`[error] Unknown option: ${arg}`);
      process.exit(1);
    }
    i++;
  }

  if (!srtFile) {
    console.error('[error] No SRT file specified.');
    console.error('');
    console.error('Usage: node scripts/srt-to-project.mjs [--width <px>] [--height <px>] <srt-file>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), srtFile);

  if (!existsSync(inputPath)) {
    console.error(`[error] File not found: ${inputPath}`);
    process.exit(1);
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('[error] ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  // Read and parse SRT
  const rawContent = await fs.readFile(inputPath, 'utf8');
  const captions = parseSrt(rawContent);

  if (captions.length === 0) {
    console.error('[error] SRT file contains no valid subtitle blocks.');
    process.exit(1);
  }

  // Compute orientation based on dimensions
  const orientation = height > width ? 'portrait' : 'landscape';

  // Derive projectId from filename (alphanumeric, dots, hyphens, underscores only)
  let projectId = path.basename(srtFile, path.extname(srtFile));
  projectId = projectId
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (projectId.length > 96) projectId = projectId.slice(0, 96);
  if (!projectId) {
    console.error('[error] Could not derive a valid projectId from the filename.');
    process.exit(1);
  }

  // Build clean SRT text for the AI
  const srtText = captions
    .map((c, i) =>
      `${i + 1}\n${formatMsToSrtTimestamp(c.startMs)} --> ${formatMsToSrtTimestamp(c.endMs)}\n${c.text}`,
    )
    .join('\n\n');

  // Call Claude API with retry logic
  const analysis = await callClaudeWithRetry(srtText);

  // Assemble and print the full Project JSON
  const project = assembleProject(analysis, projectId, {width, height, orientation}, captions);
  process.stdout.write(JSON.stringify(project, null, 2) + '\n');
};

main().catch((err) => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
