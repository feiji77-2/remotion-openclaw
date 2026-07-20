/**
 * SwissTitle — Swiss 极简大标题开场
 *
 * 左对齐粗网格、kicker 在上、大字主张、副标题在下、瑞士红 accent 短线压在大字左缘。
 * 刻意左对齐非居中，刻意白底非渐变。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissTitleProps {
  title: string;
  kicker?: string;
  subtitle?: string;
  caption?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissTitle: React.FC<SwissTitleProps> = ({
  title,
  kicker,
  subtitle,
  caption,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();

  // 逐层入场：kicker → 红线 → title → subtitle
  const kickerR = spring({fps: 30, frame: Math.max(0, frame - 0), config: swissSpring});
  const lineR = spring({fps: 30, frame: Math.max(0, frame - 6), config: swissSpring});
  const titleR = spring({fps: 30, frame: Math.max(0, frame - 10), config: swissSpring});
  const subR = spring({fps: 30, frame: Math.max(0, frame - 22), config: swissSpring});

  const titleText = title ?? '';
  // 大字自适应：超长就缩号
  const titleSize = titleText.length > 20 ? swissType.heading : swissType.headline;

  return (
    <SwissFrame index={index} total={total} chapter={chapter} source={source} id="SWISS · ANTI-AVERAGE">
      {/* kicker */}
      {kicker && (
        <div style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.kicker,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: swissColor.red,
          marginBottom: 28,
          marginLeft: 8,
          opacity: interpolate(kickerR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {kicker}
        </div>
      )}

      {/* 瑞士红短 accent 线，压在大字左缘上方 */}
      <div style={{
        width: 96,
        height: 6,
        background: swissColor.red,
        marginBottom: 24,
        marginLeft: 8,
        transform: `scaleX(${interpolate(lineR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
        transformOrigin: 'left',
      }} />

      {/* 大字主张 */}
      <h1 style={{
        fontFamily: swissFont.sans,
        fontSize: titleSize,
        fontWeight: 700,
        lineHeight: 1.08,
        letterSpacing: -2,
        color: swissColor.ink,
        margin: 0,
        maxWidth: 1500,
        opacity: interpolate(titleR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        transform: `translateY(${interpolate(titleR, [0, 1], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
      }}>
        {titleText}
      </h1>

      {/* 副标题 */}
      {subtitle && (
        <p style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.bodyLead,
          fontWeight: 400,
          lineHeight: 1.5,
          color: swissColor.inkSoft,
          margin: `${swissLayout.rowGap}px 0 0 8px`,
          maxWidth: 1200,
          opacity: interpolate(subR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {subtitle}
        </p>
      )}

      {/* 图注（可选，贴底栏上方） */}
      {caption && (
        <p style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.caption,
          fontWeight: 400,
          color: swissColor.inkMute,
          margin: `${swissLayout.rowGap}px 0 0 8px`,
          maxWidth: 1200,
          opacity: interpolate(subR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {caption}
        </p>
      )}
    </SwissFrame>
  );
};
