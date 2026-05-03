import React, {type CSSProperties} from 'react';
import {useCurrentFrame} from 'remotion';
import {
  getUltimateManualGlyph,
  isUltimateManualGlyph,
  resolveUltimateIconPack,
  ULTIMATE_ICON_URLS,
  type UltimateIconName,
} from './iconography';
import {appendUltimateMicroJitter, createUltimateMicroJitter} from './motion';
import {ultimateGlow} from './tokens';

/** Clean display text by trimming and collapsing whitespace. */
export const cleanDisplayText = (value?: string | null): string =>
  String(value || '').replace(/\s+/g, ' ').trim();

/** CSS mask style for rendering a semantic icon via background colour + mask-image. */
export const iconMaskStyle = (icon: UltimateIconName): CSSProperties => ({
  background: 'currentColor',
  WebkitMaskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskSize: 'contain',
});

/** Apply micro-jitter animation to a base transform. */
export const withMicroJitter = (
  frame: number,
  baseTransform: string,
  config?: Parameters<typeof createUltimateMicroJitter>[1],
) => appendUltimateMicroJitter(baseTransform, createUltimateMicroJitter(frame, config));

const semanticFallbackIcons: UltimateIconName[] = [
  'sparkles',
  'layers',
  'code',
  'messagesSquare',
  'zap',
  'arrowRight',
];

/**
 * Resolve a semantic icon from an icon value and/or semantic text.
 * Returns null when the value is a manual glyph (emoji/letter), otherwise
 * returns a matched UltimateIconName or a fallback from the built-in list.
 */
export const resolveSemanticIcon = (
  iconValue: string | undefined,
  semanticText: string,
  fallbackIndex = 0,
  family?: string,
): UltimateIconName | null => {
  const iconText = cleanDisplayText(iconValue);
  if (iconText && isUltimateManualGlyph(iconText)) {
    return null;
  }

  return (
    resolveUltimateIconPack({
      hints: [semanticText, iconText],
      requested: iconText ? [iconText] : [],
      count: 1,
      family,
      seed: fallbackIndex,
    })[0] || semanticFallbackIcons[fallbackIndex % semanticFallbackIcons.length]
  );
};

/** Properties shared by SemanticIconGlyph and SemanticIconBadge. */
export interface SemanticIconProps {
  iconValue?: string;
  semanticText: string;
  color: string;
  size?: number;
  fallbackIndex?: number;
  family?: string;
  /** When true, render nothing instead of falling back to text. */
  silentFail?: boolean;
}

/**
 * Render a semantic icon (or manual glyph / fallback text).
 *
 * Resolution order:
 * 1. Manual glyph (emoji / short letter text) → rendered as text
 * 2. Resolved semantic icon → rendered via CSS mask
 * 3. Fallback text from iconValue → rendered as text
 * 4. silentFail → rendered as null
 */
export const SemanticIconGlyph: React.FC<SemanticIconProps> = ({
  iconValue,
  semanticText,
  color,
  size = 20,
  fallbackIndex = 0,
  family,
  silentFail = false,
}) => {
  const manualGlyph = getUltimateManualGlyph(iconValue);

  if (manualGlyph) {
    return (
      <span style={{color, fontSize: size * 0.72, fontWeight: 800, lineHeight: 1}}>
        {manualGlyph}
      </span>
    );
  }

  const icon = resolveSemanticIcon(iconValue, semanticText, fallbackIndex, family);

  if (!icon) {
    if (silentFail) return null;
    const text = cleanDisplayText(iconValue);
    return text ? (
      <span style={{color, fontSize: size * 0.72, fontWeight: 800, lineHeight: 1}}>{text}</span>
    ) : null;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        color,
        ...iconMaskStyle(icon),
      }}
    />
  );
};

/** Properties specific to SemanticIconBadge. */
export interface SemanticIconBadgeProps extends SemanticIconProps {
  badgeSize?: number;
  rounded?: number;
  motionDelay?: number;
  motionSeed?: number;
}

/**
 * Frosted-glass badge wrapper around SemanticIconGlyph.
 *
 * Renders the icon inside a rounded container with:
 * - Subtle border + gradient background
 * - Soft glow shadow
 * - Micro-jitter animation
 */
export const SemanticIconBadge: React.FC<SemanticIconBadgeProps> = ({
  iconValue,
  semanticText,
  color,
  badgeSize = 46,
  size = 20,
  fallbackIndex = 0,
  family,
  rounded = 16,
  motionDelay = 0,
  motionSeed,
  silentFail = false,
}) => {
  const frame = useCurrentFrame();
  const transform = withMicroJitter(frame, '', {
    delay: motionDelay,
    seed: motionSeed ?? fallbackIndex,
    amplitudeX: 0.9,
    amplitudeY: 0.8,
    rotateDeg: 0.32,
    scaleDelta: 0.003,
    settleFrames: 16,
  });

  return (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: rounded,
        border: `1px solid ${color}33`,
        background: `linear-gradient(180deg, ${color}16 0%, rgba(10, 13, 24, 0.88) 100%)`,
        boxShadow: ultimateGlow(color, 0.2),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transform,
      }}
    >
      <SemanticIconGlyph
        iconValue={iconValue}
        semanticText={semanticText}
        color={color}
        size={size}
        fallbackIndex={fallbackIndex}
        family={family}
        silentFail={silentFail}
      />
    </div>
  );
};
