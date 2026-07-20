/**
 * SwissList — Swiss 极简编号清单
 *
 * 左半：巨大数字（如 37）+ 单位说明（"条反模式"）
 * 右半：编号清单竖排（如 8 个类别 / 条目标题逐条入场）
 * 用于「Impeccable 37 条规则 / 8 个类别」「禁用 inter / 紫渐 / 居中堆叠」等 cut。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissListProps {
  items: Array<string | {code: string; label: string}>;
  heading?: string;
  bigNumber?: string;   // 如 "37"
  bigLabel?: string;    // 如 "条反模式规则"
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissList: React.FC<SwissListProps> = ({
  items,
  heading,
  bigNumber,
  bigLabel,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();
  const list = items ?? [];

  const headR = spring({fps: 30, frame: Math.max(0, frame - 0), config: swissSpring});
  const bigR = spring({fps: 30, frame: Math.max(0, frame - 6), config: swissSpring});

  const renderItem = (item: string | {code: string; label: string}, i: number) => {
    const itemR = spring({fps: 30, frame: Math.max(0, frame - 14 - i * 5), config: swissSpring});
    const op = interpolate(itemR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const x = interpolate(itemR, [0, 1], [-20, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    if (typeof item === 'string') {
      return (
        <li key={i} style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
          padding: '14px 0',
          borderBottom: `1px solid ${swissColor.ruleSoft}`,
          opacity: op,
          transform: `translateX(${x}px)`,
        }}>
          <span style={{
            fontFamily: swissFont.numeric,
            fontSize: swissType.body,
            fontWeight: 700,
            color: swissColor.red,
            minWidth: 64,
            letterSpacing: 1,
          }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{
            fontFamily: swissFont.sans,
            fontSize: swissType.body,
            fontWeight: 500,
            color: swissColor.ink,
            lineHeight: 1.35,
          }}>
            {item}
          </span>
        </li>
      );
    }
    // {code, label} 格式：给禁令清单用，code 是 R1/R2 编号
    return (
      <li key={i} style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 24,
        padding: '14px 0',
        borderBottom: `1px solid ${swissColor.ruleSoft}`,
        opacity: op,
        transform: `translateX(${x}px)`,
      }}>
        <span style={{
          fontFamily: swissFont.numeric,
          fontSize: swissType.body,
          fontWeight: 700,
          color: swissColor.red,
          minWidth: 64,
          letterSpacing: 1,
        }}>
          {item.code}
        </span>
        <span style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.body,
          fontWeight: 500,
          color: swissColor.ink,
          lineHeight: 1.35,
          textDecoration: 'line-through',
          textDecorationColor: swissColor.red,
          textDecorationThickness: 2,
        }}>
          {item.label}
        </span>
      </li>
    );
  };

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

      <div style={{display: 'flex', gap: swissLayout.gridGutter * 2, alignItems: 'flex-start'}}>
        {/* 左半：巨大数字 */}
        {bigNumber && (
          <div style={{
            flex: '0 0 420px',
            opacity: interpolate(bigR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            transform: `scale(${interpolate(bigR, [0, 1], [0.9, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
            transformOrigin: 'left',
          }}>
            <div style={{
              fontFamily: swissFont.numeric,
              fontSize: swissType.mega,
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: -6,
              color: swissColor.ink,
            }}>
              {bigNumber}
            </div>
            {bigLabel && (
              <div style={{
                fontFamily: swissFont.sans,
                fontSize: swissType.subhead,
                fontWeight: 700,
                letterSpacing: 2,
                color: swissColor.red,
                marginTop: 16,
                textTransform: 'uppercase',
              }}>
                {bigLabel}
              </div>
            )}
          </div>
        )}

        {/* 右半：编号清单 */}
        <ul style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          flex: 1,
          maxWidth: 900,
        }}>
          {list.map(renderItem)}
        </ul>
      </div>
    </SwissFrame>
  );
};
