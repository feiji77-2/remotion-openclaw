#!/usr/bin/env node
/**
 * generate-scene-image.mjs
 * Renders a scene diagram as a PNG image using Playwright.
 *
 * Usage:
 *   node scripts/generate-scene-image.mjs --config <file> --out <output.png>
 *   node scripts/generate-scene-image.mjs --config <file> --out <output.png> --width 1200
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

const readFlag = (name) => {
  const idx = args.indexOf(name);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
};
const hasFlag = (name) => args.includes(name);

const printUsage = () => {
  console.log(`Usage: node scripts/generate-scene-image.mjs --config <file> --out <output.png> [--width 1200]
Example: node scripts/generate-scene-image.mjs --config projects/deepseek-v4/steps/step-04.json --out out/scene-diagram.png`);
};

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage();
  process.exit(0);
}

const configArg = readFlag('--config');
const outArg = readFlag('--out');
const widthArg = parseInt(readFlag('--width') || '1200', 10);
const outputPath = path.resolve(process.cwd(), outArg || 'out/scene-diagram.png');

if (!configArg) {
  printUsage();
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), configArg);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

// ── Load and parse scenes ─────────────────────────────────────────

function extractScenes(input) {
  if (input.result?.payload?.shots) return normalizeShots(input.result.payload.shots);
  if (input.payload?.shots) return normalizeShots(input.payload.shots);
  if (input.payload?.segments_meta) return input.payload.segments_meta.map(segToScene);
  if (input.segments_meta) return input.segments_meta.map(segToScene);
  if (input.config?.scenes) return input.config.scenes.map(s => ({id: s.id, family: s.family, frames: s.durationInFrames, title: s.data?.keyword || s.data?.heading || s.subtitle || s.id, narration: s.subtitle || '', dataPoints: extractDataPoints(s.data), items: s.data?.items || s.data?.rows || []}));
  if (Array.isArray(input.scenes)) return input.scenes.map(s => ({id: s.id, family: s.family, frames: s.durationInFrames, title: s.data?.keyword || s.data?.heading || s.subtitle || s.id, narration: s.subtitle || '', dataPoints: extractDataPoints(s.data), items: s.data?.items || s.data?.rows || []}));
  return [];
}

function extractDataPoints(data) {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items.map(i => i.label || i).filter(Boolean).slice(0, 3);
  if (Array.isArray(data.points)) return data.points.slice(0, 3);
  if (Array.isArray(data.dataPoints)) return data.dataPoints.slice(0, 3);
  return [];
}

function segToScene(seg) {
  return {id: seg.id, family: seg.family, frames: seg.frames, title: seg.title || seg.id, narration: seg.narration || '', dataPoints: seg.dataPoints || [], items: seg.items || []};
}

function normalizeShots(shots) {
  return shots.map((s, i) => ({id: s.id || `shot-${i + 1}`, family: s.family || s.sceneFamily || 'feature-rail', frames: s.frames || Math.round((s.durationSeconds || 5) * 30), title: s.displayTitle || s.title || (s.narration || '').slice(0, 30) || `Shot ${i + 1}`, narration: s.displaySummary || s.narration || '', dataPoints: s.displayPoints || s.dataPoints || [], items: s.items || s.rows || []}));
}

const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
const scenes = extractScenes(raw);

if (scenes.length === 0) {
  console.error('No scenes found.');
  process.exit(1);
}

// ── Colors & Icons ─────────────────────────────────────────────────

const COLORS = {
  bg: '#0d0d14',
  cardBg: '#13131f',
  cardBorder: '#2a2a3d',
  accent: '#8b5cf6',
  accentDim: '#6d42d4',
  cyan: '#22d3ee',
  green: '#34d399',
  yellow: '#facc15',
  orange: '#fb923c',
  red: '#f87171',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  textMuted: '#64748b',
};

// ─── Family metadata imported from registry.ts (canonical source) ──
const familyMetadata = await import(
  /* webpackIgnore: true */
  '../src/data/registry.ts'
).catch(() => import(
  /* webpackIgnore: true */
  '../src/data/registry.js'
)).catch(() => {
  console.warn('[warn] Could not import registry.ts; using fallback colors');
  return null;
});

