/**
 * animationPresets.ts — 共享动画预设
 *
 * 所有 family 组件的 spring 参数、缓动函数、帧率常数集中定义在此，
 * 确保动效风格统一，修改一处即可全局生效。
 */

// ─── Spring 参数预设 ──────────────────────────────────────────────────

export interface SpringPresetConfig {
  damping: number;
  stiffness: number;
  mass?: number;
}

/**
 * 4 档弹簧预设，从急促到舒缓。
 * 这些参数通过 DirectorScoreOrchestrator 的 SPRING_PRESET_MAP 消费，
 * 也作为 family 组件的默认入参。
 */
export const SPRING_PRESETS: Record<string, SpringPresetConfig> = {
  /** 快、精准，适合正文/标签弹入 */
  snappy: {damping: 200, stiffness: 180, mass: 0.75},
  /** 平滑、自然，适合标题/段落淡入 */
  smooth: {damping: 180, stiffness: 130, mass: 0.75},
  /** 活泼、弹性，适合数字/数据强调 */
  bouncy: {damping: 150, stiffness: 150, mass: 0.65},
  /** 沉重、缓慢，适合结尾/过渡 */
  heavy: {damping: 250, stiffness: 100, mass: 1.0},
};

// ─── 缓动函数 ─────────────────────────────────────────────────────────

export type EasingName = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/** 简单缓动函数映射 (t ∈ [0, 1] → [0, 1]) */
export const EASING_FUNCTIONS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

// ─── 帧率常数 ─────────────────────────────────────────────────────────

export const DEFAULT_FPS = 30;

// ─── 入场缺省参数 ─────────────────────────────────────────────────────

export const DEFAULT_ENTER_STAGGER = {
  /** 每个子元素之间的错帧间隔（帧数） */
  baseDelay: 8,
  /** 每个额外元素的延迟增量 */
  staggerIncrement: 12,
};

export const DEFAULT_SLIDE_DISTANCE = {
  vertical: 30,   // px
  horizontal: 80, // px
};
