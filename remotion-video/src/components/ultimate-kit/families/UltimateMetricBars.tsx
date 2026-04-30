import React from 'react';
import {GeometryAccent, OrbitLabels, RadialGauge, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateMetricBarsProps} from '../types';

export const UltimateMetricBars: React.FC<UltimateMetricBarsProps> = ({heading, summary, items}) => {
  const primary = items[0];
  const orbitItems = items.slice(1, 7).map((item) => ({
    label: item.label,
    detail: item.value,
    accent: resolveUltimateAccent(item.accent ?? 'cyan'),
  }));
  return (
    <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, height: '100%', alignItems: 'center'}}>
      <div style={{position: 'relative', minHeight: 640}}>
        <GeometryAccent variant="ring" color={resolveUltimateAccent(primary?.accent ?? 'cyan')} opacity={0.18} style={{left: '50%', top: '50%', width: 620, height: 620, transform: 'translate(-50%, -50%)'}} />
        <GeometryAccent variant="arc" color={resolveUltimateAccent(primary?.accent ?? 'cyan')} opacity={0.28} style={{left: 160, top: 70, width: 340, height: 140}} />
        <OrbitLabels
          centerLabel={primary?.label ?? heading}
          centerValue={primary?.value}
          subtitle={heading}
          color={resolveUltimateAccent(primary?.accent ?? 'cyan')}
          radius={250}
          items={orbitItems}
        />
        {primary ? (
          <div style={{position: 'absolute', right: 12, bottom: 32}}>
            <RadialGauge
              progress={Math.max(0.08, Math.min(1, primary.ratio))}
              color={resolveUltimateAccent(primary.accent ?? 'cyan')}
              size={176}
              strokeWidth={12}
              valueLabel={primary.value}
              subtitle={primary.label}
            />
          </div>
        ) : null}
      </div>
      <div style={{display: 'grid', gap: 18, alignSelf: 'center'}}>
        <div style={{position: 'relative', minHeight: 112}}>
          <TextMaskWipe
            text={heading}
            direction="down"
            accent={resolveUltimateAccent(primary?.accent ?? 'cyan')}
            fontSize={74}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.96, letterSpacing: -2}}
          />
        </div>
        {summary ? <div style={{fontSize: 26, lineHeight: 1.4, color: 'rgba(229,236,255,0.74)'}}>{summary}</div> : null}
        {items.slice(0, 5).map((item) => {
          const color = resolveUltimateAccent(item.accent ?? 'cyan');
          return (
            <div key={item.label} style={{display: 'grid', gap: 10, padding: '14px 0 18px', borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 22}}>
                <span style={{color: '#f7fbff'}}>{item.label}</span>
                <span style={{color}}>{item.value}</span>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, alignItems: 'center'}}>
                <div style={{height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
                  <div style={{width: `${Math.max(6, Math.min(100, item.ratio * 100))}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.92))`}} />
                </div>
                <div style={{fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: `${color}cc`}}>
                  {Math.round(item.ratio * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
