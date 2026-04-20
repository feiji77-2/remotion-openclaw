export const ultimateAccents = {
  cyan: '#63ddff',
  green: '#5df4bf',
  yellow: '#ffd66c',
  orange: '#ffad63',
  red: '#ff7a73',
  purple: '#ae87ff',
} as const;

export type UltimateAccentTone = keyof typeof ultimateAccents;

export const ultimateKitVideo = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const ultimateKitTokens = {
  colors: {
    bg: '#05070d',
    bgSoft: '#0b1020',
    panel: '#0f1628',
    panelSoft: 'rgba(17, 24, 40, 0.84)',
    line: 'rgba(140, 176, 255, 0.18)',
    text: '#f5f7ff',
    textMuted: 'rgba(228, 236, 255, 0.62)',
    textSoft: 'rgba(228, 236, 255, 0.36)',
    warmGlow: 'rgba(255, 147, 75, 0.18)',
    coolGlow: 'rgba(99, 221, 255, 0.18)',
  },
  fonts: {
    display: '"Arial Black", "Avenir Next Condensed", sans-serif',
    ui: '"Avenir Next", "Helvetica Neue", sans-serif',
    mono: '"SFMono-Regular", "Menlo", monospace',
  },
  radius: {
    xl: 36,
    lg: 28,
    md: 22,
    sm: 16,
    pill: 999,
  },
  spacing: {
    pageX: 136,
    pageY: 92,
    gap: 24,
  },
} as const;

export const resolveUltimateAccent = (tone: UltimateAccentTone = 'cyan') => {
  return ultimateAccents[tone];
};

export const ultimateGlow = (color: string, strength = 1) => {
  return `0 0 ${12 * strength}px ${color}66, 0 0 ${28 * strength}px ${color}33, 0 0 ${64 * strength}px ${color}22`;
};
