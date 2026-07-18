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

const SkillShowcasePayloadSchema = z.object({
  variant: z.enum(['intro', 'overview', 'coding', 'remotion', 'ppt', 'illustration', 'hyperframes', 'ui', 'outro']),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  index: z.string().min(1).max(4).optional(),
  accent: z.string().min(1).optional(),
  secondaryAccent: z.string().min(1).optional(),
  bullets: z.array(z.string().min(1)).max(6).optional(),
  labels: z.array(z.string().min(1)).max(8).optional(),
  beats: z.array(z.object({
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
    keyword: z.string().min(1).max(24),
    icon: SkillIconSchema,
    action: z.enum(['spotlight', 'stamp', 'trace', 'compare', 'counter', 'stack', 'focus', 'burst']),
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
