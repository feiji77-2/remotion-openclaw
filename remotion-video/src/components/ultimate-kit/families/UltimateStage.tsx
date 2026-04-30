import React from 'react';
import {AbsoluteFill} from 'remotion';
import {UltimateBackdrop} from './UltimateBackdrop';
import {ultimateKitTokens} from '../tokens';
import type {UltimateStageProps} from '../types';

const stageFrame = (color: string): React.CSSProperties => ({
  position: 'absolute',
  inset: 36,
  borderRadius: 42,
  border: `1px solid ${color}`,
  boxShadow: `inset 0 0 0 1px ${color}, 0 24px 80px rgba(0,0,0,0.28)`,
  pointerEvents: 'none',
});

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
  const gridVisible = showGrid || stagePreset === 'data';

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
            opacity: stagePreset === 'data' ? 0.18 : 0.1,
            backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
            backgroundSize: '120px 120px',
            maskImage: 'radial-gradient(circle at 50% 50%, black 52%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <div style={stageFrame(accent)} />
      <div
        style={{
          position: 'absolute',
          inset: 68,
          borderRadius: 34,
          background: 'linear-gradient(180deg, rgba(8,13,24,0.18), rgba(8,13,24,0.06))',
          border: '1px solid rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }}
      />
      {stagePreset === 'cta' ? (
        <div
          style={{
            position: 'absolute',
            inset: 120,
            borderRadius: 36,
            border: '1px solid rgba(205,255,61,0.25)',
            boxShadow: '0 0 80px rgba(205,255,61,0.12)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${ultimateKitTokens.spacing.pageY}px ${ultimateKitTokens.spacing.pageX}px`,
          fontFamily: ultimateKitTokens.fonts.ui,
          color: ultimateKitTokens.colors.text,
        }}
      >
        {children}
      </div>
      {typeof sceneDurationFrames === 'number' && stagePreset === 'data' ? (
        <div
          style={{
            position: 'absolute',
            right: 72,
            bottom: 46,
            color: 'rgba(255,255,255,0.28)',
            fontSize: 22,
            letterSpacing: 4,
            fontFamily: ultimateKitTokens.fonts.mono,
          }}
        >
          {sceneDurationFrames}F
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
