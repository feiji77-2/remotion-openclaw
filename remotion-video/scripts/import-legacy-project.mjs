#!/usr/bin/env node

import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const inputArg = process.argv[2];
const outIndex = process.argv.indexOf('--out');
const outputArg = outIndex >= 0 ? process.argv[outIndex + 1] : null;
if (!inputArg || !outputArg) {
  console.error('Usage: npm run project:import -- <render-props.json|project-dir> --out <project.json>');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const sourcePath = (await fs.stat(inputPath)).isDirectory() ? path.join(inputPath, 'render-props.json') : inputPath;
const outputPath = path.resolve(process.cwd(), outputArg);
const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const report = {source: sourcePath, mappedFamilies: [], missingAssets: [], unsupported: []};

const familyMap = {
  hero: 'spoken-title', 'minimal-hero': 'spoken-title', cta: 'spoken-takeaway', 'quote-highlight': 'spoken-title',
  'glossary-term': 'spoken-title', focus: 'spoken-title', 'feature-rail': 'spoken-title', 'evidence-wall': 'spoken-title',
  'architecture-map': 'spoken-title', metrics: 'spoken-metric', 'number-strip': 'spoken-metric',
  'data-stream': 'spoken-metric', 'benchmark-chart': 'spoken-ranking', 'step-flow': 'spoken-process',
  'pipeline-flow': 'spoken-process', timeline: 'spoken-process', 'compare-board': 'spoken-compare',
  'minimal-compare-board': 'spoken-compare', 'tag-matrix': 'spoken-tags', 'minimal-tag-matrix': 'spoken-tags',
  code: 'spoken-code', terminal: 'spoken-code',
};
const spokenFamilies = new Set([
  'spoken-title', 'spoken-metric', 'spoken-process', 'spoken-ranking',
  'spoken-compare', 'spoken-tags', 'spoken-code', 'spoken-takeaway',
]);

const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value : [];
const itemPair = (item, index) => {
  const value = record(item);
  return {
    label: text(value.label ?? value.title ?? value.source, `Item ${index + 1}`),
    value: text(value.value ?? value.count ?? value.primaryValue ?? value.caption ?? value.quote, String(index + 1)),
  };
};

const mapPayload = (family, scene, title) => {
  const data = record(scene.data ?? scene.payload);
  const heading = text(data.heading ?? data.title ?? data.term ?? data.centerTitle, title);
  if (family === 'spoken-title' || family === 'spoken-takeaway') {
    return {title: heading, subtitle: text(data.subtitle ?? data.summary ?? data.definition ?? scene.subtitle), kicker: text(data.kicker)};
  }
  if (family === 'spoken-process') {
    const sourceItems = list(data.steps ?? data.stages ?? data.items);
    return {steps: (sourceItems.length ? sourceItems : [{label: heading}]).slice(0, 5).map((item, index) => {
      const value = record(item);
      return {label: text(value.label ?? value.title, `Step ${index + 1}`), detail: text(value.detail ?? value.caption)};
    })};
  }
  if (family === 'spoken-compare') {
    const rows = list(data.rows);
    const items = rows.length
      ? [{label: text(data.leftTitle, 'Before'), value: text(record(rows[0]).left, 'A')}, {label: text(data.rightTitle, 'After'), value: text(record(rows[0]).right, 'B')}]
      : list(data.items).map(itemPair);
    return {heading, items: (items.length ? items : [{label: 'Before', value: 'A'}, {label: 'After', value: 'B'}]).slice(0, 2)};
  }
  const rawItems = list(data.items ?? data.lines ?? data.outputs ?? data.cards ?? data.nodes);
  return {heading, items: (rawItems.length ? rawItems.map(itemPair) : [{label: 'Value', value: text(data.count, '1')}]).slice(0, 8)};
};

const legacyScenes = source.schemaVersion === 2
  ? list(source.timelinePlan?.visualModules).map((module, index, modules) => ({
      id: module.id,
      family: module.family,
      durationInFrames: (modules[index + 1]?.startFrame ?? source.timelinePlan.totalFrames) - module.startFrame,
      data: module.payload,
      subtitle: '',
      mediaSrc: null,
      assetRefs: module.assetRefs,
      transition: module.transitionOut,
    }))
  : list(source.config?.scenes);

if (legacyScenes.length === 0) throw new Error('No legacy scenes found');

const assets = {};
if (source.schemaVersion === 2) {
  for (const [assetId, asset] of Object.entries(record(source.assets?.assets))) {
    if (asset.available === false) continue;
    assets[assetId] = {kind: asset.kind, src: asset.src, required: Boolean(asset.critical)};
  }
}

const scenes = legacyScenes.map((scene, index) => {
  const oldFamily = text(scene.family);
  const family = spokenFamilies.has(oldFamily) ? oldFamily : familyMap[oldFamily];
  if (!family) throw new Error(`[LEGACY_FAMILY_UNSUPPORTED] scenes[${index}].family: ${oldFamily}`);
  if (oldFamily !== family) report.mappedFamilies.push({sceneId: scene.id, from: oldFamily, to: family});
  const assetIds = list(scene.assetRefs).map((ref) => ref.assetId).filter(Boolean);
  if (scene.mediaSrc) {
    const assetId = `scene-${index + 1}-media`;
    assets[assetId] = {kind: 'image', src: String(scene.mediaSrc).replace(/^\/+/, ''), required: false};
    assetIds.push(assetId);
  }
  const transition = scene.transition === false ? false : {
    type: /slide|wipe/i.test(text(scene.transition?.type ?? scene.transition?.preset)) ? 'slide' : 'fade',
    durationInFrames: Math.max(1, Math.round(Number(scene.transition?.durationInFrames) || 12)),
  };
  return {
    id: text(scene.id, `scene-${index + 1}`),
    family,
    durationInFrames: Math.max(1, Math.round(Number(scene.durationInFrames) || 90)),
    payload: mapPayload(family, scene, text(source.title ?? source.config?.title, 'Imported Project')),
    assetIds,
    transition: index === legacyScenes.length - 1 ? false : transition,
  };
});

if (source.voiceFile) {
  assets['voice-main'] = {kind: 'audio', src: String(source.voiceFile).replace(/^\/+/, ''), required: false};
}
if (Array.isArray(source.audioSegments) && source.audioSegments.length > 0) {
  report.unsupported.push('audioSegments were not imported; provide a single voiceAssetId or regenerate voice audio');
}

const captions = list(source.captions ?? source.subtitleData).flatMap((caption) => {
  const captionText = text(caption.text);
  if (!captionText) return [];
  const fps = Number(source.renderFps ?? source.timelinePlan?.fps) || 30;
  return [{
    text: captionText,
    startMs: Number(caption.startMs ?? Math.round((caption.startFrame ?? 0) / fps * 1000)),
    endMs: Number(caption.endMs ?? Math.round((caption.endFrame ?? 1) / fps * 1000)),
    timestampMs: caption.timestampMs ?? null,
    confidence: caption.confidence ?? null,
  }];
});

for (const [assetId, asset] of Object.entries(assets)) {
  if (/^https:\/\//i.test(asset.src)) continue;
  const localPath = path.resolve(PROJECT_ROOT, 'public', asset.src);
  if (!existsSync(localPath)) report.missingAssets.push({assetId, src: asset.src});
}

const project = {
  schemaVersion: 1,
  projectId: text(source.projectId, path.basename(path.dirname(sourcePath))).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 96),
  title: text(source.title ?? source.config?.title, 'Imported Project'),
  render: {fps: 30, width: 1920, height: 1080, qualityMode: 'fast'},
  scenes,
  captions,
  audio: source.voiceFile ? {voiceAssetId: 'voice-main'} : {},
  assets,
};

await fs.mkdir(path.dirname(outputPath), {recursive: true});
await fs.writeFile(outputPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
const reportPath = `${outputPath}.import-report.json`;
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ok: true, project: outputPath, report: reportPath, ...report}, null, 2));
