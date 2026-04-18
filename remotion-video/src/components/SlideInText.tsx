import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface SlideInTextProps {
  text: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
  size?: number;
  color?: string;
  accentColor?: string;
  bgColor?: string;
}

/**
 * 滑入文字动画
 * 支持左右上下四个方向入场
 */
export const SlideInText: React.FC<SlideInTextProps> = ({
  text,
  direction = 'left',
  delay = 0,
  size = 60,
  color = '#FFFFFF',
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const sign = direction === 'left' || direction === 'top' ? -1 : 1;
  const distance = 200;

  const itemFrame = Math.max(0, frame - delay);
  const slideProgress = spring({ fps: 30, frame: itemFrame, config: { damping: 180, stiffness: 120 } });
  const opacity = interpolate(itemFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const transforms = {
    x: axis === 'x' ? (1 - slideProgress) * sign * distance : 0,
    y: axis === 'y' ? (1 - slideProgress) * sign * distance : 0,
    scale: slideProgress,
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 700,
          color,
          textAlign: 'center',
          padding: '0 120px',
          transform: `translate(${transforms.x}px, ${transforms.y}px) scale(${transforms.scale})`,
          opacity,
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </div>
  );
};
