#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

const propsFile = valueFor('--props');
const videoFile = valueFor('--video');
if (!propsFile || !videoFile) {
  console.error('Usage: node scripts/verify-project-render.mjs --props <project.json> --video <output.mp4>');
  process.exit(1);
}

const project = JSON.parse(await readFile(path.resolve(propsFile), 'utf8'));
if (project.schemaVersion !== 1) {
  throw new Error(`Expected schemaVersion=1, received ${String(project.schemaVersion)}`);
}

const probe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error',
  '-count_frames',
  '-show_entries', 'stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration',
  '-of', 'json',
  path.resolve(videoFile),
], {encoding: 'utf8'}));

const stream = probe.streams?.find((candidate) => candidate.codec_type === 'video');
const audioStream = probe.streams?.find((candidate) => candidate.codec_type === 'audio');
if (!stream) throw new Error('No video stream found');

const expected = {
  frames: Array.isArray(project.scenes)
    ? project.scenes.reduce((total, scene) => total + Number(scene.durationInFrames || 0), 0)
    : 0,
  fps: Number(project.render?.fps),
  width: Number(project.render?.width),
  height: Number(project.render?.height),
  duration: Array.isArray(project.scenes)
    ? project.scenes.reduce((total, scene) => total + Number(scene.durationInFrames || 0), 0) / Number(project.render?.fps)
    : 0,
};
const [rateNumerator, rateDenominator] = String(stream.r_frame_rate).split('/').map(Number);
const actual = {
  frames: Number(stream.nb_read_frames),
  fps: rateNumerator / rateDenominator,
  width: Number(stream.width),
  height: Number(stream.height),
  duration: Number(stream.duration || probe.format?.duration),
  codec: String(stream.codec_name),
  audioCodec: audioStream ? String(audioStream.codec_name) : null,
  audioDuration: audioStream ? Number(audioStream.duration || probe.format?.duration) : null,
};

const voiceAssetId = project.audio?.voiceAssetId;
const voiceAsset = voiceAssetId ? project.assets?.[voiceAssetId] : null;
const lastCaptionEnd = Array.isArray(project.captions) && project.captions.length > 0
  ? Number(project.captions.at(-1)?.endMs || 0) / 1000
  : null;
const tolerance = Math.max(0.12, 2 / Math.max(1, expected.fps));
let sourceAudioDuration = null;
if (voiceAsset?.kind === 'audio' && typeof voiceAsset.src === 'string' && !/^https?:\/\//i.test(voiceAsset.src)) {
  const voicePath = path.resolve(PROJECT_ROOT, 'public', voiceAsset.src);
  sourceAudioDuration = Number(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    voicePath,
  ], {encoding: 'utf8'}).trim());
}

const failures = [
  actual.frames === expected.frames ? null : `frames expected=${expected.frames} actual=${actual.frames}`,
  actual.fps === expected.fps ? null : `fps expected=${expected.fps} actual=${actual.fps}`,
  actual.width === expected.width ? null : `width expected=${expected.width} actual=${actual.width}`,
  actual.height === expected.height ? null : `height expected=${expected.height} actual=${actual.height}`,
  Math.abs(actual.duration - expected.duration) <= tolerance ? null : `video duration expected=${expected.duration.toFixed(3)} actual=${actual.duration.toFixed(3)}`,
  voiceAsset && !audioStream ? 'voice project output has no audio stream' : null,
  voiceAsset && lastCaptionEnd != null && Math.abs(lastCaptionEnd - expected.duration) > tolerance
    ? `caption duration expected=${expected.duration.toFixed(3)} actual=${lastCaptionEnd.toFixed(3)}`
    : null,
  voiceAsset && sourceAudioDuration != null && Math.abs(sourceAudioDuration - expected.duration) > tolerance
    ? `source audio duration expected=${expected.duration.toFixed(3)} actual=${sourceAudioDuration.toFixed(3)}`
    : null,
  voiceAsset && actual.audioDuration != null && Math.abs(actual.audioDuration - expected.duration) > tolerance
    ? `output audio duration expected=${expected.duration.toFixed(3)} actual=${actual.audioDuration.toFixed(3)}`
    : null,
].filter(Boolean);

if (failures.length > 0) {
  throw new Error(`Project render verification failed: ${failures.join('; ')}`);
}

console.log(JSON.stringify({ok: true, schemaVersion: 1, ...actual, sourceAudioDuration}, null, 2));
