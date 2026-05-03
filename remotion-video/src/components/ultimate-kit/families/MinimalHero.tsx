/**
 * MinimalHero — 极简大标题（抖音风格）
 *
 * 纯黑背景 + 居中大标题 + 副标题淡入
 * 无卡片、无边框、无装饰，只有文字
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import {useTextSlideIn} from '../motionGrammar';
import type {UltimateSceneGrammar} from '../types';

interface MinimalHeroProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  accent?: string;
  lines?: string[];
  grammar?: UltimateSceneGrammar;
}

export const MinimalHero: React.FC<MinimalHeroProps> = ({
  title,
  subtitle,
  kicker,
  accent = 'purple',
  lines = [],
  grammar,
}) => {
  const frame = useCurrentFrame();
  const color = resolveUltimateAccent(accent as 'purple');

  // Text slide-in enhancement
  const titleMotion = useTextSlideIn(frame, 'up', 6);

  // 标题淡入
  const titleReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 5),
    config: {damping: 200, stiffness: 120},
  });
  const titleOpacity = interpolate(titleReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleY = interpolate(titleReveal, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 副标题延迟淡入
  const subReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 25),
    config: {damping: 200, stiffness: 100},
  });
  const subOpacity = interpolate(subReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subY = interpolate(subReveal, [0, 1], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // kicker 延迟淡入
  const kickerReveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 40),
    config: {damping: 200, stiffness: 100},
  });
  const kickerOpacity = interpolate(kickerReveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // lines 逐行淡入
  const lineReveal = (i: number) => spring({
    fps: 30,
    frame: Math.max(0, frame - 45 - i * 10),
    config: {damping: 200, stiffness: 100},
  });

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
      {/* kicker */}
      {kicker && (
        <div style={{
          fontSize: 28,
          fontWeight: 600,
          color: color,
          letterSpacing: 6,
          textTransform: 'uppercase',
          opacity: kickerOpacity,
          marginBottom: 40,
        }}>
          {kicker}
        </div>
      )}

      {/* 主标题 */}
      <div style={{
        fontSize: title.length > 30 ? 52 : title.length > 20 ? 64 : 80,
        fontWeight: 900,
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: 1.3,
        letterSpacing: -2,
        opacity: titleOpacity * titleMotion.opacity,
        transform: `${titleMotion.transform} translateY(${titleY}px)`,
      }}>
        {title}
      </div>

      {/* 副标题 */}
      {subtitle && (
        <div style={{
          fontSize: 32,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginTop: 30,
          lineHeight: 1.5,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
        }}>
          {subtitle}
        </div>
      )}

      {/* 补充行 */}
      {lines.length > 0 && (
        <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
          {lines.map((line, i) => {
            const lo = interpolate(lineReveal(i), [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const ly = interpolate(lineReveal(i), [0, 1], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return (
              <div key={i} style={{
                fontSize: 28,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                opacity: lo,
                transform: `translateY(${ly}px)`,
              }}>
                {line}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
