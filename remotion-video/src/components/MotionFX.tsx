/**
 * MotionFX.tsx — 运动特效层
 *
 * 包含：
 * - MotionBlur: 动态模糊效果
 * - DepthOfField: 景深模拟（焦外虚化）
 * - SpeedLines: 速度线（用于快节奏场景）
 * - RadialBlur: 径向模糊（缩放/爆炸效果）
 * - PanZoom: 推拉镜头动画
 * - ParallaxLayer: 视差层（前景/背景分离）
 */

import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, AbsoluteFill } from 'remotion';

// ===== 速度线 =====

interface SpeedLinesProps {
  intensity?: number;     // 强度 0-1
  count?: number;        // 线条数量
  direction?: 'center' | 'left' | 'right' | 'all';
  color?: string;
  startFrame?: number;
}

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  intensity = 0.3,
  count = 30,
  direction = 'all',
  color = '#ffffff',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const visible = elapsed < 30;

  const lines = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * 360 + Math.sin(i) * 10,
      length: 50 + Math.random() * 150,
      delay: Math.random() * 10,
      x: Math.random() * 100,
      y: Math.random() * 100,
    })),
    [count]
  );

  const progress = Math.min(1, elapsed / 20);
  const fadeOut = elapsed > 20 ? 1 - (elapsed - 20) / 10 : 1;

  if (!visible || fadeOut <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: fadeOut,
      }}
    >
      {lines.map((line, i) => {
        const angleRad = (line.angle * Math.PI) / 180;
        const show = elapsed > line.delay;
        if (!show) return null;

        const lineOpacity = intensity * fadeOut * (0.3 + Math.random() * 0.7);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${line.x}%`,
              top: `${line.y}%`,
              width: line.length * progress,
              height: 1,
              background: `linear-gradient(to right, transparent, ${color}${Math.round(lineOpacity * 255).toString(16).padStart(2,'0')})`,
              transform: `rotate(${line.angle}deg)`,
              transformOrigin: 'left center',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ===== 径向模糊 =====

interface RadialBlurProps {
  progress: number;   // 0-1 模糊程度
  centerX?: number;   // 中心点 X (0-1)
  centerY?: number;   // 中心点 Y (0-1)
  strength?: number;  // 模糊强度
}

export const RadialBlur: React.FC<RadialBlurProps> = ({
  progress,
  centerX = 0.5,
  centerY = 0.5,
  strength = 20,
}) => {
  const offset = progress * strength;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: Math.min(0.5, progress * 0.6),
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => {
        const scale = 1 + i * progress * 0.05;
        const opacity = (1 - i * 0.3) * progress;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${centerX * 100}%`,
              top: `${centerY * 100}%`,
              width: 1,
              height: 1,
              background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 50%)',
              transform: `translate(-50%, -50%) scale(${scale * 3})`,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ===== 景深（焦外虚化）=====

interface DepthOfFieldProps {
  focusX?: number;     // 焦点 X (0-1)
  focusY?: number;     // 焦点 Y (0-1)
  focusRadius?: number; // 清晰范围半径
  blurStrength?: number; // 虚化强度
}

export const DepthOfField: React.FC<DepthOfFieldProps> = ({
  focusX = 0.5,
  focusY = 0.5,
  focusRadius = 0.2,
  blurStrength = 8,
}) => {
  const frame = useCurrentFrame();

  // 模拟轻微的焦点呼吸
  const breathe = Math.sin(frame * 0.02) * 0.02;
  const effectiveRadius = focusRadius + breathe;

  // 生成径向渐变模糊
  const stops = [0, effectiveRadius * 30, effectiveRadius * 60, 100];
  const blurStops = [0, blurStrength * 0.3, blurStrength * 0.7, blurStrength];

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `
          radial-gradient(
            circle at ${focusX * 100}% ${focusY * 100}%,
            transparent ${stops[0]}%,
            rgba(0,0,0,${blurStops[1] / 40}) ${stops[1]}%,
            rgba(0,0,0,${blurStops[2] / 40}) ${stops[2]}%,
            rgba(0,0,0,${blurStops[3] / 40}) ${stops[3]}%
          )
        `,
      }}
    />
  );
};

// ===== 推拉镜头 =====

