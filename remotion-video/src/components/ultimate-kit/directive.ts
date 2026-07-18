/**
 * directive.ts — 导演总谱 → 场景指令 解析引擎
 *
 * 是 DirectorScore 和 family 之间的唯一桥梁。
 * 所有 family 调用 resolveSceneDirective(grammar, familyId) 拿到完整视觉指令，
 * 不再各自散装调用 archetypeToContentStyle() / cameraIntentToSpacing()。
 */

import type {UltimateSceneGrammar} from './types';
import type {UltimateAccentTone} from './tokens';
import {archetypeToHeadingStyle, archetypeToEyebrowStyle, cameraIntentToSpacing} from './heading';
import {resolveUltimateAccent, ultimateGlow} from './tokens';
import type {CSSProperties} from 'react';

// ── 输出类型 ──────────────────────────────────────────────────────────

export type EnterStyle = 'fade' | 'slide' | 'scale' | 'burst' | 'spring';
export type LoopStyle = 'float' | 'pulse' | 'drift' | 'none';

export interface SceneDirective {
  /** 字号/字重/行高体系 */
  typography: {
    heading: ReturnType<typeof archetypeToHeadingStyle>;
    eyebrow: ReturnType<typeof archetypeToEyebrowStyle>;
    body: {size: number; lineHeight: number; weight: number};
    label: {size: number; letterSpacing: number; weight: number};
    value: {size: number; weight: number};
    useTextMaskWipe: boolean;
  };
  /** 间距/密度/布局 */
  spacing: {
    paddingX: number;
    paddingY: number;
    gap: number;
    innerGap: number;
    density: 'compact' | 'normal' | 'spacious';
  };
  /** 元素入场/驻留动画 */
  animation: {
    enterStyle: EnterStyle;
    enterDirection: 'left' | 'right' | 'up' | 'down' | 'center' | 'none';
    staggerGap: number;
    staggerDirection: 'left' | 'right' | 'up' | 'down';
    loopStyle: LoopStyle;
    microJitterProfile: 'steady' | 'standard' | 'playful';
  };
  /** 关键词强调 */
  emphasis: {
    memoryTerm?: string;
    memoryColor?: string;
    mode: 'glow' | 'color' | 'none';
  };
  /** 气氛透明度 */
  atmosphere: {
    textOpacity: number;
    labelOpacity: number;
    decorationOpacity: number;
  };
}

// ── 数据事件 → 入场动画映射 ──────────────────────────────────────────

const DATA_EVENT_TO_ANIM: Record<string, {
  enterStyle: EnterStyle;
  enterDirection: 'left' | 'right' | 'up' | 'down' | 'center' | 'none';
  staggerDirection: 'left' | 'right' | 'up' | 'down';
  loopStyle: LoopStyle;
}> = {
  'trace-flow':   {enterStyle: 'slide',   enterDirection: 'left',  staggerDirection: 'right', loopStyle: 'drift'},
  'burst-spread': {enterStyle: 'burst',   enterDirection: 'center', staggerDirection: 'up',    loopStyle: 'float'},
  'count-up':     {enterStyle: 'scale',   enterDirection: 'none',   staggerDirection: 'down',  loopStyle: 'none'},
  'settle':       {enterStyle: 'spring',  enterDirection: 'up',     staggerDirection: 'down',  loopStyle: 'none'},
  'pin':          {enterStyle: 'fade',    enterDirection: 'none',    staggerDirection: 'down',  loopStyle: 'none'},
};

const DEFAULT_ANIM = DATA_EVENT_TO_ANIM['settle'];

// ── 镜头意图 → 密度映射 ──────────────────────────────────────────────

const CAMERA_INTENT_TO_DENSITY: Record<string, 'compact' | 'normal' | 'spacious'> = {
  pin:      'compact',
  drift:    'normal',
  reveal:   'normal',
  linger:   'spacious',
  compress: 'compact',
};

// ── 镜头意图 → 微抖动 ─────────────────────────────────────────────────

const CAMERA_INTENT_TO_JITTER: Record<string, 'steady' | 'standard' | 'playful'> = {
  pin:      'steady',
  drift:    'standard',
  reveal:   'standard',
  linger:   'playful',
  compress: 'steady',
};

// ── 主解析函数 ────────────────────────────────────────────────────────

/**
 * resolveSceneDirective — 一条命令替 10 个 family 做所有导演决策。
 *
 * 接收导演批注 + family 标识，返回完整渲染指令。
 * family 无需再猜字号/动画/间距，照单全收即可。
 */
