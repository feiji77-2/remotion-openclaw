import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {ResolvedUltimateSceneConfig} from './project';
import {CameraDirector} from '../camera/CameraDirector';
import {getCameraMotion, getPreferredCameraMotion} from '../../data/registry';
import {CAMERA_INTENT_TO_MOTION, type CameraIntent} from '../../data/shotGrammar';

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

  // ── 导演层：从 scene.grammar 读 cameraIntent（语义层）────────────
  // shot grammar 的 cameraIntent 是"导演语言"（pin/compress/chase...）
  // 要翻译成 CameraMotionPreset（技术语言）再传给 CameraDirector
  const grammar = scene.grammar;
  const cameraIntentFromGrammar = (grammar?.cameraIntent ?? 'none') as CameraIntent;
  const isOpeningBeat =
    scene.family === 'hero'
    || Boolean(grammar?.directorNote?.includes('[level=opening]'));
  const isBridgeBeat = scene.family === 'terminal' || scene.family === 'code' || scene.family === 'tag-matrix';
  const isDataRevealBeat =
    scene.family === 'benchmark-chart'
    || scene.family === 'metrics'
    || scene.family === 'data-stream'
    || scene.family === 'number-strip'
    || grammar?.dataEvent === 'count-up'
    || grammar?.dataEvent === 'delta-hit'
    || grammar?.dataEvent === 'overtake'
    || grammar?.dataEvent === 'threshold-cross';
  const isClimaxBeat =
    scene.family === 'compare-board'
    || scene.family === 'cta'
    || scene.family === 'quote-highlight'
    || grammar?.archetype === 'threshold breach';
  const narrativeCameraMotion =
    isOpeningBeat
      ? 'drift'
      : isBridgeBeat
        ? 'none'
        : isDataRevealBeat
          ? 'zoom-pulse'
          : isClimaxBeat
            ? 'push-in'
            : undefined;
  const cameraMotionFromGrammar =
    cameraIntentFromGrammar !== 'none' && cameraIntentFromGrammar in CAMERA_INTENT_TO_MOTION
      ? CAMERA_INTENT_TO_MOTION[cameraIntentFromGrammar]
      : undefined;
  const cameraMotion =
    narrativeCameraMotion
    ?? getPreferredCameraMotion(scene.family)
    ?? cameraMotionFromGrammar
    ?? getCameraMotion(scene.family);

  // enterFrames / emphasisFrames 也优先从 grammar 读
  const enterFrames = grammar?.enterFrames ?? 20;
  const emphasisFrames = grammar?.emphasisFrames ?? 50;

  if (!transition || transition.preset !== 'flash') {
    return (
      <CameraDirector
        preset={cameraMotion}
        enterFrames={enterFrames}
        emphasisFrames={emphasisFrames}
      >
        {children}
      </CameraDirector>
    );
  }

  const window = Math.min(transition.durationInFrames, Math.max(8, Math.floor(scene.durationInFrames / 3)));
  const enter = interpolate(frame, [0, window], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brightness = 1 + (1 - enter) * 0.24;
  const veilOpacity = (1 - enter) * 0.3;

  return (
    <CameraDirector
      preset={cameraMotion}
      enterFrames={enterFrames}
      emphasisFrames={emphasisFrames}
    >
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            filter: `brightness(${brightness})`,
            willChange: 'filter',
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
      </AbsoluteFill>
    </CameraDirector>
  );
};
