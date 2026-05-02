import React from 'react';
import {createTikTokStyleCaptions, type Caption, type TikTokPage} from '@remotion/captions';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {UltimateSubtitleCue, UltimateSubtitleWord} from './project';

const SWITCH_CAPTIONS_EVERY_MS = 1200;
const CHINESE_TOKEN_SIZE = 4;

const isPunctuationOnly = (value: string) => /^[，。！？；：、“”‘’（）《》〈〉【】〔〕…,.!?;:()[\]"'`~\-]+$/.test(value);

const splitChineseToken = (value: string) => {
  const compact = value.replace(/\s+/g, '').trim();
  if (!compact) {
    return [];
  }

  return compact.match(new RegExp(`.{1,${CHINESE_TOKEN_SIZE}}`, 'g')) ?? [compact];
};

const splitLatinToken = (value: string) => {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const splitCueTextIntoTokens = (text: string) => {
  const segments = text
    .replace(/\n+/g, ' ')
    .split(/([，。！？；：、“”‘’（）《》〈〉【】〔〕…,.!?;:()[\]"'`~\-]+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  const tokens: string[] = [];

  for (const segment of segments) {
    if (isPunctuationOnly(segment)) {
      if (tokens.length > 0) {
        tokens[tokens.length - 1] += segment;
      } else {
        tokens.push(segment);
      }
      continue;
    }

    const nextTokens = /[\u3400-\u9fff]/.test(segment)
      ? splitChineseToken(segment)
      : splitLatinToken(segment);
    tokens.push(...nextTokens);
  }

  return tokens.filter(Boolean);
};

const normalizeCueWords = (words: UltimateSubtitleWord[] | null | undefined) => {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const merged: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
    startMs?: number;
    endMs?: number;
    confidence?: number;
    isKeyword?: boolean;
  }> = [];

  for (const word of words) {
    const text = typeof word?.text === 'string' ? word.text.trim() : '';
    if (!text) {
      continue;
    }

    if (isPunctuationOnly(text) && merged.length > 0) {
      const previous = merged[merged.length - 1];
      previous.text += text;
      previous.endFrame = Math.max(previous.endFrame, word.endFrame);
      previous.endMs = Math.max(previous.endMs ?? 0, word.endMs ?? 0) || previous.endMs;
      continue;
    }

    merged.push({
      text,
      startFrame: word.startFrame,
      endFrame: word.endFrame,
      startMs: word.startMs,
      endMs: word.endMs,
      confidence: word.confidence,
      isKeyword: word.isKeyword,
    });
  }

  return merged;
};

const buildSyntheticWordTimings = (cue: UltimateSubtitleCue, fps: number) => {
  const tokens = splitCueTextIntoTokens(cue.text);
  if (tokens.length === 0) {
    return [];
  }

  const cueStartMs = cue.startMs ?? Math.round((cue.startFrame / fps) * 1000);
  const cueEndMs = cue.endMs ?? Math.round((cue.endFrame / fps) * 1000);
  const totalDurationMs = Math.max(1, cueEndMs - cueStartMs);
  const totalWeight = tokens.reduce((sum, token) => {
    return sum + Math.max(1, token.replace(/\s+/g, '').length);
  }, 0);

  let cursorMs = cueStartMs;

  return tokens.map((token, index) => {
    const weight = Math.max(1, token.replace(/\s+/g, '').length);
    const durationMs = index === tokens.length - 1
      ? Math.max(1, cueEndMs - cursorMs)
      : Math.max(60, Math.round((weight / totalWeight) * totalDurationMs));
    const startMs = cursorMs;
    const endMs = Math.min(cueEndMs, startMs + durationMs);
    cursorMs = endMs;

    return {
      text: token,
      startMs,
      endMs: Math.max(startMs + 1, endMs),
      confidence: undefined,
      isKeyword: false,
    };
  });
};

const buildCaptionTokens = (subtitleData: UltimateSubtitleCue[] | null | undefined, fps: number): Caption[] => {
  if (!Array.isArray(subtitleData) || subtitleData.length === 0) {
    return [];
  }

  const captions: Caption[] = [];
  let tokenIndex = 0;

  for (const cue of subtitleData) {
    if (!cue || typeof cue.text !== 'string' || !cue.text.trim()) {
      continue;
    }

    const cueWords = normalizeCueWords(cue.words);
    const timedWords = cueWords.length > 0
      ? cueWords.map((word) => ({
          text: word.text,
          startMs: word.startMs ?? Math.round((word.startFrame / fps) * 1000),
          endMs: word.endMs ?? Math.round((word.endFrame / fps) * 1000),
          confidence: word.confidence,
        }))
      : buildSyntheticWordTimings(cue, fps);

    for (const word of timedWords) {
      const displayText = word.text.trim();
      if (!displayText) {
        continue;
      }

      captions.push({
        text: tokenIndex === 0 ? displayText : ` ${displayText}`,
        startMs: Math.max(0, Math.round(word.startMs)),
        endMs: Math.max(Math.round(word.startMs) + 1, Math.round(word.endMs)),
        timestampMs: null,
        confidence: typeof word.confidence === 'number' ? word.confidence : null,
      });
      tokenIndex += 1;
    }
  }

  return captions;
};

const UltimateCaptionPage: React.FC<{
  page: TikTokPage;
  currentTimeMs: number;
  localFrame: number;
}> = ({page, currentTimeMs, localFrame}) => {
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame: localFrame,
    fps,
    config: {damping: 16, stiffness: 140, mass: 0.82},
  });
  const translateY = interpolate(reveal, [0, 1], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 72,
        pointerEvents: 'none',
        zIndex: 500,
      }}
    >
      <div
        style={{
          maxWidth: 1420,
          margin: '0 64px',
          padding: '18px 24px 18px',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(8, 10, 16, 0.46) 0%, rgba(6, 8, 14, 0.54) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.26)',
          backdropFilter: 'blur(10px)',
          opacity: reveal,
          transform: `translateY(${translateY}px) scale(${0.985 + reveal * 0.015})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            columnGap: '0.18em',
            rowGap: '0.2em',
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.18,
            letterSpacing: '-0.03em',
            textAlign: 'center',
          }}
        >
          {page.tokens.map((token) => {
            const isActive = token.fromMs <= currentTimeMs && token.toMs > currentTimeMs;
            const isPast = currentTimeMs >= token.toMs;
            const displayText = token.text.trimStart();
            const tokenReveal = isActive
              ? spring({
                  frame: Math.max(0, Math.round((currentTimeMs - token.fromMs) / (1000 / fps))),
                  fps,
                  config: {damping: 12, stiffness: 180, mass: 0.72},
                })
              : 1;

            return (
              <span
                key={`${page.startMs}-${token.fromMs}-${displayText}`}
                style={{
                  display: 'inline-block',
                  padding: isActive ? '0.02em 0.12em 0.06em' : '0',
                  borderRadius: 10,
                  color: isActive ? '#f7fbff' : isPast ? '#f7fbff' : 'rgba(247,251,255,0.54)',
                  background: isActive ? 'rgba(57,229,8,0.18)' : 'transparent',
                  boxShadow: isActive ? '0 0 18px rgba(57,229,8,0.16)' : 'none',
                  textShadow: isActive ? 'none' : isPast ? '0 2px 14px rgba(0,0,0,0.38)' : '0 1px 10px rgba(0,0,0,0.28)',
                  transform: isActive ? `scale(${1 + tokenReveal * 0.04})` : 'scale(1)',
                }}
              >
                {displayText}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const UltimateCaptionOverlay: React.FC<{
  subtitleData?: UltimateSubtitleCue[] | null;
}> = ({subtitleData}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  const pages = React.useMemo(() => {
    const captions = buildCaptionTokens(subtitleData, fps);
    if (captions.length === 0) {
      return [];
    }

    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    }).pages;
  }, [fps, subtitleData]);

  if (pages.length === 0) {
    return null;
  }

  const activePageIndex = pages.findIndex((page, index) => {
    const nextPage = pages[index + 1] ?? null;
    const pageEndMs = nextPage ? nextPage.startMs : page.startMs + page.durationMs;
    return currentTimeMs >= page.startMs && currentTimeMs < pageEndMs;
  });

  if (activePageIndex < 0) {
    return null;
  }

  const activePage = pages[activePageIndex];
  const activePageStartFrame = Math.max(0, Math.round((activePage.startMs / 1000) * fps));

  return (
    <UltimateCaptionPage
      page={activePage}
      currentTimeMs={currentTimeMs}
      localFrame={Math.max(0, frame - activePageStartFrame)}
    />
  );
};

export default UltimateCaptionOverlay;
