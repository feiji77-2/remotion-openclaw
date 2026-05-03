import React from 'react';
import { interpolate, useCurrentFrame, spring } from 'remotion';

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  delay?: number;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#63ddff',
  trackColor = 'rgba(255,255,255,0.08)',
  delay = 0,
  label,
}) => {
  const frame = useCurrentFrame();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const entryProgress = spring({
    fps: 30,
    frame: Math.max(0, frame - delay),
    config: { damping: 200, stiffness: 280 },
  });

  const animatedProgress = interpolate(entryProgress, [0, 1], [0, progress]);
  const offset = circumference * (1 - animatedProgress);

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <div style={{
          position: 'absolute',
          fontSize: size * 0.2,
          color: '#fff',
          fontWeight: 600,
          opacity: interpolate(entryProgress, [0, 0.5, 1], [0, 0.5, 1]),
        }}>
          {label}
        </div>
      )}
    </div>
  );
};
