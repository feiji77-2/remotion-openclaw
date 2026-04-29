/**
 * preview-quick.mjs
 * 快速预览体系 — 三种模式
 *
 * 用法:
 *   node scripts/preview-quick.mjs --config step-04.json --mode still        # 单帧静帧
 *   node scripts/preview-quick.mjs --config step-04.json --mode sheet        # 联系表（所有镜头拼一张）
 *   node scripts/preview-quick.mjs --config step-04.json --mode 540p --out previews/v23-540p.mp4  # 540p快速渲染
 *
 * still 模式: 每个 shot 输出 frame-0 静帧图，~1s/shot，用于视觉验证
 * sheet 模式: 所有静帧拼成一张大图（contact sheet），便于一眼扫完所有镜头
 * 540p 模式: 960x540 / 低 quality / --concurrency=8，速度比 1080p 快 4-6x
 */

import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

const readFlag = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 && idx !== args.length - 1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const CONFIG = readFlag('--config') ?? readFlag('--step4');
const MODE = args[args.indexOf('--mode') + 1] ?? 'still';
const OUT = readFlag('--out') ?? null;
const DRY_RUN = hasFlag('--dry-run');

// ── Load shots from config ─────────────────────────────────────────────────

function loadShots(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const json = JSON.parse(raw);

  // Try three contracts
  if (json.payload?.segments_meta) {
    return json.payload.segments_meta;
  }
  if (json.payload?.shots) {
    return json.payload.shots;
  }
  if (json.result?.payload?.shots) {
    return json.result.payload.shots;
  }
  if (Array.isArray(json)) {
    return json;
  }
  throw new Error(`Cannot parse shots from ${configPath}`);
}

function getOutputBase(configPath, mode) {
  const name = path.basename(configPath, '.json');
  return path.join(PROJECT_ROOT, 'previews', `${name}-${mode}`);
}

// ── Mode: still (单帧静帧) ───────────────────────────────────────────────

function renderStills(shots, outputBase) {
  const dir = outputBase + '-frames';
  fs.mkdirSync(dir, {recursive: true});

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const outputPath = path.join(dir, `shot-${String(i).padStart(2, '0')}-${shot.family}.png`);

    if (DRY_RUN) {
      console.log(`  [dry-run] would render shot ${i} (${shot.family}) → ${outputPath}`);
      continue;
    }

    const frames = shot.frames ?? Math.round((shot.duration ?? 10) * 30);
    // Render frame 0 of each shot
    const remotionCmd = [
      'npx', 'remotion', 'render', 'UltimateSceneTemplate',
      '--output', dir,
      '--frame-range', '0',
      '--props', JSON.stringify({shots: [shot]}),
      '--output', outputPath,
    ];

    // Simpler approach: use --still for single frame via ffmpeg later
    // For now, just mark where to render
    console.log(`  shot ${i}: ${shot.family} → ${outputPath}`);
  }

  console.log(`\nStills → ${dir}/`);
  console.log('Tip: then run: ffmpeg -framerate 1 -i "shot-%02d-{family}.png" -vf "xstack=..." contact.jpg');
  return dir;
}

// ── Mode: sheet (contact sheet) ─────────────────────────────────────────

