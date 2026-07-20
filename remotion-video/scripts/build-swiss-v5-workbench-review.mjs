#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'examples', 'swiss-skill-spoken-v5-workbench.json');
const OUTPUT = resolve(ROOT, 'examples', 'swiss-v5-workbench-review.json');
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
const targets = [2, 4, 6, 13, 16];
const durationInFrames = 90;

const scenes = targets.map((captionIndex, index) => {
  const sourceScene = source.scenes.find((scene) => scene.payload.workbench?.steps.some((step) => step.captionIndex === captionIndex));
  const sourceBeat = sourceScene?.payload.beats.find((beat) => beat.captionStartIndex === captionIndex);
  const sourceStep = sourceScene?.payload.workbench.steps.find((step) => step.captionIndex === captionIndex);
  if (!sourceScene || !sourceBeat || !sourceStep) throw new Error(`Missing workbench target ${captionIndex}`);
  return {
    ...sourceScene,
    id: `workbench-${String(index + 1).padStart(2, '0')}`,
    durationInFrames,
    captionRange: {startIndex: index, endIndex: index},
    transition: index === targets.length - 1 ? false : {type: 'fade', durationInFrames: 8},
    payload: {
      ...sourceScene.payload,
      progressIndex: index,
      progressTotal: targets.length,
      captionStartIndex: index,
      captionEndIndex: index,
      sourceText: source.captions[captionIndex].text,
      beats: [{...sourceBeat, startFrame: 0, endFrame: durationInFrames, captionStartIndex: index, captionEndIndex: index}],
      workbench: {...sourceScene.payload.workbench, steps: [{...sourceStep, captionIndex: index}]},
    },
  };
});

const captions = targets.map((captionIndex, index) => ({
  ...source.captions[captionIndex],
  startMs: index * 3000,
  endMs: (index + 1) * 3000,
  timestampMs: index * 3000,
  confidence: 1,
}));

const project = {
  ...source,
  projectId: 'swiss-v5-workbench-review',
  title: '技术证据工作台 V2 — 15 秒审阅片',
  scenes,
  captions,
  assets: {},
};
delete project.audio;

writeFileSync(OUTPUT, `${JSON.stringify(project, null, 2)}\n`);
console.log(`written: ${OUTPUT}`);
