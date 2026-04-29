/**
 * gradient.ts — Oklch 渐变引擎
 * 借鉴 remotion-bits GradientTransition 设计
 * 支持 linear/radial/conic 渐变互转 + shortest-angle 角度插值 + Oklch 感知均匀色彩
 */

import { useCurrentFrame, interpolate } from 'remotion';

// 动态导入 culori（避免 SSR 问题）
let culori: typeof import('culori') | null = null;
async function getCulori() {
  if (!culori) {
    culori = await import('culori');
  }
  return culori;
}

// ===== 预定义调色板（Oklch）=====

export const OklchPalette = {
  // 科技蓝
  techBlue: {
    from: { l: 0.65, c: 0.17, h: 230 },
    to:   { l: 0.75, c: 0.12, h: 210 },
  },
  // 烈焰橙
  flame: {
    from: { l: 0.60, c: 0.22, h: 40 },
    to:   { l: 0.70, c: 0.18, h: 60 },
  },
  // 极光绿
  aurora: {
    from: { l: 0.65, c: 0.16, h: 140 },
    to:   { l: 0.75, c: 0.14, h: 160 },
  },
  // 赛博紫
  cyber: {
    from: { l: 0.65, c: 0.20, h: 280 },
    to:   { l: 0.70, c: 0.18, h: 320 },
  },
  // 黄金
  gold: {
    from: { l: 0.70, c: 0.18, h: 80 },
    to:   { l: 0.80, c: 0.15, h: 100 },
  },
} as const;

export type PaletteName = keyof typeof OklchPalette;

// ===== 色彩插值 =====

/**
 * oklchInterpolate — 在 Oklch 色空间做感知均匀插值
 * 渐变过渡比 RGB/HSL 更平滑自然
 */
export async function oklchInterpolate(
  from: { l: number; c: number; h: number },
  to: { l: number; c: number; h: number },
  t: number
): Promise<string> {
  const c = await getCulori();
  const f = c.oklch(from.l, from.c, from.h);
  const tt = c.oklch(to.l, to.c, to.h);
  const result = c.interpolate(f, tt, t, 'oklch');
  return c.formatHex(result);
}

/**
 * oklchInterpolateSync — 同步版本（使用预计算近似）
 * 在 Remotion render 中更可靠
 */
export function oklchInterpolateSync(
  from: { l: number; c: number; h: number },
  to: { l: number; c: number; h: number },
  t: number
): string {
  // 线性插值（简化版，在渲染上下文中 culori 动态导入有风险）
  // 色相用 shortest angle 路径
  let hFrom = from.h;
  let hTo = to.h;
  const diff = hTo - hFrom;
  if (diff > 180) hTo -= 360;
  else if (diff < -180) hTo += 360;

  const l = from.l + (to.l - from.l) * t;
  const c = from.c + (to.c - from.c) * t;
  const h = hFrom + (hTo - hFrom) * t;

  // 转回 hex（近似）
  return oklchToHex(l, c, h);
}

/**
 * oklchToHex — Oklch → Hex（简化近似）
 */
function oklchToHex(l: number, c: number, h: number): string {
  // 简化的 Oklch → sRGB 转换
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // 近似 Lab → XYZ → sRGB → Hex
  // 这是简化实现，生产环境建议用 culori 库的 formatHex
  const l_ = l;
  const d = 0.1553 * l_ * l_ + 0.5431 * l_ - 0.091 * a - 0.0632;

  let r = l_ + 0.2973 * a + 0.1333 * b;
  let g = l_ - 0.256 * a - 0.0633 * b;
  let bb = l_ - 0.0257 * a + 0.1333 * b;

  // gamma 校正
  const gamma = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  r = gamma(Math.max(0, Math.min(1, r / (l_ + 0.1))));
  g = gamma(Math.max(0, Math.min(1, g / (l_ + 0.1))));
  bb = gamma(Math.max(0, Math.min(1, bb / (l_ + 0.1))));

  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(bb * 255);

  return `#${((1 << 24) + (ri << 16) + (gi << 8) + bi).toString(16).slice(1)}`;
}

