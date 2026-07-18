/**
 * SpokenTitle — 口播标题（大字居中，逐字淡入）
 *
 * 纯黑背景 + 居中大标题 + 副标题淡入
 * 适配 spoken-title family：从 beat.headline 取标题文本
 */
import React from 'react';
import {SpokenCenterStage, SpokenHeadline, SpokenKicker, SpokenSubline, fitTitleSize, getAccentColor} from './SpokenVisualKit';

interface SpokenTitleProps {
  /** 主标题（取自 beat.headline） */
  title: string;
  /** 副标题（取自 cue.text 首句） */
  subtitle?: string;
  /** 标题下方的小字 */
  kicker?: string;
  accent?: string;
  grammar?: unknown;
}

const splitTitleForHeroNumber = (title: string) => {
  const shortDateMatch = title.match(/(\d{1,2}月\d{1,2}号?)/);
  if (shortDateMatch) {
    return {
      pre: title.slice(0, shortDateMatch.index).replace(/[，,。.\s]+$/u, ''),
      hero: shortDateMatch[1],
      post: title.slice((shortDateMatch.index ?? 0) + shortDateMatch[1].length).replace(/^[，,。.\s]+/u, ''),
    };
  }
  const modelMatch = title.match(/((?:GPT|OpenAI|Claude|Gemini|Cursor|Grok)[-‑]?\d*(?:\.\d+)?)/i);
  if (modelMatch) {
    return {
      pre: title.slice(0, modelMatch.index).replace(/[，,。.\s]+$/u, ''),
      hero: modelMatch[1],
      post: title.slice((modelMatch.index ?? 0) + modelMatch[1].length).replace(/^[，,。.\s]+/u, ''),
    };
  }
  const dateMatch = title.match(/(\d{4}[.年-]\d{1,2}[.月-]\d{1,2}号?)/);
  if (dateMatch) {
    return {
      pre: title.slice(0, dateMatch.index).replace(/[，,。.\s]+$/u, ''),
      hero: dateMatch[1],
      post: title.slice((dateMatch.index ?? 0) + dateMatch[1].length).replace(/^[，,。.\s]+/u, ''),
    };
  }
  const numericMatch = title.match(/([+-]?\d+(?:\.\d+)?%?)/);
  if (numericMatch) {
    return {
      pre: title.slice(0, numericMatch.index).replace(/[，,。.\s]+$/u, ''),
      hero: numericMatch[1],
      post: title.slice((numericMatch.index ?? 0) + numericMatch[1].length).replace(/^[，,。.\s]+/u, ''),
    };
  }
  return null;
};

export const SpokenTitle: React.FC<SpokenTitleProps> = ({
  title,
  subtitle,
  kicker,
  accent = 'purple',
}) => {
  const color = getAccentColor(accent);
  const heroNumber = splitTitleForHeroNumber(title);

  return (
    <SpokenCenterStage>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <SpokenKicker color={color}>{kicker ?? 'MYEIC · AGENT VIDEO'}</SpokenKicker>
        {heroNumber ? (
          <>
            {heroNumber.pre ? (
              <SpokenHeadline size={46} color="rgba(255,255,255,0.92)">
                {heroNumber.pre}
              </SpokenHeadline>
            ) : null}
            <div style={{
              margin: '14px 0 12px',
              fontSize: heroNumber.hero.length > 8 ? 150 : 182,
              lineHeight: 0.9,
              fontWeight: 950,
              letterSpacing: -7,
              color,
              textShadow: `0 0 26px ${color}aa, 0 12px 42px rgba(0,0,0,0.72)`,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {heroNumber.hero}
            </div>
            {heroNumber.post ? (
              <SpokenHeadline size={50}>
                {heroNumber.post}
              </SpokenHeadline>
            ) : null}
          </>
        ) : (
          <SpokenHeadline size={fitTitleSize(title, 92)}>
            {title}
          </SpokenHeadline>
        )}
        <SpokenSubline>{subtitle}</SpokenSubline>
      </div>
    </SpokenCenterStage>
  );
};
