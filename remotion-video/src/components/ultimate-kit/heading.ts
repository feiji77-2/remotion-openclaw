/**
 * heading.ts — DirectorScore golden-rule typography system
 *
 * Maps ShotArchetype → heading style (fontSize, letterSpacing, alignment)
 * so every scene's title follows the director's intent.
 */

export interface HeadingStyle {
  /** Font size in px */
  fontSize: number;
  /** Letter-spacing in px (usually negative for display text) */
  letterSpacing: number;
  /** Line-height as multiplier */
  lineHeight: number;
  /** Text alignment */
  textAlign: 'left' | 'center';
  /** Whether to wrap in TextMaskWipe for clip-path reveal */
  useTextMaskWipe: boolean;
  /** Font weight */
  fontWeight: number;
  /** Max width for the heading container (px) */
  maxWidth: number;
  /** Split heading into visual lines? (for evidence/architecture) */
  splitLines: boolean;
  /** Max chars per line when splitLines is true */
  splitCharsPerLine: number;
}

const DEFAULT_HEADING: HeadingStyle = {
  fontSize: 82,
  letterSpacing: -4.8,
  lineHeight: 0.92,
  textAlign: 'left',
  useTextMaskWipe: false,
  fontWeight: 900,
  maxWidth: 1080,
  splitLines: false,
  splitCharsPerLine: 15,
};

/**
 * Archetype → heading style mapping.
 * These values apply DirectorScore golden rules:
 *  - lock-on reveal → most prominent (hero/cta: big, bold, wipe-reveal)
 *  - drift reveal → narrative standard (timeline/step-flow: large, clean)
 *  - burst spread → dynamic split (evidence-wall: medium, broken into lines)
 *  - compress compare → balanced dual (compare-board: moderate, wipe-reveal)
 */
export function archetypeToHeadingStyle(archetype?: string): HeadingStyle {
  switch (archetype) {
    case 'lock-on reveal':
      return {
        fontSize: 94,
        letterSpacing: -4.4,
        lineHeight: 0.9,
        textAlign: 'left',
        useTextMaskWipe: true,
        fontWeight: 900,
        maxWidth: 980,
        splitLines: false,
        splitCharsPerLine: 15,
      };
    case 'drift reveal':
      return {
        fontSize: 82,
        letterSpacing: -4.8,
        lineHeight: 0.92,
        textAlign: 'left',
        useTextMaskWipe: false,
        fontWeight: 900,
        maxWidth: 1080,
        splitLines: false,
        splitCharsPerLine: 15,
      };
    case 'burst spread':
      return {
        fontSize: 64,
        letterSpacing: -2.8,
        lineHeight: 1.08,
        textAlign: 'left',
        useTextMaskWipe: false,
        fontWeight: 800,
        maxWidth: 980,
        splitLines: true,
        splitCharsPerLine: 14,
      };
    case 'compress compare':
      return {
        fontSize: 72,
        letterSpacing: -3.2,
        lineHeight: 0.92,
        textAlign: 'center',
        useTextMaskWipe: true,
        fontWeight: 900,
        maxWidth: 1080,
        splitLines: false,
        splitCharsPerLine: 15,
      };
    default:
      return DEFAULT_HEADING;
  }
}

/** Eyebrow/kicker style per archetype (null = no eyebrow) */
export function archetypeToEyebrowStyle(archetype?: string): {
  fontSize: number;
  letterSpacing: number;
  show: boolean;
} {
  switch (archetype) {
    case 'lock-on reveal':
      return {fontSize: 16, letterSpacing: 5.2, show: true};
    case 'burst spread':
      return {fontSize: 18, letterSpacing: 4.2, show: true};
    default:
      return {fontSize: 15, letterSpacing: 5, show: true};
  }
}

/**
 * ContentStyle — archetype-driven typography for scene content (non-heading text).
 * Applies DirectorScore grammar to body/label/value rendering across all families.
 */
