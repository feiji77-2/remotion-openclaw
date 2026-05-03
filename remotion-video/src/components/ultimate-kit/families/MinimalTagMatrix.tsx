/**
 * MinimalTagMatrix — 极简标签矩阵（抖音风格）
 *
 * 标签逐个弹入，无边框，纯文字+色块
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import {useStaggerScale} from '../motionGrammar';
import type {UltimateSceneGrammar} from '../types';

interface MinimalTagItem {
  label: string;
  accent?: string;
}

interface MinimalTagMatrixProps {
  heading?: string;
  items: MinimalTagItem[];
  accent?: string;
  grammar?: UltimateSceneGrammar;
}

export const MinimalTagMatrix: React.FC<MinimalTagMatrixProps> = ({
  heading,
  items,
  accent = 'purple',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(6, grammar?.staggerGap ?? 8);

  const headingReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 3),
    config: {damping: 200, stiffness: 120},
  });
  const headingOpacity = interpolate(headingReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 120px',
    }}>
      {heading && (
        <div style={{
          fontSize: heading.length > 20 ? 48 : 60,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 60,
          opacity: headingOpacity,
        }}>
          {heading}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 20,
        justifyContent: 'center',
        maxWidth: 1400,
      }}>
        {items.slice(0, 12).map((item, i) => {
          const delay = 10 + i * gap;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 160},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const scale = interpolate(reveal, [0, 1], [0.8, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const itemColor = resolveUltimateAccent((item.accent as 'purple') ?? accent as 'purple');
          const stagger = useStaggerScale(frame, i, 4);

          return (
            <div key={i} style={{
              fontSize: item.label.length > 10 ? 28 : 36,
              fontWeight: 700,
              color: '#ffffff',
              background: `${itemColor}18`,
              border: `1.5px solid ${itemColor}40`,
              borderRadius: 12,
              padding: '14px 28px',
              opacity: opacity * stagger.opacity,
              transform: `${stagger.transform} scale(${scale})`,
            }}>
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
