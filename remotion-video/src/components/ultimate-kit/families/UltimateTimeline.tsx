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
    config: {damping: 200, stiffness: 140},
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



export const UltimateTimeline: React.FC<UltimateTimelineProps & {grammar?: {staggerGap?: number}}> = ({
  heading,
  summary,
  items,
  accent = 'cyan',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(6, grammar?.staggerGap ?? 6);
  const baseDelay = 6;
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 5);
  const points = [
    {x: 236, y: 596, labelX: -8, labelY: -136, align: 'left' as const},
    {x: 600, y: 458, labelX: -18, labelY: -154, align: 'left' as const},
    {x: 966, y: 616, labelX: -110, labelY: 34, align: 'center' as const},
    {x: 1326, y: 444, labelX: -246, labelY: -150, align: 'right' as const},
    {x: 1674, y: 586, labelX: -250, labelY: 30, align: 'right' as const},
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
  const segments = visibleItems.slice(0, -1).map((item, index) => {
    const from = points[index];
    const to = points[index + 1];
    const p0 = {x: from.x, y: from.y};
    const p1 = {x: from.x + 132, y: from.y + (index % 2 === 0 ? -22 : 26)};
    const p2 = {x: to.x - 132, y: to.y + (index % 2 === 0 ? -26 : 22)};
    const p3 = {x: to.x, y: to.y};
    return {
      key: `${item.label}-${index}`,
      color: toneToColor(item.accent ?? accent),
      p0,
      p1,
      p2,
      p3,
      d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    };
  });

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 94, left: 160, right: 160}}>
        <div style={eyebrowStyle(accentColor)}>时间线</div>
        <div
          style={{
            marginTop: 22,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg),
          }}
        >
          {heading}
        </div>
        {summary ? (
          <div
            style={{
              margin: '22px auto 0',
              maxWidth: 1040,
              ...bodyTextStyle(18, kit.colors.textMuted, true),
            }}
          >
            {summary}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 316,
          bottom: 118,
          borderRadius: 44,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(6, 9, 18, 0.7), rgba(6, 9, 18, 0.52))',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <GeometryAccent
          variant="slanted-panel"
          color={accentColor}
          opacity={0.14}
          style={{
            left: 92,
            top: 68,
            width: 420,
            height: 106,
          }}
        />
        <GeometryAccent
          variant="ring"
          color={resolveUltimateAccent('purple')}
          opacity={0.24}
          style={{
            right: 118,
            bottom: 96,
            width: 186,
            height: 186,
          }}
        />
        <svg viewBox="0 0 1720 720" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          {segments.map((segment, index) => {
            const delay = 10 + index * gap * 5;
            const progress = interpolate(frame, [delay, delay + 26], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const point = sampleCubic(Math.max(0.01, progress), segment.p0, segment.p1, segment.p2, segment.p3);

            return (
              <PathDrawLink
                key={segment.key}
                d={segment.d}
                color={segment.color}
                progress={progress}
                frame={frame}
                marker={{
                  x: point.x,
                  y: point.y,
                  size: 6,
                  shape: 'diamond',
                }}
                baseStrokeWidth={4}
                flowStrokeWidth={7}
                drawStrokeWidth={2}
                dashPattern="12 14"
                flowOpacity={0.7}
              />
            );
          })}
        </svg>
        {visibleItems.map((item, index) => {
          const delay = baseDelay + index * gap * 5;
          const reveal = buildReveal(frame, delay);
          const itemColor = toneToColor(item.accent ?? accent);
          const point = points[index];
          const labelLines = splitDisplayLinesBalanced(item.title, 12, 2);
          const detailLines = item.detail ? splitDisplayLinesBalanced(item.detail, 18, 2) : [];

          return (
            <div key={`${item.label}-${index}`}>
              <div
                style={{
                  position: 'absolute',
                  left: point.x - 16,
                  top: point.y - 16,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(8,10,18,0.92)',
                  border: `2px solid ${itemColor}`,
                  boxShadow: ultimateGlow(itemColor, 0.38),
                  opacity: reveal,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: point.x - 42,
                  top: point.y - 42,
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  border: `1px solid ${itemColor}22`,
                  opacity: 0.24 + Math.sin(frame * 0.06 + index) * 0.08,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: point.x + point.labelX,
                  top: point.y + point.labelY,
                  width: 252,
                  textAlign: point.align,
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                    resolveUltimateMicroJitterConfig('steady', {
                      delay,
                      seed: 70 + index,
                    }),
                  ),
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    flexDirection: point.align === 'right' ? 'row-reverse' : 'row',
                    padding: '8px 14px',
                    borderRadius: kit.radius.pill,
                    border: `1px solid ${itemColor}30`,
                    background: `${itemColor}10`,
                    color: itemColor,
                    fontSize: 15,
                    lineHeight: 1.2,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                >
                  <SemanticIconBadge
                    iconValue={item.icon}
                    semanticText={`${item.label} ${item.title} ${item.detail || ''}`}
                    color={itemColor}
                    badgeSize={32}
                    size={14}
                    fallbackIndex={index}
                    family="timeline"
                    rounded={12}
                    motionDelay={delay}
                    motionSeed={70 + index}
                  />
                  <span>{item.label}</span>
                </div>
                <div style={{marginTop: 16}}>
                  {labelLines.map((line, lineIndex) => (
                    <div
                      key={`${line}-${lineIndex}`}
                      style={{
                        marginTop: lineIndex === 0 ? 0 : 3,
                        fontSize: 30,
                        fontWeight: 820,
                        lineHeight: 1.1,
                        color: kit.colors.text,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                {detailLines.length > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      ...bodyTextStyle(16, 'rgba(255,255,255,0.66)', point.align === 'center'),
                      ...(point.align === 'right' ? {textAlign: 'right' as const} : point.align === 'center' ? {textAlign: 'center' as const} : {textAlign: 'left' as const}),
                    }}
                  >
                    {detailLines.map((line, lineIndex) => (
                      <div key={`${line}-${lineIndex}`} style={{marginTop: lineIndex === 0 ? 0 : 3}}>
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