export function resolveSceneDirective(
  grammar: UltimateSceneGrammar | undefined | null,
  _familyId: string,
): SceneDirective {
  const archetype = grammar?.archetype;
  const cameraIntent = grammar?.cameraIntent;
  const dataEvent = grammar?.dataEvent;
  const memoryObject = grammar?.memoryObject;

  // ── 1. 字体系 ────────────────────────────────────────────
  const heading = archetypeToHeadingStyle(archetype);
  const eyebrow = archetypeToEyebrowStyle(archetype);
  const useTextMaskWipe = heading.useTextMaskWipe;

  // 现在每个 archetype 的差异做到 20-40%，肉眼一定看得出
  const TYPO_BY_ARCHETYPE: Record<string, {
    body: {size: number; lineHeight: number; weight: number};
    label: {size: number; letterSpacing: number; weight: number};
    value: {size: number; weight: number};
  }> = {
    'lock-on reveal': {
      body:   {size: 20, lineHeight: 1.36, weight: 500},
      label:  {size: 16, letterSpacing: 3.6, weight: 780},
      value:  {size: 34, weight: 900},
    },
    'drift reveal': {
      body:   {size: 17, lineHeight: 1.5,  weight: 440},
      label:  {size: 13, letterSpacing: 2.6, weight: 720},
      value:  {size: 26, weight: 840},
    },
    'burst spread': {
      body:   {size: 16, lineHeight: 1.56, weight: 420},
      label:  {size: 12, letterSpacing: 2.2, weight: 700},
      value:  {size: 24, weight: 820},
    },
    'compress compare': {
      body:   {size: 14, lineHeight: 1.44, weight: 500},
      label:  {size: 10, letterSpacing: 1.8, weight: 680},
      value:  {size: 20, weight: 800},
    },
  };
  const typo = TYPO_BY_ARCHETYPE[archetype ?? ''] ?? TYPO_BY_ARCHETYPE['drift reveal'];

  // ── 2. 间距 ──────────────────────────────────────────────
  const cameraSpacing = cameraIntentToSpacing(cameraIntent);
  const density = CAMERA_INTENT_TO_DENSITY[cameraIntent ?? ''] ?? 'normal';

  // ── 3. 动画 ──────────────────────────────────────────────
  const animConfig = DATA_EVENT_TO_ANIM[dataEvent ?? ''] ?? DEFAULT_ANIM;
  const staggerGap = grammar?.staggerGap ?? 6;
  const microJitterProfile = CAMERA_INTENT_TO_JITTER[cameraIntent ?? ''] ?? 'standard';

  // ── 4. 强调 ──────────────────────────────────────────────
  const emphasis: SceneDirective['emphasis'] = {
    memoryTerm: memoryObject?.role
      ? memoryObject.role.replace(/^核心概念:\s*/u, '')
      : undefined,
    memoryColor: memoryObject?.color
      ? resolveUltimateAccent(memoryObject.color as UltimateAccentTone)
      : undefined,
    mode: memoryObject ? 'glow' : 'none',
  };

  // ── 5. 气氛 ──────────────────────────────────────────────
  const atmosphere: SceneDirective['atmosphere'] = (() => {
    switch (archetype) {
      case 'lock-on reveal':
        return {textOpacity: 0.88, labelOpacity: 0.60, decorationOpacity: 0.22};
      case 'burst spread':
        return {textOpacity: 0.78, labelOpacity: 0.54, decorationOpacity: 0.18};
      case 'compress compare':
        return {textOpacity: 0.64, labelOpacity: 0.44, decorationOpacity: 0.10};
      default:
        return {textOpacity: 0.74, labelOpacity: 0.50, decorationOpacity: 0.14};
    }
  })();

  return {
    typography: {
      heading,
      eyebrow,
      ...typo,
      useTextMaskWipe,
    },
    spacing: {
      ...cameraSpacing,
      density,
    },
    animation: {
      ...animConfig,
      staggerGap,
      microJitterProfile,
    },
    emphasis,
    atmosphere,
  };
}

// ── 动画辅助函数 ──────────────────────────────────────────────────────

/**
 * 根据 directive 的动画配置，决定元素入场动画参数。
 *
 * 进入动画：
 *  fade    → 只用 opacity 过渡
 *  slide   → 从指定方向滑入，配合 useStaggerSlide
 *  scale   → 从 0.7 弹入，配合 useScaleEmphasis
 *  burst   → 从中心爆发，配合 useStaggerScale
 *  spring  → 弹性入，配合 useTextSlideIn
 *
 * @returns staggerSlide 所需的 direction/distance, 以及是否使用 scale/burst
 */
export function resolveEntranceParams(d: SceneDirective): {
  useScale: boolean;
  useSlide: boolean;
  useFade: boolean;
  slideDirection: 'left' | 'right' | 'up' | 'down';
  slideDistance: number;
  scaleFrom: number;
} {
  switch (d.animation.enterStyle) {
    case 'slide':
      return {
        useScale: false, useSlide: true, useFade: false,
        slideDirection: d.animation.staggerDirection,
        slideDistance: 28, scaleFrom: 0.8,
      };
    case 'scale':
      return {
        useScale: true, useSlide: false, useFade: false,
        slideDirection: 'down', slideDistance: 24,
        scaleFrom: 0.7,
      };
    case 'burst':
      return {
        useScale: true, useSlide: false, useFade: false,
        slideDirection: 'up', slideDistance: 30,
        scaleFrom: 0.5,
      };
    case 'spring':
      return {
        useScale: false, useSlide: true, useFade: false,
        slideDirection: 'up', slideDistance: 22,
        scaleFrom: 0.9,
      };
    case 'fade':
    default:
      return {
        useScale: false, useSlide: false, useFade: true,
        slideDirection: 'down', slideDistance: 16,
        scaleFrom: 0.95,
      };
  }
}

/**
 * 计算强调样式 — 为 memoryObject 的关键词添加高亮。
 */
export function computeEmphasisStyle(d: SceneDirective): CSSProperties | null {
  if (d.emphasis.mode === 'none' || !d.emphasis.memoryColor) {
    return null;
  }
  return {
    color: d.emphasis.memoryColor,
    textShadow: ultimateGlow(d.emphasis.memoryColor, 0.6),
  };
}
