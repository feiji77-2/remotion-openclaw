import React from 'react';
import { interpolate, useCurrentFrame, spring } from 'remotion';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

export interface MiniChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  barGap?: number;
  delay?: number;
  accentColor?: string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  width = 300,
  height = 120,
  barGap = 4,
  delay = 0,
  accentColor = '#63ddff',
}) => {
  const frame = useCurrentFrame();
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  return (
    <div style={{ width, height, display: 'flex', alignItems: 'flex-end', gap: barGap }}>
      {data.map((item, i) => {
        const barProgress = spring({
          fps: 30,
          frame: Math.max(0, frame - delay - i * 4),
          config: { damping: 200, stiffness: 280 },
        });
        const barHeight = interpolate(barProgress, [0, 1], [0, (item.value / maxValue) * height]);
        const opacity = interpolate(barProgress, [0, 0.3, 1], [0, 0.6, 1]);

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: barWidth,
              height: barHeight,
              borderRadius: 4,
              background: item.color || accentColor,
              opacity,
              transition: 'none',
            }} />
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
              opacity,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: barWidth + 8,
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
