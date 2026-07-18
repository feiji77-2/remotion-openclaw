#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run production:build-project -- <production-dir> [--out project.json]');
  process.exit(1);
}

const args = process.argv.slice(3);
const valueFor = (flag, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const productionDir = path.resolve(process.cwd(), input);
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(productionDir, file), 'utf8'));
const brief = await readJson('brief.json');
const script = await readJson('script-pack.json');
const assetPack = await readJson('asset-pack.json');

const projectId = String(brief.productionId ?? path.basename(productionDir))
  .replace(/[^A-Za-z0-9._-]/g, '-')
  .slice(0, 96);
const fps = 30;
const maxFrames = Number(brief.format?.maxDurationSeconds ?? 180) * fps;
const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
};
const compactLength = (value) => clean(value).replace(/\s+/g, '').length;
const sceneDuration = (text, fallbackFrames = 120) => {
  const estimatedSeconds = Math.max(2.6, compactLength(text) / 5.2);
  return Math.max(75, Math.min(600, Math.round(estimatedSeconds * fps) || fallbackFrames));
};

const selectedViewpoint = clean(
  script.selectedViewpoint,
  brief.viewpointCandidates?.find((item) => item.id === brief.selectedViewpointId)?.claim
    ?? brief.viewpointCandidates?.[0]?.claim
    ?? '这个技术真正改变的是工作流。',
);
const spokenScript = clean(script.spokenScript, [
  script.hook,
  script.pain,
  script.solution,
  ...(Array.isArray(script.steps) ? script.steps.map((step) => `${step.label}，${step.detail}`) : []),
  ...(Array.isArray(script.cautions) ? script.cautions.map((item) => `${item.label}，${item.value}`) : []),
  script.takeaway,
].filter(Boolean).join(''));

if (compactLength(spokenScript) > 1000) {
  console.warn(`[warn] spokenScript exceeds 1000 chars (${compactLength(spokenScript)}); captions may be very long`);
}

const assets = {};
for (const asset of Array.isArray(assetPack.assets) ? assetPack.assets : []) {
  if (!asset.id || !asset.kind || !asset.src) continue;
  assets[asset.id] = {
    kind: asset.kind,
    src: asset.src,
    required: Boolean(asset.required),
  };
}

const sceneAssetIds = (sceneId) => Array.isArray(assetPack.sceneAssetPlan?.[sceneId])
  ? assetPack.sceneAssetPlan[sceneId].filter((assetId) => assets[assetId])
  : [];
const itemsFromCautions = () => {
  const cautions = Array.isArray(script.cautions) ? script.cautions : [];
  if (cautions.length > 4) {
    console.warn(`[warn] cautions has ${cautions.length} items; only the first 4 will be used`);
  }
  return (cautions.length ? cautions : [{label: '注意事项', value: '先确认素材和来源，再进入渲染。'}])
    .slice(0, 4)
    .map((item) => ({label: clean(item.label, '注意事项'), value: clean(item.value, '待确认')}));
};

// ── Flexible scene template from brief.structure ──────────────────────

const STRUCTURE_RULES = [
  {keywords: ['痛点', '问题'], family: 'spoken-compare', id: 'pain-solution'},
  {keywords: ['步', '步骤'], family: 'spoken-process', id: 'steps'},
  {keywords: ['结论', '收束', '总结'], family: 'spoken-takeaway', id: 'takeaway'},
  {keywords: ['注意'], family: 'spoken-ranking', id: 'cautions'},
  {keywords: ['对比'], family: 'spoken-compare', id: 'pain-solution'},
  {keywords: ['标签', '关键词'], family: 'spoken-tags', id: 'workflow-map'},
  {keywords: ['代码', '路径'], family: 'spoken-code', id: 'code-path'},
];

