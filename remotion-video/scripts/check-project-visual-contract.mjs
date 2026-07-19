#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkVisualContract} from './lib/visual-contract.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];

if (!input) {
  console.error('Usage: node scripts/check-project-visual-contract.mjs <project.json>');
  process.exit(1);
}

const projectPath = path.resolve(PROJECT_ROOT, input);
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const result = checkVisualContract(project, {projectRoot: PROJECT_ROOT});

console.log(JSON.stringify({
  ...result,
  project: path.relative(PROJECT_ROOT, projectPath),
  projectId: project.projectId ?? null,
}, null, 2));

if (!result.ok) process.exit(1);
