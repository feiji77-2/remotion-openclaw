/**
 * motionGrammar.ts — 四层动画系统
 *
 * Layer 1: camera     — 全局镜头推拉/平移/缩放，基于 spring + interpolate
 * Layer 2: layout     — 根据 family 类型决定入场/驻留/退场动画
 * Layer 3: foreground — 前景特效（blur/glow/distortion/fog）
 * Layer 4: micro      — 微抖动（原有 jitter 保留）
 *
 * 用法: composeMotion({family, frame, durationInFrames, intensity})
 */

import {interpolate, spring} from 'remotion';
import {appendUltimateMicroJitter, createUltimateMicroJitter} from './motion';

// ── Layer 1: Camera presets ─────────────────────────────────────────────────

export type CameraPreset = 'static' | 'slow-zoom-in' | 'push-in' | 'wipe' | 'parallax';
export type CameraTransform = {
  scale: number;
  x: number;
  y: number;
  rotate: number;
};

export function resolveCameraPreset(
  family: string,
  frame: number,
  durationInFrames: number,
): CameraTransform {
  const t = frame / Math.max(durationInFrames - 1, 1);

  switch (family) {
    case 'hero':
    case 'cta': {
      // 开场/结尾：缓慢放大，给冲击感
      const scale = interpolate(t, [0, 1], [1.0, 1.04], {extrapolateLeft: 'clamp'});
      return {scale, x: 0, y: 0, rotate: 0};
    }
    case 'compare-board':
    case 'benchmark-chart': {
      // 对比/数据类：轻微推入（push-in）
      const scale = interpolate(t, [0, 1], [0.97, 1.0], {extrapolateLeft: 'clamp'});
      return {scale, x: 0, y: 0, rotate: 0};
    }
    case 'code':
    case 'terminal': {
      // 代码/终端：左滑入
      const x = interpolate(t, [0, 1], [18, 0], {extrapolateLeft: 'clamp'});
      return {scale: 1, x, y: 0, rotate: 0};
    }
    case 'timeline':
    case 'step-flow': {
      // 时间线/流程：右滑入
      const x = interpolate(t, [0, 1], [-18, 0], {extrapolateLeft: 'clamp'});
      return {scale: 1, x, y: 0, rotate: 0};
    }
    case 'focus':
    case 'quote-highlight': {
      // 聚焦/引用：轻微上下弹性
      const y = interpolate(t, [0, 0.5, 1], [6, -2, 0], {extrapolateLeft: 'clamp'});
      return {scale: 1, x: 0, y, rotate: 0};
    }
    default: {
      // 默认：极轻微 zoom
      const scale = interpolate(t, [0, 1], [0.99, 1.01], {extrapolateLeft: 'clamp'});
      return {scale, x: 0, y: 0, rotate: 0};
    }
  }
}

// ── Layer 2: Layout morph presets ────────────────────────────────────────────

export type LayoutPreset = 'reveal' | 'slide-up' | 'wipe-left' | 'wipe-right' | 'fade' | 'spring-in';

export function resolveLayoutPreset(family: string): LayoutPreset {
  switch (family) {
    case 'hero':
    case 'cta':
      return 'spring-in';
    case 'code':
    case 'terminal':
      return 'wipe-left';
    case 'timeline':
    case 'step-flow':
      return 'wipe-right';
    case 'focus':
    case 'quote-highlight':
      return 'slide-up';
    case 'compare-board':
    case 'benchmark-chart':
    case 'metrics':
    case 'data-stream':
      return 'fade';
    default:
      return 'reveal';
  }
}

