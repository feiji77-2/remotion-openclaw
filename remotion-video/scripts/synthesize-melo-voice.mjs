#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const scriptDataPath = path.join(projectRoot, "src", "data", "voiceScript.ts");
const outputRoot = path.join(projectRoot, "public", "voice");
const rawDir = path.join(outputRoot, "raw");
const byShotDir = path.join(outputRoot, "by-shot");
const manifestPath = path.join(outputRoot, "manifest.json");
const concatListPath = path.join(outputRoot, "concat.txt");
const fullNarrationPath = path.join(outputRoot, "full-narration.wav");
const healthUrl = process.env.MELO_HTTP_HEALTH_URL ?? "http://127.0.0.1:18081/health";
const synthUrl = process.env.MELO_HTTP_SYNTH_URL ?? "http://127.0.0.1:18081/synthesize";
const speed = Number(process.env.MELO_TTS_SPEED ?? "1.0");
const durationToleranceSec = Number(process.env.MELO_TTS_DURATION_TOLERANCE_SEC ?? "0.15");
const minSlowTempo = Number(process.env.MELO_TTS_MIN_SLOW_TEMPO ?? "0.78");
const maxRequestSpeed = Number(process.env.MELO_TTS_MAX_REQUEST_SPEED ?? "1.32");
const minRequestSpeed = Number(process.env.MELO_TTS_MIN_REQUEST_SPEED ?? "0.92");
const baselineCharsPerSecond = Number(process.env.MELO_TTS_BASELINE_CPS ?? "5.9");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureOk(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function parseVoiceScript(source) {
  const segments = [];
  const entryRe =
    /\{[\s\S]*?shotId:\s*'([^']+)'[\s\S]*?text:\s*'((?:\\'|[^'])*)'[\s\S]*?durationSec:\s*([0-9.]+)[\s\S]*?\}/g;
  for (const match of source.matchAll(entryRe)) {
    const [, shotId, rawText, rawDuration] = match;
    const text = rawText
      .replace(/\\'/g, "'")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .trim();
    segments.push({
      shotId,
      text,
      durationSec: Number(rawDuration),
    });
  }
  return segments;
}

function toFileUrl(filePath) {
  return `file '${filePath.replace(/'/g, "'\\''")}'`;
}

