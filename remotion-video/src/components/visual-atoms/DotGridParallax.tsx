/**
 * DotGridParallax.tsx
 *
 * High-value visual atom: animated dot grid with depth-layer parallax.
 * Creates a sense of depth and motion through multi-layer dot movement.
 *
 * Usage:
 *   <DotGridParallax depth={3} dotColor="#00d4ff" density={0.6} />
 *
 * Placed in an AbsoluteFill behind scene content.
 */

import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export interface DotGridParallaxProps {
  /** Number of depth layers (2–4 recommended) */
  depth?: number;
  /** Base dot color */
  dotColor?: string;
  /** Dot grid density 0–1 */
  density?: number;
  /** Dot radius in px */
  dotRadius?: number;
  /** Horizontal parallax amplitude in px (layer 1) */
  parallaxX?: number;
  /** Vertical parallax amplitude in px (layer 1) */
  parallaxY?: number;
  /** Duration of one parallax cycle in frames */
  cycleFrames?: number;
  /** Frame at which animation starts */
  startFrame?: number;
  className?: string;
}

const WIDTH = 1920;
const HEIGHT = 1080;

interface Dot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  layer: number;
}

/** Generate a stable dot grid (deterministic — no Math.random in render) */
function generateDots(
  cols: number,
  rows: number,
  density: number,
  seed: number,
): Dot[] {
  const dots: Dot[] = [];
  const cellW = WIDTH / cols;
  const cellH = HEIGHT / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Deterministic hash to avoid hydration mismatch
      const hash = Math.abs(Math.sin(seed * (row * cols + col + 1) * 127.1 + 311.7)) % 1;
      if (hash > density) continue;

      const layer = Math.floor(hash * 3); // 0, 1, 2 — depth layer
      const size = [1.2, 2, 3][layer];
      const opacity = [0.25, 0.4, 0.6][layer];

      dots.push({
        x: col * cellW + cellW / 2 + Math.sin(seed * (row + 1)) * (cellW * 0.3),
        y: row * cellH + cellH / 2 + Math.cos(seed * (col + 1)) * (cellH * 0.3),
        size,
        opacity,
        layer,
      });
    }
  }
  return dots;
}

export const DotGridParallax: React.FC<DotGridParallaxProps> = ({
  depth = 3,
  dotColor = '#00d4ff',
  dotRadius = 2.5,
  density = 0.55,
  parallaxX = 18,
  parallaxY = 9,
  cycleFrames = 180,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  // Phase offset per depth layer — deeper layers move slower
  const layerSpeed = [1, 0.55, 0.3];

  // Normalized progress 0–1 for each layer
  const progress = layerSpeed.map(
    (speed) => (elapsed * speed) / cycleFrames
  );

  // Sinusoidal offset per layer
  const offsets = progress.map((p, i) => ({
    x: Math.sin(p * Math.PI * 2) * (parallaxX / (i + 1)),
    y: Math.cos(p * Math.PI * 2) * (parallaxY / (i + 1)),
  }));

  // Fade in for first 20 frames
  const fadeIn = Math.min(1, elapsed / 20);

  // Generate stable dot grid (deterministic seed)
  const dots = useMemo(() => {
    const cols = Math.round(WIDTH / (dotRadius * 12));
    const rows = Math.round(HEIGHT / (dotRadius * 12));
    return generateDots(cols, rows, density, 42.7);
  }, [dotRadius, density]);

  // Group dots by layer
  const layerDots = [0, 1, 2].map((layer) =>
    dots.filter((d) => d.layer === layer)
  );

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        opacity: fadeIn,
        pointerEvents: 'none',
      }}
    >
      {layerDots.map((layerGroup, layerIdx) => {
        if (layerGroup.length === 0) return null;
        const offset = offsets[layerIdx];
        const layerOpacity = [0.25, 0.4, 0.6][layerIdx] * fadeIn;

        return (
          <svg
            key={layerIdx}
            width={WIDTH}
            height={HEIGHT}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              overflow: 'visible',
            }}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            {layerGroup.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dot.size * (dotRadius / 2.5)}
                fill={dotColor}
                opacity={layerOpacity}
              />
            ))}
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};
