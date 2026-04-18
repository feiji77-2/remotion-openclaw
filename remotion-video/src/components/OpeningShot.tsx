import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {POSTER_HERO_TOP_COMPACT, POSTER_SIDE_PADDING} from '../render/layoutRhythm';

interface OpeningShotProps {
  mainNumber: string;
  mainNumberLabel?: string;
  subtitle?: string;
  suspenseLine?: string;
  accentColor?: string;
  bgColor?: string;
}

export const OpeningShot: React.FC<OpeningShotProps> = ({
  mainNumber,
  mainNumberLabel,
  subtitle,
  suspenseLine = '它不是功能最多的那个',
  accentColor = '#00d4ff',
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();
  const heroProgress = interpolate(frame, [0, 28], [0, 1], {extrapolateRight: 'clamp'});
  const detailProgress = interpolate(frame, [12, 42], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const numberSize = mainNumber.length > 4 ? 176 : 220;

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 46%, ${accentColor}18 0%, transparent 28%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 78%, ${accentColor}0d 0%, transparent 22%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: POSTER_SIDE_PADDING,
          right: POSTER_SIDE_PADDING,
          top: POSTER_HERO_TOP_COMPACT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: heroProgress,
          transform: `translateY(${interpolate(heroProgress, [0, 1], [26, 0])}px)`,
        }}
      >
        {mainNumberLabel ? (
          <div
            style={{
              fontSize: 18,
              fontWeight: 650,
              color: 'rgba(235,242,255,0.54)',
              letterSpacing: 3.2,
              textTransform: 'uppercase',
            }}
          >
            {mainNumberLabel}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 18,
            fontSize: numberSize,
            fontWeight: 900,
            color: accentColor,
            lineHeight: 0.92,
            letterSpacing: -6,
            textShadow: `0 0 36px ${accentColor}66`,
          }}
        >
          {mainNumber}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 14,
              maxWidth: 860,
              fontSize: 40,
              fontWeight: 760,
              color: '#f5f9ff',
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 28,
            width: 220,
            height: 2,
            borderRadius: 999,
            background: `linear-gradient(90deg, rgba(255,255,255,0), ${accentColor}, rgba(255,255,255,0))`,
            opacity: detailProgress,
          }}
        />
        <div
          style={{
            marginTop: 24,
            maxWidth: 780,
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(235,242,255,0.72)',
            lineHeight: 1.45,
            opacity: detailProgress,
            transform: `translateY(${interpolate(detailProgress, [0, 1], [18, 0])}px)`,
          }}
        >
          {suspenseLine}
        </div>
      </div>
    </AbsoluteFill>
  );
};
