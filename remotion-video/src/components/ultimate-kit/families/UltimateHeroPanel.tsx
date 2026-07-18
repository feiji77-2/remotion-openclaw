import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {GeometryAccent, ShockwaveWord, TextMaskWipe, ParticleBackground, DotGridParallax} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent, ultimateKitTokens} from '../tokens';
import type {UltimateHeroPanelProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';
import { useTextSlideIn, useScaleEmphasis, useFloatMotion } from '../motionGrammar';
import {UltimateHeading} from '../UltimateHeading';
import {glassPanelStyle, contentCardStyle} from '../containerStyles';

export const UltimateHeroPanel: React.FC<UltimateHeroPanelProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  kicker,
  title,
  subtitle,
  badge,
  accent = 'cyan',
  avatarLabel,
  tag,
  highlightedWord,
  lines = [],
  brandLabel,
  grammar,
  directorMeta,
}) => {
  const frame = useCurrentFrame();
  const adaptive = directorMeta?.adaptive;
  const contrastSize = adaptive?.contrast.sizeRatio ?? 1;
  const densitySpacing = adaptive?.density.spacing ?? 1;
  const densityPadding = adaptive?.density.padding ?? 1;
  const color = resolveUltimateAccent(accent);
  const revealDirection = resolveTextRevealDirection(grammar, 'center');
  const memoryWord = (highlightedWord ?? title.split(/[\s·:：，,]/).find(Boolean) ?? title).trim();
  const showShockwaveWord = memoryWord.length > 0 && !title.includes(memoryWord);
  const annotations = [badge, tag, avatarLabel, brandLabel].filter(Boolean).slice(0, 2);
  const wordReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 10),
    config: {damping: 16, stiffness: 120},
  });
  const bottomRise = interpolate(wordReveal, [0, 1], [56, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const giantScale = interpolate(frame, [0, 48], [1.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleSlideIn = useTextSlideIn(frame, 'up', 6);
  const scaleEmphasis = useScaleEmphasis(frame, 12);
  const floatMotion = useFloatMotion(frame, 30);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <DotGridParallax dotColor={`${color}18`} density={0.45} dotRadius={2} depth={3} />
      <ParticleBackground color={`${color}14`} particleCount={18} speed={0.3} seed={1} />
      <div
        style={{
          position: 'absolute',
          left: 940,
          top: 94,
          fontSize: Math.round(250 * contrastSize),
          lineHeight: 0.82,
          fontWeight: 900,
          letterSpacing: -14,
          color: `${color}20`,
          textTransform: 'uppercase',
          ...scaleEmphasis,
          transform: `scale(${giantScale}) ${scaleEmphasis.transform}`,
          transformOrigin: 'left top',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {memoryWord}
      </div>
      <GeometryAccent
        variant="ring"
        color={color}
        opacity={0.14}
        style={{
          left: 1120,
          top: 120,
          width: 560,
          height: 560,
        }}
      />
      <GeometryAccent
        variant="slanted-panel"
        color={color}
        opacity={0.16}
        style={{
          left: -80,
          bottom: 210,
          width: 680,
          height: 160,
          transform: 'rotate(-7deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 84,
          right: 84,
          bottom: 150,
          display: 'grid',
          gap: Math.round(28 * densitySpacing),
          justifyItems: 'center',
          transform: `translateY(${bottomRise}px)`,
        }}
      >
        <div style={{...glassPanelStyle(color, {density: adaptive?.density, contrast: adaptive?.contrast}), display: 'grid', gap: Math.round(18 * densitySpacing), maxWidth: 1100, textAlign: 'center'}}>
          <UltimateHeading
            heading={title}
            archetype={grammar?.archetype}
            accent={accent}
            grammar={grammar}
            kicker={kicker}
            subtitle={subtitle}
            textAlignOverride="center"
          />
        </div>
        <div style={{display: 'grid', gap: Math.round(18 * densitySpacing), justifyItems: 'center'}}>
          {showShockwaveWord ? (
            <ShockwaveWord
              word={memoryWord}
              caption={brandLabel || badge || tag || ''}
              color={color}
              maxWidth={520}
            />
          ) : (
            <div
              style={{
                fontSize: Math.round(174 * contrastSize),
                fontWeight: 900,
                letterSpacing: -9,
                lineHeight: 0.86,
                color,
                textTransform: 'lowercase',
                textShadow: `0 0 54px ${color}33`,
                textAlign: 'center',
              }}
            >
              {brandLabel || memoryWord}
            </div>
          )}
          {lines.length > 0 ? (
            <div style={{...contentCardStyle(color, {density: adaptive?.density}), display: 'grid', gap: Math.round(10 * densitySpacing), maxWidth: 520, justifyItems: 'center'}}>
              {lines.slice(0, 3).map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  style={{
                    fontSize: Math.round(18 * contrastSize),
                    lineHeight: 1.28,
                    color: index === lines.length - 1 ? '#f7fbff' : 'rgba(229,236,255,0.62)',
                    textAlign: 'center',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          ) : null}
          {annotations.length > 0 ? (
            <div style={{display: 'flex', gap: Math.round(12 * densitySpacing), flexWrap: 'wrap', justifyContent: 'center'}}>
              {annotations.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: `${Math.round(10 * densityPadding)}px ${Math.round(16 * densityPadding)}px`,
                    borderRadius: 999,
                    border: `1px solid ${color}36`,
                    background: `${color}12`,
                    color: '#f7fbff',
                    fontSize: Math.round(14 * contrastSize),
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    boxShadow: `0 0 24px ${color}12`,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
