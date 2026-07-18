/**
 * design-tokens/index.ts — 统一导出
 *
 * 从 HyperFrames 设计技能移植的完整类型安全设计令牌模块。
 * 可被 Remotion 组件和场景配置引用。
 *
 * 使用方式:
 *   import { getPalette, getBlueprint, getFramePreset } from '../styles/design-tokens';
 *   const palette = getPalette('dark-premium');
 */

// 调色板系统
export type { DesignPaletteColors, DesignPalette, PaletteId } from './palettes';
export {
  BOLD_ENERGETIC,
  CLEAN_CORPORATE,
  DARK_PREMIUM,
  JEWEL_RICH,
  MONOCHROME,
  NATURE_EARTH,
  NEON_ELECTRIC,
  PASTEL_SOFT,
  WARM_EDITORIAL,
  PALETTES,
  getPalette,
  resolveAccentColor,
  getPaletteIds,
} from './palettes';

// 动效蓝图
export type { MotionBlueprint, BlueprintId } from './motion-blueprints';
export {
  BRAND_REVEAL_ASSEMBLE_ZOOM,
  COMPARISON_SPLIT_CARDS,
  CONCEPT_DEMO_DECODE_PAN,
  CTA_MORPH_PRESS,
  CTA_ORBIT_COLLAPSE,
  HOOK_COUNTER_BURST,
  MESSAGING_MULTI_PHRASE,
  METRIC_VIDEO_TEXT_PIVOT,
  PROOF_LOGO_CHAIN,
  WORKFLOW_APPROVE_PRESS,
  MOTION_BLUEPRINTS,
  getBlueprint,
  getBlueprintIds,
} from './motion-blueprints';

// 画面预设
export type { FramePresetTypography, FramePreset, FramePresetId } from './frame-presets';
export {
  BIENNALE_YELLOW,
  BLOCKFRAME,
  BLUE_PROFESSIONAL,
  BOLD_POSTER,
  BROADSIDE,
  CAPSULE,
  CARTESIAN,
  CLAUDE,
  COBALT_GRID,
  CORAL,
  CREATIVE_MODE,
  DAISY_DAYS,
  EDITORIAL_FOREST,
  FRAME_PRESETS,
  getFramePreset,
  getFramePresetIds,
} from './frame-presets';

// 转场目录
export type { TransitionType, TransitionPreset, TransitionId } from './transitions';
export {
  CROSSFADE,
  BLUR_CROSSFADE,
  PUSH_SLIDE,
  ZOOM_THROUGH,
  SQUEEZE,
  TRANSITIONS,
  getTransition,
  getDefaultTransition,
  getTransitionIds,
} from './transitions';
