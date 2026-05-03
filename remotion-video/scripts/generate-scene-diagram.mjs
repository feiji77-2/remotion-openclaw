#!/usr/bin/env node
/**
 * generate-scene-diagram.mjs
 * Generates a text-based scene structure diagram from Step-4 or Ultimate config files.
 *
 * Usage:
 *   node scripts/generate-scene-diagram.mjs --config <file>
 *   node scripts/generate-scene-diagram.mjs --config <file> --markdown
 *
 * Supported formats:
 *   - step-04.json (segments_meta[])
 *   - step-04.json (payload.shots[])
 *   - workflow_*.json (result.payload.shots[])
 *   - ultimate-config.json (direct scenes[])
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
  console.log(`Usage: node scripts/generate-scene-diagram.mjs --config <file> [--markdown]
Supported formats:
  - step-04.json (segments_meta[])
  - step-04.json (payload.shots[])
  - workflow_*.json (result.payload.shots[])
  - ultimate-config.json (direct scenes[])

Example: node scripts/generate-scene-diagram.mjs --config runtime/jobs/workflow/workflow_abc.json --markdown`);
};

if (hasFlag('--help') || hasFlag('-h')) {
  printUsage();
  process.exit(0);
}

const configArg = readFlag('--config');
if (!configArg) {
  printUsage();
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), configArg);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const asMarkdown = hasFlag('--markdown');
const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

// ── Normalize to scenes[] ──────────────────────────────────────────

/** Normalize any format → array of {id, family, frames, title, narration, dataPoints, items, ...} */
function extractScenes(input) {
  // workflow_*.json wrapper
  if (input.result?.payload?.shots) {
    return normalizeShots(input.result.payload.shots);
  }
  // step-04 with payload.shots
  if (input.payload?.shots) {
    return normalizeShots(input.payload.shots);
  }
  // step-04 with segments_meta
  if (input.payload?.segments_meta) {
    return input.payload.segments_meta.map(segToScene);
  }
  if (input.segments_meta) {
    return input.segments_meta.map(segToScene);
  }
  // direct Ultimate config (config.scenes)
  if (input.config?.scenes) {
    return input.config.scenes.map((s) => ({
      id: s.id,
      family: s.family,
      frames: s.durationInFrames,
      title: s.data?.keyword || s.data?.heading || s.data?.term || s.data?.title || s.subtitle || s.id,
      narration: s.subtitle || '',
      dataPoints: extractDataPoints(s.data),
      items: s.data?.items || s.data?.rows || s.data?.cards || [],
      features: s.data?.features || s.data?.steps || [],
    }));
  }
  // direct scenes[]
  if (Array.isArray(input.scenes)) {
    return input.scenes.map((s) => ({
      id: s.id,
      family: s.family,
      frames: s.durationInFrames,
      title: s.data?.keyword || s.data?.heading || s.data?.term || s.subtitle || s.id,
      narration: s.subtitle || '',
      dataPoints: extractDataPoints(s.data),
      items: s.data?.items || s.data?.rows || s.data?.cards || [],
      features: s.data?.features || s.data?.steps || [],
    }));
  }
  return [];
}

function extractDataPoints(data) {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items.map(i => i.label || i).filter(Boolean);
  if (Array.isArray(data.points)) return data.points;
  if (Array.isArray(data.dataPoints)) return data.dataPoints;
  return [];
}

function segToScene(seg) {
  return {
    id: seg.id,
    family: seg.family,
    frames: seg.frames,
    title: seg.title || seg.id,
    narration: seg.narration || '',
    dataPoints: seg.dataPoints || [],
    items: seg.items || [],
    features: seg.features || [],
  };
}

function normalizeShots(shots) {
  return shots.map((s, i) => ({
    id: s.id || `shot-${i + 1}`,
    family: s.family || s.sceneFamily || 'feature-rail',
    frames: s.frames || Math.round((s.durationSeconds || 5) * 30),
    title: s.displayTitle || s.title || s.narration?.slice(0, 30) || `Shot ${i + 1}`,
    narration: s.displaySummary || s.narration || '',
    dataPoints: s.displayPoints || s.dataPoints || [],
    items: s.items || s.rows || s.cards || [],
    features: s.features || s.steps || [],
  }));
}

