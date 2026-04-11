// 颜色工具函数

/**
 * 预定义的颜色调色板
 */
export const ColorPalette = {
  // 主色调
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8A5C',
  
  // 背景色
  background: {
    dark: '#0A0A0F',
    card: '#151520',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // 文字色
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0B0',
    muted: '#606070',
  },
  
  // 字幕颜色
  subtitle: {
    default: '#FFFFFF',
    yellow: '#FFE066',
    cyan: '#66FFE0',
  },
  
  // 状态色
  status: {
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
  
  // 渐变色
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    dark: 'linear-gradient(180deg, #0A0A0F 0%, #151520 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  },
} as const;

/**
 * 十六进制转 RGBA
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 暗色变亮
 */
export function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * 暗色变暗
 */
export function darken(hex: string, percent: number): string {
  return lighten(hex, -percent);
}
