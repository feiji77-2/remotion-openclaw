#!/usr/bin/env node

import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {printAssetWarnings, PROJECT_ROOT, runRemotion, stripFlags, takeFlag, withPreparedProject} from './lib/project-cli.mjs';
import {assertVisualContract} from './lib/visual-contract.mjs';

const input = process.argv[2];
const args = process.argv.slice(3);

if (!input) {
  console.error('Usage: node scripts/project-qa-sheet.mjs <project.json> [--out-dir out/project-qa] [--render] [--scale=0.35] [--max-beats 12]');
  process.exit(1);
}

const hasFlag = (flag) => args.includes(flag);
const frameTriplet = (startFrame, endFrame) => {
  const lastFrame = Math.max(startFrame, endFrame - 1);
  return [
    startFrame,
    Math.round((startFrame + lastFrame) / 2),
    lastFrame,
  ];
};

await withPreparedProject(input, async ({project, tempPath, warnings}) => {
  assertVisualContract(project, {projectRoot: PROJECT_ROOT});
  const outDir = path.resolve(PROJECT_ROOT, takeFlag(args, '--out-dir', `out/${project.projectId || 'project'}-qa`));
  const shouldRender = hasFlag('--render');
  const maxBeats = Math.max(0, Math.round(Number(takeFlag(args, '--max-beats', '0')) || 0));
  const passthrough = stripFlags(args.filter((arg) => arg !== '--render'), ['--out-dir', '--max-beats']);

  await fs.mkdir(outDir, {recursive: true});

  let sceneStartFrame = 0;
  const samples = [];
  for (const [sceneIndex, scene] of project.scenes.entries()) {
    const beats = Array.isArray(scene.payload?.beats) ? scene.payload.beats : [];
    const selectedBeats = maxBeats > 0 ? beats.slice(0, maxBeats) : beats;
    for (const [beatIndex, beat] of selectedBeats.entries()) {
      if (!Number.isInteger(beat.startFrame) || !Number.isInteger(beat.endFrame)) continue;
      const frames = frameTriplet(sceneStartFrame + beat.startFrame, sceneStartFrame + beat.endFrame);
      frames.forEach((frame, phaseIndex) => {
        samples.push({
          sceneIndex,
          sceneId: scene.id,
          layoutSignature: scene.payload?.layoutSignature ?? scene.payload?.variant ?? scene.payload?.visualMode ?? scene.family,
          narrativeSignal: scene.payload?.narrativeSignal ?? null,
          beatIndex,
          keyword: beat.keyword,
          visualState: beat.visualState ?? null,
          motionPreset: beat.motionPreset ?? null,
          placement: beat.placement ?? null,
          phase: ['start', 'middle', 'end'][phaseIndex],
          frame,
        });
      });
    }
    sceneStartFrame += scene.durationInFrames;
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify({
    projectId: project.projectId ?? null,
    samples,
    render: shouldRender,
  }, null, 2)}\n`, 'utf8');

  if (shouldRender) {
    for (const [index, sample] of samples.entries()) {
      const output = path.join(outDir, `qa-${String(index).padStart(3, '0')}.png`);
      runRemotion([
        'still',
        'src/Root.tsx',
        'UltimateVideoV2',
        output,
        '--frame',
        String(sample.frame),
        '--props',
        tempPath,
        ...passthrough,
      ]);
    }
    if (samples.length > 0) {
      const cols = Math.min(6, Math.ceil(Math.sqrt(samples.length)));
      const rows = Math.ceil(samples.length / cols);
      const contactPath = path.join(outDir, 'contact-sheet.jpg');
      execFileSync('ffmpeg', [
        '-y',
        '-v',
        'error',
        '-framerate',
        '1',
        '-i',
        path.join(outDir, 'qa-%03d.png'),
        '-frames:v',
        '1',
        '-vf',
        `scale=360:-1,tile=layout=${cols}x${rows}:padding=8:margin=8:color=0x070a12`,
        contactPath,
      ], {stdio: 'pipe'});
    }
  }

  printAssetWarnings(warnings);
  console.log(JSON.stringify({
    ok: true,
    projectId: project.projectId ?? null,
    outDir,
    manifest: manifestPath,
    contactSheet: shouldRender ? path.join(outDir, 'contact-sheet.jpg') : null,
    samples: samples.length,
    render: shouldRender,
  }, null, 2));
});
