/**
 * SwissFlow — Swiss 极简水平流程示意
 *
 * 左→右排列的阶段卡片,阶段间一根细线 + 箭头。
 * 用于「锚定 → 稳定输出」「加载模板 → 组件自带规则」这类流程 cut。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissFlowStep {
  label: string;
  detail?: string;
}

interface SwissFlowProps {
  steps: SwissFlowStep[];
  heading?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

export const SwissFlow: React.FC<SwissFlowProps> = ({
  steps,
  heading,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();
  const list = steps ?? [];

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
          marginBottom: swissLayout.rowGap + 12,
          opacity: interpolate(headR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(headR, [0, 1], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          {heading}
        </div>
      )}

      <div style={{
        width: '100%',
        maxWidth: 1680,
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
      }}>
        {list.map((step, i) => {
          const stepR = spring({fps: 30, frame: Math.max(0, frame - 10 - i * 10), config: swissSpring});
          const op = interpolate(stepR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x = interpolate(stepR, [0, 1], [-24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <React.Fragment key={i}>
              <div style={{
                flex: 1,
                padding: '32px 28px',
                background: swissColor.white,
                border: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
                minHeight: 260,
                display: 'flex', flexDirection: 'column',
                opacity: op, transform: `translateX(${x}px)`,
              }}>
                <span style={{
                  fontFamily: swissFont.numeric,
                  fontSize: swissType.subhead, fontWeight: 700,
                  color: swissColor.red, letterSpacing: 2,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{
                  fontFamily: swissFont.sans,
                  fontSize: swissType.subhead, fontWeight: 700,
                  color: swissColor.ink,
                  marginTop: 18, lineHeight: 1.15, letterSpacing: -0.5,
                }}>
                  {step.label}
                </div>
                {step.detail && (
                  <div style={{
                    fontFamily: swissFont.sans,
                    fontSize: swissType.caption, fontWeight: 400,
                    color: swissColor.inkSoft,
                    marginTop: 14, lineHeight: 1.4, maxWidth: 280,
                  }}>
                    {step.detail}
                  </div>
                )}
              </div>
              {/* 阶段间连接线 + 箭头(非末步) */}
              {i < list.length - 1 && (
                <div key={`line-${i}`} style={{
                  flex: '0 0 60px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: op,
                }}>
                  <div style={{width: '100%', height: 2, background: swissColor.rule, position: 'relative'}}>
                    <div style={{
                      position: 'absolute', right: -2, top: -5,
                      width: 0, height: 0,
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      borderLeft: `8px solid ${swissColor.rule}`,
                    }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </SwissFrame>
  );
};
