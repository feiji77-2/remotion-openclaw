export type SceneFamily =
  | 'proof'
  | 'product'
  | 'comparison'
  | 'data'
  | 'system'
  | 'quote'
  | 'cta';

export type FxPresetId =
  | 'proof-grid'
  | 'warning-pulse'
  | 'signal-flow'
  | 'heat-map'
  | 'social-proof'
  | 'cta-burst';

export type OverlayMode = 'slide' | 'tags' | 'hybrid';
export type BadgeVariant = 'new' | 'hot' | 'top' | 'live' | 'default';
export type DirectorPresetId = 'clean-tiktok';
export type TitleIconPlacement = 'before' | 'after';
export type TitleIconStrategy = 'brand-first' | 'first-available';
export type ParticleLevel = 'none' | 'low' | 'medium' | 'high';

export type RenderIconId =
  | 'github'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'whatsapp'
  | 'plugin'
  | 'memory'
  | 'automation'
  | 'timeline'
  | 'cost'
  | 'speed'
  | 'reddit'
  | 'ollama'
  | 'shield'
  | 'spark'
  | 'loop'
  | 'graph'
  | 'skills';

export interface DirectorTag {
  label: string;
  color?: string;
}

export interface DirectorBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface TitleOverlayPreset {
  top: number;
  left: number;
  right: number;
  stackGap: number;
  rowGap: number;
  showIcon: boolean;
  iconPlacement: TitleIconPlacement;
  iconStrategy: TitleIconStrategy;
  iconBubbleSize: number;
  iconSize: number;
  showAccentLine: boolean;
  uppercaseTitle: boolean;
  titleFontSize: number;
  titleLetterSpacing: number;
  subtitleMaxWidth: number;
  subtitleOffsetX: number;
  subtitleFontSize: number;
  entryDistance: number;
  floatAmplitude: number;
  glowPulse: boolean;
}

export interface CaptionStylePreset {
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  maxWidth: number;
  shortTextMaxWidth: number;
  panelOpacity: number;
  scrimOpacity: number;
  inactiveOpacity: number;
  borderRadius: number;
}

export interface AtmosphereStylePreset {
  showGrid: boolean;
  showParticles: boolean;
  showSweep: boolean;
  showCornerGlow: boolean;
  showTopLight: boolean;
  particleDensityScale: number;
  gridStrength: number;
  sweepStrength: number;
  topLightStrength: number;
  cornerGlowStrength: number;
  vignetteStrength: number;
  bottomFadeStrength: number;
}

export interface OverlayChromePreset {
  showTitleOverlay: boolean;
  showTags: boolean;
  showBadge: boolean;
  showProgress: boolean;
  showIconRail: boolean;
}

export interface DirectorPreset {
  id: DirectorPresetId;
  label: string;
  titleOverlay: TitleOverlayPreset;
  caption: CaptionStylePreset;
  atmosphere: AtmosphereStylePreset;
  chrome: OverlayChromePreset;
}

export interface ShotDirector {
  id: string;
  title: string;
  kicker?: string;
  family: SceneFamily;
  fxPreset: FxPresetId;
  particleLevel?: ParticleLevel;
  iconIds: RenderIconId[];
  highlightWords?: string[];
  tags?: DirectorTag[];
  badge?: DirectorBadge;
  overlayMode?: OverlayMode;
  accentColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  dangerColor?: string;
  bgColor?: string;
}

export interface ShotTheme {
  fxPreset: FxPresetId;
  accentColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  dangerColor: string;
  bgColor: string;
  bgGradient: string;
  particleCount: number;
  particleColors: string[];
  particleDensityMultiplier: number;
  particleOpacityScale: number;
  particleSpeedMultiplier: number;
  gridOpacity: number;
  overlayMode: OverlayMode;
  showProgress: boolean;
  badgeVariant: BadgeVariant;
  captionFontSize: number;
}
