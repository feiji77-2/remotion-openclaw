import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ResolvedUltimateSceneConfig} from './project';

type UltimateSceneTransitionProps = {
  scene: ResolvedUltimateSceneConfig;
  children: React.ReactNode;
};

export const UltimateSceneTransition: React.FC<UltimateSceneTransitionProps> = ({
  scene,
  children,
}) => {
  const frame = useCurrentFrame();
  const transition = scene.transition;

  if (!transition) {
    return <>{children}</>;
  }

  const window = Math.min(
    transition.durationInFrames,
    Math.max(6, Math.floor(scene.durationInFrames / 2)),
  );
  const enter = interpolate(frame, [0, window], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(
    frame,
    [scene.durationInFrames - window, scene.durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const opacity = Math.min(enter, exit);

  let translateY = 0;
  let scale = 1;
  let brightness = 1;

  if (transition.preset === 'lift') {
    const enterY = interpolate(frame, [0, window], [26, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitY = interpolate(
      frame,
      [scene.durationInFrames - window, scene.durationInFrames],
      [0, -18],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      },
    );
    translateY = enterY + exitY;
    scale = interpolate(frame, [0, window], [0.988, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  if (transition.preset === 'flash') {
    brightness = 1 + (1 - enter) * 0.2 + (1 - exit) * 0.24;
  }

  const veilOpacity =
    transition.preset === 'flash'
      ? (1 - enter) * 0.26 + (1 - exit) * 0.34
      : (1 - enter) * 0.12 + (1 - exit) * 0.18;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          filter: `brightness(${brightness})`,
          willChange: 'opacity, transform, filter',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: transition.color,
          opacity: veilOpacity,
          pointerEvents: 'none',
        }}
      />
      {transition.preset === 'flash' ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${interpolate(frame, [0, window], [92, 540], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px`,
            height: 2,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.88), transparent)',
            opacity: (1 - enter) * 0.7,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

