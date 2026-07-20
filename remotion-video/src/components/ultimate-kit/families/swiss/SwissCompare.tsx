/**
 * SwissCompare — Swiss 极简 before/after 对比
 *
 * 口播反复出现的「左边装上 skill / 右边默认 AI」核心版式。
 * 左栏 = 程序化绘制的「AI 默认平均审美」反面教材小窗：
 *        紫色渐变 + 居中堆叠 + 毛玻璃卡片（这里只是"被点名的反模式"示意，
 *        由本组件用 inline 样式画出，不依赖任何外部素材，无版权风险）。
 * 右栏 = 真正的 Swiss 出品（白底、左对齐、粗网格、克制红 accent）。
 *
 * 两栏共享同一标题栏「同一段提示词」，强化「同样的提示词，完全不同的结果」。
 * 右栏顶部贴「✓ ANCHORED」红标，左栏顶部贴「✕ DEFAULT」灰标。
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SwissFrame} from './SwissFrame';
import {swissColor, swissFont, swissType, swissSpring, swissLayout} from './SwissTokens';

interface SwissCompareSide {
  /** 顶部标签，如 "默认 AI 输出" / "装上 skill" */
  tag?: string;
  /** 卡片内显示的主张短句 */
  claim?: string;
  /** 一组特征 bullet（左栏是反模式名，右栏是反模式即"已禁用"） */
  bullets?: string[];
  /** 决定此侧渲染哪个 mock：'default-ai' 画紫色渐变居中堆叠毛玻璃反面教材；
   *  'swiss-anchored' 画白底左对齐粗网格 Swiss 出品。 */
  mock: 'default-ai' | 'swiss-anchored';
}

interface SwissCompareProps {
  left?: SwissCompareSide;
  right?: SwissCompareSide;
  heading?: string;
  /** 共享提示词（画在两栏之上，居中横跨） */
  sharedPrompt?: string;
  index?: string;
  total?: number;
  chapter?: string;
  source?: string;
}

/**
 * 左栏反面教材：刻意画出"AI 平均审美"特征 — 紫色渐变、居中堆叠、毛玻璃圆角卡片。
 * 这正是口播点名的反模式。由 inline style 程序化生成，无任何外部素材。
 */
const DefaultAiMock: React.FC<{claim?: string; bullets?: string[]}> = ({claim, bullets}) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 460,
      borderRadius: 18,
      // 紫色渐变 — 故意点名
      background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 45%, #c4b5fd 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      // 毛玻璃圆角卡片 — 故意点名
      backdropFilter: 'blur(14px)',
      boxShadow: '0 12px 40px rgba(120, 80, 220, 0.35)',
      overflow: 'hidden',
      padding: 36,
    }}>
      {/* 模拟一个居中堆叠的 glassy 标题 + 圆角按钮 */}
      <div style={{
        background: 'rgba(255,255,255,0.22)',
        borderRadius: 14,
        padding: '16px 28px',
        backdropFilter: 'blur(8px)',
        width: '70%',
        textAlign: 'center',
        fontFamily: swissFont.sans,
        fontSize: 30,
        fontWeight: 700,
        color: '#ffffff',
        textShadow: '0 1px 6px rgba(80,40,180,0.4)',
      }}>
        {claim ?? '默认 AI 输出'}
      </div>
      {(bullets ?? []).map((b, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.16)',
          borderRadius: 999,
          padding: '8px 18px',
          backdropFilter: 'blur(6px)',
          fontFamily: swissFont.sans,
          fontSize: 20,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.92)',
        }}>
          {b}
        </div>
      ))}
      <div style={{
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 999,
        padding: '12px 32px',
        fontFamily: swissFont.sans,
        fontSize: 22,
        fontWeight: 700,
        color: '#7c3aed',
        marginTop: 4,
      }}>
        Get Started
      </div>
    </div>
  );
};

/**
 * 右栏正面：真正的 Swiss 出品 — 白底、左对齐、粗网格、克制红 accent。
 * 与左栏形成「同一提示词，完全不同结果」的视觉判决。
 */