// ===== 角度插值 =====

/**
 * interpolateAngle — 最短路径角度插值
 * 350° → 10° 走 0° 路径（顺时针5°），不是逆时针340°
 */
export function interpolateAngle(
  from: number,
  to: number,
  t: number
): number {
  let diff = to - from;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  return from + diff * t;
}

// ===== Gradient Transition 组件 Props =====

export type GradientType = 'linear' | 'radial' | 'conic';

export interface GradientTransitionProps {
  fromColor?: string;
  toColor?: string;
  fromAngle?: number;
  toAngle?: number;
  type?: GradientType;
  animated?: boolean;
  speed?: number; // 每帧旋转角度（度）
}

// ===== 预制渐变背景 =====

export interface GradientBackgroundProps {
  colors?: [string, string, ...string[]];
  angle?: number;
  type?: GradientType;
  animated?: boolean;
  frame?: number;
  style?: React.CSSProperties;
}

/**
 * 生成 CSS gradient 字符串
 */
export function buildGradientCSS(params: {
  colors: string[];
  angle: number;
  type: GradientType;
}): string {
  const { colors, angle, type } = params;
  const colorStops = colors.join(', ');

  switch (type) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${colorStops})`;
    case 'radial':
      return `radial-gradient(circle, ${colorStops})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg at 50% 50%, ${colorStops})`;
    default:
      return `linear-gradient(${angle}deg, ${colorStops})`;
  }
}

/**
 * AnimatedGradient — 动态渐变背景
 * 支持多档色彩、旋转角度动画
 */
export function useAnimatedGradient(params: {
  palette: PaletteName;
  type?: GradientType;
  animated?: boolean;
  animatedAngle?: boolean;
  frame?: number;
  fromAngle?: number;
  toAngle?: number;
  speed?: number;
}) {
  const {
    palette,
    type = 'linear',
    animated = false,
    animatedAngle = false,
    frame: frameProp,
    fromAngle = 0,
    toAngle = 180,
    speed = 0.5,
  } = params;

  const internalFrame = useCurrentFrame();
  const frame = frameProp ?? internalFrame;

  const pal = OklchPalette[palette];
  const t = animated ? (Math.sin(frame * speed * 0.02) + 1) / 2 : 1;

  // 角度插值（shortest path）
  const angle = animatedAngle
    ? interpolateAngle(fromAngle, toAngle, t)
    : fromAngle;

  // 色彩插值
  const fromHex = oklchInterpolateSync(pal.from, pal.to, t);
  const midHex = oklchInterpolateSync(pal.from, pal.to, 0.5);
  const toHex = oklchInterpolateSync(pal.from, pal.to, Math.min(1, t + 0.3));

  const css = buildGradientCSS({
    colors: [pal.from ? oklchToHex(pal.from.l, pal.from.c, pal.from.h) : '#000',
             fromHex, midHex, toHex],
    angle,
    type,
  });

  return { css, angle, fromHex, toHex, midHex };
}

// ===== 高阶：获取带渐变的文字样式 =====

export interface GradientTextStyle {
  background: string;
  WebkitBackgroundClip: string;
  WebkitTextFillColor: string;
  backgroundClip: string;
}

/**
 * buildGradientTextStyle — 生成渐变文字样式
 * 基于 Oklch 调色板
 */
export function buildGradientTextStyle(
  palette: PaletteName,
  angle: number = 90
): GradientTextStyle {
  const pal = OklchPalette[palette];
  const from = oklchToHex(pal.from.l, pal.from.c, pal.from.h);
  const to   = oklchToHex(pal.to.l, pal.to.c, pal.to.h);

  return {
    background: `linear-gradient(${angle}deg, ${from}, ${to})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}
