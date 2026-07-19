#!/usr/bin/env node

import {printAssetWarnings, PROJECT_ROOT, runRemotion, withPreparedProject} from './lib/project-cli.mjs';
import {assertVisualContract} from './lib/visual-contract.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run project:check -- <project.json>');
  process.exit(1);
}

await withPreparedProject(input, async ({project, tempPath, warnings}) => {
  const visualContract = assertVisualContract(project, {projectRoot: PROJECT_ROOT});
  runRemotion(['compositions', 'src/Root.tsx', '--props', tempPath]);
  printAssetWarnings(warnings);
  console.log(JSON.stringify({
    ok: true,
    projectId: project.projectId ?? null,
    schemaVersion: project.schemaVersion ?? null,
    scenes: Array.isArray(project.scenes) ? project.scenes.length : 0,
    optionalAssetsMissing: warnings.length,
    visualContract,
  }, null, 2));
});
