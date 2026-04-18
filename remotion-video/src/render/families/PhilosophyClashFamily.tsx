/**
 * PhilosophyClashFamily.tsx — 哲学对撞 family 模板
 *
 * 文案：所以问题变了。不是谁先上线谁赢了。
 *       是谁的设计哲学笑到最后。
 *       OpenClaw 是你来教它。Hermes 它自己学会。
 *
 * 总帧数：557帧 @ shot19 start=6087
 *
 * 3-BEAT 设计：
 *   beat1 (0-100): 左侧 YOU TEACH IT 标题爆炸入场
 *   beat2 (100-280): 右侧 IT LEARNS ITSELF 滑入对撞
 *   beat3 (280-557): 中间闪电 + 两条世界线持续对冲
 */

import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import type { NormalizedPhilosophyClashContent } from '../familySchemas';

interface PhilosophyClashFamilyProps {
  startFrame: number;
  durationFrames: number;
  bgColor: string;
  content: NormalizedPhilosophyClashContent;
}

// ===== 粒子辅助 =====

const ParticleField: React.FC<{ color: string; count: number; drift: number }> = ({ color, count, drift }) => {
  const frame = useCurrentFrame();
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: (i * 43 + frame * drift) % 1080,
      y: (i * 67 + frame * drift * 0.7) % 1920,
      r: 1 + (i % 3),
      opacity: 0.05 + (i % 6) * 0.03,
    })), [count, color, frame, drift]
  );
  return (
    <svg style={{ position: 'absolute', inset: 0 }}>
      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.opacity} />
      ))}
    </svg>
  );
};

// ===== Beat 1: 左侧 YOU TEACH IT =====

