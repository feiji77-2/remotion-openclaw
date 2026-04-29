/**
 * motion-grammar.ts — 数据事件的戏剧化动画函数
 *
 * 每个 DataEventVerb 对应一个"动词级"动画实现。
 * 不是 interpolate + scale，而是：
 *   countUp  — 数字像子弹一样从零冲出来
 *   settle   — 数字沉淀下来，凝固在目标值
 *   burst    — 从一个点爆发扩散
 *   trace    — 沿路径逐帧绘制/追踪
 *
 * 参照 github-unwrapped FeatureList.tsx / AnimatedCommit.tsx 的 spring 模式：
 *   damping: 200 是 canonical 参数
 *   每个函数都返回 spring-driven interpolate result
 */

import {interpolate, spring, Easing, useCurrentFrame} from 'remotion';

// ─── countUp — 数字像子弹一样打出来 ────────────────────────────────────────

export interface CountUpConfig {
  /** 目标数值 */
  targetValue: number;
  /** 开始帧 */
  fromFrame: number;
  /** 动画持续帧数 */
  durationFrames: number;
  /** 前缀（如 "$"、"%"、"x"） */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  /** 小数位数 */
  decimals?: number;
  /** 是否在结束后有"击中"脉冲 */
  pulseOnComplete?: boolean;
}

/**
 * countUp：从零冲到一个数，像子弹一样打出来。
 * 数字在 durationFrames 内从 0 → targetValue，
 * 然后有一个"击中"效果（最后 20% 的帧做加速脉冲）。
 */
export function countUp(value: number, progress: number, decimals = 0): string {
  const current = value * Math.min(1, progress);
  return current.toFixed(decimals);
}

/**
 * countUpWithPulse：带"击中"脉冲效果的数字增长。
 * 前 80% 的进度正常增长，最后 20% 有一个"砰"的加速感。
 *
 * github-unwrapped AnimatedCommit.tsx 风格：
 *   spring({ damping: 200 }) 驱动，带 overshoot
 */
export function countUpWithPulse(
  value: number,
  progress: number,
  decimals = 0,
): {display: string; pulseIntensity: number} {
  const CLAMP = Math.min(1, Math.max(0, progress));

  if (CLAMP >= 1) {
    return {display: value.toFixed(decimals), pulseIntensity: 0};
  }

  // 最后 20% 做脉冲加速
  const PULSE_ZONE = 0.8;
  let displayValue: number;

  if (CLAMP < PULSE_ZONE) {
    // 正常增长区
    const normalized = CLAMP / PULSE_ZONE;
    displayValue = value * normalized;
  } else {
    // 脉冲区：加速到目标，带微 overshoot
    const pulseProgress = (CLAMP - PULSE_ZONE) / (1 - PULSE_ZONE);
    // easeOut 加速曲线
    const eased = 1 - Math.pow(1 - pulseProgress, 3);
    displayValue = value * (PULSE_ZONE + (1 - PULSE_ZONE) * eased);
  }

  const pulseIntensity = CLAMP >= PULSE_ZONE
    ? Math.sin((CLAMP - PULSE_ZONE) / (1 - PULSE_ZONE) * Math.PI) * 0.15
    : 0;

  return {display: displayValue.toFixed(decimals), pulseIntensity};
}

// ─── settle — 沉淀下来，凝固在目标值 ─────────────────────────────────────

export interface SettleConfig {
  targetValue: number;
  fromFrame: number;
  /** 进入时的 spring 强度（default: 20） */
  damping?: number;
  /** 显示格式 */
  format?: (v: number) => string;
}

/**
 * settle：数字不是"出现"的，而是"沉淀"下来的。
 * 带有 spring 的物理感，像东西落入水中后静止。
 *
 * 参照 github-unwrapped GiftBox.tsx：
 *   spring({ damping: 200 }) + translateY 物理落点
 */
