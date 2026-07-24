#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {printAssetWarnings, PROJECT_ROOT, runRemotion, stripFlags, takeFlag, withPreparedProject} from './lib/project-cli.mjs';
import {assertVisualContract} from './lib/visual-contract.mjs';

const input = process.argv[2];
const args = process.argv.slice(3);

if (!input) {
  console.error('Usage: npm run project:scene-stills -- <project.json> [--out-dir out/project-scene-stills]');
  process.exit(1);
}

const sceneTitle = (scene) => {
  const title = typeof scene?.payload?.title === 'string' ? scene.payload.title.trim() : '';
  const label = typeof scene?.payload?.label === 'string' ? scene.payload.label.trim() : '';
  return (title || label || scene.id || 'Scene').slice(0, 96);
};

await withPreparedProject(input, async ({project, prepared, tempPath, warnings}) => {
  assertVisualContract(prepared, {projectRoot: PROJECT_ROOT});
  const projectId = String(prepared.projectId || project.projectId || 'project');
  const outputDir = path.resolve(PROJECT_ROOT, takeFlag(args, '--out-dir', `out/${projectId}-scene-stills`));
  const passthrough = stripFlags(args, ['--out-dir']);
  await fs.mkdir(outputDir, {recursive: true});

  let cursor = 0;
  const scenes = [];
  console.log(`[scene-stills] total ${prepared.scenes.length}`);
  for (let index = 0; index < prepared.scenes.length; index += 1) {
    const scene = prepared.scenes[index];
    const startFrame = cursor;
    const duration = Math.max(1, Number(scene.durationInFrames) || 1);
    const endFrame = startFrame + duration;
    const frame = Math.max(0, startFrame + Math.floor(duration / 2));
    const fileName = `scene-${String(index + 1).padStart(2, '0')}.png`;
    const output = path.join(outputDir, fileName);

    console.log(`[scene-stills] rendering ${index + 1}/${prepared.scenes.length}`);
    runRemotion([
      'still',
      'src/Root.tsx',
      'UltimateVideoV2',
      output,
      '--frame', String(frame),
      '--props', tempPath,
      ...passthrough,
    ]);

    scenes.push({
      index,
      sceneId: scene.id,
      title: sceneTitle(scene),
      startFrame,
      endFrame,
      durationInFrames: duration,
      frame,
      path: path.relative(PROJECT_ROOT, output).split(path.sep).join('/'),
    });
    cursor = endFrame;
    console.log(`[scene-stills] progress ${index + 1}/${prepared.scenes.length}`);
  }

  const manifest = {
    projectId,
    generatedAt: new Date().toISOString(),
    count: scenes.length,
    fps: prepared.render?.fps ?? 30,
    width: prepared.render?.width ?? 1080,
    height: prepared.render?.height ?? 1920,
    scenes,
  };
  const manifestPath = path.join(outputDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  printAssetWarnings(warnings);
  console.log(`[project] scene-stills=${manifestPath}`);
});
