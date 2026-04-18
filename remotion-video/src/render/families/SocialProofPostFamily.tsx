import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {NormalizedSocialProofPostContent} from '../familySchemas';
import {
  POSTER_ENGAGEMENT_BOTTOM,
  POSTER_HERO_TOP_COMPACT,
  POSTER_SIDE_PADDING,
  POSTER_SIGNAL_TOP,
} from '../layoutRhythm';

interface SocialProofPostFamilyProps {
  startFrame: number;
  durationFrames: number;
  bgColor: string;
  content: NormalizedSocialProofPostContent;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const HeroQuote: React.FC<{
  relFrame: number;
  content: NormalizedSocialProofPostContent;
}> = ({relFrame, content}) => {
  const introProgress = clamp01(relFrame / Math.max(1, content.template.beats.cardIntroDuration));
  const quoteProgress = clamp01(
    (relFrame - content.template.beats.quoteStart) / Math.max(1, content.template.beats.quoteRevealDuration),
  );
  const characters = content.quote.split('');

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_SIDE_PADDING,
        right: POSTER_SIDE_PADDING,
        top: POSTER_HERO_TOP_COMPACT,
        opacity: interpolate(introProgress, [0, 0.25, 1], [0, 0.5, 1]),
        transform: `translateY(${interpolate(introProgress, [0, 1], [28, 0])}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -32,
          top: -110,
          fontSize: 232,
          lineHeight: 0.8,
          fontWeight: 800,
          color: 'rgba(255,69,0,0.16)',
          fontFamily: 'Georgia, serif',
          pointerEvents: 'none',
        }}
      >
        "
      </div>

      <div
        style={{
          maxWidth: 860,
          fontSize: 56,
          fontWeight: 760,
          color: '#f4f8ff',
          lineHeight: 1.2,
          letterSpacing: -1.6,
          textWrap: 'balance',
        }}
      >
        {characters.map((character, index) => {
          const charProgress = clamp01(quoteProgress * characters.length - index);
          const activeRange = content.template.highlightRanges.find(
            (range) => index >= range.start && index <= range.end,
          );
          const color = activeRange && charProgress > 0.72 ? activeRange.color : '#f4f8ff';

          return (
            <span
              key={`${character}-${index}`}
              style={{
                opacity: interpolate(charProgress, [0, 0.45, 1], [0.08, 0.55, 1]),
                color,
                textShadow: activeRange && charProgress > 0.72 ? `0 0 16px ${activeRange.color}55` : 'none',
              }}
            >
              {character}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const SourceStrip: React.FC<{content: NormalizedSocialProofPostContent; relFrame: number}> = ({
  content,
  relFrame,
}) => {
  const progress = clamp01(
    (relFrame - Math.max(0, content.template.beats.quoteStart - 14)) /
      Math.max(1, content.template.beats.cardIntroDuration),
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: POSTER_SIGNAL_TOP,
        left: POSTER_SIDE_PADDING,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [18, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'rgba(255,69,0,0.14)',
          border: '1px solid rgba(255,69,0,0.48)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff6d2d',
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        R
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#ff8a57',
            letterSpacing: 1.2,
          }}
        >
          {content.sourceLabel}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 650,
            color: 'rgba(244,248,255,0.88)',
            letterSpacing: -0.2,
          }}
        >
          {content.community} · {content.authorMeta}
        </div>
      </div>
    </div>
  );
};

const EngagementStrip: React.FC<{
  relFrame: number;
  content: NormalizedSocialProofPostContent;
}> = ({relFrame, content}) => {
  const progress = clamp01(
    (relFrame - content.template.beats.tagsStart) / Math.max(1, content.template.beats.tagsRevealDuration),
  );
  const shortTags = content.tags.slice(0, 3).map((tag) => tag.label);

  return (
    <div
      style={{
        position: 'absolute',
        left: POSTER_SIDE_PADDING,
        right: POSTER_SIDE_PADDING,
        bottom: POSTER_ENGAGEMENT_BOTTOM,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          color: 'rgba(244,248,255,0.74)',
          fontSize: 22,
          fontWeight: 620,
        }}
      >
        {content.engagementItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          color: 'rgba(255,138,87,0.86)',
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        {shortTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div
        style={{
          fontSize: 16,
          color: 'rgba(244,248,255,0.34)',
          letterSpacing: 0.2,
        }}
      >
        {content.footnote}
      </div>
    </div>
  );
};

export const SocialProofPostFamily: React.FC<SocialProofPostFamilyProps> = ({
  startFrame,
  durationFrames,
  bgColor,
  content,
}) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame);

  return (
    <AbsoluteFill style={{background: bgColor}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 24% 28%, rgba(255,138,87,0.18), transparent 34%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 72% 76%, rgba(0,212,255,0.12), transparent 28%)',
        }}
      />
      <SourceStrip relFrame={relFrame} content={content} />
      <HeroQuote relFrame={relFrame} content={content} />
      <EngagementStrip relFrame={relFrame} content={content} />
    </AbsoluteFill>
  );
};

export default SocialProofPostFamily;
