import React from 'react';
import {GeometryAccent, ShockwaveWord, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent, ultimateKitTokens} from '../tokens';
import type {UltimateHeroPanelProps} from '../types';

export const UltimateHeroPanel: React.FC<UltimateHeroPanelProps> = ({
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
}) => {
  const color = resolveUltimateAccent(accent);
  const memoryWord = highlightedWord ?? title.split(/[\s·:：，,]/).find(Boolean) ?? title;
  const annotations = [badge, tag, avatarLabel, brandLabel].filter(Boolean);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.7fr 1.3fr',
        gap: 40,
        height: '100%',
        alignItems: 'center',
      }}
    >
      <div style={{display: 'grid', gap: 18, maxWidth: 560, alignSelf: 'center'}}>
        {kicker ? (
          <div style={{fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color}}>{kicker}</div>
        ) : null}
        <div style={{position: 'relative', minHeight: 176, maxWidth: 540}}>
          <TextMaskWipe
            text={title}
            direction="center"
            accent={color}
            fontSize={74}
            color="#f7fbff"
            fontWeight={900}
            fontFamily={ultimateKitTokens.fonts.display}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.9, letterSpacing: -3}}
          />
        </div>
        {subtitle ? (
          <div style={{maxWidth: 500, fontSize: 24, lineHeight: 1.38, color: 'rgba(229,236,255,0.76)'}}>{subtitle}</div>
        ) : null}
        {lines.length > 0 ? (
          <div style={{display: 'grid', gap: 12, maxWidth: 500}}>
            {lines.slice(0, 3).map((line, index) => (
              <div key={`${line}-${index}`} style={{display: 'flex', gap: 12, alignItems: 'flex-start'}}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: color,
                    marginTop: 10,
                    boxShadow: `0 0 18px ${color}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{fontSize: 20, lineHeight: 1.4, color: 'rgba(229,236,255,0.68)'}}>{line}</div>
              </div>
            ))}
          </div>
        ) : null}
        {annotations.length > 0 ? (
          <div style={{display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4}}>
            {annotations.map((item, index) => (
              <div key={item} style={{display: 'flex', alignItems: 'center', gap: 14}}>
                <div style={{fontSize: 14, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(247,251,255,0.84)'}}>{item}</div>
                {index < annotations.length - 1 ? <div style={{width: 26, height: 1, background: `linear-gradient(90deg, ${color}, transparent)`}} /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'relative',
          height: '100%',
          minHeight: 720,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GeometryAccent variant="ring" color={color} opacity={0.16} style={{left: '50%', top: '50%', width: 720, height: 720, transform: 'translate(-50%, -50%)'}} />
        <div
          style={{
            position: 'absolute',
            top: 102,
            left: 84,
            padding: '10px 16px',
            borderRadius: 18,
            border: `1px solid ${color}44`,
            background: 'rgba(7,10,18,0.62)',
            color: '#f7fbff',
            fontSize: 14,
            letterSpacing: 2,
            textTransform: 'uppercase',
            boxShadow: `0 0 24px ${color}24`,
          }}
        >
          Memory object
        </div>
        <ShockwaveWord word={memoryWord} caption={badge ?? tag ?? subtitle} color={color} maxWidth={720} />
      </div>
    </div>
  );
};
