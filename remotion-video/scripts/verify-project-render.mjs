#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

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
  '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration',
  '-of', 'json',
  path.resolve(videoFile),
], {encoding: 'utf8'}));

const stream = probe.streams?.[0];
if (!stream) throw new Error('No video stream found');

const expected = {
  frames: Array.isArray(project.scenes)
    ? project.scenes.reduce((total, scene) => total + Number(scene.durationInFrames || 0), 0)
    : 0,
  fps: Number(project.render?.fps),
  width: Number(project.render?.width),
  height: Number(project.render?.height),
};
const [rateNumerator, rateDenominator] = String(stream.r_frame_rate).split('/').map(Number);
const actual = {
  frames: Number(stream.nb_read_frames),
  fps: rateNumerator / rateDenominator,
  width: Number(stream.width),
  height: Number(stream.height),
  duration: Number(stream.duration),
  codec: String(stream.codec_name),
};

const failures = [
  actual.frames === expected.frames ? null : `frames expected=${expected.frames} actual=${actual.frames}`,
  actual.fps === expected.fps ? null : `fps expected=${expected.fps} actual=${actual.fps}`,
  actual.width === expected.width ? null : `width expected=${expected.width} actual=${actual.width}`,
  actual.height === expected.height ? null : `height expected=${expected.height} actual=${actual.height}`,
].filter(Boolean);

if (failures.length > 0) {
  throw new Error(`Project render verification failed: ${failures.join('; ')}`);
}

console.log(JSON.stringify({ok: true, schemaVersion: 1, ...actual}, null, 2));
