#!/usr/bin/env node

import path from 'node:path';
import {printAssetWarnings, PROJECT_ROOT, runRemotion, stripFlags, takeFlag, withPreparedProject} from './lib/project-cli.mjs';
import {assertVisualContract} from './lib/visual-contract.mjs';

const input = process.argv[2];
const args = process.argv.slice(3);
if (!input) {
  console.error('Usage: npm run project:still -- <project.json> [--frame 30] [--out out/project.png]');
  process.exit(1);
}

await withPreparedProject(input, async ({project, tempPath, warnings}) => {
  assertVisualContract(project, {projectRoot: PROJECT_ROOT});
  const frame = Math.max(0, Math.round(Number(takeFlag(args, '--frame', '0')) || 0));
  const output = path.resolve(
    PROJECT_ROOT,
    takeFlag(args, '--out', `out/${project.projectId || 'project'}-frame-${frame}.png`),
  );
  const passthrough = stripFlags(args, ['--frame', '--out']);
  runRemotion([
    'still',
    'src/Root.tsx',
    'UltimateVideoV2',
    output,
    '--frame', String(frame),
    '--props', tempPath,
    ...passthrough,
  ]);
  printAssetWarnings(warnings);
  console.log(`[project] still=${output}`);
});
