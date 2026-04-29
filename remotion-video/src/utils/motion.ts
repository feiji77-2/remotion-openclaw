/**
 * motion.ts — 统一运动框架
 * 借鉴 remotion-bits/motion.ts 设计
 * 所有动画组件复用此框架，保证一致的运动质感
 */

import { interpolate, spring, useCurrentFrame } from 'remotion';

// ===== 类型定义 =====

export type EasingName =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'spring-bounce'
  | 'spring-soft'
  | 'spring-snappy';

export interface TimingConfig {
  frames?: [number, number];
  duration?: number;
  delay?: number;
  stagger?: number;
  easing?: EasingName;
}

export interface MotionResult {
  progress: number;          // 0~1 归一化进度
  easingFn?: (t: number) => number;
}

// ===== 缓动函数表 =====

const EASING_FUNCTIONS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  spring: (t) => {
    // 简化 spring，使用 remotion spring
    return t;
  },
  'spring-bounce': (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  'spring-soft': (t) => {
    return 1 - Math.cos((t * Math.PI) / 4) * Math.cos((t * Math.PI) / 4);
  },
  'spring-snappy': (t) => {
    const c3 = (Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c3) + 1;
  },
};

/**
 * 获取缓动函数
 */
export function getEasingFunction(name: EasingName): (t: number) => number {
  return EASING_FUNCTIONS[name] ?? EASING_FUNCTIONS.linear;
}

// ===== Spring 配置 =====

// ===== Spring — github-unwrapped 官方唯一标准 =====

/**
 * Spring 配置 — github-unwrapped 官方源码唯一标准参数
 *
 * github-unwrapped-2022 全项目验证：
 *   FeatureList.tsx / GiftBox.tsx / AnimatedCommit.tsx / Arc.tsx
 *   全部使用：spring({ fps, frame: frame - N, config: { damping: 200 } })
 *   无 stiffness，无 mass，无 damping 差异。
 *
 * 视觉多样性通过 frame offset 和 stagger 实现，不通过 spring 参数。
 * 所有 preset 均返回 { damping: 200 }，preset 名只是叙事意图标签。
 */
const SPRING_CONFIGS = {
  default: { damping: 200 },
  smooth:  { damping: 200 },
  snappy:  { damping: 200 },
  bouncy:  { damping: 200 },
  heavy:   { damping: 200 },
  gentle:  { damping: 200 },
} as const;

export type SpringConfigName = keyof typeof SPRING_CONFIGS | 'bounce' | 'soft';

const normalizeSpringConfigName = (name: SpringConfigName): keyof typeof SPRING_CONFIGS => {
  if (name === 'bounce') return 'bouncy';
  if (name === 'soft') return 'gentle';
  return name;
};

/**
 * 获取 spring config — github-unwrapped 官方唯一参数。
 * 所有 preset 统一返回 { damping: 200 }。
 */
export function getSpringConfig(name: SpringConfigName) {
  return SPRING_CONFIGS[normalizeSpringConfigName(name)] ?? SPRING_CONFIGS.default;
}

/**
 * Storyboard sequencing patterns — github-unwrapped 官方 frame-offset stagger 公式。
 *
 * FeatureList.tsx (段落级):
 *   push1: spring({ frame: frame - 60 })         → 第一个元素入场
 *   push2: spring({ frame: frame - 120 })        → 第二个元素把第一个推走
 *   rotateStuff: spring({ frame: frame - 180, durationInFrames: 60 })
 *
 * AnimatedCommit.tsx (列表级):
 *   spring({ fps, frame: frame - 75 - props.index * 2, config: { damping: 200 } })
 *   → base=75，每元素比前一个晚 2 帧
 *
 * Benchmark / MetricBars (数据级):
 *   spring({ frame: frame - (6 + index * 6) })
 *   → base=6，每 bar 比前一个晚 6 帧（bar1 at 6, bar2 at 12, bar3 at 18）
 *
 * stagger 语义：
 *   index * 2  → 紧凑、竞争感（commit 排名有紧迫感）
 *   index * 6  → 克制、声明感（benchmark 数据是事实，不是竞赛）
 *
 * 用法示例：
 *   items.map((item, index) => {
 *     const progress = spring({
 *       fps,
 *       frame: frame - BASE_FRAME - index * STAGGER_GAP,
 *       config: { damping: 200 },
 *     });
 *     const translateY = interpolate(progress, [0, 1], [900, 0]);
 *     return <div style={{ transform: `translateY(${translateY}px)` }} />;
 *   });
/**
 * @param frame      - useCurrentFrame() 当前帧
 * @param baseFrame  - 第一个元素的启动帧（通常 60-90）
 * @param staggerGap - 每元素错开的帧数（2=紧凑，6=克制）
 * @param index      - 元素在列表中的索引
 */

