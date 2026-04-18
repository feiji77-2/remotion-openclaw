/**
 * LowerThirds.tsx — 动态下三分之一信息条
 *
 * 专业广电级 Lower Third 效果：
 * - SlideLowerThird: 左右滑入
 * - ExpandLowerThird: 展开式
 * - CorporateLowerThird: 商务简洁风格
 * - TagLowerThird: 标签式（适合技术栈展示）
 * - AnimatedBadge: 动态徽章
 */

import React from 'react';
import { interpolate, spring, useCurrentFrame, AbsoluteFill } from 'remotion';
import { RenderIcon } from '../render/iconRegistry';
import type { RenderIconId, TitleOverlayPreset } from '../render/types';

// ===== 基础下三分之一条 =====

interface BaseLowerThirdProps {
  startFrame?: number;
  duration?: number;   // 显示总帧数
  exitFrame?: number;  // 开始退出的帧
}

const useLowerThirdAnim = (
  frame: number,
  startFrame: number,
  duration: number,
  exitFrame?: number
) => {
  const enterFrame = Math.max(0, frame - startFrame);
  const exitStart = exitFrame ? Math.max(0, exitFrame - startFrame) : duration - 20;

  // 入场
  const enterSpring = spring({
    fps: 30,
    frame: enterFrame,
    config: { damping: 150, stiffness: 120 },
  });

  // 稳态
  const visible = enterFrame > 0 && enterFrame < duration;

  // 退场
  const exitF = Math.max(0, enterFrame - exitStart);
  const exitSpring = exitFrame
    ? spring({ fps: 30, frame: exitF, config: { damping: 200, stiffness: 200 } })
    : 1;
  const exitOpacity = exitFrame ? 1 - exitSpring : 1;

  return {
    progress: enterSpring,
    opacity: Math.min(enterSpring, exitOpacity),
    visible,
  };
};

// ===== 滑入式 Lower Third =====

interface SlideLowerThirdProps extends BaseLowerThirdProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  bgColor?: string;
  direction?: 'left' | 'right';
  iconId?: RenderIconId;
  preset?: TitleOverlayPreset;
}

