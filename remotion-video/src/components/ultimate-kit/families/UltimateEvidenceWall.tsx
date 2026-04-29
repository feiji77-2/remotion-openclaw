import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {
  getUltimateManualGlyph,
  ULTIMATE_ICON_URLS,
  isUltimateManualGlyph,
  resolveUltimateIconPack,
  type UltimateIconName,
} from '../iconography';
import {
  resolveUltimateAccent,
  ultimateGlow,
  ultimateKitTokens,
  ultimateKitVideo,
} from '../tokens';
import {
  appendUltimateMicroJitter,
  createUltimateMicroJitter,
  resolveUltimateMicroJitterConfig,
} from '../motion';
import type {
  UltimateArchitectureMapProps,
  UltimateBenchmarkChartProps,
  UltimateCodeLine,
  UltimateCodePanelProps,
  UltimateCompareBoardProps,
  UltimateCtaPanelProps,
  UltimateDataStreamProps,
  UltimateEvidenceWallProps,
  UltimateFeatureCardRailProps,
  UltimateFocusDiagramProps,
  UltimateGlossaryTermProps,
  UltimateHeroPanelProps,
  UltimateMemoryGraphProps,
  UltimateMetricBarsProps,
  UltimateNumberStripProps,
  UltimatePlatformOverlayProps,
  UltimatePipelineFlowProps,
  UltimateQuoteHighlightProps,
  UltimateStageProps,
  UltimateStepFlowProps,
  UltimateSubtitleBarProps,
  UltimateTagMatrixProps,
  UltimateTerminalPanelProps,
  UltimateTimelineProps,
} from '../types';

const kit = ultimateKitTokens;