export interface ContentStyle {
  /** Body text size (descriptions, details) */
  bodySize: number;
  /** Body line height */
  bodyLineHeight: number;
  /** Label/caption text size (small, usually uppercase) */
  labelSize: number;
  /** Value/emphasis text size (numbers, key terms) */
  valueSize: number;
  /** Base spacing unit (px) — gaps, margins scale from this */
  spacing: number;
  /** Content text color opacity (0-1) */
  textOpacity: number;
  /** Label text color opacity (weaker than body) */
  labelOpacity: number;
  /** Decorative element opacity (background text, lines) */
  decorationOpacity: number;
  /** Whether to use tighter/compact spacing */
  compact: boolean;
}

const DEFAULT_CONTENT: ContentStyle = {
  bodySize: 17,
  bodyLineHeight: 1.5,
  labelSize: 13,
  valueSize: 24,
  spacing: 14,
  textOpacity: 0.72,
  labelOpacity: 0.5,
  decorationOpacity: 0.12,
  compact: false,
};

/**
 * Map archetype → content visual density & typography.
 * Lock-on: bold, tight, high contrast — hero/cta scenes
 * Drift: moderate, balanced — narrative scenes
 * Burst: energetic, dynamic — evidence/data scenes
 * Compress: refined, efficient — comparison scenes
 */
export function archetypeToContentStyle(archetype?: string): ContentStyle {
  switch (archetype) {
    case 'lock-on reveal':
      return {
        bodySize: 18,
        bodyLineHeight: 1.44,
        labelSize: 14,
        valueSize: 28,
        spacing: 12,
        textOpacity: 0.82,
        labelOpacity: 0.56,
        decorationOpacity: 0.18,
        compact: true,
      };
    case 'drift reveal':
      return {
        bodySize: 17,
        bodyLineHeight: 1.5,
        labelSize: 13,
        valueSize: 24,
        spacing: 14,
        textOpacity: 0.72,
        labelOpacity: 0.5,
        decorationOpacity: 0.12,
        compact: false,
      };
    case 'burst spread':
      return {
        bodySize: 16,
        bodyLineHeight: 1.56,
        labelSize: 12,
        valueSize: 22,
        spacing: 16,
        textOpacity: 0.76,
        labelOpacity: 0.52,
        decorationOpacity: 0.16,
        compact: false,
      };
    case 'compress compare':
      return {
        bodySize: 15,
        bodyLineHeight: 1.44,
        labelSize: 11,
        valueSize: 20,
        spacing: 10,
        textOpacity: 0.68,
        labelOpacity: 0.48,
        decorationOpacity: 0.1,
        compact: true,
      };
    default:
      return {...DEFAULT_CONTENT};
  }
}

/**
 * Camera intent → container padding & element spacing.
 * Pin: tight focus, minimal padding
 * Drift: flowing, asymmetric
 * Reveal: balanced, standard
 * Linger: generous, comfortable
 * Compress: efficient, tight
 */
export function cameraIntentToSpacing(cameraIntent?: string): {
  paddingX: number;
  paddingY: number;
  gap: number;
  innerGap: number;
} {
  switch (cameraIntent) {
    case 'pin':
      return {paddingX: 84, paddingY: 82, gap: 14, innerGap: 8};
    case 'drift':
      return {paddingX: 92, paddingY: 88, gap: 18, innerGap: 10};
    case 'reveal':
      return {paddingX: 110, paddingY: 96, gap: 22, innerGap: 12};
    case 'linger':
      return {paddingX: 106, paddingY: 94, gap: 20, innerGap: 12};
    case 'compress':
      return {paddingX: 78, paddingY: 76, gap: 12, innerGap: 6};
    default:
      return {paddingX: 96, paddingY: 88, gap: 18, innerGap: 10};
  }
}

/**
 * Extract a key term from heading for memoryObject emphasis.
 * Picks the first word/concept that could be visually highlighted.
 */
export function extractHeadingKeyTerm(heading: string): string {
  // Try to find a colon-separated key phrase
  const colonIdx = heading.indexOf('：');
  if (colonIdx > 0) return heading.slice(0, colonIdx).trim();

  const colonAsciiIdx = heading.indexOf(':');
  if (colonAsciiIdx > 0) return heading.slice(0, colonAsciiIdx).trim();

  // Try to find the first meaningful word (skip numbers and common prefixes)
  const words = heading.split(/[\s·,，、]+/).filter(Boolean);
  for (const w of words) {
    if (w.length >= 2 && !/^\d+$/.test(w)) return w;
  }
  return words[0] ?? heading;
}
