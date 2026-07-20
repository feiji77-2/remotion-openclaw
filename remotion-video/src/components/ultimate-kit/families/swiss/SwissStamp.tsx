/**
 * SwissStamp — Swiss 极简印章式收尾
 *
 * 终幕:大字主张「装对 skill · AI 才有立场」压住画布左对齐,
 * 右下角一枚红色边框"印章"(SWISS / ANCHORED 字样竖排),
 * 像一张瑞士平面海报的尾声落款。没有渐变、没有发光、没有毛玻璃。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissStampProps {
  headline: string;
  subhead?: string;
  /** 印章字,默认 "ANCHORED"。 */
  stamp?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissStamp: React.FC<SwissStampProps> = ({
  headline,
  subhead,
  stamp = 'ANCHORED',
  index = '16',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();

  const headR = spring({fps: 30, frame: Math.max(0, frame - 4), config: swissSpring});
  const subR = spring({fps: 30, frame: Math.max(0, frame - 14), config: swissSpring});
  const stampR = spring({fps: 30, frame: Math.max(0, frame - 24), config: swissSpring});

  const hText = headline ?? '';
  const hSize = hText.length > 12 ? swissType.headline : 128;

  return (
    <SwissFrame index={index} total={total} chapter={chapter} source={source}>
      {/* 顶部红线 */}
      <div style={{
        width: 120, height: 8, background: swissColor.red, marginBottom: 40,
        transform: `scaleX(${interpolate(headR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
        transformOrigin: 'left',
      }} />

      <h1 style={{
        fontFamily: swissFont.sans,
        fontSize: hSize,
        fontWeight: 700,
        lineHeight: 1.0,
        letterSpacing: -3,
        color: swissColor.ink,
        margin: 0,
        maxWidth: 1500,
        opacity: interpolate(headR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        transform: `translateY(${interpolate(headR, [0, 1], [28, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
      }}>
        {hText}
      </h1>

      {subhead && (
        <p style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.bodyLead,
          fontWeight: 400,
          lineHeight: 1.5,
          color: swissColor.inkSoft,
          margin: `${swissLayout.rowGap}px 0 0`,
          maxWidth: 1100,
          opacity: interpolate(subR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {subhead}
        </p>
      )}

      {/* 印章 — 右下角红框圆形/方形落款 */}
      <div style={{
        position: 'absolute',
        right: swissLayout.pageX + 40,
        bottom: swissLayout.pageY + 80,
        width: 200,
        height: 200,
        border: `4px solid ${swissColor.red}`,
        borderRadius: 999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8,
        transform: `rotate(${interpolate(stampR, [0, 1], [-30, -6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}deg) scale(${interpolate(stampR, [0, 1], [0.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
        opacity: interpolate(stampR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      }}>
        <div style={{
          fontFamily: swissFont.sans, fontSize: 18, fontWeight: 700,
          color: swissColor.red, letterSpacing: 4, textTransform: 'uppercase',
        }}>
          SWISS
        </div>
        <div style={{
          fontFamily: swissFont.sans, fontSize: 26, fontWeight: 700,
          color: swissColor.red, letterSpacing: 2, textTransform: 'uppercase',
        }}>
          {stamp}
        </div>
        <div style={{
          fontFamily: swissFont.numeric, fontSize: 14, fontWeight: 700,
          color: swissColor.red, letterSpacing: 3, marginTop: 4,
        }}>
          v · 1
        </div>
      </div>
    </SwissFrame>
  );
};
