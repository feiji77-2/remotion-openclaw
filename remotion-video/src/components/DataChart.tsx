import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface DataChartProps {
  data: { label: string; value: number; color?: string }[];
  type?: 'bar' | 'line' | 'pie';
  title?: string;
  bgColor?: string;
  accentColor?: string;
}

/**
 * 数据图表动画
 * 支持 bar / line / pie
 * 数据条依次展开动画
 */
export const DataChart: React.FC<DataChartProps> = ({
  data,
  type = 'bar',
  title,
  bgColor = '#0D0D1A',
  accentColor = '#FF6B35',
}) => {
  const frame = useCurrentFrame();
  const maxVal = Math.max(...data.map((d) => d.value));

  const maxBarHeight = 300;
  const barW = 80;
  const gap = 24;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 48,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: `${gap}px`,
          height: maxBarHeight + 60,
        }}
      >
        {data.map((item, i) => {
          const delay = i * 8;
          const itemFrame = Math.max(0, frame - delay);
          const barH = (item.value / maxVal) * maxBarHeight;
          const animatedH = spring({ fps: 30, frame: itemFrame, config: { damping: 150, stiffness: 80 } }) * barH;
          const opacity = interpolate(itemFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
          const color = item.color || accentColor;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                opacity,
              }}
            >
              {/* 数值标签 */}
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color,
                  fontFamily: 'monospace',
                }}
              >
                {item.value.toLocaleString()}
              </div>

              {/* 柱子 */}
              <div
                style={{
                  width: barW,
                  height: animatedH,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}66 100%)`,
                  borderRadius: '8px 8px 0 0',
                  boxShadow: `0 0 20px ${color}44`,
                }}
              />

              {/* 底部标签 */}
              <div
                style={{
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  maxWidth: barW + 20,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
