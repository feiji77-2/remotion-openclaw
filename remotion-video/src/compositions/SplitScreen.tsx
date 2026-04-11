/**
 * SplitScreen — 左右分栏视频模板
 *
 * 左侧：图片/图标  右侧：文字
 * 适合：教程、好物推荐、产品介绍
 *
 * 用法：
 *   <SplitScreen
 *     title="OpenClaw 为什么火"
 *     body="4层逻辑拆解"
 *     imageSrc="/assets/by-shot/shot-01.png"
 *     icon="🦞"
 *     splitPosition="right"
 *   />
 */

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  Img,
  Sequence,
} from 'remotion';
import { BG_COLOR, ACCENT_GOLD, ACCENT_PURPLE } from '../data/storyboard';

interface SplitScreenProps {
  title: string;
  body?: string;
  imageSrc?: string;
  icon?: string;
  /** 文字在哪侧：'left' | 'right' */
  splitPosition?: 'left' | 'right';
  /** 背景色 */
  backgroundColor?: string;
  accentColor?: string;
}

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; duration?: number }> = ({
  children,
  delay = 0,
  duration = 15,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <div style={{ opacity }}>{children}</div>;
};

export const SplitScreen: React.FC<SplitScreenProps> = ({
  title,
  body,
  imageSrc,
  icon,
  splitPosition = 'left',
  backgroundColor = BG_COLOR,
  accentColor = ACCENT_PURPLE,
}) => {
  const isTextLeft = splitPosition === 'left';
  const frame = useCurrentFrame();

  // 标题弹簧动画
  const titleSpring = spring({ frame: frame - 5, fps: 30, config: { damping: 14 } });
  const bodySpring = spring({ frame: frame - 20, fps: 30, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* 背景渐变 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at ${isTextLeft ? '75%' : '25%'} 50%, ${accentColor}18 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />

      {/* 顶部进度条 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min((frame / 150) * 100, 100)}%`,
            background: `linear-gradient(90deg, ${ACCENT_PURPLE}, ${ACCENT_GOLD})`,
          }}
        />
      </div>

      {/* 主内容区 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* 左侧 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            order: isTextLeft ? 0 : 1,
          }}
        >
          {/* 图片/图标区 */}
          <FadeIn delay={0} duration={20}>
            {imageSrc ? (
              <div
                style={{
                  width: '85%',
                  aspectRatio: '1 / 1',
                  borderRadius: 24,
                  overflow: 'hidden',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                }}
              >
                <Img
                  src={imageSrc}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : icon ? (
              <div
                style={{
                  fontSize: 220,
                  filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.4))',
                  transform: `scale(${0.8 + titleSpring * 0.2})`,
                }}
              >
                {icon}
              </div>
            ) : null}
          </FadeIn>
        </div>

        {/* 右侧 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px 50px',
            order: isTextLeft ? 1 : 0,
          }}
        >
          {/* 标题 */}
          <FadeIn delay={5} duration={15}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.25,
                transform: `translateY(${(1 - titleSpring) * 30}px)`,
              }}
            >
              {title}
            </div>
          </FadeIn>

          {/* 分割线 */}
          {body && (
            <FadeIn delay={15} duration={10}>
              <div
                style={{
                  width: 60,
                  height: 4,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${accentColor}, ${ACCENT_GOLD})`,
                  margin: '24px 0',
                }}
              />
            </FadeIn>
          )}

          {/* 正文 */}
          {body && (
            <FadeIn delay={20} duration={15}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.5,
                  transform: `translateY(${(1 - bodySpring) * 20}px)`,
                }}
              >
                {body}
              </div>
            </FadeIn>
          )}

          {/* 底部装饰 */}
          <FadeIn delay={30} duration={10}>
            <div
              style={{
                marginTop: 36,
                display: 'flex',
                gap: 12,
              }}
            >
              {[accentColor, ACCENT_GOLD, '#60a5fa'].map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: color,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </AbsoluteFill>
  );
};
