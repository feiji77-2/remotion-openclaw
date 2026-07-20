/**
 * sceneRegistry.tsx — 场景组件注册表
 *
 * 单一可信来源：对接 registry.ts 的 ALL_FAMILIES 作为 family 名称权威列表。
 * 所有 family 的组件映射和 payload schema 验证集中管理在此。
 *
 * 调用链：
 *   compileProject() → parseProjectScenePayload() → family/组件解析
 *   SceneTimeline → ProjectSceneRegistry() → 渲染对应 family 组件
 *
 * 与 sceneRegistry.tsx 的旧版本区别：
 *   - 使用 registry.ts 的 ALL_FAMILIES 作为 family 名称权威列表
 *   - 覆盖 30+ family 的组件映射（含 spoken / ultimate / minimal）
 *   - accent 颜色从 payload 动态解析，不再硬编码
 *   - SpokenAssetLayer 仅对 spoken-* family 渲染
 */

import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {z} from 'zod';
import type {UltimateSceneFamily} from '../components/ultimate-kit/project';
import {ALL_FAMILIES} from '../data/registry';

// ── Spoken family 组件 ─────────────────────────────────────────────────

import {SpokenAssetLayer} from '../components/ultimate-kit/families/SpokenAssetLayer';
import {SpokenCode} from '../components/ultimate-kit/families/SpokenCode';
import {SpokenCompare} from '../components/ultimate-kit/families/SpokenCompare';
import {SpokenMetric} from '../components/ultimate-kit/families/SpokenMetric';
import {SpokenProcess} from '../components/ultimate-kit/families/SpokenProcess';
import {SpokenRanking} from '../components/ultimate-kit/families/SpokenRanking';
import {SpokenTags} from '../components/ultimate-kit/families/SpokenTags';
import {SpokenTitle} from '../components/ultimate-kit/families/SpokenTitle';
import {SkillShowcase} from '../components/ultimate-kit/families/skill-showcase/SkillShowcase';
import {SKILL_ICON_KEYS} from '../components/ultimate-kit/families/skill-showcase/iconRegistry';
import {PRODUCT_ICON_KEYS} from '../components/ultimate-kit/families/skill-showcase/productIcons';

// ── Ultimate (完整) family 组件 ─────────────────────────────────────────

import {
  UltimateHeroPanel,
  UltimateFeatureCardRail,
  UltimateFocusDiagram,
  UltimateNumberStrip,
  UltimateStepFlow,
  UltimateTimeline,
  UltimateCompareBoard,
  UltimateTerminalPanel,
  UltimateEvidenceWall,
  UltimateArchitectureMap,
  UltimateTagMatrix,
  UltimateCodePanel,
  UltimateMetricBars,
  UltimateDataStream,
  UltimateBenchmarkChart,
  UltimateQuoteHighlight,
  UltimateGlossaryTerm,
  UltimateCtaPanel,
} from '../components/ultimate-kit';

// ── Minimal family 组件 ─────────────────────────────────────────────────

import {MinimalHero} from '../components/ultimate-kit/families/MinimalHero';
import {MinimalStepFlow} from '../components/ultimate-kit/families/MinimalStepFlow';
import {MinimalTagMatrix} from '../components/ultimate-kit/families/MinimalTagMatrix';
import {MinimalNumberStrip} from '../components/ultimate-kit/families/MinimalNumberStrip';
import {MinimalTimeline} from '../components/ultimate-kit/families/MinimalTimeline';
import {MinimalCompareBoard} from '../components/ultimate-kit/families/MinimalCompareBoard';

// ── Swiss family 组件（极简口播 · 反平均审美）────────────────────────────

import {
  SwissTitle,
  SwissQuestion,
  SwissList,
  SwissCompare,
  SwissNumber,
  SwissGrid,
  SwissFlow,
  SwissTabular,
  SwissStamp,
} from '../components/ultimate-kit/families/swiss';

// ── 公共类型 ────────────────────────────────────────────────────────────

import type {CompiledProject, CompiledProjectScene} from './compileProject';
import type {CompiledAsset} from './assetResolver';
import {ProjectValidationError, formatProjectPath} from './projectSchema';

// ─── Zod payload 校验 schema ──────────────────────────────────────────

const TitlePayloadSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  kicker: z.string().optional(),
  accent: z.string().optional(),
});

const ItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  accent: z.string().optional(),
});

const ItemsPayloadSchema = z.object({
  heading: z.string().optional(),
  items: z.array(ItemSchema).min(1).max(8),
  accent: z.string().optional(),
});

