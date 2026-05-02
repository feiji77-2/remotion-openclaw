import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimateStepFlowProps} from '../types';

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

export const UltimateStepFlow: React.FC<UltimateStepFlowProps & {grammar?: {staggerGap?: number}}> = ({
  heading,
  steps,
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(6, grammar?.staggerGap ?? 6);
  const visibleSteps = steps.slice(0, 5);
  const points = [
    {x: 214, y: 664},
    {x: 580, y: 498},
    {x: 960, y: 638},
    {x: 1368, y: 414},
    {x: 1702, y: 584},
  ];

  const sampleCubic = (
    t: number,
    p0: {x: number; y: number},
    p1: {x: number; y: number},
    p2: {x: number; y: number},
    p3: {x: number; y: number},
  ) => {
    const inverse = 1 - t;
    return {
      x: (inverse ** 3) * p0.x + 3 * (inverse ** 2) * t * p1.x + 3 * inverse * (t ** 2) * p2.x + (t ** 3) * p3.x,
      y: (inverse ** 3) * p0.y + 3 * (inverse ** 2) * t * p1.y + 3 * inverse * (t ** 2) * p2.y + (t ** 3) * p3.y,
    };
  };

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 96, left: 110, maxWidth: 900}}>
        <div style={{fontSize: 16, letterSpacing: 4.4, textTransform: 'uppercase', color: 'rgba(229,236,255,0.52)'}}>
          step arc
        </div>
        <div style={{marginTop: 18, fontSize: 88, lineHeight: 0.9, fontWeight: 900, letterSpacing: -4.6}}>
          {heading}
        </div>
      </div>

      <GeometryAccent variant="slanted-panel" color={resolveUltimateAccent('cyan')} opacity={0.13} style={{left: 92, top: 300, width: 320, height: 110, transform: 'rotate(-8deg)'}} />
      <GeometryAccent variant="ring" color={resolveUltimateAccent('purple')} opacity={0.18} style={{right: 112, top: 168, width: 240, height: 240}} />

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        {visibleSteps.slice(0, -1).map((step, index) => {
          const from = points[index];
          const to = points[index + 1];
          const color = toneToColor(step.accent ?? (index % 2 === 0 ? 'cyan' : 'green'));
          const delay = 10 + index * gap * 5;
          const progress = interpolate(frame, [delay, delay + 28], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const p0 = {x: from.x, y: from.y};
          const p1 = {x: from.x + 120, y: from.y - 100};
          const p2 = {x: to.x - 120, y: to.y + 100};
          const p3 = {x: to.x, y: to.y};
          const pulse = sampleCubic(Math.max(0.01, progress), p0, p1, p2, p3);
          return (
            <PathDrawLink
              key={`${step.label}-${index}`}
              d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
              color={color}
              progress={progress}
              frame={frame}
              marker={{x: pulse.x, y: pulse.y, size: 7, shape: 'ring'}}
              baseStrokeWidth={4}
              flowStrokeWidth={7}
              drawStrokeWidth={2}
              dashPattern="9 12"
              flowOpacity={0.68}
            />
          );
        })}
      </svg>

      {visibleSteps.map((step, index) => {
        const point = points[index];
        const color = toneToColor(step.accent ?? (index % 2 === 0 ? 'cyan' : 'green'));
        const side = index % 2 === 0 ? 'left' : 'right';
        const boxLeft = side === 'left' ? point.x - 24 : point.x - 314;
        const boxTop = point.y - 158;
        return (
          <div key={`${step.label}-${index}`}>
            <div
              style={{
                position: 'absolute',
                left: point.x - 14,
                top: point.y - 14,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(8,10,18,0.96)',
                border: `2px solid ${color}`,
                boxShadow: `0 0 24px ${color}44`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: boxLeft,
                top: boxTop,
                width: 290,
                textAlign: side,
              }}
            >
              <div style={{fontSize: 12, lineHeight: 1.2, letterSpacing: 2.2, color, textTransform: 'uppercase'}}>
                0{index + 1}
              </div>
              <div style={{marginTop: 10, fontSize: 34, lineHeight: 1.08, fontWeight: 840, color: '#f7fbff'}}>
                {step.label}
              </div>
              {step.detail ? (
                <div style={{marginTop: 10, fontSize: 18, lineHeight: 1.46, color: 'rgba(229,236,255,0.64)'}}>
                  {step.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