function getFamily(family) {
  const entry = familyMetadata?.REGISTRY?.[family];
  if (entry) {
    const accentColor = entry.defaultAccent === 'cyan' ? '#22d3ee'
      : entry.defaultAccent === 'orange' ? '#fb923c'
      : entry.defaultAccent === 'purple' ? '#a78bfa'
      : '#94a3b8';
    return {icon: '📽️', color: accentColor, label: entry.label ?? family};
  }

  // Fallback for unknown families
  return {icon: '📽️', color: '#94a3b8', label: family};
}

// ── HTML generation ────────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

const totalFrames = scenes.reduce((s, v) => s + (v.frames || 0), 0);
const totalSec = (totalFrames / 30).toFixed(1);
const scale = widthArg / 1200;
const cardW = Math.round(380 * scale);
const gap = Math.round(16 * scale);
const padding = Math.round(24 * scale);
const rows = [];

for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i];
  const cfg = getFamily(s.family);
  const frames = s.frames || 150;
  const sec = (frames / 30).toFixed(1);
  const title = esc((s.title || s.id || `Shot ${i + 1}`).slice(0, 40));
  const narration = esc((s.narration || '').slice(0, 80));
  const points = (s.dataPoints || []).slice(0, 3);
  const ratio = frames / totalFrames;
  const barW = Math.round(ratio * (cardW - 80));

  rows.push(`
  <div class="scene-row">
    <div class="shot-badge">${i + 1}</div>
    <div class="card" style="border-left-color:${cfg.color}40">
      <div class="card-header">
        <span class="family-icon">${cfg.icon}</span>
        <span class="family-label">${esc(cfg.label)}</span>
        <span class="duration">${frames}f · ${sec}s</span>
      </div>
      <div class="card-title">${title}</div>
      ${narration ? `<div class="card-narration">${narration}</div>` : ''}
      ${points.length ? `<div class="card-points">${points.map(p => `<span class="point">${esc(p)}</span>`).join('')}</div>` : ''}
      <div class="timeline-bar">
        <div class="bar-fill" style="width:${barW}px;background:${cfg.color}"></div>
        <span class="bar-label">${((scenes.slice(0, i).reduce((a, v) => a + (v.frames || 0), 0)) / 30).toFixed(1)}s</span>
      </div>
    </div>
  </div>`);
}

const familyCount = {};
for (const s of scenes) familyCount[s.family] = (familyCount[s.family] || 0) + 1;
const distBars = Object.entries(familyCount)
  .sort((a, b) => b[1] - a[1])
  .map(([fam, count]) => {
    const cfg = getFamily(fam);
    return `<div class="dist-item"><span class="dist-icon">${cfg.icon}</span><span class="dist-label">${esc(cfg.label)}</span><span class="dist-bar"><span class="dist-fill" style="width:${count * 20}px;background:${cfg.color}"></span></span><span class="dist-count">${count}</span></div>`;
  }).join('');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: ${COLORS.bg};
  color: ${COLORS.text};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: ${padding}px;
  width: ${widthArg}px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${padding}px;
  padding-bottom: ${gap}px;
  border-bottom: 1px solid ${COLORS.cardBorder};
}
.header-title { font-size: ${Math.round(20 * scale)}px; font-weight: 800; letter-spacing: -0.5px; }
.header-meta { font-size: ${Math.round(13 * scale)}px; color: ${COLORS.textDim}; }
.header-meta span { margin-left: 16px; }

.scene-list { display: flex; flex-direction: column; gap: ${gap}px; }

