/**
 * ZoomIn.tsx — TikTok Zoom强调动效组件
 * 用于关键信息点的 zoom-in 强调
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolate, spring } from 'remotion';

interface ZoomInProps {
  children: React.ReactNode;
  startFrame?: number;    // 开始帧
  duration?: number;      // 持续帧数
  zoomFrom?: number;      // 初始缩放
  zoomTo?: number;        // 目标缩放
  easeType?: 'spring' | 'ease'; // 动画类型
}

const ZoomIn: React.FC<ZoomInProps> = ({
  children,
  startFrame = 0,
  duration = 30,
  zoomFrom = 0.8,
  zoomTo = 1.15,
  easeType = 'spring',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relativeFrame = Math.max(0, frame - startFrame);

  // 计算缩放值
  let scale: number;
  if (relativeFrame < duration) {
    if (easeType === 'spring') {
      scale = zoomFrom + spring({ fps, frame: relativeFrame, config: { damping: 12, stiffness: 100 } }) * (zoomTo - zoomFrom);
    } else {
      const progress = interpolate(relativeFrame, [0, duration], [0, 1], { extrapolateRight: 'clamp' });
      scale = zoomFrom + (zoomTo - zoomFrom) * progress;
    }
  } else {
    scale = zoomTo;
  }

  // 淡入淡出 (确保 inputRange 单调递增)
  const fadeInEnd = Math.min(15, duration / 2);
  const fadeOutStart = Math.max(duration - 10, fadeInEnd + 5);
  const opacity = interpolate(relativeFrame, [0, fadeInEnd, fadeOutStart, duration], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export default ZoomIn;
