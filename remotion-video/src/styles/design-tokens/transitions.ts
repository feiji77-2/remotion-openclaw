/**
 * transitions.ts — 转场目录
 *
 * 从 HyperFrames motion TRANSITION-REGISTRY.md 移植的 Tier-B 转场集合。
 * 每个转场定义了类型、分类和 GSAP 模板。
 */

// ===== 类型定义 =====

export type TransitionType = 'css' | 'webgl';

export interface TransitionPreset {
  id: string;
  name: string;
  type: TransitionType;
  category: string;
  description: string;
  defaultDuration?: number;
  energy?: string;
  directions?: string[];
}

// ===== 转场列表 =====

/**
 * Crossfade — 通用交叉淡入淡出
 * 最基础的转场，适用于任何场景。
 */
export const CROSSFADE: TransitionPreset = {
  id: 'crossfade',
  name: 'Crossfade',
  type: 'css',
  category: 'dissolve',
  description:
    'Classic crossfade — outgoing scene fades to 0 opacity while incoming fades from 0 to 1. Power2.inOut ease, 0.5s default.',
  defaultDuration: 0.5,
  energy: 'any',
};

/**
 * Blur Crossfade — 模糊交叉淡入淡出
 * 带模糊的淡入淡出，适用于背景色差异大的场景切换。
 */
export const BLUR_CROSSFADE: TransitionPreset = {
  id: 'blur-crossfade',
  name: 'Blur Crossfade',
  type: 'css',
  category: 'dissolve',
  description:
    'Blur-enhanced crossfade — old scene blurs (10px) and scales up slightly while new scene unblurs from blur(10px) scale(0.97). Masks background color clashes.',
  defaultDuration: 0.6,
  energy: 'calm',
};

/**
 * Push Slide — 方向推动滑动
 * 场景从指定方向滑入推出。支持 LEFT / RIGHT / UP / DOWN。
 */
export const PUSH_SLIDE: TransitionPreset = {
  id: 'push-slide',
  name: 'Push Slide',
  type: 'css',
  category: 'push',
  description:
    'Directional slide — outgoing scene translates in the direction of travel while incoming scene slides in from the opposite side. Power3.inOut ease, 0.5s default.',
  defaultDuration: 0.5,
  energy: 'medium',
  directions: ['LEFT', 'RIGHT', 'UP', 'DOWN'],
};

/**
 * Zoom Through — 缩放穿越
 * 快速缩放穿越效果，适用于高能量场景转换。
 */
export const ZOOM_THROUGH: TransitionPreset = {
  id: 'zoom-through',
  name: 'Zoom Through',
  type: 'css',
  category: 'scale',
  description:
    'Zoom-through — outgoing scales up to 2.5x with blur and fades out, incoming scales from 0.5x and unblurs. Power3 in/out, 0.4s default. High energy.',
  defaultDuration: 0.4,
  energy: 'high',
};

/**
 * Squeeze — 挤压过渡
 * 旧场景水平压缩到左侧边缘，新场景从右侧水平展开。
 */
export const SQUEEZE: TransitionPreset = {
  id: 'squeeze',
  name: 'Squeeze',
  type: 'css',
  category: 'push',
  description:
    'Squeeze — old scene compresses to a vertical line on the left edge (scaleX → 0, transformOrigin left), new scene expands from the right edge. Medium energy.',
  defaultDuration: 0.4,
  energy: 'medium',
};

// ===== 转场注册表 =====

export const TRANSITIONS: Record<string, TransitionPreset> = {
  'crossfade': CROSSFADE,
  'blur-crossfade': BLUR_CROSSFADE,
  'push-slide': PUSH_SLIDE,
  'zoom-through': ZOOM_THROUGH,
  'squeeze': SQUEEZE,
};

export type TransitionId = keyof typeof TRANSITIONS;

// ===== 辅助函数 =====

/**
 * 按 ID 获取转场预设
 */
export const getTransition = (id: string): TransitionPreset | undefined =>
  TRANSITIONS[id];

/**
 * 按能量级别获取默认转场
 */
export const getDefaultTransition = (energy?: string): TransitionPreset => {
  if (energy === 'high') return ZOOM_THROUGH;
  if (energy === 'calm') return BLUR_CROSSFADE;
  return CROSSFADE;
};

/**
 * 获取所有转场 ID 列表
 */
export const getTransitionIds = (): TransitionId[] =>
  Object.keys(TRANSITIONS) as TransitionId[];