const ProcessPayloadSchema = z.object({
  steps: z.array(z.object({
    label: z.string().min(1),
    detail: z.string().optional(),
    accent: z.string().optional(),
  })).min(1).max(5),
  accent: z.string().optional(),
});

const SkillIconSchema = z.enum(SKILL_ICON_KEYS);
const ProductIconSchema = z.enum(PRODUCT_ICON_KEYS);
const SkillBeatMotionPresetSchema = z.enum([
  'slow-rise',
  'scan-lock',
  'number-roll',
  'split-reveal',
  'card-regroup',
  'icon-relay',
  'focus-pulse',
  'flash-cut',
]);
const SkillBeatPlacementSchema = z.enum(['bottom', 'body', 'highlight']);
const SkillBeatShotPresetSchema = z.enum([
  'kinetic-type',
  'split-wipe',
  'particle-field',
  'orbital-map',
  'ui-scan',
  'material-carousel',
  'focus-lock',
  'pipeline-flow',
  'token-assembly',
  'surface-morph',
  'system-convergence',
]);
const SkillBeatHeroPresetSchema = z.enum([
  'browser-demo',
  'terminal-run',
  'code-diff',
  'config-inspector',
  'ui-audit',
  'workflow-trace',
  'test-report',
  'asset-gallery',
  'system-map',
  'before-after',
]);

const TechnicalWorkbenchLensSchema = z.enum([
  'source-diff',
  'terminal-run',
  'manifest-resolve',
  'design-inspector',
  'rule-counter',
  'category-index',
  'live-scan',
  'snapshot-compare',
  'repo-signal',
  'direction-picker',
  'style-lock',
  'anchor-map',
  'deny-list',
  'skill-gate',
  'knowledge-vault',
  'catalog-metrics',
  'token-assembly',
  'scenario-switch',
  'blank-audit',
  'brand-pack',
  'brand-style-map',
  'system-graph',
]);

