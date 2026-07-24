/**
 * Shared colour system for the current 9:16 voice-driven Skill Showcase.
 * The shared stage owns the near-black cinematic depth. Individual templates
 * only map accent, secondary, and emphasis tokens onto their own surfaces.
 */
export const PORTRAIT_COLOR_THEME = {
  stage: '#03050a',
  stageShadow: '#00030a',
  stageGrid: 'rgba(126, 152, 255, 0.075)',
  stageGridStrong: 'rgba(72, 231, 243, 0.13)',
  stageVignette: 'rgba(0, 0, 0, 0.68)',
  stageGlow: 'rgba(72, 231, 243, 0.16)',
  stageDepth: 'rgba(255, 255, 255, 0.045)',
  surface: '#0c1421',
  surfaceMuted: '#08101b',
  surfaceStrong: '#121f32',
  line: '#25334a',
  textMuted: '#8ea0b8',
  palette: ['#63f0aa', '#7e98ff', '#ffd166', '#ff7aa8', '#48e7f3', '#ad94ff'],
} as const;

export type PortraitVisualSystem = {
  variant?: 'cinematic-tech' | 'editorial-lightcut' | 'product-console';
  pacing?: 'fast' | 'balanced' | 'explainer';
  platform?: 'portrait' | 'landscape' | 'square';
};

const VARIANT_TOKENS = {
  'cinematic-tech': {
    palette: PORTRAIT_COLOR_THEME.palette,
    gridOpacity: 0.46,
    glowBoost: 1,
    lightSurfaceMix: 0,
  },
  'editorial-lightcut': {
    palette: ['#ffd166', '#48e7f3', '#ff7aa8', '#63f0aa', '#ad94ff', '#7e98ff'],
    gridOpacity: 0.34,
    glowBoost: 0.82,
    lightSurfaceMix: 0.18,
  },
  'product-console': {
    palette: ['#63f0aa', '#ffd166', '#48e7f3', '#ff7aa8', '#7e98ff', '#ad94ff'],
    gridOpacity: 0.52,
    glowBoost: 1.12,
    lightSurfaceMix: 0.08,
  },
} as const;

export const resolvePortraitVisualTheme = (visualSystem?: PortraitVisualSystem) => {
  const variant = visualSystem?.variant ?? 'cinematic-tech';
  const tokens = VARIANT_TOKENS[variant] ?? VARIANT_TOKENS['cinematic-tech'];
  return {
    ...PORTRAIT_COLOR_THEME,
    variant,
    pacing: visualSystem?.pacing ?? 'balanced',
    platform: visualSystem?.platform ?? 'portrait',
    palette: tokens.palette,
    gridOpacity: tokens.gridOpacity,
    glowBoost: tokens.glowBoost,
    lightSurfaceMix: tokens.lightSurfaceMix,
  };
};