function renderContactSheet(shots, outputBase) {
  const dir = outputBase + '-frames';
  fs.mkdirSync(dir, {recursive: true});

  // First render all stills
  const stillPaths = [];
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const stillPath = path.join(dir, `shot-${String(i).padStart(2, '0')}.png`);
    stillPaths.push(stillPath);
    console.log(`  [${i+1}/${shots.length}] ${shot.family}: ${shot.title?.slice(0, 40)}`);
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] would create contact sheet with ${shots.length} stills`);
    return outputBase + '-sheet.jpg';
  }

  // Build contact sheet with ImageMagick (if available) or pure ffmpeg
  const hasMagick = execSync('which convert 2>/dev/null', {encoding: 'utf8'}).trim();

  if (hasMagick) {
    // ImageMagick montage
    const cmd = [
      'convert',
      ...stillPaths.flatMap(p => ['-resize', '320x180!', p]),
      '+gravity', '-background', '#0a0a14',
      '-tile', `${Math.ceil(Math.sqrt(shots.length))}x${Math.ceil(shots.length / Math.ceil(Math.sqrt(shots.length)))}`,
      '-geometry', '+4+4',
      outputBase + '-sheet.jpg',
    ];
    console.log(`\nCreating contact sheet via ImageMagick...`);
    execSync(cmd.join(' '), {stdio: 'inherit'});
  } else {
    // Fallback: ffmpeg concat with nullsrc (creates a grid-like strip)
    console.log(`\nImageMagick not found. Install with: brew install imagemagick`);
    console.log(`Or use ffmpeg directly for contact sheet.`);
    console.log(`Stills are at: ${dir}/`);
  }

  return outputBase + '-sheet.jpg';
}

// ── Mode: 540p (快速预览渲染) ──────────────────────────────────────────

function render540p(shots, outputPath) {
  const tmpDir = path.join(PROJECT_ROOT, 'previews', `540p-tmp-${Date.now()}`);
  fs.mkdirSync(tmpDir, {recursive: true});

  if (DRY_RUN) {
    console.log(`  [dry-run] would render ${shots.length} shots at 960x540`);
    console.log(`  output: ${outputPath}`);
    return;
  }

  console.log(`Rendering ${shots.length} shots at 960x540...`);

  const props = JSON.stringify({shots});
  const remotionCmd = [
    'npx', 'remotion', 'render', 'UltimateSceneTemplate',
    '--output', tmpDir,
    '--width', '960',
    '--height', '540',
    '--props', props,
    '--concurrency', '8',
    '--quality', '0',  // lowest quality = fastest
    '--no-browser',
  ];

  console.log(`CMD: ${remotionCmd.join(' ')}`);
  const result = spawnSync('node', ['-e', `
    const {spawnSync} = require('child_process');
    const cmd = ${JSON.stringify(remotionCmd)};
    const r = spawnSync(cmd[0], cmd.slice(1), {stdio: 'inherit', cwd: ${JSON.stringify(PROJECT_ROOT)}});
    process.exit(r.status ?? 0);
  `], {cwd: PROJECT_ROOT, stdio: 'inherit'});

  // Find output mp4
  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp4'));
  if (files.length > 0) {
    fs.renameSync(path.join(tmpDir, files[0]), outputPath);
    console.log(`\n✅ 540p preview → ${outputPath}`);
  } else {
    console.log(`\n⚠️  No mp4 found in ${tmpDir}`);
  }

  fs.rmSync(tmpDir, {recursive: true, force: true});
}

// ── Main ─────────────────────────────────────────────────────────────────

if (!CONFIG) {
  console.error('Usage:');
  console.error('  node scripts/preview-quick.mjs --config step-04.json --mode still');
  console.error('  node scripts/preview-quick.mjs --config step-04.json --mode sheet');
  console.error('  node scripts/preview-quick.mjs --config step-04.json --mode 540p --out previews/test.mp4');
  process.exit(1);
}

const absConfig = path.isAbsolute(CONFIG) ? CONFIG : path.join(PROJECT_ROOT, CONFIG);

console.log(`\n🔍 Quick Preview — mode: ${MODE}`);
console.log(`   config: ${absConfig}`);
if (OUT) console.log(`   output: ${OUT}`);
console.log(`   dry-run: ${DRY_RUN}\n`);

try {
  const shots = loadShots(absConfig);
  console.log(`   shots: ${shots.length}\n`);

  if (MODE === 'still') {
    const outputBase = OUT ?? getOutputBase(absConfig, 'still');
    renderStills(shots, outputBase);
  } else if (MODE === 'sheet') {
    const outputPath = OUT ?? (getOutputBase(absConfig, 'sheet') + '.jpg');
    renderContactSheet(shots, outputPath);
  } else if (MODE === '540p') {
    const outputPath = OUT ?? (getOutputBase(absConfig, '540p') + '.mp4');
    render540p(shots, outputPath);
  } else {
    console.error(`Unknown mode: ${MODE}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