export const SlideLowerThird: React.FC<SlideLowerThirdProps> = ({
  startFrame = 0,
  duration = 120,
  exitFrame,
  title,
  subtitle,
  accentColor = '#00d4ff',
  bgColor = 'rgba(10,10,26,0.9)',
  direction = 'left',
  iconId,
  preset,
}) => {
  const frame = useCurrentFrame();
  const { opacity, progress } = useLowerThirdAnim(frame, startFrame, duration, exitFrame);
  const titleTop = preset?.top ?? 96;
  const titleLeft = preset?.left ?? 60;
  const titleRight = preset?.right ?? 320;
  const stackGap = preset?.stackGap ?? 10;
  const rowGap = preset?.rowGap ?? 18;
  const iconBubbleSize = preset?.iconBubbleSize ?? 38;
  const iconSize = preset?.iconSize ?? 18;
  const showAccentLine = preset?.showAccentLine ?? false;
  const uppercaseTitle = preset?.uppercaseTitle ?? false;
  const titleFontSize = preset?.titleFontSize ?? 13;
  const titleLetterSpacing = preset?.titleLetterSpacing ?? 1.6;
  const subtitleMaxWidth = preset?.subtitleMaxWidth ?? 560;
  const subtitleOffsetX = preset?.subtitleOffsetX ?? 38;
  const subtitleFontSize = preset?.subtitleFontSize ?? 28;
  const entryDistance = preset?.entryDistance ?? 100;
  const floatAmplitude = preset?.floatAmplitude ?? 1.6;
  const glowPulse = preset?.glowPulse ?? true;

  const translateX = interpolate(
    progress,
    [0, 1],
    direction === 'left' ? [-entryDistance, 0] : [entryDistance, 0],
    { extrapolateRight: 'clamp' }
  );
  const iconFloat = Math.sin((frame - startFrame) * 0.08) * floatAmplitude;
  const iconGlow = glowPulse
    ? 0.24 + ((Math.sin((frame - startFrame) * 0.09) + 1) / 2) * 0.18
    : 0.24;

  const iconNode = iconId ? (
    <div
      style={{
        width: iconBubbleSize,
        height: iconBubbleSize,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}16)`,
        border: `1px solid ${accentColor}72`,
        boxShadow: `0 0 ${20 + iconGlow * 22}px ${accentColor}${Math.round((0.24 + iconGlow * 0.22) * 255).toString(16).padStart(2, '0')}, inset 0 0 0 1px rgba(255,255,255,0.05)`,
        transform: `translateY(${iconFloat}px) scale(${0.98 + iconGlow * 0.03})`,
        flexShrink: 0,
      }}
    >
      <RenderIcon id={iconId} size={iconSize} color={accentColor} secondaryColor="#ffffff" />
    </div>
  ) : null;

  const accentLineNode = showAccentLine ? (
    <div
      style={{
        width: 26,
        height: 2,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}00)`,
        borderRadius: 999,
      }}
    />
  ) : null;

  return (
    <AbsoluteFill
      style={{
        top: titleTop,
        left: titleLeft,
        right: titleRight,
        bottom: 'auto',
        height: 'auto',
        opacity,
        transform: `translateX(${translateX}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: stackGap,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: rowGap,
        }}
      >
        {preset?.iconPlacement === 'after' ? null : iconNode}
        {accentLineNode}
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            color: accentColor,
            letterSpacing: titleLetterSpacing,
            textTransform: uppercaseTitle ? 'uppercase' : undefined,
          }}
        >
          {title}
        </div>
        {preset?.iconPlacement === 'after' ? iconNode : null}
      </div>

      {subtitle && (
        <div
          style={{
            maxWidth: subtitleMaxWidth,
            paddingLeft: subtitleOffsetX,
            fontSize: subtitleFontSize,
            lineHeight: 1.15,
            color: 'rgba(244,248,255,0.82)',
            fontWeight: 560,
            textShadow: '0 1px 18px rgba(0,0,0,0.22)',
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ===== 展开式 Lower Third =====

interface ExpandLowerThirdProps extends BaseLowerThirdProps {
  name: string;
  title: string;
  accentColor?: string;
  showAvatar?: boolean;
  avatarInitials?: string;
}

export const ExpandLowerThird: React.FC<ExpandLowerThirdProps> = ({
  startFrame = 0,
  duration = 120,
  exitFrame,
  name,
  title,
  accentColor = '#00d4ff',
  showAvatar = true,
  avatarInitials,
}) => {
  const frame = useCurrentFrame();
  const { opacity, progress } = useLowerThirdAnim(frame, startFrame, duration, exitFrame);

  const width = interpolate(progress, [0, 1], [0, 600], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        bottom: 180,
        left: 60,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        overflow: 'hidden',
      }}
    >
      {/* 头像圆 */}
      {showAvatar && (
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
            border: `3px solid ${accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: `0 0 20px ${accentColor}60`,
          }}
        >
          {avatarInitials || name.slice(0, 2)}
        </div>
      )}

      {/* 信息条 */}
      <div
        style={{
          width,
          height: 70,
          background: 'rgba(10,10,26,0.95)',
          borderRadius: showAvatar ? '0 12px 12px 0' : 12,
          border: `1px solid ${accentColor}40`,
          borderLeft: showAvatar ? 'none' : `1px solid ${accentColor}40`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: showAvatar ? 20 : 24,
          paddingRight: 24,
          boxShadow: `0 4px 30px rgba(0,0,0,0.4), 0 0 20px ${accentColor}20`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 0.5,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 18,
            color: accentColor,
            fontWeight: 400,
          }}
        >
          {title}
        </div>
      </div>

      {/* 顶部强调线 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: showAvatar ? 70 : 0,
          width: `${progress * (600 + (showAvatar ? 0 : 0))}px`,
          height: 3,
          background: `linear-gradient(to right, ${accentColor}, ${accentColor}40)`,
          borderRadius: '0 0 2px 2px',
        }}
      />
    </AbsoluteFill>
  );
};

// ===== 标签式 Lower Third（技术栈展示）=====

interface TagLowerThirdProps extends BaseLowerThirdProps {
  tags: { label: string; color?: string }[];
  label?: string;
}

export const TagLowerThird: React.FC<TagLowerThirdProps> = ({
  startFrame = 0,
  duration = 150,
  exitFrame,
  tags,
  label,
}) => {
  const frame = useCurrentFrame();
  const { opacity, progress } = useLowerThirdAnim(frame, startFrame, duration, exitFrame);

  return (
    <AbsoluteFill
      style={{
        top: 28,
        left: 60,
        right: 300,
        bottom: 'auto',
        height: 'auto',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {tags.slice(0, 3).map((tag, i) => {
          const tagSpring = spring({
            fps: 30,
            frame: Math.max(0, frame - startFrame - i * 4),
            config: { damping: 120, stiffness: 150 },
          });

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(246,250,255,0.82)',
                opacity: tagSpring,
                transform: `translateY(${(1 - tagSpring) * 6}px)`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tag.color || '#00d4ff',
                  boxShadow: `0 0 10px ${(tag.color || '#00d4ff')}55`,
                }}
              />
              {tag.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ===== 动态徽章 =====

interface AnimatedBadgeProps {
  label: string;
  startFrame?: number;
  accentColor?: string;
  variant?: 'new' | 'hot' | 'top' | 'live' | 'default';
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  label,
  startFrame = 0,
  accentColor = '#00d4ff',
  variant = 'default',
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const s = spring({ fps: 30, frame: f, config: { damping: 100, stiffness: 200, mass: 0.5 } });

  const pulse = 1 + Math.sin(frame * 0.08) * 0.02;
  const glowIntensity = 0.22 + Math.sin(frame * 0.07) * 0.08;

  const variantStyles: Record<string, { border: string; text: string; dot: string }> = {
    new: { border: '#78F7B8', text: '#DDFBE9', dot: '#78F7B8' },
    hot: { border: '#FF8A4C', text: '#FFF1E9', dot: '#FF8A4C' },
    top: { border: '#F4D06F', text: '#FFF7DA', dot: '#F4D06F' },
    live: { border: '#FF5A5F', text: '#FFF0F1', dot: '#FF5A5F' },
    default: { border: accentColor, text: '#F4FAFF', dot: accentColor },
  };

  const v = variantStyles[variant];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'rgba(7,10,18,0.72)',
        border: `1px solid ${v.border}66`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: v.text,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        opacity: s,
        transform: `scale(${s * pulse})`,
        boxShadow: `0 0 ${16 * glowIntensity}px ${v.border}33`,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: v.dot,
          boxShadow: `0 0 10px ${v.dot}66`,
        }}
      />
      {label}
    </div>
  );
};

// ===== 进度条下 Third =====

interface ProgressLowerThirdProps {
  current: number;
  total: number;
  label?: string;
  accentColor?: string;
}

export const ProgressLowerThird: React.FC<ProgressLowerThirdProps> = ({
  current,
  total,
  label,
  accentColor = '#00d4ff',
}) => {
  const progress = current / total;
  const frame = useCurrentFrame();

  // 数字动画
  const numSpring = spring({
    fps: 30,
    frame,
    config: { damping: 200, stiffness: 100 },
  });
  const displayNum = Math.round(numSpring * current);

  return (
    <AbsoluteFill
      style={{
        bottom: 140,
        left: 60,
        right: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          {label}
        </div>
      )}

      {/* 进度条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: `linear-gradient(to right, ${accentColor}, ${accentColor}88)`,
              borderRadius: 3,
              boxShadow: `0 0 10px ${accentColor}`,
              transition: 'width 0.3s',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          <span style={{ color: accentColor }}>{displayNum}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>/{total}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