interface PanZoomProps {
  /** 初始缩放 */
  fromScale?: number;
  /** 目标缩放 */
  toScale?: number;
  /** 开始帧 */
  startFrame?: number;
  /** 持续帧数 */
  duration?: number;
  /** 结束后是否保持 */
  hold?: boolean;
  /** 是否从中心缩放 */
  fromCenter?: boolean;
  /** X偏移 */
  panX?: number;    // 像素
  /** Y偏移 */
  panY?: number;
}

export const PanZoom = ({
  fromScale = 1,
  toScale = 1.1,
  startFrame = 0,
  duration = 60,
  hold = true,
  fromCenter = true,
  panX = 0,
  panY = 0,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  const progress = interpolate(elapsed, [0, duration], [0, 1], {
    extrapolateRight: hold ? 'clamp' : 'extend',
  });

  const scale = fromScale + (toScale - fromScale) * progress;
  const translateX = panX * progress;
  const translateY = panY * progress;

  return { scale, translateX, translateY, progress };
};

// ===== 视差层 =====

interface ParallaxLayerProps {
  children: React.ReactNode;
  depth?: number;       // 深度 0=无限远, 1=前景, 0.5=正常
  moveX?: number;       // 水平最大移动像素
  moveY?: number;       // 垂直最大移动像素
  startFrame?: number;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  depth = 0.5,
  moveX = 50,
  moveY = 30,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  // 深度系数：1=跟随镜头，0=固定不动
  const parallaxFactor = 1 - depth;

  const x = Math.sin(elapsed * 0.01) * moveX * parallaxFactor;
  const y = Math.cos(elapsed * 0.007) * moveY * parallaxFactor;

  // 深度模糊（前景更模糊，远景更清晰）
  const blur = depth > 0.7 ? (depth - 0.7) * 10 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${x}px, ${y}px)`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transition: 'transform 0.05s linear',
      }}
    >
      {children}
    </div>
  );
};

// ===== 轨道运动（Orbit）=====

interface OrbitProps {
  radiusX?: number;    // X轴半径
  radiusY?: number;    // Y轴半径
  speed?: number;      // 角速度（度/帧）
  startAngle?: number; // 起始角度（度）
  startFrame?: number;
  children: (pos: { x: number; y: number; angle: number }) => React.ReactNode;
}

export const Orbit: React.FC<OrbitProps> = ({
  radiusX = 100,
  radiusY = 50,
  speed = 0.5,
  startAngle = 0,
  startFrame = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const angle = startAngle + elapsed * speed;
  const angleRad = (angle * Math.PI) / 180;

  const x = Math.cos(angleRad) * radiusX;
  const y = Math.sin(angleRad) * radiusY;

  return <>{children({ x, y, angle })}</>;
};

// ===== 动态模糊（位移采样）=====

interface MotionBlurFXProps {
  /** 模糊方向向量 */
  directionX?: number;
  directionY?: number;
  /** 强度 */
  strength?: number;
  /** 采样数（越多越平滑但越慢） */
  samples?: number;
}

export const MotionBlurFX: React.FC<MotionBlurFXProps> = ({
  directionX = 10,
  directionY = 0,
  strength = 0.3,
  samples = 8,
}) => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: strength,
      }}
    >
      {Array.from({ length: samples }).map((_, i) => {
        const t = (i / samples) * 2 - 1; // -1 to 1
        const offsetX = directionX * t;
        const offsetY = directionY * t;
        const opacity = 1 / samples;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${offsetX}px, ${offsetY}px)`,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ===== 脉冲环（Ripple）=====

interface PulseRingProps {
  x?: number;
  y?: number;
  color?: string;
  startFrame?: number;
  maxRadius?: number;
  duration?: number;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  x = 0.5,
  y = 0.5,
  color = '#00d4ff',
  startFrame = 0,
  maxRadius = 300,
  duration = 40,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  if (elapsed > duration) return null;

  const progress = elapsed / duration;
  const radius = progress * maxRadius;
  const opacity = 1 - progress;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: radius * 2,
          height: radius * 2,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          transform: 'translate(-50%, -50%)',
          opacity,
          boxShadow: `0 0 ${20 * opacity}px ${color}`,
        }}
      />
    </AbsoluteFill>
  );
};
