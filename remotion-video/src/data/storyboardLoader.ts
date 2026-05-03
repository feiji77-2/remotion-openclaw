/**
 * storyboardLoader.ts
 *
 * Single source of truth for loading Step-4 output.
 * Supports three input合同:
 *   1. step-04.json (segments_meta[])         ← 实际主链路
 *   2. step-04.json (payload.shots[])         ← 扩展版
 *   3. workflow_*.json (result.payload.shots) ← job 包装格式
 *
 * 统一转换逻辑：
 *   - 优先用 frames
 *   - 没有 frames → durationSeconds * fps（从 meta.fps 或传参获取）
 *   - family 字段统一映射（sceneFamily → family）
 *   - buildSceneData 根据 family 补全必填字段
 *
 * NOTE: Family dispatch, transition defaults, and stage config are now sourced
 * from src/data/registry.ts — the single source of truth. Do NOT add new switch
 * cases here; update registry.ts instead.
 */

import {
  getUltimateTimelineDurationInFrames,
  type UltimateSceneConfig,
  type UltimateProjectConfig,
  type UltimateSceneFamily,
} from '../components/ultimate-kit/project.ts';
import {
  getFamily,
  getRhythmLayer,
  resolveTransitionFromRegistry,
  resolveStageConfigFromRegistry,
} from './registry.ts';
import {
  directorQA,
  resolveShotGrammar,
  resolveFromDirectorBeat,
  type ShotArchetype,
  type CameraIntent,
  type DataEventVerb,
  type DirectorQAResult,
  type DirectorBeatOutput,
  type ResolvedShotGrammar,
} from './shotGrammar.ts';

// -------------------------------------------------------------------------- //
// Types
// -------------------------------------------------------------------------- //

type NormalizedShotItem = {
  label: string;
  detail: string;
  accent?: string;
  chips?: string[];
  layout?: 'wide' | 'regular';
  tag?: string;
  icon?: string;
};

type NormalizedFeature = {
  icon: string;
  title: string;
  desc: string;
};

type NormalizedComparison = {
  label: string;
  text: string;
  secondary?: string;
  accent?: string;
  icon?: string;
};

type VisualPropTagItem = string | {label?: string; accent?: string};

type ShotVisualProps = Record<string, unknown> & {
  kicker?: string;
  heading?: string;
  visualStyle?: string;
  stylePreset?: string;
  heroStyle?: string;
  lines?: string[];
  heroEmoji?: string;
  brandIcon?: string;
  brandLabel?: string;
  tag?: string;
  tagEmoji?: string;
  highlightedWord?: string;
  leftTitle?: string;
  rightTitle?: string;
  filename?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  term?: string;
  keyword?: string;
  eyebrow?: string;
  question?: string;
  description?: string;
  diagram?: 'framing' | 'rings' | 'scale';
  count?: string;
  summary?: string;
  windowTitle?: string;
  command?: string;
  outputs?: string[];
  note?: string;
  centerTitle?: string;
  centerDetail?: string;
  layout?: 'radial' | 'stack';
  tabs?: string[];
  activeTab?: string;
  items?: VisualPropTagItem[];
  source?: string;
  attribution?: string;
  tags?: string[];
};

/** segments_meta 条目（step-04 实际主数据） */
interface SegmentsMetaItem {
  id: string;
  family: string;
  frames: number;
  dur: number; // seconds
  title: string;
  narration: string;
  level?: 'opening' | 'closing' | 'chapter';
  items?: NormalizedShotItem[];
  [key: string]: unknown;
}

