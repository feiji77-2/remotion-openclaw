import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface CountUpProps {
  value: number;
  label: string;
  unit?: string;
  prefix?: string;
  suffix?: string;
  accentColor?: string;
  bgColor?: string;
}

/**
 * 数字滚动动画 — 重新美化版
 * 中心发光球 + 图标装饰 + 两侧说明 + 数字光晕
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  label,
  unit = '',
  prefix = '',
  suffix = '',
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();
  const duration = 60; // 2秒滚动完

  const progress = Math.min(1, frame / duration);
  const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
  const currentValue = Math.round(value * eased);

  // 入场缩放
  const scale = spring({ fps: 30, frame, config: { damping: 160, stiffness: 100 } });

  // 光晕呼吸
  const glowPulse = (Math.sin(frame * 0.05) + 1) * 0.5; // 0-1
  const glowOpacity = 0.3 + glowPulse * 0.4;

  // 数字颜色亮度
  const glowIntensity = 0.5 + glowPulse * 0.3;

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
      {/* ===== 背景：多层径向渐变发光球 ===== */}
      {/* 最外层大光晕 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
          opacity: 0.6 + glowPulse * 0.3,
        }}
      />
      {/* 中层光晕 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />
      {/* 内层核心光 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}80 0%, transparent 70%)`,
          opacity: glowIntensity,
        }}
      />

      {/* ===== 顶部小标签 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 140,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 14,
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontWeight: 400,
        }}
      >
        SUPPORT SCENES
      </div>

      {/* ===== 左上角图标 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '44%',
          left: '20%',
          transform: 'translateY(-50%)',
          fontSize: 48,
          opacity: 0.5,
        }}
      >
        ⚡
      </div>

      {/* ===== 右上角图标 ===== */}
      <div
        style={{
          position: 'absolute',
          top: '44%',
          right: '20%',
          transform: 'translateY(-50%)',
          fontSize: 48,
          opacity: 0.5,
        }}
      >
        🚀
      </div>

      {/* ===== 主数字区域 ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          zIndex: 1,
        }}
      >
        {/* 前缀 */}
        {prefix && (
          <div
            style={{
              fontSize: 80,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 2,
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {prefix}
          </div>
        )}

        {/* 核心数字 */}
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: accentColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: `
              0 0 60px ${accentColor}88,
              0 0 120px ${accentColor}44,
              0 0 200px ${accentColor}22
            `,
            letterSpacing: -8,
            lineHeight: 1,
            filter: `brightness(${1 + glowPulse * 0.2})`,
          }}
        >
          {currentValue.toLocaleString()}
        </div>

        {/* 单位 + 后缀 */}
        {(unit || suffix) && (
          <div
            style={{
              fontSize: 60,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: 2,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {unit || ''}{suffix || ''}
          </div>
        )}
      </div>

      {/* ===== 左右两侧装饰线 + 标签 ===== */}
      {/* 左侧 */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${accentColor}60)` }} />
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>覆盖</div>
        <div style={{ color: accentColor, fontSize: 22, fontWeight: 700 }}>全</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>场景</div>
        <div style={{ width: 1, height: 40, background: `linear-gradient(to top, transparent, ${accentColor}60)` }} />
      </div>

      {/* 右侧 */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${accentColor}60)` }} />
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>自动</div>
        <div style={{ color: accentColor, fontSize: 22, fontWeight: 700 }}>匹配</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>智能</div>
        <div style={{ width: 1, height: 40, background: `linear-gradient(to top, transparent, ${accentColor}60)` }} />
      </div>

      {/* ===== 底部标签 ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div style={{ width: 60, height: 2, background: accentColor, borderRadius: 1, opacity: 0.5 }} />
        <div
          style={{
            padding: '10px 32px',
            border: `1.5px solid ${accentColor}60`,
            borderRadius: 50,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
            background: `${accentColor}10`,
          }}
        >
          {label}
        </div>
        <div style={{ width: 60, height: 2, background: accentColor, borderRadius: 1, opacity: 0.5 }} />
      </div>

      {/* ===== 底部装饰小圆点 ===== */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 120 + i * 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: i === 2 ? 6 : 3,
            height: i === 2 ? 6 : 3,
            borderRadius: '50%',
            background: i === 2 ? accentColor : `${accentColor}40`,
          }}
        />
      ))}

      {/* ===== 背景粒子 ===== */}
      {[
        { top: '15%', left: '10%', size: 4, delay: 0 },
        { top: '25%', right: '12%', size: 3, delay: 8 },
        { top: '70%', left: '8%', size: 5, delay: 4 },
        { top: '75%', right: '10%', size: 3, delay: 12 },
        { top: '85%', left: '25%', size: 4, delay: 6 },
        { top: '20%', left: '30%', size: 3, delay: 10 },
        { top: '80%', right: '25%', size: 4, delay: 2 },
      ].map((p, i) => {
        const pFrame = Math.max(0, frame - p.delay);
        const pOpacity = interpolate(pFrame, [0, 15], [0, 0.6], { extrapolateRight: "clamp" });
        const pY = interpolate(pFrame, [0, 30], [-10, 10], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              ...(p.left !== undefined ? { left: p.left } : { right: p.right }),
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: accentColor,
              opacity: pOpacity,
              transform: `translateY(${pY}px)`,
              boxShadow: `0 0 ${p.size * 2}px ${accentColor}`,
            }}
          />
        );
      })}
    </div>
  );
};
