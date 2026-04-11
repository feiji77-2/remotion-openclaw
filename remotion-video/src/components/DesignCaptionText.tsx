import React, {useMemo} from 'react';
import {interpolate, spring} from 'remotion';
import type {CaptionStyleProps, SubtitleCueProps} from '../Root';
import type {ITrackItem} from '../editor/types';

export type SharedCaptionBubbleProps = {
  frame: number;
  fps: number;
  width: number;
  subtitleStyle?: 'caption' | 'bottom';
  captionText: string;
  captionStartFrame: number;
  activeSubtitle?: SubtitleCueProps | null;
  activeCaptionStyle?: CaptionStyleProps | null;
  typewriter?: boolean;
};

function shouldGlueCaptionWords(previousToken: string, token: string) {
  return (
    /^[，。！？；：,.!?;:]/.test(token) ||
    /[\u3400-\u9fff]$/.test(previousToken) ||
    /^[\u3400-\u9fff]/.test(token)
  );
}

export function joinCaptionWordTokens(words: string[]) {
  let result = '';

  for (const token of words.map((word) => word.trim()).filter(Boolean)) {
    if (!result) {
      result = token;
      continue;
    }

    result += shouldGlueCaptionWords(result.slice(-1), token) ? token : ` ${token}`;
  }

  return result.replace(/\s+([，。！？；：,.!?;:])/g, '$1').trim();
}

function parsePixelValue(value: string | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : null;
}

export function inferCaptionWidth(left: string | undefined, renderWidth: number | undefined) {
  const parsedLeft = parsePixelValue(left);
  if (!renderWidth || parsedLeft === null) {
    return 800;
  }

  return Math.max(320, renderWidth - parsedLeft * 2);
}

function getCaptionWordVisualLength(word: NonNullable<SubtitleCueProps['words']>[number]) {
  return Math.max(1, word.text.replace(/\s+/g, '').length);
}

function splitCaptionWordsIntoLines(
  words: NonNullable<SubtitleCueProps['words']>,
  requestedLines: number | undefined,
) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const maxLines = Math.max(1, Math.min(words.length, Math.round(requestedLines || 1)));
  if (maxLines === 1) {
    return [words];
  }

  const totalVisualLength = words.reduce((sum, word) => sum + getCaptionWordVisualLength(word), 0);
  const lines: Array<NonNullable<SubtitleCueProps['words']>> = [];
  let currentLine: NonNullable<SubtitleCueProps['words']> = [];
  let consumedVisualLength = 0;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    currentLine.push(word);
    consumedVisualLength += getCaptionWordVisualLength(word);

    const remainingWords = words.length - index - 1;
    const remainingLines = maxLines - lines.length - 1;
    if (remainingLines <= 0 || remainingWords <= 0) {
      continue;
    }

    const currentLineLength = currentLine.reduce((sum, currentWord) => {
      return sum + getCaptionWordVisualLength(currentWord);
    }, 0);
    const remainingVisualLength = Math.max(0, totalVisualLength - consumedVisualLength);
    const targetLineLength = Math.max(1, Math.round(remainingVisualLength / (remainingLines + 1)));
    const endsPhrase = /[，。！？；：,.!?;:]$/.test(word.text);
    const enoughWordsLeft = remainingWords >= remainingLines;

    if (enoughWordsLeft && (endsPhrase || currentLineLength >= targetLineLength)) {
      lines.push(currentLine);
      currentLine = [];
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const overflowLine = lines.slice(maxLines - 1).flat();
  return [...lines.slice(0, maxLines - 1), overflowLine];
}

function formatBoxShadow(style: CaptionStyleProps | null | undefined) {
  if (!style?.boxShadow || !style.boxShadow.color) {
    return undefined;
  }

  return `${style.boxShadow.x ?? 0}px ${style.boxShadow.y ?? 0}px ${style.boxShadow.blur ?? 0}px ${style.boxShadow.color}`;
}

function buildCaptionFilter(style: CaptionStyleProps | null | undefined) {
  if (!style) {
    return undefined;
  }

  const filters: string[] = [];
  if (typeof style.blur === 'number' && style.blur > 0) {
    filters.push(`blur(${style.blur}px)`);
  }
  if (typeof style.brightness === 'number' && style.brightness !== 100) {
    filters.push(`brightness(${style.brightness}%)`);
  }

  return filters.length > 0 ? filters.join(' ') : undefined;
}