// ===== 核心 hook =====

/**
 * useMotionTiming — 统一时间进度计算
 *
 * @param config.frames    [start, end] 帧范围
 * @param config.duration   持续帧数（与 frames 二选一）
 * @param config.delay      延迟帧数
 * @param config.stagger    子元素交错延迟
 * @param config.unitIndex  子元素索引（用于 stagger）
 * @param config.easing     缓动名称
 */
export function useMotionTiming(config: TimingConfig & { unitIndex?: number }) {
  const { frames, duration = 30, delay = 0, stagger = 0, unitIndex = 0, easing = 'linear' } = config;
  const frame = useCurrentFrame();

  // 计算基础进度
  let progress: number;

  if (frames) {
    const [start, end] = frames;
    const span = end - start;
    progress = interpolate(frame, [start, end], [0, 1], { extrapolateRight: 'clamp' });
    progress = Math.max(0, Math.min(1, progress));
  } else {
    const effectiveFrame = Math.max(0, frame - delay - unitIndex * stagger);
    progress = interpolate(effectiveFrame, [0, duration], [0, 1], { extrapolateRight: 'clamp' });
  }

  // 应用缓动
  const easingFn = getEasingFunction(easing);
  const easedProgress = easingFn(progress);

  return { progress: easedProgress, rawProgress: progress };
}

/**
 * useSpring — spring 动画进度计算
 */
export function useSpring(
  config: {
    frames?: [number, number];
    duration?: number;
    delay?: number;
    config?: SpringConfigName;
    unitIndex?: number;
    stagger?: number;
  } = {}
) {
  const { frames, duration = 30, delay = 0, config: springName = 'default', unitIndex = 0, stagger = 0 } = config;
  const frame = useCurrentFrame();

  let effectiveFrame: number;
  if (frames) {
    effectiveFrame = Math.max(0, frame - frames[0]);
  } else {
    effectiveFrame = Math.max(0, frame - delay - unitIndex * stagger);
  }

  const cfg = getSpringConfig(normalizeSpringConfigName(springName));
  const s = spring({ fps: 30, frame: effectiveFrame, config: cfg });

  return { spring: s };
}

// ===== 样式构建 =====

export interface TransformStyle {
  x?: number | string;
  y?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  skewX?: number;
  skewY?: number;
}

export interface VisualStyle {
  opacity?: number;
  color?: string;
  backgroundColor?: string;
  blur?: number;
  borderRadius?: number;
}

/**
 * buildMotionStyles — 根据进度构建补间样式
 */
