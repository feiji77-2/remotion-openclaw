/**
 * SwissNumber — Swiss 极简巨大数字强调
 *
 * 一个巨大数字左对齐压住画布，下接单位与说明（瑞士红 accent 标签）。
 * 用于「22000 star」「161 / 67 / 57 / 99」「68 个品牌」这类数据 punch。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissNumberProps {
  number: string;   // 如 "22,000" — 字符串以确保千分位展示
  unit?: string;    // 如 "★ GitHub star"
  caption?: string; // 如 "...是 AI 辅助设计弊装第一个。"
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissNumber: React.FC<SwissNumberProps> = ({
  number,
  unit,
  caption,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();
  const numR = spring({fps: 30, frame: Math.max(0, frame - 4), config: swissSpring});
  const unitR = spring({fps: 30, frame: Math.max(0, frame - 14), config: swissSpring});
  const capR = spring({fps: 30, frame: Math.max(0, frame - 22), config: swissSpring});

  // 巨大字按位数自适应
  const len = (number ?? '').length;
  const numSize = len <= 4 ? 240 : len <= 6 ? 200 : len <= 8 ? 160 : 128;

  return (
    <SwissFrame index={index} total={total} chapter={chapter} source={source}>
      <div style={{
        fontFamily: swissFont.numeric,
        fontSize: numSize,
        fontWeight: 700,
        lineHeight: 0.9,
        letterSpacing: -8,
        color: swissColor.ink,
        opacity: interpolate(numR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        transform: `scale(${interpolate(numR, [0, 1], [0.92, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
        transformOrigin: 'left center',
      }}>
        {number}
      </div>

      {/* 红线 + 单位 */}
      {unit && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18,
          marginTop: 28,
          opacity: interpolate(unitR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateX(${interpolate(unitR, [0, 1], [-20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          <div style={{width: 72, height: 6, background: swissColor.red}} />
          <span style={{
            fontFamily: swissFont.sans,
            fontSize: swissType.subhead,
            fontWeight: 700,
            letterSpacing: 3,
            color: swissColor.red,
            textTransform: 'uppercase',
          }}>
            {unit}
          </span>
        </div>
      )}

      {caption && (
        <p style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.bodyLead,
          fontWeight: 400,
          lineHeight: 1.5,
          color: swissColor.inkSoft,
          margin: `${swissLayout.rowGap}px 0 0`,
          maxWidth: 1100,
          opacity: interpolate(capR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {caption}
        </p>
      )}
    </SwissFrame>
  );
};