const SkillShowcasePayloadSchema = z.object({
  variant: z.enum(['intro', 'overview', 'coding', 'remotion', 'ppt', 'illustration', 'hyperframes', 'ui', 'outro', 'impeccable', 'frontend-design', 'ux-pro', 'cloud-design', 'generic']),
  visualMode: z.enum(['hero', 'grid', 'compare', 'process', 'metrics', 'quote']).optional(),
  heroStyle: z.enum(['cinematic', 'tech-explainer', 'technical-workbench-v2', 'hero-track-v2']).optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  index: z.string().min(1).max(4).optional(),
  accent: z.string().min(1).optional(),
  secondaryAccent: z.string().min(1).optional(),
  bullets: z.array(z.string().min(1)).max(6).optional(),
  labels: z.array(z.string().min(1)).max(8).optional(),
  labelIcons: z.array(SkillIconSchema).max(8).optional(),
  productIcon: ProductIconSchema.optional(),
  productIcons: z.array(ProductIconSchema).max(8).optional(),
  brandName: z.string().min(1).max(32).optional(),
  brandIcon: ProductIconSchema.optional(),
  eyebrow: z.string().min(1).max(80).optional(),
  headline: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(120).optional(),
  footer: z.string().min(1).max(120).optional(),
  progressIndex: z.number().int().nonnegative().max(24).optional(),
  progressTotal: z.number().int().positive().max(24).optional(),
  captionStartIndex: z.number().int().nonnegative().optional(),
  captionEndIndex: z.number().int().nonnegative().optional(),
  narrativeSignal: z.object({
    key: z.string().min(1).max(48),
    family: z.string().min(1).max(80),
  }).optional(),
  layoutSignature: z.string().min(1).max(64).optional(),
  sourceText: z.string().min(1).max(800).optional(),
  workbench: z.object({
    kind: z.enum(['ide-terminal', 'audit-trace', 'prompt-pipeline', 'design-system-lab', 'architecture-workspace']),
    title: z.string().min(1).max(64),
    context: z.string().min(1).max(100),
    files: z.array(z.string().min(1).max(48)).max(8).optional(),
    steps: z.array(z.object({
      captionIndex: z.number().int().nonnegative(),
      lens: TechnicalWorkbenchLensSchema.optional(),
      objective: z.string().min(1).max(100),
      actionLabel: z.string().min(1).max(48),
      command: z.string().min(1).max(100).optional(),
      target: z.string().min(1).max(64).optional(),
      file: z.string().min(1).max(64).optional(),
      before: z.array(z.string().max(100)).max(10).optional(),
      after: z.array(z.string().max(100)).max(10).optional(),
      logs: z.array(z.string().min(1).max(100)).max(8).optional(),
      evidence: z.array(z.object({
        label: z.string().min(1).max(48),
        value: z.string().min(1).max(48),
        source: z.enum(['script', 'derived', 'demo']),
        status: z.enum(['pass', 'fail', 'info']).optional(),
      })).min(1).max(6),
    // A workbench renders one active evidence step at a time. Long spoken
    // scenes can legitimately contain more than eight caption-bound beats.
    })).min(1).max(16),
  }).optional(),
  heroTrack: z.object({
    kind: z.enum(['overview-matrix', 'rule-compare', 'code-render', 'slide-editor', 'article-map', 'video-agent', 'design-compare', 'system-summary', 'generic-explainer']),
    captionStartIndex: z.number().int().nonnegative(),
    captionEndIndex: z.number().int().nonnegative(),
    states: z.array(z.object({
      startFrame: z.number().int().nonnegative(),
      endFrame: z.number().int().positive(),
      captionStartIndex: z.number().int().nonnegative(),
      captionEndIndex: z.number().int().nonnegative(),
      label: z.string().min(1).max(32),
      detail: z.string().min(1).max(120),
      evidence: z.array(z.string().min(1).max(48)).max(5).optional(),
      entityTarget: z.string().min(1).max(48).optional(),
      cinematicPreset: SkillBeatShotPresetSchema.optional(),
    })).min(1).max(6),
  }).optional(),
  beats: z.array(z.object({
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
    captionStartIndex: z.number().int().nonnegative().optional(),
    captionEndIndex: z.number().int().nonnegative().optional(),
    keyword: z.string().min(1).max(24),
    icon: SkillIconSchema,
    action: z.enum(['spotlight', 'stamp', 'trace', 'compare', 'counter', 'stack', 'focus', 'burst']),
    visualState: z.string().min(1).max(48).optional(),
    motionPreset: SkillBeatMotionPresetSchema.optional(),
    placement: SkillBeatPlacementSchema.optional(),
    shotPreset: SkillBeatShotPresetSchema.optional(),
    heroPreset: SkillBeatHeroPresetSchema.optional(),
    detail: z.string().min(1).max(60).optional(),
    evidence: z.array(z.string().min(1).max(28)).max(4).optional(),
    value: z.string().min(1).max(18).optional(),
  })).max(12).optional(),
}).superRefine((payload, ctx) => {
  payload.beats?.forEach((beat, index) => {
    if (beat.endFrame <= beat.startFrame) {
      ctx.addIssue({code: 'custom', message: 'endFrame must be greater than startFrame', path: ['beats', index, 'endFrame']});
    }
    const previous = payload.beats?.[index - 1];
    if (previous && beat.startFrame < previous.startFrame) {
      ctx.addIssue({code: 'custom', message: 'beats must be ordered by startFrame', path: ['beats', index, 'startFrame']});
    }
  });
});

/** 松散 schema — 允许任何 payload 通过，用于没有严格校验的 family */
const PermissiveSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

// ── Swiss family payload schemas（Swiss 极简口播系列）─────────────────────
// Swiss scene 的"编号/总页/源/章节"作为可选 meta 字段透传，组件用以渲染顶/底栏。
// 各 family 的核心字段必填，其余可选。无 accent 字段 — Swiss 用固定克制的红，
// 不走工程的 accent 色彩机制（也就是拒绝从 payload 传 'purple' 进来）。
const SwissMetaSchema = z.object({
  index: z.string().min(1).max(4).optional(),
  total: z.number().int().positive().max(99).optional(),
  chapter: z.string().min(1).max(48).optional(),
  source: z.string().min(1).max(80).optional(),
}).partial();

const SwissTitlePayloadSchema = SwissMetaSchema.extend({
  title: z.string().min(1).max(120),
  kicker: z.string().min(1).max(48).optional(),
  subtitle: z.string().min(1).max(160).optional(),
  caption: z.string().min(1).max(160).optional(),
});

const SwissQuestionPayloadSchema = SwissMetaSchema.extend({
  question: z.string().min(1).max(120),
  crossedOut: z.string().min(1).max(120).optional(),
  caption: z.string().min(1).max(160).optional(),
});

