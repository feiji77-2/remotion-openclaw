import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CameraMotionPreset} from '../../data/registry';
import type {UltimateStagePreset} from '../ultimate-kit/types';

interface CameraDirectorProps {
  children: React.ReactNode;
  preset?: CameraMotionPreset;
  enterFrames?: number;
  stagePreset?: UltimateStagePreset;
}

const strengthByStage: Record<UltimateStagePreset, number> = {
  opening: 1.08,
  data: 0.84,
  evidence: 0.7,
  climax: 1.18,
  cta: 0.92,
};

export const CameraDirector: React.FC<CameraDirectorProps> = ({
  children,
  preset = 'none',
  enterFrames = 18,
  stagePreset = 'data',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const strength = strengthByStage[stagePreset] ?? 0.82;
  const settle = spring({frame, fps, config: {damping: 200}});
  const enter = interpolate(frame, [0, enterFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const drift = Math.sin(frame / 36) * 8 * strength;
  const pulse = 1 + Math.sin(frame / 14) * 0.012 * strength;

  let transform = 'translate3d(0, 0, 0) scale(1)';
  if (preset === 'push-in') {
    const scale = 0.94 + settle * 0.08 * strength;
    const y = (1 - enter) * 46 * strength;
    transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
  } else if (preset === 'pan-x') {
    const x = interpolate(enter, [0, 1], [110 * strength, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    transform = `translate3d(${x}px, ${drift * 0.2}px, 0) scale(${1 + settle * 0.018})`;
  } else if (preset === 'pan-y') {
    const y = interpolate(enter, [0, 1], [86 * strength, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    transform = `translate3d(0, ${y + drift * 0.35}px, 0) scale(${1 + settle * 0.012})`;
  } else if (preset === 'drift') {
    const y = interpolate(enter, [0, 1], [28 * strength, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    transform = `translate3d(0, ${y + drift}px, 0) scale(${1 + settle * 0.01})`;
  } else if (preset === 'zoom-pulse') {
    const y = interpolate(enter, [0, 1], [22 * strength, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    transform = `translate3d(0, ${y + drift * 0.18}px, 0) scale(${0.985 + settle * 0.028 + (pulse - 1)})`;
  } else if (preset === 'growth') {
    const y = interpolate(enter, [0, 1], [38 * strength, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const scaleX = 0.99 + settle * 0.018;
    const scaleY = 0.9 + settle * 0.12 * strength + (pulse - 1) * 0.5;
    transform = `translate3d(0, ${y}px, 0) scale(${scaleX}, ${scaleY})`;
  } else if (preset === 'none') {
    transform = 'translate3d(0, 0, 0) scale(1)';
  } else {
    transform = `translate3d(0, ${drift * 0.15}px, 0) scale(${1 + settle * 0.006})`;
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: -48, transform, transformOrigin: '50% 50%', willChange: 'transform'}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
