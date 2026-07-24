#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  DEFAULT_SAMPLE_SIZE,
  buildVisualMetricsReport,
  collectImageFiles,
} from './lib/visual-metrics.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const usage = () => {
  console.error([
    'Usage: node scripts/visual-metrics.mjs [--project <project.json>] [--image <still.png|contact.jpg>] [--dir <image-dir>] [--out <metrics.json>]',
    '',
    'Examples:',
    '  node scripts/visual-metrics.mjs --project examples/skill-showcase.json --image out/skill-showcase-frame-180.png',
    '  node scripts/visual-metrics.mjs --project public/projects/demo/project.json --dir out/demo-qa --out out/demo-visual-metrics.json',
    '',
    'Positional .json files are treated as --project when --project is omitted; positional image files or directories are added to image inputs.',
  ].join('\n'));
};

const args = process.argv.slice(2);
const takeValues = (flag) => {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === flag && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    } else if (arg.startsWith(`${flag}=`)) {
      values.push(arg.slice(flag.length + 1));
    }
  }
  return values;
};

const hasHelp = args.includes('--help') || args.includes('-h');
if (hasHelp) {
  usage();
  process.exit(0);
}

const consumedValueIndexes = new Set();
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (['--project', '--image', '--images', '--dir', '--qa-dir', '--out', '--sample-width', '--sample-height'].includes(arg)) {
    consumedValueIndexes.add(index);
    consumedValueIndexes.add(index + 1);
  } else if (/^--(?:project|image|images|dir|qa-dir|out|sample-width|sample-height)=/.test(arg)) {
    consumedValueIndexes.add(index);
  }
}

let projectPath = takeValues('--project').at(-1) ?? null;
const imageInputs = [
  ...takeValues('--image'),
  ...takeValues('--dir'),
  ...takeValues('--qa-dir'),
];
for (const value of takeValues('--images')) {
  imageInputs.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
}

for (let index = 0; index < args.length; index += 1) {
  if (consumedValueIndexes.has(index) || args[index].startsWith('--')) continue;
  const value = args[index];
  if (!projectPath && path.extname(value).toLowerCase() === '.json') projectPath = value;
  else imageInputs.push(value);
}

const sampleWidth = Number(takeValues('--sample-width').at(-1) ?? DEFAULT_SAMPLE_SIZE.width);
const sampleHeight = Number(takeValues('--sample-height').at(-1) ?? DEFAULT_SAMPLE_SIZE.height);
const outPath = takeValues('--out').at(-1) ?? null;

if (!projectPath && imageInputs.length === 0) {
  usage();
  process.exit(1);
}

const resolveFromProjectRoot = (inputPath) => path.resolve(PROJECT_ROOT, inputPath);

let project = null;
let resolvedProjectPath = null;
if (projectPath) {
  resolvedProjectPath = resolveFromProjectRoot(projectPath);
  project = JSON.parse(fs.readFileSync(resolvedProjectPath, 'utf8'));
}

const imagePaths = [...new Set(
  imageInputs.flatMap((inputPath) => collectImageFiles(resolveFromProjectRoot(inputPath))),
)].sort((left, right) => left.localeCompare(right));

const report = buildVisualMetricsReport({
  imagePaths,
  project,
  sampleSize: {
    width: Number.isFinite(sampleWidth) && sampleWidth > 0 ? sampleWidth : DEFAULT_SAMPLE_SIZE.width,
    height: Number.isFinite(sampleHeight) && sampleHeight > 0 ? sampleHeight : DEFAULT_SAMPLE_SIZE.height,
  },
});

report.inputs = {
  project: resolvedProjectPath ? path.relative(PROJECT_ROOT, resolvedProjectPath).split(path.sep).join('/') : null,
  imageInputs: imageInputs.map((inputPath) => path.relative(PROJECT_ROOT, resolveFromProjectRoot(inputPath)).split(path.sep).join('/')),
  imageCount: imagePaths.length,
};
report.images.items = report.images.items.map((item) => ({
  ...item,
  path: path.relative(PROJECT_ROOT, item.path).split(path.sep).join('/'),
}));

const output = `${JSON.stringify(report, null, 2)}\n`;
if (outPath) {
  const resolvedOutPath = resolveFromProjectRoot(outPath);
  fs.mkdirSync(path.dirname(resolvedOutPath), {recursive: true});
  fs.writeFileSync(resolvedOutPath, output, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    report: path.relative(PROJECT_ROOT, resolvedOutPath).split(path.sep).join('/'),
    project: report.inputs.project,
    images: report.images.count,
  }, null, 2));
} else {
  process.stdout.write(output);
}