.scene-row { display: flex; align-items: flex-start; gap: ${gap}px; }
.shot-badge {
  width: ${Math.round(36 * scale)}px; height: ${Math.round(36 * scale)}px;
  border-radius: 50%;
  background: ${COLORS.accentDim};
  color: #fff;
  font-size: ${Math.round(14 * scale)}px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 4px;
}
.card {
  flex: 1;
  background: ${COLORS.cardBg};
  border: 1px solid ${COLORS.cardBorder};
  border-left: 3px solid;
  border-radius: ${Math.round(8 * scale)}px;
  padding: ${Math.round(14 * scale)}px ${Math.round(18 * scale)}px;
}
.card-header { display: flex; align-items: center; gap: ${Math.round(8 * scale)}px; margin-bottom: ${Math.round(8 * scale)}px; }
.family-icon { font-size: ${Math.round(16 * scale)}px; }
.family-label { font-size: ${Math.round(12 * scale)}px; font-weight: 600; color: ${COLORS.textDim}; flex: 1; }
.duration { font-size: ${Math.round(11 * scale)}px; color: ${COLORS.textMuted}; }
.card-title { font-size: ${Math.round(16 * scale)}px; font-weight: 700; margin-bottom: ${Math.round(6 * scale)}px; line-height: 1.3; }
.card-narration { font-size: ${Math.round(12 * scale)}px; color: ${COLORS.textDim}; margin-bottom: ${Math.round(8 * scale)}px; line-height: 1.5; }
.card-points { display: flex; flex-wrap: wrap; gap: ${Math.round(6 * scale)}px; }
.point {
  background: ${COLORS.cardBorder};
  border-radius: ${Math.round(4 * scale)}px;
  padding: ${Math.round(3 * scale)}px ${Math.round(8 * scale)}px;
  font-size: ${Math.round(11 * scale)}px;
  color: ${COLORS.textDim};
}
.timeline-bar {
  display: flex; align-items: center; gap: ${Math.round(8 * scale)}px;
  margin-top: ${Math.round(10 * scale)}px;
  height: ${Math.round(4 * scale)}px;
  background: ${COLORS.cardBorder};
  border-radius: ${Math.round(2 * scale)}px;
  position: relative; overflow: hidden;
}
.bar-fill {
  height: 100%; border-radius: ${Math.round(2 * scale)}px;
  min-width: ${Math.round(4 * scale)}px;
}
.bar-label { position: absolute; right: 0; top: ${Math.round(-16 * scale)}px; font-size: ${Math.round(10 * scale)}px; color: ${COLORS.textMuted}; }

.dist-section {
  margin-top: ${padding}px;
  padding-top: ${gap}px;
  border-top: 1px solid ${COLORS.cardBorder};
}
.dist-title { font-size: ${Math.round(12 * scale)}px; color: ${COLORS.textMuted}; margin-bottom: ${gap}px; text-transform: uppercase; letter-spacing: 1px; }
.dist-item { display: flex; align-items: center; gap: ${gap}px; margin-bottom: ${Math.round(8 * scale)}px; }
.dist-icon { font-size: ${Math.round(14 * scale)}px; width: 20px; text-align: center; }
.dist-label { font-size: ${Math.round(12 * scale)}px; width: ${Math.round(120 * scale)}px; color: ${COLORS.textDim}; }
.dist-bar { flex: 1; height: ${Math.round(6 * scale)}px; background: ${COLORS.cardBorder}; border-radius: 3px; }
.dist-fill { height: 100%; border-radius: 3px; }
.dist-count { font-size: ${Math.round(12 * scale)}px; width: 20px; text-align: right; color: ${COLORS.textDim}; }
</style>
</head>
<body>
<div class="header">
  <div class="header-title">📽️ OpenClaw Scene Diagram</div>
  <div class="header-meta">
    <span>${scenes.length} shots</span>
    <span>${totalFrames}f</span>
    <span>${totalSec}s @ 30fps</span>
  </div>
</div>
<div class="scene-list">
${rows.join('')}
</div>
<div class="dist-section">
  <div class="dist-title">Family Distribution</div>
  ${distBars}
</div>
</body>
</html>`;

// ── Render via Playwright ─────────────────────────────────────────

const pw = await import('/Users/macos/.npm/_npx/b234c773f454f454/node_modules/playwright/index.js');
const {chromium} = pw.default;

const browser = await chromium.launch({
  executablePath: '/Users/macos/Library/Caches/ms-playwright/chromium-1208/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage({viewport: {width: widthArg, height: 100}});
await page.setContent(html, {waitUntil: 'networkidle'});

// Wait for fonts/layout
await page.waitForTimeout(500);

const screenshot = await page.screenshot({type: 'png', fullPage: true});
fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, screenshot);

const meta = await page.evaluate(() => ({w: document.body.scrollWidth, h: document.body.scrollHeight}));
await browser.close();

console.log(`✅ Saved: ${outputPath} (${meta.w}x${meta.h}px)`);
