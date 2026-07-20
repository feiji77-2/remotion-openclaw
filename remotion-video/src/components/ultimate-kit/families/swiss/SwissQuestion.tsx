/**
 * SwissQuestion — Swiss 极简提问钩子
 *
 * 顶部大字提问（左对齐），下方一行被一条红色删除线划掉的"AI 平均审美反面教材"
 * (如「紫色渐变 · 居中堆叠 · 毛玻璃」)，把口播「这些是 AI 默认的平均审美」视觉化。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissQuestionProps {
  question: string;
  crossedOut?: string; // 被划掉的"反面"，如「紫色渐变 居中堆叠 毛玻璃」
  caption?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissQuestion: React.FC<SwissQuestionProps> = ({
  question,
  crossedOut,
  caption,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();

  const qR = spring({fps: 30, frame: Math.max(0, frame - 4), config: swissSpring});
  const lineR = spring({fps: 30, frame: Math.max(0, frame - 20), config: swissSpring});
  const capR = spring({fps: 30, frame: Math.max(0, frame - 30), config: swissSpring});

  const qText = question ?? '';
  const qSize = qText.length > 24 ? swissType.heading : swissType.headline;

  return (
    <SwissFrame index={index} total={total} chapter={chapter} source={source}>
      <h1 style={{
        fontFamily: swissFont.sans,
        fontSize: qSize,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: -2,
        color: swissColor.ink,
        margin: 0,
        maxWidth: 1600,
        opacity: interpolate(qR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        transform: `translateY(${interpolate(qR, [0, 1], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
      }}>
        {qText}
      </h1>

      {/* 被划掉的反面教材：强调"这就是平均审美" */}
      {crossedOut && (
        <div style={{
          marginTop: swissLayout.rowGap + 16,
          fontFamily: swissFont.sans,
          fontSize: swissType.subhead,
          fontWeight: 700,
          color: swissColor.inkSoft,
          position: 'relative',
          display: 'inline-block',
          alignSelf: 'flex-start',
          opacity: interpolate(lineR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {/* 红色删除线：width 随入场增长，把整行划穿 */}
          <span style={{position: 'relative', zIndex: 1}}>
            <span style={{display: 'inline-block', padding: '4px 0'}}>
              {crossedOut}
            </span>
            <span style={{
              position: 'absolute',
              left: 0,
              top: '52%',
              height: 4,
              width: `${interpolate(lineR, [0, 1], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%`,
              background: swissColor.red,
              transform: 'translateY(-50%)',
            }} />
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
          maxWidth: 1200,
          opacity: interpolate(capR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          {caption}
        </p>
      )}
    </SwissFrame>
  );
};
