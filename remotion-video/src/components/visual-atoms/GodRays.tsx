/**
 * GodRays.tsx
 *
 * High-value visual atom: volumetric god-ray / light-beam background.
 * Simulates atmospheric light shafts through a haze layer.
 *
 * Renders a large radial gradient source with animated ray beams.
 * Performance note: pure CSS/SVG — no canvas, no external assets.
 *
 * Usage:
 *   <GodRays color="#00d4ff" intensity={0.7} rays={8} />
 *
 * Placed behind scene content in an AbsoluteFill.
 */

import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export interface GodRaysProps {
  /** Source position as fraction of container width (0–1) */
  sourceX?: number;
  /** Source position as fraction of container height (0–1) */
  sourceY?: number;
  /** Ray source color */
  color?: string;
  /** Overall intensity 0–1 */
  intensity?: number;
  /** Number of ray beams */
  rays?: number;
  /** Base haze opacity 0–1 */
  haze?: number;
  /** Frame at which animation starts */
  startFrame?: number;
  /** Total animation duration in frames */
  durationFrames?: number;
  className?: string;
}

const WIDTH = 1920;
const HEIGHT = 1080;

export const GodRays: React.FC<GodRaysProps> = ({
  sourceX = 0.5,
  sourceY = 0.0,
  color = '#00d4ff',
  intensity = 0.65,
  rays = 8,
  haze = 0.18,
  startFrame = 0,
  durationFrames = 120,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  // Fade in then hold; fade out in the last 20 frames
  const fadeInEnd = Math.min(durationFrames * 0.3, 40);
  const fadeOutStart = durationFrames - 20;
  const opacity = elapsed < fadeInEnd
    ? elapsed / fadeInEnd
    : elapsed > fadeOutStart
      ? Math.max(0, 1 - (elapsed - fadeOutStart) / 20)
      : 1;

  const effectiveIntensity = opacity * intensity;

  // Animated ray rotation
  const rayRotation = (elapsed / durationFrames) * 15; // degrees of oscillation

  // Build ray beam paths from source to bottom
  const rayBeams = useMemo(() => {
    return Array.from({length: rays}, (_, i) => {
      const angle = (i / rays) * 180 - 90 + rayRotation;
      const rad = (angle * Math.PI) / 180;
      // Beam goes from source to bottom edge
      const x2 = sourceX * WIDTH + Math.cos(rad) * HEIGHT * 1.5;
      const y2 = sourceY * HEIGHT + Math.sin(rad) * HEIGHT * 1.5;
      // Beam width tapers from source
      const width = 60 + (i % 3) * 40;
      return {angle, x2, y2, width};
    });
  }, [rays, rayRotation, sourceX, sourceY]);

  // Hex color → rgba with alpha
  const withAlpha = (c: string, a: number) => {
    const hex = c.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(ellipse 80% 60% at ${sourceX * 100}% ${sourceY * 100}%, ${withAlpha(color, haze * effectiveIntensity * 1.5)} 0%, transparent 70%)`,
      }}
    >
      {/* Source glow */}
      <div
        style={{
          position: 'absolute',
          left: `${sourceX * 100}%`,
          top: `${sourceY * 100}%`,
          width: 200,
          height: 200,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${withAlpha(color, effectiveIntensity * 0.8)} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Ray beams — SVG for performance */}
      <svg
        width={WIDTH}
        height={HEIGHT}
        style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          {rayBeams.map((beam, i) => (
            <radialGradient
              key={i}
              id={`ray-grad-${i}`}
              cx={sourceX}
              cy={sourceY}
              r={1}
              gradientUnits="userSpaceOnUse"
              gradientTransform={`rotate(${beam.angle} ${sourceX * WIDTH} ${sourceY * HEIGHT})`}
            >
              <stop offset="0%" stopColor={color} stopOpacity={effectiveIntensity * 0.9} />
              <stop offset="40%" stopColor={color} stopOpacity={effectiveIntensity * 0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {rayBeams.map((beam, i) => {
          const cx = sourceX * WIDTH;
          const cy = sourceY * HEIGHT;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={beam.x2}
              y2={beam.y2}
              stroke={`url(#ray-grad-${i})`}
              strokeWidth={beam.width}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Atmospheric haze overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 100% 80% at ${sourceX * 100}% ${sourceY * 100}%, transparent 30%, rgba(0,0,0,0.3) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
