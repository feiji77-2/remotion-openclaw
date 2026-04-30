import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../../ParticleBackground';
import {DotGridParallax, GodRays} from '../../visual-atoms';
import {resolveBackdropVariant} from '../../../data/registry';
import type {UltimateStagePreset} from '../types';

interface UltimateBackdropProps {
  family?: string;
  warm?: boolean;
  sceneIndex?: number;
  stagePreset?: UltimateStagePreset;
  sceneDurationFrames?: number;
}

export const UltimateBackdrop: React.FC<UltimateBackdropProps> = ({
  family = 'hero',
  warm = false,
  sceneIndex = 0,
  stagePreset = 'data',
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const accent = warm ? '#ffad63' : '#63ddff';
  const variant = resolveBackdropVariant(family, sceneIndex, stagePreset);
  const duration = Math.max(40, sceneDurationFrames ?? 96);
  const enterOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitOpacity = interpolate(frame, [Math.max(18, duration - 18), duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lifeOpacity = enterOpacity * exitOpacity;
  const pulseCenter = Math.min(duration - 6, Math.max(18, Math.floor(duration * 0.58)));
  const pulseBoost = interpolate(
    frame,
    [Math.max(0, pulseCenter - 4), pulseCenter, Math.min(duration, pulseCenter + 10)],
    [1, 1.42, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const driftY = Math.sin(frame / 28) * (stagePreset === 'climax' ? 22 : 12);
  const atomOpacity =
    stagePreset === 'climax'
      ? 0.92
      : stagePreset === 'evidence'
        ? 0.7
        : stagePreset === 'cta'
          ? 0.76
          : 0.64;
  const baseGradient =
    stagePreset === 'cta'
      ? 'radial-gradient(circle at 50% 18%, rgba(205,255,61,0.15), transparent 38%), linear-gradient(180deg, #07111e 0%, #0b1324 40%, #04070f 100%)'
      : stagePreset === 'climax'
        ? 'radial-gradient(circle at 50% 12%, rgba(255,120,120,0.16), transparent 32%), linear-gradient(180deg, #120914 0%, #090d1b 45%, #05070d 100%)'
        : 'radial-gradient(circle at 50% 12%, rgba(99,221,255,0.12), transparent 34%), linear-gradient(180deg, #0a1120 0%, #0b1222 45%, #05070d 100%)';

  return (
    <AbsoluteFill style={{background: baseGradient, overflow: 'hidden', opacity: lifeOpacity}}>
      <AbsoluteFill
        style={{
          opacity: 0.12 * pulseBoost,
          background:
            stagePreset === 'cta'
              ? 'radial-gradient(circle at 50% 48%, rgba(205,255,61,0.22), transparent 56%)'
              : stagePreset === 'climax'
                ? 'radial-gradient(circle at 50% 42%, rgba(255,120,120,0.22), transparent 48%)'
                : 'radial-gradient(circle at 50% 42%, rgba(99,221,255,0.16), transparent 52%)',
          transform: `translate3d(0, ${driftY * 0.18}px, 0) scale(${1 + (pulseBoost - 1) * 0.08})`,
        }}
      />
      {variant === 'god-rays' ? (
        <div
          style={{
            position: 'absolute',
            inset: -120,
            opacity: atomOpacity * pulseBoost,
            transform: `translate3d(0, ${driftY}px, 0) scale(${1 + (pulseBoost - 1) * 0.12})`,
          }}
        >
          <GodRays color={accent} intensity={stagePreset === 'climax' ? 0.78 : 0.55} rays={stagePreset === 'cta' ? 11 : 8} />
        </div>
      ) : null}
      {variant === 'dot-grid' ? (
        <div
          style={{
            position: 'absolute',
            inset: -80,
            opacity: atomOpacity * (stagePreset === 'data' ? 1 : 0.86),
            transform: `translate3d(0, ${driftY * 0.7}px, 0) scale(${1 + (pulseBoost - 1) * 0.04})`,
          }}
        >
          <DotGridParallax dotColor={accent} density={0.5} parallaxX={18} parallaxY={10} />
        </div>
      ) : null}
      {variant === 'particle-grid' ? (
        <div
          style={{
            position: 'absolute',
            inset: -60,
            opacity: atomOpacity * (stagePreset === 'evidence' ? 0.82 : 1),
            transform: `translate3d(0, ${driftY * 0.45}px, 0) scale(${1 + (pulseBoost - 1) * 0.05})`,
          }}
        >
          <ParticleBackground
            particleCount={stagePreset === 'evidence' ? 54 : 78}
            colors={[accent, '#ffffff', warm ? '#ffd66c' : '#7c8cff']}
            speed={stagePreset === 'climax' ? 1.35 : 0.85}
            opacityScale={stagePreset === 'evidence' ? 0.9 : 1.1}
          />
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          background:
            stagePreset === 'data'
              ? 'linear-gradient(90deg, rgba(99,221,255,0.05) 0%, transparent 24%, transparent 76%, rgba(99,221,255,0.05) 100%)'
              : 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(3,5,12,0.08) 70%, rgba(3,5,12,0.32) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
