/**
 * TextMaskWipe.tsx
 *
 * High-value visual atom: text reveals via clip-path / gradient-mask wipe.
 * Used to transition between scenes or reveal titles/keywords dramatically.
 *
 * Usage inside a family component:
 *   <TextMaskWipe text={title} wipe="left" accent="#00d4ff" />
 *
 * Integrates with registry timing: pass enterFrames/exitFrames from
 * getDefaultTiming(family).timing to control wipe timing.
 */

import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, spring} from 'remotion';

export type WipeDirection = 'left' | 'right' | 'up' | 'down' | 'center';

export interface TextMaskWipeProps {
  /** Text content to reveal */
  text: string;
  /** Wipe direction */
  direction?: WipeDirection;
  /** Accent color for the wipe edge glow */
  accent?: string;
  /** Frame at which wipe starts */
  startFrame?: number;
  /** How many frames the wipe takes to complete */
  durationFrames?: number;
  /** Font size in px */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Text color */
  color?: string;
  /** CSS font-weight */
  fontWeight?: number;
  /** Extra style for the text layer */
  textStyle?: React.CSSProperties;
  className?: string;
}

const DIRECTION_CLIP: Record<WipeDirection, string> = {
  left:   'inset(0 100% 0 0)',
  right:  'inset(0 0 0 100%)',
  up:     'inset(100% 0 0 0)',
  down:   'inset(0 0 100% 0)',
  center: 'inset(50% 50% 50% 50%)',
};

const DIRECTION_TRANSITION: Record<WipeDirection, string> = {
  left:   'inset(0 0% 0 0)',
  right:  'inset(0 0 0 0%)',
  up:     'inset(0 0 0% 0)',
  down:   'inset(0 0 0 0%)',
  center: 'inset(0% 0% 0% 0%)',
};

export const TextMaskWipe: React.FC<TextMaskWipeProps> = ({
  text,
  direction = 'left',
  accent = '#00d4ff',
  startFrame = 0,
  durationFrames = 30,
  fontSize = 96,
  fontFamily = 'Georgia, "Times New Roman", serif',
  color = '#ffffff',
  fontWeight = 700,
  textStyle,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const rawProgress = Math.min(1, elapsed / durationFrames);

  // Spring-based for a snappy feel
  const progress = spring({fps: 30, frame: elapsed, config: {damping: 14, stiffness: 120}});

  const closedClip = DIRECTION_CLIP[direction];
  const openClip = DIRECTION_TRANSITION[direction];

  // Interpolate between closed and open clip-path
  const clipTop    = interpolate(progress, [0, 1], [
    parseClipValue(closedClip, 'top'),
    parseClipValue(openClip, 'top'),
  ], {extrapolateRight: 'clamp'});
  const clipRight  = interpolate(progress, [0, 1], [
    parseClipValue(closedClip, 'right'),
    parseClipValue(openClip, 'right'),
  ], {extrapolateRight: 'clamp'});
  const clipBottom = interpolate(progress, [0, 1], [
    parseClipValue(closedClip, 'bottom'),
    parseClipValue(openClip, 'bottom'),
  ], {extrapolateRight: 'clamp'});
  const clipLeft   = interpolate(progress, [0, 1], [
    parseClipValue(closedClip, 'left'),
    parseClipValue(openClip, 'left'),
  ], {extrapolateRight: 'clamp'});

  const clipPath = `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`;

  // Edge glow fades in as wipe progresses
  const glowOpacity = interpolate(progress, [0.3, 0.9], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Glow edge behind text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at ${glowAnchor(direction)}, ${accent}40 0%, transparent 70%)`,
          opacity: glowOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Text with clip-path wipe */}
      <div
        style={{
          clipPath,
          fontFamily,
          fontSize,
          fontWeight,
          color,
          textAlign: 'center',
          letterSpacing: -1,
          lineHeight: 1.1,
          // Subtle scale-up as wipe reveals
          transform: `scale(${interpolate(progress, [0.6, 1], [0.96, 1])})`,
          transformOrigin: 'center',
          willChange: 'clip-path, transform',
          padding: '0 48px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...textStyle,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Parse a percentage value from an inset() CSS string */
function parseClipValue(clip: string, side: 'top' | 'right' | 'bottom' | 'left'): number {
  const match = clip.match(
    side === 'top' ? /inset\(([\d.]+)%/
    : side === 'right' ? /inset\([^)]+ ([\d.]+)%/
    : side === 'bottom' ? /inset\([^)]+[^)]+ ([\d.]+)%/
    : /inset\([^)]+[^)]+[^)]+ ([\d.]+)%/
  );
  return match ? parseFloat(match[1]) : 0;
}

function glowAnchor(dir: WipeDirection): string {
  switch (dir) {
    case 'left':   return '0% 50%';
    case 'right':  return '100% 50%';
    case 'up':     return '50% 0%';
    case 'down':   return '50% 100%';
    case 'center': return '50% 50%';
  }
}
