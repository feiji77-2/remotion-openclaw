import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {resolveUltimateAccent} from '../tokens';
import type {UltimatePipelineFlowProps} from '../types';

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

export const UltimatePipelineFlow: React.FC<UltimatePipelineFlowProps & {grammar?: {staggerGap?: number}}> = ({
  heading,
  summary,
  stages,
  accent = 'green',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(6, grammar?.staggerGap ?? 6);
  const accentColor = toneToColor(accent);
  const visibleStages = stages.slice(0, 4);
  const points = [
    {x: 240, y: 696},
    {x: 664, y: 450},
    {x: 1120, y: 642},
    {x: 1624, y: 396},
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
      <div style={{position: 'absolute', top: 98, left: 110, right: 110}}>
        <div style={{fontSize: 16, letterSpacing: 4.4, textTransform: 'uppercase', color: accentColor}}>
          pipeline trace
        </div>
        <div style={{marginTop: 18, fontSize: 88, lineHeight: 0.9, fontWeight: 900, letterSpacing: -4.8}}>
          {heading}
        </div>
        {summary ? (
          <div style={{marginTop: 18, maxWidth: 740, fontSize: 24, lineHeight: 1.4, color: 'rgba(229,236,255,0.7)'}}>
            {summary}
          </div>
        ) : null}
      </div>

      <GeometryAccent variant="slanted-panel" color={accentColor} opacity={0.14} style={{left: 96, top: 296, width: 520, height: 120, transform: 'rotate(-8deg)'}} />
      <GeometryAccent variant="ring" color={accentColor} opacity={0.18} style={{right: 110, bottom: 142, width: 220, height: 220}} />

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        {visibleStages.slice(0, -1).map((stage, index) => {
          const from = points[index];
          const to = points[index + 1];
          const color = toneToColor(stage.accent ?? (index === 0 ? accent : index === 1 ? 'cyan' : 'yellow'));
          const delay = 24 + index * gap * 5;
          const progress = interpolate(frame, [delay, delay + 28], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const p0 = {x: from.x, y: from.y};
          const p1 = {x: from.x + 130, y: from.y - 120};
          const p2 = {x: to.x - 130, y: to.y + 120};
          const p3 = {x: to.x, y: to.y};
          const pulse = sampleCubic(Math.max(0.01, progress), p0, p1, p2, p3);
          return (
            <PathDrawLink
              key={`${stage.label}-${index}`}
              d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
              color={color}
              progress={progress}
              frame={frame}
              marker={{x: pulse.x, y: pulse.y, size: 7, shape: 'diamond'}}
              baseStrokeWidth={5}
              flowStrokeWidth={8}
              drawStrokeWidth={2}
              dashPattern="14 14"
              flowOpacity={0.72}
            />
          );
        })}
      </svg>

      {visibleStages.map((stage, index) => {
        const point = points[index];
        const color = toneToColor(stage.accent ?? (index === 0 ? accent : index === 1 ? 'cyan' : index === 2 ? 'yellow' : 'purple'));
        const align = index === visibleStages.length - 1 ? 'right' : 'left';
        const left = align === 'right' ? point.x - 280 : point.x - 12;
        return (
          <div key={`${stage.label}-${index}`}>
            <div
              style={{
                position: 'absolute',
                left: point.x - 16,
                top: point.y - 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(8,10,18,0.92)',
                border: `2px solid ${color}`,
                boxShadow: `0 0 24px ${color}44`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left,
                top: point.y - 160,
                width: 280,
                textAlign: align,
              }}
            >
              <div style={{fontSize: 12, lineHeight: 1.2, letterSpacing: 2.1, color, textTransform: 'uppercase'}}>
                0{index + 1}
              </div>
              <div style={{marginTop: 14, fontSize: 36, fontWeight: 840, lineHeight: 1.08, color: '#f7fbff'}}>
                {stage.label}
              </div>
              {stage.detail ? (
                <div style={{marginTop: 10, fontSize: 18, lineHeight: 1.46, color: 'rgba(229,236,255,0.64)'}}>
                  {stage.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
