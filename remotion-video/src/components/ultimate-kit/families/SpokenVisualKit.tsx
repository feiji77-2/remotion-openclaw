import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SPRING_PRESETS} from '../../../render/animationPresets';

export const SPOKEN_CYAN = '#00f5ff';
export const SPOKEN_GREEN = '#10ff8a';
export const SPOKEN_AMBER = '#ffd43b';
export const SPOKEN_RED = '#ff4d6d';

export const getAccentColor = (accent?: string) => {
  if (accent === 'purple') return '#a78bfa';
  if (accent === 'amber') return SPOKEN_AMBER;
  if (accent === 'green') return SPOKEN_GREEN;
  if (accent === 'red') return SPOKEN_RED;
  return SPOKEN_CYAN;
};

/** 口播组件通用 spring 预设 — 使用共享配置 */
export const SPOKEN_SPRING_SMOOTH = SPRING_PRESETS.smooth;

export const fitTitleSize = (text = '', large = 76) => {
  if (text.length > 30) return large - 18;
  if (text.length > 22) return large - 8;
  if (text.length > 14) return large + 4;
  return large;
};

export const SpokenCenterStage: React.FC<{
  children: React.ReactNode;
  compact?: boolean;
}> = ({children, compact = false}) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: compact ? '96px 104px 176px' : '84px 104px 184px',
  }}>
    {children}
  </div>
);

export const SpokenKicker: React.FC<{
  children?: React.ReactNode;
  color?: string;
}> = ({children, color = SPOKEN_CYAN}) => {
  if (!children) return null;
  return (
    <div style={{
      fontSize: 15,
      fontWeight: 900,
      letterSpacing: 5,
      color,
      textTransform: 'uppercase',
      opacity: 0.74,
      marginBottom: 16,
      textShadow: `0 0 18px ${color}66`,
    }}>
      {children}
    </div>
  );
};

export const SpokenHeadline: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  glow?: boolean;
}> = ({children, color = '#ffffff', size = 72, glow = false}) => {
  const frame = useCurrentFrame();
  const reveal = spring({
    fps: 30,
    frame: Math.max(0, frame - 2),
    config: SPOKEN_SPRING_SMOOTH,
  });
  const y = interpolate(reveal, [0, 1], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{
      maxWidth: 1260,
      fontSize: size,
      lineHeight: 1.02,
      fontWeight: 950,
      letterSpacing: -2.6,
      color,
      textAlign: 'center',
      opacity: reveal,
      transform: `translateY(${y}px)`,
      textShadow: glow ? `0 0 22px ${color}88, 0 8px 28px rgba(0,0,0,0.65)` : '0 8px 28px rgba(0,0,0,0.62)',
    }}>
      {children}
    </div>
  );
};

export const SpokenSubline: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  if (!children) return null;
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [14, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      marginTop: 18,
      maxWidth: 920,
      fontSize: 18,
      lineHeight: 1.35,
      fontWeight: 800,
      letterSpacing: 0.4,
      color: 'rgba(226,232,240,0.46)',
      textAlign: 'center',
      opacity: reveal,
    }}>
      {children}
    </div>
  );
};

export const SpokenGlassPanel: React.FC<{
  children: React.ReactNode;
  width?: number;
  padding?: string;
}> = ({children, width = 980, padding = '28px 34px'}) => (
  <div style={{
    width,
    maxWidth: '100%',
    padding,
    borderRadius: 24,
    background: 'linear-gradient(180deg, rgba(12,18,32,0.72), rgba(5,8,16,0.54))',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 0 0 1px rgba(0,245,255,0.05), 0 22px 70px rgba(0,0,0,0.35)',
  }}>
    {children}
  </div>
);
