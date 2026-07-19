#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_PROJECT = 'examples/skill-showcase.json';
const DEFAULT_VIDEO = 'out/workbuddy-six-skills-showcase-v3.mp4';

const args = process.argv.slice(2);

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const hasFlag = (flag) => args.includes(flag);

const projectPath = path.resolve(PROJECT_ROOT, valueFor('--project', DEFAULT_PROJECT));
const videoPath = path.resolve(PROJECT_ROOT, valueFor('--video', DEFAULT_VIDEO));
const shouldVerifyVideo = !hasFlag('--no-video');

const fail = (message) => {
  throw new Error(`[skill-showcase-production] ${message}`);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

const project = readJson(projectPath);
const expectedVariants = [
  'intro',
  'overview',
  'coding',
  'remotion',
  'ppt',
  'illustration',
  'hyperframes',
  'ui',
  'outro',
];
const requiredBeatVariants = new Set(expectedVariants);
const requiredActions = new Set(['spotlight', 'stamp', 'trace', 'compare', 'counter', 'stack', 'focus', 'burst']);
const requiredProductIcons = [
  'workbuddy.svg',
  'karpathy-guidelines.svg',
  'remotion.svg',
  'ppt-master.svg',
  'illustration.svg',
  'hyperframes.svg',
  'ui-skill.svg',
  'impeccable.svg',
  'frontend-design.svg',
  'ux-pro.svg',
  'cloud-design.svg',
];

assert(project.schemaVersion === 1, 'schemaVersion must be 1');
assert(project.projectId === 'workbuddy-six-skills-showcase', 'projectId must stay on the golden skill-showcase sample');
assert(project.render?.fps === 30, 'render.fps must be 30');
assert(project.render?.width === 1080 && project.render?.height === 1920, 'render size must be 1080x1920');
assert(project.render?.orientation === 'portrait', 'render.orientation must be portrait');
assert(project.render?.qualityMode === 'cinematic', 'render.qualityMode must be cinematic');
assert(project.render?.captionStyle === 'editorial', 'render.captionStyle must be editorial');
assert(project.render?.showProjectLabel === false, 'render.showProjectLabel must be false');

assert(Array.isArray(project.scenes), 'scenes must be an array');
assert(project.scenes.length === expectedVariants.length, `expected ${expectedVariants.length} scenes`);
assert(project.scenes.every((scene) => scene.family === 'skill-showcase'), 'every scene must use skill-showcase');

const variants = project.scenes.map((scene) => scene.payload?.variant);
assert(JSON.stringify(variants) === JSON.stringify(expectedVariants), `scene variants must be ${expectedVariants.join(' -> ')}`);

const totalFrames = project.scenes.reduce((sum, scene) => sum + Number(scene.durationInFrames || 0), 0);
assert(totalFrames === 3649, `expected 3649 frames, received ${totalFrames}`);

assert(Array.isArray(project.captions) && project.captions.length >= 50, 'expected sentence-level captions');
const lastCaption = project.captions.at(-1);
assert(lastCaption && lastCaption.endMs >= 120000 && lastCaption.endMs <= 122000, 'captions must cover the full voiceover');

assert(project.audio?.voiceAssetId === 'voiceover', 'audio.voiceAssetId must be voiceover');
const voiceAsset = project.assets?.voiceover;
assert(voiceAsset?.kind === 'audio', 'assets.voiceover must be an audio asset');
assert(voiceAsset?.required === true, 'assets.voiceover must be required');
assert(Boolean(voiceAsset?.src), 'assets.voiceover.src is required');
assert(existsSync(path.join(PROJECT_ROOT, 'public', voiceAsset.src)), `voice asset missing: public/${voiceAsset.src}`);

const sceneStarts = new Map();
let sceneStartFrame = 0;
const beats = [];
for (const scene of project.scenes) {
  sceneStarts.set(scene.id, sceneStartFrame);
  const sceneBeats = Array.isArray(scene.payload?.beats) ? scene.payload.beats : [];
  if (requiredBeatVariants.has(scene.payload?.variant)) {
    assert(sceneBeats.length > 0, `${scene.id} must have semantic beats`);
    assert(sceneBeats[0].startFrame <= 30, `${scene.id} first beat must start within 1 second`);
    assert(sceneBeats.at(-1).endFrame === scene.durationInFrames, `${scene.id} last beat must end at the scene boundary`);
  }
  let previousEnd = null;
  for (const [index, beat] of sceneBeats.entries()) {
    assert(Number.isInteger(beat.startFrame) && Number.isInteger(beat.endFrame), `${scene.id}.beats[${index}] must use integer frames`);
    assert(beat.startFrame >= 0, `${scene.id}.beats[${index}] startFrame must be non-negative`);
    assert(beat.endFrame > beat.startFrame, `${scene.id}.beats[${index}] endFrame must be after startFrame`);
    assert(beat.endFrame <= scene.durationInFrames, `${scene.id}.beats[${index}] must stay inside the scene`);
    assert(typeof beat.keyword === 'string' && beat.keyword.trim().length > 0, `${scene.id}.beats[${index}] keyword is required`);
    assert(typeof beat.icon === 'string' && beat.icon.trim().length > 0, `${scene.id}.beats[${index}] icon is required`);
    assert(requiredActions.has(beat.action), `${scene.id}.beats[${index}] uses unsupported action: ${beat.action}`);
    assert(!Array.isArray(beat.evidence) || beat.evidence.length <= 4, `${scene.id}.beats[${index}] evidence max is 4`);
    if (previousEnd !== null) {
      assert(beat.startFrame >= previousEnd, `${scene.id}.beats[${index}] overlaps the previous beat`);
      assert(beat.startFrame - previousEnd <= 6, `${scene.id}.beats[${index}] leaves a visible beat gap`);
    }
    previousEnd = beat.endFrame;
    beats.push({...beat, sceneId: scene.id, globalStartFrame: sceneStartFrame + beat.startFrame});
  }
  sceneStartFrame += Number(scene.durationInFrames || 0);
}

assert(beats[0]?.globalStartFrame === 0, 'the first semantic beat must start at frame 0');
assert(beats.length === 57, `expected 57 semantic beats, received ${beats.length}`);
const usedActions = new Set(beats.map((beat) => beat.action));
for (const action of requiredActions) {
  assert(usedActions.has(action), `missing beat action: ${action}`);
}

const uniqueUsedIcons = new Set(beats.map((beat) => beat.icon));
assert(uniqueUsedIcons.size >= 39, `expected at least 39 distinct beat icons, received ${uniqueUsedIcons.size}`);

const registryPath = path.join(PROJECT_ROOT, 'src/components/ultimate-kit/families/skill-showcase/iconRegistry.ts');
const registrySource = readFileSync(registryPath, 'utf8');
const keyBlock = registrySource.match(/SKILL_ICON_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
assert(keyBlock, 'could not read SKILL_ICON_KEYS from iconRegistry.ts');
const registeredIcons = [...keyBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert(registeredIcons.length === 76, `expected 76 registered icons, received ${registeredIcons.length}`);
assert(new Set(registeredIcons).size === registeredIcons.length, 'registered icons must be unique');

const iconPackNames = [...registrySource.matchAll(/^\s{2}([a-z]+):\s*\[/gm)].map((match) => match[1]);
assert(iconPackNames.length === 12, `expected 12 semantic icon packs, received ${iconPackNames.length}`);

const iconRoot = path.join(PROJECT_ROOT, 'public/projects/skill-showcase/icons');
assert(existsSync(path.join(iconRoot, 'LUCIDE_LICENSE.txt')), 'lucide license must be stored with static icons');
for (const icon of registeredIcons) {
  assert(existsSync(path.join(iconRoot, `${icon}.svg`)), `registered icon asset missing: ${icon}.svg`);
}
for (const icon of uniqueUsedIcons) {
  assert(registeredIcons.includes(icon), `beat uses an icon not in registry: ${icon}`);
}

const productIconRoot = path.join(PROJECT_ROOT, 'public/projects/skill-showcase/product-icons');
for (const icon of requiredProductIcons) {
  assert(existsSync(path.join(productIconRoot, icon)), `product icon asset missing: ${icon}`);
}

const renderDurationSeconds = totalFrames / project.render.fps;
const output = {
  ok: true,
  project: path.relative(PROJECT_ROOT, projectPath),
  projectId: project.projectId,
  frames: totalFrames,
  durationSeconds: Number(renderDurationSeconds.toFixed(3)),
  scenes: project.scenes.length,
  captions: project.captions.length,
  beats: beats.length,
  usedIcons: uniqueUsedIcons.size,
  registeredIcons: registeredIcons.length,
  iconPacks: iconPackNames.length,
  productIcons: requiredProductIcons.length,
  actions: [...usedActions].sort(),
};

if (shouldVerifyVideo) {
  assert(existsSync(videoPath), `video missing: ${videoPath}`);
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size:stream=index,codec_type,codec_name,width,height,avg_frame_rate,duration',
    '-of', 'json',
    videoPath,
  ], {encoding: 'utf8'}));
  const videoStream = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams?.find((stream) => stream.codec_type === 'audio');
  assert(videoStream, 'video stream is required');
  assert(audioStream, 'audio stream is required');
  assert(videoStream.codec_name === 'h264', `video codec must be h264, received ${videoStream.codec_name}`);
  assert(audioStream.codec_name === 'aac', `audio codec must be aac, received ${audioStream.codec_name}`);
  assert(Number(videoStream.width) === project.render.width, 'video width does not match project');
  assert(Number(videoStream.height) === project.render.height, 'video height does not match project');
  const [fpsNumerator, fpsDenominator] = String(videoStream.avg_frame_rate).split('/').map(Number);
  const actualFps = fpsNumerator / fpsDenominator;
  assert(Math.abs(actualFps - project.render.fps) <= 0.01, `video fps mismatch: ${actualFps}`);
  assert(Math.abs(Number(videoStream.duration) - renderDurationSeconds) <= 0.1, 'video duration does not match project frames');
  execFileSync('ffmpeg', ['-v', 'error', '-i', videoPath, '-f', 'null', '-'], {stdio: 'pipe'});
  output.video = {
    path: path.relative(PROJECT_ROOT, videoPath),
    codec: videoStream.codec_name,
    audioCodec: audioStream.codec_name,
    width: Number(videoStream.width),
    height: Number(videoStream.height),
    fps: actualFps,
    durationSeconds: Number(Number(videoStream.duration).toFixed(3)),
    sizeBytes: Number(probe.format?.size ?? 0),
    decoded: true,
  };
}

console.log(JSON.stringify(output, null, 2));
