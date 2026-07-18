import type React from 'react';

export const qualityLayerStyle = {
  backfaceVisibility: 'hidden',
} satisfies React.CSSProperties;

export const mediaQualityStyle = {
  backfaceVisibility: 'hidden',
  imageRendering: 'auto',
} satisfies React.CSSProperties;

export const cinematicVignetteStyle = {
  pointerEvents: 'none',
  background:
    'radial-gradient(circle at 50% 42%, transparent 0%, rgba(0,0,0,0.28) 100%)',
} satisfies React.CSSProperties;

export const subtleFilmGrainStyle = {
  display: 'none',
} satisfies React.CSSProperties;
