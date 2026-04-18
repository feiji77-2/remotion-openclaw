/**
 * 色彩系统
 * 深空科技风配色，可全局替换
 */

export const colors = {
  // 背景色系
  bgPrimary: '#0D0D1A',     // 深紫黑
  bgSecondary: '#1A0D2E',   // 渐变紫
  bgTertiary: '#1a1a2e',    // 卡片背景
  bgDark: '#0a0f1a',        // 更深的背景

  // 强调色系
  accentOrange: '#FF6B35',  // 橙红主强调
  accentOrangeLight: '#FF8C42',
  accentCyan: '#00BCD4',    // 青色点缀
  accentBlue: '#1A237E',   // 深蓝
  accentBlueLight: '#0D47A1',

  // 文字色系
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.4)',

  // 功能色
  success: '#7EE787',
  warning: '#FEBC2E',
  error: '#FF5F57',

  // 代码/终端
  codeBg: '#0d1117',
  codeBorder: '#30363D',
};

/**
 * 预设配色方案
 */
export const colorSchemes = {
  /** 深空科技风（默认） */
  cyber: {
    bg: '#0D0D1A',
    accent: '#FF6B35',
    secondary: '#00BCD4',
    text: '#FFFFFF',
  },
  /** 亮色渐变风 */
  gradient: {
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: '#FFFFFF',
    secondary: '#FFD700',
    text: '#FFFFFF',
  },
  /** 暗色商务风 */
  darkBiz: {
    bg: '#0a0a0a',
    accent: '#3B82F6',
    secondary: '#8B5CF6',
    text: '#F9FAFB',
  },
  /** 赛博朋克风 */
  cyberpunk: {
    bg: '#0D0D0D',
    accent: '#F0F',
    secondary: '#0FF',
    text: '#FFFFFF',
  },
  /** 极简白 */
  minimal: {
    bg: '#FAFAFA',
    accent: '#1a1a1a',
    secondary: '#666666',
    text: '#1a1a1a',
  },
};

export type ColorScheme = keyof typeof colorSchemes;
