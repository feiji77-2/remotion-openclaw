import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AppleEmoji} from '../AppleEmoji';
import {BrandIcon, type BrandIconName} from '../BrandIcon';
import {MorfeoFontStyles} from './MorfeoFontStyles';
import {MorfeoTag} from './MorfeoTag';
import {
  MORFEO_BG,
  MORFEO_FONTS,
  MORFEO_LIME,
  MORFEO_PANEL,
  MORFEO_TEXT,
  MORFEO_TEXT_MUTED,
} from './morfeoTokens';

export type MorfeoHeroBlockProps = {
  tag: string;
  tagEmoji?: string;
  heroEmoji: string;
  title: string;
  highlightedWord?: string;
  lines: string[];
  accentColor?: string;
  brandIcon?: BrandIconName | string;
  brandLabel?: string;
  panelStyle?: React.CSSProperties;
  style?: React.CSSProperties;
};

const reveal = (frame: number, from: number, to: number) => {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

const renderTitle = (title: string, highlightedWord: string | undefined, accentColor: string) => {
  if (!highlightedWord || !title.includes(highlightedWord)) {
    return title;
  }

  const parts = title.split(highlightedWord);
  return (
    <>
      {parts[0]}
      <span style={{color: accentColor}}>{highlightedWord}</span>
      {parts.slice(1).join(highlightedWord)}
    </>
  );
};

export const MorfeoHeroBlock: React.FC<MorfeoHeroBlockProps> = ({
  tag,
  tagEmoji = '✨',
  heroEmoji,
  title,
  highlightedWord,
  lines,
  accentColor = MORFEO_LIME,
  brandIcon,
  brandLabel,
  panelStyle,
  style,
}) => {
  const frame = useCurrentFrame();
  const emojiReveal = reveal(frame, 18, 42);
  const titleReveal = reveal(frame, 34, 66);
  const emojiPulse = interpolate(frame % 60, [0, 30, 60], [1, 1.1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 18% 14%, rgba(205,255,61,0.16), transparent 26%), radial-gradient(circle at 86% 12%, rgba(255,255,255,0.08), transparent 16%), ${MORFEO_BG}`,
        color: MORFEO_TEXT,
        ...style,
      }}
    >
      <MorfeoFontStyles />
      <AbsoluteFill
        style={{
          padding: '112px 84px 96px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 912,
            position: 'relative',
            borderRadius: 40,
            background: MORFEO_PANEL,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.28)',
            padding: '68px 58px 72px',
            backdropFilter: 'blur(18px)',
            ...panelStyle,
          }}
        >
          {brandIcon ? (
            <div
              style={{
                position: 'absolute',
                top: 26,
                right: 26,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 999,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: MORFEO_TEXT,
                fontFamily: MORFEO_FONTS.ui,
                fontSize: 18,
                lineHeight: 1,
                letterSpacing: -0.3,
              }}
            >
              <BrandIcon brand={brandIcon} size={22} color={accentColor} secondaryColor="#ffffff" />
              {brandLabel ? <span>{brandLabel}</span> : null}
            </div>
          ) : null}
          <MorfeoTag label={tag} emoji={tagEmoji} accentColor={accentColor} size="md" />

          <div
            style={{
              marginTop: 36,
              opacity: emojiReveal,
              transform: `translateY(${interpolate(emojiReveal, [0, 1], [18, 0])}px) scale(${emojiPulse})`,
              transformOrigin: 'left center',
            }}
          >
            <AppleEmoji emoji={heroEmoji} size={82} />
          </div>

          <div
            style={{
              marginTop: 26,
              fontFamily: MORFEO_FONTS.display,
              fontStyle: 'italic',
              fontSize: 68,
              lineHeight: 0.94,
              letterSpacing: -2.4,
              color: MORFEO_TEXT,
              opacity: titleReveal,
              transform: `translateY(${interpolate(titleReveal, [0, 1], [26, 0])}px)`,
            }}
          >
            {renderTitle(title, highlightedWord, accentColor)}
          </div>

          <div style={{marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18}}>
            {lines.map((line, index) => {
              const lineReveal = reveal(frame, 60 + index * 30, 78 + index * 30);
              return (
                <div
                  key={`${line}-${index}`}
                  style={{
                    fontFamily: MORFEO_FONTS.ui,
                    fontSize: 38,
                    lineHeight: 1.32,
                    letterSpacing: -0.8,
                    color: index === 0 ? MORFEO_TEXT : MORFEO_TEXT_MUTED,
                    opacity: lineReveal,
                    transform: `translateY(${interpolate(lineReveal, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
