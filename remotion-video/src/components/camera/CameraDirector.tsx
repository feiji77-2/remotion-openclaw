/**
 * CameraDirector.tsx — 镜头导演组件
 *
 * 参照 github-unwrapped FeatureList camera motion 设计：
 * 每个场景被 CameraDirector 包裹，驱动 spring-driven transform。
 *
 * 7 种 camera motion presets（对应 registry.ts CameraMotionPreset）：
 *   drift      — Y 轴微微浮动，±30px，背景装饰元素
 *   push-in    — scale 1 → 1.08，强调/聚焦感
 *   pan-x      — X 轴 -50px → 0，横向扫描（rail/compare/timeline）
 *   pan-y      — Y 轴 ±60px，纵向滚动（evidence-wall/list）
 *   zoom-pulse — scale 循环，1 → 1.05 → 1，数据强调
 *   growth    — scaleY 从 0→1 生长（图表柱状/流程节点）
 *   none      — 无 camera motion，静态
 *
 * 使用方法（UltimateSceneTemplate.tsx）：
 *   import { CameraDirector } from '../camera/CameraDirector';
 *   <CameraDirector preset={cameraMotion} enterFrames={20} emphasisFrames={50}>
 *     <SceneContent />
 *   </CameraDirector>
 */

import React from 'react';
import {spring, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import type {CameraMotionPreset} from '../../data/registry';

export interface CameraDirectorProps {
  preset: CameraMotionPreset;
  /** 场景 enter 帧数（默认 20） */
  enterFrames?: number;
  /** 场景 emphasis 帧数（默认 50） */
  emphasisFrames?: number;
  children: React.ReactNode;
}

type SpringConfig = {damping: number; stiffness: number; mass: number};

const PRESET_CONFIGS: Record<CameraMotionPreset, {
  spring: SpringConfig;
  transform: string;     // CSS transform string
  enterAmplitude: number; // 0-1 progress during enter phase
  emphasisHold: boolean; // true = hold at peak during emphasis
}> = {
  none: {
    spring: {damping: 200, stiffness: 120, mass: 1},
    transform: 'translateY(0px)',
    enterAmplitude: 0,
    emphasisHold: false,
  },
  drift: {
    spring: {damping: 200, stiffness: 88, mass: 1},
    transform: 'translateY({y}px)',
    enterAmplitude: 0.6,
    emphasisHold: false,
  },
  'push-in': {
    spring: {damping: 200, stiffness: 340, mass: 1},
    transform: 'scale({s})',
    enterAmplitude: 1,
    emphasisHold: false,
  },
  'pan-x': {
    spring: {damping: 200, stiffness: 170, mass: 1},
    transform: 'translateX({x}px)',
    enterAmplitude: 0.8,
    emphasisHold: false,
  },
  'pan-y': {
    spring: {damping: 200, stiffness: 180, mass: 1},
    transform: 'translateY({y}px)',
    enterAmplitude: 0.8,
    emphasisHold: false,
  },
  'zoom-pulse': {
    spring: {damping: 200, stiffness: 300, mass: 1},
    transform: 'scale({s})',
    enterAmplitude: 1,
    emphasisHold: false,
  },
  growth: {
    spring: {damping: 200, stiffness: 320, mass: 1},
    transform: 'scaleY({s})',
    enterAmplitude: 1,
    emphasisHold: false,
  },
};

/**
 * CameraDirector — 每个场景的 camera motion 外层包装。
 * 基于 spring 驱动的 transform，提供"导演级"镜头运动感。
 */
export const CameraDirector: React.FC<CameraDirectorProps> = ({
  preset,
  enterFrames = 20,
  emphasisFrames = 50,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cfg = PRESET_CONFIGS[preset] ?? PRESET_CONFIGS.none;

  // Spring-driven progress through enter phase
  const enterProgress = spring({
    frame,
    fps,
    config: cfg.spring,
  });

  // Clamp to enter phase duration
  const enterClamped = interpolate(enterProgress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // During emphasis phase: calculate periodic motion
  const isEmphasized = frame >= enterFrames && frame < enterFrames + emphasisFrames;
  const emphasisPhase = isEmphasized
    ? interpolate(frame - enterFrames, [0, emphasisFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const transform = (() => {
    switch (preset) {
      case 'none':
        return 'translateY(0px)';

      case 'drift': {
        const amplitude = 18;
        const y = Math.sin(enterClamped * Math.PI) * amplitude;
        return `translateY(${y}px)`;
      }

      case 'push-in': {
        const s = interpolate(enterClamped, [0, 1], [0.982, 1.065]);
        return `scale(${s})`;
      }

      case 'pan-x': {
        const x = interpolate(enterClamped, [0, 1], [-42, 0]);
        return `translateX(${x}px)`;
      }

      case 'pan-y': {
        const y = interpolate(enterClamped, [0, 1], [54, 0]);
        return `translateY(${y}px)`;
      }

      case 'zoom-pulse': {
        if (isEmphasized) {
          const pulse = Math.sin(emphasisPhase * Math.PI * 2) * 0.022;
          const s = 1.02 + pulse;
          return `scale(${s})`;
        }
        const s = interpolate(enterClamped, [0, 1], [0.99, 1.03]);
        return `scale(${s})`;
      }

      case 'growth': {
        const s = interpolate(enterClamped, [0, 1], [0.08, 1]);
        const x = interpolate(enterClamped, [0, 1], [0.98, 1]);
        return `scale(${x}, ${s})`;
      }

      default:
        return 'translateY(0px)';
    }
  })();

  if (preset === 'none') {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        transform,
        transformOrigin: 'center center',
        width: '100%',
        height: '100%',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

export default CameraDirector;