function toFiniteNumber(value: unknown) {
  return Number.isFinite(value) ? Math.round(Number(value)) : null;
}

export function buildSubtitleCueFromTrackItem(item: ITrackItem, fps: number): SubtitleCueProps | null {
  if (!item || item.details.type !== 'caption') {
    return null;
  }

  const startFrame = Math.max(0, toFiniteNumber(item.start) ?? 0);
  const durationInFrames = Math.max(
    1,
    toFiniteNumber(item.duration) ?? toFiniteNumber(item.details.duration) ?? 1,
  );
  const endFrame = startFrame + durationInFrames;
  const words: NonNullable<SubtitleCueProps['words']> = Array.isArray(item.details.words)
    ? item.details.words.flatMap((word) => {
        const text = typeof word.word === 'string' ? word.word.trim() : '';
        if (!text) {
          return [];
        }

        const relativeStartFrame = Math.max(0, toFiniteNumber(word.start) ?? 0);
        const relativeEndFrame = Math.max(relativeStartFrame + 1, toFiniteNumber(word.end) ?? relativeStartFrame + 1);
        const absoluteStartFrame = startFrame + relativeStartFrame;
        const absoluteEndFrame = Math.max(absoluteStartFrame + 1, startFrame + relativeEndFrame);

        return [{
          text,
          startFrame: absoluteStartFrame,
          endFrame: absoluteEndFrame,
          startMs: Math.round((absoluteStartFrame / fps) * 1000),
          endMs: Math.round((absoluteEndFrame / fps) * 1000),
          confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
          isKeyword: typeof word.is_keyword === 'boolean' ? word.is_keyword : undefined,
        }];
      })
    : [];
  const text = typeof item.details.text === 'string' && item.details.text.trim()
    ? item.details.text.trim()
    : joinCaptionWordTokens(words.map((word) => word.text));

  if (!text) {
    return null;
  }

  return {
    index: 1,
    startFrame,
    endFrame,
    startMs: Math.round((startFrame / fps) * 1000),
    endMs: Math.round((endFrame / fps) * 1000),
    text,
    words: words.length > 0 ? words : null,
  };
}

export function buildCaptionStyleFromTrackItem(item: ITrackItem, renderWidth: number): CaptionStyleProps | null {
  if (!item || item.details.type !== 'caption') {
    return null;
  }

  const left = typeof item.details.left === 'string' ? item.details.left : undefined;
  const top = typeof item.details.top === 'string' ? item.details.top : undefined;

  return {
    fontSize: toFiniteNumber(item.details.fontSize) ?? 64,
    fontFamily: typeof item.details.fontFamily === 'string' ? item.details.fontFamily : undefined,
    fontWeight: item.details.fontWeight,
    fontStyle: item.details.fontStyle,
    color: item.details.color,
    backgroundColor: item.details.backgroundColor,
    borderColor: item.details.borderColor,
    borderWidth: toFiniteNumber(item.details.borderWidth) ?? 0,
    textAlign: item.details.textAlign,
    textShadow: item.details.textShadow,
    strokeColor: item.details.WebkitTextStrokeColor,
    strokeWidth: item.details.WebkitTextStrokeWidth,
    lineHeight: item.details.lineHeight,
    letterSpacing: item.details.letterSpacing,
    wordSpacing: item.details.wordSpacing,
    linesPerCaption: toFiniteNumber(item.details.linesPerCaption) ?? 1,
    wordWrap: item.details.wordWrap,
    wordBreak: item.details.wordBreak,
    opacity: toFiniteNumber(item.details.opacity) ?? 100,
    top,
    left,
    height: toFiniteNumber(item.details.height) ?? 80,
    width: inferCaptionWidth(left, renderWidth),
    appearedColor: item.details.appearedColor,
    activeColor: item.details.activeColor,
    activeFillColor: item.details.activeFillColor,
    boxShadow: item.details.boxShadow ?? null,
    transform: item.details.transform,
    blur: typeof item.details.blur === 'number' ? item.details.blur : 0,
    brightness: typeof item.details.brightness === 'number' ? item.details.brightness : 100,
  };
}

