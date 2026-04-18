import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface FlowChartProps {
  steps: { label: string; icon?: string; desc?: string }[];
  accentColor?: string;
  bgColor?: string;
}

/**
 * 横向流水线流程图 — 重新美化版
 * 背景光晕 + 节点编号 + 流动箭头 + 居中布局
 */
export const FlowChart: React.FC<FlowChartProps> = ({
  steps,
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();
  const glowPulse = (Math.sin(frame * 0.05) + 1) * 0.5;

  const nodeW = 172;
  const nodeH = 130;
  const arrowW = 72;
  const totalW = steps.length * nodeW + (steps.length - 1) * arrowW;
  const marginLeft = (1080 - totalW) / 2;

  // 背景颜色数组（5种交替）
  const nodeBgs = [
    'linear-gradient(145deg, #1e1e38, #1a1a2e)',
    'linear-gradient(145deg, #1a2030, #161a2e)',
    'linear-gradient(145deg, #1e1a30, #1a162e)',
    'linear-gradient(145deg, #1a2020, #141a1a)',
    'linear-gradient(145deg, #201a1a, #1a1414)',
  ];

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ===== 背景大光晕 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 600,
          background: `radial-gradient(ellipse, ${accentColor}12 0%, transparent 70%)`,
          opacity: 0.7 + glowPulse * 0.3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          background: `radial-gradient(ellipse, ${accentColor}18 0%, transparent 70%)`,
          opacity: 0.5 + glowPulse * 0.2,
        }}
      />

      {/* ===== 顶部标题 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontWeight: 400,
        }}
      >
        WORKFLOW
      </div>

      {/* ===== 主流程行 ===== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: marginLeft > 0 ? marginLeft : 0,
        }}
      >
        {steps.map((step, i) => {
          const itemFrame = Math.max(0, frame - i * 18);
          const translateY = spring({
            fps: 30,
            frame: itemFrame,
            config: { damping: 140, stiffness: 90 },
          });
          const opacity = interpolate(itemFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

          // 箭头流动动画
          const arrowProgress = interpolate(
            Math.max(0, frame - i * 18 - 10),
            [0, 30],
            [0, 1],
            { extrapolateRight: "clamp" }
          );

          return (
            <React.Fragment key={i}>
              {/* 步骤节点 */}
              <div
                style={{
                  width: nodeW,
                  height: nodeH,
                  background: nodeBgs[i % nodeBgs.length],
                  borderRadius: 20,
                  border: `1.5px solid ${accentColor}40`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transform: `translateY(${(1 - translateY) * -60}px)`,
                  opacity,
                  boxShadow: `
                    0 0 30px ${accentColor}20,
                    0 8px 40px rgba(0,0,0,0.5),
                    inset 0 1px 0 rgba(255,255,255,0.05)
                  `,
                  position: 'relative',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {/* 左上角编号 */}
                <div
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: -1,
                    width: 28,
                    height: 28,
                    borderRadius: '20px 0 12px 0',
                    background: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    letterSpacing: 0,
                    boxShadow: `0 0 12px ${accentColor}60`,
                  }}
                >
                  {i + 1}
                </div>

                {/* 图标 */}
                {step.icon && (
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{step.icon}</div>
                )}

                {/* 标签 */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    textAlign: 'center',
                    padding: '0 12px',
                    letterSpacing: 0.5,
                    lineHeight: 1.2,
                  }}
                >
                  {step.label}
                </div>

                {/* 描述 */}
                {step.desc && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.4)',
                      textAlign: 'center',
                      padding: '0 8px',
                      letterSpacing: 0.5,
                    }}
                  >
                    {step.desc}
                  </div>
                )}
              </div>

              {/* 箭头连接器 */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: arrowW,
                    height: 4,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: interpolate(itemFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
                  }}
                >
                  {/* 底色线 */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: 2,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}20)`,
                      borderRadius: 1,
                    }}
                  />
                  {/* 流动光效 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${arrowProgress * 60}%`,
                      width: 30,
                      height: 2,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                      boxShadow: `0 0 8px ${accentColor}`,
                      borderRadius: 1,
                    }}
                  />
                  {/* 箭头头部 */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: `10px solid ${accentColor}`,
                      borderTop: '7px solid transparent',
                      borderBottom: '7px solid transparent',
                      opacity: 0.8,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ===== 底部装饰线 ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: interpolate(frame, [30, 60], [0, 0.6], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ width: 80, height: 1, background: `${accentColor}40` }} />
        <div
          style={{
            color: `${accentColor}80`,
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          FULLY AUTOMATED
        </div>
        <div style={{ width: 80, height: 1, background: `${accentColor}40` }} />
      </div>

      {/* ===== 背景粒子 ===== */}
      {[
        { top: '15%', left: '5%', size: 3, color: accentColor },
        { top: '20%', right: '8%', size: 4, color: '#00BCD4' },
        { top: '70%', left: '8%', size: 3, color: '#8B5CF6' },
        { top: '75%', right: '5%', size: 4, color: accentColor },
        { bottom: '18%', left: '20%', size: 3, color: '#00BCD4' },
        { bottom: '22%', right: '20%', size: 3, color: '#8B5CF6' },
        { top: '40%', left: '3%', size: 2, color: accentColor },
        { top: '50%', right: '3%', size: 2, color: '#00BCD4' },
      ].map((p, i) => {
        const pFrame = Math.max(0, frame - i * 4);
        const pOpacity = interpolate(pFrame, [0, 15], [0, 0.5], { extrapolateRight: "clamp" });
        const pY = interpolate(pFrame, [0, 25], [-8, 8], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              right: p.right,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: p.color,
              opacity: pOpacity,
              transform: `translateY(${pY}px)`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        );
      })}
    </div>
  );
};
