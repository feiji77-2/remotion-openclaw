// scripts/lib/video-blueprint-generator.mjs
// Stage A: 统一视频生成链路 — 从 brief + script-pack + asset-pack 生成 product-grade project.json
//
// 产出 6-8 个 scene，视觉多样化（不同 family、布局、accent）
// 兼容 VideoProjectSchema — 产出可通过 project:check 验证

import {accentForPalette, accentForFamily as contractAccentForFamily} from './production-style-contract.mjs';

// ── Constants ──────────────────────────────────────────────────────────

const FPS = 30;
const MIN_CAPTION_CHARS = 20;
const MAX_CAPTION_CHARS = 80;
const MIN_SCENE_FRAMES = 75;
const MAX_SCENE_FRAMES = 600;
const CHARS_PER_SECOND = 5.2; // Chinese speaking rate

// ── Scene families vocabulary ──────────────────────────────────────────

/**
 * Available families for visual diversity.
 * Each family has a distinct visual identity:
 *   hero          — full-screen title card (opening)
 *   focus         — single keyword pulled into visual focus
 *   compare-board — left/right comparison
 *   step-flow     — sequential step list
 *   code          — code panel / terminal
 *   tag-matrix    — tag grid
 *   cta           — call to action (closing)
 *   evidence-wall — evidence / caution items
 *   architecture-map — architecture diagram
 *   timeline      — vertical/horizontal timeline
 */
const SCENE_FAMILIES = {
  opening: {family: 'hero', id: 'opening', accentKey: 'primary'},
  focus: {family: 'focus', id: 'pain-point', accentKey: 'secondary'},
  compare: {family: 'compare-board', id: 'compare', accentKey: 'primary'},
  steps: {family: 'step-flow', id: 'steps', accentKey: 'primary'},
  code: {family: 'code', id: 'code-path', accentKey: 'secondary'},
  tags: {family: 'tag-matrix', id: 'cautions', accentKey: 'secondary'},
  closing: {family: 'cta', id: 'takeaway', accentKey: 'primary'},
  evidence: {family: 'evidence-wall', id: 'evidence', accentKey: 'secondary'},
  arch: {family: 'architecture-map', id: 'arch', accentKey: 'secondary'},
};

/**
 * Default 7-scene blueprint — product-grade visual diversity.
 * Scene 1: hero (opening)     — title + hook
 * Scene 2: focus              — pain point highlight
 * Scene 3: compare-board      — old vs new solution
 * Scene 4: step-flow          — actionable steps
 * Scene 5: code               — code snippets / terminal
 * Scene 6: tag-matrix         — cautions / tags
 * Scene 7: cta                — takeaway / call to action
 */
const DEFAULT_BLUEPRINT = [
  SCENE_FAMILIES.opening,
  SCENE_FAMILIES.focus,
  SCENE_FAMILIES.compare,
  SCENE_FAMILIES.steps,
  SCENE_FAMILIES.code,
  SCENE_FAMILIES.tags,
  SCENE_FAMILIES.closing,
];

/** 8-scene variant — adds evidence-wall after tags */
const EIGHT_SCENE_BLUEPRINT = [
  SCENE_FAMILIES.opening,
  SCENE_FAMILIES.focus,
  SCENE_FAMILIES.compare,
  SCENE_FAMILIES.steps,
  SCENE_FAMILIES.code,
  SCENE_FAMILIES.tags,
  SCENE_FAMILIES.evidence,
  SCENE_FAMILIES.closing,
];

// ── Utilities ──────────────────────────────────────────────────────────

const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
};

const compactLength = (value) => clean(value).replace(/\s+/g, '').length;

/**
 * Estimate speaking frames from text length.
 * Returns at least MIN_SCENE_FRAMES, capped at MAX_SCENE_FRAMES.
 */
const estimateFrames = (text, fallbackFrames = 120) => {
  const length = compactLength(text);
  if (length === 0) return fallbackFrames;
  const seconds = Math.max(2.6, length / CHARS_PER_SECOND);
  return Math.max(MIN_SCENE_FRAMES, Math.min(MAX_SCENE_FRAMES, Math.round(seconds * FPS) || fallbackFrames));
};

// ── Caption handling ───────────────────────────────────────────────────

/**
 * Split text into captions by sentence boundaries.
 * Rules:
 *  - Split on 。！？!?\n
 *  - Merge fragments < MIN_CAPTION_CHARS with next
 *  - Split fragments > MAX_CAPTION_CHARS at ，;；
 */
