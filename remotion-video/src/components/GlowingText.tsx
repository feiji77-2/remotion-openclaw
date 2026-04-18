import React from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';

interface GlowingTextProps {
  text: string;
  size?: number;
  color?: string;
  glowColor?: string;
  glowIntensity?: number; // 0-1
  animate?: boolean;
}

/**
 * 发光文字组件
 * 支持多层text-shadow模拟真实发光效果
 */
export const GlowingText: React.FC<GlowingTextProps> = ({
  text,
  size = 80,
  color = '#FFFFFF',
  glowColor = '#FF6B35',
  glowIntensity = 0.6,
  animate = false,
}) => {
  const frame = useCurrentFrame();

  const shadow1 = `0 0 ${10 * glowIntensity}px ${glowColor}`;
  const shadow2 = `0 0 ${30 * glowIntensity}px ${glowColor}`;
  const shadow3 = `0 0 ${60 * glowIntensity}px ${glowColor}`;
  const shadow4 = `0 0 ${100 * glowIntensity}px rgba(255,255,255,${0.1 * glowIntensity})`;

  const scale = animate
    ? spring({ fps: 30, frame, config: { damping: 200, stiffness: 100 } })
    : 1;

  const opacity = animate ? interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }) : 1;

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 900,
        color: color,
        textShadow: `${shadow1}, ${shadow2}, ${shadow3}, ${shadow4}`,
        transform: `scale(${scale})`,
        opacity,
        lineHeight: 1.2,
        letterSpacing: 2,
      }}
    >
      {text}
    </div>
  );
};
