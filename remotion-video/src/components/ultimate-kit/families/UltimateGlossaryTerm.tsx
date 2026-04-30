import React from 'react';
import {GeometryAccent, OrbitLabels, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateGlossaryTermProps} from '../types';

export const UltimateGlossaryTerm: React.FC<UltimateGlossaryTermProps> = ({
  heading,
  term,
  pronunciation,
  definition,
  related = [],
  accent = 'cyan',
}) => {
  const color = resolveUltimateAccent(accent);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '0.94fr 1.06fr', gap: 40, height: '100%', alignItems: 'center'}}>
      <div style={{display: 'grid', gap: 16, maxWidth: 640}}>
        <div style={{fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color}}>{heading}</div>
        <div style={{position: 'relative', minHeight: 112}}>
          <TextMaskWipe
            text={term}
            direction="center"
            accent={color}
            fontSize={94}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.92, letterSpacing: -3}}
          />
        </div>
        {pronunciation ? <div style={{fontSize: 18, letterSpacing: 2, color: `${color}cc`, fontFamily: 'JetBrains Mono, Menlo, monospace'}}>{pronunciation}</div> : null}
        <div style={{fontSize: 30, lineHeight: 1.42, color: 'rgba(229,236,255,0.78)'}}>{definition}</div>
        {related.length > 0 ? (
          <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 8}}>
            {related.slice(0, 5).map((item) => (
              <div key={item.label} style={{paddingBottom: 6, borderBottom: `1px solid ${resolveUltimateAccent(item.accent ?? accent)}66`, color: '#f7fbff', fontSize: 18}}>
                {item.label}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{position: 'relative', minHeight: 620}}>
        <GeometryAccent variant="ring" color={color} opacity={0.18} style={{left: '50%', top: '50%', width: 600, height: 600, transform: 'translate(-50%, -50%)'}} />
        <GeometryAccent variant="arc" color={color} opacity={0.24} style={{left: 120, top: 82, width: 300, height: 150}} />
        <OrbitLabels
          centerLabel={term}
          subtitle={pronunciation ?? heading}
          color={color}
          radius={248}
          items={related.map((item) => ({label: item.label, accent: resolveUltimateAccent(item.accent ?? accent)}))}
        />
      </div>
    </div>
  );
};
