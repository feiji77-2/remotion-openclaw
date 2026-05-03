/**
 * MinimalTimeline — 极简时间线（抖音风格）
 *
 * 时间节点逐个出现，无连线无装饰
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateSceneGrammar} from '../types';

interface MinimalTimelineItem {
  label: string;
  title: string;
  detail?: string;
  accent?: string;
}

interface MinimalTimelineProps {
  heading?: string;
  items: MinimalTimelineItem[];
  accent?: string;
  grammar?: UltimateSceneGrammar;
}

export const MinimalTimeline: React.FC<MinimalTimelineProps> = ({
  heading,
  items,
  accent = 'cyan',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(8, grammar?.staggerGap ?? 12);

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
      padding: '0 160px',
    }}>
      {heading && (
        <div style={{
          fontSize: heading.length > 20 ? 44 : 56,
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
        flexDirection: 'column',
        gap: 32,
        width: '100%',
        maxWidth: 1100,
      }}>
        {items.slice(0, 6).map((item, i) => {
          const delay = 10 + i * gap;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 120},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x = interpolate(reveal, [0, 1], [-30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const itemColor = resolveUltimateAccent((item.accent as 'cyan') ?? (i % 2 === 0 ? 'cyan' : 'green'));

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24,
              opacity,
              transform: `translateX(${x}px)`,
            }}>
              {/* 时间标签 */}
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: itemColor,
                minWidth: 160,
                textAlign: 'right',
                paddingTop: 6,
              }}>
                {item.label}
              </div>

              {/* 圆点 */}
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: itemColor,
                marginTop: 12,
                flexShrink: 0,
              }} />

              {/* 内容 */}
              <div style={{flex: 1}}>
                <div style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.4,
                }}>
                  {item.title}
                </div>
                {item.detail && (
                  <div style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 8,
                  }}>
                    {item.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
