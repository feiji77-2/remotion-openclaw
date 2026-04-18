/**
 * 字体层级系统
 */

export const fontSizes = {
  hero: 120,
  h1: 80,
  h2: 60,
  h3: 48,
  h4: 36,
  body: 30,
  caption: 22,
  tiny: 18,
};

export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
};

export const fontFamilies = {
  sans: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
  serif: '"Playfair Display", "Songti SC", serif',
};

/**
 * 通用文字样式工厂
 */
export const makeTextStyle = (
  size: number,
  weight: number,
  color: string,
  options?: {
    fontFamily?: string;
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right';
  }
) => ({
  fontSize: size,
  fontWeight: weight,
  color,
  fontFamily: options?.fontFamily || fontFamilies.sans,
  letterSpacing: options?.letterSpacing || 0,
  lineHeight: options?.lineHeight || 1.2,
  textAlign: options?.textAlign || 'center',
});
