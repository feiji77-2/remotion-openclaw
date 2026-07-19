#!/usr/bin/env node

import path from 'node:path';
import {printAssetWarnings, PROJECT_ROOT, runRemotion, stripFlags, takeFlag, withPreparedProject} from './lib/project-cli.mjs';
import {assertVisualContract} from './lib/visual-contract.mjs';

const input = process.argv[2];
const args = process.argv.slice(3);
if (!input) {
  console.error('Usage: npm run project:render -- <project.json> [--out out/project.mp4] [...remotion flags]');
  process.exit(1);
}

await withPreparedProject(input, async ({project, tempPath, warnings}) => {
  assertVisualContract(project, {projectRoot: PROJECT_ROOT});
  const output = path.resolve(PROJECT_ROOT, takeFlag(args, '--out', `out/${project.projectId || 'project'}.mp4`));
  const passthrough = stripFlags(args, ['--out']);
  runRemotion([
    'render',
    'src/Root.tsx',
    'UltimateVideoV2',
    output,
    '--props', tempPath,
    ...passthrough,
  ]);
  printAssetWarnings(warnings);
  console.log(`[project] video=${output}`);
});
