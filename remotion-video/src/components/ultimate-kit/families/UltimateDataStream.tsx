import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {GeometryAccent, PathDrawLink, RadialGauge, DotGridParallax} from '../../visual-atoms';
import {
  resolveUltimateAccent,
  ultimateGlow,
  ultimateKitTokens,
  ultimateKitVideo,
} from '../tokens';
import {
  resolveUltimateMicroJitterConfig,
} from '../motion';
import {
  cleanDisplayText,
  iconMaskStyle,
  resolveSemanticIcon,
  withMicroJitter,
  SemanticIconGlyph,
  SemanticIconBadge,
} from '../SemanticIcon';
import { useStaggerSlide, useFloatMotion } from '../motionGrammar';
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
    config: {damping: 200, stiffness: 280},
  });
};


const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

const measureText = (value?: string) => Array.from(String(value || '').trim()).length;


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



export const UltimateDataStream: React.FC<UltimateDataStreamProps & {grammar?: {staggerGap?: number}}> = ({
  heading,
  summary,
  items,
  accent = 'cyan',
  grammar,
}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(6, grammar?.staggerGap ?? 6);
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 4);
  const headingLines = splitDisplayLinesBalanced(heading, 18, 2);
  const surgeCount = visibleItems.filter((item) => item.trend === 'up').length;
  const alertCount = visibleItems.filter((item) => item.trend === 'alert').length;
  const lanes = [
    {y: 180, bendA: -46, bendB: 22},
    {y: 316, bendA: 24, bendB: -18},
    {y: 454, bendA: -20, bendB: 28},
    {y: 592, bendA: 32, bendB: -24},
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
      <DotGridParallax dotColor={`${accentColor}18`} density={0.45} dotRadius={2} depth={3} />
      <ParticleBackground colors={[`${accentColor}14`]} particleCount={18} speed={0.3} />
      <div style={{position: 'absolute', top: 118, left: 150, right: 540}}>
        <div style={eyebrowStyle(accentColor, false)}>realtime pulse</div>
        <div style={{marginTop: 22, maxWidth: 820}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 4,
                ...sectionHeadingStyle(relaxedTypeScale.title.lg, false),
              }}
            >
              {line}
            </div>
          ))}
        </div>
        {summary ? (
          <div
            style={{
              marginTop: 22,
              maxWidth: 760,
              ...bodyTextStyle(18, kit.colors.textMuted, false),
            }}
          >
            {summary}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 118,
          right: 140,
          width: 360,
          padding: '22px 24px 24px',
          borderRadius: 32,
          border: `1px solid ${accentColor}20`,
          background: 'linear-gradient(180deg, rgba(8,12,20,0.9) 0%, rgba(6,9,16,0.98) 100%)',
          boxShadow: `0 0 34px ${accentColor}14`,
          overflow: 'hidden',
        }}
      >
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.16}
          style={{
            right: -18,
            top: -16,
            width: 160,
            height: 160,
          }}
        />
        <div style={{fontSize: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: `${accentColor}cc`}}>stream pressure</div>
        <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end'}}>
          <div>
            <div style={{fontSize: 30, lineHeight: 1.08, fontWeight: 820, color: '#f7fbff'}}>
              {visibleItems.length} live feeds
            </div>
            <div style={{marginTop: 10, fontSize: 14, lineHeight: 1.34, color: 'rgba(229,236,255,0.58)'}}>
              Pulse lanes update independently instead of rendering like terminal logs.
            </div>
          </div>
          <div style={{fontSize: 54, lineHeight: 0.9, fontWeight: 860, color: accentColor}}>
            {Math.max(1, surgeCount)}
          </div>
        </div>
        <div style={{marginTop: 20, display: 'grid', gap: 12}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center'}}>
            <div style={{fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: `${accentColor}cc`}}>surge lanes</div>
            <div style={{fontSize: 18, color: accentColor}}>{surgeCount}</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center'}}>
            <div style={{fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: `${resolveUltimateAccent('orange')}cc`}}>alert lanes</div>
            <div style={{fontSize: 18, color: resolveUltimateAccent('orange')}}>{alertCount}</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center'}}>
            <div style={{fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: `${resolveUltimateAccent('green')}cc`}}>cadence</div>
            <div style={{fontSize: 18, color: resolveUltimateAccent('green')}}>30fps</div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 320,
          bottom: 118,
          borderRadius: 44,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(6, 9, 18, 0.78), rgba(6, 9, 18, 0.58))',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <GeometryAccent
          variant="slanted-panel"
          color={accentColor}
          opacity={0.12}
          style={{
            left: 74,
            top: 62,
            width: 340,
            height: 100,
          }}
        />
        <GeometryAccent
          variant="arc"
          color={resolveUltimateAccent('purple')}
          opacity={0.2}
          style={{
            right: 104,
            top: 64,
            width: 260,
            height: 120,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}08 52%, transparent 100%)`,
            transform: 'skewX(-14deg)',
            pointerEvents: 'none',
          }}
        />
        <div style={{position: 'absolute', left: 48, top: 64, right: 48, display: 'grid', gap: 18}}>
          {visibleItems.map((item, index) => {
            const color = toneToColor(item.accent ?? (index === 0 ? accent : index === 1 ? 'green' : index === 2 ? 'purple' : 'orange'));
            const delay = 8 + index * gap;
            const reveal = buildReveal(frame, delay);
            const progress = interpolate(frame, [delay + 4, delay + 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const staggerSlide = useStaggerSlide(frame, index, 5, 'right', 24);
            const floatMotion = index % 2 === 0 ? useFloatMotion(frame, index * 5) : null;
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px minmax(0, 1fr) 220px',
                  gap: 18,
                  alignItems: 'center',
                  opacity: reveal * staggerSlide.opacity,
                  transform: withMicroJitter(
                    frame,
                    `${staggerSlide.transform} translateY(${interpolate(reveal, [0, 1], [14, 0])}px)${floatMotion ? ' ' + floatMotion.transform : ''}`,
                    resolveUltimateMicroJitterConfig('steady', {
                      delay,
                      seed: 320 + index,
                    }),
                  ),
                }}
              >
                <div>
                  <div style={{...overlineLabelStyle(color), fontSize: 15}}>feed 0{index + 1}</div>
                  <div style={{marginTop: 10, fontSize: 28, lineHeight: 1.08, fontWeight: 800, color: '#f7fbff'}}>
                    {item.label}
                  </div>
                  {item.detail ? (
                    <div style={{marginTop: 10, ...bodyTextStyle(16, 'rgba(255,255,255,0.6)')}}>
                      {item.detail}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(8, Math.min(100, progress * 100))}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.92))`,
                      boxShadow: `0 0 18px ${color}`,
                    }}
                  />
                </div>
                <div style={{justifySelf: 'end'}}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 18,
                      border: `1px solid ${color}28`,
                      background: `linear-gradient(180deg, ${color}10 0%, rgba(8,10,18,0.84) 100%)`,
                      minWidth: 168,
                      textAlign: 'right',
                    }}
                  >
                    <div style={{fontSize: 30, lineHeight: 1, fontWeight: 840, color}}>
                      {animateMetricDisplay(item.value, progress)}
                    </div>
                    <div style={{marginTop: 8, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(229,236,255,0.52)'}}>
                      {item.trend || 'steady'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <svg viewBox="0 0 1720 720" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          {Array.from({length: 12}).map((_, columnIndex) => {
            const height = 56 + ((columnIndex * 23 + frame * 3) % 88);
            const x = 740 + columnIndex * 70;
            return (
              <rect
                key={`pulse-column-${columnIndex}`}
                x={x}
                y={720 - height - 42}
                width={28}
                height={height}
                rx={14}
                fill={columnIndex % 2 === 0 ? `${accentColor}22` : 'rgba(255,255,255,0.06)'}
              />
            );
          })}
          {visibleItems.map((item, index) => {
            const color = toneToColor(item.accent ?? (index === 0 ? accent : index === 1 ? 'green' : index === 2 ? 'purple' : 'orange'));
            const lane = lanes[index];
            if (!lane) {
              return null;
            }
            const p0 = {x: 520, y: lane.y};
            const p1 = {x: 760, y: lane.y + lane.bendA};
            const p2 = {x: 1120, y: lane.y + lane.bendB};
            const p3 = {x: 1558, y: lane.y + (index % 2 === 0 ? -12 : 18)};
            const delay = 12 + index * gap * 5;
            const progress = interpolate(frame, [delay, delay + 34], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const point = sampleCubic(Math.max(0.01, progress), p0, p1, p2, p3);
            return (
              <React.Fragment key={`${item.label}-lane`}>
                <PathDrawLink
                  d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`}
                  color={color}
                  progress={progress}
                  frame={frame}
                  marker={{
                    x: point.x,
                    y: point.y,
                    size: 6,
                    shape: index % 2 === 0 ? 'diamond' : 'ring',
                  }}
                  baseStrokeWidth={4}
                  flowStrokeWidth={7}
                  drawStrokeWidth={2}
                  dashPattern="12 16"
                  flowOpacity={0.68}
                />
                <circle cx={p0.x} cy={p0.y} r={8} fill="rgba(9,12,22,0.94)" stroke={color} strokeWidth={3} />
                {[0.22, 0.44, 0.66].map((trailProgress, trailIndex) => {
                  const trailPoint = sampleCubic(Math.max(0.01, Math.min(progress, trailProgress)), p0, p1, p2, p3);
                  return (
                    <circle
                      key={`${item.label}-trail-${trailIndex}`}
                      cx={trailPoint.x}
                      cy={trailPoint.y}
                      r={trailIndex === 0 ? 4 : 3}
                      fill={color}
                      opacity={progress > trailProgress ? 0.2 + trailIndex * 0.12 : 0}
                    />
                  );
                })}
                <text
                  x={p3.x - 8}
                  y={p3.y - 26}
                  fill={color}
                  fontSize="16"
                  fontWeight="800"
                  textAnchor="end"
                >
                  {item.trend || 'live'}
                </text>
              </React.Fragment>
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 54,
            bottom: 38,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={`${item.label}-chip`}
              style={{
                padding: '12px 16px',
                borderRadius: kit.radius.pill,
                border: `1px solid ${toneToColor(item.accent ?? accent)}30`,
                background: 'rgba(255,255,255,0.04)',
                color: toneToColor(item.accent ?? accent),
                fontSize: 14,
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: 1.6,
              }}
            >
              {cleanDisplayText(item.label)} / {item.trend || (index === 0 ? 'up' : 'steady')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
