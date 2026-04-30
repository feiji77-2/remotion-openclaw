import React from 'react';
import {GeometryAccent, ReticleLockOn, TextMaskWipe} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateCtaPanelProps} from '../types';

export const UltimateCtaPanel: React.FC<UltimateCtaPanelProps> = ({heading, subtitle, searchLabel, badge, highlights = []}) => {
  const color = resolveUltimateAccent('lime');
  return (
    <div style={{display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 22, height: '100%'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        {badge ? <div style={{paddingBottom: 6, borderBottom: `1px solid ${color}88`, color: '#f7fbff', fontSize: 19, letterSpacing: 2.4, textTransform: 'uppercase'}}>{badge}</div> : <div />}
        {searchLabel ? <div style={{fontSize: 18, letterSpacing: 2, color: 'rgba(229,236,255,0.5)'}}>{searchLabel}</div> : null}
      </div>
      <div style={{position: 'relative', minHeight: 560, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <GeometryAccent variant="ring" color={color} opacity={0.18} style={{left: '50%', top: '50%', width: 620, height: 620, transform: 'translate(-50%, -50%)'}} />
        <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 210, top: 64, width: 260, height: 130, transform: 'rotate(-7deg)'}} />
        <ReticleLockOn target={heading} caption={subtitle ?? highlights.join(' · ')} color={color} size={620} showBeam />
      </div>
      <div style={{display: 'grid', gap: 16, justifyItems: 'center'}}>
        <div style={{position: 'relative', minHeight: 72, minWidth: 860}}>
          <TextMaskWipe
            text={heading}
            direction="center"
            accent={color}
            fontSize={64}
            color="#f7fbff"
            fontWeight={900}
            textStyle={{width: '100%', textAlign: 'center', whiteSpace: 'normal', lineHeight: 0.94, letterSpacing: -2}}
          />
        </div>
        {subtitle ? <div style={{fontSize: 30, lineHeight: 1.4, color: 'rgba(229,236,255,0.82)', textAlign: 'center', maxWidth: 920}}>{subtitle}</div> : null}
        {highlights.length > 0 ? (
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center'}}>
            {highlights.slice(0, 4).map((item) => (
              <div key={item} style={{paddingBottom: 6, borderBottom: `1px solid ${color}66`, color: '#f7fbff', fontSize: 18}}>
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
