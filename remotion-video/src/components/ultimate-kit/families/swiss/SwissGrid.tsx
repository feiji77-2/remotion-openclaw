/**
 * SwissGrid — Swiss 极简 N 格 tile 网格
 *
 * 等分 tile 网格(2 / 3 / 4 列自适应),每格:小编号 + 大标题 + 可选说明。
 * 支持高亮一格(highlightIndex)——被锚定的那个方向/品牌用瑞士红边框 + 红角标。
 *
 * 用于:
 *   C7 六种审美方向 (Swiss/BAL list/Nordic/Ne样赛博...) — 高亮 Swiss
 *   C11 161/67/57/99 四统计
 *   C14 Stripe/Linear/Versa/Recast 四品牌 tile
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissTile {
  code: string;    // 如 "01" / "Stripe"
  label: string;  // 主标题
  detail?: string; // 副说明
}

interface SwissGridProps {
  tiles: SwissTile[];
  heading?: string;
  /** 高亮第几格(base 0),被锚定格画红边框 + 红角标。 */
  highlightIndex?: number;
  /** 自定义列数;缺省按 tile 数决定(2→2,3→3,4→2,5/6→3)。 */
  columns?: number;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissGrid: React.FC<SwissGridProps> = ({
  tiles,
  heading,
  highlightIndex,
  columns,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();
  const list = tiles ?? [];

  const headR = spring({fps: 30, frame: Math.max(0, frame - 0), config: swissSpring});

  // 自适应列数
  const cols = columns ?? (list.length <= 2 ? list.length : list.length <= 4 ? 2 : 3);

  return (
    <SwissFrame index={index} total={total} chapter={chapter} source={source}>
      {heading && (
        <div style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.heading,
          fontWeight: 700,
          letterSpacing: -1,
          color: swissColor.ink,
          marginBottom: swissLayout.rowGap,
          opacity: interpolate(headR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(headR, [0, 1], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          {heading}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 0,
        border: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
        maxWidth: 1680,
      }}>
        {list.map((tile, i) => {
          const tileR = spring({fps: 30, frame: Math.max(0, frame - 10 - i * 4), config: swissSpring});
          const op = interpolate(tileR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const isHi = highlightIndex !== undefined && i === highlightIndex;

          return (
            <div key={i} style={{
              position: 'relative',
              padding: '36px 32px',
              minHeight: 240,
              borderRight: (i + 1) % cols !== 0 ? `1px solid ${swissColor.rule}` : 'none',
              borderBottom: i < list.length - cols ? `1px solid ${swissColor.rule}` : 'none',
              background: isHi ? swissColor.redSoft : swissColor.white,
              boxSizing: 'border-box',
              opacity: op,
              transform: `translateY(${interpolate(tileR, [0, 1], [18, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
            }}>
              {/* 高亮角标 — 被锚定 */}
              {isHi && (
                <span style={{
                  position: 'absolute', top: 14, right: 16,
                  fontFamily: swissFont.sans, fontSize: 16, fontWeight: 700,
                  color: swissColor.red, letterSpacing: 2,
                }}>
                  ✓ ANCHORED
                </span>
              )}
              <span style={{
                fontFamily: swissFont.numeric,
                fontSize: swissType.kicker, fontWeight: 700,
                color: isHi ? swissColor.red : swissColor.inkMute,
                letterSpacing: 3,
              }}>
                {tile.code}
              </span>
              <div style={{
                fontFamily: swissFont.sans,
                fontSize: swissType.subhead, fontWeight: 700,
                color: swissColor.ink,
                marginTop: 18,
                lineHeight: 1.15,
                letterSpacing: -0.5,
              }}>
                {tile.label}
              </div>
              {tile.detail && (
                <div style={{
                  fontFamily: swissFont.sans,
                  fontSize: swissType.caption, fontWeight: 400,
                  color: swissColor.inkSoft,
                  marginTop: 12,
                  lineHeight: 1.4,
                  maxWidth: 360,
                }}>
                  {tile.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SwissFrame>
  );
};
