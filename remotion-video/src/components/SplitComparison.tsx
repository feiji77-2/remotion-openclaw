import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {POSTER_COMPARE_DIVIDER_BOTTOM, POSTER_COMPARE_DIVIDER_TOP} from '../render/layoutRhythm';

interface SplitComparisonProps {
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
  leftColor?: string;
  rightColor?: string;
  bgColor?: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const Column: React.FC<{
  title: string;
  items: string[];
  color: string;
  align: 'left' | 'right';
  frame: number;
}> = ({title, items, color, align, frame}) => {
  const columnProgress = clamp01(frame / 22);
  const xStart = align === 'left' ? -26 : 26;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        textAlign: align,
        paddingLeft: align === 'left' ? 84 : 56,
        paddingRight: align === 'right' ? 84 : 56,
        opacity: columnProgress,
        transform: `translateX(${interpolate(columnProgress, [0, 1], [xStart, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${align === 'left' ? color : 'rgba(255,255,255,0)'}, ${
            align === 'left' ? 'rgba(255,255,255,0)' : color
          })`,
          alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
        }}
      />
      <div
        style={{
          marginTop: 20,
          fontSize: 62,
          fontWeight: 820,
          color,
          lineHeight: 1,
          letterSpacing: -1.8,
          maxWidth: 360,
          textShadow: `0 0 24px ${color}22`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 34,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          maxWidth: 360,
        }}
      >
        {items.map((item, index) => {
          const itemProgress = clamp01((frame - 10 - index * 4) / 16);
          return (
            <div
              key={item}
              style={{
                opacity: itemProgress,
                transform: `translateX(${interpolate(itemProgress, [0, 1], [align === 'left' ? -18 : 18, 0])}px)`,
                color: 'rgba(244,248,255,0.86)',
                fontSize: 28,
                fontWeight: 520,
                lineHeight: 1.35,
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SplitComparison: React.FC<SplitComparisonProps> = ({
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
  leftColor = '#FF4444',
  rightColor = '#00FF88',
  bgColor = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();
  const dividerProgress = clamp01((frame - 6) / 20);

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 18% 50%, ${leftColor}12 0%, transparent 28%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 82% 50%, ${rightColor}12 0%, transparent 28%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: POSTER_COMPARE_DIVIDER_TOP,
          bottom: POSTER_COMPARE_DIVIDER_BOTTOM,
          left: '50%',
          width: 1,
          background: `linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,0))`,
          opacity: dividerProgress,
          transform: `translateX(-0.5px) scaleY(${interpolate(dividerProgress, [0, 1], [0.4, 1])})`,
          transformOrigin: 'center top',
        }}
      />

      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'stretch',
        }}
      >
        <Column title={leftTitle} items={leftItems} color={leftColor} align="left" frame={frame} />
        <Column title={rightTitle} items={rightItems} color={rightColor} align="right" frame={frame} />
      </div>
    </AbsoluteFill>
  );
};
