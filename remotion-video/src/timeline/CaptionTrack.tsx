import React, {useMemo} from 'react';
import {createTikTokStyleCaptions, type TikTokPage} from '@remotion/captions';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame} from 'remotion';
import type {CompiledProject} from '../project/compileProject';

const compactLength = (value: string) => value.replace(/\s+/g, '').length;

const splitCaptionForDisplay = (value: string, maxChars: number): string[] => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (compactLength(normalized) <= maxChars) return [normalized];
  const parts = normalized
    .split(/(?<=[，,、。！？!?；;：:])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  const pushChunk = (candidate: string) => {
    const text = candidate.trim();
    if (!text) return;
    if (compactLength(text) <= maxChars + 6) {
      chunks.push(text);
      return;
    }
    for (let index = 0; index < text.length; index += maxChars) {
      chunks.push(text.slice(index, index + maxChars).trim());
    }
  };
  for (const part of parts.length ? parts : [normalized]) {
    const next = current ? `${current}${part}` : part;
    if (compactLength(next) <= maxChars) {
      current = next;
      continue;
    }
    pushChunk(current);
    current = '';
    pushChunk(part);
  }
  pushChunk(current);
  return chunks.length ? chunks : [normalized.slice(0, maxChars)];
};

const captionTextForFrame = (
  text: string,
  frame: number,
  durationInFrames: number,
  orientation: CompiledProject['orientation'],
) => {
  const chunks = splitCaptionForDisplay(text, orientation === 'portrait' ? 30 : 46);
  if (chunks.length <= 1) return chunks[0] ?? '';
  const progress = Math.max(0, Math.min(0.999, frame / Math.max(1, durationInFrames)));
  return chunks[Math.floor(progress * chunks.length)] ?? chunks[0] ?? '';
};

const CaptionPage: React.FC<{
  page: TikTokPage;
  fps: number;
  accent: string;
  style: CompiledProject['captionStyle'];
  orientation: CompiledProject['orientation'];
}> = ({page, fps, accent, style, orientation}) => {
  const frame = useCurrentFrame();
  const currentMs = page.startMs + frame / fps * 1000;
  const editorial = style === 'editorial';
  const pageText = page.tokens.map((token) => token.text).join('');
  const durationInFrames = Math.max(1, Math.round(page.durationMs / 1000 * fps));
  const displayText = captionTextForFrame(pageText, frame, durationInFrames, orientation);
  const shouldChunk = compactLength(pageText) > (orientation === 'portrait' ? 36 : 58);
  const displayLength = compactLength(shouldChunk ? displayText : pageText);
  return (
    <AbsoluteFill style={{
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: editorial && orientation === 'portrait' ? '0 86px 112px' : '0 120px 70px',
    }}>
      <div
        style={{
          maxWidth: editorial && orientation === 'portrait' ? 900 : 1500,
          padding: editorial ? '8px 12px 10px' : '15px 24px 17px',
          background: editorial ? 'transparent' : 'rgba(2, 6, 23, 0.84)',
          border: editorial ? 'none' : '1px solid rgba(255,255,255,0.14)',
          boxShadow: editorial ? 'none' : '0 12px 34px rgba(0,0,0,0.36)',
          color: '#f8fafc',
          fontSize: editorial && orientation === 'portrait'
            ? 46
            : orientation === 'portrait'
              ? displayLength > 30 ? 34 : displayLength > 22 ? 38 : 42
              : displayLength > 58 ? 34 : 42,
          fontWeight: editorial ? 900 : 800,
          lineHeight: 1.3,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: orientation === 'portrait' ? 176 : 150,
          overflow: 'hidden',
          textShadow: editorial ? '0 3px 9px rgba(0,0,0,0.96), 0 0 22px rgba(0,0,0,0.72)' : undefined,
        }}
      >
        {shouldChunk ? <span style={{color: accent}}>{displayText}</span> : page.tokens.map((token, index) => (
          <span key={`${token.fromMs}-${index}`} style={{color: currentMs >= token.fromMs && currentMs < token.toMs ? accent : '#f8fafc'}}>
            {token.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const EditorialCaption: React.FC<{
  text: string;
  durationInFrames: number;
  orientation: CompiledProject['orientation'];
}> = ({text, durationInFrames, orientation}) => {
  const frame = useCurrentFrame();
  const portrait = orientation === 'portrait';
  const displayText = captionTextForFrame(text, frame, durationInFrames, orientation);
  const displayLength = compactLength(displayText);
  const fadeIn = interpolate(frame, [0, Math.min(5, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut = interpolate(frame, [Math.max(0, durationInFrames - 5), durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: portrait ? '0 86px 112px' : '0 120px 70px',
    }}>
      <div style={{
        maxWidth: portrait ? 900 : 1500,
        padding: '8px 12px 10px',
        color: '#f8fafc',
        fontSize: portrait ? displayLength > 30 ? 38 : displayLength > 22 ? 42 : 46 : displayLength > 46 ? 36 : 42,
        fontWeight: 900,
        lineHeight: 1.28,
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        textShadow: '0 3px 9px rgba(0,0,0,0.96), 0 0 22px rgba(0,0,0,0.72)',
        opacity: fadeIn * fadeOut,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [10, 0])}px)`,
      }}>
        {displayText}
      </div>
    </AbsoluteFill>
  );
};

export const CaptionTrack: React.FC<{project: CompiledProject}> = ({project}) => {
  const pages = useMemo(() => createTikTokStyleCaptions({
    captions: project.captions,
    combineTokensWithinMilliseconds: 850,
  }).pages, [project.captions]);

  if (project.captionStyle === 'editorial') {
    return (
      <>
        {project.captions.map((caption, index) => {
          const from = Math.round(caption.startMs / 1000 * project.fps);
          const rawDuration = Math.max(1, Math.round((caption.endMs - caption.startMs) / 1000 * project.fps));
          const durationInFrames = Math.min(rawDuration, project.durationInFrames - from);
          if (durationInFrames <= 0) return null;
          return (
            <Sequence
              key={`${caption.startMs}-${index}`}
              from={from}
              durationInFrames={durationInFrames}
              premountFor={Math.min(project.fps, durationInFrames)}
            >
              <EditorialCaption
                text={caption.text}
                durationInFrames={durationInFrames}
                orientation={project.orientation}
              />
            </Sequence>
          );
        })}
      </>
    );
  }

  return (
    <>
      {pages.map((page, index) => {
        const from = Math.round(page.startMs / 1000 * project.fps);
        const rawDuration = Math.max(1, Math.round(page.durationMs / 1000 * project.fps));
        const durationInFrames = Math.min(rawDuration, project.durationInFrames - from);
        if (durationInFrames <= 0) return null;
        return (
          <Sequence
            key={`${page.startMs}-${index}`}
            from={from}
            durationInFrames={durationInFrames}
            premountFor={Math.min(project.fps, durationInFrames)}
          >
            <CaptionPage
              page={page}
              fps={project.fps}
              accent="#20d9e8"
              style={project.captionStyle}
              orientation={project.orientation}
            />
          </Sequence>
        );
      })}
    </>
  );
};