const splitIntoSentences = (text) => {
  const raw = text
    .split(/(?<=[。！？!?\n])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);

  // Merge short fragments
  const merged = [];
  let buffer = '';
  for (const part of raw) {
    buffer += part;
    if (buffer.replace(/\s+/g, '').length >= MIN_CAPTION_CHARS || merged.length === 0) {
      merged.push(buffer);
      buffer = '';
    }
  }
  if (buffer.trim()) {
    const last = merged[merged.length - 1] || '';
    merged[merged.length - 1] = last + buffer;
  }

  // Split long fragments
  const result = [];
  for (const part of merged) {
    if (part.replace(/\s+/g, '').length <= MAX_CAPTION_CHARS) {
      result.push(part);
    } else {
      // Split on minor punctuation
      const subparts = part
        .split(/(?<=[，,;；])/u)
        .map((s) => s.trim())
        .filter(Boolean);
      let subBuffer = '';
      for (const sub of subparts) {
        subBuffer += sub;
        if (subBuffer.replace(/\s+/g, '').length >= MIN_CAPTION_CHARS) {
          result.push(subBuffer);
          subBuffer = '';
        }
      }
      if (subBuffer.trim()) {
        const lastResult = result[result.length - 1] || '';
        result[result.length - 1] = lastResult + subBuffer;
      }
    }
  }

  return result.filter((s) => s.trim().length > 0);
};

/**
 * Build captions array from sentence list.
 * Each caption gets startMs/endMs/timestampMs/confidence.
 * Duration distributes proportionally by character count.
 */
const buildCaptions = (sentences, totalDurationMs) => {
  if (sentences.length === 0) return [];

  const charCounts = sentences.map((s) => s.replace(/\s+/g, '').length);
  const totalChars = charCounts.reduce((sum, c) => sum + c, 0);
  if (totalChars === 0) return [];

  const captions = [];
  let cursor = 0;

  for (let i = 0; i < sentences.length; i++) {
    const share = charCounts[i] / totalChars;
    const durationMs = Math.max(900, Math.round(share * totalDurationMs));
    captions.push({
      text: sentences[i],
      startMs: cursor,
      endMs: cursor + durationMs,
      timestampMs: cursor,
      confidence: 1,
    });
    cursor += durationMs;
  }

  // Ensure last caption doesn't exceed total
  if (captions.length > 0 && totalDurationMs > 0) {
    captions[captions.length - 1].endMs = totalDurationMs;
  }

  return captions;
};

/**
 * Assign sentences to scene slots based on script section boundaries.
 * Uses rough heuristic: maps script sections (hook/pain/solution/steps/code/cautions/takeaway)
 * to blueprint scene positions.
 */
const assignCaptionsToScenes = (sentences, totalSentenceCount, blueprintLength) => {
  if (blueprintLength === 0) return [];

  const assignments = Array.from({length: blueprintLength}, () => []);
  const perScene = Math.ceil(sentences.length / blueprintLength);

  for (let i = 0; i < sentences.length; i++) {
    const sceneIndex = Math.min(Math.floor(i / perScene), blueprintLength - 1);
    assignments[sceneIndex].push(sentences[i]);
  }

  return assignments;
};

// ── Payload builders ───────────────────────────────────────────────────

/**
 * Build hero payload — full-screen title card for opening.
 */
const buildHeroPayload = (script, brief, accent) => ({
  title: clean(script.title, clean(brief.title, '技术教程')),
  subtitle: clean(script.hook, ''),
  kicker: 'PRODUCT VIDEO',
  accent,
});

/**
 * Build focus payload — single keyword into visual focus.
 */
const buildFocusPayload = (script, accent) => ({
  keyword: '痛点',
  description: clean(script.pain, '传统流程存在效率瓶颈。').slice(0, 80),
  eyebrow: clean(script.title, '').slice(0, 30),
  accent,
});

/**
 * Build compare-board payload — left/right comparison of old vs new.
 */
const buildComparePayload = (script, accent) => ({
  heading: '旧方式 vs 新方案',
  left: {
    tag: '旧方式',
    claim: clean(script.pain, '信息分散，流程不可复用。').slice(0, 60),
    bullets: [clean(script.pain, '信息分散，流程不可复用。').slice(0, 40)],
  },
  right: {
    tag: '新方案',
    claim: clean(script.solution, '用结构化流程稳定交付。').slice(0, 60),
    bullets: [clean(script.solution, '结构化流程稳定交付。').slice(0, 40)],
  },
  accent,
});

/**
 * Build step-flow payload — sequential step list.
 */
