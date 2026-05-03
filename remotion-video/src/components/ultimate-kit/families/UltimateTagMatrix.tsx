import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GeometryAccent, OrbitLabels, TextMaskWipe} from '../../visual-atoms';
import {resolveTextRevealDirection} from '../revealDirection';
import {resolveUltimateAccent} from '../tokens';
import {useStaggerScale, useFloatMotion} from '../motionGrammar';
import type {UltimateSceneGrammar, UltimateTagMatrixProps} from '../types';

export const UltimateTagMatrix: React.FC<UltimateTagMatrixProps & {grammar?: UltimateSceneGrammar}> = ({
  heading,
  tabs = [],
  activeTab,
  items,
  grammar,
}) => {
  const frame = useCurrentFrame();
  const color = resolveUltimateAccent('cyan');
  const revealDirection = resolveTextRevealDirection(grammar, 'left');
  return (
    <div style={{display: 'grid', gridTemplateColumns: '0.82fr 1.18fr', height: '100%', gap: 28, alignItems: 'center'}}>
      <div style={{display: 'grid', gap: 18, alignSelf: 'stretch'}}>
        <div>
          <div style={{fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color}}>orbit cluster</div>
          <div style={{position: 'relative', minHeight: 124, marginTop: 10}}>
            <TextMaskWipe
              text={heading}
              direction={revealDirection}
              accent={color}
              fontSize={80}
              color="#f7fbff"
              fontWeight={900}
              textStyle={{width: '100%', textAlign: 'left', whiteSpace: 'normal', lineHeight: 0.95, letterSpacing: -2}}
            />
          </div>
        </div>
        <div style={{display: 'grid', gap: 12, maxWidth: 520}}>
          {(tabs.length > 0 ? tabs : [activeTab].filter(Boolean)).map((tab) => (
            <div
              key={tab}
              style={{
                padding: '10px 18px',
                clipPath: 'polygon(0% 18%, 94% 0%, 100% 82%, 6% 100%)',
                border: `1px solid ${tab === activeTab ? color : 'rgba(255,255,255,0.1)'}`,
                background: tab === activeTab ? `${color}18` : 'rgba(255,255,255,0.03)',
                color: '#f7fbff',
                fontSize: 18,
                transform: `rotate(${tab === activeTab ? -1.2 : 1.1}deg)`,
              }}
            >
              {tab}
            </div>
          ))}
        </div>
        <div style={{display: 'grid', gap: 10, paddingTop: 8}}>
          {items.slice(0, 5).map((item, index) => {
            const staggerScale = useStaggerScale(frame, index, 4);
            const floatMotion = useFloatMotion(frame, index * 6, 3, 70);
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: 'rgba(229,236,255,0.72)',
                  opacity: staggerScale.opacity,
                  transform: `${staggerScale.transform} ${floatMotion.transform}`,
                }}
              >
                <div style={{width: 28, height: 1, background: `linear-gradient(90deg, ${resolveUltimateAccent(item.accent ?? 'cyan')}, transparent)`}} />
                <div style={{fontSize: 20, lineHeight: 1.25}}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: 'relative', minHeight: 620}}>
        <GeometryAccent variant="ring" color={color} opacity={0.18} style={{left: '50%', top: '50%', width: 660, height: 660, transform: 'translate(-50%, -50%)'}} />
        <GeometryAccent variant="slanted-panel" color={color} opacity={0.12} style={{left: 40, top: 70, width: 250, height: 130, transform: 'rotate(-8deg)'}} />
        <OrbitLabels
          centerLabel={heading}
          subtitle={activeTab ?? (tabs.length > 0 ? tabs.join(' • ') : undefined)}
          color={color}
          radius={270}
          items={items.map((item) => ({label: item.label, accent: resolveUltimateAccent(item.accent ?? 'cyan')}))}
        />
      </div>
    </div>
  );
};
