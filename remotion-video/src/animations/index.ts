// 动画库 - 提供可复用的动画函数

import {interpolate, spring} from 'remotion';

type AnimationValue = number;

/**
 * 淡入动画
 */
export function fadeIn(delay: number = 0, duration: number = 30) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return interpolate(value, [delay, delay + duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };
}

/**
 * 淡出动画
 */
export function fadeOut(delay: number = 0, duration: number = 30) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return interpolate(value, [delay, delay + duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };
}

/**
 * 滑入动画 - 从左侧
 */
export function slideInFromLeft(delay: number = 0, duration: number = 30, distance: number = 100) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return interpolate(value, [delay, delay + duration], [-distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };
}

/**
 * 滑入动画 - 从右侧
 */
export function slideInFromRight(delay: number = 0, duration: number = 30, distance: number = 100) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return interpolate(value, [delay, delay + duration], [distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };
}

/**
 * 缩放动画 - 放大出现
 */
export function scaleIn(delay: number = 0, duration: number = 30, initialScale: number = 0.5) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return interpolate(value, [delay, delay + duration], [initialScale, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };
}

/**
 * 弹跳动画
 */
export function bounceIn(delay: number = 0, duration: number = 60) {
  return (props: {value: AnimationValue}) => {
    const { value } = props;
    return spring({
      frame: Math.max(0, value - delay),
      fps: 30,
      durationInFrames: duration,
      config: {
        damping: 15,
        stiffness: 200,
        mass: 0.5,
      },
    });
  };
}

/**
 * 打字机动画 - 文字逐字出现
 */
export function typewriter(text: string, delay: number = 0, charDuration: number = 3) {
  return (props: { frame: number }) => {
    const { frame } = props;
    const elapsed = Math.max(0, frame - delay);
    const charCount = Math.floor(elapsed / charDuration);
    return text.slice(0, charCount);
  };
}

/**
 * 组合动画 - 同时执行多个动画
 */
export function composeAnimations(...animations: Array<(props: any) => number>) {
  return (props: any) => {
    return animations.map(fn => fn(props));
  };
}

// 预定义动画配置
export const AnimationPresets = {
  fadeIn: { delay: 0, duration: 30 },
  slideUp: { delay: 0, duration: 30, distance: 50 },
  scaleIn: { delay: 0, duration: 20, initialScale: 0.8 },
  bounce: { delay: 0, duration: 60 },
} as const;
