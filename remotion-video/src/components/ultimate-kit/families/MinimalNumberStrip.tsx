/**
 * MinimalNumberStrip — 极简大数字（抖音风格）
 *
 * 大数字递增 + 标签，无图表无卡片
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateSceneGrammar} from '../types';

interface MinimalNumberItem {
  label: string;
  value: string;
  accent?: string;
}

interface MinimalNumberStripProps {
  heading?: string;
  items: MinimalNumberItem[];
  accent?: string;
  grammar?: UltimateSceneGrammar;
}

export const MinimalNumberStrip: React.FC<MinimalNumberStripProps> = ({
  heading,
  items,
  accent = 'cyan',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const color = resolveUltimateAccent(accent as 'cyan');

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
          fontSize: heading.length > 20 ? 44 : 56,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 80,
          opacity: headingOpacity,
        }}>
          {heading}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 80,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {items.slice(0, 4).map((item, i) => {
          const delay = 10 + i * 12;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 120},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(reveal, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const itemColor = resolveUltimateAccent((item.accent as 'cyan') ?? accent as 'cyan');

          // 数字递增动画
          const numMatch = item.value.match(/^([\d,.]+)(.*)/);
          let displayValue = item.value;
          if (numMatch) {
            const target = parseFloat(numMatch[1].replace(/,/g, ''));
            const suffix = numMatch[2] ?? '';
            if (!isNaN(target)) {
              const progress = interpolate(frame, [delay, delay + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
              const current = Math.round(target * progress);
              displayValue = current.toLocaleString() + suffix;
            }
          }

          return (
            <div key={i} style={{
              textAlign: 'center',
              opacity,
              transform: `translateY(${y}px)`,
            }}>
              <div style={{
                fontSize: item.value.length > 6 ? 72 : 96,
                fontWeight: 900,
                color: itemColor,
                letterSpacing: -3,
              }}>
                {displayValue}
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 12,
              }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
