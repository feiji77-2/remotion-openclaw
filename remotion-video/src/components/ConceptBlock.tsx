import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame} from 'remotion';
import {POSTER_HERO_TOP_LOWER, POSTER_SIDE_PADDING} from '../render/layoutRhythm';

interface ConceptBlockProps {
  title: string;
  body: string;
  highlight?: string;
  accentColor?: string;
  bgColor?: string;
}

export const ConceptBlock: React.FC<ConceptBlockProps> = ({
  title,
  body,
  highlight,
  accentColor = '#FF6B35',
  bgColor = '#0D0D1A',
}) => {
  const frame = useCurrentFrame();
  const intro = spring({fps: 30, frame, config: {damping: 170, stiffness: 90}});
  const bodyIntro = spring({fps: 30, frame: Math.max(0, frame - 10), config: {damping: 180, stiffness: 84}});
  const accentIntro = spring({fps: 30, frame: Math.max(0, frame - 18), config: {damping: 180, stiffness: 92}});

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 48%, ${accentColor}18 0%, transparent 30%)`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 76%, ${accentColor}0d 0%, transparent 24%)`,
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
          transform: `translateY(${interpolate(intro, [0, 1], [32, 0])}px)`,
          opacity: interpolate(intro, [0, 0.25, 1], [0, 0.45, 1]),
        }}
      >
        {highlight ? (
          <div
            style={{
              marginBottom: 18,
              color: accentColor,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1.6,
              opacity: accentIntro,
            }}
          >
            {highlight}
          </div>
        ) : null}

        <div
          style={{
            maxWidth: 860,
            fontSize: 70,
            fontWeight: 820,
            color: '#F5F9FF',
            lineHeight: 1.06,
            letterSpacing: -2,
            textWrap: 'balance',
            textShadow: '0 0 28px rgba(255,255,255,0.08)',
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 28,
            maxWidth: 820,
            fontSize: 30,
            lineHeight: 1.55,
            color: 'rgba(235,242,255,0.84)',
            opacity: interpolate(bodyIntro, [0, 0.2, 1], [0, 0.4, 1]),
            transform: `translateY(${interpolate(bodyIntro, [0, 1], [20, 0])}px)`,
          }}
        >
          {body}
        </div>

        <div
          style={{
            marginTop: 34,
            width: 180,
            height: 2,
            borderRadius: 999,
            background: `linear-gradient(90deg, rgba(255,255,255,0), ${accentColor}, rgba(255,255,255,0))`,
            opacity: accentIntro,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
