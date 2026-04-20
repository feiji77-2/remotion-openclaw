import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {compileUltimateOutline, validateUltimateOutline} from './lib/ultimate-outline-compiler.mjs';
import {
  normalizeUltimateConfig,
  summarizeUltimateConfig,
  validateUltimateConfig,
} from './lib/ultimate-scene-config.mjs';

const args = process.argv.slice(2);

const readFlag = (name) => {
  const index = args.indexOf(name);

  if (index === -1 || index === args.length - 1) {
    return null;
  }

  return args[index + 1];
};

const hasFlag = (name) => args.includes(name);
const readOptionalValueFlag = (name, fallbackValue) => {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  const next = args[index + 1];

  if (!next || next.startsWith('--')) {
    return fallbackValue;
  }

  return next;
};

const printUsage = () => {
  console.log(`Usage:
  node scripts/render-ultimate-scene.mjs --config <json-file> [--out <output.mp4>] [--dry-run]
  node scripts/render-ultimate-scene.mjs --outline <outline-json> [--out <output.mp4>] [--dry-run]

Examples:
  node scripts/render-ultimate-scene.mjs --config examples/ultimate-scene-demo.json
  node scripts/render-ultimate-scene.mjs --outline examples/ultimate-outline-demo.json
  node scripts/render-ultimate-scene.mjs --config ./my-video.json --out out/my-video.mp4
`);
};

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage();
  process.exit(0);
}

const configArg = readFlag('--config');
const outlineArg = readFlag('--outline');

if (!configArg && !outlineArg) {
  printUsage();
  process.exit(1);
}

const resolvedInputPath = path.resolve(process.cwd(), configArg ?? outlineArg);

if (!fs.existsSync(resolvedInputPath)) {
  console.error(`Input file not found: ${resolvedInputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(resolvedInputPath, 'utf8');
const parsed = JSON.parse(raw);
const config = outlineArg ? compileUltimateOutline(parsed) : parsed;

if (outlineArg) {
  const outlineErrors = validateUltimateOutline(parsed);

  if (outlineErrors.length > 0) {
    console.error('Invalid outline:');
    for (const error of outlineErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
}

const errors = validateUltimateConfig(config);

if (errors.length > 0) {
  console.error('Invalid config:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const normalizedConfig = normalizeUltimateConfig(config);
const summary = summarizeUltimateConfig(config);

const outArg = readFlag('--out');
const resolvedOutPath = path.resolve(
  process.cwd(),
  outArg ?? 'out/ultimate-scene-template.mp4',
);

fs.mkdirSync(path.dirname(resolvedOutPath), {recursive: true});

const writeNormalizedArg = readOptionalValueFlag('--write-normalized', 'out/ultimate-scene-template.normalized.json');

if (writeNormalizedArg) {
  const resolvedNormalizedPath = path.resolve(process.cwd(), writeNormalizedArg);
  fs.mkdirSync(path.dirname(resolvedNormalizedPath), {recursive: true});
  fs.writeFileSync(resolvedNormalizedPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
}

const props = JSON.stringify({config: normalizedConfig});
const remotionArgs = [
  'remotion',
  'render',
  'src/Root.tsx',
  'UltimateSceneTemplate',
  resolvedOutPath,
  '--props',
  props,
];

if (hasFlag('--dry-run')) {
  console.log('Dry run only.');
  console.log(`${outlineArg ? 'Outline' : 'Config'}: ${resolvedInputPath}`);
  console.log(`Output: ${resolvedOutPath}`);
  console.log(`Scenes: ${summary.sceneCount}`);
  console.log(`Duration: ${summary.durationInSeconds}s / ${summary.durationInFrames} frames`);
  for (const scene of summary.families) {
  console.log(`- ${scene.id}: ${scene.family} (${scene.durationInFrames}f) ${scene.subtitle}`);
  }
  console.log(`Command: npx ${remotionArgs.join(' ')}`);
  process.exit(0);
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCommand, remotionArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Rendered: ${resolvedOutPath}`);
