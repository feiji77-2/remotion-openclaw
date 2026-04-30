import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export interface ShockwaveWordProps {
  word: string;
  color?: string;
  caption?: string;
  delayFrames?: number;
  align?: 'center' | 'left' | 'right';
  maxWidth?: number;
}

export const ShockwaveWord: React.FC<ShockwaveWordProps> = ({
  word,
  color = '#ff9a5a',
  caption,
  delayFrames = 0,
  align = 'center',
  maxWidth = 760,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, frame - delayFrames);
  const reveal = spring({
    fps,
    frame: localFrame,
    config: {damping: 200, stiffness: 180, mass: 0.95},
  });
  const blast = interpolate(reveal, [0, 1], [0.86, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  const justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent,
        pointerEvents: 'none',
      }}
    >
      {[1, 2, 3].map((ring) => {
        const base = 240 + ring * 90;
        return (
          <div
            key={ring}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: base,
              height: base,
              transform: `translate(-50%, -50%) scale(${blast + ring * 0.05 + Math.sin(frame * 0.08 + ring) * 0.01})`,
              borderRadius: '50%',
              border: `1px solid ${color}${ring === 1 ? '88' : '44'}`,
              boxShadow: ring === 1 ? `0 0 28px ${color}44` : undefined,
              opacity: 0.42 - ring * 0.08,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 440,
          height: 440,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}18 0%, transparent 64%)`,
          filter: 'blur(10px)',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth,
          textAlign,
          transform: `scale(${blast})`,
          padding: '18px 24px',
        }}
      >
        <div
          style={{
            color: color,
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: -5,
            lineHeight: 0.92,
            textShadow: `0 0 34px ${color}44`,
          }}
        >
          {word}
        </div>
        {caption ? (
          <div
            style={{
              marginTop: 14,
              color: 'rgba(229,236,255,0.76)',
              fontSize: 22,
              lineHeight: 1.35,
              letterSpacing: 0.2,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
};
