import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {POSTER_HERO_TOP_LOWER, POSTER_SIDE_PADDING} from '../render/layoutRhythm';

interface CTAEndProps {
  mainText?: string;
  subText?: string;
  ctaText?: string;
  accentColor?: string;
  bgColor?: string;
}

export const CTAEnd: React.FC<CTAEndProps> = ({
  mainText = '立即体验',
  subText = '免费开始，无需信用卡',
  ctaText = '开始使用',
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();
  const heroProgress = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  const actionProgress = interpolate(frame, [12, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}14 0%, transparent 32%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 76%, ${accentColor}0d 0%, transparent 22%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: POSTER_SIDE_PADDING,
          right: POSTER_SIDE_PADDING,
          top: POSTER_HERO_TOP_LOWER,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: heroProgress,
          transform: `translateY(${interpolate(heroProgress, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 860,
            fontSize: 92,
            fontWeight: 860,
            color: '#f7fbff',
            lineHeight: 0.98,
            letterSpacing: -3.2,
            textShadow: `0 0 32px ${accentColor}22`,
          }}
        >
          {mainText}
        </div>
        <div
          style={{
            marginTop: 20,
            maxWidth: 760,
            fontSize: 30,
            fontWeight: 500,
            color: 'rgba(236,242,255,0.78)',
            lineHeight: 1.45,
          }}
        >
          {subText}
        </div>
        <div
          style={{
            marginTop: 34,
            width: 220,
            height: 2,
            borderRadius: 999,
            background: `linear-gradient(90deg, rgba(255,255,255,0), ${accentColor}, rgba(255,255,255,0))`,
            opacity: actionProgress,
          }}
        />
        <div
          style={{
            marginTop: 24,
            fontSize: 24,
            fontWeight: 700,
            color: accentColor,
            letterSpacing: 1.2,
            opacity: actionProgress,
            transform: `translateY(${interpolate(actionProgress, [0, 1], [16, 0])}px)`,
          }}
        >
          {ctaText}
        </div>
      </div>
    </AbsoluteFill>
  );
};
