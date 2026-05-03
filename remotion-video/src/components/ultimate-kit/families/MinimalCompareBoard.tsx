/**
 * MinimalCompareBoard — 极简对比（抖音风格）
 *
 * 左右对比文字，中间分隔线
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import {useTextSlideIn} from '../motionGrammar';
import type {UltimateSceneGrammar} from '../types';

interface MinimalCompareSide {
  title: string;
  items?: string[];
  accent?: string;
}

interface MinimalCompareBoardProps {
  heading?: string;
  left: MinimalCompareSide;
  right: MinimalCompareSide;
  accent?: string;
  grammar?: UltimateSceneGrammar;
}

export const MinimalCompareBoard: React.FC<MinimalCompareBoardProps> = ({
  heading,
  left,
  right,
  accent = 'purple',
  grammar,
}) => {
  const frame = useCurrentFrame();

  const headingReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 3),
    config: {damping: 200, stiffness: 120},
  });
  const headingOpacity = interpolate(headingReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 左侧淡入
  const leftReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 10),
    config: {damping: 200, stiffness: 120},
  });
  const leftOpacity = interpolate(leftReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const leftX = interpolate(leftReveal, [0, 1], [-40, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 分隔线淡入
  const lineReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 20),
    config: {damping: 200, stiffness: 120},
  });
  const lineOpacity = interpolate(lineReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lineHeight = interpolate(lineReveal, [0, 1], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 右侧淡入
  const rightReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 30),
    config: {damping: 200, stiffness: 120},
  });
  const rightOpacity = interpolate(rightReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rightX = interpolate(rightReveal, [0, 1], [40, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const leftColor = resolveUltimateAccent((left.accent as 'purple') ?? 'purple');
  const rightColor = resolveUltimateAccent((right.accent as 'cyan') ?? 'cyan');
  const leftMotion = useTextSlideIn(frame, 'left', 0);
  const rightMotion = useTextSlideIn(frame, 'right', 3);

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
          marginBottom: 60,
          opacity: headingOpacity,
        }}>
          {heading}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 60,
        width: '100%',
        maxWidth: 1400,
      }}>
        {/* 左侧 */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          opacity: leftOpacity * leftMotion.opacity,
          transform: `${leftMotion.transform} translateX(${leftX}px)`,
        }}>
          <div style={{fontSize: 48, fontWeight: 900, color: leftColor, marginBottom: 20}}>
            {left.title}
          </div>
          {left.items?.map((item, i) => (
            <div key={i} style={{fontSize: 28, color: 'rgba(255,255,255,0.6)', marginBottom: 12}}>
              {item}
            </div>
          ))}
        </div>

        {/* 分隔线 */}
        <div style={{
          width: 2,
          background: `linear-gradient(to bottom, transparent, ${leftColor}, ${rightColor}, transparent)`,
          opacity: lineOpacity,
          height: `${lineHeight}%`,
          flexShrink: 0,
        }} />

        {/* 右侧 */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          opacity: rightOpacity * rightMotion.opacity,
          transform: `${rightMotion.transform} translateX(${rightX}px)`,
        }}>
          <div style={{fontSize: 48, fontWeight: 900, color: rightColor, marginBottom: 20}}>
            {right.title}
          </div>
          {right.items?.map((item, i) => (
            <div key={i} style={{fontSize: 28, color: 'rgba(255,255,255,0.6)', marginBottom: 12}}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
