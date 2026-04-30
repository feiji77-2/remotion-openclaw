import React from 'react';
import {resolveUltimateAccent, ultimateKitTokens} from '../tokens';
import type {UltimatePlatformOverlayProps} from '../types';

export const UltimatePlatformOverlay: React.FC<UltimatePlatformOverlayProps> = ({
  brand = 'OPENCLAW',
  account = '@openclaw',
  searchLabel,
  watermark,
  family,
  mode = 'auto',
  accent = 'cyan',
}) => {
  const accentColor = resolveUltimateAccent(accent);
  const resolvedMode = mode === 'auto'
    ? family === 'terminal' || family === 'code' || family === 'metrics' || family === 'benchmark-chart'
      ? 'terminal'
      : 'minimal'
    : mode;

  if (resolvedMode === 'minimal') {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 38,
            left: 48,
            padding: '10px 18px',
            borderRadius: 999,
            border: `1px solid ${accentColor}44`,
            background: 'rgba(6,10,18,0.62)',
            color: '#f5f7ff',
            fontSize: 18,
            letterSpacing: 2,
            textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
          }}
        >
          {brand}
        </div>
        {watermark ? (
          <div
            style={{
              position: 'absolute',
              top: 42,
              right: 54,
              color: 'rgba(255,255,255,0.36)',
              fontSize: 17,
              letterSpacing: 3,
            }}
          >
            {watermark}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 32,
          right: 32,
          height: 58,
          borderRadius: 20,
          border: `1px solid ${accentColor}33`,
          background: 'rgba(7,10,18,0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
          backdropFilter: 'blur(14px)',
          boxShadow: `0 12px 44px ${accentColor}14`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 10, height: 10, borderRadius: 999, background: accentColor, boxShadow: `0 0 18px ${accentColor}`}} />
          <div style={{fontSize: 18, letterSpacing: 2.2, color: '#f5f7ff'}}>{brand}</div>
          <div style={{fontSize: 15, letterSpacing: 1.6, color: 'rgba(255,255,255,0.52)'}}>{account}</div>
        </div>
        <div style={{fontSize: 16, letterSpacing: 1.4, color: 'rgba(255,255,255,0.64)'}}>
          {searchLabel ?? 'live system trace'}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 34,
          bottom: 28,
          padding: '10px 16px',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(4,8,14,0.76)',
          color: 'rgba(255,255,255,0.58)',
          fontSize: 15,
          letterSpacing: 1.6,
          fontFamily: ultimateKitTokens.fonts.mono,
        }}
      >
        {family ?? 'scene'}::grammar // {searchLabel ?? 'semantic dispatch'}
      </div>
      {watermark ? (
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 34,
            color: 'rgba(255,255,255,0.34)',
            fontSize: 15,
            letterSpacing: 2,
          }}
        >
          {watermark}
        </div>
      ) : null}
    </>
  );
};