/** Default middle scenes (everything between opening and takeaway) matching the original hardcoded order. */
const DEFAULT_STRUCTURE_MIDDLE = [
  {family: 'spoken-compare', id: 'pain-solution'},
  {family: 'spoken-process', id: 'steps'},
  {family: 'spoken-tags', id: 'workflow-map'},
  {family: 'spoken-code', id: 'code-path'},
  {family: 'spoken-ranking', id: 'cautions'},
];

/**
 * Parse a brief.structure string into an ordered scene template list.
 * Returns null when structure is absent, so the caller falls back to the default template.
 */
function parseStructure(structureStr) {
  if (!structureStr || !structureStr.trim()) return null;
  const parts = structureStr.split('->').map((s) => s.trim()).filter(Boolean);
  const template = [];
  const seenFamilies = new Set();
  for (const part of parts) {
    for (const rule of STRUCTURE_RULES) {
      if (rule.keywords.some((kw) => part.includes(kw))) {
        if (!seenFamilies.has(rule.family)) {
          template.push({family: rule.family, id: rule.id});
          seenFamilies.add(rule.family);
        }
        break;
      }
    }
    // Parts that don't match any keyword are silently skipped.
  }
  return template;
}

/**
 * Build a full scene template list from brief.structure.
 * Always prepends `opening` and appends `spoken-takeaway`.
 * When structure is absent/empty, uses the 7-scene default.
 */
function buildSceneTemplate(structureStr) {
  const template = [{family: 'spoken-title', id: 'opening'}];
  const parsed = parseStructure(structureStr);
  const middle = parsed ?? DEFAULT_STRUCTURE_MIDDLE;
  for (const scene of middle) {
    if (scene.family !== 'spoken-takeaway') {
      template.push(scene);
    }
  }
  template.push({family: 'spoken-takeaway', id: 'takeaway'});
  return template;
}

// ── Scene builders (one per family) ───────────────────────────────────

const sceneBuilders = {
  'spoken-title': () => ({
    id: 'opening',
    family: 'spoken-title',
    text: `${script.title}${script.hook}${selectedViewpoint}`,
    payload: {
      title: clean(script.title, clean(brief.title, '技术教程')),
      subtitle: clean(script.hook, selectedViewpoint),
      kicker: 'PERSONAL IP',
      accent: 'cyan',
    },
    assetIds: sceneAssetIds('opening'),
  }),
  'spoken-compare': () => ({
    id: 'pain-solution',
    family: 'spoken-compare',
    text: `${script.pain}${script.solution}`,
    payload: {
      heading: '痛点到方案',
      items: [
        {label: '旧方式', value: clean(script.pain, '信息分散，流程不可复用。').slice(0, 28)},
        {label: '新方案', value: clean(script.solution, '用结构化流程稳定交付。').slice(0, 28)},
      ],
      accent: 'cyan',
    },
    assetIds: sceneAssetIds('pain-solution'),
  }),
  'spoken-process': () => ({
    id: 'steps',
    family: 'spoken-process',
    text: Array.isArray(script.steps) ? script.steps.map((step) => `${step.label}${step.detail}`).join('') : '',
    payload: {
      steps: (Array.isArray(script.steps) && script.steps.length > 0 ? script.steps : [{label: '待补充步骤', detail: '请在脚本中补充具体步骤'}])
        .slice(0, 5)
        .map((step, index) => ({
          label: clean(step.label, `第 ${index + 1} 步`),
          detail: clean(step.detail, '待补充'),
        })),
      accent: 'green',
    },
    assetIds: sceneAssetIds('steps'),
  }),
  'spoken-tags': () => ({
    id: 'workflow-map',
    family: 'spoken-tags',
    text: `${brief.contentType}${brief.structure}${selectedViewpoint}`,
    payload: {
      heading: '这条工作流怎么落地',
      items: [
        {label: '输入', value: '链接/标题'},
        {label: '研究', value: '官方优先'},
        {label: '文案', value: '观点驱动'},
        {label: '素材', value: '截图+图表'},
        {label: '渲染', value: 'Project JSON'},
      ],
      accent: 'purple',
    },
    assetIds: sceneAssetIds('workflow-map'),
  }),
  'spoken-code': () => ({
    id: 'code-path',
    family: 'spoken-code',
    text: Array.isArray(script.codeSnippets) ? script.codeSnippets.map((item) => `${item.label}${item.value}`).join('') : '',
    payload: {
      heading: '可复用执行路径',
      items: (Array.isArray(script.codeSnippets) && script.codeSnippets.length > 0
        ? script.codeSnippets
        : [{label: 'pipeline', value: 'brief -> script -> assets -> project.json'}]
      ).slice(0, 5).map((item) => ({label: clean(item.label, 'line'), value: clean(item.value, '待补充')})),
      accent: 'cyan',
    },
    assetIds: sceneAssetIds('code-path'),
  }),
  'spoken-ranking': () => ({
    id: 'cautions',
    family: 'spoken-ranking',
    text: itemsFromCautions().map((item) => `${item.label}${item.value}`).join(''),
    payload: {
      heading: '上线前必须注意',
      items: itemsFromCautions(),
      accent: 'amber',
    },
    assetIds: sceneAssetIds('cautions'),
  }),
  'spoken-takeaway': () => ({
    id: 'takeaway',
    family: 'spoken-takeaway',
    text: script.takeaway,
    payload: {
      title: clean(script.takeaway, selectedViewpoint),
      subtitle: '听懂、能复述、能上手，是这条视频的交付标准。',
      kicker: 'TAKEAWAY',
      accent: 'green',
    },
    assetIds: sceneAssetIds('takeaway'),
  }),
};