// ── Diagram generation ───────────────────────────────────────────────

const FAMILY_ICONS = {
  hero: '🎬',
  'feature-rail': '🔑',
  focus: '🎯',
  'number-strip': '📊',
  'step-flow': '➡️',
  timeline: '📅',
  'compare-board': '⚖️',
  terminal: '💻',
  'evidence-wall': '🧱',
  'architecture-map': '🏗️',
  'tag-matrix': '🏷️',
  code: '📝',
  metrics: '📈',
  'data-stream': '🌊',
  'memory-graph': '🧠',
  'pipeline-flow': '🔗',
  'benchmark-chart': '🏁',
  'quote-highlight': '💬',
  'glossary-term': '📖',
  cta: '📢',
};

const FAMILY_LABELS = {
  hero: 'Hero 开场',
  'feature-rail': 'Feature Rail',
  focus: 'Focus 焦点',
  'number-strip': 'Number Strip',
  'step-flow': 'Step Flow',
  timeline: 'Timeline 时间线',
  'compare-board': 'Compare Board',
  terminal: 'Terminal 终端',
  'evidence-wall': 'Evidence Wall',
  'architecture-map': 'Architecture Map',
  'tag-matrix': 'Tag Matrix',
  code: 'Code 代码',
  metrics: 'Metrics 指标',
  'data-stream': 'Data Stream',
  'memory-graph': 'Memory Graph',
  'pipeline-flow': 'Pipeline Flow',
  'benchmark-chart': 'Benchmark Chart',
  'quote-highlight': 'Quote Highlight',
  'glossary-term': 'Glossary 术语',
  cta: 'CTA 收尾',
};

const ACCENT_COLORS = {
  cyan: '🔵',
  green: '🟢',
  yellow: '🟡',
  orange: '🟠',
  purple: '🟣',
  red: '🔴',
};

function sceneIcon(family) {
  return FAMILY_ICONS[family] || '📽️';
}

function sceneLabel(family) {
  return FAMILY_LABELS[family] || family;
}

function formatFrames(frames) {
  const sec = (frames / 30).toFixed(1);
  return `${frames}f (${sec}s)`;
}

function renderTextDiagram(scenes) {
  const totalFrames = scenes.reduce((sum, s) => sum + (s.frames || 0), 0);
  const totalSec = (totalFrames / 30).toFixed(1);
  const lines = [];

  lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
  lines.push('│                      📽️  OPENCLAW SCENE DIAGRAM                           │');
  lines.push('└─────────────────────────────────────────────────────────────────────────┘');
  lines.push('');
  lines.push(`  Total: ${scenes.length} scenes  ·  ${totalFrames}f  ·  ${totalSec}s @ 30fps`);
  lines.push('');
  lines.push('  ── Structure ───────────────────────────────────────────────────────────');
  lines.push('');

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const prevFamily = i > 0 ? scenes[i - 1].family : null;
    const isTransition = prevFamily && prevFamily !== s.family;

    if (isTransition) {
      lines.push('');
      lines.push(`  ${'· · ·'.padStart(54)} ↕  Transition`);
      lines.push('');
    }

    const icon = sceneIcon(s.family);
    const label = sceneLabel(s.family);
    const frames = formatFrames(s.frames || 150);
    const title = (s.title || s.id || `Shot ${i + 1}`).slice(0, 40);
    const narration = (s.narration || '').slice(0, 50);
    const points = (s.dataPoints || []).slice(0, 3);
    const items = (s.items || []).slice(0, 4);

    lines.push(`  ${icon} Shot ${String(i + 1).padStart(2, '0')}  ${label.padEnd(20)} ${frames}`);
    lines.push(`     └─ ${title}`);

    if (narration) {
      lines.push(`        📝 ${narration}`);
    }

    if (items.length > 0) {
      const itemLabels = items.slice(0, 4).map(it => (typeof it === 'string' ? it : it.label || it.title || '')).filter(Boolean);
      if (itemLabels.length > 0) {
        lines.push(`        📋 ${itemLabels.join(' · ')}`);
      }
    }

    if (points.length > 0) {
      lines.push(`        📌 ${points.join(' · ')}`);
    }

    lines.push('');
  }

  lines.push('  ── Shot Timeline ────────────────────────────────────────────────────────');
  lines.push('');
  let cursor = 0;
  const barWidth = 72;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const frames = s.frames || 150;
    const ratio = frames / totalFrames;
    const barLen = Math.max(2, Math.round(ratio * barWidth));
    const bar = '█'.repeat(barLen);
    const icon = sceneIcon(s.family);
    lines.push(`  ${icon} ${String(i + 1).padStart(2, '0')} ${bar}  ${(cursor / 30).toFixed(1)}s`);
    cursor += frames;
  }

  lines.push('');
  lines.push('  ── Family Distribution ─────────────────────────────────────────────────');
  lines.push('');

  const familyCount = {};
  for (const s of scenes) {
    familyCount[s.family] = (familyCount[s.family] || 0) + 1;
  }
  const sorted = Object.entries(familyCount).sort((a, b) => b[1] - a[1]);
  for (const [fam, count] of sorted) {
    const icon = sceneIcon(fam);
    const label = sceneLabel(fam);
    const dots = '●'.repeat(count);
    lines.push(`  ${icon} ${label.padEnd(20)} ${dots} (${count})`);
  }

  lines.push('');
  return lines.join('\n');
}

