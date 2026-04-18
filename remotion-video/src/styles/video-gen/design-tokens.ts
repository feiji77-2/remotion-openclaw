/**
 * design-tokens.ts — 统一设计规范
 *
 * 所有 Remotion 组件的排版、动画、布局参数集中管理。
 * 换肤/换平台只需修改此文件。
 *
 * 使用方式:
 *   import { tokens } from '../styles/design-tokens';
 *   style={{ fontSize: tokens.typography.titleChinese.fontSize }}
 */

import { colors } from './colors';

// ===== 视频尺寸 =====
export const video = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

// ===== 色彩（复用 colors.ts）=====
export const color = {
  ...colors,
  bg: '#0a0a1a',
  accent: '#00d4ff',
  danger: '#FF4444',
  gold: '#FFD700',
  text: '#FFFFFF',
} as const;

// ===== 字体排版 =====
export const typography = {
  /** 中文标题 ≤50px（竖屏大字报） */
  titleChinese: {
    fontSize: 48,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: 2,
  },
  /** 英文/数字标题 */
  titleEnglish: {
    fontSize: 72,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: -1,
  },
  /** 副标题 */
  subtitle: {
    fontSize: 36,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  /** 正文 */
  body: {
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.6,
  },
  /** 小字/标签 */
  caption: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  /** 数字强调（如 47K） */
  number: {
    fontSize: 96,
    fontWeight: 800,
    lineHeight: 1.0,
    letterSpacing: -2,
  },
} as const;

// ===== 布局 =====
export const layout = {
  /** 竖屏卡片最大宽度 */
  cardMaxWidth: 700,
  /** 卡片内边距 */
  cardPadding: 50,
  /** 安全边距（左右） */
  safeMarginX: 60,
  /** 组件间距 */
  gap: 32,
  /** 底部安全区 */
  safeAreaBottom: 60,
} as const;

// ===== 动画时长（帧）=====
export const duration = {
  fast: 8,    // 快速过渡
  normal: 16,  // 标准入场
  slow: 24,   // 减速强调
  slower: 32, // 慢速展示
} as const;

// ===== 缓动曲线（Remotion spring config）=====
export const easing = {
  /** 快速弹出 */
  bounce: { damping: 140, stiffness: 90, mass: 1 },
  /** 平滑滑入 */
  smooth: { damping: 200, stiffness: 60, mass: 1 },
  /** 弹性抖动 */
  elastic: { damping: 80, stiffness: 100, mass: 0.8 },
  /** 即时响应 */
  snappy: { damping: 300, stiffness: 200, mass: 1 },
} as const;

// ===== 阴影 =====
export const shadow = {
  glow: (color: string) => `0 0 40px ${color}40, 0 0 80px ${color}20`,
  card: '0 4px 24px rgba(0,0,0,0.5)',
  float: '0 8px 40px rgba(0,0,0,0.6)',
} as const;

// ===== 完整 tokens 对象 =====
export const tokens = {
  video,
  color,
  typography,
  layout,
  duration,
  easing,
  shadow,
} as const;

export type Tokens = typeof tokens;
