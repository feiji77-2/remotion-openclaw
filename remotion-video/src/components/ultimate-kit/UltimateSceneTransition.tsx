import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ResolvedUltimateSceneConfig} from './project';
import {CameraDirector} from '../camera/CameraDirector';
import {getCameraMotion, getPreferredCameraMotion} from '../../data/registry';
import {CAMERA_INTENT_TO_MOTION, type CameraIntent} from '../../data/shotGrammar';

interface UltimateSceneTransitionProps {
  scene: ResolvedUltimateSceneConfig;
  children: React.ReactNode;
}

export const UltimateSceneTransition: React.FC<UltimateSceneTransitionProps> = ({scene, children}) => {
  const frame = useCurrentFrame();
  const grammar = scene.grammar;
  const cameraIntent = (grammar?.cameraIntent ?? 'none') as CameraIntent;
  const cameraPreset = grammar
    ? CAMERA_INTENT_TO_MOTION[cameraIntent] ?? getPreferredCameraMotion(scene.family) ?? getCameraMotion(scene.family)
    : getPreferredCameraMotion(scene.family) ?? getCameraMotion(scene.family);
  const transition = scene.transition === false ? undefined : scene.transition;
  const enterFrames = grammar?.enterFrames ?? transition?.durationInFrames ?? 16;
  const reveal = interpolate(frame, [0, enterFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const preset = transition?.preset ?? 'fade';
  const flashOpacity = preset === 'flash'
    ? interpolate(frame, [0, Math.max(2, Math.floor(enterFrames * 0.45)), enterFrames], [0.65, 0.18, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: preset === 'fade' ? reveal : 1,
    transform:
      preset === 'lift'
        ? `translate3d(0, ${(1 - reveal) * 54}px, 0) scale(${0.965 + reveal * 0.035})`
        : preset === 'slide'
          ? `translate3d(${(1 - reveal) * 96}px, 0, 0)`
          : preset === 'flip'
            ? `perspective(1600px) rotateY(${(1 - reveal) * -18}deg)`
            : 'translate3d(0, 0, 0)',
    clipPath:
      preset === 'wipe'
        ? `inset(0 ${Math.max(0, (1 - reveal) * 100)}% 0 0 round 28px)`
        : preset === 'clock-wipe'
          ? `circle(${12 + reveal * 104}% at 50% 50%)`
          : undefined,
    transformOrigin: '50% 50%',
    willChange: 'transform, opacity, clip-path',
  };

  return (
    <CameraDirector
      preset={cameraPreset}
      enterFrames={enterFrames}
      stagePreset={scene.stageConfig?.stagePreset ?? 'data'}
    >
      <AbsoluteFill>
        <div style={contentStyle}>{children}</div>
        {flashOpacity > 0 ? (
          <AbsoluteFill
            style={{
              pointerEvents: 'none',
              opacity: flashOpacity,
              background:
                scene.warm
                  ? 'radial-gradient(circle at 50% 40%, rgba(255,180,120,0.92), rgba(255,110,70,0.22) 42%, transparent 72%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(140,235,255,0.92), rgba(70,110,255,0.2) 42%, transparent 72%)',
              mixBlendMode: 'screen',
            }}
          />
        ) : null}
      </AbsoluteFill>
    </CameraDirector>
  );
};