export function calcLayoutProgress(
  preset: LayoutPreset,
  frame: number,
  durationInFrames: number,
): number {
  const rampIn = Math.min(20, durationInFrames * 0.15);
  const progress = interpolate(frame, [0, rampIn], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (preset === 'spring-in') {
    return spring({fps: 30, frame, config: {damping: 14, stiffness: 120}});
  }
  if (preset === 'slide-up') {
    return interpolate(progress, [0, 1], [16, 0]);
  }
  if (preset === 'wipe-left' || preset === 'wipe-right') {
    return interpolate(progress, [0, 1], [preset === 'wipe-left' ? 28 : -28, 0]);
  }
  // reveal / fade
  return progress;
}

// ── Layer 3: Foreground fx ──────────────────────────────────────────────────

export type ForegroundFxPreset = 'none' | 'fog' | 'glow' | 'vignette' | 'blur-edge';

export function resolveForegroundFx(family: string): ForegroundFxPreset {
  switch (family) {
    case 'evidence-wall':
    case 'memory-graph':
      return 'vignette';
    case 'architecture-map':
    case 'pipeline-flow':
      return 'blur-edge';
    case 'quote-highlight':
      return 'glow';
    default:
      return 'none';
  }
}

export function calcForegroundFx(
  preset: ForegroundFxPreset,
  frame: number,
  durationInFrames: number,
): Record<string, number | string> {
  const t = frame / Math.max(durationInFrames - 1, 1);

  switch (preset) {
    case 'fog': {
      // 雾气效果：随时间渐浓
      const opacity = interpolate(t, [0, 0.6, 1], [0, 0.15, 0.22], {extrapolateLeft: 'clamp'});
      return {fogOpacity: opacity};
    }
    case 'glow': {
      // 光晕：中心亮度渐强
      const glow = interpolate(t, [0, 0.5, 1], [0, 0.4, 0.6], {extrapolateLeft: 'clamp'});
      return {glowIntensity: glow};
    }
    case 'vignette': {
      // 暗角：两头浓中间淡
      const vig = Math.sin(t * Math.PI) * 0.35;
      return {vignetteStrength: vig};
    }
    case 'blur-edge': {
      // 边缘模糊：轻微
      const blur = interpolate(t, [0, 0.3, 1], [0, 2, 1], {extrapolateLeft: 'clamp'});
      return {edgeBlur: blur};
    }
    default:
      return {};
  }
}

// ── Layer 4: Micro motion ───────────────────────────────────────────────────

export {createUltimateMicroJitter, appendUltimateMicroJitter};

// ── Composed motion orchestrator ─────────────────────────────────────────────

export type MotionIntensity = 'low' | 'medium' | 'high' | 'explosive';

export type ComposedMotionResult = {
  camera: CameraTransform;
  layoutOffset: number;
  foregroundFx: Record<string, number | string>;
  jitter: ReturnType<typeof createUltimateMicroJitter>;
};

export function composeMotion(params: {
  family: string;
  frame: number;
  durationInFrames: number;
  intensity?: MotionIntensity;
  jitterSeed?: number;
}): ComposedMotionResult {
  const {family, frame, durationInFrames, intensity = 'medium', jitterSeed = 0} = params;

  const camera = resolveCameraPreset(family, frame, durationInFrames);
  const layoutPreset = resolveLayoutPreset(family);
  const layoutOffset = calcLayoutProgress(layoutPreset, frame, durationInFrames);
  const fxPreset = resolveForegroundFx(family);
  const foregroundFx = calcForegroundFx(fxPreset, frame, durationInFrames);

  // jitter amplitude 随 intensity 缩放
  const jitterAmp = intensity === 'explosive' ? 1.8 : intensity === 'high' ? 1.3 : intensity === 'medium' ? 1.0 : 0.5;
  const jitter = createUltimateMicroJitter(frame, {
    delay: 8,
    settleFrames: 16,
    rampFrames: 12,
    amplitudeX: 1.2 * jitterAmp,
    amplitudeY: 1.0 * jitterAmp,
    rotateDeg: 0.45 * jitterAmp,
    scaleDelta: 0.004 * jitterAmp,
    seed: jitterSeed,
    speed: 1,
  });

  return {camera, layoutOffset, foregroundFx, jitter};
}
