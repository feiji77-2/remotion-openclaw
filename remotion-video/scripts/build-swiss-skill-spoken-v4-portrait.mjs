#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SOURCE = resolve(PROJECT_ROOT, 'examples', 'swiss-skill-spoken-v3.json');
const OUTPUT = resolve(PROJECT_ROOT, 'examples', 'swiss-skill-spoken-v4-portrait.json');

const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

const shots = new Map([
  [0, ['split-wipe', 'problem']],
  [1, ['material-carousel', 'gradient']],
  [2, ['system-convergence', 'install']],
  [3, ['kinetic-type', 'language']],
  [4, ['orbital-map', 'rules']],
  [5, ['particle-field', 'categories']],
  [6, ['ui-scan', 'scan']],
  [7, ['split-wipe', 'compare']],
  [8, ['particle-field', 'stars']],
  [9, ['material-carousel', 'directions']],
  [10, ['surface-morph', 'directions']],
  [11, ['focus-lock', 'anchor']],
  [12, ['kinetic-type', 'anti-pattern']],
  [13, ['pipeline-flow', 'pipeline']],
  [14, ['orbital-map', 'database']],
  [15, ['kinetic-type', 'metrics']],
  [16, ['token-assembly', 'assembly']],
  [17, ['surface-morph', 'surfaces']],
  [18, ['split-wipe', 'pain']],
  [19, ['particle-field', 'brands']],
  [20, ['material-carousel', 'brand-relay']],
  [21, ['system-convergence', 'outro']],
]);

// Swiss V4 is a fixture for the reusable technical-explainer product contract.
// The renderer itself contains no Swiss-specific copy or branching.
const heroPresets = new Map([
  [0, 'before-after'],
  [1, 'ui-audit'],
  [2, 'terminal-run'],
  [3, 'config-inspector'],
  [4, 'test-report'],
  [5, 'asset-gallery'],
  [6, 'ui-audit'],
  [7, 'before-after'],
  [8, 'test-report'],
  [9, 'asset-gallery'],
  [10, 'browser-demo'],
  [11, 'ui-audit'],
  [12, 'config-inspector'],
  [13, 'workflow-trace'],
  [14, 'terminal-run'],
  [15, 'test-report'],
  [16, 'workflow-trace'],
  [17, 'browser-demo'],
  [18, 'code-diff'],
  [19, 'test-report'],
  [20, 'asset-gallery'],
  [21, 'system-map'],
]);

const sceneSignatures = [
  'intro-contrast',
  'rules-orbit',
  'direction-materials',
  'token-database',
  'brand-depth',
  'system-convergence',
];

const scenes = source.scenes.map((scene, sceneIndex) => ({
  ...scene,
  transition: sceneIndex === source.scenes.length - 1 ? false : {
    type: sceneIndex % 2 === 0 ? 'fade' : 'slide',
    durationInFrames: sceneIndex % 2 === 0 ? 10 : 8,
  },
  payload: {
    ...scene.payload,
    heroStyle: 'tech-explainer',
    layoutSignature: `portrait:cinematic-v4:${sceneSignatures[sceneIndex]}`,
    beats: scene.payload.beats.map((beat) => {
      const key = beat.captionStartIndex;
      const shot = shots.get(key);
      if (!shot) throw new Error(`Missing V4 shot mapping for caption ${key}: ${beat.keyword}`);
      const heroPreset = heroPresets.get(key);
      if (!heroPreset) throw new Error(`Missing V4 technical hero mapping for caption ${key}: ${beat.keyword}`);
      const [shotPreset, visualState] = shot;
      return {...beat, shotPreset, heroPreset, visualState};
    }),
  },
}));

const mappedBeatCount = scenes.reduce((total, scene) => total + scene.payload.beats.length, 0);
if (mappedBeatCount !== shots.size || mappedBeatCount !== heroPresets.size || mappedBeatCount !== 22) {
  throw new Error(`Expected 22 mapped beats, received ${mappedBeatCount}`);
}

const project = {
  ...source,
  projectId: 'swiss-skill-spoken-v4-portrait',
  title: '装对 Skill，AI 才有立场 — 9:16 电影化语义动效版',
  render: {
    ...source.render,
    width: 1080,
    height: 1920,
    qualityMode: 'cinematic',
    orientation: 'portrait',
    captionStyle: 'editorial',
    showProjectLabel: false,
  },
  scenes,
};

writeFileSync(OUTPUT, `${JSON.stringify(project, null, 2)}\n`);

const totalFrames = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
console.log(`written: ${OUTPUT}`);
console.log(`scenes: ${scenes.length}`);
console.log(`beats: ${mappedBeatCount}`);
console.log(`duration: ${totalFrames} frames / ${(totalFrames / project.render.fps).toFixed(2)}s`);
