import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {
  POSTER_CLOSED_LOOP_LABEL_TOP,
  POSTER_FLOW_LABEL_TOP,
  POSTER_FLOW_ROW_TOP,
  POSTER_SIDE_PADDING,
  POSTER_SIGNAL_TOP,
} from '../render/layoutRhythm';

interface LoopFlowDiagramProps {
  openLoopSteps: string[];
  closedLoopSteps: string[];
  title?: string;
  bgColor?: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const LoopFlowDiagram: React.FC<LoopFlowDiagramProps> = ({
  openLoopSteps,
  closedLoopSteps,
  title = '闭环 vs 开环',
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();
  const openProgress = clamp01(frame / 24);
  const closedProgress = clamp01((frame - 18) / 24);
  const cx = 540;
  const cy = 1080;
  const radius = 240;

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 58%, rgba(0,212,255,0.12), transparent 30%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: POSTER_SIGNAL_TOP,
          left: POSTER_SIDE_PADDING,
          color: 'rgba(235,242,255,0.52)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 2.6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>

      <div
        style={{
          position: 'absolute',
          left: POSTER_SIDE_PADDING,
          right: POSTER_SIDE_PADDING,
          top: POSTER_FLOW_ROW_TOP,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 28,
          opacity: openProgress,
          transform: `translateY(${interpolate(openProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        {openLoopSteps.map((step, index) => (
          <React.Fragment key={step}>
            <div
              style={{
                color: 'rgba(236,242,255,0.56)',
                fontSize: 28,
                fontWeight: 540,
                letterSpacing: -0.2,
              }}
            >
              {step}
            </div>
            {index < openLoopSteps.length - 1 ? (
              <div
                style={{
                  width: 88,
                  height: 1,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
                }}
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: POSTER_SIDE_PADDING,
          top: POSTER_FLOW_LABEL_TOP,
          color: 'rgba(255,255,255,0.28)',
          fontSize: 18,
          fontWeight: 650,
          letterSpacing: 1.4,
        }}
      >
        开环执行
      </div>

      <svg
        width={1080}
        height={1920}
        style={{position: 'absolute', inset: 0}}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(0,212,255,0.22)"
          strokeWidth={2}
          opacity={closedProgress}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#00d4ff"
          strokeWidth={4}
          strokeDasharray={`${radius * 1.7} ${radius * 4.7}`}
          strokeDashoffset={-frame * 4}
          opacity={0.72 * closedProgress}
          style={{filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.35))'}}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: POSTER_SIDE_PADDING,
          top: POSTER_CLOSED_LOOP_LABEL_TOP,
          color: '#00d4ff',
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 1.6,
          opacity: closedProgress,
        }}
      >
        闭环学习
      </div>

      {closedLoopSteps.map((step, index) => {
        const angle = -Math.PI / 2 + (index / closedLoopSteps.length) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const progress = clamp01((frame - 24 - index * 6) / 18);

        return (
          <React.Fragment key={step}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${interpolate(progress, [0, 1], [0.84, 1])})`,
                opacity: progress,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#00d4ff',
                  boxShadow: '0 0 10px rgba(0,212,255,0.45)',
                  margin: '0 auto 14px',
                }}
              />
              <div
                style={{
                  color: '#ecf6ff',
                  fontSize: 24,
                  fontWeight: 560,
                  textAlign: 'center',
                  letterSpacing: -0.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {step}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
