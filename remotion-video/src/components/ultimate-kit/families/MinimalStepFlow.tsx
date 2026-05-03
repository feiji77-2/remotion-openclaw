/**
 * MinimalStepFlow — 极简步骤流（抖音风格）
 *
 * 每步一行文字，逐行淡入，带序号或图标
 * 无连线、无卡片，纯文字流
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {resolveUltimateAccent} from '../tokens';
import {useStaggerSlide} from '../motionGrammar';
import type {UltimateSceneGrammar} from '../types';

interface MinimalStepItem {
  label: string;
  detail?: string;
  icon?: string;
  accent?: string;
}

interface MinimalStepFlowProps {
  heading?: string;
  steps: MinimalStepItem[];
  accent?: string;
  grammar?: UltimateSceneGrammar;
}

export const MinimalStepFlow: React.FC<MinimalStepFlowProps> = ({
  heading,
  steps,
  accent = 'purple',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const color = resolveUltimateAccent(accent as 'purple');
  const gap = Math.max(8, grammar?.staggerGap ?? 10);

  // heading 淡入
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
      {/* 标题 */}
      {heading && (
        <div style={{
          fontSize: heading.length > 20 ? 48 : 64,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 60,
          opacity: headingOpacity,
        }}>
          {heading}
        </div>
      )}

      {/* 步骤列表 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 1200,
      }}>
        {steps.slice(0, 8).map((step, i) => {
          const delay = 10 + i * gap;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 120},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(reveal, [0, 1], [20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const stepColor = resolveUltimateAccent((step.accent as 'purple') ?? (i % 2 === 0 ? 'cyan' : 'green'));
          const stagger = useStaggerSlide(frame, i, 6, 'right', 20);

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              opacity: opacity * stagger.opacity,
              transform: `${stagger.transform} translateY(${y}px)`,
              width: '100%',
            }}>
              {/* 序号/图标 */}
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: stepColor,
                minWidth: 40,
                textAlign: 'center',
              }}>
                {step.icon ?? `${i + 1}`}
              </div>

              {/* 文字 */}
              <div style={{
                fontSize: step.label.length > 25 ? 32 : 40,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.4,
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
