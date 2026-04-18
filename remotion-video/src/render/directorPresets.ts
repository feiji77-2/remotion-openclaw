import type { DirectorPreset, DirectorPresetId } from './types';

export const DEFAULT_DIRECTOR_PRESET_ID: DirectorPresetId = 'clean-tiktok';

const CLEAN_TIKTOK_PRESET: DirectorPreset = {
  id: 'clean-tiktok',
  label: 'Clean TikTok',
  titleOverlay: {
    top: 132,
    left: 68,
    right: 320,
    stackGap: 10,
    rowGap: 18,
    showIcon: true,
    iconPlacement: 'before',
    iconStrategy: 'brand-first',
    iconBubbleSize: 38,
    iconSize: 18,
    showAccentLine: false,
    uppercaseTitle: false,
    titleFontSize: 13,
    titleLetterSpacing: 1.6,
    subtitleMaxWidth: 560,
    subtitleOffsetX: 38,
    subtitleFontSize: 28,
    entryDistance: 100,
    floatAmplitude: 1.6,
    glowPulse: true,
  },
  caption: {
    paddingBottom: 168,
    paddingLeft: 60,
    paddingRight: 60,
    maxWidth: 900,
    shortTextMaxWidth: 640,
    panelOpacity: 0.2,
    scrimOpacity: 0.06,
    inactiveOpacity: 0.2,
    borderRadius: 18,
  },
  atmosphere: {
    showGrid: true,
    showParticles: true,
    showSweep: false,
    showCornerGlow: true,
    showTopLight: false,
    particleDensityScale: 0.9,
    gridStrength: 0.45,
    sweepStrength: 0.3,
    topLightStrength: 0.3,
    cornerGlowStrength: 0.45,
    vignetteStrength: 0.28,
    bottomFadeStrength: 0.45,
  },
  chrome: {
    showTitleOverlay: true,
    showTags: false,
    showBadge: false,
    showProgress: false,
    showIconRail: false,
  },
};

export const DIRECTOR_PRESETS: Record<DirectorPresetId, DirectorPreset> = {
  'clean-tiktok': CLEAN_TIKTOK_PRESET,
};

export const resolveDirectorPreset = (
  presetId: DirectorPresetId = DEFAULT_DIRECTOR_PRESET_ID
): DirectorPreset => {
  return DIRECTOR_PRESETS[presetId] || DIRECTOR_PRESETS[DEFAULT_DIRECTOR_PRESET_ID];
};
