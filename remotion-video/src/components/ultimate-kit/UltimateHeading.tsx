/**
 * UltimateHeading.tsx — Archetype-driven typography renderer
 *
 * Renders heading text using archetype-derived typography values from heading.ts.
 * PURE TEXT RENDERER: no positioning, no layout margin, no fade-up animation.
 * Each family component controls its own positioning and entrance animation.
 *
 * DirectorScore golden rules applied:
 *  1. Archetype → heading prominence (fontSize, weight, spacing)
 *  2. CameraIntent → alignment
 *  3. Consistent font family & rendering across all scenes
 */
import React from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {TextMaskWipe} from '../visual-atoms';
import {resolveTextRevealDirection} from './revealDirection';
import {ultimateKitTokens, type UltimateAccentTone, resolveUltimateAccent} from './tokens';
import {archetypeToHeadingStyle, archetypeToEyebrowStyle} from './heading';
import type {UltimateSceneGrammar} from './types';

export interface UltimateHeadingProps {
  /** Main heading text */
  heading: string;
  /** From grammar.archetype (drives typography) */
  archetype?: string;
  /** Accent color tone */
  accent?: UltimateAccentTone;
  /** Full grammar object (for revealDirection) */
  grammar?: UltimateSceneGrammar;
  /** Optional kicker/eyebrow text above heading */
  kicker?: string;
  /** Optional subtitle below heading */
  subtitle?: string;
  /** Optional className for positioning wrapper */
  style?: React.CSSProperties;
  /** Override font size (if family needs different size than archetype default) */
  fontSizeOverride?: number;
  /** Override text alignment */
  textAlignOverride?: 'left' | 'center' | 'right';
}

export const UltimateHeading: React.FC<UltimateHeadingProps> = ({
  heading,
  archetype,
  accent: accentTone = 'cyan',
  grammar,
  kicker,
  subtitle,
  style,
  fontSizeOverride,
  textAlignOverride,
}) => {
  const frame = useCurrentFrame();
  const color = resolveUltimateAccent(accentTone);
  const hs = archetypeToHeadingStyle(archetype);
  const eb = archetypeToEyebrowStyle(archetype);
  const revealDirection = grammar ? resolveTextRevealDirection(grammar, 'center') : 'center';

  const effectiveFontSize = fontSizeOverride ?? hs.fontSize;
  const effectiveTextAlign = textAlignOverride ?? hs.textAlign;

  // Split heading into lines for burst spread archetype
  const headingLines = hs.splitLines
    ? splitHeadingLines(heading, hs.splitCharsPerLine)
    : [heading];

  const containerStyle: React.CSSProperties = {
    maxWidth: hs.maxWidth,
    ...style,
  };

  return (
    <div style={containerStyle}>
      {/* Eyebrow / kicker */}
      {kicker && eb.show ? (
        <div
          style={{
            fontSize: eb.fontSize,
            letterSpacing: eb.letterSpacing,
            textTransform: 'uppercase',
            color,
            opacity: 0.9,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          {kicker}
        </div>
      ) : null}

      {/* Main heading */}
      {hs.useTextMaskWipe && !hs.splitLines ? (
        <div style={{position: 'relative', minHeight: effectiveFontSize * hs.lineHeight}}>
          <TextMaskWipe
            text={heading}
            direction={revealDirection}
            accent={color}
            fontSize={effectiveFontSize}
            color="#f7fbff"
            fontWeight={hs.fontWeight}
            fontFamily={ultimateKitTokens.fonts.display}
            textStyle={{
              width: '100%',
              textAlign: effectiveTextAlign as 'left' | 'center',
              whiteSpace: 'normal',
              lineHeight: hs.lineHeight,
              letterSpacing: hs.letterSpacing,
            }}
          />
        </div>
      ) : hs.splitLines ? (
        <div style={{display: 'grid', gap: 4}}>
          {headingLines.map((line, i) => {
            const lineReveal = spring({
              fps: 30,
              frame: Math.max(0, frame - 4 - i * 3),
              config: {damping: 18, stiffness: 110},
            });
            return (
              <div
                key={`${line}-${i}`}
                style={{
                  fontSize: effectiveFontSize - (i > 0 ? 4 : 0),
                  fontWeight: hs.fontWeight,
                  letterSpacing: hs.letterSpacing,
                  lineHeight: hs.lineHeight,
                  color: '#f7fbff',
                  fontFamily: ultimateKitTokens.fonts.display,
                  textAlign: effectiveTextAlign as 'left' | 'center',
                  opacity: lineReveal,
                  transform: `translateY(${(1 - lineReveal) * 20}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      ) : (
        /* Plain div heading (drift reveal default) */
        <div
          style={{
            fontSize: effectiveFontSize,
            fontWeight: hs.fontWeight,
            letterSpacing: hs.letterSpacing,
            lineHeight: hs.lineHeight,
            color: '#f7fbff',
            fontFamily: ultimateKitTokens.fonts.display,
            textAlign: effectiveTextAlign as 'left' | 'center',
          }}
        >
          {heading}
        </div>
      )}

      {/* Subtitle */}
      {subtitle ? (
        <div
          style={{
            marginTop: 16,
            fontSize: Math.min(24, Math.round(effectiveFontSize * 0.26)),
            lineHeight: 1.4,
            color: ultimateKitTokens.colors.textMuted,
            fontFamily: ultimateKitTokens.fonts.ui,
            maxWidth: hs.maxWidth * 0.85,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Split a heading string into visual lines based on char limit.
 * Respects natural break points (colon, comma, space).
 */
function splitHeadingLines(text: string, charsPerLine: number): string[] {
  if (text.length <= charsPerLine) return [text];

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= charsPerLine) {
      lines.push(remaining);
      break;
    }

    // Try to break at a natural point
    const slice = remaining.slice(0, charsPerLine);
    const lastComma = slice.lastIndexOf('，');
    const lastColon = slice.lastIndexOf('：');
    const lastSpace = slice.lastIndexOf(' ');
    const breakAt = Math.max(lastComma, lastColon, lastSpace);

    if (breakAt > charsPerLine * 0.4) {
      lines.push(remaining.slice(0, breakAt + 1));
      remaining = remaining.slice(breakAt + 1).trim();
    } else {
      // Hard break at char limit
      lines.push(slice);
      remaining = remaining.slice(charsPerLine).trim();
    }
  }

  return lines;
}

export default UltimateHeading;
