#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateVideoBlueprint} from './lib/video-blueprint-generator.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run production:build-project -- <production-dir> [--out project.json]');
  process.exit(1);
}

const args = process.argv.slice(3);
const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const productionDir = path.resolve(process.cwd(), input);
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(productionDir, file), 'utf8'));
const brief = await readJson('brief.json');
const script = await readJson('script-pack.json');
const assetPack = await readJson('asset-pack.json');

// ── Generate product-grade project via video-blueprint-generator ──────

const project = generateVideoBlueprint({
  brief,
  script,
  assetPack,
  projectRoot: PROJECT_ROOT,
});

const output = path.resolve(productionDir, valueFor('--out', 'project.json'));
await fs.writeFile(output, `${JSON.stringify(project, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  project: output,
  projectId: project.projectId,
  scenes: project.scenes.length,
  durationInFrames: project.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
  captions: project.captions.length,
  families: project.scenes.map((s) => s.family),
  next: [
    `npm run project:check -- ${path.relative(PROJECT_ROOT, output)}`,
    `npm run project:still -- ${path.relative(PROJECT_ROOT, output)} --frame 30`,
  ],
}, null, 2));
