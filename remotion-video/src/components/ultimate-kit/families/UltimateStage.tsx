import React from 'react';
import {AbsoluteFill} from 'remotion';
import {UltimateBackdrop} from './UltimateBackdrop';
import {ultimateKitTokens} from '../tokens';
import type {UltimateStageProps} from '../types';

export const UltimateStage: React.FC<UltimateStageProps> = ({
  children,
  warm = false,
  showGrid = false,
  family = 'hero',
  sceneIndex = 0,
  sceneDurationFrames,
  stagePreset = 'data',
}) => {
  const accent = warm ? 'rgba(255,173,99,0.32)' : 'rgba(99,221,255,0.28)';
  const gridVisible = showGrid || stagePreset === 'data' || stagePreset === 'evidence';

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#05070d'}}>
      <UltimateBackdrop
        family={family}
        warm={warm}
        sceneIndex={sceneIndex}
        stagePreset={stagePreset}
        sceneDurationFrames={sceneDurationFrames}
      />
      {gridVisible ? (
        <AbsoluteFill
          style={{
            opacity: stagePreset === 'data' ? 0.12 : stagePreset === 'evidence' ? 0.08 : 0.06,
            backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
            backgroundSize: stagePreset === 'data' ? '140px 140px' : '180px 180px',
            maskImage: 'radial-gradient(circle at 50% 56%, black 44%, transparent 92%)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            stagePreset === 'cta'
              ? 'radial-gradient(circle at 50% 16%, rgba(205,255,61,0.12), transparent 34%), linear-gradient(180deg, rgba(4,6,12,0.05), rgba(4,6,12,0.34) 62%, rgba(4,6,12,0.58) 100%)'
              : stagePreset === 'climax'
                ? 'radial-gradient(circle at 52% 18%, rgba(255,122,115,0.12), transparent 34%), linear-gradient(180deg, rgba(4,6,12,0.04), rgba(4,6,12,0.22) 52%, rgba(4,6,12,0.54) 100%)'
                : 'linear-gradient(180deg, rgba(4,6,12,0.03), rgba(4,6,12,0.14) 42%, rgba(4,6,12,0.42) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${ultimateKitTokens.spacing.pageY}px ${ultimateKitTokens.spacing.pageX - 12}px`,
          fontFamily: ultimateKitTokens.fonts.ui,
          color: ultimateKitTokens.colors.text,
        }}
      >
        {children}
      </div>
      {typeof sceneDurationFrames === 'number' && (stagePreset === 'data' || stagePreset === 'evidence') ? (
        <div
          style={{
            position: 'absolute',
            right: 58,
            bottom: 34,
            color: 'rgba(255,255,255,0.18)',
            fontSize: 18,
            letterSpacing: 3,
            fontFamily: ultimateKitTokens.fonts.mono,
          }}
        >
          {sceneDurationFrames}F
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