export function buildMotionStyles(params: {
  progress: number;
  from?: Partial<TransformStyle & VisualStyle>;
  to?: Partial<TransformStyle & VisualStyle>;
  easing?: EasingName;
}): TransformStyle & VisualStyle {
  const { progress, from = {}, to = {}, easing = 'ease-in-out' } = params;
  const easingFn = getEasingFunction(easing);
  const t = easingFn(progress);

  function lerpNum(a: number, b: number): number {
    return a + (b - a) * t;
  }

  function lerpColor(fromC: string, toC: string): string {
    if (!fromC || !toC) return fromC || toC || 'transparent';
    try {
      const f = parseInt(fromC.replace('#', ''), 16);
      const tt = parseInt(toC.replace('#', ''), 16);
      const fr = (f >> 16) & 0xff, fg = (f >> 8) & 0xff, fb = f & 0xff;
      const tr = (tt >> 16) & 0xff, tg = (tt >> 8) & 0xff, tb = tt & 0xff;
      const r = Math.round(lerpNum(fr, tr));
      const g = Math.round(lerpNum(fg, tg));
      const b = Math.round(lerpNum(fb, tb));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch {
      return toC;
    }
  }

  const style: TransformStyle & VisualStyle = {};

  if (from.x !== undefined || to.x !== undefined)
    style.x = lerpNum(from.x as number ?? 0, to.x as number ?? 0);
  if (from.y !== undefined || to.y !== undefined)
    style.y = lerpNum(from.y as number ?? 0, to.y as number ?? 0);
  if (from.scale !== undefined || to.scale !== undefined)
    style.scale = lerpNum(from.scale ?? 1, to.scale ?? 1);
  if (from.scaleX !== undefined || to.scaleX !== undefined)
    style.scaleX = lerpNum(from.scaleX ?? 1, to.scaleX ?? 1);
  if (from.scaleY !== undefined || to.scaleY !== undefined)
    style.scaleY = lerpNum(from.scaleY ?? 1, to.scaleY ?? 1);
  if (from.rotate !== undefined || to.rotate !== undefined)
    style.rotate = lerpNum(from.rotate ?? 0, to.rotate ?? 0);
  if (from.skewX !== undefined || to.skewX !== undefined)
    style.skewX = lerpNum(from.skewX ?? 0, to.skewX ?? 0);
  if (from.skewY !== undefined || to.skewY !== undefined)
    style.skewY = lerpNum(from.skewY ?? 0, to.skewY ?? 0);
  if (from.opacity !== undefined || to.opacity !== undefined)
    style.opacity = lerpNum(from.opacity ?? 1, to.opacity ?? 1);
  if (from.blur !== undefined || to.blur !== undefined)
    style.blur = lerpNum(from.blur ?? 0, to.blur ?? 0);
  if (from.borderRadius !== undefined || to.borderRadius !== undefined)
    style.borderRadius = lerpNum(from.borderRadius ?? 0, to.borderRadius ?? 0);
  if (from.color !== undefined || to.color !== undefined)
    style.color = lerpColor(from.color ?? '#fff', to.color ?? '#fff');
  if (from.backgroundColor !== undefined || to.backgroundColor !== undefined)
    style.backgroundColor = lerpColor(from.backgroundColor ?? 'transparent', to.backgroundColor ?? 'transparent');

  return style;
}

/**
 * transformToString — transform 对象转 CSS 字符串
 */
export function transformToString(style: TransformStyle): string {
  const parts: string[] = [];
  if (style.x !== undefined) parts.push(`translateX(${style.x}px)`);
  if (style.y !== undefined) parts.push(`translateY(${style.y}px)`);
  if (style.scale !== undefined) parts.push(`scale(${style.scale})`);
  if (style.scaleX !== undefined) parts.push(`scaleX(${style.scaleX})`);
  if (style.scaleY !== undefined) parts.push(`scaleY(${style.scaleY})`);
  if (style.rotate !== undefined) parts.push(`rotate(${style.rotate}deg)`);
  if (style.rotateX !== undefined) parts.push(`rotateX(${style.rotateX}deg)`);
  if (style.rotateY !== undefined) parts.push(`rotateY(${style.rotateY}deg)`);
  if (style.rotateZ !== undefined) parts.push(`rotateZ(${style.rotateZ}deg)`);
  if (style.skewX !== undefined) parts.push(`skewX(${style.skewX}deg)`);
  if (style.skewY !== undefined) parts.push(`skewY(${style.skewY}deg)`);
  return parts.join(' ');
}
