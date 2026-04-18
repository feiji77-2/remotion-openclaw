import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { GlowingText } from './GlowingText';
import { ParticleBackground } from './ParticleBackground';

interface TitleCardProps {
  title: string;
  subtitle?: string;
  accentWord?: string; // 高亮词，如"一条命令"
  bgColor?: string;
  duration?: number;
}

/**
 * 超级标题卡：占画面60%+，加粗黑体 + 内发光 + 外溢光晕
 * 适用：封面钩子、章节标题
 */
export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  subtitle,
  accentWord,
  bgColor = '#0D0D1A',
  duration = 150,
}) => {
  const frame = useCurrentFrame();

  // 标题进入：scale 0.8→1 + opacity 0→1
  const titleScale = spring({ fps: 30, frame, config: { damping: 200, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // 扫光效果
  const sweepProgress = interpolate(frame, [0, duration], [0, 1], { extrapolateRight: "clamp" });

  // 呼吸光晕
  const glowPulse = (Math.sin(frame * 0.1) + 1) / 2;

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
      {/* 背景粒子 */}
      <ParticleBackground particleCount={60} />

      {/* 扫光叠加层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${sweepProgress * 100}%`,
          width: '30%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,107,53,0.15), transparent)',
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
      />

      {/* 主标题 */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: 'center',
          zIndex: 2,
        }}
      >
        <GlowingText
          text={title}
          size={120}
          color="#FFFFFF"
          glowColor="rgba(255,107,53,0.8)"
          glowIntensity={0.6 + glowPulse * 0.4}
        />
      </div>

      {/* 副标题 */}
      {subtitle && (
        <div
          style={{
            marginTop: 40,
            fontSize: 48,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 300,
            letterSpacing: 8,
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {subtitle}
        </div>
      )}

      {/* 底部强调标签 */}
      {accentWord && (
        <div
          style={{
            position: 'absolute',
            bottom: 160,
            padding: '12px 32px',
            border: '2px solid rgba(255,107,53,0.6)',
            borderRadius: 8,
            fontSize: 28,
            color: '#FF6B35',
            letterSpacing: 4,
            opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {accentWord}
        </div>
      )}
    </div>
  );
};