/** shots 数组条目（扩展版 step-04 和 workflow job 通用格式） */
interface ShotItem {
  id: string;
  /** step-04: family; workflow: sceneFamily */
  family?: string;
  /** step-04 output uses 'family'; workflow step-03 output uses 'sceneFamily'. Normalized to 'family'. */
  sceneFamily?: string;
  frames?: number;
  durationSeconds?: number;
  duration?: string; // "15.2秒"
  title: string;
  narration: string;
  level?: string;
  type?: string;
  familyReasoning?: string;
  items?: NormalizedShotItem[];
  features?: NormalizedFeature[];
  comparisons?: NormalizedComparison[];
  dataPoints?: string[];
  visual?: {
    description?: string;
    layout?: string;
    props?: ShotVisualProps;
    [key: string]: unknown;
  };
  director?: {
    archetype?: string;
    cameraIntent?: string;
    cameraMotion?: string;
    dataEvent?: string;
    enterFrames?: number;
    emphasisFrames?: number;
    staggerGap?: number;
    revealDirection?: string;
    memoryObject?: {type?: string; role?: string; enterFrame?: number; color?: string};
    directorNote?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** step-04.json 根结构 */
interface Step04Json {
  payload?: {
    meta?: {fps?: number; totalFrames?: number; totalDuration?: number; [key: string]: unknown};
    segments_meta?: SegmentsMetaItem[];
    shots?: ShotItem[];
    [key: string]: unknown;
  };
  segments_meta?: SegmentsMetaItem[];
  [key: string]: unknown;
}

/** workflow_*.json result.payload 结构 */
interface WorkflowPayload {
  result?: {
    payload?: {
      shots?: ShotItem[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/** 内部统一 shot 格式 */
export interface NormalizedShot {
  id: string;
  family: string;
  level?: 'opening' | 'closing' | 'chapter';
  frames: number;
  title: string;
  narration?: string;
  items?: NormalizedShotItem[];
  features?: NormalizedFeature[];
  comparisons?: NormalizedComparison[];
  dataPoints?: string[];
  visualProps: ShotVisualProps;
  director?: {
    archetype?: string;
    cameraIntent?: string;
    cameraMotion?: string;
    dataEvent?: string;
    enterFrames?: number;
    emphasisFrames?: number;
    staggerGap?: number;
    revealDirection?: string;
    memoryObject?: {type?: string; role?: string; enterFrame?: number; color?: string};
    directorNote?: string;
  };
  /** 指向对应的 DirectorBeat 的 ID（对应 directorBeats[].beatId） */
  beatId?: string;
}

type StoryboardScene = Omit<UltimateProjectConfig['scenes'][number], 'data'> & {
  durationInFrames: number;
  transition: ReturnType<typeof resolveTransitionFromRegistry> | false;
  /** 导演层 shot grammar 元数据（由 resolveShotGrammar 注入） */
  grammar: {
    archetype: string;
    cameraIntent: string;
    cameraMotion?: string;
    dataEvent: string;
    enterFrames: number;
    emphasisFrames: number;
    staggerGap: number;
    revealDirection?: string;
    memoryObject: {type: string; role: string; enterFrame: number; color: string};
    directorNote: string;
  };
};

/** Step 4 输出（包含 shots 和可选的 directorBeats） */
export interface Step4Payload {
  shots: NormalizedShot[];
  directorBeats?: DirectorBeatOutput[];
}

export type DirectorQAMode = 'off' | 'warn' | 'error';

export class DirectorQAError extends Error {
  readonly failures: string[];

  constructor(failures: string[]) {
    super([
      `[directorQA] ${failures.length} issue(s) blocked render`,
      ...failures.map((failure) => `- ${failure}`),
    ].join('\n'));
    this.name = 'DirectorQAError';
    this.failures = failures;
  }
}

const formatDirectorQAReport = (report: DirectorQAResult) => {
  return [
    `[directorQA] ${report.failures.length} issue(s) found`,
    ...report.failures.map((failure) => `- ${failure}`),
  ].join('\n');
};

const collectTextFragments = (value: unknown, bucket: string[]) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      bucket.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTextFragments(entry, bucket));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectTextFragments(entry, bucket));
  }
};

const collectNumericFields = (
  value: unknown,
  path: string,
  bucket: Array<{field: string; value: number | string; label?: string}>,
) => {
  if (typeof value === 'number') {
    bucket.push({field: path, value});
    return;
  }

  if (typeof value === 'string') {
    const parsed = parseNumeric(value.trim());
    if (parsed !== null) {
      bucket.push({field: path, value: parsed, label: value});
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectNumericFields(entry, `${path}[${index}]`, bucket));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => collectNumericFields(entry, `${path}.${key}`, bucket));
  }
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

// -------------------------------------------------------------------------- //
// Core loader
// -------------------------------------------------------------------------- //

/** FPS 默认值 */
const DEFAULT_FPS = 30;

/**
 * 从任意合法 JSON 结构中提取 NormalizedShot[]
 * 优先顺序：segments_meta > shots
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

/**
 * 从任意合法 JSON 结构中提取 NormalizedShot[]
 * 优先顺序：segments_meta > shots
 */
/**
 * 从任意合法 JSON 结构中提取 NormalizedShot[]
 * 优先顺序：segments_meta > shots
 *
 * 合并策略：
 *   - 帧数/时长/标题/旁白 → 优先从 segments_meta（主数据链）
 *   - family专属数据（items/comparisons/features/dataPoints）→ 从 shots 数组补充
 *   - shot.frames === 0 → 从 durationSeconds * fps 推导
 */
export function normalizeShots(json: AnyJson, fps = DEFAULT_FPS): NormalizedShot[] {
  // Detect format
  const isWorkflowFormat = Boolean(json?.result?.payload?.shots?.length);
  const isStep04Format = Boolean(json?.payload?.segments_meta?.length || json?.segments_meta?.length);
  const isPlainShotsFormat = Boolean(json?.payload?.shots?.length || json?.shots?.length);

  // Build index of shots by id (for field augmentation)
  const shotsById: Record<string, AnyJson> = {};
  if (isWorkflowFormat) {
    json.result.payload.shots.forEach((s: AnyJson) => { shotsById[s.id] = s; });
  } else if (isPlainShotsFormat) {
    const arr = json?.payload?.shots ?? json?.shots ?? [];
    arr.forEach((s: AnyJson) => { shotsById[s.id] = s; });
  }

  // Primary source: segments_meta (timing backbone)
  if (isStep04Format) {
    const segments = json?.payload?.segments_meta ?? json?.segments_meta ?? [];
    return segments.map((s: AnyJson) => {
      const shot = shotsById[s.id] ?? {};
      const frames = s.frames ?? (s.dur ? Math.round(s.dur * fps) : 0);
      return {
        id: s.id,
        family: s.family,
        level: s.level, // opening/closing/chapter 转场覆盖依赖这个字段
        frames,
        title: s.title,
        narration: s.narration,
        items: shot.items ?? shot.features ?? shot.comparisons ?? shot.dataPoints ? mergeItems(shot) : s.items,
        features: shot.features,
        comparisons: shot.comparisons,
        dataPoints: shot.dataPoints,
        visualProps: (shot.visual?.props ?? {}) as ShotVisualProps,
        director: shot.director,
        beatId: shot.beatId,
      };
    });
  }

  // Fallback: shots as primary
  if (isWorkflowFormat) {
    return json.result.payload.shots.map((s: AnyJson) => normalizeShot(s, fps));
  }
  if (isPlainShotsFormat) {
    const arr = json?.payload?.shots ?? json?.shots ?? [];
    return arr.map((s: AnyJson) => normalizeShot(s, fps));
  }

  throw new Error('[storyboardLoader] No shots found in input JSON');
}

function mergeItems(shot: AnyJson): NormalizedShotItem[] {
  const items: NormalizedShotItem[] = [];
  (shot.items ?? []).forEach((it: AnyJson) => items.push(it));
  (shot.features ?? []).forEach((f: AnyJson) => items.push({label: f.title ?? '', detail: f.desc ?? ''}));
  (shot.comparisons ?? []).forEach((c: AnyJson) => items.push({label: c.label ?? '', detail: c.text ?? '', accent: c.accent, icon: c.icon ?? ''}));
  // Fallback: visual.props 里也有可能藏着 comparisons/features
  const vprops = (shot.visual?.props ?? {}) as {
    comparisons?: NormalizedComparison[];
    features?: NormalizedFeature[];
  };
  (vprops.comparisons ?? []).forEach((c: AnyJson) => items.push({label: c.label ?? '', detail: c.text ?? '', accent: c.accent, icon: c.icon ?? ''}));
  (vprops.features ?? []).forEach((f: AnyJson) => items.push({label: f.title ?? '', detail: f.desc ?? ''}));
  return items;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeShot(shot: AnyJson, fps: number): NormalizedShot {
  // 'family' from step-04 output, 'sceneFamily' from workflow step-03 output
  const family = shot.family ?? shot.sceneFamily ?? 'hero';
  const visualProps = shot.visual?.props ?? {};

  // Derive frames: priority frames > durationSeconds > duration
  let frames = shot.frames ?? 0;
  if (!frames) {
    if (shot.durationSeconds) {
      frames = Math.round(shot.durationSeconds * fps);
    } else if (shot.duration) {
      const parsed = parseFloat(shot.duration.replace(/[^\d.]/g, ''));
      if (Number.isFinite(parsed)) frames = Math.round(parsed * fps);
    }
  }

  return {
    id: shot.id,
    family,
    frames,
    level: shot.level,
    title: shot.title,
    narration: shot.narration,
    items: shot.items,
    features: shot.features,
    comparisons: shot.comparisons,
    dataPoints: shot.dataPoints,
    visualProps: visualProps as ShotVisualProps,
    director: shot.director,
    beatId: shot.beatId,
  };
}

// -------------------------------------------------------------------------- //
// Public API
// -------------------------------------------------------------------------- //

export interface Step04Shot {
  id: string;
  level: string;
  title: string;
  type: string;
  family: string;
  duration: string;
  frames: number;
  narration: string;
  familyReasoning: string;
  visual: {description: string; layoutNote: string; props: ShotVisualProps};
  items?: NormalizedShotItem[];
  features?: NormalizedFeature[];
  comparisons?: NormalizedComparison[];
  dataPoints?: string[];
}

/** Extract directorBeats[] from top-level JSON if present */
export function extractDirectorBeats(json: AnyJson): DirectorBeatOutput[] | undefined {
  if (!json) return undefined;
  // directorBeats can be at top level or inside result.payload
  const beats: AnyJson[] | undefined =
    json.directorBeats ??
    json.result?.payload?.directorBeats ??
    json.payload?.directorBeats;
  if (!Array.isArray(beats)) return undefined;
  return beats as DirectorBeatOutput[];
}

/** Parse from raw JSON string or object — returns both shots and directorBeats */
export function parseShotsWithDirectorBeats(
  input: string | AnyJson,
  fps = DEFAULT_FPS,
): Step4Payload {
  const json = typeof input === 'string' ? (JSON.parse(input) as AnyJson) : input;
  return {
    shots: normalizeShots(json, fps),
    directorBeats: extractDirectorBeats(json),
  };
}

/** Parse from raw JSON string or object — legacy, returns shots only */
export function parseShots(
  input: string | Step04Json | WorkflowPayload,
  fps = DEFAULT_FPS,
): NormalizedShot[] {
  const json = typeof input === 'string' ? (JSON.parse(input) as Step04Json | WorkflowPayload) : input;
  return normalizeShots(json, fps);
}

/** Resolve transition type per shot level/family — sourced from registry.ts */
function resolveTransition(
  shot: NormalizedShot,
  grammar?: {archetype?: string},
): ReturnType<typeof resolveTransitionFromRegistry> {
  return resolveTransitionFromRegistry(shot.family as UltimateSceneFamily, shot.level, grammar?.archetype);
}

/** Resolve stage shell config per family — sourced from registry.ts */
function resolveStageConfig(
  family: string,
): {showOverlay?: boolean; showMediaCard?: boolean; showIconOrbit?: boolean; stagePreset?: string; hudMode?: string} | null {
  return resolveStageConfigFromRegistry(family as UltimateSceneFamily);
}

export function validateDirectorScenes(
  scenes: Array<Pick<StoryboardScene, 'family' | 'grammar'>>,
  mode: DirectorQAMode = 'off',
): DirectorQAResult {
  const baseReport = directorQA(
    scenes.map((scene) => ({
      family: scene.family,
      grammar: scene.grammar as ResolvedShotGrammar,
    })),
  );

  const failures = [...baseReport.failures];
  let runLayer = '';
  let runStart = 0;

  scenes.forEach((scene, index) => {
    const layer = getRhythmLayer(scene.family);
    if (layer !== runLayer) {
      runLayer = layer;
      runStart = index;
      return;
    }

    const runLength = index - runStart + 1;
    if (runLength === 3) {
      const runFamilies = scenes
        .slice(runStart, index + 1)
        .map((entry) => entry.family)
        .join(' -> ');
      failures.push(
        `[rhythm] 连续 3 个 ${layer} 层 family: ${runFamilies}。避免连续 3+ 个同层 scene 串联。`,
      );
    }
  });

  const report = {
    pass: failures.length === 0,
    failures,
  };

  if (report.pass || mode === 'off') {
    return report;
  }

  if (mode === 'warn') {
    console.warn(formatDirectorQAReport(report));
    return report;
  }

  throw new DirectorQAError(report.failures);
}

const buildLegacySceneContext = (
  scene: UltimateSceneConfig,
  shotIndex: number,
  totalShots: number,
) => {
  const textFragments: string[] = [];
  collectTextFragments(scene.data, textFragments);
  const numericFields: Array<{field: string; value: number | string; label?: string}> = [];
  collectNumericFields(scene.data, scene.family, numericFields);

  const subtitle = typeof scene.subtitle === 'string' ? scene.subtitle.trim() : '';
  const sceneIntent = [subtitle, ...textFragments.slice(0, 4)].filter(Boolean).join(' | ');
  const storyboardCueZh = subtitle || textFragments[0] || scene.family;
  const scriptBlockLabel = scene.id;
  const level =
    shotIndex === 0
      ? 'opening'
      : shotIndex === totalShots - 1
        ? 'closing'
        : undefined;

  return {
    family: scene.family,
    shotIndex,
    totalShots,
    numericFields,
    level,
    type: scene.family,
    sceneIntent,
    storyboardCueZh,
    scriptBlockLabel,
  };
};

export function hydrateUltimateProjectConfigWithDirectorGrammar(
  config: UltimateProjectConfig,
  options: {directorQA?: DirectorQAMode} = {},
): UltimateProjectConfig {
  const hydratedScenes = config.scenes.map((scene, shotIndex) => {
    if (scene.grammar) {
      return scene;
    }

    return {
      ...scene,
      grammar: resolveShotGrammar(buildLegacySceneContext(scene, shotIndex, config.scenes.length)),
    };
  });

  validateDirectorScenes(
    hydratedScenes.map((scene) => ({
      family: scene.family,
      grammar: scene.grammar as ResolvedShotGrammar,
    })),
    options.directorQA ?? 'off',
  );

  return {
    ...config,
    scenes: hydratedScenes,
  };
}

/** Convert NormalizedShot[] → UltimateProjectConfig.scenes */
export function shotsToScenes(
  shots: NormalizedShot[],
  options: {directorQA?: DirectorQAMode; directorBeats?: DirectorBeatOutput[]} = {},
): StoryboardScene[] {
  // Build beatId → DirectorBeat lookup map
  const beatMap = new Map<string, DirectorBeatOutput>();
  if (options.directorBeats) {
    for (const beat of options.directorBeats) {
      beatMap.set(beat.beatId ?? beat.id, beat);
    }
  }

  const scenes = shots.map((shot, idx) => {
    // ── 导演层：shot grammar 推导 ─────────────────────────────────────────
    // 从 shot 数据里提取 numericFields，用于 DataEventVerb 选择
    const numericFields = extractNumericFields(shot);

    // ── Priority 1: explicit director contract (backward compat) ──────────
    const grammar = shot.director?.archetype && shot.director?.cameraIntent && shot.director?.dataEvent
      ? {
          archetype: shot.director.archetype as ShotArchetype,
          cameraIntent: shot.director.cameraIntent as CameraIntent,
          cameraMotion: shot.director.cameraMotion,
          dataEvent: shot.director.dataEvent as DataEventVerb,
          enterFrames: Number(shot.director.enterFrames ?? 16),
          emphasisFrames: Number(shot.director.emphasisFrames ?? 48),
          staggerGap: Number(shot.director.staggerGap ?? 0),
          revealDirection: shot.director.revealDirection,
          memoryObject: {
            type: String(shot.director.memoryObject?.type || 'word'),
            role: String(shot.director.memoryObject?.role || '显式导演记忆物'),
            enterFrame: Number(shot.director.memoryObject?.enterFrame ?? 12),
            color: String(shot.director.memoryObject?.color || '#00d4ff'),
          },
          directorNote: String(shot.director.directorNote || '').trim(),
        }
      // ── Priority 2: DirectorBeat from Step 4 output ─────────────────────
      : (() => {
          const beat = shot.beatId ? beatMap.get(shot.beatId) : undefined;
          return beat?.archetype
            ? resolveFromDirectorBeat(beat, {
                family: shot.family,
                level: shot.level,
                shotIndex: idx,
                totalShots: shots.length,
                numericFields,
                sceneIntent: (shot.visualProps?.sceneIntent as string) ?? '',
                storyboardCueZh: (shot.visualProps?.storyboardCueZh as string) ?? '',
                scriptBlockLabel: (shot.visualProps?.scriptBlockLabel as string) ?? '',
                type: (shot.visualProps?.type as string) ?? shot.family,
                beatId: shot.beatId,
                directorBeats: options.directorBeats,
              })
            : undefined;
        })()
      // ── Priority 3: semantic derivation (storyboardCueZh / sceneIntent / level / type / family)
      ?? resolveShotGrammar({
          family: shot.family,
          level: shot.level,
          shotIndex: idx,
          totalShots: shots.length,
          numericFields,
          // 语义字段：来自 visualProps（storyboard 阶段可以写入学）
          sceneIntent: (shot.visualProps?.sceneIntent as string) ?? '',
          storyboardCueZh: (shot.visualProps?.storyboardCueZh as string) ?? '',
          scriptBlockLabel: (shot.visualProps?.scriptBlockLabel as string) ?? '',
          type: (shot.visualProps?.type as string) ?? shot.family,
        });

    const scene = {
      id: shot.id,
      family: shot.family as UltimateSceneFamily,
      subtitle: shot.narration,
      durationInFrames: shot.frames,
      warm: true,
      showGrid: false,
      transition: resolveTransition(shot, grammar),
      stageConfig: resolveStageConfig(shot.family),
      grammar, // ← 导演层元数据注入
      data: buildSceneData(shot),
    };

    return scene as unknown as StoryboardScene;
  });

  validateDirectorScenes(scenes, options.directorQA ?? 'off');
  return scenes;
}

/**
 * 从 NormalizedShot 中提取数字相关字段。
 * 用于 shot grammar 的 DataEventVerb 选择。
 */
function extractNumericFields(shot: NormalizedShot): Array<{field: string; value: number | string; label?: string}> {
  const fields: Array<{field: string; value: number | string; label?: string}> = [];

  // 从 items 的 label/detail 提取数字
  if (shot.items) {
    for (const item of shot.items) {
      const num = parseNumeric(item.label ?? '');
      if (num !== null) fields.push({field: 'item.label', value: num, label: item.label});
      const num2 = parseNumeric(item.detail ?? '');
      if (num2 !== null) fields.push({field: 'item.detail', value: num2, label: item.detail});
    }
  }

  // 从 dataPoints 提取
  if (shot.dataPoints) {
    for (const dp of shot.dataPoints) {
      const num = parseNumeric(dp);
      if (num !== null) fields.push({field: 'dataPoint', value: num, label: dp});
    }
  }

  // benchmark-chart / metrics 特有字段
  if (shot.visualProps) {
    for (const [key, val] of Object.entries(shot.visualProps)) {
      if (typeof val === 'number') {
        fields.push({field: key, value: val});
      } else if (typeof val === 'string') {
        const num = parseNumeric(val);
        if (num !== null) fields.push({field: key, value: num, label: val});
      }
    }
  }

  return fields;
}

function parseNumeric(s: string): number | null {
  // 先检查百分比/倍数格式（优先）
  const pctMatch = s.match(/^([-+]?\d+(?:[.,]\d+)?)\s*%$/);
  if (pctMatch) {
    const v = parseFloat(pctMatch[1].replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }
  const multMatch = s.match(/^([-+]?\d+(?:[.,]\d+)?)\s*[xX]$/);
  if (multMatch) {
    const v = parseFloat(multMatch[1].replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }
  // 标准数字格式（支持单位数、小数、负数）
  const m = s.match(/^[-+]?\d+(?:[.,]\d+)?$/);
  if (!m) return null;
  const cleaned = m[0].replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Build family-specific scene data */
function buildSceneData(shot: NormalizedShot): Record<string, unknown> {
  const base = {
    kicker: shot.visualProps?.kicker ?? '',
    title: shot.title,
    subtitle: shot.narration,
    badge: shot.family.toUpperCase(),
    accent: 'cyan',
  };

  // heading 是所有 family 的必填字段，用 title兜底
  const heading = shot.visualProps?.heading
    ?? (shot.title.length > 40 ? shot.title.slice(0, 40) + '…' : shot.title);

  switch (shot.family) {
    case 'hero': {
      const visualStyle = shot.visualProps?.visualStyle ?? shot.visualProps?.stylePreset ?? shot.visualProps?.heroStyle;
      const lines = toStringArray(shot.visualProps?.lines);
      const useMorfeo = visualStyle === 'morfeo'
        || lines.length > 0
        || typeof shot.visualProps?.heroEmoji === 'string'
        || typeof shot.visualProps?.brandIcon === 'string';

      return {
        ...base,
        kicker: shot.visualProps?.kicker ?? '',
        accent: (shot.visualProps?.accent as 'cyan' | 'green' | 'lime' | 'yellow' | 'orange' | 'red' | 'purple') ?? (useMorfeo ? 'lime' : 'cyan'),
        visualStyle: useMorfeo ? 'morfeo' : 'classic',
        tag: typeof shot.visualProps?.tag === 'string' ? shot.visualProps.tag : undefined,
        tagEmoji: typeof shot.visualProps?.tagEmoji === 'string' ? shot.visualProps.tagEmoji : undefined,
        heroEmoji: typeof shot.visualProps?.heroEmoji === 'string' ? shot.visualProps.heroEmoji : undefined,
        highlightedWord: typeof shot.visualProps?.highlightedWord === 'string' ? shot.visualProps.highlightedWord : undefined,
        lines,
        brandIcon: typeof shot.visualProps?.brandIcon === 'string' ? shot.visualProps.brandIcon : undefined,
        brandLabel: typeof shot.visualProps?.brandLabel === 'string' ? shot.visualProps.brandLabel : undefined,
      };
    }

    case 'timeline': {
      // UltimateTimelineItem { label, title, detail, icon, accent }
      const items = (shot.items ?? []).map((it) => ({
        label: it.label,
        title: it.detail ?? it.label,
        detail: it.detail,
        icon: it.icon ?? '',
        accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
      }));
      return {
        ...base,
        heading,
        items,
        accent: 'orange',
      };
    }

    case 'feature-rail': {
      // UltimateFeatureCardItem { title, eyebrow, caption, icon, accent }
      const items = (shot.features ?? []).map((f) => ({
        title: f.title,
        eyebrow: f.desc ?? '',
        caption: f.desc ?? '',
        icon: f.icon ?? '',
        accent: 'cyan' as const,
      }));
      return {
        ...base,
        heading,
        items,
        accent: 'cyan',
      };
    }

    case 'step-flow': {
      // UltimateStepItem { label, detail, icon, accent }
      const steps = (shot.items ?? []).map((it) => ({
        label: it.label,
        detail: it.detail ?? '',
        icon: it.icon ?? '',
        accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
      }));
      return {
        ...base,
        heading,
        steps,
        stepVariants: steps.map(() => 'default'),
        variant: 'default',
      };
    }

    case 'compare-board': {
      // shot.comparisons: {label, text, secondary?}[] → real bilateral rows
      // shot.dataPoints provides parallel data: [leftValue, rightValue, ratio?] triplets
      const comparisons = shot.comparisons ?? [];
      const dataPoints = shot.dataPoints ?? [];
      const rows = comparisons.map((c, i) => {
        // dataPoints[i] can be "leftValue / rightValue" or "leftValue : rightValue : ratio"
        const dp = dataPoints[i] ?? '';
        const parts = dp.split(/[:\/]/);
        const leftVal = parts[0]?.trim() || c.text || '';
        const rightVal = parts[1]?.trim() || c.secondary || '';
        const ratioHint = parts[2]?.trim();
        return {
          label: c.label,
          left: leftVal,
          right: rightVal,
          accent: (c.accent as 'cyan' | 'orange' | 'purple') ?? (leftVal && rightVal ? 'cyan' : 'orange'),
        };
      });
      return {
        ...base,
        heading,
        leftTitle: shot.visualProps?.leftTitle ?? '前代',
        rightTitle: shot.visualProps?.rightTitle ?? '新版',
        rows,
      };
    }

    case 'code': {
      // UltimateCodeLine { text, tone }
      const linesRaw = (shot.visualProps?.lines as string[] | undefined) ?? [shot.narration];
      const lines = linesRaw.map((text) => ({text, tone: 'base' as const}));
      return {
        ...base,
        heading,
        lines,
        filename: shot.visualProps?.filename ?? 'main.ts',
        language: 'typescript',
        accent: 'cyan',
      };
    }

    case 'metrics': {
      // shot.dataPoints: ["label:value:ratio", "label:value", ...] — real structured data
      const points = (shot.dataPoints ?? [shot.narration]).filter((raw): raw is string => typeof raw === 'string' && raw.length > 0);
      const iconHints = shot.items ?? [];
      const items = points.map((raw, i) => {
        // Format: "label:value" or "label:value:ratio" or just "label"
        const colonIdx = raw.indexOf(':');
        const label = colonIdx > 0 ? raw.slice(0, colonIdx) : `指标${i + 1}`;
        const rest = colonIdx > 0 ? raw.slice(colonIdx + 1) : raw;
        const ratioIdx = rest.lastIndexOf(':');
        const value = ratioIdx > 0 ? rest.slice(0, ratioIdx) : rest;
        const ratioStr = ratioIdx > 0 ? rest.slice(ratioIdx + 1) : '0.5';
        const ratio = parseFloat(ratioStr) || 0.5;
        const matchedItem = iconHints[i];
        return {
          label,
          value,
          ratio: Math.min(1, Math.max(0, ratio)),
          icon: matchedItem?.icon ?? '',
          accent: 'cyan' as const,
        };
      });
      return {
        ...base,
        heading,
        items,
        layout: 'bars',
      };
    }

    case 'benchmark-chart': {
      // shot.dataPoints: ["label:primary:secondary:primaryRatio", ...] — real benchmark data
      const points = (shot.dataPoints ?? [shot.narration]).filter((raw): raw is string => typeof raw === 'string' && raw.length > 0);
      const items = points.map((raw, i) => {
        const parts = raw.split(':');
        const label = parts[0] || `基准${i + 1}`;
        const primaryValue = parts[1] || '';
        const secondaryValue = parts[2] || '';
        const primaryRatio = parseFloat(parts[3]) || 0.7;
        return {
          label,
          primaryValue,
          secondaryValue,
          primaryRatio: Math.min(1, Math.max(0, primaryRatio)),
          secondaryRatio: secondaryValue ? primaryRatio * 0.85 : 0,
          accent: 'orange' as const,
        };
      });
      return {
        ...base,
        heading,
        primaryLabel: shot.visualProps?.primaryLabel ?? 'GPT-5.5',
        secondaryLabel: shot.visualProps?.secondaryLabel ?? '前代',
        items,
        accent: 'orange',
      };
    }

    case 'evidence-wall': {
      // UltimateEvidenceCard { source, quote, detail, chips, icon, accent }
      const cards = (shot.comparisons ?? []).map((c) => ({
        source: c.label,
        quote: c.text,
        detail: '',
        chips: [],
        icon: c.icon ?? '',
        accent: 'cyan' as const,
      }));
      return {
        ...base,
        heading,
        cards,
        accent: 'cyan',
      };
    }

    case 'cta':
      return {
        ...base,
        heading,
        subtitle: shot.narration,
        badge: 'CTA',
        searchLabel: typeof shot.visualProps?.searchLabel === 'string' ? shot.visualProps.searchLabel : undefined,
        highlights: Array.isArray(shot.visualProps?.highlights)
          ? shot.visualProps.highlights.filter((value): value is string => typeof value === 'string' && value.length > 0)
          : (shot.items ?? []).map((item) => item.label).filter((value) => value.length > 0).slice(0, 4),
      };

    case 'glossary-term':
      return {
        ...base,
        heading,
        term: shot.visualProps?.term ?? shot.title,
        pronunciation: typeof shot.visualProps?.pronunciation === 'string' ? shot.visualProps.pronunciation : undefined,
        definition: shot.narration,
        related: (Array.isArray(shot.visualProps?.related)
          ? shot.visualProps.related
          : (shot.items ?? []).map((item) => item.label)).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0).slice(0, 5).map((label) => ({label, accent: 'cyan' as const})),
      };

    case 'focus': {
      const keyword = shot.visualProps?.keyword ?? shot.title;
      return {
        ...base,
        eyebrow: shot.visualProps?.eyebrow ?? shot.visualProps?.kicker ?? '',
        keyword,
        question: shot.visualProps?.question ?? '',
        description: shot.visualProps?.description ?? (shot.narration ?? '').slice(0, 200),
        diagram: (shot.visualProps?.diagram as 'framing' | 'rings' | 'scale') ?? 'framing',
        accent: 'cyan',
      };
    }

    case 'number-strip': {
      const count = shot.visualProps?.count ?? String((shot.items ?? []).length);
      return {
        ...base,
        count,
        heading,
        summary: shot.visualProps?.summary ?? (shot.narration ?? '').slice(0, 160),
        items: (shot.items ?? []).map((it) => ({
          label: it.label,
          detail: it.detail,
          chips: it.chips,
          layout: it.layout,
          tag: it.tag,
          accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
        })),
        accent: 'orange',
      };
    }

    case 'terminal': {
      return {
        ...base,
        heading: shot.title,
        windowTitle: shot.visualProps?.windowTitle ?? '',
        command: shot.visualProps?.command ?? shot.narration,
        outputs: shot.visualProps?.outputs ?? [shot.narration],
        note: shot.visualProps?.note ?? '',
        accent: 'cyan',
      };
    }

    case 'architecture-map': {
      const centerTitle = shot.visualProps?.centerTitle ?? shot.title;
      return {
        ...base,
        heading,
        centerTitle,
        centerDetail: shot.visualProps?.centerDetail ?? (shot.narration ?? '').slice(0, 160),
        nodes: (shot.items ?? []).map((it) => ({
          label: it.label,
          detail: it.detail,
          icon: it.icon ?? '',
          accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
        })),
        layout: (shot.visualProps?.layout as 'radial' | 'stack') ?? 'radial',
        accent: 'purple',
      };
    }

    case 'tag-matrix': {
      const tabs = shot.visualProps?.tabs ?? [];
      const activeTab = shot.visualProps?.activeTab ?? tabs[0] ?? '';
      return {
        ...base,
        heading,
        tabs,
        activeTab,
        items: (((shot.visualProps?.items as Array<string | {label?: string; accent?: string}> | undefined) ?? undefined)
          ?? (shot.items ?? []).map((item) => ({label: item.label, accent: item.accent}))).map((it) => {
          if (typeof it === 'string') {
            return {label: it, accent: 'cyan' as const};
          }

          return {
            label: it.label ?? '',
            accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
          };
        }),
        accent: 'orange',
      };
    }

    case 'data-stream': {
      const rawItems = shot.dataPoints ?? [];
      return {
        ...base,
        heading,
        summary: shot.visualProps?.summary ?? '',
        items: rawItems.length > 0
          ? rawItems.map((text: string, i: number) => {
              const colonIdx = text.indexOf(':');
              return colonIdx > 0
                ? {label: text.slice(0, colonIdx), value: text.slice(colonIdx + 1), trend: 'up' as const, accent: 'cyan' as const}
                : {label: `数据${i + 1}`, value: text, trend: 'steady' as const, accent: 'cyan' as const};
            })
          : [{label: shot.title, value: (shot.narration ?? '').slice(0, 160), trend: 'up' as const, accent: 'cyan' as const}],
        accent: 'cyan',
      };
    }

    case 'memory-graph': {
      const centerTitle = shot.visualProps?.centerTitle ?? shot.title;
      return {
        ...base,
        heading,
        centerTitle,
        centerDetail: shot.visualProps?.centerDetail ?? (shot.narration ?? '').slice(0, 160),
        nodes: (shot.items ?? []).map((it) => ({
          label: it.label,
          detail: it.detail,
          icon: it.icon ?? '',
          accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
        })),
        accent: 'purple',
      };
    }

    case 'pipeline-flow': {
      return {
        ...base,
        heading,
        summary: shot.visualProps?.summary ?? '',
        stages: (shot.items ?? []).map((it) => ({
          label: it.label,
          detail: it.detail,
          icon: it.icon ?? '',
          accent: (it.accent as 'cyan' | 'orange' | 'purple') ?? 'cyan',
        })),
        accent: 'cyan',
      };
    }

    case 'quote-highlight': {
      return {
        ...base,
        heading: shot.visualProps?.heading ?? heading,
        quote: shot.narration,
        attribution: shot.visualProps?.attribution ?? shot.visualProps?.source ?? '',
        tags: (shot.visualProps?.tags ?? []).map((t: string) => ({label: t, accent: 'cyan' as const})),
        accent: 'orange',
      };
    }

    default: {
      const entry = getFamily(shot.family);
      return {
        ...base,
        heading,
        accent: entry?.defaultAccent ?? 'cyan',
      };
    }
  }
}

/** Calculate total timeline frames from scenes, subtracting transition overlaps. */
export function calcTotalFrames(
  scenes: Array<{durationInFrames: number; transition?: {durationInFrames?: number} | false}>,
): number {
  return getUltimateTimelineDurationInFrames(scenes);
}

// loadStep04Shots and loadAndConvert live in storyboardLoader.node.ts (Node-only, uses fs)
