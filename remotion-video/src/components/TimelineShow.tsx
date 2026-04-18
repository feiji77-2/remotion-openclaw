import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface TimelineStep {
  time: string;
  title: string;
  desc?: string;
}

interface TimelineShowProps {
  steps: TimelineStep[];
  accentColor?: string;
  bgColor?: string;
}

/**
 * 时间线展示
 * 竖向时间线，节点依次点亮
 */
export const TimelineShow: React.FC<TimelineShowProps> = ({
  steps,
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();

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
        padding: '60px 200px',
      }}
    >
      {steps.map((step, i) => {
        const delay = i * 20;
        const itemFrame = Math.max(0, frame - delay);
        const nodeScale = spring({ fps: 30, frame: itemFrame, config: { damping: 150, stiffness: 100 } });
        const opacity = interpolate(itemFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
        const lineOpacity = i < steps.length - 1 ? interpolate(itemFrame, [10, 30], [0, 0.3], { extrapolateRight: "clamp" }) : 0;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 32,
              opacity,
            }}
          >
            {/* 左侧：时间和连接线 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 120,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontFamily: 'monospace',
                  color: accentColor,
                  fontWeight: 700,
                  transform: `scale(${nodeScale})`,
                }}
              >
                {step.time}
              </div>
              {/* 垂直连接线 */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    width: 2,
                    background: `linear-gradient(180deg, ${accentColor}, rgba(255,107,53,0.1))`,
                    marginTop: 12,
                    opacity: lineOpacity,
                    minHeight: 80,
                  }}
                />
              )}
            </div>

            {/* 右侧：节点和内容 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* 节点圆点 */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: accentColor,
                  boxShadow: `0 0 16px ${accentColor}`,
                  transform: `scale(${nodeScale})`,
                  flexShrink: 0,
                }}
              />

              {/* 内容卡片 */}
              <div
                style={{
                  padding: '20px 28px',
                  background: '#1a1a2e',
                  borderRadius: 12,
                  border: `1px solid rgba(255,107,53,0.2)`,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    marginBottom: step.desc ? 8 : 0,
                  }}
                >
                  {step.title}
                </div>
                {step.desc && (
                  <div
                    style={{
                      fontSize: 22,
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.4,
                    }}
                  >
                    {step.desc}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
