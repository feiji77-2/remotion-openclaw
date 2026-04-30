import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export interface SplitAxisNode {
  label: string;
  value?: string;
}

export interface SplitAxisClashProps {
  leftTitle: string;
  rightTitle: string;
  leftNodes: SplitAxisNode[];
  rightNodes: SplitAxisNode[];
  leftColor?: string;
  rightColor?: string;
  collisionLabel?: string;
  thresholdLabel?: string;
}

const axisY = (index: number, total: number, frame: number, wobble = 1) => {
  const t = total <= 1 ? 0.5 : index / Math.max(1, total - 1);
  return 24 + t * 72 + Math.sin(frame * 0.05 + index * 0.8) * wobble;
};

export const SplitAxisClash: React.FC<SplitAxisClashProps> = ({
  leftTitle,
  rightTitle,
  leftNodes,
  rightNodes,
  leftColor = '#ff7a6e',
  rightColor = '#63ddff',
  collisionLabel,
  thresholdLabel,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    fps,
    frame,
    config: {damping: 200, stiffness: 170, mass: 1},
  });
  const chase = interpolate(reveal, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftX = interpolate(chase, [0, 1], [6, 48], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rightX = interpolate(chase, [0, 1], [94, 52], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{position: 'relative', width: '100%', height: '100%', pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 1,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.22), rgba(255,255,255,0.04))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 220,
          height: 220,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rightColor}18 0%, transparent 52%), radial-gradient(circle, ${leftColor}16 0%, transparent 60%)`,
          filter: 'blur(8px)',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 110,
          height: 110,
          transform: `translate(-50%, -50%) scale(${0.94 + Math.sin(frame * 0.16) * 0.04})`,
          borderRadius: '50%',
          border: `1px solid ${rightColor}66`,
          boxShadow: `0 0 26px ${leftColor}30, 0 0 48px ${rightColor}24`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f7fbff',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          background: 'rgba(7, 12, 22, 0.72)',
          textAlign: 'center',
          padding: '0 12px',
        }}
      >
        {collisionLabel ?? 'cross-over'}
      </div>
      {thresholdLabel ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, 74px)',
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(8, 12, 20, 0.52)',
            color: 'rgba(229,236,255,0.82)',
            fontSize: 12,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {thresholdLabel}
        </div>
      ) : null}
      <div style={{position: 'absolute', left: '6%', top: 0, color: leftColor, fontSize: 16, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase'}}>{leftTitle}</div>
      <div style={{position: 'absolute', right: '6%', top: 0, color: rightColor, fontSize: 16, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'right'}}>{rightTitle}</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <path d={`M ${leftX} 22 C 44 36, 46 64, 50 78`} stroke={leftColor} strokeWidth="0.45" fill="none" strokeOpacity="0.72" />
        <path d={`M ${rightX} 22 C 56 36, 54 64, 50 78`} stroke={rightColor} strokeWidth="0.45" fill="none" strokeOpacity="0.72" />
      </svg>
      {leftNodes.slice(0, 4).map((node, index) => {
        const x = interpolate(chase, [0, 1], [10 + index * 3.5, 35 + index * 3], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = axisY(index, Math.max(1, leftNodes.length), frame);
        return (
          <div
            key={`left-${node.label}-${index}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
            <div style={{width: 14, height: 14, borderRadius: '50%', background: leftColor, boxShadow: `0 0 18px ${leftColor}`}} />
            <div style={{maxWidth: 220, textAlign: 'right'}}>
              <div style={{color: '#f7fbff', fontSize: 18, fontWeight: 800, lineHeight: 1.1}}>{node.label}</div>
              {node.value ? <div style={{marginTop: 4, color: 'rgba(229,236,255,0.72)', fontSize: 14, lineHeight: 1.3}}>{node.value}</div> : null}
            </div>
          </div>
        );
      })}
      {rightNodes.slice(0, 4).map((node, index) => {
        const x = interpolate(chase, [0, 1], [90 - index * 3.5, 65 - index * 3], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = axisY(index, Math.max(1, rightNodes.length), frame, 1.2);
        return (
          <div
            key={`right-${node.label}-${index}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <div style={{width: 14, height: 14, borderRadius: '50%', background: rightColor, boxShadow: `0 0 18px ${rightColor}`}} />
            <div style={{maxWidth: 220, textAlign: 'left'}}>
              <div style={{color: '#f7fbff', fontSize: 18, fontWeight: 800, lineHeight: 1.1}}>{node.label}</div>
              {node.value ? <div style={{marginTop: 4, color: 'rgba(229,236,255,0.72)', fontSize: 14, lineHeight: 1.3}}>{node.value}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
