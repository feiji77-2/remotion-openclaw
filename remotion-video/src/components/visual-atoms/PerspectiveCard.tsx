import React from 'react';
import {useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export interface PerspectiveCardProps {
  children: React.ReactNode;
  /** 悬停/进入时的目标 rotateX（度）*/
  rotateX?: number;
  /** 悬停/进入时的目标 rotateY（度）*/
  rotateY?: number;
  /** 悬停/进入时的 translateZ（px）*/
  translateZ?: number;
  /** 进入帧数（enterFrames）*/
  enterFrames?: number;
  /** 基准 spring damping */
  damping?: number;
  /** 基准 spring stiffness */
  stiffness?: number;
  /** 外部传入的 spring 值（用于外部驱动）*/
  springValue?: number;
  /** 容器 className */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 2.5D 透视卡片。
 * 用法：
 * - 传 springValue（0→1）驱动入场
 * - 或传 enterFrames 让组件自动用 spring 驱动
 * - rotateX/Y/translateZ 控制 3D 倾斜程度
 *
 * 示例（BenchmarkChart 场景，进入时微微前倾）：
 * <PerspectiveCard enterFrames={10} rotateX={-6} rotateY={4} translateZ={24}>
 *   {children}
 * </PerspectiveCard>
 */
export const PerspectiveCard: React.FC<PerspectiveCardProps> = ({
  children,
  rotateX = 0,
  rotateY = 0,
  translateZ = 0,
  enterFrames,
  damping = 18,
  stiffness = 110,
  springValue,
  className,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 如果外部传了 springValue，直接用它；否则用内部 spring
  const value = springValue ?? (
    enterFrames !== undefined
      ? spring({fps, frame: Math.max(0, frame - (enterFrames ?? 0)), config: {damping, stiffness}})
      : 1
  );

  // 派生 rotateX / rotateY / translateZ
  const rx = interpolate(value, [0, 1], [0, rotateX]);
  const ry = interpolate(value, [0, 1], [0, rotateY]);
  const tz = interpolate(value, [0, 1], [0, translateZ]);

  // 阴影随 tilt 变化
  const shadowOpacity = interpolate(value, [0, 1], [0, 0.35]);
  const shadowBlur = interpolate(value, [0, 1], [4, 20]);
  const shadowOffsetY = interpolate(value, [0, 1], [2, 16]);

  return (
    <div
      className={className}
      style={{
        perspective: '1200px',
        perspectiveOrigin: 'center center',
        ...style,
      }}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`,
          transition: 'box-shadow 0.1s ease',
          backfaceVisibility: 'hidden',
          boxShadow: `0 ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 带视差深度的 2.5D 悬浮层（多层叠加制造 depth） */
export interface ParallaxLayerProps {
  children: React.ReactNode;
  /** 前景层（离镜头近）比背景层移动更多 */
  depth?: number; // 0-1，越小越远
  /** 帧偏移量（背景不动，前景动） */
  frameOffset?: number;
  style?: React.CSSProperties;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  depth = 0.5,
  frameOffset = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 前景移动多，背景移动少
  const maxShift = 24 * (1 - depth); // 最深背景 shift=0
  const shiftX = spring({
    fps,
    frame: Math.max(0, frame - frameOffset),
    config: {damping: 20, stiffness: 90},
  });
  const x = interpolate(shiftX, [0, 1], [-maxShift / 2, maxShift / 2]);
  const y = interpolate(shiftX, [0, 1], [-maxShift / 4, maxShift / 4]);

  return (
    <div
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