const buildStepFlowPayload = (script, accent) => {
  const steps = Array.isArray(script.steps) && script.steps.length > 0
    ? script.steps.slice(0, 5)
    : [{label: '定义输入', detail: '把链接、文档、截图变成统一 brief。'}, {label: '生成结构', detail: '拆成固定的脚本结构。'}, {label: '沉淀输出', detail: '生成素材清单、视频 JSON。'}];

  return {
    steps: steps.map((step, index) => ({
      label: clean(step.label, `第 ${index + 1} 步`),
      detail: clean(step.detail, ''),
      accent: index === 0 ? accent : undefined,
    })),
    accent,
  };
};

/**
 * Build code payload — code snippets / terminal panel.
 */
const buildCodePayload = (script, accent) => {
  const items = Array.isArray(script.codeSnippets) && script.codeSnippets.length > 0
    ? script.codeSnippets.slice(0, 5)
    : [{label: 'pipeline', value: 'brief → script → assets → project.json'}];

  return {
    heading: '可复用执行路径',
    lines: items.map((item) => ({
      label: clean(item.label, 'line'),
      value: clean(item.value, ''),
    })),
    accent,
  };
};

/**
 * Build tag-matrix payload — tag grid for cautions/keywords.
 */
const buildTagMatrixPayload = (script, accent) => {
  const cautions = Array.isArray(script.cautions) && script.cautions.length > 0
    ? script.cautions.slice(0, 6)
    : [{label: '先验证', value: '确认素材和来源再渲染。'}];

  return {
    heading: '上线前必须确认',
    tags: cautions.map((item) => ({
      label: clean(item.label, '注意事项'),
      value: clean(item.value, '待确认'),
    })),
    accent,
  };
};

/**
 * Build evidence-wall payload — uses code snippets as execution evidence.
 */
const buildEvidencePayload = (script, accent) => {
  const items = Array.isArray(script.codeSnippets) && script.codeSnippets.length > 0
    ? script.codeSnippets.slice(0, 4)
    : [{label: 'pipeline', value: 'brief → script → assets → project.json'}];

  return {
    heading: '执行路径证据',
    items: items.map((item) => ({
      label: clean(item.label, '路径'),
      value: clean(item.value, '待补充'),
    })),
    accent,
  };
};

/**
 * Build cta payload — call to action for closing.
 */
const buildCtaPayload = (script, brief, viewpoint, accent) => ({
  title: clean(script.takeaway, clean(viewpoint, '开始使用结构化工作流。')),
  subtitle: '听懂、能复述、能上手，是这条视频的交付标准。',
  kicker: 'TAKEAWAY',
  accent,
});

// ── Main generator ──────────────────────────────────────────────────────

/**
 * Generate a product-grade VideoProject from brief + script-pack + asset-pack.
 *
 * @param {Object} opts
 * @param {Object} opts.brief        - brief.json content
 * @param {Object} opts.script       - script-pack.json content
 * @param {Object} opts.assetPack    - asset-pack.json content
 * @param {string} [opts.projectRoot] - project root for resolving paths
 * @returns {Object} video project (compatible with VideoProjectSchema)
 */
