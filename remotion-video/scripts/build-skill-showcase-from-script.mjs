#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSkillShowcaseProjectFromScript, slugify} from './lib/script-project-generator.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const readTextInput = async () => {
  const inline = valueFor('--script');
  if (inline) return inline;
  const file = valueFor('--script-file');
  if (file) return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
  return '';
};

const readCaptionsInput = async () => {
  const file = valueFor('--captions-file');
  if (!file) return null;
  return JSON.parse(await fs.readFile(path.resolve(process.cwd(), file), 'utf8'));
};

const title = valueFor('--title');
const scriptText = await readTextInput();
const captions = await readCaptionsInput();
const projectId = valueFor('--id', slugify(title || scriptText.slice(0, 42)));
const voiceSrc = valueFor('--voice-src');
const out = valueFor('--out', `examples/${projectId}.json`);

const project = buildSkillShowcaseProjectFromScript({
  scriptText,
  captions,
  projectId,
  title,
  voiceSrc,
  projectRoot: PROJECT_ROOT,
  maxScenes: Number(valueFor('--max-scenes', '8')),
});

const outputPath = path.resolve(PROJECT_ROOT, out);
await fs.mkdir(path.dirname(outputPath), {recursive: true});
await fs.writeFile(outputPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  project: outputPath,
  projectId: project.projectId,
  scenes: project.scenes.length,
  captions: project.captions.length,
  frames: project.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
  open: outputPath,
  next: [
    `npm run project:visual-check -- ${path.relative(PROJECT_ROOT, outputPath)}`,
    `npm run project:check -- ${path.relative(PROJECT_ROOT, outputPath)}`,
    `npm run project:still -- ${path.relative(PROJECT_ROOT, outputPath)} --frame 60 --out out/${project.projectId}-f60.png`,
  ],
}, null, 2));