const SwissAnchoredMock: React.FC<{claim?: string; bullets?: string[]}> = ({claim, bullets}) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 460,
      background: swissColor.white,
      border: `${swissLayout.ruleThickness}px solid ${swissColor.rule}`,
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
    }}>
      {/* 内部粗网格淡底 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          `linear-gradient(${swissColor.ruleSoft} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${swissColor.ruleSoft} 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: '32px 32px',
        opacity: 0.6,
      }} />
      {/* 顶部 kicker */}
      <div style={{
        fontFamily: swissFont.sans,
        fontSize: 18, fontWeight: 700, letterSpacing: 3,
        color: swissColor.red, textTransform: 'uppercase',
        position: 'relative', zIndex: 1,
      }}>
        SWISS / ANCHORED
      </div>
      {/* 左对齐大字主张 */}
      <div style={{
        fontFamily: swissFont.sans,
        fontSize: 38, fontWeight: 700, lineHeight: 1.1,
        letterSpacing: -1, color: swissColor.ink,
        maxWidth: '78%', margin: '12px 0',
        position: 'relative', zIndex: 1,
      }}>
        {claim ?? '装上 skill · Swiss 出图'}
      </div>
      {/* feature 行：左对齐，黑白分明，无圆角毛玻璃 */}
      <div style={{position: 'relative', zIndex: 1}}>
        {(bullets ?? []).map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', gap: 16,
            padding: '10px 0',
            borderTop: `1px solid ${swissColor.rule}`,
            fontFamily: swissFont.sans,
            fontSize: 20, fontWeight: 500, color: swissColor.ink,
          }}>
            <span style={{
              fontFamily: swissFont.numeric, fontWeight: 700,
              color: swissColor.red, minWidth: 36,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {b}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SwissCompare: React.FC<SwissCompareProps> = ({
  left,
  right,
  heading,
  sharedPrompt,
  index = '01',
  total = 16,
  chapter,
  source,
}) => {
  const frame = useCurrentFrame();

  const headR = spring({fps: 30, frame: Math.max(0, frame - 0), config: swissSpring});
  const promptR = spring({fps: 30, frame: Math.max(0, frame - 8), config: swissSpring});
  const leftR = spring({fps: 30, frame: Math.max(0, frame - 16), config: swissSpring});
  const rightR = spring({fps: 30, frame: Math.max(0, frame - 24), config: swissSpring});

  const renderMock = (side: SwissCompareSide) => {
    if (side.mock === 'default-ai') {
      return <DefaultAiMock claim={side.claim} bullets={side.bullets} />;
    }
    return <SwissAnchoredMock claim={side.claim} bullets={side.bullets} />;
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
          marginBottom: 12,
          opacity: interpolate(headR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(headR, [0, 1], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          {heading}
        </div>
      )}

      {/* 共享提示词横条 — "同一段提示词" */}
      {sharedPrompt && (
        <div style={{
          fontFamily: swissFont.sans,
          fontSize: swissType.body,
          fontWeight: 500,
          color: swissColor.inkSoft,
          marginBottom: 32,
          padding: '14px 0',
          borderTop: `1px solid ${swissColor.rule}`,
          borderBottom: `1px solid ${swissColor.rule}`,
          display: 'flex', gap: 16, alignItems: 'baseline',
          opacity: interpolate(promptR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}>
          <span style={{fontSize: swissType.kicker, fontWeight: 700, color: swissColor.red, letterSpacing: 3}}>
            PROMPT →
          </span>
          <span style={{fontFamily: swissFont.sans, fontStyle: 'italic', fontWeight: 400}}>
            「{sharedPrompt}」
          </span>
        </div>
      )}

      <div style={{display: 'flex', gap: swissLayout.gridGutter, alignItems: 'stretch'}}>

        {/* 左栏 — 默认 AI */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: 16,
          opacity: interpolate(leftR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(leftR, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: swissFont.sans, fontSize: swissType.kicker, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', color: swissColor.inkMute,
          }}>
            <span style={{
              display: 'inline-block', width: 22, height: 22, borderRadius: 999,
              border: `2px solid ${swissColor.inkMute}`, textAlign: 'center', lineHeight: '18px',
              fontSize: 14, color: swissColor.inkMute, fontWeight: 700,
            }}>✕</span>
            {left?.tag ?? 'DEFAULT · 无 skill'}
          </div>
          {renderMock(left ?? {mock: 'default-ai'})}
        </div>

        {/* 右栏 — Swiss 出品 */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: 16,
          opacity: interpolate(rightR, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(rightR, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: swissFont.sans, fontSize: swissType.kicker, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', color: swissColor.red,
          }}>
            <span style={{
              display: 'inline-block', width: 22, height: 22, borderRadius: 999,
              background: swissColor.red, color: swissColor.white, textAlign: 'center',
              lineHeight: '20px', fontSize: 14, fontWeight: 700,
            }}>✓</span>
            {right?.tag ?? 'ANCHORED · 装 swiss-skill'}
          </div>
          {renderMock(right ?? {mock: 'swiss-anchored'})}
        </div>
      </div>
    </SwissFrame>
  );
};
