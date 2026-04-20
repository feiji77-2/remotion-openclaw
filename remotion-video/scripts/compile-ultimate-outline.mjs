import fs from 'node:fs';
import path from 'node:path';
import {compileUltimateOutline, validateUltimateOutline} from './lib/ultimate-outline-compiler.mjs';
import {normalizeUltimateConfig, summarizeUltimateConfig} from './lib/ultimate-scene-config.mjs';

const args = process.argv.slice(2);

const readFlag = (name) => {
  const index = args.indexOf(name);

  if (index === -1 || index === args.length - 1) {
    return null;
  }

  return args[index + 1];
};

const hasFlag = (name) => args.includes(name);

const printUsage = () => {
  console.log(`Usage:
  node scripts/compile-ultimate-outline.mjs --outline <outline-json> [--out <compiled-json>] [--write-normalized <normalized-json>]

Examples:
  node scripts/compile-ultimate-outline.mjs --outline examples/ultimate-outline-demo.json
  node scripts/compile-ultimate-outline.mjs --outline ./my-outline.json --out out/my-video.compiled.json
`);
};

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage();
  process.exit(0);
}

const outlineArg = readFlag('--outline');

if (!outlineArg) {
  printUsage();
  process.exit(1);
}

const outlinePath = path.resolve(process.cwd(), outlineArg);

if (!fs.existsSync(outlinePath)) {
  console.error(`Outline file not found: ${outlinePath}`);
  process.exit(1);
}

const outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'));
const errors = validateUltimateOutline(outline);

if (errors.length > 0) {
  console.error('Outline check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const compiled = compileUltimateOutline(outline);
const normalized = normalizeUltimateConfig(compiled);
const summary = summarizeUltimateConfig(compiled);
const outArg = readFlag('--out') ?? 'out/ultimate-outline.compiled.json';
const normalizedArg = readFlag('--write-normalized') ?? 'out/ultimate-outline.normalized.json';
const outPath = path.resolve(process.cwd(), outArg);
const normalizedPath = path.resolve(process.cwd(), normalizedArg);

fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, `${JSON.stringify(compiled, null, 2)}\n`, 'utf8');
fs.mkdirSync(path.dirname(normalizedPath), {recursive: true});
fs.writeFileSync(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

console.log(`Compiled config written to: ${outPath}`);
console.log(`Normalized config written to: ${normalizedPath}`);
console.log(`Scenes: ${summary.sceneCount}`);
console.log(`Duration: ${summary.durationInSeconds}s / ${summary.durationInFrames} frames`);