const LeftPanel: React.FC<{ relFrame: number; content: NormalizedPhilosophyClashContent }> = ({ relFrame, content }) => {
  // 爆炸式入场
  const beats = content.template.beats;
  const t = Math.min(1, relFrame / beats.leftIntroDuration);
  const opacity = interpolate(t, [0, 0.3, 1], [0, 1, 1]);
  const scale = interpolate(t, [0, 0.6, 1], [0.3, 1.15, 1]);
  const rotate = interpolate(t, [0, 0.6, 1], [-8, 2, 0]);
  const palette = content.template.leftPalette;
  const splitRatio = content.template.splitRatio;

  // 闪烁粒子效果
  const flashT = t < 0.4 ? interpolate(t, [0, 0.4], [3, 0]) : 0;
  const flashOpacity = Math.max(0, flashT);

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: `${splitRatio * 100}%`,
      background: `linear-gradient(135deg, ${palette.bgStart} 0%, ${palette.bgEnd} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      transform: `scale(${scale}) rotate(${rotate}deg)`,
    }}>
      {/* 背景红色脉冲 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, rgba(${palette.pulseRgb},${0.15 + flashOpacity * 0.2}) 0%, transparent 70%)`,
      }} />

      {/* 主标题 */}
      <div style={{
        fontSize: 56,
        fontWeight: 900,
        color: palette.accent,
        fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif",
        letterSpacing: '-1px',
        textShadow: `0 0 ${30 + flashOpacity * 40}px rgba(${palette.pulseRgb},0.8)`,
        textAlign: 'center',
        lineHeight: 1.1,
        whiteSpace: 'pre-line',
      }}>
        {content.leftHeadline}
      </div>

      {/* 副标题 */}
      <div style={{
        marginTop: 28,
        fontSize: 24,
        color: palette.subAccent,
        fontFamily: "'PingFang SC', sans-serif",
        textAlign: 'center',
        opacity: 0.9,
      }}>
        {content.leftBrand}
      </div>

      {/* 特征列表 */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {content.leftItems.map((item, i) => {
          const itemT = Math.max(0, Math.min(1, (t * 3 - i * 0.5)));
          const x = interpolate(itemT, [0, 1], [-40, 0]);
          const op = interpolate(itemT, [0, 0.5, 1], [0, 0.5, 0.8]);
          return (
            <div key={i} style={{
              transform: `translateX(${x}px)`,
              opacity: op,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 18, color: palette.subAccent, fontFamily: 'PingFang SC',
            }}>
              <span style={{ color: palette.accent, fontSize: 20 }}>✗</span>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Beat 2: 右侧 IT LEARNS ITSELF =====

const RightPanel: React.FC<{ relFrame: number; content: NormalizedPhilosophyClashContent }> = ({ relFrame, content }) => {
  const beats = content.template.beats;
  const t = Math.max(0, Math.min(1, (relFrame - beats.rightStart) / beats.rightIntroDuration));
  const opacity = interpolate(t, [0, 0.3, 1], [0, 1, 1]);
  const x = interpolate(t, [0, 1], [120, 0]);
  const scale = interpolate(t, [0, 0.7, 1], [0.9, 1.05, 1]);
  const palette = content.template.rightPalette;
  const splitRatio = content.template.splitRatio;

  return (
    <div style={{
      position: 'absolute',
      right: 0, top: 0, bottom: 0,
      width: `${(1 - splitRatio) * 100}%`,
      background: `linear-gradient(225deg, ${palette.bgStart} 0%, ${palette.bgEnd} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      transform: `translateX(${x}px) scale(${scale})`,
    }}>
      {/* 背景绿色脉冲 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, rgba(${palette.pulseRgb},0.12) 0%, transparent 70%)`,
      }} />

      {/* 主标题 */}
      <div style={{
        fontSize: 52,
        fontWeight: 900,
        color: palette.accent,
        fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif",
        letterSpacing: '-1px',
        textShadow: `0 0 30px rgba(${palette.pulseRgb},0.6)`,
        textAlign: 'center',
        lineHeight: 1.15,
        whiteSpace: 'pre-line',
      }}>
        {content.rightHeadline}
      </div>

      {/* 副标题 */}
      <div style={{
        marginTop: 28,
        fontSize: 24,
        color: palette.subAccent,
        fontFamily: "'PingFang SC', sans-serif",
        textAlign: 'center',
        opacity: 0.9,
      }}>
        {content.rightBrand}
      </div>

      {/* 特征列表 */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {content.rightItems.map((item, i) => {
          const itemT = Math.max(0, Math.min(1, (t * 3 - i * 0.5)));
          const x = interpolate(itemT, [0, 1], [40, 0]);
          const op = interpolate(itemT, [0, 0.5, 1], [0, 0.5, 0.8]);
          return (
            <div key={i} style={{
              transform: `translateX(${x}px)`,
              opacity: op,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 18, color: palette.subAccent, fontFamily: 'PingFang SC',
            }}>
              <span style={{ color: palette.accent, fontSize: 20 }}>✓</span>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Beat 3: 中间对撞 =====

const CenterClash: React.FC<{
  relFrame: number;
  label: string;
  accentColor: string;
  secondaryColor: string;
  clashStart: number;
  clashIntroDuration: number;
}> = ({ relFrame, label, accentColor, secondaryColor, clashStart, clashIntroDuration }) => {
  const t = Math.max(0, Math.min(1, (relFrame - clashStart) / clashIntroDuration));
  const opacity = interpolate(t, [0, 0.4, 1], [0, 1, 1]);
  const scale = interpolate(t, [0, 0.6, 1], [0.2, 1.3, 1]);

  // 脉冲环
  const rings = [0, 0.15, 0.3].map((delay, i) => {
    const ringT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    const ringScale = interpolate(ringT, [0, 1], [0.5, 2.5]);
    const ringOpacity = interpolate(ringT, [0, 0.3, 1], [0.6, 0.3, 0]);
    return (
      <div key={i} style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 160, height: 160,
        borderRadius: '50%',
        border: `3px solid ${accentColor}`,
        transform: `translate(-50%, -50%) scale(${ringScale})`,
        opacity: ringOpacity,
        boxShadow: `0 0 30px ${accentColor}88`,
      }} />
    );
  });

  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      opacity,
    }}>
      {/* 脉冲环 */}
      {rings}

      {/* 闪电图标 */}
      <div style={{
        width: 120, height: 120,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${accentColor}33, ${secondaryColor}33)`,
        border: `3px solid ${accentColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 ${30 + t * 40}px ${accentColor}66`,
        transform: `scale(${scale})`,
      }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill={accentColor}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>

      {/* 底部文案 */}
      <div style={{
        marginTop: 20,
        textAlign: 'center',
        color: accentColor,
        fontSize: 22,
        fontFamily: "'PingFang SC', sans-serif",
        fontWeight: 700,
        textShadow: `0 0 20px ${accentColor}66`,
      }}>
        {label}
      </div>
    </div>
  );
};

// ===== 主组件 =====

export const PhilosophyClashFamily: React.FC<PhilosophyClashFamilyProps> = ({ startFrame, durationFrames, bgColor, content }) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame);
  const centerAccentColor = content.template.centerAccentColor;
  const centerSecondaryColor = content.template.centerSecondaryColor;
  const dividerColor = content.template.dividerColor;
  const beats = content.template.beats;

  const inBeat1 = relFrame < beats.rightStart;
  const inBeat2 = relFrame >= beats.rightStart && relFrame < beats.clashStart;
  const inBeat3 = relFrame >= beats.clashStart;

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {/* 背景粒子 */}
      <ParticleField color={centerAccentColor} count={50} drift={0.5} />

      {/* Beat 1: 左侧 */}
      {inBeat1 && <LeftPanel relFrame={relFrame} content={content} />}

      {/* Beat 2: 左侧+右侧 */}
      {(inBeat2 || inBeat3) && (
        <>
          <LeftPanel relFrame={relFrame} content={content} />
          <RightPanel relFrame={relFrame} content={content} />
        </>
      )}

      {/* Beat 3: 中间 */}
      {inBeat3 && (
        <CenterClash
          relFrame={relFrame}
          label={content.centerLabel}
          accentColor={centerAccentColor}
          secondaryColor={centerSecondaryColor}
          clashStart={beats.clashStart}
          clashIntroDuration={beats.clashIntroDuration}
        />
      )}

      {/* 分隔线 */}
      <div style={{
        position: 'absolute',
        left: `${content.template.splitRatio * 100}%`,
        top: 0, bottom: 0,
        width: 2,
        background: `linear-gradient(to bottom, transparent, ${dividerColor}44, ${dividerColor}88, ${dividerColor}44, transparent)`,
        transform: 'translateX(-50%)',
      }} />
    </AbsoluteFill>
  );
};

export default PhilosophyClashFamily;
