/**
 * shotArchetypes.ts
 *
 * 5 个新增 shot archetype — ClawHub benchmark 对标
 * 每个 archetype 是 motionGrammar 的组合应用，不是新组件
 *
 * 1. kineticTypography  — 文字跟随 camera 做推拉/抖动，有节拍感
 * 2. diagramMorph        — 图表元素在两个状态间变形过渡
 * 3. benchmarkRace       — 柱状图赛跑动画，数据从低到高逐帧展开
 * 4. editorialWipe       — 编辑级文字/图片 wipe 转场，带方向控制
 * 5. depthParallax      — 多层视差滚动前景/背景分离移动
 *
 * 用法：
 *   import {kineticTypography, diagramMorph, benchmarkRace, editorialWipe, depthParallax} from './shotArchetypes';
 *   // 在你的 React 组件里组合使用
 */

import {interpolate, spring, useCurrentFrame} from 'remotion';

// ── 1. Kinetic Typography ────────────────────────────────────────────────

/**
 * 动态文字效果：字跟随 camera preset 做弹性出现
 * 适合：hero / cta / quote-highlight
 */
export function useKineticTypography(params: {
  text: string;
  family: string;
  durationInFrames: number;
  fontSize?: number;
  weight?: 'bold' | 'normal';
  delayFrames?: number;
}) {
  const frame = useCurrentFrame();
  const {text, family, durationInFrames, fontSize = 48, weight = 'bold', delayFrames = 0} = params;

  const cameraPresets = ['slow-zoom-in', 'push-in', 'static', 'parallax'];
  const preset = cameraPresets[family.charCodeAt(0) % cameraPresets.length];

  const t = Math.max(0, frame - delayFrames) / Math.max(durationInFrames - delayFrames - 1, 1);

  const scale = preset === 'slow-zoom-in'
    ? interpolate(t, [0, 0.5, 1], [0.7, 1.08, 1.0], {extrapolateLeft: 'clamp'})
    : preset === 'push-in'
    ? interpolate(t, [0, 1], [0.85, 1.0], {extrapolateLeft: 'clamp'})
    : interpolate(t, [0, 1], [0.95, 1.02], {extrapolateLeft: 'clamp'});

  const y = preset === 'parallax'
    ? interpolate(t, [0, 1], [12, -4], {extrapolateLeft: 'clamp'})
    : interpolate(t, [0, 0.6, 1], [8, -2, 0], {extrapolateLeft: 'clamp'});

  const opacity = spring({fps: 30, frame, config: {damping: 12, stiffness: 140}});

  const jitterX = Math.sin(frame * 0.4 + delayFrames) * 0.8;
  const jitterY = Math.cos(frame * 0.3 + delayFrames) * 0.5;

  return {
    style: {
      fontSize,
      fontWeight: weight,
      transform: `translateY(${y}px) scale(${scale}) translate(${jitterX}px, ${jitterY}px)`,
      opacity: Math.min(1, opacity * 1.2),
    },
    text,
  };
}

// ── 2. Diagram Morph ───────────────────────────────────────────────────

/**
 * 图表在两个数据状态间平滑变形
 * 适合：architecture-map / pipeline-flow / memory-graph
 *
 * @param fromValues 起始状态数值数组
 * @param toValues   目标状态数值数组
 * @param progress   当前变形进度 0→1
 */
