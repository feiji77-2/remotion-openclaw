/**
 * 共享动效常量
 * 统一缓动函数和动效预设
 */

import { spring, interpolate } from 'remotion';

// ===== 缓动函数 =====

export const easings = {
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  spring: (frame: number, config?: { damping?: number; stiffness?: number }) =>
    spring({ fps: 30, frame, config: { damping: 200, stiffness: 100, ...config } }),
};

// ===== 通用补间动画 =====

export const fadeIn = (frame: number, delay = 0, duration = 20) =>
  interpolate(Math.max(0, frame - delay), [0, duration], [0, 1], { extrapolateRight: 'clamp' });

export const slideInLeft = (frame: number, delay = 0, distance = 200) =>
  interpolate(fadeIn(frame, delay), [0, 1], [distance, 0]);

export const slideInRight = (frame: number, delay = 0, distance = 200) =>
  interpolate(fadeIn(frame, delay), [0, 1], [-distance, 0]);

export const scaleIn = (frame: number, delay = 0) =>
  easings.spring(frame - delay);

// ===== 预配置动效配置 =====

export const springPresets = {
  snappy: { damping: 200, stiffness: 200 },
  smooth: { damping: 150, stiffness: 100 },
  bouncy: { damping: 100, stiffness: 100 },
  slow: { damping: 250, stiffness: 50 },
};

// ===== 扫光效果 =====

export const sweepConfig = {
  duration: 30, // 扫光持续帧数
  width: 0.3,   // 扫光宽度（占总宽度比例）
};
