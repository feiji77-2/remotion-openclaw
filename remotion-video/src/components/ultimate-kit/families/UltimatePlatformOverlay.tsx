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
            top: 28,
            left: 34,
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(6,10,18,0.34)',
            color: 'rgba(245,247,255,0.72)',
            fontSize: 13,
            letterSpacing: 1.8,
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
              top: 30,
              right: 38,
              color: 'rgba(255,255,255,0.2)',
              fontSize: 12,
              letterSpacing: 2.4,
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
          top: 26,
          left: 34,
          right: 34,
          height: 44,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(7,10,18,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backdropFilter: 'blur(14px)',
          boxShadow: `0 12px 44px ${accentColor}08`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 8, height: 8, borderRadius: 999, background: accentColor, boxShadow: `0 0 18px ${accentColor}`}} />
          <div style={{fontSize: 13, letterSpacing: 1.8, color: 'rgba(245,247,255,0.74)', textTransform: 'uppercase'}}>{brand}</div>
          <div style={{fontSize: 12, letterSpacing: 1.2, color: 'rgba(255,255,255,0.34)'}}>{account}</div>
        </div>
        <div style={{fontSize: 12, letterSpacing: 1.2, color: 'rgba(255,255,255,0.34)'}}>
          {searchLabel ?? 'live system trace'}
        </div>
      </div>
      {watermark ? (
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 28,
            color: 'rgba(255,255,255,0.18)',
            fontSize: 11,
            letterSpacing: 2.2,
          }}
        >
          {watermark}
        </div>
      ) : null}
    </>
  );
};
