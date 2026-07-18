import React from 'react';
import {GeometryAccent, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent, ultimateKitTokens} from '../tokens';
import type {UltimateQuoteHighlightProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import {archetypeToHeadingStyle, archetypeToEyebrowStyle} from '../heading';

const normalizeText = (value?: string) => {
  return String(value || '').replace(/\s+/g, ' ').trim();
};

const trimText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
};

export const UltimateQuoteHighlight: React.FC<UltimateQuoteHighlightProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  quote,
  attribution,
  tags = [],
  accent = 'orange',
  grammar,
  directorMeta,
}) => {
  const color = resolveUltimateAccent(accent);
  const hs = archetypeToHeadingStyle(grammar?.archetype);
  const eb = archetypeToEyebrowStyle(grammar?.archetype);
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const spacingScale = adaptive?.density.spacing ?? 1;
  const accentWord = trimText(normalizeText(tags[0]?.label || quote), 10);
  const supportLine = trimText(normalizeText(attribution || tags[1]?.label || heading), 22);
  const footerTags = tags.slice(0, 3).map((tag) => trimText(normalizeText(tag.label), 12)).filter(Boolean);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <GeometryAccent variant="arc" color={color} opacity={0.3} style={{left: 238, top: 142, width: 520, height: 210}} />
      <GeometryAccent variant="ring" color={color} opacity={0.14} style={{left: '50%', top: '50%', width: 620, height: 620, transform: 'translate(-50%, -50%)'}} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1180,
          transform: 'translate(-50%, -52%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: Math.round(16 * spacingScale),
        }}
      >
        {/* Eyebrow — from heading prop, archetype-driven */}
        {heading && eb.show ? (
          <div style={{fontSize: eb.fontSize, letterSpacing: eb.letterSpacing, textTransform: 'uppercase', color, opacity: 0.85, fontWeight: 600, marginBottom: 8}}>
            {heading}
          </div>
        ) : null}

        {/* Main quote — archetype-driven typography */}
        {hs.useTextMaskWipe ? (
          <TextMaskWipe
            text={quote}
            direction="right"
            accent={color}
            fontSize={Math.round((hs.fontSize + 14) * sizeScale)}
            color="#f7fbff"
            fontWeight={hs.fontWeight}
            fontFamily={ultimateKitTokens.fonts.display}
            textStyle={{textAlign: 'center', lineHeight: hs.lineHeight, letterSpacing: hs.letterSpacing}}
          />
        ) : (
          <div
            style={{
              fontSize: Math.round((hs.fontSize + 14) * sizeScale),
              fontWeight: hs.fontWeight,
              letterSpacing: hs.letterSpacing,
              lineHeight: hs.lineHeight,
              color: '#f7fbff',
              fontFamily: ultimateKitTokens.fonts.display,
            }}
          >
            {quote}
          </div>
        )}

        {/* Attribution */}
        {attribution ? (
          <div style={{fontSize: Math.round(24 * sizeScale), lineHeight: 1.4, color: 'rgba(229,236,255,0.68)', maxWidth: 800, marginTop: 8}}>
            {attribution}
          </div>
        ) : null}

        {/* Decorative background word */}
        <div style={{fontSize: 188, lineHeight: 0.78, fontWeight: 900, letterSpacing: -10, color: `${color}14`, textTransform: 'uppercase', marginTop: 12, position: 'absolute', zIndex: -1, pointerEvents: 'none'}}>
          {accentWord}
        </div>
      </div>

      <div style={{position: 'absolute', left: 112, right: 112, bottom: 102, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24}}>
        <div style={{display: 'flex', gap: 14, flexWrap: 'wrap'}}>
          {footerTags.map((tag) => (
            <div key={tag} style={{paddingBottom: 6, borderBottom: `1px solid ${color}66`, color: '#f7fbff', fontSize: Math.round(18 * sizeScale)}}>
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