export function useDiagramMorph(params: {
  fromValues: number[];
  toValues: number[];
  progress: number; // 0-1, driven by useCurrentFrame
}) {
  const {fromValues, toValues, progress} = params;

  const morphedValues = fromValues.map((from, i) => {
    const to = toValues[i] ?? from;
    return interpolate(progress, [0, 1], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  });

  return {morphedValues, progress};
}

// ── 3. Benchmark Race ──────────────────────────────────────────────────

/**
 * 柱状图赛跑动画：数据从 0 增长到目标值，有快慢节奏
 * 适合：benchmark-chart / metrics
 *
 * @param items 数据项 [{label, targetValue, currentValue}]
 * @param raceProgress 赛跑进度 0→1
 */
export function useBenchmarkRace(params: {
  items: Array<{label: string; targetValue: number; currentValue?: number}>;
  raceProgress: number;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const {items, raceProgress, durationInFrames} = params;

  const t = Math.min(1, frame / Math.max(durationInFrames - 1, 1));

  // Stagger: items race one after another with slight delay
  const racedValues = items.map((item, i) => {
    const staggerDelay = i * 0.08; // 8% delay per item
    const itemProgress = interpolate(Math.max(0, t - staggerDelay), [0, 1], [0, 1], {extrapolateLeft: 'clamp'});
    const springProgress = spring({fps: 30, frame: itemProgress * durationInFrames, config: {damping: 14, stiffness: 90}});
    const from = item.currentValue ?? 0;
    return interpolate(springProgress, [0, 1], [from, item.targetValue], {extrapolateLeft: 'clamp'});
  });

  return {
    racedValues,
    overallProgress: t,
  };
}

// ── 4. Editorial Wipe ─────────────────────────────────────────────────

/**
 * 编辑级 wipe 转场：方向可控的 text/image wipe
 * 适合：对比类场景 / 镜头切换
 *
 * @param direction 'left' | 'right' | 'up' | 'down'
 * @param wipeProgress 0→1
 */
export function useEditorialWipe(params: {
  direction: 'left' | 'right' | 'up' | 'down';
  wipeProgress: number; // 0→1 driven by frame
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const {direction, durationInFrames} = params;

  const t = Math.min(1, frame / Math.max(durationInFrames - 1, 1));

  const [xKey, yKey] = direction === 'left' || direction === 'right'
    ? ['x', 'y']
    : ['y', 'x'];
  const sign = direction === 'right' || direction === 'down' ? 1 : -1;

  const offset = interpolate(t, [0, 1], [0, sign * 100], {extrapolateLeft: 'clamp'});

  return {
    transform: direction === 'left' || direction === 'right'
      ? `translateX(${offset}%)`
      : `translateY(${offset}%)`,
    progress: t,
    // Reveal mask: a second layer that wipes over the first
    maskTransform: direction === 'left' || direction === 'right'
      ? `translateX(${-offset * 0.5}%)`
      : `translateY(${-offset * 0.5}%)`,
  };
}

// ── 5. Depth Parallax ─────────────────────────────────────────────────

/**
 * 多层视差：前景/背景以不同速率移动，产生纵深感
 * 适合：hero / evidence-wall / architecture-map
 *
 * @param layers [{depth: 0-1 (0=far, 1=near), element}]
 *   depth 0.0 = 背景（移动最慢）
 *   depth 1.0 = 前景（移动最快）
 * @param panDirection 'left' | 'right' | 'up' | 'down'
 * @param panAmount 总位移量（像素），默认 40
 */
export function useDepthParallax(params: {
  layers: Array<{depth: number; translateX?: number; translateY?: number}>;
  panDirection: 'left' | 'right' | 'up' | 'down';
  panAmount?: number;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const {layers, panDirection, panAmount = 40, durationInFrames} = params;

  const t = Math.min(1, frame / Math.max(durationInFrames - 1, 1));

  const isHorizontal = panDirection === 'left' || panDirection === 'right';
  const sign = panDirection === 'right' || panDirection === 'down' ? 1 : -1;

  const animatedLayers = layers.map(layer => {
    // depth: 0=far (0.1x speed), 1=near (1.2x speed)
    const speedMultiplier = 0.1 + layer.depth * 1.1;
    const totalOffset = sign * panAmount * speedMultiplier;
    const currentOffset = interpolate(t, [0, 1], [0, totalOffset], {extrapolateLeft: 'clamp'});

    return {
      depth: layer.depth,
      transform: isHorizontal
        ? `translateX(${currentOffset}px)`
        : `translateY(${currentOffset}px)`,
      zIndex: Math.round(layer.depth * 10),
    };
  });

  return {
    animatedLayers,
    panProgress: t,
  };
}
