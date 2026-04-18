/**
 * ProsodyConceptBlock.tsx — 韵律感知版概念块
 *
 * 根据语音韵律自动调整画面元素的入场节奏：
 * - 能量峰值帧 → 文字强调缩放
 * - 音调突变帧 → 画面轻微震动
 * - 停顿间隙帧 → 切换装饰元素
 *
 * 使用方式:
 *   1. 先生成韵律标记: python3 scripts/analyze-prosody.py --audio your_audio.wav
 *   2. 在组件中导入 prosodyMarkers
 *   3. 使用 useProsody hook 获取当前帧韵律状态
 */

import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate, spring, AbsoluteFill } from 'remotion';

// 韵律标记类型（与 prosody-markers.ts 一致）
interface ProsodyMarker {
  frame: number;
  type: 'emphasis' | 'pitch_shift' | 'pause';
  energy?: number;
  delta_hz?: number;
  duration_s?: number;
}

// 韵律标记（如果文件不存在则为空数组）
let prosodyMarkers: ProsodyMarker[] = [];
try {
  const module = require('../prosody/prosody-markers.json') as { markers: ProsodyMarker[] };
  prosodyMarkers = module.markers || [];
} catch {
  prosodyMarkers = [];
}

interface ProsodyConceptBlockProps {
  title: string;
  body: string;
  highlight?: string;
  accentColor?: string;
  bgColor?: string;
  /** 从哪个帧开始播放（与 Video1.tsx Sequence from= 对应） */
  startFrame?: number;
}

interface ProsodyState {
  isEmphasis: boolean;
  isPitchShift: boolean;
  isPause: boolean;
  emphasisScale: number;
  shakeOffset: number;
}

function useProsody(frame: number, startFrame: number): ProsodyState {
  return useMemo(() => {
    const localFrame = frame - startFrame;
    const marker = prosodyMarkers.find(
      m => Math.abs(m.frame - localFrame) < 5
    );

    return {
      isEmphasis: marker?.type === 'emphasis',
      isPitchShift: marker?.type === 'pitch_shift',
      isPause: marker?.type === 'pause',
      emphasisScale: marker?.type === 'emphasis' ? 1.08 : 1.0,
      shakeOffset: marker?.type === 'pitch_shift' ? (marker?.delta_hz || 0) / 50 : 0,
    };
  }, [frame, startFrame]);
}

export const ProsodyConceptBlock: React.FC<ProsodyConceptBlockProps> = ({
  title,
  body,
  highlight,
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const prosody = useProsody(frame, startFrame);

  // 标准动画
  const titleSpring = spring({ fps: 30, frame, config: { damping: 200, stiffness: 100 } });
  const cardSpring = spring({ fps: 30, frame, config: { damping: 160, stiffness: 90 } });
  const bodyFrame = Math.max(0, frame - 20);
  const bodySpring = spring({ fps: 30, frame: bodyFrame, config: { damping: 150, stiffness: 80 } });
  const highlightFrame = Math.max(0, frame - 35);
  const highlightSpring = spring({ fps: 30, frame: highlightFrame, config: { damping: 180, stiffness: 100 } });

  // 韵律驱动额外效果
  const glowPulse = (Math.sin(frame * 0.05) + 1) * 0.5;
  const prosodyScale = interpolate(
    prosody.emphasisScale,
    [1.0, 1.08],
    [1.0, 1.05],
    { extrapolateRight: 'clamp' }
  );
  const shakeX = interpolate(
    prosody.shakeOffset,
    [-5, 5],
    [-2, 2],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transform: `translateX(${shakeX}px) scale(${prosodyScale})`,
      }}
    >
      {/* ===== 韵律指示器（调试用，生产可删除） ===== */}
      {prosody.isEmphasis && (
        <div style={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#00FF88',
          boxShadow: '0 0 20px #00FF88',
        }} />
      )}

      {/* 背景光晕 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 800,
        height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}14 0%, transparent 65%)`,
        opacity: 0.6 + glowPulse * 0.3,
      }} />

      {/* 内层光晕 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}20 0%, transparent 60%)`,
        opacity: 0.4 + glowPulse * 0.2,
      }} />

      {/* 主卡片 */}
      <div style={{
        width: 700,
        padding: '50px 60px',
        background: 'rgba(26,26,46,0.95)',
        borderRadius: 24,
        border: `1px solid ${accentColor}30`,
        boxShadow: `0 0 60px ${accentColor}20, 0 20px 60px rgba(0,0,0,0.5)`,
        opacity: cardSpring,
        transform: `scale(${cardSpring})`,
      }}>
        {/* 标题 */}
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          color: accentColor,
          textAlign: 'center',
          marginBottom: 24,
          letterSpacing: 2,
          opacity: titleSpring,
          transform: `translateY(${(1 - titleSpring) * 30}px)`,
        }}>
          {title}
        </div>

        {/* 正文 */}
        <div style={{
          fontSize: 32,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
          lineHeight: 1.6,
          opacity: bodySpring,
          transform: `translateY(${(1 - bodySpring) * 20}px)`,
        }}>
          {body}
        </div>

        {/* 强调高亮 */}
        {highlight && (
          <div style={{
            marginTop: 28,
            padding: '12px 24px',
            background: `${accentColor}15`,
            borderRadius: 12,
            border: `1px solid ${accentColor}30`,
            fontSize: 28,
            color: accentColor,
            textAlign: 'center',
            fontWeight: 500,
            opacity: highlightSpring,
            transform: `scale(${highlightSpring})`,
          }}>
            {highlight}
          </div>
        )}
      </div>

      {/* 底部粒子装饰 */}
      {[...Array(5)].map((_, i) => {
        const particleFrame = Math.max(0, frame - i * 8 - 15);
        const pSpring = spring({ fps: 30, frame: particleFrame, config: { damping: 120, stiffness: 80 } });
        const x = (i * 137.5 + 50) % 100;
        const y = (i * 97.3 + 60) % 100;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: 6 + (i % 3) * 3,
              height: 6 + (i % 3) * 3,
              borderRadius: '50%',
              background: accentColor,
              opacity: pSpring * (prosody.isPause ? 0.3 : 0.6),
              boxShadow: `0 0 ${8 + i * 4}px ${accentColor}`,
              transform: `scale(${pSpring})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
