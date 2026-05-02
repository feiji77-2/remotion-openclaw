import fs from 'node:fs';
import path from 'node:path';
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

const configArg = readFlag('--config');

if (!configArg) {
  console.error('Usage: node scripts/check-ultimate-scene.mjs --config <json-file>');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), configArg);
const raw = fs.readFileSync(inputPath, 'utf8');
const parsed = JSON.parse(raw);
const inputLabel = 'config';
const config = parsed;
const errors = validateUltimateConfig(config);

if (errors.length > 0) {
  console.error('Config check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const normalized = normalizeUltimateConfig(config);
const summary = summarizeUltimateConfig(config);

console.log(`Input (${inputLabel}): ${inputPath}`);
console.log(`Title: ${summary.title}`);
console.log(`Scenes: ${summary.sceneCount}`);
console.log(`Duration: ${summary.durationInSeconds}s / ${summary.durationInFrames} frames`);
for (const scene of summary.families) {
  console.log(`- ${scene.id}: ${scene.family} (${scene.durationInFrames}f) ${scene.subtitle}`);
}

const normalizedPath = path.resolve(
  process.cwd(),
  'out/ultimate-scene-template.normalized.json',
);
fs.mkdirSync(path.dirname(normalizedPath), {recursive: true});
fs.writeFileSync(`${normalizedPath}`, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
console.log(`Normalized config written to: ${normalizedPath}`);
