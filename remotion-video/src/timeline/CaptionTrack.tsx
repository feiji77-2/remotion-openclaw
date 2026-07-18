import React, {useMemo} from 'react';
import {createTikTokStyleCaptions, type TikTokPage} from '@remotion/captions';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame} from 'remotion';
import type {CompiledProject} from '../project/compileProject';

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
          fontSize: editorial && orientation === 'portrait' ? 46 : 42,
          fontWeight: editorial ? 900 : 800,
          lineHeight: 1.35,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textShadow: editorial ? '0 3px 9px rgba(0,0,0,0.96), 0 0 22px rgba(0,0,0,0.72)' : undefined,
        }}
      >
        {page.tokens.map((token, index) => (
          <span
            key={`${token.fromMs}-${index}`}
            style={{color: currentMs >= token.fromMs && currentMs < token.toMs ? accent : '#f8fafc'}}
          >
            {token.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const EditorialCaption: React.FC<{text: string; durationInFrames: number}> = ({text, durationInFrames}) => {
  const frame = useCurrentFrame();
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
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', padding: '0 86px 112px'}}>
      <div style={{
        maxWidth: 900,
        padding: '8px 12px 10px',
        color: '#f8fafc',
        fontSize: 46,
        fontWeight: 900,
        lineHeight: 1.35,
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        textShadow: '0 3px 9px rgba(0,0,0,0.96), 0 0 22px rgba(0,0,0,0.72)',
        opacity: fadeIn * fadeOut,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [10, 0])}px)`,
      }}>
        {text}
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
              <EditorialCaption text={caption.text} durationInFrames={durationInFrames} />
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