function renderMarkdownTable(scenes) {
  const totalFrames = scenes.reduce((sum, s) => sum + (s.frames || 0), 0);
  const totalSec = (totalFrames / 30).toFixed(1);
  const lines = [];

  lines.push('# 📽️ OpenClaw Scene Diagram\n');
  lines.push(`> **Total:** ${scenes.length} scenes · ${totalFrames}f · ${totalSec}s @ 30fps\n`);

  lines.push('## Scene Structure\n');
  lines.push('');
  lines.push('| # | Family | Duration | Title | Narration | Key Items |');
  lines.push('|---|--------|----------|-------|-----------|------------|');

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const icon = sceneIcon(s.family);
    const label = sceneLabel(s.family);
    const frames = formatFrames(s.frames || 150);
    const title = (s.title || s.id || `Shot ${i + 1}`).replace(/\|/g, '\\|').slice(0, 35);
    const narration = (s.narration || '').replace(/\|/g, '\\|').slice(0, 40);
    const items = (s.items || []).slice(0, 3).map(it => (typeof it === 'string' ? it : it.label || it.title || '')).filter(Boolean).join(', ').slice(0, 30);
    const points = (s.dataPoints || []).slice(0, 2).join(', ').slice(0, 30);
    const cellItems = items || points;
    lines.push(`| ${i + 1} | ${icon} ${label} | ${frames} | ${title} | ${narration} | ${cellItems} |`);
  }

  lines.push('\n## Timeline\n');
  lines.push('');

  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const icon = sceneIcon(s.family);
    const frames = s.frames || 150;
    const sec = (frames / 30).toFixed(1);
    lines.push(`| ${String(i + 1).padStart(2, '0')} | ${icon} | ${sec}s | ${String(cursor / 30).padStart(5)}s | ${frames}f |`);
    cursor += frames;
  }

  lines.push('\n## Family Distribution\n');
  lines.push('');

  const familyCount = {};
  for (const s of scenes) {
    familyCount[s.family] = (familyCount[s.family] || 0) + 1;
  }
  const sorted = Object.entries(familyCount).sort((a, b) => b[1] - a[1]);
  lines.push('| Family | Count | Visual |');
  lines.push('|--------|-------|--------|');
  for (const [fam, count] of sorted) {
    const icon = sceneIcon(fam);
    const label = sceneLabel(fam);
    lines.push(`| ${icon} ${label} | ${count} | ${'●'.repeat(count)} |`);
  }

  lines.push('\n---\n');
  lines.push(`*Generated from: ${path.basename(resolvedPath)}*\n`);
  return lines.join('\n');
}

// ── Run ──────────────────────────────────────────────────────────────

const scenes = extractScenes(raw);

if (scenes.length === 0) {
  console.error('No scenes found in file. Check format.');
  process.exit(1);
}

if (asMarkdown) {
  console.log(renderMarkdownTable(scenes));
} else {
  console.log(renderTextDiagram(scenes));
}