// ── Build scenes from template ────────────────────────────────────────

const sceneTemplate = buildSceneTemplate(brief.structure);
const scenes = sceneTemplate.map(({family}) => sceneBuilders[family]());

let durations = scenes.map((scene) => sceneDuration(scene.text));
const total = durations.reduce((sum, duration) => sum + duration, 0);
if (total > maxFrames) {
  const ratio = maxFrames / total;
  durations = durations.map((duration) => Math.max(75, Math.floor(duration * ratio)));
}

const captionTexts = spokenScript
  .split(/(?<=[。！？!?])\s*/u)
  .map((part) => part.trim())
  .filter(Boolean);
const captionDurationMs = Math.max(900, Math.round(durations.reduce((sum, duration) => sum + duration, 0) / fps * 1000 / Math.max(1, captionTexts.length)));
const captions = captionTexts.map((text, index) => ({
  text,
  startMs: index * captionDurationMs,
  endMs: (index + 1) * captionDurationMs,
  timestampMs: index * captionDurationMs,
  confidence: 1,
}));

const project = {
  schemaVersion: 1,
  projectId,
  title: clean(script.title, clean(brief.title, projectId)),
  render: {fps: 30, width: 1920, height: 1080, qualityMode: 'fast'},
  scenes: scenes.map((scene, index) => ({
    id: scene.id,
    family: scene.family,
    durationInFrames: durations[index],
    payload: scene.payload,
    assetIds: scene.assetIds,
    transition: index === scenes.length - 1 ? false : {
      type: index % 2 === 0 ? 'slide' : 'fade',
      durationInFrames: 8,
    },
  })),
  captions,
  audio: {},
  assets,
};

const output = path.resolve(productionDir, valueFor('--out', 'project.json'));
await fs.writeFile(output, `${JSON.stringify(project, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  project: output,
  projectId,
  scenes: project.scenes.length,
  durationInFrames: project.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0),
  captions: project.captions.length,
  next: [
    `npm run project:check -- ${path.relative(PROJECT_ROOT, output)}`,
    `npm run project:still -- ${path.relative(PROJECT_ROOT, output)} --frame 30`,
  ],
}, null, 2));
