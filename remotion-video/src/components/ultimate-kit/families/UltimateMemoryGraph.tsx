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



export const UltimateMemoryGraph: React.FC<UltimateMemoryGraphProps> = ({
  heading,
  summary,
  centerTitle,
  centerDetail,
  nodes,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleNodes = nodes.slice(0, 4);
  const center = {x: 960, y: 580};
  const headingLines = splitDisplayLinesBalanced(heading, 18, 2);
  const centerDetailLines = centerDetail ? splitDisplayLinesBalanced(centerDetail, 26, 2) : [];
  const nodeSlots = [
    {x: 346, y: 386, labelX: 48, labelY: -42, align: 'left' as const},
    {x: 1544, y: 364, labelX: -276, labelY: -34, align: 'right' as const},
    {x: 1328, y: 810, labelX: -260, labelY: 18, align: 'right' as const},
    {x: 540, y: 832, labelX: -100, labelY: 18, align: 'center' as const},
  ];
  const sampleCubic = (
    t: number,
    p0: {x: number; y: number},
    p1: {x: number; y: number},
    p2: {x: number; y: number},
    p3: {x: number; y: number},
  ) => {
    const inverse = 1 - t;
    const x = (inverse ** 3) * p0.x
      + 3 * (inverse ** 2) * t * p1.x
      + 3 * inverse * (t ** 2) * p2.x
      + (t ** 3) * p3.x;
    const y = (inverse ** 3) * p0.y
      + 3 * (inverse ** 2) * t * p1.y
      + 3 * inverse * (t ** 2) * p2.y
      + (t ** 3) * p3.y;
    return {x, y};
  };
  const links = visibleNodes.map((node, index) => {
    const slot = nodeSlots[index] || nodeSlots[nodeSlots.length - 1];
    const dx = slot.x - center.x;
    const dy = slot.y - center.y;
    const bendY = index % 2 === 0 ? -44 : 34;
    const p0 = {x: center.x, y: center.y};
    const p1 = {x: center.x + dx * 0.3, y: center.y + bendY};
    const p2 = {x: center.x + dx * 0.74, y: center.y + dy * 0.84};
    const p3 = {x: slot.x, y: slot.y};
    return {
      key: `${node.label}-${index}`,
      node,
      slot,
      p0,
      p1,
      p2,
      p3,
      d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    };
  });

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 108, left: 140, right: 140}}>
        <div style={eyebrowStyle(accentColor)}>记忆图谱</div>
        <div style={{marginTop: 22}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 6,
                ...sectionHeadingStyle(relaxedTypeScale.title.lg),
              }}
            >
              {line}
            </div>
          ))}
        </div>
        {summary ? (
          <div
            style={{
              margin: '22px auto 0',
              maxWidth: 900,
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
          left: 0,
          right: 0,
          top: 240,
          bottom: 0,
        }}
      >
        <svg viewBox="0 0 1920 840" style={{width: '100%', height: '100%', overflow: 'visible'}}>
          {links.map((link, index) => {
            const nodeColor = toneToColor(link.node.accent ?? accent);
            const linkDelay = 12 + index * 10;
            const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const point = sampleCubic(Math.max(0.01, linkProgress), link.p0, link.p1, link.p2, link.p3);
            return (
              <React.Fragment key={link.key}>
                <PathDrawLink
                  d={link.d}
                  color={nodeColor}
                  progress={linkProgress}
                  frame={frame}
                  marker={{
                    x: point.x,
                    y: point.y,
                    size: 5,
                    shape: 'circle',
                  }}
                  baseStrokeWidth={2}
                  flowStrokeWidth={4}
                  drawStrokeWidth={1.5}
                  dashPattern="8 12"
                  flowOpacity={0.52}
                />
              </React.Fragment>
            );
          })}
        </svg>
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.14}
          style={{
            left: center.x - 226,
            top: center.y - 226,
            width: 452,
            height: 452,
          }}
        />
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.2}
          style={{
            left: center.x - 168,
            top: center.y - 168,
            width: 336,
            height: 336,
          }}
        />
        <GeometryAccent
          variant="arc"
          color={accentColor}
          opacity={0.16}
          style={{
            left: center.x - 240,
            top: center.y - 200,
            width: 480,
            height: 120,
          }}
        />
        <GeometryAccent
          variant="arc"
          color={accentColor}
          opacity={0.12}
          style={{
            left: center.x - 260,
            top: center.y + 124,
            width: 520,
            height: 140,
            transform: 'scaleY(-1)',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: center.x - 190,
          top: center.y - 190,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.22), ${accentColor} 24%, rgba(8, 10, 18, 0.98) 72%)`,
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 0 0 18px ${accentColor}08, ${ultimateGlow(accentColor, 0.24)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: withMicroJitter(frame, '', {
            delay: 6,
            amplitudeX: 0.8,
            amplitudeY: 0.8,
            rotateDeg: 0.12,
            scaleDelta: 0.002,
            seed: 340,
          }),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 26,
            borderRadius: '50%',
            border: `1px solid ${accentColor}24`,
            opacity: 0.34 + Math.sin(frame * 0.05) * 0.08,
          }}
        />
        <div style={{width: 250}}>
          <div style={{fontSize: 15, letterSpacing: 2.2, color: accentColor, textTransform: 'uppercase'}}>memory core</div>
          <div style={{marginTop: 18, fontSize: 44, fontWeight: 840, lineHeight: 1.08}}>{centerTitle}</div>
          {centerDetail ? (
            <div style={{marginTop: 18, ...bodyTextStyle(17, 'rgba(255,255,255,0.68)', true)}}>
              {centerDetailLines.map((line, index) => (
                <div key={`${line}-${index}`} style={{marginTop: index === 0 ? 0 : 4}}>
                  {line}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {links.map((link, index) => {
        const nodeColor = toneToColor(link.node.accent ?? accent);
        const linkDelay = 12 + index * 10;
        const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const reveal = interpolate(linkProgress, [0.7, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const labelLines = splitDisplayLinesBalanced(link.node.label, 12, 2);
        const detailLines = link.node.detail ? splitDisplayLinesBalanced(link.node.detail, 18, 2) : [];
        const alignStyle = link.slot.align === 'right'
          ? ({textAlign: 'right' as const, alignItems: 'flex-end' as const})
          : link.slot.align === 'center'
            ? ({textAlign: 'center' as const, alignItems: 'center' as const})
            : ({textAlign: 'left' as const, alignItems: 'flex-start' as const});

        return (
          <div key={`${link.key}-cluster`}>
            <div
              style={{
                position: 'absolute',
                left: link.slot.x - 16,
                top: link.slot.y - 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(8,10,18,0.94)',
                border: `2px solid ${nodeColor}`,
                boxShadow: ultimateGlow(nodeColor, 0.34),
                opacity: reveal,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: link.slot.x + link.slot.labelX,
                top: link.slot.y + link.slot.labelY,
                width: 260,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                opacity: reveal,
                ...alignStyle,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                  {
                    delay: linkDelay,
                    amplitudeX: 0.9,
                    amplitudeY: 0.8,
                    rotateDeg: 0.16,
                    scaleDelta: 0.002,
                    seed: 360 + index,
                  },
                ),
              }}
            >
              <SemanticIconBadge
                iconValue={link.node.icon}
                semanticText={`${link.node.label} ${link.node.detail || ''}`}
                color={nodeColor}
                badgeSize={40}
                size={16}
                fallbackIndex={index}
                family="memory-graph"
                rounded={14}
                motionDelay={linkDelay}
                motionSeed={360 + index}
              />
              <div>
                {labelLines.map((line, lineIndex) => (
                  <div
                    key={`${line}-${lineIndex}`}
                    style={{
                      marginTop: lineIndex === 0 ? 0 : 3,
                      fontSize: 30,
                      fontWeight: 820,
                      lineHeight: 1.08,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
              {detailLines.length > 0 ? (
                <div style={{...bodyTextStyle(16, 'rgba(255,255,255,0.64)', link.slot.align === 'center')}}>
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
  );
};
