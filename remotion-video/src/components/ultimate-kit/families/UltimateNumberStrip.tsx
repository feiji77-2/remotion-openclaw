import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {GeometryAccent, PathDrawLink, RadialGauge} from '../../visual-atoms';
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
import {appendUltimateMicroJitter, createUltimateMicroJitter} from '../motion';
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



export const UltimateNumberStrip: React.FC<UltimateNumberStripProps> = ({
  count,
  heading,
  summary,
  items,
  accent = 'green',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const reveal = buildReveal(frame, 0);
  const headingLines = splitDisplayLinesBalanced(heading, 16, 3);
  const summaryLines = splitDisplayLinesBalanced(summary || '', 24, 2);
  const headingSize = headingLines.length > 2 ? 44 : headingLines.length > 1 ? 50 : measureText(heading) > 15 ? 54 : 56;
  const primaryItem = items[0];
  const secondaryItems = items.slice(1, 4);
  const countToken = parseDisplayNumericToken(count);
  const countProgress = countToken
    ? Math.max(0.34, Math.min(0.96, countToken.value > 1 ? (countToken.value % 100) / 100 : countToken.value))
    : Math.max(0.42, Math.min(0.88, 0.46 + Math.min(measureText(count), 6) * 0.07));
  const primaryProgress = 0.88;
  const secondaryProgress = secondaryItems.map((item, index) => (
    Math.max(0.38, Math.min(0.84, 0.72 - index * 0.12 + (item.chips?.length || 0) * 0.03))
  ));
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
  const coreAnchor = {x: 286, y: 220};
  const satellitePresets = [
    {x: 210, y: 442, labelX: -58, labelY: 78, width: 320, align: 'left' as const},
    {x: 812, y: 494, labelX: -160, labelY: 72, width: 320, align: 'center' as const},
    {x: 1394, y: 434, labelX: -302, labelY: 84, width: 330, align: 'right' as const},
  ];

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div
        style={{
          position: 'absolute',
          top: 132,
          left: 170,
          right: 170,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: reveal,
        }}
      >
        <RadialGauge
          progress={interpolate(frame, [0, 22], [0, countProgress], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
          color={accentColor}
          size={118}
          strokeWidth={12}
          valueLabel={count}
          subtitle="count"
        />
        <div style={{maxWidth: 1240, textAlign: 'center'}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                fontSize: headingSize,
                fontWeight: 800,
                letterSpacing: -1.6,
                lineHeight: 1.12,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        {summaryLines.length > 0 ? (
          <div style={{maxWidth: 980, textAlign: 'center'}}>
            {summaryLines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                style={{
                  marginTop: index === 0 ? 0 : 6,
                  ...bodyTextStyle(18, kit.colors.textMuted, true),
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 150,
          right: 150,
          top: 338,
          bottom: 118,
        }}
      >
        <GeometryAccent
          variant="slanted-panel"
          color={accentColor}
          opacity={0.12}
          style={{
            left: 420,
            top: 42,
            width: 310,
            height: 90,
          }}
        />
        <GeometryAccent
          variant="ring"
          color={resolveUltimateAccent('cyan')}
          opacity={0.16}
          style={{
            left: 36,
            top: 60,
            width: 252,
            height: 252,
          }}
        />
        <GeometryAccent
          variant="arc"
          color={resolveUltimateAccent('purple')}
          opacity={0.16}
          style={{
            right: 86,
            top: 64,
            width: 240,
            height: 120,
          }}
        />
        <svg viewBox="0 0 1620 620" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          {secondaryItems.map((item, index) => {
            const point = satellitePresets[index];
            if (!point) {
              return null;
            }
            const color = toneToColor(item.accent ?? (index === 0 ? 'green' : index === 1 ? 'yellow' : 'purple'));
            const delay = 14 + index * 6;
            const progress = interpolate(frame, [delay, delay + 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const p0 = coreAnchor;
            const p1 =
              index === 0
                ? {x: 270, y: 314}
                : index === 1
                  ? {x: 522, y: 252}
                  : {x: 716, y: 108};
            const p2 =
              index === 0
                ? {x: 246, y: 386}
                : index === 1
                  ? {x: 640, y: 454}
                  : {x: 1104, y: 282};
            const p3 = {x: point.x, y: point.y};
            const markerPoint = sampleCubic(Math.max(0.01, progress), p0, p1, p2, p3);

            return (
              <PathDrawLink
                key={`${item.label}-orbit`}
                d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
                color={color}
                progress={progress}
                frame={frame}
                marker={{
                  x: markerPoint.x,
                  y: markerPoint.y,
                  size: index === 2 ? 7 : 6,
                  shape: index === 1 ? 'ring' : 'diamond',
                }}
                baseStrokeWidth={4}
                flowStrokeWidth={7}
                drawStrokeWidth={2}
                dashPattern="12 16"
                flowOpacity={0.68}
              />
            );
          })}
        </svg>
        {primaryItem ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: 44,
                top: 86,
                opacity: buildReveal(frame, 8),
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(buildReveal(frame, 8), [0, 1], [18, 0])}px)`,
                  {
                    delay: 8,
                    amplitudeX: 1.1,
                    amplitudeY: 0.9,
                    rotateDeg: 0.18,
                    scaleDelta: 0.002,
                    seed: 8,
                  },
                ),
              }}
            >
              <RadialGauge
                progress={interpolate(frame, [8, 30], [0, primaryProgress], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
                color={toneToColor(primaryItem.accent ?? accent)}
                size={236}
                strokeWidth={14}
                valueLabel={primaryItem.tag || 'CORE'}
                subtitle="signal"
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 342,
                right: 68,
                top: 76,
                opacity: buildReveal(frame, 10),
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(buildReveal(frame, 10), [0, 1], [20, 0])}px)`,
                  {
                    delay: 10,
                    amplitudeX: 1.1,
                    amplitudeY: 0.8,
                    rotateDeg: 0.14,
                    scaleDelta: 0.0018,
                    seed: 11,
                  },
                ),
              }}
            >
              {(() => {
                const allowPrimaryThreeLines = measureText(primaryItem.label) > 20;
                const primaryLines = splitDisplayLinesBalanced(
                  primaryItem.label,
                  allowPrimaryThreeLines ? 20 : 24,
                  allowPrimaryThreeLines ? 3 : 2,
                );
                const primarySize = primaryLines.length > 2 ? 34 : primaryLines.length > 1 ? 40 : 48;
                const primaryColor = toneToColor(primaryItem.accent ?? accent);

                return (
                  <>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 14,
                        ...overlineLabelStyle(primaryColor),
                      }}
                    >
                      <SemanticIconBadge
                        semanticText={`${primaryItem.tag || '核心判断'} ${primaryItem.label} ${primaryItem.detail || ''}`}
                        color={primaryColor}
                        badgeSize={38}
                        size={16}
                        family="number-strip"
                        motionDelay={8}
                        motionSeed={8}
                      />
                      {primaryItem.tag || '核心判断'}
                    </div>
                    <div style={{marginTop: 18, maxWidth: 920}}>
                      {primaryLines.map((line, index) => (
                        <div
                          key={`${line}-${index}`}
                          style={{
                            fontSize: primarySize,
                            fontWeight: 820,
                            lineHeight: 1.1,
                            color: kit.colors.text,
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                    {primaryItem.detail ? (
                      <div style={{marginTop: 14, maxWidth: 860, ...bodyTextStyle(18, 'rgba(255,255,255,0.68)')}}>
                        {primaryItem.detail}
                      </div>
                    ) : null}
                    {(primaryItem.chips || []).length > 0 ? (
                      <div
                        style={{
                          marginTop: 22,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        {(primaryItem.chips || []).slice(0, 4).map((chip, index) => (
                          <div
                            key={`${chip}-${index}`}
                            style={{
                              padding: '10px 14px',
                              borderRadius: kit.radius.pill,
                              border: `1px solid ${primaryColor}24`,
                              background: 'rgba(255,255,255,0.03)',
                              fontSize: 15,
                              fontWeight: 700,
                              color: primaryColor,
                            }}
                          >
                            {chip}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </>
        ) : null}
        {secondaryItems.map((item, index) => {
          const point = satellitePresets[index];
          if (!point) {
            return null;
          }

          const color = toneToColor(item.accent ?? (index === 0 ? 'green' : index === 1 ? 'yellow' : 'purple'));
          const chipReveal = buildReveal(frame, 16 + index * 6);
          const itemLines = splitDisplayLinesBalanced(item.label, 14, 3);
          const detailLines = splitDisplayLinesBalanced(item.detail || '', 18, 2);
          const chips = (item.chips || []).slice(0, 3);
          const alignStyle =
            point.align === 'right'
              ? {textAlign: 'right' as const}
              : point.align === 'center'
                ? {textAlign: 'center' as const}
                : {textAlign: 'left' as const};

          return (
            <div key={`${item.label}-${index}`}>
              <div
                style={{
                  position: 'absolute',
                  left: point.x - 64,
                  top: point.y - 64,
                  width: 128,
                  height: 128,
                  opacity: chipReveal,
                }}
              >
                <RadialGauge
                  progress={interpolate(frame, [16 + index * 6, 38 + index * 6], [0, secondaryProgress[index] ?? 0.6], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })}
                  color={color}
                  size={128}
                  strokeWidth={10}
                  valueLabel={String(index + 1)}
                  subtitle={item.tag || 'signal'}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: point.x + point.labelX,
                  top: point.y + point.labelY,
                  width: point.width,
                  opacity: chipReveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(chipReveal, [0, 1], [18, 0])}px)`,
                    {
                      delay: 16 + index * 6,
                      amplitudeX: 1.1,
                      amplitudeY: 0.9,
                      rotateDeg: 0.22,
                      scaleDelta: 0.0025,
                      seed: 20 + index,
                    },
                  ),
                  ...alignStyle,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    flexDirection: point.align === 'right' ? 'row-reverse' : 'row',
                    ...overlineLabelStyle(color),
                    fontSize: 17,
                  }}
                >
                  <SemanticIconBadge
                    semanticText={`${item.tag || `补充 ${index + 1}`} ${item.label} ${item.detail || ''}`}
                    color={color}
                    badgeSize={34}
                    size={14}
                    fallbackIndex={index}
                    family="number-strip"
                    rounded={12}
                    motionDelay={16 + index * 6}
                    motionSeed={20 + index}
                  />
                  {item.tag || `补充 ${index + 1}`}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    width: point.align === 'center' ? 128 : 88,
                    height: 2,
                    background: `linear-gradient(90deg, ${color}, transparent)`,
                    opacity: 0.76,
                    marginLeft: point.align === 'right' ? 'auto' : point.align === 'center' ? 'auto' : 0,
                    marginRight: point.align === 'center' ? 'auto' : 0,
                  }}
                />
                <div style={{marginTop: 14}}>
                  {itemLines.map((line, lineIndex) => (
                    <div
                      key={`${line}-${lineIndex}`}
                      style={{
                        fontSize: itemLines.length > 2 ? 28 : 32,
                        fontWeight: 800,
                        lineHeight: 1.14,
                        color: kit.colors.text,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                {detailLines.length > 0 ? (
                  <div style={{marginTop: 12}}>
                    {detailLines.map((line, lineIndex) => (
                      <div
                        key={`${line}-${lineIndex}`}
                        style={{
                          marginTop: lineIndex === 0 ? 0 : 5,
                          ...bodyTextStyle(16, 'rgba(255,255,255,0.66)', point.align !== 'left'),
                          ...alignStyle,
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
                {chips.length > 0 ? (
                  <div
                    style={{
                      marginTop: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      justifyContent: point.align === 'right' ? 'flex-end' : point.align === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    {chips.map((chip, chipIndex) => (
                      <div
                        key={`${chip}-${chipIndex}`}
                        style={{
                          padding: '10px 14px',
                          borderRadius: kit.radius.pill,
                          border: `1px solid ${color}24`,
                          background: 'rgba(255,255,255,0.03)',
                          fontSize: 14,
                          fontWeight: 700,
                          color,
                        }}
                      >
                        {chip}
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
