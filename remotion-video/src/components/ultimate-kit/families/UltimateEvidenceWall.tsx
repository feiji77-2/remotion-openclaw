import React, {type CSSProperties} from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {getUltimateManualGlyph, isUltimateManualGlyph, resolveUltimateIconPack, ULTIMATE_ICON_URLS, type UltimateIconName} from '../iconography';
import {appendUltimateMicroJitter, createUltimateMicroJitter, resolveUltimateMicroJitterConfig} from '../motion';
import {resolveUltimateAccent, ultimateGlow, ultimateKitTokens} from '../tokens';
import type {UltimateEvidenceWallProps} from '../types';

const kit = ultimateKitTokens;

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

const cleanDisplayText = (value?: string) => {
  return String(value || '').replace(/\s+/g, ' ').trim();
};

const measureText = (value?: string) => {
  return Array.from(cleanDisplayText(value)).length;
};

const splitDisplayUnits = (value: string) => {
  const text = cleanDisplayText(value);
  const units: string[] = [];
  let asciiBuffer = '';

  for (const char of Array.from(text)) {
    if (/[A-Za-z0-9.+\-']/u.test(char)) {
      asciiBuffer += char;
      continue;
    }

    if (asciiBuffer) {
      units.push(asciiBuffer);
      asciiBuffer = '';
    }

    units.push(char);
  }

  if (asciiBuffer) {
    units.push(asciiBuffer);
  }

  return units.filter(Boolean);
};

const splitDisplayLines = (value: string, maxChars: number, maxLines = 2) => {
  const text = cleanDisplayText(value);
  if (!text) {
    return [];
  }

  const units = splitDisplayUnits(text);
  const countUnits = (items: string[]) => {
    return items.reduce((total, item) => total + (/^[A-Za-z0-9.+\-']+$/u.test(item) ? item.length : 1), 0);
  };

  if (countUnits(units) <= maxChars) {
    return [text];
  }

  const lines: string[] = [];
  let cursor = 0;

  while (cursor < units.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(`${units.slice(cursor).join('').trim().slice(0, Math.max(1, maxChars - 1))}…`);
      break;
    }

    let splitIndex = cursor;
    let currentCount = 0;
    while (splitIndex < units.length) {
      const nextWeight = /^[A-Za-z0-9.+\-']+$/u.test(units[splitIndex]) ? units[splitIndex].length : 1;
      if (currentCount + nextWeight > maxChars) {
        break;
      }
      currentCount += nextWeight;
      splitIndex += 1;
    }

    if (splitIndex === cursor) {
      splitIndex += 1;
    }

    lines.push(units.slice(cursor, splitIndex).join('').trim());
    cursor = splitIndex;
  }

  return lines.filter(Boolean).slice(0, maxLines);
};

const splitDisplayLinesBalanced = (value: string, maxChars: number, maxLines = 2) => {
  const initial = splitDisplayLines(value, maxChars, maxLines);
  if (initial.length < 2) {
    return initial;
  }
  const tail = cleanDisplayText(initial[initial.length - 1] || '');
  if (measureText(tail) > Math.max(3, Math.floor(maxChars * 0.28))) {
    return initial;
  }
  return splitDisplayLines(value, maxChars + 2, maxLines);
};

const lineClampStyle = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const withMicroJitter = (
  frame: number,
  baseTransform: string,
  config?: Parameters<typeof createUltimateMicroJitter>[1],
) => {
  return appendUltimateMicroJitter(baseTransform, createUltimateMicroJitter(frame, config));
};

const buildReveal = (frame: number, delay = 0) => {
  return spring({
    fps: 30,
    frame: Math.max(0, frame - delay),
    config: {damping: 200, stiffness: 160},
  });
};

const iconMaskStyle = (icon: UltimateIconName): CSSProperties => ({
  background: 'currentColor',
  WebkitMaskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskSize: 'contain',
});

const SemanticIconGlyph: React.FC<{
  iconValue?: string;
  semanticText: string;
  color: string;
  size?: number;
  fallbackIndex?: number;
}> = ({iconValue, semanticText, color, size = 18, fallbackIndex = 0}) => {
  const resolved = resolveUltimateIconPack({
    hints: [semanticText],
    requested: [iconValue],
    count: 1,
    family: 'evidence-wall',
    seed: fallbackIndex,
  })[0];

  if (isUltimateManualGlyph(iconValue)) {
    return (
      <span style={{fontSize: size, lineHeight: 1, fontWeight: 800, color}}>
        {getUltimateManualGlyph(iconValue)}
      </span>
    );
  }

  if (!resolved) {
    return (
      <span style={{fontSize: size, lineHeight: 1, fontWeight: 800, color}}>
        {fallbackIndex + 1}
      </span>
    );
  }

  return <div style={{width: size, height: size, color, ...iconMaskStyle(resolved)}} />;
};

const SemanticIconBadge: React.FC<{
  iconValue?: string;
  semanticText: string;
  color: string;
  badgeSize?: number;
  size?: number;
  fallbackIndex?: number;
  motionDelay?: number;
}> = ({iconValue, semanticText, color, badgeSize = 34, size = 16, fallbackIndex = 0, motionDelay = 0}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: 12,
        border: `1px solid ${color}33`,
        background: `linear-gradient(180deg, ${color}16 0%, rgba(10, 13, 24, 0.88) 100%)`,
        boxShadow: ultimateGlow(color, 0.16),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: withMicroJitter(frame, '', resolveUltimateMicroJitterConfig('steady', {delay: motionDelay, seed: fallbackIndex + 200})),
      }}
    >
      <SemanticIconGlyph
        iconValue={iconValue}
        semanticText={semanticText}
        color={color}
        size={size}
        fallbackIndex={fallbackIndex}
      />
    </div>
  );
};

export const UltimateEvidenceWall: React.FC<UltimateEvidenceWallProps & {grammar?: {enterFrames?: number; emphasisFrames?: number}}> = ({
  heading,
  summary,
  cards,
  accent = 'yellow',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleCards = cards.slice(0, 3);
  const pacingWindow = (grammar?.enterFrames ?? 20) + (grammar?.emphasisFrames ?? 40);
  const headingLines = splitDisplayLinesBalanced(heading, 15, 3);
  const railPath = 'M 970 214 C 844 348, 1116 470, 986 602 C 850 742, 1076 844, 962 930';
  const anchors = [
    {x: 886, y: 364},
    {x: 1106, y: 520},
    {x: 980, y: 772},
  ];
  const placements = [
    {left: 114, top: 300, width: 486, align: 'left' as const, rotate: -2.5, quoteSize: 34},
    {left: 1248, top: 342, width: 520, align: 'right' as const, rotate: 2.2, quoteSize: 32},
    {left: 252, top: 700, width: 1030, align: 'left' as const, rotate: -0.6, quoteSize: 42},
  ];

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 92, left: 126, right: 126}}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4.2,
            lineHeight: 1.2,
            textTransform: 'uppercase',
            color: accentColor,
            opacity: 0.92,
          }}
        >
          证据层
        </div>
        <div style={{marginTop: 22, maxWidth: 980}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 4,
                fontFamily: kit.fonts.display,
                fontSize: index === 0 ? 58 : 54,
                fontWeight: 800,
                letterSpacing: -2.4,
                lineHeight: 1.08,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        {summary ? (
          <div style={{marginTop: 22, maxWidth: 700, fontSize: 18, lineHeight: 1.64, color: kit.colors.textMuted}}>
            {summary}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 104,
          top: 110,
          fontSize: 188,
          lineHeight: 0.82,
          fontWeight: 900,
          letterSpacing: -11,
          color: `${accentColor}12`,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        PROOF
      </div>

      <GeometryAccent
        variant="ring"
        color={accentColor}
        opacity={0.22}
        style={{left: 850, top: 448, width: 232, height: 232}}
      />
      <GeometryAccent
        variant="slanted-panel"
        color={resolveUltimateAccent('cyan')}
        opacity={0.12}
        style={{left: 122, top: 246, width: 320, height: 98}}
      />
      <GeometryAccent
        variant="arc"
        color={resolveUltimateAccent('purple')}
        opacity={0.16}
        style={{right: 142, top: 238, width: 280, height: 120}}
      />

      <div
        style={{
          position: 'absolute',
          left: 892,
          top: 496,
          width: 156,
          height: 156,
          borderRadius: '50%',
          background: 'rgba(8,10,18,0.76)',
          border: `1px solid ${accentColor}24`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
          boxShadow: `0 0 54px ${accentColor}12`,
        }}
      >
        <div style={{fontSize: 34, fontWeight: 840, lineHeight: 1, color: accentColor}}>
          {String(visibleCards.length).padStart(2, '0')}
        </div>
        <div style={{fontSize: 13, letterSpacing: 2.2, color: 'rgba(255,255,255,0.46)', textTransform: 'uppercase'}}>
          sources
        </div>
      </div>

      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        <PathDrawLink
          d={railPath}
          color={accentColor}
          progress={1}
          frame={frame}
          marker={null}
          baseColor="rgba(255,255,255,0.04)"
          guideOpacity={0.7}
          baseStrokeWidth={4}
          flowStrokeWidth={6}
          drawStrokeWidth={2}
          dashPattern="12 18"
          flowOpacity={0.44}
          drawOpacity={0.36}
        />
        {visibleCards.map((card, index) => {
          const position = placements[index] || placements[placements.length - 1];
          const cardColor = toneToColor(card.accent ?? accent);
          const delay = Math.round(pacingWindow * 0.08 * (index + 1));
          const anchor = anchors[index] || anchors[anchors.length - 1];
          const targetX = position.align === 'right' ? position.left + position.width - 36 : position.left + 42;
          const targetY = position.top + 76;
          const p0 = {x: anchor.x, y: anchor.y};
          const p1 = {x: anchor.x + (targetX > anchor.x ? 120 : -120), y: anchor.y + 16};
          const p2 = {x: targetX + (targetX > anchor.x ? -124 : 124), y: targetY - 18};
          const p3 = {x: targetX, y: targetY};
          const progress = interpolate(frame, [delay, delay + 28], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <PathDrawLink
              key={`${card.source}-link`}
              d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
              color={cardColor}
              progress={progress}
              frame={frame}
              marker={{
                x: p0.x,
                y: p0.y,
                size: 7,
                shape: index === 2 ? 'ring' : 'diamond',
              }}
              baseStrokeWidth={2}
              flowStrokeWidth={5}
              drawStrokeWidth={2}
              dashPattern="10 14"
              flowOpacity={0.54}
            />
          );
        })}
      </svg>

      {visibleCards.map((card, index) => {
        const delay = Math.round(pacingWindow * 0.08 * (index + 1));
        const reveal = buildReveal(frame, delay);
        const cardColor = toneToColor(card.accent ?? accent);
        const position = placements[index] || placements[placements.length - 1];
        const alignStyle = position.align === 'right' ? {textAlign: 'right' as const} : {textAlign: 'left' as const};

        return (
          <div
            key={`${card.source}-${index}`}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: position.width,
              opacity: reveal,
              transform: withMicroJitter(
                frame,
                `translateY(${interpolate(reveal, [0, 1], [22, 0])}px) rotate(${position.rotate}deg)`,
                resolveUltimateMicroJitterConfig('steady', {delay, seed: 150 + index}),
              ),
              ...alignStyle,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: position.align === 'right' ? 'auto' : -10,
                right: position.align === 'right' ? -10 : 'auto',
                top: 16,
                width: index === 2 ? 124 : 84,
                height: 2,
                background: `linear-gradient(90deg, ${cardColor}, transparent)`,
                opacity: 0.8,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: position.align === 'right' ? 'auto' : -8,
                right: position.align === 'right' ? -8 : 'auto',
                top: -8,
                fontSize: index === 2 ? 138 : 112,
                lineHeight: 0.9,
                color: `${cardColor}12`,
                fontWeight: 900,
              }}
            >
              0{index + 1}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                flexDirection: position.align === 'right' ? 'row-reverse' : 'row',
                padding: '12px 16px',
                borderRadius: kit.radius.pill,
                border: `1px solid ${cardColor}26`,
                color: cardColor,
                background: `${cardColor}0f`,
                fontSize: 16,
                lineHeight: 1.2,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                boxShadow: ultimateGlow(cardColor, 0.12),
              }}
            >
              <SemanticIconBadge
                iconValue={card.icon}
                semanticText={`${card.source} ${card.quote} ${(card.chips ?? []).join(' ')}`}
                color={cardColor}
                badgeSize={34}
                size={15}
                fallbackIndex={index}
                motionDelay={delay}
              />
              <span>{card.source}</span>
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: position.quoteSize,
                lineHeight: index === 2 ? 1.24 : 1.34,
                fontWeight: 780,
                color: kit.colors.text,
                ...lineClampStyle(index === 2 ? 3 : 2),
                ...alignStyle,
              }}
            >
              {card.quote}
            </div>

            {card.detail ? (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 17,
                  lineHeight: 1.64,
                  color: 'rgba(255,255,255,0.66)',
                  ...lineClampStyle(index === 2 ? 2 : 3),
                  ...alignStyle,
                }}
              >
                {card.detail}
              </div>
            ) : null}

            {card.chips && card.chips.length > 0 ? (
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  justifyContent: position.align === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {card.chips.slice(0, 3).map((chip) => (
                  <div
                    key={chip}
                    style={{
                      padding: '10px 14px',
                      borderRadius: kit.radius.pill,
                      border: `1px solid ${cardColor}24`,
                      background: 'rgba(255,255,255,0.03)',
                      color: kit.colors.textSoft,
                      fontSize: 14,
                      lineHeight: 1.2,
                    }}
                  >
                    {chip}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