export function generateVideoBlueprint({brief, script, assetPack, projectRoot}) {
  // ── Parse inputs ────────────────────────────────────────────────────

  const projectId = String(brief.productionId ?? 'default-project')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .slice(0, 96);

  const fps = brief.format?.fps ?? FPS;
  const maxDurationSeconds = brief.format?.maxDurationSeconds ?? 180;
  const maxFrames = Math.round(maxDurationSeconds * fps);

  const isPortrait = brief.format?.width === 1080 && brief.format?.height === 1920;
  const isLandscape = brief.format?.width === 1920 && brief.format?.height === 1080;
  const renderWidth = brief.format?.width ?? (isPortrait ? 1080 : 1920);
  const renderHeight = brief.format?.height ?? (isPortrait ? 1920 : 1080);
  const orientation = isPortrait ? 'portrait' : isLandscape ? 'landscape' : 'landscape';

  const captionStyle = brief.visualStyle?.captionStyle ?? 'boxed';
  const showProjectLabel = brief.visualStyle?.showProjectLabel ?? true;

  // Accent from palette
  const styleAccent = accentForPalette(brief.visualStyle?.palette);
  const accentForFamily = (family) => contractAccentForFamily(family, styleAccent);

  // Viewpoint
  const selectedViewpoint = clean(
    script.selectedViewpoint,
    brief.viewpointCandidates?.find((item) => item.id === brief.selectedViewpointId)?.claim
      ?? brief.viewpointCandidates?.[0]?.claim
      ?? '这个技术真正改变的是工作流。',
  );

  // ── Visual structure strategy based on structure hint ────────────────

  const structure = brief.structure ?? '';
  // Parse structure into segments: "痛点 → 聚焦 → 方案 → 步骤 → 代码 → 注意 → 结论"
  const structureSegments = structure
    .split('->')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Determine scene count from structure segments (clamped 6-8)
  const segmentCount = structureSegments.length;
  let sceneCount;
  if (segmentCount >= 8) {
    sceneCount = 8;
  } else if (segmentCount >= 6) {
    sceneCount = 7;  // default
  } else if (segmentCount >= 2) {
    sceneCount = 6;
  } else {
    sceneCount = 7;
  }

  // The first 7 slots map to DEFAULT_BLUEPRINT, slot 8 adds arch/evidence variety
  const blueprint = sceneCount >= 8
    ? EIGHT_SCENE_BLUEPRINT
    : DEFAULT_BLUEPRINT.slice(0, sceneCount);

  // ── Assets ───────────────────────────────────────────────────────────

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

  // ── Captions ─────────────────────────────────────────────────────────

  const spokenScript = clean(script.spokenScript, [
    script.hook,
    script.pain,
    script.solution,
    ...(Array.isArray(script.steps) ? script.steps.map((step) => `${step.label}，${step.detail}`) : []),
    ...(Array.isArray(script.cautions) ? script.cautions.map((item) => `${item.label}，${item.value}`) : []),
    ...(Array.isArray(script.codeSnippets) ? script.codeSnippets.map((item) => `${item.label}: ${item.value}`) : []),
    script.takeaway,
  ].filter(Boolean).join(''));

  const sentences = splitIntoSentences(spokenScript);
  const sceneCaptionAssignments = assignCaptionsToScenes(sentences, sentences.length, blueprint.length);

  // ── Build scenes ─────────────────────────────────────────────────────

  const scenes = blueprint.map((spec, index) => {
    const {family, id} = spec;
    const accent = styleAccent[spec.accentKey] ?? styleAccent.primary;
    const sceneCaptions = sceneCaptionAssignments[index] || [];
    const sceneText = sceneCaptions.join('');

    let payload;
    switch (family) {
      case 'hero':
        payload = buildHeroPayload(script, brief, accent);
        break;
      case 'focus':
        payload = buildFocusPayload(script, accent);
        break;
      case 'compare-board':
        payload = buildComparePayload(script, accent);
        break;
      case 'step-flow':
        payload = buildStepFlowPayload(script, accent);
        break;
      case 'code':
        payload = buildCodePayload(script, accent);
        break;
      case 'tag-matrix':
        payload = buildTagMatrixPayload(script, accent);
        break;
      case 'evidence-wall':
        payload = buildEvidencePayload(script, accent);
        break;
      case 'cta':
        payload = buildCtaPayload(script, brief, selectedViewpoint, accent);
        break;
      default:
        payload = {accent};
    }

    return {
      id,
      family,
      text: sceneText,
      payload,
      assetIds: sceneAssetIds(id),
      captionIndex: index, // for ordering
    };
  });

  // ── Duration calculation ─────────────────────────────────────────────

  let durations = scenes.map((scene) => estimateFrames(scene.text));
  const total = durations.reduce((sum, d) => sum + d, 0);

  if (total > maxFrames) {
    const ratio = maxFrames / total;
    durations = durations.map((d) => Math.max(MIN_SCENE_FRAMES, Math.floor(d * ratio)));
  }

  // Ensure minimum distribution
  const adjustedTotal = durations.reduce((sum, d) => sum + d, 0);
  if (adjustedTotal < maxFrames) {
    // Distribute remaining frames proportionally
    const slack = maxFrames - adjustedTotal;
    const charCounts = scenes.map((s) => compactLength(s.text));
    const totalChars = charCounts.reduce((sum, c) => sum + c, 0) || 1;
    for (let i = 0; i < durations.length; i++) {
      durations[i] += Math.floor(slack * (charCounts[i] / totalChars));
    }
  }

  // ── Captions with timing ─────────────────────────────────────────────

  const totalDurationMs = Math.round(durations.reduce((sum, d) => sum + d, 0) / fps * 1000);
  const captions = buildCaptions(sentences, totalDurationMs);

  // ── Assemble project ─────────────────────────────────────────────────

  const project = {
    schemaVersion: 1,
    projectId,
    title: clean(script.title, clean(brief.title, projectId)).slice(0, 200),
    render: {
      fps,
      width: renderWidth,
      height: renderHeight,
      qualityMode: 'fast',
      ...(orientation ? {orientation} : {}),
      captionStyle,
      showProjectLabel,
    },
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

  return project;
}

export {DEFAULT_BLUEPRINT, EIGHT_SCENE_BLUEPRINT, splitIntoSentences, buildCaptions, estimateFrames};
