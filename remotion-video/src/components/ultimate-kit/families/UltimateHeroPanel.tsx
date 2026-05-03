import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {GeometryAccent, ShockwaveWord, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent, ultimateKitTokens} from '../tokens';
import type {UltimateHeroPanelProps, UltimateSceneGrammar} from '../types';
import { useTextSlideIn, useScaleEmphasis, useFloatMotion } from '../motionGrammar';

export const UltimateHeroPanel: React.FC<UltimateHeroPanelProps & {grammar?: UltimateSceneGrammar}> = ({
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
}) => {
  const frame = useCurrentFrame();
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
      <div
        style={{
          position: 'absolute',
          left: 940,
          top: 94,
          fontSize: 250,
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
          bottom: 84,
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: 56,
          alignItems: 'end',
          transform: `translateY(${bottomRise}px)`,
        }}
      >
        <div style={{display: 'grid', gap: 18, maxWidth: 980}}>
          {kicker ? (
            <div style={{fontSize: 16, letterSpacing: 5.2, textTransform: 'uppercase', color, opacity: 0.9}}>
              {kicker}
            </div>
          ) : null}
          <div style={{position: 'relative', minHeight: 190, ...titleSlideIn}}>
            <TextMaskWipe
              text={title}
              direction={revealDirection}
              accent={color}
              fontSize={94}
              color="#f7fbff"
              fontWeight={900}
              fontFamily={ultimateKitTokens.fonts.display}
              textStyle={{
                width: '100%',
                textAlign: 'left',
                whiteSpace: 'normal',
                lineHeight: 0.9,
                letterSpacing: -4.4,
              }}
            />
          </div>
          {subtitle ? (
            <div style={{maxWidth: 780, fontSize: 28, lineHeight: 1.3, color: 'rgba(229,236,255,0.76)', ...floatMotion}}>
              {subtitle}
            </div>
          ) : null}
        </div>
        <div style={{display: 'grid', gap: 18, justifyItems: 'end', paddingBottom: 8}}>
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
                fontSize: 174,
                fontWeight: 900,
                letterSpacing: -9,
                lineHeight: 0.86,
                color,
                textTransform: 'lowercase',
                textShadow: `0 0 54px ${color}33`,
                textAlign: 'right',
              }}
            >
              {brandLabel || memoryWord}
            </div>
          )}
          {lines.length > 0 ? (
            <div style={{display: 'grid', gap: 10, maxWidth: 520, justifyItems: 'end'}}>
              {lines.slice(0, 3).map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  style={{
                    fontSize: 18,
                    lineHeight: 1.28,
                    color: index === lines.length - 1 ? '#f7fbff' : 'rgba(229,236,255,0.62)',
                    textAlign: 'right',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          ) : null}
          {annotations.length > 0 ? (
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
              {annotations.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: `1px solid ${color}36`,
                    background: `${color}12`,
                    color: '#f7fbff',
                    fontSize: 14,
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