const SwissListItemSchema = z.union([
  z.string().min(1),
  z.object({code: z.string().min(1).max(8), label: z.string().min(1).max(80)}),
]);
const SwissListPayloadSchema = SwissMetaSchema.extend({
  items: z.array(SwissListItemSchema).min(1).max(16),
  heading: z.string().min(1).max(80).optional(),
  bigNumber: z.string().min(1).max(8).optional(),
  bigLabel: z.string().min(1).max(48).optional(),
});

const SwissCompareSideSchema = z.object({
  tag: z.string().min(1).max(48).optional(),
  claim: z.string().min(1).max(80).optional(),
  bullets: z.array(z.string().min(1).max(40)).max(6).optional(),
  mock: z.enum(['default-ai', 'swiss-anchored']),
});
const SwissComparePayloadSchema = SwissMetaSchema.extend({
  left: SwissCompareSideSchema.optional(),
  right: SwissCompareSideSchema.optional(),
  heading: z.string().min(1).max(80).optional(),
  sharedPrompt: z.string().min(1).max(120).optional(),
});

const SwissNumberPayloadSchema = SwissMetaSchema.extend({
  number: z.string().min(1).max(16),
  unit: z.string().min(1).max(48).optional(),
  caption: z.string().min(1).max(160).optional(),
});

const SwissTileSchema = z.object({
  code: z.string().min(1).max(8),
  label: z.string().min(1).max(48),
  detail: z.string().min(1).max(120).optional(),
});
const SwissGridPayloadSchema = SwissMetaSchema.extend({
  tiles: z.array(SwissTileSchema).min(1).max(9),
  heading: z.string().min(1).max(80).optional(),
  highlightIndex: z.number().int().nonnegative().max(8).optional(),
  columns: z.number().int().positive().max(4).optional(),
});

const SwissFlowStepSchema = z.object({
  label: z.string().min(1).max(48),
  detail: z.string().min(1).max(120).optional(),
});
const SwissFlowPayloadSchema = SwissMetaSchema.extend({
  steps: z.array(SwissFlowStepSchema).min(1).max(6),
  heading: z.string().min(1).max(80).optional(),
});

const SwissTabularRowSchema = z.object({
  code: z.string().min(1).max(8),
  dimension: z.string().min(1).max(48),
  tokens: z.array(z.string().min(1).max(32)).min(1).max(8),
});
const SwissTabularPayloadSchema = SwissMetaSchema.extend({
  rows: z.array(SwissTabularRowSchema).min(1).max(8),
  heading: z.string().min(1).max(80).optional(),
});

const SwissStampPayloadSchema = SwissMetaSchema.extend({
  headline: z.string().min(1).max(80),
  subhead: z.string().min(1).max(160).optional(),
  stamp: z.string().min(1).max(24).optional(),
});

// ─── Family → 组件/Schema 注册表 ──────────────────────────────────────
// 与 registry.ts 的 ALL_FAMILIES 对齐

interface FamilyRegistration {
  component: React.ComponentType<Record<string, unknown>>;
  schema: z.ZodType;
}

