/**
 * render-ultimate-scene.mjs
 *
 * Unified render entry for Step-4 driven pipeline.
 *
 * Supports three input合同:
 *   --config <step-04.json>         (segments_meta[] | payload.shots[])
 *   --config <workflow_*.json>       (result.payload.shots[])
 *   --outline <outline.json>         (legacy Ultimate outline format — kept for compat)
 *
 * Output:
 *   Shots are normalized via storyboardLoader (single source of truth)
 *   --props {"shots": [...]} passed to Remotion
 *   calculateMetadata in Root.tsx reads props.shots and derives config
 */

import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {exportCreativeContracts} from './export-creative-contracts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

const readFlag = (name) => {
  const idx = args.indexOf(name);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
};
const hasFlag = (name) => args.includes(name);

const printUsage = () => {
  console.log(`Usage:
  node scripts/render-ultimate-scene.mjs --config <file> [--out <output.mp4>] [--dry-run]
  node scripts/render-ultimate-scene.mjs --outline <outline.json> [--out <output.mp4>] [--dry-run]

Supported --config formats:
  - step-04.json (segments_meta[])
  - step-04.json (payload.shots[])
  - workflow_*.json (result.payload.shots[])

Examples:
  node scripts/render-ultimate-scene.mjs --config projects/gpt55-final-cut/steps/step-04.json --out out/gpt55-v23.mp4
  node scripts/render-ultimate-scene.mjs --config runtime/jobs/workflow/workflow_*.json --dry-run
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

// ------------------------------------------------------------------------- //
// Load via storyboardLoader (single source of truth)
// ------------------------------------------------------------------------- //

import {
  loadStep04Shots,
  shotsToScenes,
  calcTotalFrames,
  hydrateUltimateProjectConfigWithDirectorGrammar,
} from '../src/data/storyboardLoader.node.ts';

if (outlineArg) {
  // Legacy outline format — read directly, no transformation
  const resolvedOutlinePath = path.resolve(process.cwd(), outlineArg);
  if (!fs.existsSync(resolvedOutlinePath)) {
    console.error(`Outline file not found: ${resolvedOutlinePath}`);
    process.exit(1);
  }
  const outline = JSON.parse(fs.readFileSync(resolvedOutlinePath, 'utf8'));
  // Legacy path: compile + render with outline flag
  console.log('[render] Legacy outline mode — falling back to direct Ultimate config');
  const remotionArgs = [
    'npx', 'remotion', 'render',
    'src/Root.tsx',
    'UltimateSceneTemplate',
    '--props', JSON.stringify({outline}),
    ...(readFlag('--out') ? [readFlag('--out')] : ['out/ultimate-outline-demo.mp4']),
  ];
  if (hasFlag('--dry-run')) {
    console.log(`Command: ${remotionArgs.join(' ')}`);
    process.exit(0);
  }
  const result = spawnSync('npx', remotionArgs.slice(1), {stdio: 'inherit', cwd: process.cwd()});
  process.exit(result.status ?? 1);
}

// Config mode
const resolvedInputPath = path.resolve(process.cwd(), configArg);
if (!fs.existsSync(resolvedInputPath)) {
  console.error(`Config file not found: ${resolvedInputPath}`);
  process.exit(1);
}

const outArg = readFlag('--out');
const resolvedOutPath = path.resolve(process.cwd(), outArg ?? 'out/ultimate-scene-template.mp4');
fs.mkdirSync(path.dirname(resolvedOutPath), {recursive: true});

await exportCreativeContracts({cwd: process.cwd()});

let shots;
let totalFrames;
let totalSec;
let isUltimateConfigFormat = false;

try {
  shots = await loadStep04Shots(resolvedInputPath);
} catch {
  // Not a Step-4 format — treat as Ultimate config
  isUltimateConfigFormat = true;
}

if (isUltimateConfigFormat) {
  // Legacy Ultimate config: read directly, pass as --props={config}
  let configData = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
  try {
    configData = hydrateUltimateProjectConfigWithDirectorGrammar(configData, {directorQA: 'error'});
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const remotionArgs = [
    'npx', 'remotion', 'render',
    'src/Root.tsx',
    'UltimateSceneTemplate',
    '--props', JSON.stringify({config: configData}),
    '--output', resolvedOutPath,
  ];
  if (hasFlag('--dry-run')) {
    console.log('=== Render (Ultimate config format — legacy path) ===');
    console.log(`Input:   ${resolvedInputPath}`);
    console.log(`Output:  ${resolvedOutPath}`);
    console.log(`Format:  UltimateProjectConfig (scenes[])`);
    console.log(`Command: ${remotionArgs.join(' ')}`);
    process.exit(0);
  }
  console.log(`[render] Ultimate config legacy mode: ${path.basename(resolvedInputPath)}`);
  const result = spawnSync('npx', remotionArgs.slice(1), {stdio: 'inherit', cwd: process.cwd()});
  process.exit(result.status ?? 1);
}

// Step-4 format: normalized shots
let scenes;
try {
  scenes = shotsToScenes(shots, {directorQA: 'error'});
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
totalFrames = calcTotalFrames(scenes);
totalSec = (totalFrames / 30).toFixed(1);

// --props passes shots array. Root.tsx calculateMetadata calls shotsToScenes() to build scenes.
const props = JSON.stringify({shots});

const remotionArgs = [
  'npx', 'remotion', 'render',
  'src/Root.tsx',
  'UltimateSceneTemplate',
  '--props', props,
  '--output', resolvedOutPath,
];

if (hasFlag('--dry-run')) {
  console.log('=== Render (dry-run) ===');
  console.log(`Input:   ${resolvedInputPath}`);
  console.log(`Output:  ${resolvedOutPath}`);
  console.log(`Shots:   ${shots.length}`);
  console.log(`Frames:  ${totalFrames} (from data, not code)`);
  console.log(`Duration: ${totalSec}s @ 30fps`);
  console.log();
  for (const shot of shots) {
    const sec = (shot.frames / 30).toFixed(1);
    console.log(`  [${shot.id}] ${shot.family} | ${shot.frames}f (${sec}s) | ${shot.narration?.slice(0, 50)}`);
  }
  console.log();
  console.log(`Command: ${remotionArgs.join(' ')}`);
  process.exit(0);
}

console.log(`[render] ${shots.length} shots / ${totalFrames}f / ${totalSec}s`);
console.log(`[render] Input: ${path.basename(resolvedInputPath)}`);

const result = spawnSync('npx', remotionArgs.slice(1), {
  stdio: 'inherit',
  cwd: process.cwd(),
  timeout: 0,
});

if (result.status !== 0) {
  console.error(`[render] Render failed with status ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log(`[render] Done: ${resolvedOutPath}`);
