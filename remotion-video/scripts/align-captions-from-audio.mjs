#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const flagEnabled = (name) => /^(1|true|yes|on)$/i.test(String(process.env[name] || "").trim());

const toProjectPath = (file) => path.resolve(PROJECT_ROOT, file);

const safeString = (value) => String(value ?? "").trim();

const compactText = (value) => safeString(value)
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[\s\p{P}\p{S}]/gu, "");

const ensureRelativePublicAudio = (src) => {
  const text = safeString(src).replace(/^\/+/, "");
  if (!text || /^https?:\/\//i.test(text) || text.split("/").includes("..")) return "";
  return text;
};

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

const normalizeCaptions = (captions) => (Array.isArray(captions) ? captions : [])
  .map((caption, index) => {
    const text = safeString(caption?.text);
    const startMs = Math.max(0, Math.round(Number(caption?.startMs ?? caption?.timestampMs ?? index * 1000)));
    const endMs = Math.max(startMs + 1, Math.round(Number(caption?.endMs ?? startMs + 1000)));
    return {
      text,
      startMs,
      endMs,
      timestampMs: startMs,
      confidence: caption?.confidence == null ? null : caption.confidence,
    };
  })
  .filter((caption) => caption.text && caption.endMs > caption.startMs)
  .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

const getAudioDurationMs = (audioPath) => {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const seconds = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null;
};

const resolveAudioPath = async ({ project, assetPackPath, explicitAudio }) => {
  if (explicitAudio) return toProjectPath(explicitAudio);

  const assetPack = assetPackPath && existsSync(assetPackPath)
    ? await readJson(assetPackPath)
    : null;
  const voiceAsset = (Array.isArray(assetPack?.assets) ? assetPack.assets : [])
    .find((asset) => asset?.kind === "audio" && asset?.src);
  const src = ensureRelativePublicAudio(voiceAsset?.src)
    || `projects/${project.projectId || "project"}/audio/voice.m4a`;
  return path.join(PROJECT_ROOT, "public", src);
};

const runWhisper = ({ audioPath, asrOutPath }) => {
  const whisperBin = process.env.WHISPER_BIN || "whisper";
  const model = process.env.WHISPER_MODEL || "tiny";
  const language = process.env.WHISPER_LANGUAGE || "Chinese";
  const outputDir = path.dirname(asrOutPath);
  const result = spawnSync(whisperBin, [
    audioPath,
    "--model",
    model,
    "--language",
    language,
    "--output_format",
    "json",
    "--output_dir",
    outputDir,
    "--word_timestamps",
    "True",
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`[ASR_FAILED] ${output || `whisper exited with ${result.status}`}`);
  }

  const generated = path.join(outputDir, `${path.basename(audioPath, path.extname(audioPath))}.json`);
  if (!existsSync(generated)) {
    throw new Error(`[ASR_OUTPUT_MISSING] whisper did not create ${generated}`);
  }
  return generated;
};

const asrUnits = (asr) => {
  const wordUnits = (Array.isArray(asr?.segments) ? asr.segments : [])
    .flatMap((segment) => Array.isArray(segment?.words) ? segment.words : [])
    .map((word) => ({
      text: safeString(word.word ?? word.text),
      startMs: Math.max(0, Math.round(Number(word.start) * 1000)),
      endMs: Math.max(0, Math.round(Number(word.end) * 1000)),
    }))
    .filter((unit) => compactText(unit.text) && unit.endMs > unit.startMs);
  if (wordUnits.length > 0) return wordUnits;

  return (Array.isArray(asr?.segments) ? asr.segments : [])
    .map((segment) => ({
      text: safeString(segment.text),
      startMs: Math.max(0, Math.round(Number(segment.start) * 1000)),
      endMs: Math.max(0, Math.round(Number(segment.end) * 1000)),
    }))
    .filter((unit) => compactText(unit.text) && unit.endMs > unit.startMs);
};

export const transcriptSimilarity = (left, right) => {
  const grams = (value) => {
    const text = compactText(value);
    if (text.length < 2) return new Map([[text, 1]]);
    const result = new Map();
    for (let index = 0; index < text.length - 1; index += 1) {
      const gram = text.slice(index, index + 2);
      result.set(gram, (result.get(gram) || 0) + 1);
    }
    return result;
  };
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  const leftCount = [...leftGrams.values()].reduce((sum, count) => sum + count, 0);
  const rightCount = [...rightGrams.values()].reduce((sum, count) => sum + count, 0);
  if (!leftCount || !rightCount) return 0;
  let intersection = 0;
  for (const [gram, count] of leftGrams) intersection += Math.min(count, rightGrams.get(gram) || 0);
  return 2 * intersection / (leftCount + rightCount);
};

const contiguousCaptions = (captions, audioDurationMs) => {
  if (captions.length === 0) return [];
  const naturalEnd = Math.max(1, captions.at(-1).endMs);
  const targetEnd = Math.max(captions.length, Number.isFinite(audioDurationMs) ? audioDurationMs : naturalEnd);
  let cursor = 0;
  return captions.map((caption, index) => {
    const remaining = captions.length - index - 1;
    const endMs = index === captions.length - 1
      ? targetEnd
      : Math.min(targetEnd - remaining, Math.max(cursor + 1, caption.endMs));
    const next = {...caption, startMs: cursor, endMs, timestampMs: cursor};
    cursor = endMs;
    return next;
  });
};

export const alignCaptionsToUnits = ({ sourceCaptions, units, audioDurationMs }) => {
  const captions = normalizeCaptions(sourceCaptions);
  if (captions.length === 0) throw new Error("[CAPTIONS_EMPTY] project captions are required before audio alignment");
  if (units.length === 0) throw new Error("[ASR_UNITS_EMPTY] ASR produced no timed text units");
  const similarity = transcriptSimilarity(captions.map((caption) => caption.text).join(''), units.map((unit) => unit.text).join(''));
  if (similarity < 0.18) {
    throw new Error(`[ASR_TEXT_MISMATCH] recognized audio does not match the saved script (similarity=${similarity.toFixed(3)})`);
  }

  const sourceTotal = captions.reduce((sum, caption) => sum + Math.max(1, compactText(caption.text).length), 0);
  const unitLengths = units.map((unit) => Math.max(1, compactText(unit.text).length));
  const unitTotal = unitLengths.reduce((sum, length) => sum + length, 0);
  const total = Math.max(sourceTotal, unitTotal, captions.length);
  let targetCursor = 0;
  let unitIndex = 0;

  const aligned = captions.map((caption, captionIndex) => {
    const remainingCaptions = captions.length - captionIndex;
    const startUnitIndex = Math.min(unitIndex, units.length - 1);
    const startMs = units[startUnitIndex]?.startMs ?? 0;
    const captionShare = Math.max(1, compactText(caption.text).length);
    targetCursor += captionShare;
    const target = captionIndex === captions.length - 1
      ? total
      : Math.max(targetCursor, Math.round((captionIndex + 1) / captions.length * total * 0.2));

    let consumed = unitLengths.slice(0, unitIndex).reduce((sum, length) => sum + length, 0);
    while (
      unitIndex < units.length - remainingCaptions
      && consumed + unitLengths[unitIndex] < target
    ) {
      consumed += unitLengths[unitIndex];
      unitIndex += 1;
    }
    const endUnitIndex = captionIndex === captions.length - 1
      ? units.length - 1
      : Math.max(startUnitIndex, unitIndex);
    unitIndex = Math.min(units.length - 1, endUnitIndex + 1);
    const endMs = units[endUnitIndex]?.endMs ?? startMs + 1;
    return {
      text: caption.text,
      startMs,
      endMs: Math.max(startMs + 1, endMs),
      timestampMs: startMs,
      confidence: null,
    };
  }).map((caption, index, values) => {
    const previousEnd = index > 0 ? values[index - 1].endMs : 0;
    const startMs = Math.max(caption.startMs, previousEnd);
    const fallbackEnd = index === values.length - 1 && audioDurationMs
      ? Math.max(startMs + 1, audioDurationMs)
      : startMs + Math.max(1, caption.endMs - caption.startMs);
    const endMs = Math.max(startMs + 1, caption.endMs, fallbackEnd);
    return { ...caption, startMs, endMs, timestampMs: startMs };
  });
  return contiguousCaptions(aligned, audioDurationMs);
};

export const scaleCaptionsToAudio = ({ sourceCaptions, audioDurationMs }) => {
  const captions = normalizeCaptions(sourceCaptions);
  if (captions.length === 0) throw new Error("[CAPTIONS_EMPTY] project captions are required before audio alignment");
  const sourceStart = captions[0].startMs;
  const sourceEnd = captions.at(-1).endMs;
  const sourceDuration = Math.max(1, sourceEnd - sourceStart);
  const targetDuration = Math.max(1, Number.isFinite(audioDurationMs) ? audioDurationMs : sourceDuration);
  return captions.map((caption, index) => {
    const startMs = index === 0 ? 0 : Math.round((caption.startMs - sourceStart) / sourceDuration * targetDuration);
    const endMs = index === captions.length - 1
      ? targetDuration
      : Math.max(startMs + 1, Math.round((caption.endMs - sourceStart) / sourceDuration * targetDuration));
    return {
      text: caption.text,
      startMs,
      endMs,
      timestampMs: startMs,
      confidence: null,
    };
  });
};

const main = async () => {
  const projectJson = valueFor("--project");
  const assetPack = valueFor("--asset-pack");
  const audio = valueFor("--audio");
  const captionsOut = valueFor("--captions-out");
  const asrOut = valueFor("--asr-out");
  if (!projectJson || !captionsOut || !asrOut) {
    console.error("Usage: npm run audio:align-captions -- --project <project.json> --asset-pack <asset-pack.json> --captions-out <captions.json> --asr-out <asr.json>");
    process.exit(1);
  }

  const projectPath = toProjectPath(projectJson);
  const assetPackPath = assetPack ? toProjectPath(assetPack) : null;
  const project = await readJson(projectPath);
  const audioPath = await resolveAudioPath({ project, assetPackPath, explicitAudio: audio });
  if (!existsSync(audioPath)) throw new Error(`[AUDIO_MISSING] ${audioPath}`);

  const captionsOutPath = toProjectPath(captionsOut);
  const asrOutPath = toProjectPath(asrOut);
  await fs.mkdir(path.dirname(captionsOutPath), { recursive: true });
  await fs.mkdir(path.dirname(asrOutPath), { recursive: true });

  const audioDurationMs = getAudioDurationMs(audioPath);
  const testMode = flagEnabled("VIDEO_FACTORY_SKIP_TTS") || flagEnabled("VIDEO_FACTORY_SKIP_ASR");
  let captions;
  let mode;
  if (testMode) {
    captions = scaleCaptionsToAudio({ sourceCaptions: project.captions, audioDurationMs });
    await fs.writeFile(asrOutPath, `${JSON.stringify({
      mode: "test-placeholder",
      audio: path.relative(PROJECT_ROOT, audioPath),
      durationMs: audioDurationMs,
    }, null, 2)}\n`, "utf8");
    mode = "test-placeholder";
  } else {
    const generatedAsr = runWhisper({ audioPath, asrOutPath });
    if (generatedAsr !== asrOutPath) {
      await fs.copyFile(generatedAsr, asrOutPath);
    }
    const asr = await readJson(asrOutPath);
    captions = alignCaptionsToUnits({
      sourceCaptions: project.captions,
      units: asrUnits(asr),
      audioDurationMs,
    });
    mode = "whisper";
  }

  await fs.writeFile(captionsOutPath, `${JSON.stringify(captions, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    mode,
    audio: path.relative(PROJECT_ROOT, audioPath),
    captions: path.relative(PROJECT_ROOT, captionsOutPath),
    asr: path.relative(PROJECT_ROOT, asrOutPath),
    captionCount: captions.length,
    durationMs: captions.at(-1)?.endMs ?? null,
    timingPolicy: "audio-derived timestamps with source-script caption text",
  }, null, 2));
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
