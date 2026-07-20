/**
 * SwissTabular — Swiss 极简设计系统 token 表
 *
 * 左对齐表格:每行 = 一个设计系统维度(如 Color / Type / Space / A11y),
 * 行内:标号 + 维度名 + 一组 token 值(token 值用瑞士红强调关键色)。
 * 用于「告诉他你在做什么产品,直接给你一整套设计系统」这句口播。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissTabularRow {
  code: string;     // 如 "01"
  dimension: string; // 如 "COLOR"
  tokens: string[];  // 如 ["#0a0a0a", "#fafafa", "#d63232"]
}

interface SwissTabularProps {
  rows: SwissTabularRow[];
  heading?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

const ColorSwatch: React.FC<{token: string}> = ({token}) => {
  // 如果 token 像 hex 色,画一个小方块 + hex 串
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(token);
  if (!isHex) {
    return <span style={{fontFamily: swissFont.sans, fontSize: swissType.caption, color: swissColor.ink}}>{token}</span>;
  }
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 10}}>
      <span style={{display: 'inline-block', width: 22, height: 22, background: token, border: `1px solid ${swissColor.rule}`}} />
      <span style={{fontFamily: swissFont.numeric, fontSize: swissType.caption, color: swissColor.ink, letterSpacing: 0.5}}>{token}</span>
    </span>
  );
};

export const SwissTabular: React.FC<SwissTabularProps> = ({
  rows,
  heading,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();
  const list = rows ?? [];

  const headR = spring({fps: 30, frame: Math.max(0, frame - 0), config: swissSpring});

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
        width: '100%',
        maxWidth: 1680,
        borderTop: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
      }}>
        {/* 表头 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 220px 1fr',
          padding: '14px 0',
          borderBottom: `1px solid ${swissColor.rule}`,
          fontFamily: swissFont.sans,
          fontSize: swissType.kicker, fontWeight: 700,
          letterSpacing: 3, color: swissColor.inkMute,
          textTransform: 'uppercase',
        }}>
          <span>NO.</span>
          <span>DIMENSION</span>
          <span>TOKENS</span>
        </div>

        {list.map((row, i) => {
          const rowR = spring({fps: 30, frame: Math.max(0, frame - 10 - i * 8), config: swissSpring});
          const op = interpolate(rowR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '80px 220px 1fr',
              padding: '22px 0',
              borderBottom: i < list.length - 1 ? `1px solid ${swissColor.ruleSoft}` : 'none',
              alignItems: 'center',
              opacity: op,
              transform: `translateX(${interpolate(rowR, [0, 1], [-16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
            }}>
              <span style={{
                fontFamily: swissFont.numeric, fontSize: swissType.body, fontWeight: 700,
                color: swissColor.red, letterSpacing: 1,
              }}>{row.code}</span>
              <span style={{
                fontFamily: swissFont.sans, fontSize: swissType.subhead, fontWeight: 700,
                color: swissColor.ink, letterSpacing: -0.5,
              }}>{row.dimension}</span>
              <span style={{display: 'flex', flexWrap: 'wrap', gap: '12px 28px', alignItems: 'center'}}>
                {row.tokens.map((t, j) => <ColorSwatch key={j} token={t} />)}
              </span>
            </div>
          );
        })}
      </div>
    </SwissFrame>
  );
};
