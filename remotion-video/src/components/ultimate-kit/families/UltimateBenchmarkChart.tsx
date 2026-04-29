import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {GeometryAccent, PathDrawLink, TextMaskWipe} from '../../visual-atoms';
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
    config: {damping: 200, stiffness: 330},
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



export const UltimateBenchmarkChart: React.FC<UltimateBenchmarkChartProps> = ({
  heading,
  summary,
  primaryLabel,
  secondaryLabel,
  items,
  accent = 'yellow',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 3);
  const primaryColor = resolveUltimateAccent('cyan');
  const secondaryLegendColor = resolveUltimateAccent('yellow');
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
  const buildCurve = (ratio: number, rowIndex: number, variant: 'primary' | 'secondary') => {
    const startY = variant === 'primary' ? 78 : 96;
    const softness = variant === 'primary' ? 1 : 0.78;
    const crest = 18 + ratio * 44 * softness + rowIndex * 2;
    const endLift = 12 + ratio * 38 * softness;
    const p0 = {x: 28, y: startY};
    const p1 = {x: 210, y: startY - crest * 0.42};
    const p2 = {x: 560, y: Math.max(16, startY - crest)};
    const p3 = {x: 948, y: Math.max(14, startY - endLift)};
    return {
      d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
      p0,
      p1,
      p2,
      p3,
    };
  };

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 114, left: 160, right: 160}}>
        <div style={eyebrowStyle(accentColor)}>性能对比</div>
        <div
          style={{
            position: 'relative',
            marginTop: 22,
            height: 72,
          }}
        >
          <TextMaskWipe
            text={heading}
            direction="down"
            startFrame={0}
            durationFrames={26}
            fontFamily={kit.fonts.display}
            fontSize={relaxedTypeScale.title.lg}
            fontWeight={800}
            color={kit.colors.text}
            textStyle={sectionHeadingStyle(relaxedTypeScale.title.lg)}
          />
        </div>
        {summary ? (
          <div style={{margin: '22px auto 0', maxWidth: 920, ...bodyTextStyle(18, kit.colors.textMuted, true)}}>
            {summary}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 320,
          bottom: 118,
          padding: '24px 24px 26px',
        }}
      >
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.24}
          style={{
            right: 34,
            top: 18,
            width: 220,
            height: 220,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 54,
            right: 54,
            bottom: 24,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${accentColor}14, transparent)`,
          }}
        />
        <GeometryAccent
          variant="slanted-panel"
          color={accentColor}
          opacity={0.12}
          style={{
            left: 54,
            top: 38,
            width: 240,
            height: 86,
          }}
        />
        <GeometryAccent
          variant="arc"
          color={resolveUltimateAccent('purple')}
          opacity={0.14}
          style={{
            right: 278,
            bottom: 40,
            width: 220,
            height: 120,
          }}
        />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 24}}>
          <div style={{fontSize: 14, letterSpacing: 2.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)'}}>
            Path draw / line storytelling
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 20}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, color: primaryColor, fontSize: 16, lineHeight: 1.2}}>
              <div style={{width: 12, height: 12, borderRadius: '50%', background: primaryColor}} />
              {primaryLabel}
            </div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, color: secondaryLegendColor, fontSize: 16, lineHeight: 1.2}}>
              <div style={{width: 12, height: 12, borderRadius: '50%', background: secondaryLegendColor}} />
              {secondaryLabel}
            </div>
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          {visibleItems.map((item, index) => {
            const gap = Math.max(6, grammar?.staggerGap ?? 6);
            const delay = 8 + index * gap;
            const reveal = buildReveal(frame, delay);
            const secondaryColor = toneToColor(item.accent ?? 'yellow');
            const primaryProgress = interpolate(frame, [delay, delay + 26], [0, item.primaryRatio], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const secondaryProgress = interpolate(frame, [delay + 6, delay + 30], [0, item.secondaryRatio], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const primaryCurve = buildCurve(item.primaryRatio, index, 'primary');
            const secondaryCurve = buildCurve(item.secondaryRatio, index, 'secondary');
            const primaryPoint = sampleCubic(Math.max(0.01, primaryProgress), primaryCurve.p0, primaryCurve.p1, primaryCurve.p2, primaryCurve.p3);
            const secondaryPoint = sampleCubic(Math.max(0.01, secondaryProgress), secondaryCurve.p0, secondaryCurve.p1, secondaryCurve.p2, secondaryCurve.p3);
            const animatedPrimary = animateMetricDisplay(item.primaryValue, primaryProgress);
            const animatedSecondary = animateMetricDisplay(item.secondaryValue, secondaryProgress);

            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  position: 'relative',
                  padding: '4px 0 22px',
                  borderBottom: index === visibleItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [22, 0])}px)`,
                    resolveUltimateMicroJitterConfig('steady', {
                      delay,
                      seed: 320 + index,
                    }),
                  ),
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '210px minmax(0, 1fr) 230px',
                    alignItems: 'center',
                    gap: 28,
                  }}
                >
                  <div>
                    <div style={{fontSize: 28, lineHeight: 1.14, fontWeight: 820, color: kit.colors.text}}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        lineHeight: 1.35,
                        letterSpacing: 1.6,
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      curve narrative
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      height: 122,
                    }}
                  >
                    <svg viewBox="0 0 980 122" style={{width: '100%', height: '100%', overflow: 'visible'}}>
                      {[28, 52, 76, 100].map((y, guideIndex) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={980}
                          y2={y}
                          stroke={guideIndex === 2 ? `${accentColor}18` : 'rgba(255,255,255,0.06)'}
                          strokeWidth={1}
                        />
                      ))}
                      <PathDrawLink
                        d={secondaryCurve.d}
                        color={secondaryColor}
                        progress={secondaryProgress}
                        frame={frame}
                        marker={null}
                        baseStrokeWidth={10}
                        flowStrokeWidth={6}
                        drawStrokeWidth={4}
                        drawColor={secondaryColor}
                        flowOpacity={0.2}
                        dashPattern="18 20"
                      />
                      <PathDrawLink
                        d={primaryCurve.d}
                        color={primaryColor}
                        progress={primaryProgress}
                        frame={frame}
                        marker={null}
                        baseStrokeWidth={14}
                        flowStrokeWidth={8}
                        drawStrokeWidth={5}
                        drawColor={primaryColor}
                        flowOpacity={0.22}
                        dashPattern="22 26"
                      />
                      <circle cx={primaryPoint.x} cy={primaryPoint.y} r={9} fill="rgba(255,255,255,0.95)" style={{filter: `drop-shadow(0 0 14px ${primaryColor})`}} />
                      <circle cx={primaryPoint.x} cy={primaryPoint.y} r={4} fill={primaryColor} />
                      <circle cx={secondaryPoint.x} cy={secondaryPoint.y} r={6} fill="rgba(9,12,22,0.92)" stroke={secondaryColor} strokeWidth={3} style={{filter: `drop-shadow(0 0 10px ${secondaryColor})`}} />
                    </svg>
                  </div>

                  <div style={{display: 'grid', gap: 14}}>
                    <div>
                      <div style={{fontSize: 34, fontWeight: 840, lineHeight: 1, color: primaryColor}}>
                        {animatedPrimary}
                      </div>
                      <div style={{marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.4, textTransform: 'uppercase'}}>
                        {primaryLabel}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: 26, fontWeight: 760, lineHeight: 1, color: secondaryColor}}>
                        {animatedSecondary}
                      </div>
                      <div style={{marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.4, textTransform: 'uppercase'}}>
                        {secondaryLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
