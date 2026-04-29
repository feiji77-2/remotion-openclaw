import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {InlineEmoji} from '../AppleEmoji';
import {MORFEO_BLACK, MORFEO_FONTS, MORFEO_LIME} from './morfeoTokens';

export type MorfeoTagProps = {
  label: string;
  emoji?: string;
  delayFrames?: number;
  accentColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
};

const SIZE_PRESETS = {
  sm: {fontSize: 20, padding: '10px 16px', radius: 999, emojiSize: 22, gap: 8},
  md: {fontSize: 24, padding: '12px 18px', radius: 999, emojiSize: 26, gap: 10},
  lg: {fontSize: 28, padding: '14px 22px', radius: 999, emojiSize: 30, gap: 12},
} as const;

export const MorfeoTag: React.FC<MorfeoTagProps> = ({
  label,
  emoji,
  delayFrames = 0,
  accentColor = MORFEO_LIME,
  textColor = MORFEO_BLACK,
  size = 'md',
  style,
}) => {
  const frame = useCurrentFrame();
  const preset = SIZE_PRESETS[size];
  const progress = interpolate(frame - delayFrames, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: preset.gap,
        padding: preset.padding,
        borderRadius: preset.radius,
        background: accentColor,
        color: textColor,
        fontFamily: MORFEO_FONTS.ui,
        fontSize: preset.fontSize,
        fontWeight: 700,
        letterSpacing: -0.4,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [-16, 0])}px)`,
        boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
        ...style,
      }}
    >
      {emoji ? <InlineEmoji emoji={emoji} size={preset.emojiSize} /> : null}
      <span>{label}</span>
    </div>
  );
};
