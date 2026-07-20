/**
 * Shared colour system for the current 9:16 voice-driven Skill Showcase.
 * Keep the stage visibly blue-black on mobile; deep shadows belong to panels,
 * not to the entire video canvas.
 */
export const PORTRAIT_COLOR_THEME = {
  stage: '#152238',
  stageShadow: '#0f1a2b',
  surface: '#182842',
  surfaceMuted: '#132038',
  surfaceStrong: '#1d304d',
  line: '#35506f',
  textMuted: '#9db0c9',
  palette: ['#63f0aa', '#7e98ff', '#ffd166', '#ff7aa8', '#48e7f3', '#ad94ff'],
} as const;
