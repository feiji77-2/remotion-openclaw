import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface StatsBarProps {
  stats: { label: string; value: number; maxValue?: number; color?: string }[];
  title?: string;
  bgColor?: string;
  accentColor?: string;
}

/**
 * 统计条动画
 * 横向进度条，逐一展开
 */
export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  title,
  bgColor = '#0D0D1A',
  accentColor = '#FF6B35',
}) => {
  const frame = useCurrentFrame();
  const barMaxW = 700;
  const barH = 32;
  const gap = 40;

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
            fontSize: 40,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 60,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: gap }}>
        {stats.map((stat, i) => {
          const delay = i * 12;
          const itemFrame = Math.max(0, frame - delay);
          const progress = spring({ fps: 30, frame: itemFrame, config: { damping: 120, stiffness: 80 } });
          const opacity = interpolate(itemFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
          const maxV = stat.maxValue || 100;
          const barW = (stat.value / maxV) * barMaxW * progress;
          const color = stat.color || accentColor;

          return (
            <div key={i} style={{ opacity }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: 22,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <span>{stat.label}</span>
                <span style={{ color, fontFamily: 'monospace', fontWeight: 700 }}>
                  {stat.value}%
                </span>
              </div>
              <div
                style={{
                  width: barMaxW,
                  height: barH,
                  background: '#1a1a2e',
                  borderRadius: barH / 2,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: barW,
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    borderRadius: barH / 2,
                    boxShadow: `0 0 12px ${color}66`,
                  }}
                />
                {/* 进度点 */}
                <div
                  style={{
                    position: 'absolute',
                    right: barW - 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
