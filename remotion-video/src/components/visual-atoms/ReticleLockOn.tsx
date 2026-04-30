import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export interface ReticleLockOnProps {
  target: string;
  caption?: string;
  color?: string;
  delayFrames?: number;
  size?: number;
  showBeam?: boolean;
  align?: 'center' | 'left' | 'right';
}

export const ReticleLockOn: React.FC<ReticleLockOnProps> = ({
  target,
  caption,
  color = '#63ddff',
  delayFrames = 0,
  size = 440,
  showBeam = true,
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, frame - delayFrames);
  const lock = spring({
    fps,
    frame: localFrame,
    config: {damping: 200, stiffness: 180, mass: 0.9},
  });
  const scan = interpolate(localFrame % 64, [0, 63], [-size * 0.36, size * 0.36], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = 0.92 + Math.sin(localFrame * 0.16) * 0.05;
  const haloOpacity = interpolate(lock, [0, 1], [0.04, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: size * 0.18,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 62%)`,
          opacity: haloOpacity,
          filter: 'blur(12px)',
          transform: `scale(${1.02 + lock * 0.04})`,
        }}
      />
      {[1, 2, 3].map((ring) => {
        const inset = size * (0.16 + ring * 0.08);
        const opacity = Math.max(0.12, 0.42 - ring * 0.1);
        return (
          <div
            key={ring}
            style={{
              position: 'absolute',
              inset,
              borderRadius: '50%',
              border: `1px solid ${color}${ring === 1 ? 'aa' : '66'}`,
              opacity,
              transform: `scale(${pulse + ring * 0.02})`,
              boxShadow: ring === 1 ? `0 0 28px ${color}66` : undefined,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: size * 0.1,
          width: 1,
          height: size * 0.16,
          background: `linear-gradient(180deg, ${color}00 0%, ${color}cc 100%)`,
          transform: 'translateX(-50%)',
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: size * 0.1,
          width: 1,
          height: size * 0.16,
          background: `linear-gradient(180deg, ${color}cc 0%, ${color}00 100%)`,
          transform: 'translateX(-50%)',
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: size * 0.1,
          width: size * 0.16,
          height: 1,
          background: `linear-gradient(90deg, ${color}00 0%, ${color}cc 100%)`,
          transform: 'translateY(-50%)',
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: size * 0.1,
          width: size * 0.16,
          height: 1,
          background: `linear-gradient(90deg, ${color}cc 0%, ${color}00 100%)`,
          transform: 'translateY(-50%)',
          opacity: 0.7,
        }}
      />
      {showBeam ? (
        <div
          style={{
            position: 'absolute',
            top: size * 0.22,
            bottom: size * 0.22,
            width: size * 0.18,
            left: `calc(50% + ${scan}px - ${size * 0.09}px)`,
            background: `linear-gradient(180deg, ${color}00 0%, ${color}20 18%, ${color}66 50%, ${color}20 82%, ${color}00 100%)`,
            opacity: 0.5,
            filter: 'blur(2px)',
            borderRadius: 999,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'relative',
          width: size * 0.58,
          padding: '18px 22px',
          borderRadius: 24,
          border: `1px solid ${color}55`,
          background: 'rgba(6, 12, 22, 0.6)',
          boxShadow: `0 0 30px ${color}22, inset 0 0 0 1px rgba(255,255,255,0.04)`,
          transform: `scale(${0.92 + lock * 0.08})`,
          textAlign,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: Math.max(26, size * 0.09),
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -2,
            color: '#f5f7ff',
            textShadow: `0 0 24px ${color}55`,
          }}
        >
          {target}
        </div>
        {caption ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: Math.max(13, size * 0.03),
              lineHeight: 1.35,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'rgba(229, 236, 255, 0.72)',
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
};
