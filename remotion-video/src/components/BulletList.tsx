import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {POSTER_HERO_TOP, POSTER_SIDE_PADDING} from '../render/layoutRhythm';

interface BulletListProps {
  title?: string;
  points: string[];
  iconType?: 'check' | 'arrow' | 'number' | 'dot';
  bgColor?: string;
  accentColor?: string;
}

const getPrefix = (iconType: BulletListProps['iconType'], index: number) => {
  switch (iconType) {
    case 'check':
      return '✓';
    case 'arrow':
      return '→';
    case 'dot':
      return '•';
    case 'number':
    default:
      return `0${index + 1}`;
  }
};

export const BulletList: React.FC<BulletListProps> = ({
  title,
  points,
  iconType = 'check',
  bgColor = '#0D0D1A',
  accentColor = '#FF6B35',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}14 0%, transparent 28%)`,
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
          top: POSTER_HERO_TOP,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {title ? (
          <div
            style={{
              maxWidth: 860,
              fontSize: 66,
              fontWeight: 820,
              color: '#f5f9ff',
              lineHeight: 1.06,
              letterSpacing: -1.8,
              opacity: interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'}),
            }}
          >
            {title}
          </div>
        ) : null}

        <div
          style={{
            marginTop: title ? 34 : 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          {points.map((point, index) => {
            const progress = interpolate(frame, [10 + index * 6, 28 + index * 6], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={point}
                style={{
                  display: 'grid',
                  gridTemplateColumns: iconType === 'number' ? '88px 1fr' : '52px 1fr',
                  columnGap: 22,
                  alignItems: 'start',
                  textAlign: 'left',
                  opacity: progress,
                  transform: `translateY(${interpolate(progress, [0, 1], [18, 0])}px)`,
                }}
              >
                <div
                  style={{
                    color: accentColor,
                    fontSize: iconType === 'number' ? 42 : 28,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: iconType === 'number' ? -1.2 : 0,
                    paddingTop: 2,
                  }}
                >
                  {getPrefix(iconType, index)}
                </div>
                <div
                  style={{
                    color: '#f0f6ff',
                    fontSize: 32,
                    fontWeight: 520,
                    lineHeight: 1.42,
                  }}
                >
                  {point}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