const FAMILY_COMPONENT_REGISTRY: Record<string, FamilyRegistration> = {
  // ── Spoken 口播家族 ──
  'spoken-title':    {component: SpokenTitle as unknown as React.ComponentType<Record<string, unknown>>, schema: TitlePayloadSchema},
  'spoken-metric':   {component: SpokenMetric as unknown as React.ComponentType<Record<string, unknown>>, schema: ItemsPayloadSchema},
  'spoken-process':  {component: SpokenProcess as unknown as React.ComponentType<Record<string, unknown>>, schema: ProcessPayloadSchema},
  'spoken-ranking':  {component: SpokenRanking as unknown as React.ComponentType<Record<string, unknown>>, schema: ItemsPayloadSchema},
  'spoken-compare':  {component: SpokenCompare as unknown as React.ComponentType<Record<string, unknown>>, schema: ItemsPayloadSchema},
  'spoken-tags':     {component: SpokenTags as unknown as React.ComponentType<Record<string, unknown>>, schema: ItemsPayloadSchema},
  'spoken-code':     {component: SpokenCode as unknown as React.ComponentType<Record<string, unknown>>, schema: ItemsPayloadSchema},
  'spoken-takeaway': {component: SpokenTitle as unknown as React.ComponentType<Record<string, unknown>>, schema: TitlePayloadSchema},

  // ── Ultimate 完整家族 ──
  'hero':              {component: UltimateHeroPanel as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'feature-rail':      {component: UltimateFeatureCardRail as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'focus':             {component: UltimateFocusDiagram as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'number-strip':      {component: UltimateNumberStrip as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'step-flow':         {component: UltimateStepFlow as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'timeline':          {component: UltimateTimeline as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'compare-board':     {component: UltimateCompareBoard as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'terminal':          {component: UltimateTerminalPanel as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'skill-showcase':    {component: SkillShowcase as unknown as React.ComponentType<Record<string, unknown>>, schema: SkillShowcasePayloadSchema},
  'evidence-wall':     {component: UltimateEvidenceWall as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'architecture-map':  {component: UltimateArchitectureMap as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'tag-matrix':        {component: UltimateTagMatrix as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'code':              {component: UltimateCodePanel as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'metrics':           {component: UltimateMetricBars as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'data-stream':       {component: UltimateDataStream as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  /** @deprecated Use 'architecture-map' instead */
  'memory-graph':      {component: UltimateArchitectureMap as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  /** @deprecated Use 'step-flow' instead */
  'pipeline-flow':     {component: UltimateStepFlow as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'benchmark-chart':   {component: UltimateBenchmarkChart as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'quote-highlight':   {component: UltimateQuoteHighlight as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'glossary-term':     {component: UltimateGlossaryTerm as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'cta':               {component: UltimateCtaPanel as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},

  // ── Minimal 抖音风格家族 ──
  'minimal-hero':         {component: MinimalHero as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'minimal-step-flow':    {component: MinimalStepFlow as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'minimal-tag-matrix':   {component: MinimalTagMatrix as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'minimal-number-strip': {component: MinimalNumberStrip as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'minimal-timeline':     {component: MinimalTimeline as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},
  'minimal-compare-board': {component: MinimalCompareBoard as unknown as React.ComponentType<Record<string, unknown>>, schema: PermissiveSchema},

  // ── Swiss (Swiss 极简口播 · 反平均审美) family ──
  // 组件自带白底 #fafafa，盖过 ProjectSceneRegistry 的深色 #05070d 外壳 + 径向光晕。
  'swiss-title':    {component: SwissTitle    as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissTitlePayloadSchema},
  'swiss-question': {component: SwissQuestion as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissQuestionPayloadSchema},
  'swiss-list':     {component: SwissList     as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissListPayloadSchema},
  'swiss-compare':  {component: SwissCompare  as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissComparePayloadSchema},
  'swiss-number':   {component: SwissNumber   as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissNumberPayloadSchema},
  'swiss-grid':     {component: SwissGrid     as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissGridPayloadSchema},
  'swiss-flow':     {component: SwissFlow     as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissFlowPayloadSchema},
  'swiss-tabular':  {component: SwissTabular  as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissTabularPayloadSchema},
  'swiss-stamp':    {component: SwissStamp    as unknown as React.ComponentType<Record<string, unknown>>, schema: SwissStampPayloadSchema},
};

/** 公开类型 — 与 registry.ts 的 ALL_FAMILIES 对齐 */
export type ProjectSceneFamily = (typeof ALL_FAMILIES)[number];

/** 所有已注册 family 名称列表 */
export const PROJECT_SCENE_FAMILIES = ALL_FAMILIES as readonly string[];

// ─── accent 颜色解析 ─────────────────────────────────────────────────

/** family accent 名称 → hex 颜色映射 */
const ACCENT_HEX: Record<string, string> = {
  cyan: '#00f5ff',
  purple: '#a78bfa',
  amber: '#ffd43b',
  green: '#10ff8a',
  red: '#ff4d6d',
  orange: '#ffad63',
  yellow: '#ffd66c',
  lime: '#cdff3d',
};

/**
 * 从 payload accent 字段解析 hex 颜色。
 * 支持命名颜色（'cyan'、'purple' 等）和直接 hex（'#00f5ff'）。
 * 兜底返回 cyan。
 */
const resolveAccent = (accent?: string): string => {
  if (!accent) return '#00f5ff';
  if (accent.startsWith('#')) return accent;
  return ACCENT_HEX[accent] ?? '#00f5ff';
};

// ─── payload 解析 ────────────────────────────────────────────────────

/**
 * 解析场景 payload：校验 family 存在于权威注册表，再校验 payload schema。
 * 使用 PermissiveSchema 的 family 允许任意 payload 通过（仅作类型收窄）。
 */
export const parseProjectScenePayload = (
  family: string,
  payload: Record<string, unknown>,
  path: string,
): {family: ProjectSceneFamily; payload: Record<string, unknown>} => {
  // 步骤 1：校验 family 存在于权威列表
  if (!ALL_FAMILIES.includes(family as UltimateSceneFamily)) {
    throw new ProjectValidationError(
      'FAMILY_UNREGISTERED',
      `${path}.family`,
      `unsupported family: "${family}". Valid: ${ALL_FAMILIES.join(', ')}`,
    );
  }

  // 步骤 2：查找组件注册
  const registration = FAMILY_COMPONENT_REGISTRY[family];
  if (!registration) {
    throw new ProjectValidationError(
      'FAMILY_UNREGISTERED',
      `${path}.family`,
      `family "${family}" is defined in registry.ts but has no component mapping`,
    );
  }

  // 步骤 3：payload schema 校验
  const parsed = registration.schema.safeParse(payload);
  if (!parsed.success) {
    // PermissiveSchema 下不抛出 — 允许任意 payload 通过
    if (registration.schema === PermissiveSchema) {
      return {family: family as ProjectSceneFamily, payload};
    }
    const issue = parsed.error.issues[0];
    const issuePath = formatProjectPath(issue.path);
    throw new ProjectValidationError(
      'SCENE_PAYLOAD_INVALID',
      issuePath ? `${path}.payload.${issuePath}` : `${path}.payload`,
      issue.message,
    );
  }

  return {family: family as ProjectSceneFamily, payload: parsed.data as Record<string, unknown>};
};

// ─── 资产图片渲染 ────────────────────────────────────────────────────

const resolveImageSrc = (asset: CompiledAsset) =>
  asset.source === 'remote' ? asset.src : staticFile(asset.src);

const SceneAsset: React.FC<{assets: CompiledAsset[]; accent: string}> = ({assets, accent}) => {
  const image = assets.find((a) => a.kind === 'image');
  if (!image) return null;
  if (!image.available) {
    return (
      <div
        data-asset-fallback={image.id}
        style={{
          position: 'absolute',
          right: 86,
          top: 126,
          width: 300,
          height: 300,
          border: `1px solid ${accent}55`,
          background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,0.025))`,
          display: 'grid',
          placeItems: 'center',
          color: `${accent}aa`,
          fontSize: 72,
          fontWeight: 900,
        }}
      >
        +
      </div>
    );
  }
  return (
    <Img
      src={resolveImageSrc(image)}
      style={{
        position: 'absolute',
        right: 76,
        top: 112,
        width: 340,
        height: 340,
        objectFit: 'contain',
        opacity: 0.7,
      }}
    />
  );
};

// ─── 场景渲染组件 ────────────────────────────────────────────────────

export const ProjectSceneRegistry: React.FC<{
  scene: CompiledProjectScene;
  sceneIndex: number;
  qualityMode: CompiledProject['qualityMode'];
}> = ({scene, sceneIndex, qualityMode}) => {
  const registration = FAMILY_COMPONENT_REGISTRY[scene.family];
  if (!registration) {
    console.warn(`[sceneRegistry] no component found for family="${scene.family}"`);
    return null;
  }

  const Component = registration.component;
  const accent = resolveAccent(
    typeof scene.payload.accent === 'string' ? scene.payload.accent : undefined,
  );
  const isSpokenFamily = scene.family.startsWith('spoken-');

  return (
    <AbsoluteFill
      data-scene-id={scene.id}
      data-family={scene.family}
      style={{
        overflow: 'hidden',
        background: '#05070d',
        color: '#f8fafc',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 网格背景 */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            `linear-gradient(${accent}12 1px, transparent 1px)`,
            `linear-gradient(90deg, ${accent}12 1px, transparent 1px)`,
          ].join(', '),
          backgroundSize: '52px 52px',
          opacity: qualityMode === 'cinematic' ? 0.72 : 0.45,
        }}
      />
      {/* 径向光晕 */}
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 50% 42%, ${accent}24, transparent 34%)`}}
      />

      {/* 口播装饰层 — 仅对 spoken-* family 渲染 */}
      {isSpokenFamily && (
        <SpokenAssetLayer
          family={scene.family}
          index={sceneIndex}
          subtitle={String(scene.payload.subtitle ?? scene.payload.heading ?? '')}
        />
      )}

      <SceneAsset assets={scene.assets} accent={accent} />

      {/* family 组件 — 接收 payload 作为 props */}
      <Component {...scene.payload} assets={scene.assets} />
    </AbsoluteFill>
  );
};
