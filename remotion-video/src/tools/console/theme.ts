// src/tools/console/theme.ts
// Design tokens for Video Factory Console v2 — Dark Professional Studio Theme

export const theme = {
  // Background hierarchy (darkest → lightest)
  bg: {
    deep: '#07080a',
    base: '#0b0d11',
    surface: '#111318',
    elevated: '#181b22',
    hover: '#1e2130',
  },
  // Borders
  border: {
    subtle: '#1e2130',
    default: '#282c3a',
    accent: '#363b4a',
  },
  // Text
  text: {
    primary: '#e8eaed',
    secondary: '#9aa0ab',
    muted: '#5c6270',
  },
  // Accent colors
  accent: {
    blue: '#3b82f6',
    indigo: '#6366f1',
    amber: '#f59e0b',
    green: '#22c55e',
    red: '#ef4444',
    purple: '#8b5cf6',
  },
  // Energy colors (DirectorScore)
  energy: {
    explosive: '#ef4444',
    high: '#f97316',
    moderate: '#eab308',
    calm: '#22c55e',
  },
  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  // Font sizes
  fontSize: {
    xs: 7,
    sm: 8,
    base: 10,
    md: 12,
    lg: 14,
  },
  // Border radius
  radius: {
    sm: 3,
    md: 6,
    lg: 8,
    xl: 10,
  },
  // Shadows
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
  },
  // Font family
  font: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  // Transition
  transition: 'all 0.15s ease',
} as const;

export type Theme = typeof theme;