const panelStyle = (accentColor: string): CSSProperties => {
  return {
    borderRadius: kit.radius.lg,
    border: `1px solid ${accentColor}30`,
    background: `linear-gradient(180deg, ${accentColor}12, rgba(9, 12, 22, 0.94))`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 60px rgba(0,0,0,0.24), 0 0 42px ${accentColor}14`,
    overflow: 'hidden',
  };
};

const eyebrowStyle = (accentColor: string, centered = true): CSSProperties => {
  return {
    fontFamily: kit.fonts.ui,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 4.2,
    lineHeight: 1.2,
    textTransform: 'uppercase',
    color: accentColor,
    opacity: 0.92,
    textAlign: centered ? 'center' : 'left',
  };
};

const relaxedPanelPadding = {
  x: 32,
  y: 28,
  roomyX: 36,
  roomyY: 32,
} as const;

const relaxedTypeScale = {
  title: {
    lg: 56,
    md: 48,
    sm: 42,
  },
  body: {
    lg: 18,
    md: 17,
    sm: 16,
  },
} as const;

const sectionHeadingStyle = (size: number, centered = true): CSSProperties => ({
  fontFamily: kit.fonts.display,
  fontSize: size,
  fontWeight: 800,
  letterSpacing: -2.4,
  lineHeight: 1.08,
  textAlign: centered ? 'center' : 'left',
});

const bodyTextStyle = (
  size: number = relaxedTypeScale.body.lg,
  color: string = kit.colors.textMuted,
  centered = false,
): CSSProperties => ({
  fontSize: size,
  lineHeight: 1.64,
  color,
  textAlign: centered ? 'center' : 'left',
});

const overlineLabelStyle = (color: string): CSSProperties => ({
  fontSize: 18,
  lineHeight: 1.2,
  letterSpacing: 2.2,
  textTransform: 'uppercase',
  color,
  fontWeight: 700,
});

const buildReveal = (frame: number, delay = 0) => {
  return spring({
    fps: ultimateKitVideo.fps,
    frame: Math.max(0, frame - delay),
    config: {damping: 200, stiffness: 160},
  });
};

const withMicroJitter = (
  frame: number,
  baseTransform: string,
  config?: Parameters<typeof createUltimateMicroJitter>[1],
) => appendUltimateMicroJitter(baseTransform, createUltimateMicroJitter(frame, config));

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

const measureText = (value?: string) => Array.from(String(value || '').trim()).length;

const cleanDisplayText = (value?: string) => String(value || '').replace(/\s+/g, ' ').trim();

const trimLineBreakPunctuation = (value: string) => {
  return value.replace(/[，、：:]+$/u, '').trim();
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
  const countUnits = (items: string[]) =>
    items.reduce((total, item) => total + (/^[A-Za-z0-9.+\-']+$/u.test(item) ? item.length : 1), 0);

  if (countUnits(units) <= maxChars) {
    return [text];
  }

  const lines: string[] = [];
  let cursor = 0;

  while (cursor < units.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      const remainder = units.slice(cursor).join('').trim();
      if (countUnits(splitDisplayUnits(remainder)) <= maxChars) {
        lines.push(remainder);
      } else {
        let tailCount = 0;
        const tailUnits: string[] = [];

        for (let index = cursor; index < units.length; index += 1) {
          const nextWeight = /^[A-Za-z0-9.+\-']+$/u.test(units[index]) ? units[index].length : 1;
          if (tailCount + nextWeight > Math.max(1, maxChars - 1)) {
            break;
          }
          tailUnits.push(units[index]);
          tailCount += nextWeight;
        }

        if (tailUnits.length === 0) {
          const oversizedUnit = units[cursor] || '';
          const oversizedChars = Array.from(oversizedUnit);
          const forcedTail = oversizedChars.slice(0, Math.max(1, maxChars - 1)).join('');
          lines.push(`${trimLineBreakPunctuation(forcedTail)}…`);
        } else {
          lines.push(`${tailUnits.join('').trim()}…`);
        }
      }
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

    for (let index = splitIndex; index > cursor + Math.floor(maxChars * 0.35); index -= 1) {
      if (/[\s，、：:]/u.test(units[index - 1] || '')) {
        splitIndex = index;
        break;
      }
    }

    if (splitIndex === cursor) {
      const oversizedUnit = units[cursor] || '';
      const oversizedChars = Array.from(oversizedUnit);
      const forcedSegment = trimLineBreakPunctuation(oversizedChars.slice(0, maxChars).join(''));
      const remainder = oversizedChars.slice(maxChars).join('');

      if (forcedSegment) {
        lines.push(forcedSegment);
      }

      if (remainder) {
        units[cursor] = remainder;
      } else {
        cursor += 1;
      }

      while (cursor < units.length && /\s/u.test(units[cursor] || '')) {
        cursor += 1;
      }
      continue;
    }

    const segment = trimLineBreakPunctuation(units.slice(cursor, splitIndex).join(''));
    if (segment) {
      lines.push(segment);
    }
    cursor = splitIndex;
    while (cursor < units.length && /\s/u.test(units[cursor] || '')) {
      cursor += 1;
    }
  }

  return lines.filter(Boolean).slice(0, maxLines);
};

const splitDisplayLinesBalanced = (value: string, maxChars: number, maxLines = 2) => {
  const initial = splitDisplayLines(value, maxChars, maxLines);

  if (initial.length < 2) {
    return initial;
  }

  const tail = cleanDisplayText(initial[initial.length - 1] || '');
  const tailUnits = measureText(tail);
  const isOrphanAscii = /^[A-Za-z0-9.+\-']+[？?]?$/u.test(tail);

  if (!isOrphanAscii && tailUnits > Math.max(3, Math.floor(maxChars * 0.28))) {
    return initial;
  }

  const expanded = splitDisplayLines(value, maxChars + 2, maxLines);
  const expandedTailUnits = measureText(expanded[expanded.length - 1] || '');

  if (expanded.length <= initial.length && expandedTailUnits >= tailUnits) {
    return expanded;
  }

  return initial;
};

const lineClampStyle = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

type ArchitectureNodeCardMetrics = {
  labelLines: string[];
  detailLines: string[];
  labelSize: number;
  detailSize: number;
  cardWidth: number;
  cardHeight: number;
};

const estimateArchitectureNodeCard = (label: string, detail?: string): ArchitectureNodeCardMetrics => {
  const labelText = cleanDisplayText(label);
  const detailText = cleanDisplayText(detail);
  const labelLines = splitDisplayLinesBalanced(labelText, measureText(labelText) > 18 ? 10 : 12, 3);
  const detailLines = detailText ? splitDisplayLinesBalanced(detailText, 18, 2) : [];
  const labelSize = labelLines.length >= 3 ? 22 : labelLines.length === 2 ? 25 : 30;
  const detailSize = detailLines.length >= 2 ? 15 : 16;
  const labelBlockHeight = labelLines.length * labelSize * 1.14;
  const detailBlockHeight = detailLines.length > 0 ? 18 + detailLines.length * detailSize * 1.54 : 0;
  const cardWidth = labelLines.length >= 3 || detailLines.length >= 2 ? 328 : 314;
  const cardHeight = Math.max(156, Math.round(54 + Math.max(36, labelBlockHeight) + detailBlockHeight + 28));

  return {
    labelLines,
    detailLines,
    labelSize,
    detailSize,
    cardWidth,
    cardHeight,
  };
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

const semanticFallbackIcons: UltimateIconName[] = [
  'sparkles',
  'layers',
  'code',
  'messagesSquare',
  'zap',
  'arrowRight',
];

const resolveSemanticIcon = (
  iconValue: string | undefined,
  semanticText: string,
  fallbackIndex = 0,
  family?: string,
) => {
  const iconText = cleanDisplayText(iconValue);
  if (iconText && isUltimateManualGlyph(iconText)) {
    return null;
  }

  return resolveUltimateIconPack({
    hints: [semanticText, iconText],
    requested: iconText ? [iconText] : [],
    count: 1,
    family,
    seed: fallbackIndex,
  })[0] || semanticFallbackIcons[fallbackIndex % semanticFallbackIcons.length];
};

const SemanticIconGlyph: React.FC<{
  iconValue?: string;
  semanticText: string;
  color: string;
  size: number;
  fallbackIndex?: number;
  family?: string;
}> = ({
  iconValue,
  semanticText,
  color,
  size,
  fallbackIndex = 0,
  family,
}) => {
  const manualGlyph = getUltimateManualGlyph(iconValue);

  if (manualGlyph) {
    return (
      <span style={{color, fontSize: size * 0.72, fontWeight: 800, lineHeight: 1}}>
        {manualGlyph}
      </span>
    );
  }

  const icon = resolveSemanticIcon(iconValue, semanticText, fallbackIndex, family);

  if (!icon) {
    const text = cleanDisplayText(iconValue);
    return text ? (
      <span style={{color, fontSize: size * 0.72, fontWeight: 800, lineHeight: 1}}>{text}</span>
    ) : null;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        color,
        ...iconMaskStyle(icon),
      }}
    />
  );
};

const SemanticIconBadge: React.FC<{
  iconValue?: string;
  semanticText: string;
  color: string;
  badgeSize?: number;
  size?: number;
  fallbackIndex?: number;
  family?: string;
  rounded?: number;
  motionDelay?: number;
  motionSeed?: number;
}> = ({
  iconValue,
  semanticText,
  color,
  badgeSize = 46,
  size = 20,
  fallbackIndex = 0,
  family,
  rounded = 16,
  motionDelay = 0,
  motionSeed,
}) => {
  const frame = useCurrentFrame();
  const transform = withMicroJitter(frame, '', {
    delay: motionDelay,
    seed: motionSeed ?? fallbackIndex,
    amplitudeX: 0.9,
    amplitudeY: 0.8,
    rotateDeg: 0.32,
    scaleDelta: 0.003,
    settleFrames: 16,
  });

  return (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: rounded,
        border: `1px solid ${color}33`,
        background: `linear-gradient(180deg, ${color}16 0%, rgba(10, 13, 24, 0.88) 100%)`,
        boxShadow: ultimateGlow(color, 0.2),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transform,
      }}
    >
      <SemanticIconGlyph
        iconValue={iconValue}
        semanticText={semanticText}
        color={color}
        size={size}
        fallbackIndex={fallbackIndex}
        family={family}
      />
    </div>
  );
};

const parseCodeFacts = (lines: UltimateCodeLine[]) => {
  return lines
    .map((line) => {
      const match = cleanDisplayText(line.text).match(/^"?(.*?)"?\s*:\s*"(.+)"[,]?$/);
      if (!match) {
        return null;
      }

      return {
        label: cleanDisplayText(match[1].replace(/^"+|"+$/g, '')),
        value: cleanDisplayText(match[2].replace(/^"+|"+$/g, '')),
        tone: line.tone,
      };
    })
    .filter(Boolean) as Array<{label: string; value: string; tone?: UltimateCodeLine['tone']}>;
};

const parseDisplayNumericToken = (value?: string) => {
  const text = cleanDisplayText(value);
  const match = text.match(/-?\d+(?:\.\d+)?/);

  if (!match || match.index === undefined) {
    return null;
  }

  const numericValue = Number(match[0]);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    raw: match[0],
    value: numericValue,
    start: match.index,
    end: match.index + match[0].length,
    decimals: (match[0].split('.')[1] || '').length,
  };
};

const animateMetricDisplay = (value: string, progress: number) => {
  const token = parseDisplayNumericToken(value);

  if (!token) {
    return value;
  }

  const currentValue = token.value * progress;
  const roundedValue = token.decimals > 0
    ? currentValue.toFixed(token.decimals)
    : String(Math.round(currentValue));

  return `${value.slice(0, token.start)}${roundedValue}${value.slice(token.end)}`;
};

const renderCodeLineText = (
  text: string,
  accentColor: string,
  fallbackColor: string,
) => {
  const jsonStringMatch = text.match(/^(\s*)"([^"]+)"(\s*:\s*)"([^"]*)"(\s*,?)$/);
  const jsonNumberMatch = text.match(/^(\s*)"([^"]+)"(\s*:\s*)(-?\d+(?:\.\d+)?%?)(\s*,?)$/);
  const jsonBooleanMatch = text.match(/^(\s*)"([^"]+)"(\s*:\s*)(true|false|null)(\s*,?)$/);
  const quoteColor = 'rgba(255,255,255,0.52)';
  const keyColor = resolveUltimateAccent('cyan');
  const valueColor = accentColor;
  const numberColor = resolveUltimateAccent('yellow');
  const punctuationColor = 'rgba(255,255,255,0.34)';

  if (/^\s*[{}[\]]\s*,?\s*$/.test(text)) {
    return <span style={{color: fallbackColor}}>{text}</span>;
  }

  if (jsonStringMatch) {
    const [, indent, key, divider, value, comma] = jsonStringMatch;
    return (
      <>
        <span style={{color: punctuationColor}}>{indent}"</span>
        <span style={{color: keyColor}}>{key}</span>
        <span style={{color: punctuationColor}}>"{divider}"</span>
        <span style={{color: valueColor}}>{value}</span>
        <span style={{color: punctuationColor}}>"{comma}</span>
      </>
    );
  }

  if (jsonNumberMatch) {
    const [, indent, key, divider, value, comma] = jsonNumberMatch;
    return (
      <>
        <span style={{color: punctuationColor}}>{indent}"</span>
        <span style={{color: keyColor}}>{key}</span>
        <span style={{color: punctuationColor}}>"{divider}</span>
        <span style={{color: numberColor}}>{value}</span>
        <span style={{color: punctuationColor}}>{comma}</span>
      </>
    );
  }

  if (jsonBooleanMatch) {
    const [, indent, key, divider, value, comma] = jsonBooleanMatch;
    return (
      <>
        <span style={{color: punctuationColor}}>{indent}"</span>
        <span style={{color: keyColor}}>{key}</span>
        <span style={{color: punctuationColor}}>"{divider}</span>
        <span style={{color: resolveUltimateAccent('green')}}>{value}</span>
        <span style={{color: punctuationColor}}>{comma}</span>
      </>
    );
  }

  return <span style={{color: fallbackColor}}>{text}</span>;
};

type FrameCorner = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
};

const frameCorners: FrameCorner[] = [
  {top: 28, left: 28, borderTop: true, borderLeft: true},
  {top: 28, right: 28, borderTop: true, borderRight: true},
  {bottom: 28, left: 28, borderBottom: true, borderLeft: true},
  {bottom: 28, right: 28, borderBottom: true, borderRight: true},
];



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
  const center = {x: 960, y: 562};
  const positions = [
    {top: 332, left: 116, width: 470, labelAnchorX: 574, labelAnchorY: 432, nodeX: 598, nodeY: 448, rotate: -1.5, align: 'left' as const},
    {top: 310, left: 1308, width: 452, labelAnchorX: 1316, labelAnchorY: 420, nodeX: 1290, nodeY: 436, rotate: 1.2, align: 'right' as const},
    {top: 708, left: 402, width: 1120, labelAnchorX: 958, labelAnchorY: 674, nodeX: 960, nodeY: 656, rotate: -0.8, align: 'center' as const},
  ];
  const sampleCubic = (
    t: number,
    p0: {x: number; y: number},
    p1: {x: number; y: number},
    p2: {x: number; y: number},
    p3: {x: number; y: number},
  ) => {
    const inverse = 1 - t;
    return {
      x: (inverse ** 3) * p0.x
        + 3 * (inverse ** 2) * t * p1.x
        + 3 * inverse * (t ** 2) * p2.x
        + (t ** 3) * p3.x,
      y: (inverse ** 3) * p0.y
        + 3 * (inverse ** 2) * t * p1.y
        + 3 * inverse * (t ** 2) * p2.y
        + (t ** 3) * p3.y,
    };
  };

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 130, right: 130}}>
        <div style={eyebrowStyle(accentColor, false)}>证据层</div>
        <div
          style={{
            marginTop: 22,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg, false),
            maxWidth: 1100,
          }}
        >
          {heading}
        </div>
        {summary ? (
          <div
            style={{
              marginTop: 22,
              maxWidth: 720,
              ...bodyTextStyle(18),
            }}
          >
            {summary}
          </div>
        ) : null}
      </div>
      <GeometryAccent
        variant="ring"
        color={accentColor}
        opacity={0.22}
        style={{
          left: center.x - 104,
          top: center.y - 104,
          width: 208,
          height: 208,
        }}
      />
      <GeometryAccent
        variant="slanted-panel"
        color={resolveUltimateAccent('cyan')}
        opacity={0.12}
        style={{
          left: 172,
          top: 246,
          width: 280,
          height: 90,
        }}
      />
      <GeometryAccent
        variant="arc"
        color={resolveUltimateAccent('purple')}
        opacity={0.16}
        style={{
          right: 188,
          top: 236,
          width: 240,
          height: 120,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: center.x - 72,
          top: center.y - 72,
          width: 144,
          height: 144,
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
        {visibleCards.map((card, index) => {
          const position = positions[index] || positions[positions.length - 1];
          const cardColor = toneToColor(card.accent ?? accent);
          const delay = Math.round(pacingWindow * 0.08 * (index + 1));
          const p0 = {x: center.x, y: center.y};
          const p1 = {x: center.x + (position.nodeX > center.x ? 120 : -120), y: center.y + (index === 2 ? 84 : -28)};
          const p2 = {x: position.nodeX + (position.nodeX > center.x ? -110 : 110), y: position.nodeY + (index === 2 ? -72 : 26)};
          const p3 = {x: position.nodeX, y: position.nodeY};
          const progress = interpolate(frame, [delay, delay + 28], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const point = sampleCubic(Math.max(0.01, progress), p0, p1, p2, p3);

          return (
            <PathDrawLink
              key={`${card.source}-link`}
              d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
              color={cardColor}
              progress={progress}
              frame={frame}
              marker={{
                x: point.x,
                y: point.y,
                size: 7,
                shape: index === 2 ? 'ring' : 'diamond',
              }}
              baseStrokeWidth={4}
              flowStrokeWidth={7}
              drawStrokeWidth={2}
              dashPattern="12 16"
              flowOpacity={0.66}
            />
          );
        })}
      </svg>
      {visibleCards.map((card, index) => {
        const delay = Math.round(pacingWindow * 0.08 * (index + 1));
        const reveal = buildReveal(frame, delay);
        const cardColor = toneToColor(card.accent ?? accent);
        const position = positions[index] || positions[positions.length - 1];
        const alignStyle =
          position.align === 'right'
            ? {textAlign: 'right' as const}
            : position.align === 'center'
              ? {textAlign: 'center' as const}
              : {textAlign: 'left' as const};

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
                `translateY(${interpolate(reveal, [0, 1], [18, 0])}px) rotate(${position.rotate}deg)`,
                resolveUltimateMicroJitterConfig('steady', {
                  delay,
                  seed: 150 + index,
                }),
              ),
              ...alignStyle,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: position.align === 'right' ? 'auto' : position.align === 'center' ? '50%' : -10,
                right: position.align === 'right' ? -10 : 'auto',
                top: 18,
                width: 74,
                height: 2,
                background: `linear-gradient(90deg, ${cardColor}, transparent)`,
                transform: position.align === 'center' ? 'translateX(-50%)' : undefined,
                opacity: 0.8,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: position.align === 'right' ? 'auto' : position.align === 'center' ? '50%' : -8,
                right: position.align === 'right' ? -8 : 'auto',
                top: 0,
                fontSize: 112,
                lineHeight: 0.9,
                color: `${cardColor}12`,
                fontWeight: 900,
                transform: position.align === 'center' ? 'translateX(-50%)' : undefined,
              }}
            >
              "
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                flexDirection: position.align === 'right' ? 'row-reverse' : 'row',
                padding: '12px 16px',
                borderRadius: kit.radius.pill,
                border: `1px solid ${cardColor}30`,
                color: cardColor,
                background: `${cardColor}12`,
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
                family="evidence-wall"
                rounded={12}
                motionDelay={delay}
                motionSeed={150 + index}
              />
              <span>{card.source}</span>
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: index === 2 ? 34 : 30,
                lineHeight: 1.44,
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
                  ...bodyTextStyle(17, 'rgba(255,255,255,0.66)', position.align !== 'left'),
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
                  justifyContent: position.align === 'right' ? 'flex-end' : position.align === 'center' ? 'center' : 'flex-start',
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