export function settle(
  value: number,
  progress: number,
  decimals = 0,
): {display: string; springY: number} {
  const CLAMP = Math.min(1, Math.max(0, progress));

  // spring 驱动的 Y 位移：值从上方落下来
  // progress 0 = Y: -100, progress 1 = Y: 0
  const springY = interpolate(CLAMP, [0, 1], [-60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 值本身也是从 0 增长到目标
  const displayValue = value * CLAMP;

  return {
    display: displayValue.toFixed(decimals),
    springY,
  };
}

// ─── burst — 从一个点爆发扩散 ─────────────────────────────────────────────

export interface BurstConfig {
  /** 爆发中心 X */
  originX: number;
  /** 爆发中心 Y */
  originY: number;
  /** 爆发半径（最终扩散范围） */
  maxRadius: number;
  /** 爆发持续帧数 */
  durationFrames: number;
  /** 每个碎片的延迟（stagger） */
  staggerDelay?: number;
  /** 碎片数量 */
  fragmentCount?: number;
}

/**
 * burstSpread：计算爆发动画的 fragment 位置。
 * 返回每个碎片的 (x, y, scale, opacity) 数组。
 *
 * 参照 github-unwrapped Arc.tsx 的 SVG path evolve 模式：
 *   逐帧推进进度，而不是瞬间出现
 */
export function burstSpread(
  frame: number,
  fromFrame: number,
  durationFrames: number,
  originX: number,
  originY: number,
  maxRadius: number,
  fragmentCount = 8,
): Array<{x: number; y: number; scale: number; opacity: number; rotation: number}> {
  const elapsed = frame - fromFrame;
  if (elapsed < 0) {
    return [];
  }

  const progress = Math.min(1, elapsed / durationFrames);
  const eased = Easing.out(Easing.cubic)(progress);

  const currentRadius = maxRadius * eased;
  const currentOpacity = interpolate(progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const currentScale = interpolate(progress, [0, 0.2, 0.8, 1], [0.1, 1.2, 1, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return Array.from({length: fragmentCount}, (_, i) => {
    const angle = (i / fragmentCount) * Math.PI * 2;
    const jitter = Math.sin(frame * 0.3 + i * 1.7) * 0.15;
    const angleWithJitter = angle + jitter;

    return {
      x: originX + Math.cos(angleWithJitter) * currentRadius,
      y: originY + Math.sin(angleWithJitter) * currentRadius,
      scale: currentScale,
      opacity: currentOpacity,
      rotation: angleWithJitter * (180 / Math.PI),
    };
  });
}

// ─── trace — 沿路径逐帧绘制 ────────────────────────────────────────────────

export interface TracePoint {
  x: number;
  y: number;
}

/**
 * traceProgress：沿路径追踪的进度。
 * 返回 [0, 1] 之间的进度值，用于 SVG path 的 `strokeDashoffset`
 * 或用于position的插值。
 *
 * 参照 github-unwrapped Arc.tsx：
 *   interpolate(frame, [20, 120], [0.02, 0.99])
 *   驱动 evolvePath 或 strokeDashoffset
 */
export function traceProgress(
  frame: number,
  fromFrame: number,
  durationFrames: number,
  initialProgress = 0.02,
  finalProgress = 0.99,
): number {
  const elapsed = frame - fromFrame;
  if (elapsed < 0) return initialProgress;

  const raw = interpolate(elapsed, [0, durationFrames], [initialProgress, finalProgress], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  return raw;
}

/**
 * tracePosition：沿一系列点移动的当前位置。
 * 返回当前帧在路径上的 (x, y) 坐标。
 */
export function tracePosition(
  frame: number,
  fromFrame: number,
  durationFrames: number,
  points: TracePoint[],
): TracePoint {
  const progress = traceProgress(frame, fromFrame, durationFrames);
  const totalSegments = points.length - 1;
  const scaledProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segmentProgress = scaledProgress - segmentIndex;

  const from = points[segmentIndex];
  const to = points[segmentIndex + 1];

  return {
    x: from.x + (to.x - from.x) * segmentProgress,
    y: from.y + (to.y - from.y) * segmentProgress,
  };
}

// ─── Overtake Race — 追及竞速动画 ──────────────────────────────────────────

export interface OvertakeState {
  /** 当前领先者的 ID */
  currentLeader: 'a' | 'b';
  /** 领先量（0-1） */
  leadMargin: number;
  /** 是否发生了超车 */
  overtaked: boolean;
}

/**
 * overtakeRace：两列数据赛跑，计算当前领先状态。
 *
 * 用于 benchmark-chart / compare-board 的"谁在前面"逻辑。
 * 返回每个时间点的领先者和差距。
 */
export function overtakeRace(
  valueA: number,
  valueB: number,
  progress: number,
): OvertakeState {
  const currentA = valueA * progress;
  const currentB = valueB * progress;
  const diff = currentA - currentB;
  const total = Math.max(valueA, valueB, 0.001);

  const leadMargin = Math.min(1, Math.abs(diff) / total);

  return {
    currentLeader: diff >= 0 ? 'a' : 'b',
    leadMargin,
    overtaked: Math.abs(valueA - valueB) > 0 && leadMargin < 0.1,
  };
}

// ─── Spring presets（来自 github-unwrapped canonical） ───────────────────────

export interface SpringPreset {
  damping: number;
  stiffness?: number;
  mass?: number;
}

/**
 * github-unwrapped 全项目 canonical spring 参数。
 * 不要再猜测 damping / stiffness 值了。
 */
export const SPRING_PRESETS: Record<string, SpringPreset> = {
  // 通用：快进快出，带一点回弹
  default: {damping: 200},
  // 更弹
  bouncy: {damping: 150},
  // 更稳
  stable: {damping: 250},
  // 极慢（大型场景进入）
  slow: {damping: 200, stiffness: 60},
};

/**
 * 标准 spring 配置工厂。
 * 所有 spring 调用统一使用 damping: 200。
 */
export function makeSpringConfig(
  preset: keyof typeof SPRING_PRESETS = 'default',
  overrides?: Partial<SpringPreset>,
): SpringPreset {
  return {...SPRING_PRESETS[preset], ...overrides};
}