function runFfmpeg(args, failurePrefix) {
  const ffmpeg = spawnSync("ffmpeg", args, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (ffmpeg.status !== 0) {
    const detail = [ffmpeg.stdout, ffmpeg.stderr].filter(Boolean).join("\n").trim();
    fail(`${failurePrefix}\n${detail}`);
  }
}

function runFfprobe(filePath) {
  const ffprobe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      filePath,
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
  if (ffprobe.status !== 0) {
    const detail = [ffprobe.stdout, ffprobe.stderr].filter(Boolean).join("\n").trim();
    fail(`ffprobe failed for ${filePath}\n${detail}`);
  }
  const duration = Number(ffprobe.stdout.trim());
  ensureOk(Number.isFinite(duration) && duration > 0, `Invalid audio duration for ${filePath}`);
  return duration;
}

function buildAtempoChain(tempoFactor) {
  const factors = [];
  let remaining = tempoFactor;

  while (remaining > 2) {
    factors.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    factors.push(0.5);
    remaining /= 0.5;
  }
  factors.push(remaining);
  return factors.map((value) => `atempo=${value.toFixed(6)}`).join(",");
}

function estimateRequestSpeed(segment) {
  const chars = segment.text.replace(/\s+/g, "").length;
  const targetCharsPerSecond = chars / Math.max(segment.durationSec, 1);
  const suggested = targetCharsPerSecond / baselineCharsPerSecond;
  return Number(Math.min(maxRequestSpeed, Math.max(minRequestSpeed, suggested)).toFixed(3));
}

async function checkHealth() {
  const response = await fetch(healthUrl);
  ensureOk(response.ok, `MeloTTS health check failed: HTTP ${response.status}`);
  const payload = await response.json();
  ensureOk(
    payload && (payload.status === "ok" || payload.status === "loading"),
    `Unexpected MeloTTS health payload: ${JSON.stringify(payload)}`,
  );
}

async function synthesizeSegment(segment, index) {
  const requestSpeed = estimateRequestSpeed(segment);
  const response = await fetch(synthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: segment.text,
      speed: Number((speed * requestSpeed).toFixed(3)),
    }),
  });

  ensureOk(response.ok, `Segment ${segment.shotId} failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = `${String(index + 1).padStart(2, "0")}-${segment.shotId}.wav`;
  const rawPath = path.join(rawDir, fileName);
  fs.writeFileSync(rawPath, buffer);
  return {
    ...segment,
    fileName,
    rawPath,
    requestSpeed: Number((speed * requestSpeed).toFixed(3)),
    bytes: buffer.length,
  };
}

function fitSegmentToDuration(segmentResult) {
  const outputPath = path.join(byShotDir, segmentResult.fileName);
  const rawDurationSec = runFfprobe(segmentResult.rawPath);
  const targetDurationSec = segmentResult.durationSec;
  const deltaSec = rawDurationSec - targetDurationSec;

  let fitAction = "copy";
  if (deltaSec > durationToleranceSec) {
    fitAction = "speed-up";
    const tempoFactor = rawDurationSec / targetDurationSec;
    const filter = `${buildAtempoChain(tempoFactor)},atrim=duration=${targetDurationSec.toFixed(
      6,
    )},apad=whole_dur=${targetDurationSec.toFixed(6)}`;
    runFfmpeg(
      [
        "-y",
        "-i",
        segmentResult.rawPath,
        "-filter:a",
        filter,
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      `ffmpeg fit failed for ${segmentResult.fileName}`,
    );
  } else if (deltaSec < -durationToleranceSec) {
    const tempoFactor = rawDurationSec / targetDurationSec;
    const slowTempo = Math.max(tempoFactor, minSlowTempo);
    if (slowTempo < 0.999) {
      fitAction = "slow-down+pad";
      runFfmpeg(
        [
          "-y",
          "-i",
          segmentResult.rawPath,
          "-filter:a",
          `${buildAtempoChain(slowTempo)},apad=whole_dur=${targetDurationSec.toFixed(
            6,
          )},atrim=duration=${targetDurationSec.toFixed(6)}`,
          "-c:a",
          "pcm_s16le",
          outputPath,
        ],
        `ffmpeg slow fit failed for ${segmentResult.fileName}`,
      );
    } else {
      fitAction = "pad";
      runFfmpeg(
        [
          "-y",
          "-i",
          segmentResult.rawPath,
          "-filter:a",
          `apad=whole_dur=${targetDurationSec.toFixed(6)},atrim=duration=${targetDurationSec.toFixed(
            6,
          )}`,
          "-c:a",
          "pcm_s16le",
          outputPath,
        ],
        `ffmpeg pad failed for ${segmentResult.fileName}`,
      );
    }
  } else {
    fs.copyFileSync(segmentResult.rawPath, outputPath);
  }

  const fittedDurationSec = runFfprobe(outputPath);
  return {
    ...segmentResult,
    outputPath,
    rawDurationSec,
    fittedDurationSec,
    fitAction,
  };
}

function concatSegments() {
  runFfmpeg(
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c:a",
      "pcm_s16le",
      fullNarrationPath,
    ],
    "ffmpeg concat failed.",
  );
}

async function main() {
  ensureOk(fs.existsSync(scriptDataPath), `Missing voice script data: ${scriptDataPath}`);
  ensureOk(Number.isFinite(speed) && speed > 0, `Invalid MELO_TTS_SPEED: ${speed}`);

  const raw = fs.readFileSync(scriptDataPath, "utf8");
  const segments = parseVoiceScript(raw);
  ensureOk(segments.length > 0, "No voice segments found in src/data/voiceScript.ts");

  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(byShotDir, { recursive: true });

  await checkHealth();

  const synthesized = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    console.log(`[voice:melo] ${segment.shotId} (${i + 1}/${segments.length})`);
    synthesized.push(await synthesizeSegment(segment, i));
  }

  const results = synthesized.map((segmentResult) => fitSegmentToDuration(segmentResult));

  fs.writeFileSync(
    concatListPath,
    `${results.map((segment) => toFileUrl(segment.outputPath)).join("\n")}\n`,
    "utf8",
  );
  concatSegments();

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        engine: "melotts-http",
        speed,
        healthUrl,
        synthUrl,
        generatedAt: new Date().toISOString(),
        totalSegments: results.length,
        totalDurationSec: results.reduce((sum, segment) => sum + segment.durationSec, 0),
        renderedDurationSec: runFfprobe(fullNarrationPath),
        segments: results.map((segment) => ({
          shotId: segment.shotId,
          durationSec: segment.durationSec,
          requestSpeed: segment.requestSpeed,
          rawDurationSec: Number(segment.rawDurationSec.toFixed(3)),
          fittedDurationSec: Number(segment.fittedDurationSec.toFixed(3)),
          fitAction: segment.fitAction,
          rawFile: `voice/raw/${segment.fileName}`,
          file: `voice/by-shot/${segment.fileName}`,
          bytes: segment.bytes,
        })),
        fullNarration: "voice/full-narration.wav",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[voice:melo] wrote ${results.length} segments`);
  console.log(`[voice:melo] full narration: ${fullNarrationPath}`);
  console.log(`[voice:melo] manifest: ${manifestPath}`);
}

await main();
