import React from 'react';
import { useCurrentFrame } from 'remotion';

interface ParticleBackgroundProps {
  particleCount?: number;
  colors?: string[];
  speed?: number;
  opacityScale?: number;
}

/**
 * 深空粒子背景
 * 模拟"深空算力"感的微弱散点
 */
export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 80,
  colors = ['#FF6B35', '#FF8C42', '#00BCD4', '#FFFFFF'],
  speed = 1,
  opacityScale = 1,
}) => {
  const frame = useCurrentFrame();
  const particles = React.useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        const seed = i * 137.5;
        const x = (seed * 1.618) % 100;
        const y = (seed * 2.718) % 100;
        const isGlow = i % 6 === 0;
        const isSoft = i % 5 === 0;

        return {
          id: i,
          x,
          y,
          size: isGlow ? 2.8 : isSoft ? 1.9 : 1.2,
          color: colors[i % colors.length],
          delay: i * 5,
          driftX: isGlow ? 5.4 : 2.6,
          driftY: isGlow ? 7.4 : 3.6,
          blur: isGlow ? 1.2 : isSoft ? 0.6 : 0.2,
          glow: isGlow ? 18 : isSoft ? 10 : 5,
          baseOpacity: isGlow ? 0.1 : isSoft ? 0.075 : 0.05,
          pulse: isGlow ? 0.14 : 0.08,
        };
      }),
    [colors, particleCount],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((particle) => {
        const floatY = Math.sin((frame - particle.delay) * 0.015 * speed) * particle.driftY;
        const floatX = Math.cos((frame - particle.delay) * 0.011 * speed) * particle.driftX;
        const opacity =
          Math.min(
            1,
            (particle.baseOpacity +
              particle.pulse * ((Math.sin(frame * 0.038 + particle.id * 0.7) + 1) / 2)) * opacityScale,
          );

        return (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              background: particle.color,
              opacity,
              boxShadow: `0 0 ${particle.glow}px ${particle.color}`,
              filter: `blur(${particle.blur}px)`,
              mixBlendMode: 'screen',
              transform: `translate3d(${floatX}px, ${floatY}px, 0)`,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </div>
  );
};
