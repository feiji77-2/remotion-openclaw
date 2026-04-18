/**
 * Transitions.tsx — 电影级镜头过渡效果库
 *
 * 支持效果：
 * - GlitchTransition: 数字故障过渡
 * - SmoothMorphTransition: 平滑渐变过渡
 * - WipeTransition: 擦除过渡（支持4方向）
 * - FlashTransition: 闪白过渡
 * - SlideTransition: 滑动过渡
 * - ZoomTransition: 缩放过渡
 * - ChromaticTransition: 色差过渡
 *
 * 使用方式：
 *   <GlitchTransition progress={transitionProgress} />
 */

import React from 'react';
import { interpolate, spring, useCurrentFrame, AbsoluteFill } from 'remotion';

// ===== Glitch 故障过渡 =====

interface GlitchTransitionProps {
  progress: number; // 0-1
  intensity?: number;
}

export const GlitchTransition: React.FC<GlitchTransitionProps> = ({
  progress,
  intensity = 1,
}) => {
  const glitchActive = progress > 0.2 && progress < 0.8;

  // RGB 分量错位
  const offsetX = glitchActive ? (Math.random() - 0.5) * 20 * intensity : 0;
  const offsetXR = glitchActive ? (Math.random() - 0.5) * 30 * intensity : 0;
  const offsetXB = glitchActive ? (Math.random() - 0.5) * 30 * intensity : 0;

  // 扫描线
  const scanlineOpacity = glitchActive ? 0.1 + Math.random() * 0.2 : 0;

  // 画面撕裂
  const tearY = glitchActive ? Math.random() * 100 : 0;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      {/* R 通道偏移 */}
      {glitchActive && (
        <div
          style={{
            position: 'absolute',
            top: tearY,
            left: offsetXR,
            right: -offsetXR,
            height: 4,
            background: '#ff000080',
            transform: `translateY(${Math.random() * 20}px)`,
          }}
        />
      )}

      {/* B 通道偏移 */}
      {glitchActive && (
        <div
          style={{
            position: 'absolute',
            top: tearY + 20,
            left: offsetXB,
            right: -offsetXB,
            height: 4,
            background: '#0000ff80',
          }}
        />
      )}

      {/* 扫描线 */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${i * 5}%`,
            left: 0,
            right: 0,
            height: 2,
            background: `rgba(0,0,0,${scanlineOpacity})`,
          }}
        />
      ))}

      {/* 噪点 */}
      {glitchActive && Array.from({ length: 50 }).map((_, i) => (
        <div
          key={`noise-${i}`}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 2 + Math.random() * 4,
            height: 2 + Math.random() * 4,
            background: Math.random() > 0.5 ? '#fff' : '#000',
            opacity: Math.random() * 0.5,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ===== SmoothMorph 平滑渐变 =====

interface SmoothMorphTransitionProps {
  progress: number; // 0-1
  fromColor?: string;
  toColor?: string;
}

export const SmoothMorphTransition: React.FC<SmoothMorphTransitionProps> = ({
  progress,
  fromColor = '#0a0a1a',
  toColor = '#0a0a1a',
}) => {
  const opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 0], {
    extrapolateRight: 'clamp',
  });

  // 颜色插值（简单线性）
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const parseHex = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [fr, fg, fb] = parseHex(fromColor);
  const [tr, tg, tb] = parseHex(toColor);
  const r = Math.round(lerp(fr, tr, progress));
  const g = Math.round(lerp(fg, tg, progress));
  const b = Math.round(lerp(fb, tb, progress));
  const bg = `rgb(${r},${g},${b})`;

  return (
    <AbsoluteFill
      style={{
        background: bg,
        opacity,
      }}
    />
  );
};

// ===== Wipe 擦除过渡 =====

type WipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface WipeTransitionProps {
  progress: number; // 0-1
  direction?: WipeDirection;
  color?: string;
}

export const WipeTransition: React.FC<WipeTransitionProps> = ({
  progress,
  direction = 'left',
  color = '#000000',
}) => {
  const getTransform = () => {
    const x = interpolate(progress, [0, 1], [100, 0], { extrapolateRight: 'clamp' });
    const y = interpolate(progress, [0, 1], [100, 0], { extrapolateRight: 'clamp' });
    switch (direction) {
      case 'left': return `translateX(${x}%)`;
      case 'right': return `translateX(${-x}%)`;
      case 'top': return `translateY(${y}%)`;
      case 'bottom': return `translateY(${-y}%)`;
      default: return `translateX(${x}%)`;
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: color,
        transform: getTransform(),
      }}
    />
  );
};

// ===== Flash 闪白过渡 =====

interface FlashTransitionProps {
  progress: number; // 0-1
  color?: string;
}

export const FlashTransition: React.FC<FlashTransitionProps> = ({
  progress,
  color = '#ffffff',
}) => {
  const opacity = interpolate(
    progress,
    [0, 0.3, 0.5, 0.7, 1],
    [0, 1, 0.8, 0, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: color,
        opacity,
      }}
    />
  );
};

// ===== Slide 滑动过渡 =====

interface SlideTransitionProps {
  progress: number; // 0-1
  direction?: WipeDirection;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  progress,
  direction = 'left',
}) => {
  const offset = interpolate(progress, [0, 1], [100, 0], {
    extrapolateRight: 'clamp',
  });

  const transforms: Record<WipeDirection, string> = {
    left: `translateX(${offset}%)`,
    right: `translateX(${-offset}%)`,
    top: `translateY(${offset}%)`,
    bottom: `translateY(${-offset}%)`,
  };

  return (
    <AbsoluteFill
      style={{
        transform: transforms[direction],
        background: '#000',
      }}
    />
  );
};

// ===== Zoom 缩放过渡 =====

interface ZoomTransitionProps {
  progress: number; // 0-1
  type?: 'in' | 'out';
}

export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  progress,
  type = 'in',
}) => {
  const scale = interpolate(
    progress,
    [0, 1],
    type === 'in' ? [2, 1] : [1, 2],
    { extrapolateRight: 'clamp' }
  );
  const opacity = interpolate(progress, [0, 0.5, 1], type === 'in' ? [1, 1, 0] : [0, 1, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        opacity,
        background: '#000',
      }}
    />
  );
};

// ===== Chromatic 色差过渡 =====

interface ChromaticTransitionProps {
  progress: number; // 0-1
}

export const ChromaticTransition: React.FC<ChromaticTransitionProps> = ({
  progress,
}) => {
  const intensity = interpolate(progress, [0, 0.3, 0.7, 1], [0, 30, 30, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: 0.6,
      }}
    >
      {/* R 通道 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,0,0,0.3)',
          transform: `translateX(-${intensity}px)`,
        }}
      />
      {/* B 通道 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,255,0.3)',
          transform: `translateX(${intensity}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ===== 全局过渡管理器 =====

export type TransitionType =
  | 'glitch'
  | 'smooth'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-top'
  | 'wipe-bottom'
  | 'flash'
  | 'slide-left'
  | 'zoom-in'
  | 'zoom-out'
  | 'chromatic';

interface TransitionManagerProps {
  type: TransitionType;
  frame: number;
  transitionFrames?: number;
}

export const TransitionManager: React.FC<TransitionManagerProps> = ({
  type,
  frame,
  transitionFrames = 20,
}) => {
  const progress = interpolate(frame, [0, transitionFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  switch (type) {
    case 'glitch':
      return <GlitchTransition progress={progress} />;
    case 'smooth':
      return <SmoothMorphTransition progress={progress} />;
    case 'wipe-left':
      return <WipeTransition progress={progress} direction="left" />;
    case 'wipe-right':
      return <WipeTransition progress={progress} direction="right" />;
    case 'wipe-top':
      return <WipeTransition progress={progress} direction="top" />;
    case 'wipe-bottom':
      return <WipeTransition progress={progress} direction="bottom" />;
    case 'flash':
      return <FlashTransition progress={progress} />;
    case 'slide-left':
      return <SlideTransition progress={progress} direction="left" />;
    case 'zoom-in':
      return <ZoomTransition progress={progress} type="in" />;
    case 'zoom-out':
      return <ZoomTransition progress={progress} type="out" />;
    case 'chromatic':
      return <ChromaticTransition progress={progress} />;
    default:
      return null;
  }
};
