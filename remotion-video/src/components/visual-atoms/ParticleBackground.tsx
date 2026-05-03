import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  color?: string;
  speed?: number;
  seed?: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 30,
  color = 'rgba(99, 221, 255, 0.3)',
  speed = 1,
  seed = 0,
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    const result: Particle[] = [];
    const rng = (n: number) => ((Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123) % 1 + 1) % 1;
    for (let i = 0; i < particleCount; i++) {
      result.push({
        x: rng(i * 3 + 1) * 100,
        y: rng(i * 3 + 2) * 100,
        size: 1 + rng(i * 3 + 3) * 3,
        speed: 0.2 + rng(i * 3 + 4) * 0.5,
        opacity: 0.1 + rng(i * 3 + 5) * 0.4,
        delay: rng(i * 3 + 6) * 100,
      });
    }
    return result;
  }, [particleCount, seed]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const drift = interpolate(
          Math.max(0, frame - p.delay * speed),
          [0, 200],
          [0, Math.sin(i * 1.7) * 15],
        );
        const yPos = ((p.y + frame * 0.02 * p.speed * speed + p.delay * 0.1) % 100);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(p.x + drift) % 100}%`,
              top: `${yPos}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: color,
              opacity: p.opacity,
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}
    </div>
  );
};