export const SharedCaptionBubble: React.FC<SharedCaptionBubbleProps> = ({
  frame,
  fps,
  width,
  subtitleStyle = 'caption',
  captionText,
  captionStartFrame,
  activeSubtitle,
  activeCaptionStyle,
  typewriter = true,
}) => {
  if (!captionText) {
    return null;
  }

  const chunkFrame = Math.max(0, frame - captionStartFrame);
  const pulse = spring({frame: chunkFrame, fps, config: {damping: 20, stiffness: 180, mass: 0.8}});
  const glow = interpolate(chunkFrame, [0, 10, 24], [0.24, 0.12, 0.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isBottom = subtitleStyle === 'bottom';
  const usesDesignCaptionStyle = Boolean(activeCaptionStyle);
  const shouldRenderWordHighlights = Boolean(
    usesDesignCaptionStyle &&
    activeSubtitle &&
    Array.isArray(activeSubtitle.words) &&
    activeSubtitle.words.length > 0,
  );
  const designCaptionWidth = activeCaptionStyle?.width ?? 800;
  const designCaptionLeft = activeCaptionStyle?.left ?? `${Math.max(40, Math.round((width - designCaptionWidth) / 2))}px`;
  const displayText = typewriter
    ? captionText.slice(0, Math.min(Math.floor(chunkFrame / 2) + 1, captionText.length))
    : captionText;
  const designCaptionContainerStyle: React.CSSProperties | null = usesDesignCaptionStyle
    ? {
        position: 'absolute',
        left: designCaptionLeft,
        top: activeCaptionStyle?.top ?? '75%',
        width: designCaptionWidth,
        minHeight: activeCaptionStyle?.height ?? 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px',
        opacity: typeof activeCaptionStyle?.opacity === 'number' ? activeCaptionStyle.opacity / 100 : 1,
        background: activeCaptionStyle?.backgroundColor && activeCaptionStyle.backgroundColor !== 'transparent'
          ? activeCaptionStyle.backgroundColor
          : 'transparent',
        border: activeCaptionStyle?.borderWidth
          ? `${activeCaptionStyle.borderWidth}px solid ${activeCaptionStyle.borderColor ?? 'transparent'}`
          : 'none',
        boxShadow: formatBoxShadow(activeCaptionStyle),
        transform: activeCaptionStyle?.transform && activeCaptionStyle.transform !== 'none'
          ? activeCaptionStyle.transform
          : undefined,
        filter: buildCaptionFilter(activeCaptionStyle),
      }
    : null;
  const designCaptionTextStyle: React.CSSProperties | null = usesDesignCaptionStyle
    ? {
        whiteSpace: 'pre-line',
        width: '100%',
        fontSize: activeCaptionStyle?.fontSize ?? 64,
        lineHeight: activeCaptionStyle?.lineHeight ?? 'normal',
        fontWeight: activeCaptionStyle?.fontWeight ?? 'normal',
        fontStyle: activeCaptionStyle?.fontStyle ?? 'normal',
        fontFamily: activeCaptionStyle?.fontFamily ?? 'inherit',
        textAlign: activeCaptionStyle?.textAlign ?? 'center',
        color: activeCaptionStyle?.color ?? '#ffffff',
        textShadow: activeCaptionStyle?.textShadow && activeCaptionStyle.textShadow !== 'none'
          ? activeCaptionStyle.textShadow
          : undefined,
        letterSpacing: activeCaptionStyle?.letterSpacing && activeCaptionStyle.letterSpacing !== 'normal'
          ? activeCaptionStyle.letterSpacing
          : undefined,
        wordSpacing: activeCaptionStyle?.wordSpacing && activeCaptionStyle.wordSpacing !== 'normal'
          ? activeCaptionStyle.wordSpacing
          : undefined,
        overflowWrap: activeCaptionStyle?.wordWrap && activeCaptionStyle.wordWrap !== 'normal'
          ? (activeCaptionStyle.wordWrap as React.CSSProperties['overflowWrap'])
          : undefined,
        wordBreak: activeCaptionStyle?.wordBreak && activeCaptionStyle.wordBreak !== 'normal'
          ? (activeCaptionStyle.wordBreak as React.CSSProperties['wordBreak'])
          : undefined,
        WebkitTextStroke: activeCaptionStyle?.strokeWidth && activeCaptionStyle.strokeWidth !== '0px'
          ? `${activeCaptionStyle.strokeWidth} ${activeCaptionStyle.strokeColor ?? '#ffffff'}`
          : undefined,
      }
    : null;
  const renderedCaptionLines = useMemo(() => {
    if (!shouldRenderWordHighlights || !activeSubtitle?.words) {
      return [];
    }

    return splitCaptionWordsIntoLines(activeSubtitle.words, activeCaptionStyle?.linesPerCaption);
  }, [activeCaptionStyle?.linesPerCaption, activeSubtitle?.words, shouldRenderWordHighlights]);
  const renderedCaptionWords = useMemo(() => {
    if (!shouldRenderWordHighlights || !activeCaptionStyle) {
      return [];
    }

    return renderedCaptionLines.map((lineWords, lineIndex) => {
      return lineWords.map((word, wordIndex) => {
        const previousWord = wordIndex > 0 ? lineWords[wordIndex - 1] : null;
        const needsLeadingSpace = previousWord ? !shouldGlueCaptionWords(previousWord.text, word.text) : false;
        const isActiveWord = frame >= word.startFrame && frame < word.endFrame;
        const isAppearedWord = frame >= word.endFrame;
        const color = isActiveWord
          ? activeCaptionStyle.activeColor ?? activeCaptionStyle.color ?? '#ffffff'
          : isAppearedWord
            ? activeCaptionStyle.appearedColor ?? activeCaptionStyle.color ?? '#ffffff'
            : activeCaptionStyle.color ?? '#ffffff';

        return {
          key: `${lineIndex}-${word.text}-${word.startFrame}-${wordIndex}`,
          text: word.text,
          needsLeadingSpace,
          style: {
            color,
            backgroundColor: isActiveWord ? activeCaptionStyle.activeFillColor ?? 'transparent' : 'transparent',
            borderRadius: isActiveWord ? '0.28em' : undefined,
            padding: isActiveWord ? '0.02em 0.18em' : undefined,
            boxDecorationBreak: isActiveWord ? ('clone' as const) : undefined,
            WebkitBoxDecorationBreak: isActiveWord ? ('clone' as const) : undefined,
            transition: 'color 120ms ease, background-color 120ms ease',
          } satisfies React.CSSProperties,
        };
      });
    });
  }, [activeCaptionStyle, frame, renderedCaptionLines, shouldRenderWordHighlights]);

  return (
    <div style={usesDesignCaptionStyle ? designCaptionContainerStyle ?? undefined : {
      minWidth: isBottom ? 600 : 760,
      maxWidth: isBottom ? 680 : 860,
      padding: isBottom ? '18px 24px' : '24px 32px',
      borderRadius: isBottom ? 18 : 26,
      background: 'rgba(9,7,13,0.8)',
      border: `1px solid rgba(139,92,246,${0.3 + pulse * 0.2})`,
      boxShadow: `0 24px 60px rgba(0,0,0,0.35), 0 0 48px rgba(139,92,246,${glow})`,
      backdropFilter: 'blur(18px)',
      transform: `translateY(${(1 - pulse) * 8}px) scale(${0.985 + pulse * 0.015})`,
    }}>
      <div style={usesDesignCaptionStyle ? designCaptionTextStyle ?? undefined : {
        whiteSpace: 'pre-line',
        fontSize: isBottom ? 34 : 42,
        lineHeight: 1.35,
        fontWeight: 800,
        textAlign: 'center',
        color: '#fff8ef',
        textShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}>
        {shouldRenderWordHighlights
          ? renderedCaptionWords.map((line, lineIndex) => (
            <div
              key={`line-${lineIndex}`}
              style={{
                display: 'block',
                width: '100%',
              }}
            >
              {line.map((word) => (
                <React.Fragment key={word.key}>
                  {word.needsLeadingSpace ? ' ' : null}
                  <span style={word.style}>{word.text}</span>
                </React.Fragment>
              ))}
            </div>
          ))
          : displayText}
      </div>
    </div>
  );
};
