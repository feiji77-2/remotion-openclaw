import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {
  getUltimateManualGlyph,
  ULTIMATE_ICON_URLS,
  isUltimateManualGlyph,
  resolveUltimateIconPack,
  type UltimateIconName,
} from './iconography';
import {
  resolveUltimateAccent,
  ultimateGlow,
  ultimateKitTokens,
  ultimateKitVideo,
} from './tokens';
import {appendUltimateMicroJitter, createUltimateMicroJitter} from './motion';
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
} from './types';

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
    config: {damping: 18, stiffness: 110},
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

        lines.push(`${tailUnits.join('').trim()}…`);
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

export const UltimateBackdrop: React.FC<{warm?: boolean; showGrid?: boolean}> = ({
  warm = false,
  showGrid = true,
}) => {
  const frame = useCurrentFrame();
  const glowShiftX = Math.sin(frame * 0.012) * 36;
  const glowShiftY = Math.cos(frame * 0.016) * 22;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: kit.colors.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: warm
            ? `
              radial-gradient(circle at 18% 18%, rgba(255, 130, 72, 0.30), transparent 22%),
              radial-gradient(circle at 68% 62%, rgba(97, 220, 255, 0.18), transparent 24%),
              linear-gradient(180deg, #1a1018 0%, #0c0e18 48%, #08090f 100%)
            `
            : `
              radial-gradient(circle at 22% 30%, rgba(255, 95, 109, 0.20), transparent 24%),
              radial-gradient(circle at 72% 68%, rgba(71, 222, 255, 0.16), transparent 24%),
              radial-gradient(circle at 52% 16%, rgba(158, 118, 255, 0.12), transparent 22%),
              linear-gradient(180deg, #0f1322 0%, #090b15 48%, #06070d 100%)
            `,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -120,
          transform: `translate(${glowShiftX}px, ${glowShiftY}px)`,
          background:
            'radial-gradient(circle at 30% 35%, rgba(255, 108, 108, 0.18), transparent 22%), radial-gradient(circle at 72% 68%, rgba(99, 221, 255, 0.14), transparent 22%)',
          filter: 'blur(32px)',
        }}
      />
      {showGrid ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(${kit.colors.line} 1px, transparent 1px),
              linear-gradient(90deg, ${kit.colors.line} 1px, transparent 1px)
            `,
            backgroundSize: '108px 108px',
            opacity: 0.22,
          }}
        />
      ) : null}
      <ParticleBackground
        particleCount={72}
        colors={['#ff8d6c', '#63ddff', '#5df4bf', '#ffffff']}
        opacityScale={0.95}
      />
      <div
        style={{
          position: 'absolute',
          inset: 24,
          borderRadius: 34,
          border: '1px solid rgba(146, 174, 255, 0.08)',
          boxShadow: 'inset 0 0 100px rgba(5, 8, 16, 0.52)',
        }}
      />
      {frameCorners.map((corner) => (
        <div
          key={`${corner.top ?? 'auto'}-${corner.right ?? 'auto'}-${corner.bottom ?? 'auto'}-${corner.left ?? 'auto'}`}
          style={{
            position: 'absolute',
            width: 52,
            height: 52,
            borderColor: 'rgba(176, 200, 255, 0.22)',
            borderStyle: 'solid',
            borderTopWidth: corner.borderTop ? 2 : 0,
            borderRightWidth: corner.borderRight ? 2 : 0,
            borderBottomWidth: corner.borderBottom ? 2 : 0,
            borderLeftWidth: corner.borderLeft ? 2 : 0,
            top: corner.top,
            right: corner.right,
            bottom: corner.bottom,
            left: corner.left,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const UltimateStage: React.FC<UltimateStageProps> = ({children, warm = false, showGrid = true}) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: kit.fonts.ui,
        color: kit.colors.text,
      }}
    >
      <UltimateBackdrop warm={warm} showGrid={showGrid} />
      {children}
    </AbsoluteFill>
  );
};

export const UltimatePlatformOverlay: React.FC<UltimatePlatformOverlayProps> = ({
  brand = 'Pulse',
  account = '@ultimate-kit',
  searchLabel = 'Search scene blocks',
  watermark = 'Studio',
}) => {
  const frame = useCurrentFrame();
  const reveal = buildReveal(frame, 0);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 34,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          opacity: reveal,
          transform: `translateY(${interpolate(reveal, [0, 1], [12, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderRadius: kit.radius.pill,
            background: 'rgba(8, 10, 18, 0.42)',
            border: '1px solid rgba(210, 222, 255, 0.12)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{position: 'relative', width: 24, height: 24}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(255, 108, 108, 0.92)',
                filter: 'blur(0.5px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 18,
                height: 18,
                right: -3,
                bottom: -1,
                borderRadius: '50%',
                background: 'rgba(99, 221, 255, 0.92)',
                mixBlendMode: 'screen',
              }}
            />
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
            <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 0.3}}>{brand}</div>
            <div style={{fontSize: 16, color: kit.colors.textMuted}}>{account}</div>
          </div>
        </div>
        {searchLabel ? (
          <div
            style={{
              width: 430,
              maxWidth: 430,
              padding: '10px 16px',
              borderRadius: kit.radius.pill,
              border: '1px solid rgba(210, 222, 255, 0.14)',
              background: 'rgba(8, 10, 18, 0.56)',
              color: kit.colors.textMuted,
              fontSize: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {searchLabel}
            </span>
            <span style={{opacity: 0.72}}>Q</span>
          </div>
        ) : null}
      </div>
    </>
  );
};

export const UltimateSubtitleBar: React.FC<UltimateSubtitleBarProps> = ({text}) => {
  const frame = useCurrentFrame();
  const reveal = buildReveal(frame, 8);

  if (!text) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 44,
        display: 'flex',
        justifyContent: 'center',
        opacity: reveal,
        transform: `translateY(${interpolate(reveal, [0, 1], [12, 0])}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: '14px 24px 16px',
          borderRadius: kit.radius.pill,
          background: 'rgba(8, 10, 18, 0.72)',
          border: '1px solid rgba(206, 218, 255, 0.16)',
          color: kit.colors.text,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: 0.1,
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.20)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const UltimateHeroPanel: React.FC<UltimateHeroPanelProps> = ({
  kicker = '',
  title,
  subtitle,
  badge,
  accent = 'orange',
  avatarLabel = '',
}) => {
  const frame = useCurrentFrame();
  const reveal = buildReveal(frame, 0);
  const accentColor = toneToColor(accent);

  // Hero: 降低主标题压迫感，拉开徽标、副标题和头像之间的留白层级。
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 30,
        opacity: reveal,
        transform: `scale(${interpolate(reveal, [0, 1], [0.96, 1])})`,
      }}
    >
      {kicker ? <div style={eyebrowStyle('#f3e7d9')}>{kicker}</div> : null}
      <div
        style={{
          fontFamily: kit.fonts.display,
          fontSize: 128,
          lineHeight: 1.02,
          letterSpacing: -4,
          maxWidth: 1180,
          backgroundImage: `linear-gradient(180deg, #ffe9cf 0%, ${accentColor} 42%, #ff7a4a 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 42px ${accentColor}28`,
        }}
      >
        {title}
      </div>
      {badge ? (
        <div
          style={{
            padding: '16px 26px',
            borderRadius: kit.radius.sm,
            border: `1px solid ${accentColor}44`,
            background: 'rgba(18, 14, 12, 0.42)',
            color: '#ffe1bf',
            fontSize: 18,
            lineHeight: 1.2,
            letterSpacing: 3,
            textTransform: 'uppercase',
            transform: withMicroJitter(frame, '', {
              delay: 10,
              amplitudeX: 0.8,
              amplitudeY: 0.8,
              rotateDeg: 0.18,
              scaleDelta: 0.002,
              seed: 3,
            }),
          }}
        >
          {badge}
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            maxWidth: 900,
            ...bodyTextStyle(20, kit.colors.textMuted, true),
            lineHeight: 1.7,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {avatarLabel ? (
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: '50%',
              border: `1px solid ${accentColor}55`,
              background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${accentColor} 28%, rgba(16, 19, 28, 0.94) 82%)`,
            boxShadow: ultimateGlow(accentColor, 0.7),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10131c',
            fontSize: 34,
            fontWeight: 800,
            transform: withMicroJitter(frame, '', {
              delay: 16,
              amplitudeX: 0.9,
              amplitudeY: 0.9,
              rotateDeg: 0.24,
              scaleDelta: 0.003,
              seed: 8,
            }),
          }}
        >
          {avatarLabel}
        </div>
        </div>
      ) : null}
    </div>
  );
};

export const UltimateFeatureCardRail: React.FC<UltimateFeatureCardRailProps> = ({
  kicker = '',
  heading,
  items,
}) => {
  const frame = useCurrentFrame();
  const isQuadLayout = items.length === 4;
  const gridColumns = isQuadLayout ? 2 : Math.min(Math.max(items.length, 1), 3);
  const showGuideLine = !isQuadLayout && items.length > 1;
  const lineProgress = interpolate(frame, [12, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Feature rail: 四卡时改成更稳定的 2x2 焦点布局，并移除穿场引导线来减轻分散感。
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`,
      }}
    >
      <div style={{position: 'absolute', top: 86, left: 0, right: 0}}>
        {kicker ? <div style={eyebrowStyle(resolveUltimateAccent('green'))}>{kicker}</div> : null}
        <div
          style={{
            marginTop: kicker ? 24 : 0,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg),
          }}
        >
          {heading}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: isQuadLayout ? 300 : 160,
          right: isQuadLayout ? 300 : 160,
          top: isQuadLayout ? 318 : 320,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          columnGap: isQuadLayout ? 36 : 28,
          rowGap: isQuadLayout ? 34 : 28,
        }}
      >
        {items.map((item, index) => {
          const accentColor = toneToColor(item.accent);
          const reveal = buildReveal(frame, index * 10);
          const jitterTransform = withMicroJitter(
            frame,
            `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
            {
              delay: index * 10,
              amplitudeX: 1.3,
              amplitudeY: 1.1,
              rotateDeg: 0.34,
              scaleDelta: 0.003,
              seed: index,
            },
          );
          return (
            <div
              key={`${item.title}-${index}`}
              style={{
                ...panelStyle(accentColor),
                minHeight: isQuadLayout ? 252 : 320,
                padding: isQuadLayout
                  ? `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.roomyX}px 32px`
                  : `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px ${relaxedPanelPadding.y}px`,
                opacity: reveal,
                transform: jitterTransform,
              }}
            >
              <div
                style={{
                  width: isQuadLayout ? 76 : 82,
                  height: isQuadLayout ? 76 : 82,
                  borderRadius: '50%',
                  border: `1px solid ${accentColor}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                  fontSize: isQuadLayout ? 28 : 30,
                  boxShadow: ultimateGlow(accentColor, 0.55),
                }}
              >
                <SemanticIconGlyph
                  iconValue={item.icon}
                  semanticText={`${item.title} ${item.caption || ''} ${item.eyebrow || ''}`}
                  color={accentColor}
                  size={isQuadLayout ? 32 : 34}
                  fallbackIndex={index}
                  family="feature-rail"
                />
              </div>
              <div
                style={{
                  marginTop: isQuadLayout ? 26 : 30,
                  fontSize: isQuadLayout ? relaxedTypeScale.title.md : relaxedTypeScale.title.sm,
                  fontWeight: 800,
                  lineHeight: 1.16,
                  color: accentColor,
                  textShadow: ultimateGlow(accentColor, 0.45),
                }}
              >
                {item.title}
              </div>
              {item.eyebrow ? (
                <div style={{marginTop: 14, ...overlineLabelStyle(kit.colors.textSoft)}}>
                  {item.eyebrow}
                </div>
              ) : null}
              {item.caption ? (
                <div style={{marginTop: 18, maxWidth: isQuadLayout ? 320 : undefined, ...bodyTextStyle(18)}}>
                  {item.caption}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {showGuideLine ? (
        <div
          style={{
            position: 'absolute',
            left: 260,
            right: 260,
            top: 506,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(123, 192, 255, 0.65), transparent)',
            transform: `scaleX(${lineProgress})`,
            transformOrigin: 'left center',
          }}
        />
      ) : null}
      {showGuideLine ? (
        <div
          style={{
            position: 'absolute',
            top: 498,
            left: 260 + lineProgress * 1400,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: resolveUltimateAccent('cyan'),
            boxShadow: ultimateGlow(resolveUltimateAccent('cyan')),
            opacity: lineProgress < 0.98 ? 1 : 0,
          }}
        />
      ) : null}
    </div>
  );
};

const FramingDiagram: React.FC<{accentColor: string}> = ({accentColor}) => {
  const frame = useCurrentFrame();
  const sliderProgress = interpolate(frame, [20, 78], [0.12, 0.82], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const boxScale = [1, 1.36, 1.72].map((factor, index) =>
    interpolate(frame, [10 + index * 6, 52 + index * 8], [0.8 * factor, factor], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: 140,
        top: 220,
        width: 640,
        height: 440,
        transform: withMicroJitter(frame, '', {
          delay: 10,
          amplitudeX: 0.8,
          amplitudeY: 0.7,
          rotateDeg: 0.18,
          scaleDelta: 0.002,
          seed: 101,
        }),
      }}
    >
      <div style={{position: 'absolute', left: 184, top: 34, width: 260, height: 320}}>
        {boxScale.map((scale, index) => (
          <div
            key={`${scale}-${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 160 * scale,
              height: 220 * scale,
              transform: 'translate(-50%, -50%)',
              borderRadius: 20,
              border: `1px solid ${index === 0 ? `${accentColor}44` : 'rgba(162, 187, 255, 0.18)'}`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 28,
            width: 78,
            height: 80,
            borderRadius: '50% 50% 44% 44%',
            background: 'rgba(110, 245, 193, 0.16)',
            border: '1px solid rgba(110, 245, 193, 0.24)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 62,
            top: 100,
            width: 126,
            height: 188,
            borderRadius: 34,
            background: 'rgba(110, 245, 193, 0.09)',
            border: '1px solid rgba(110, 245, 193, 0.20)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 36,
          top: 24,
          width: 48,
          height: 340,
          borderRadius: kit.radius.pill,
          border: '1px solid rgba(180, 197, 255, 0.20)',
          background: 'rgba(7, 10, 18, 0.72)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: sliderProgress * 265,
            height: 50,
            borderRadius: kit.radius.pill,
            background: `linear-gradient(180deg, ${accentColor}, ${resolveUltimateAccent('green')})`,
            boxShadow: ultimateGlow(accentColor, 0.8),
          }}
        />
      </div>
    </div>
  );
};

const RingsDiagram: React.FC<{accentColor: string}> = ({accentColor}) => {
  const frame = useCurrentFrame();
  const orbit = frame * 0.04;

  return (
    <div
      style={{
        position: 'absolute',
        right: 170,
        top: 238,
        width: 520,
        height: 360,
        transform: withMicroJitter(frame, '', {
          delay: 12,
          amplitudeX: 0.9,
          amplitudeY: 0.8,
          rotateDeg: 0.2,
          scaleDelta: 0.002,
          seed: 102,
        }),
      }}
    >
      {[120, 200, 280].map((diameter) => (
        <div
          key={diameter}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: diameter,
            height: diameter,
            borderRadius: '50%',
            border: '1px solid rgba(160, 188, 255, 0.18)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: `calc(50% + ${Math.cos(orbit) * 102}px)`,
          top: `calc(50% + ${Math.sin(orbit) * 102}px)`,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: accentColor,
          boxShadow: ultimateGlow(accentColor),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(50% + ${Math.cos(orbit * 0.7 + 1.7) * 142}px)`,
          top: `calc(50% + ${Math.sin(orbit * 0.7 + 1.7) * 142}px)`,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: resolveUltimateAccent('yellow'),
          boxShadow: ultimateGlow(resolveUltimateAccent('yellow')),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 112,
          height: 112,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${accentColor}28 0%, transparent 68%)`,
          border: `1px solid ${accentColor}44`,
        }}
      />
    </div>
  );
};

const ScaleDiagram: React.FC<{accentColor: string}> = ({accentColor}) => {
  const frame = useCurrentFrame();
  const fill = interpolate(frame, [14, 74], [0.18, 0.86], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        right: 160,
        top: 230,
        width: 560,
        height: 360,
        transform: withMicroJitter(frame, '', {
          delay: 10,
          amplitudeX: 0.8,
          amplitudeY: 0.7,
          rotateDeg: 0.18,
          scaleDelta: 0.002,
          seed: 103,
        }),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 110,
          top: 68,
          height: 24,
          borderRadius: kit.radius.pill,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            borderRadius: kit.radius.pill,
            background: `linear-gradient(90deg, ${resolveUltimateAccent('yellow')}, ${accentColor})`,
            boxShadow: ultimateGlow(accentColor, 0.45),
          }}
        />
      </div>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: 70 + index * 150,
            bottom: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 20 + index * 10,
              height: 20 + index * 10,
              borderRadius: '50%',
              background: accentColor,
              opacity: 0.8 - index * 0.12,
            }}
          />
          <div
            style={{
              width: 24 + index * 14,
              height: 76 + index * 48,
              borderRadius: kit.radius.pill,
              background: `linear-gradient(180deg, ${accentColor}, rgba(255,255,255,0.12))`,
              opacity: 0.8 - index * 0.12,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const UltimateFocusDiagram: React.FC<UltimateFocusDiagramProps> = ({
  eyebrow = '',
  keyword,
  question,
  description,
  accent = 'cyan',
  diagram = 'framing',
}) => {
  const frame = useCurrentFrame();
  const reveal = buildReveal(frame, 0);
  const accentColor = toneToColor(accent);

  // Focus: 缩短大字密度、加大问句与说明文间隔，让单一核心概念更聚焦。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 220,
          width: 760,
          opacity: reveal,
          transform: withMicroJitter(frame, `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`, {
            delay: 0,
            amplitudeX: 1,
            amplitudeY: 0.9,
            rotateDeg: 0.2,
            scaleDelta: 0.002,
            seed: 4,
          }),
        }}
      >
        {eyebrow ? <div style={eyebrowStyle(accentColor, false)}>{eyebrow}</div> : null}
        <div
          style={{
            marginTop: eyebrow ? 24 : 0,
            fontFamily: kit.fonts.display,
            fontSize: 136,
            lineHeight: 1.02,
            color: accentColor,
            textShadow: ultimateGlow(accentColor, 0.9),
          }}
        >
          {keyword}
        </div>
        {question ? (
          <div style={{marginTop: 80, fontSize: 50, fontWeight: 800, lineHeight: 1.18}}>{question}</div>
        ) : null}
        {description ? (
          <div style={{marginTop: 24, maxWidth: 560, ...bodyTextStyle(18)}}>
            {description}
          </div>
        ) : null}
      </div>
      {diagram === 'framing' ? <FramingDiagram accentColor={accentColor} /> : null}
      {diagram === 'rings' ? <RingsDiagram accentColor={accentColor} /> : null}
      {diagram === 'scale' ? <ScaleDiagram accentColor={accentColor} /> : null}
    </div>
  );
};

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
  const headingLines = splitDisplayLinesBalanced(heading, 14, 2);
  const summaryLines = splitDisplayLinesBalanced(summary || '', 24, 2);
  const headingSize = headingLines.length > 1 ? 52 : measureText(heading) > 15 ? 54 : 56;
  const primaryItem = items[0];
  const secondaryItems = items.slice(1, 4);
  const hasWideLeadCard =
    secondaryItems.length >= 3 && secondaryItems[0]?.layout === 'wide';
  const secondaryGridColumns =
    secondaryItems.length === 3 && hasWideLeadCard
      ? '1.32fr 1.32fr 1fr 1fr'
      : secondaryItems.length === 3
        ? '1.1fr 1fr 1fr'
        : secondaryItems.length === 2
          ? secondaryItems[0]?.layout === 'wide'
            ? '1.25fr 1fr'
            : '1fr 1fr'
          : '1fr';

  // Number strip: 主卡和副卡统一增大 padding 与正文行高，突出“一大三小”的视觉层次。
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
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            border: `1px solid ${accentColor}55`,
            background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.22), ${accentColor} 26%, rgba(7, 11, 20, 0.96) 78%)`,
            boxShadow: ultimateGlow(accentColor, 0.65),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 66,
            lineHeight: 1.12,
            color: '#091018',
            textShadow: 'none',
            transform: withMicroJitter(frame, '', {
              delay: 0,
              amplitudeX: 0.9,
              amplitudeY: 0.8,
              rotateDeg: 0.18,
              scaleDelta: 0.003,
              seed: 6,
            }),
          }}
        >
          {count}
        </div>
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
      {primaryItem ? (
        <div
          style={{
            position: 'absolute',
            left: 210,
            right: 210,
            top: 352,
            ...panelStyle(toneToColor(primaryItem.accent ?? accent)),
            minHeight: 228,
            padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.roomyX}px ${relaxedPanelPadding.y}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            opacity: buildReveal(frame, 8),
            transform: withMicroJitter(
              frame,
              `translateY(${interpolate(buildReveal(frame, 8), [0, 1], [18, 0])}px)`,
              {
                delay: 8,
                amplitudeX: 1.2,
                amplitudeY: 1,
                rotateDeg: 0.24,
                scaleDelta: 0.002,
                seed: 8,
              },
            ),
          }}
        >
          {(() => {
            const allowPrimaryThreeLines = measureText(primaryItem.label) > 20;
            const primaryLines = splitDisplayLinesBalanced(
              primaryItem.label,
              allowPrimaryThreeLines ? 16 : 20,
              allowPrimaryThreeLines ? 3 : 2,
            );
            const primarySize = primaryLines.length > 2 ? 30 : primaryLines.length > 1 ? 36 : 44;

            return (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    ...overlineLabelStyle(toneToColor(primaryItem.accent ?? accent)),
                  }}
                >
                  <SemanticIconBadge
                    semanticText={`${primaryItem.tag || '核心判断'} ${primaryItem.label} ${primaryItem.detail || ''}`}
                    color={toneToColor(primaryItem.accent ?? accent)}
                    badgeSize={38}
                    size={16}
                    family="number-strip"
                    motionDelay={8}
                    motionSeed={8}
                  />
                  {primaryItem.tag || '核心判断'}
                </div>
                <div style={{marginTop: 16}}>
                  {primaryLines.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      style={{
                        fontSize: Math.max(primarySize - 2, 34),
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: kit.colors.text,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 24,
                    height: 7,
                    borderRadius: kit.radius.pill,
                    background: `linear-gradient(90deg, ${toneToColor(primaryItem.accent ?? accent)}, rgba(255,255,255,0.08))`,
                    boxShadow: ultimateGlow(toneToColor(primaryItem.accent ?? accent), 0.25),
                  }}
                />
              </>
            );
          })()}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 210,
          right: 210,
          top: 612,
          bottom: 140,
          display: 'grid',
          gridTemplateColumns: secondaryGridColumns,
          gap: 28,
        }}
      >
        {secondaryItems.map((item, index) => {
          const color = toneToColor(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'green' : 'yellow'));
          const chipReveal = buildReveal(frame, 14 + index * 4);
          const isWide = item.layout === 'wide' && (secondaryItems.length >= 2);
          const itemLines = splitDisplayLinesBalanced(item.label, isWide ? 18 : 12, isWide ? 2 : 3);
          const detailLines = splitDisplayLinesBalanced(item.detail || '', isWide ? 18 : 14, 2);
          const chips = (item.chips || []).slice(0, isWide ? 3 : 2);

          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                ...panelStyle(color),
                minHeight: isWide ? 224 : 208,
                padding: isWide
                  ? `${relaxedPanelPadding.y}px ${relaxedPanelPadding.x}px 24px`
                  : `${relaxedPanelPadding.y}px 28px 24px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: chipReveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(chipReveal, [0, 1], [20, 0])}px)`,
                  {
                    delay: 14 + index * 4,
                    amplitudeX: 1.2,
                    amplitudeY: 1,
                    rotateDeg: 0.28,
                    scaleDelta: 0.003,
                    seed: 20 + index,
                  },
                ),
                gridColumn:
                  secondaryItems.length === 3 && hasWideLeadCard && index === 0
                    ? 'span 2'
                    : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
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
                    motionDelay={14 + index * 4}
                    motionSeed={20 + index}
                  />
                  {item.tag || `补充 ${index + 1}`}
                </div>
                <div style={{marginTop: 16}}>
                  {itemLines.map((line, lineIndex) => (
                    <div
                      key={`${line}-${lineIndex}`}
                      style={{
                        fontSize: isWide ? 34 : itemLines.length > 2 ? 28 : 32,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: kit.colors.text,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                {detailLines.length > 0 ? (
                  <div style={{marginTop: 14}}>
                    {detailLines.map((line, lineIndex) => (
                      <div
                        key={`${line}-${lineIndex}`}
                        style={{
                          marginTop: lineIndex === 0 ? 0 : 6,
                          ...bodyTextStyle(isWide ? 18 : 17),
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                {chips.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 18,
                    }}
                  >
                    {chips.map((chip, chipIndex) => (
                      <div
                        key={`${chip}-${chipIndex}`}
                        style={{
                          padding: '10px 14px',
                          borderRadius: kit.radius.pill,
                          border: `1px solid ${color}28`,
                          background: `linear-gradient(180deg, ${color}14, rgba(10, 13, 24, 0.92))`,
                          fontSize: 15,
                          fontWeight: 700,
                          color,
                          lineHeight: 1.2,
                        }}
                      >
                        {chip}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div
                  style={{
                    height: 6,
                    borderRadius: kit.radius.pill,
                    background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.08))`,
                    boxShadow: ultimateGlow(color, 0.24),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UltimateStepFlow: React.FC<UltimateStepFlowProps> = ({heading, steps}) => {
  const frame = useCurrentFrame();
  const isSplitLayout = steps.length > 4;
  const getStepGridColumn = (index: number) => {
    if (!isSplitLayout) {
      return undefined;
    }

    if (steps.length === 5) {
      if (index < 3) {
        return 'span 2';
      }

      return index === 3 ? '2 / span 2' : '4 / span 2';
    }

    return 'span 2';
  };

  // Step flow: 五步以上改成 3+2 分层流程，避免一排五卡同时抢主视线。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0}}>
        <div
          style={{
            marginTop: 0,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg),
          }}
        >
          {heading}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: isSplitLayout ? 170 : 140,
          right: isSplitLayout ? 170 : 140,
          top: isSplitLayout ? 332 : 350,
          display: 'grid',
          gridTemplateColumns: isSplitLayout
            ? 'repeat(6, minmax(0, 1fr))'
            : `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`,
          columnGap: isSplitLayout ? 28 : 24,
          rowGap: isSplitLayout ? 30 : 24,
          alignItems: 'start',
        }}
      >
        {steps.map((step, index) => {
          const accentColor = toneToColor(step.accent ?? 'cyan');
          const reveal = buildReveal(frame, index * 8);
          const isSupportStep = isSplitLayout && index >= 3;
          return (
            <div
              key={`${step.label}-${index}`}
              style={{
                position: 'relative',
                gridColumn: getStepGridColumn(index),
              }}
            >
              <div
                style={{
                  ...panelStyle(accentColor),
                  minHeight: isSplitLayout ? (isSupportStep ? 226 : 248) : 272,
                  padding: isSplitLayout
                    ? `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.roomyX}px 30px`
                    : `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px`,
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [20, 0])}px)`,
                    {
                      delay: index * 8,
                      amplitudeX: 1.3,
                      amplitudeY: 1.1,
                      rotateDeg: 0.3,
                      scaleDelta: 0.003,
                      seed: 40 + index,
                    },
                  ),
                }}
              >
                <div
                  style={{
                    width: isSupportStep ? 58 : 64,
                    height: isSupportStep ? 58 : 64,
                    borderRadius: '50%',
                    background: `${accentColor}1e`,
                    border: `1px solid ${accentColor}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accentColor,
                    fontSize: isSupportStep ? 22 : 24,
                    fontWeight: 800,
                  }}
                >
                  <SemanticIconGlyph
                    iconValue={step.icon}
                    semanticText={`${step.label} ${step.detail || ''}`}
                    color={accentColor}
                    size={isSupportStep ? 26 : 28}
                    fallbackIndex={index}
                    family="step-flow"
                  />
                </div>
                <div
                  style={{
                    marginTop: 18,
                    fontSize: isSupportStep ? 34 : 38,
                    fontWeight: 800,
                    lineHeight: 1.18,
                  }}
                >
                  {step.label}
                </div>
                {step.detail ? (
                  <div style={{marginTop: 18, ...bodyTextStyle(isSupportStep ? 17 : 18)}}>
                    {step.detail}
                  </div>
                ) : null}
              </div>
              {!isSplitLayout && index < steps.length - 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 124,
                    right: -16,
                    width: 30,
                    height: 30,
                    borderTop: '2px solid rgba(166, 189, 255, 0.26)',
                    borderRight: '2px solid rgba(166, 189, 255, 0.26)',
                    transform: 'rotate(45deg)',
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UltimateTimeline: React.FC<UltimateTimelineProps> = ({
  heading,
  summary,
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 5);
  const railProgress = interpolate(frame, [10, 54], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const railLeft = 220;
  const railWidth = 1480;

  // Timeline: 统一标题层级与卡片正文节奏，避免时间节点同时“抢戏”。
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
          left: railLeft,
          width: railWidth,
          top: 530,
          height: 4,
          borderRadius: kit.radius.pill,
          overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12))',
        }}
      >
        <div
          style={{
            width: `${railProgress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0.94))`,
            boxShadow: ultimateGlow(accentColor, 0.45),
          }}
        />
      </div>
      {visibleItems.map((item, index) => {
        const reveal = buildReveal(frame, 6 + index * 8);
        const itemColor = toneToColor(item.accent ?? accent);
        const left = railLeft + (visibleItems.length === 1 ? railWidth / 2 : (railWidth / Math.max(visibleItems.length - 1, 1)) * index);
        const upper = index % 2 === 0;
        const cardTop = upper ? 282 : 602;
        const lineHeight = upper ? 152 : 78;

        return (
          <div key={`${item.label}-${index}`}>
            <div
              style={{
                position: 'absolute',
                left: left - 2,
                top: upper ? 530 - lineHeight : 534,
                width: 4,
                height: lineHeight,
                borderRadius: kit.radius.pill,
                background: `linear-gradient(180deg, ${itemColor}, rgba(255,255,255,0.08))`,
                opacity: reveal,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: left - 12,
                top: 518,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: itemColor,
                boxShadow: ultimateGlow(itemColor, 0.8),
                opacity: reveal,
                transform: withMicroJitter(frame, `scale(${interpolate(reveal, [0, 1], [0.8, 1])})`, {
                  delay: 6 + index * 8,
                  amplitudeX: 0.8,
                  amplitudeY: 0.8,
                  rotateDeg: 0.16,
                  scaleDelta: 0.003,
                  seed: 60 + index,
                }),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: left - 160,
                top: cardTop,
                width: 320,
                minHeight: 204,
                padding: `${relaxedPanelPadding.y}px 28px 24px`,
                opacity: reveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
                  {
                    delay: 6 + index * 8,
                    amplitudeX: 1.2,
                    amplitudeY: 1.1,
                    rotateDeg: 0.28,
                    scaleDelta: 0.003,
                    seed: 70 + index,
                  },
                ),
                ...panelStyle(itemColor),
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${itemColor}38`,
                  color: itemColor,
                  fontSize: 16,
                  lineHeight: 1.2,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  background: `${itemColor}12`,
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
                  motionDelay={6 + index * 8}
                  motionSeed={70 + index}
                />
                <span>{item.label}</span>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1.24,
                  ...lineClampStyle(2),
                }}
              >
                {item.title}
              </div>
              {item.detail ? (
                <div
                  style={{
                    marginTop: 14,
                    ...bodyTextStyle(17),
                    ...lineClampStyle(3),
                  }}
                >
                  {item.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const UltimateCompareBoard: React.FC<UltimateCompareBoardProps> = ({
  heading,
  summary,
  leftTitle,
  rightTitle,
  leftEyebrow,
  rightEyebrow,
  rows,
  leftAccent = 'red',
  rightAccent = 'green',
}) => {
  const frame = useCurrentFrame();
  const leftColor = toneToColor(leftAccent);
  const rightColor = toneToColor(rightAccent);
  const visibleRows = rows.slice(0, 3);

  // Compare board: 把页头和行卡分层拉开，并给左右对照内容更多内边距与阅读行高。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 140, right: 140}}>
        <div style={eyebrowStyle(resolveUltimateAccent('yellow'))}>双栏对照</div>
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
              maxWidth: 980,
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
          left: 140,
          top: 282,
          width: 540,
          padding: `${relaxedPanelPadding.y}px ${relaxedPanelPadding.x}px`,
          transform: withMicroJitter(frame, '', {
            delay: 6,
            amplitudeX: 1,
            amplitudeY: 0.9,
            rotateDeg: 0.18,
            scaleDelta: 0.002,
            seed: 120,
          }),
          ...panelStyle(leftColor),
        }}
      >
        {leftEyebrow ? <div style={{...eyebrowStyle(leftColor, false), fontSize: 16, letterSpacing: 2.4}}>{leftEyebrow}</div> : null}
        <div style={{marginTop: leftEyebrow ? 14 : 0, fontSize: relaxedTypeScale.title.md, fontWeight: 800, lineHeight: 1.14, color: leftColor}}>{leftTitle}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: 282,
          width: 540,
          padding: `${relaxedPanelPadding.y}px ${relaxedPanelPadding.x}px`,
          textAlign: 'right',
          transform: withMicroJitter(frame, '', {
            delay: 10,
            amplitudeX: 1,
            amplitudeY: 0.9,
            rotateDeg: 0.18,
            scaleDelta: 0.002,
            seed: 121,
          }),
          ...panelStyle(rightColor),
        }}
      >
        {rightEyebrow ? <div style={{...eyebrowStyle(rightColor, false), fontSize: 16, letterSpacing: 2.4}}>{rightEyebrow}</div> : null}
        <div style={{marginTop: rightEyebrow ? 14 : 0, fontSize: relaxedTypeScale.title.md, fontWeight: 800, lineHeight: 1.14, color: rightColor}}>{rightTitle}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 300,
          width: 128,
          height: 128,
          marginLeft: -64,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.14)',
          background: `conic-gradient(from ${frame * 2.4}deg, ${leftColor} 0deg, rgba(255,255,255,0.14) 120deg, ${rightColor} 240deg, rgba(8, 10, 18, 0.96) 360deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: 3,
          color: kit.colors.text,
          boxShadow: '0 18px 46px rgba(0,0,0,0.26)',
          transform: withMicroJitter(frame, '', {
            delay: 16,
            amplitudeX: 0.9,
            amplitudeY: 0.8,
            rotateDeg: 0.22,
            scaleDelta: 0.003,
            seed: 122,
          }),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: '50%',
            background: 'rgba(8, 10, 18, 0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          VS
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 468,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {visibleRows.map((row, index) => {
          const reveal = buildReveal(frame, 8 + index * 6);
          const rowColor = toneToColor(row.accent ?? 'yellow');
          return (
            <div
              key={`${row.label}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 180px 1fr',
                gap: 28,
                alignItems: 'center',
                opacity: reveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                  {
                    delay: 8 + index * 6,
                    amplitudeX: 1.1,
                    amplitudeY: 1,
                    rotateDeg: 0.22,
                    scaleDelta: 0.002,
                    seed: 130 + index,
                  },
                ),
              }}
            >
              <div style={{...panelStyle(leftColor), minHeight: 136, padding: '28px 30px'}}>
                <div style={{...overlineLabelStyle(leftColor), fontSize: 16}}>左侧</div>
                <div style={{marginTop: 14, fontSize: 24, fontWeight: 750, lineHeight: 1.58, ...lineClampStyle(2)}}>{row.left}</div>
                <div
                  style={{
                    marginTop: 18,
                    height: 5,
                    borderRadius: kit.radius.pill,
                    background: `linear-gradient(90deg, ${leftColor}, rgba(255,255,255,0.08))`,
                  }}
                />
              </div>
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: 22,
                  border: `1px solid ${rowColor}30`,
                  background: `${rowColor}14`,
                  textAlign: 'center',
                  color: rowColor,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  boxShadow: ultimateGlow(rowColor, 0.16),
                }}
              >
                {row.label}
              </div>
              <div style={{...panelStyle(rightColor), minHeight: 136, padding: '28px 30px'}}>
                <div style={{...overlineLabelStyle(rightColor), fontSize: 16}}>右侧</div>
                <div style={{marginTop: 14, fontSize: 24, fontWeight: 750, lineHeight: 1.58, ...lineClampStyle(2)}}>{row.right}</div>
                <div
                  style={{
                    marginTop: 18,
                    height: 5,
                    borderRadius: kit.radius.pill,
                    background: `linear-gradient(90deg, ${rightColor}, rgba(255,255,255,0.08))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UltimateEvidenceWall: React.FC<UltimateEvidenceWallProps> = ({
  heading,
  summary,
  cards,
  accent = 'yellow',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleCards = cards.slice(0, 3);
  const positions = [
    {top: 288, left: 120, rotate: -3},
    {top: 256, left: 1048, rotate: 2},
    {top: 634, left: 404, rotate: -1.5},
  ];

  // Evidence wall: 让三张证据卡更像主视觉锚点，放大引文与说明区的呼吸感。
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
      {visibleCards.map((card, index) => {
        const reveal = buildReveal(frame, 8 + index * 7);
        const cardColor = toneToColor(card.accent ?? accent);
        const position = positions[index] || positions[positions.length - 1];
        return (
          <div
            key={`${card.source}-${index}`}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: index === 2 ? 1100 : 720,
              minHeight: 248,
              padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px ${relaxedPanelPadding.y}px 38px`,
              opacity: reveal,
              transform: withMicroJitter(
                frame,
                `translateY(${interpolate(reveal, [0, 1], [20, 0])}px) rotate(${position.rotate}deg)`,
                {
                  delay: 8 + index * 7,
                  amplitudeX: 1.5,
                  amplitudeY: 1.3,
                  rotateDeg: 0.32,
                  scaleDelta: 0.003,
                  seed: 150 + index,
                },
              ),
              ...panelStyle(cardColor),
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 28,
                bottom: 28,
                left: 18,
                width: 4,
                borderRadius: kit.radius.pill,
                background: `linear-gradient(180deg, ${cardColor}, rgba(255,255,255,0.08))`,
                boxShadow: ultimateGlow(cardColor, 0.2),
              }}
            />
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16}}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${cardColor}34`,
                  color: cardColor,
                  background: `${cardColor}14`,
                  fontSize: 18,
                  lineHeight: 1.2,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  boxShadow: ultimateGlow(cardColor, 0.16),
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
                  motionDelay={8 + index * 7}
                  motionSeed={150 + index}
                />
                <span>{card.source}</span>
              </div>
              <div style={{fontSize: 15, color: kit.colors.textSoft, letterSpacing: 2.2, lineHeight: 1.2, textTransform: 'uppercase'}}>
                证据 {String(index + 1).padStart(2, '0')}
              </div>
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 32,
                lineHeight: 1.52,
                fontWeight: 760,
                color: kit.colors.text,
                ...lineClampStyle(2),
              }}
            >
              {card.quote}
            </div>
            {card.detail ? (
              <div
                style={{
                  marginTop: 16,
                  ...bodyTextStyle(17),
                  ...lineClampStyle(2),
                }}
              >
                {card.detail}
              </div>
            ) : null}
            {card.chips && card.chips.length > 0 ? (
              <div style={{marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12}}>
                {card.chips.slice(0, 3).map((chip) => (
                  <div
                    key={chip}
                    style={{
                      padding: '10px 14px',
                      borderRadius: kit.radius.pill,
                      border: `1px solid ${cardColor}28`,
                      background: 'rgba(255,255,255,0.03)',
                      color: kit.colors.textSoft,
                      fontSize: 15,
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

export const UltimateArchitectureMap: React.FC<UltimateArchitectureMapProps> = ({
  heading,
  centerTitle,
  centerDetail,
  nodes,
  accent = 'cyan',
  layout = 'radial',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleNodes = nodes.slice(0, 5);
  const nodeMetrics = visibleNodes.map((node) => ({
    node,
    ...estimateArchitectureNodeCard(node.label, node.detail),
  }));
  const useRadial = layout !== 'stack' && visibleNodes.length > 3;
  const headingLines = splitDisplayLinesBalanced(heading, useRadial ? 14 : 18, 3);
  const headingSize = headingLines.length >= 3 ? 42 : headingLines.length === 2 || measureText(heading) > 24 ? 48 : 56;
  const headingLineGap = headingLines.length >= 3 ? 2 : 6;
  const headingBlockHeight = headingLines.reduce((total, _line, index) => (
    total + headingSize * 1.08 + (index > 0 ? headingLineGap : 0)
  ), 0);
  const headingBottom = 90 + 18 * 1.2 + 22 + headingBlockHeight;
  const centerTopShift = useRadial
    ? 0
    : Math.min(92, Math.max(0, Math.round((headingBottom + 34 - 160) * 0.52)));
  const headingMaxWidth = useRadial
    ? headingLines.length >= 3
      ? 760
      : headingLines.length === 2
        ? 840
        : 980
    : 980;
  const headingRightPadding = useRadial ? 420 : 130;
  const topClusterSize = useRadial ? Math.min(3, nodeMetrics.length) : 0;
  const topClusterHeight = useRadial
    ? Math.max(0, ...nodeMetrics.slice(0, topClusterSize).map((entry) => entry.cardHeight))
    : 0;
  const centerDetailLines = centerDetail ? splitDisplayLinesBalanced(centerDetail, 28, 2) : [];
  const centerBoxHeight = centerDetailLines.length > 1 ? 262 : centerDetail ? 244 : 210;
  const upperRowTop = useRadial ? Math.max(headingBottom + 36, 248) : 0;
  const centerBox = {
    left: 620,
    top: useRadial ? Math.max(468, upperRowTop + topClusterHeight + 64) : 392 + centerTopShift,
    width: 680,
    height: centerBoxHeight,
  };
  const lowerRowTop = centerBox.top + centerBox.height + 56;
  const radialSlots = [
    {centerX: 306, top: upperRowTop + 34},
    {centerX: 992, top: upperRowTop},
    {centerX: 1646, top: upperRowTop + 26},
    {centerX: 1628, top: lowerRowTop + 12},
    {centerX: 960, top: lowerRowTop},
    {centerX: 294, top: lowerRowTop + 6},
  ];
  const resolveRadialPosition = (index: number, cardWidth: number) => {
    const slot = radialSlots[index] || radialSlots[radialSlots.length - 1];
    return {
      top: slot.top,
      left: Math.round(slot.centerX - cardWidth / 2),
    };
  };
  const resolveCoreAnchor = (nodeCenterX: number, nodeCenterY: number) => {
    const coreCenterX = centerBox.left + centerBox.width / 2;
    const coreCenterY = centerBox.top + centerBox.height / 2;
    const dx = nodeCenterX - coreCenterX;
    const dy = nodeCenterY - coreCenterY;
    const halfWidth = centerBox.width / 2;
    const halfHeight = centerBox.height / 2;
    const clampedYOffset = Math.max(-halfHeight * 0.42, Math.min(halfHeight * 0.42, dy * 0.22));
    const clampedXOffset = Math.max(-halfWidth * 0.3, Math.min(halfWidth * 0.3, dx * 0.2));

    if (Math.abs(dx) / halfWidth >= Math.abs(dy) / halfHeight) {
      return {
        x: coreCenterX + (dx === 0 ? 1 : Math.sign(dx)) * (halfWidth + 8),
        y: coreCenterY + clampedYOffset,
      };
    }

    return {
      x: coreCenterX + clampedXOffset,
      y: coreCenterY + (dy === 0 ? 1 : Math.sign(dy)) * (halfHeight + 8),
    };
  };

  // Architecture map: 提升核心节点与外围节点的留白，对径向/堆叠两种布局都做疏密统一。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 130, right: headingRightPadding}}>
        <div style={eyebrowStyle(accentColor, false)}>系统结构</div>
        <div style={{marginTop: 22, maxWidth: headingMaxWidth}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : headingLineGap,
                ...sectionHeadingStyle(headingSize, false),
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
      {useRadial
        ? nodeMetrics.map((entry, index) => {
            const reveal = buildReveal(frame, 8 + index * 6);
            const nodeColor = toneToColor(entry.node.accent ?? accent);
            const position = resolveRadialPosition(index, entry.cardWidth);
            const nodeCenterX = position.left + entry.cardWidth / 2;
            const nodeCenterY = position.top + entry.cardHeight / 2;
            const anchor = resolveCoreAnchor(nodeCenterX, nodeCenterY);
            const dx = nodeCenterX - anchor.x;
            const dy = nodeCenterY - anchor.y;
            const length = Math.max(0, Math.hypot(dx, dy) - 26);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const pulseProgress = 0.22 + (((frame * 0.022) + index * 0.17) % 0.52);

            return (
              <div key={`${entry.node.label}-${index}`}>
                <div
                  style={{
                    position: 'absolute',
                    left: anchor.x,
                    top: anchor.y,
                    width: length,
                    height: 2,
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg)`,
                    background: `linear-gradient(90deg, ${accentColor}70, ${nodeColor}44, transparent)`,
                    opacity: reveal,
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: anchor.x + Math.cos((angle * Math.PI) / 180) * length * pulseProgress - 5,
                    top: anchor.y + Math.sin((angle * Math.PI) / 180) * length * pulseProgress - 5,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: nodeColor,
                    boxShadow: ultimateGlow(nodeColor, 0.42),
                    opacity: reveal,
                    zIndex: 1,
                  }}
                />
              </div>
            );
          })
        : (
          null
        )}
      <div
        style={{
          position: 'absolute',
          left: centerBox.left,
          top: centerBox.top,
          width: centerBox.width,
          minHeight: centerBox.height,
          padding: `${relaxedPanelPadding.roomyY}px 40px`,
          textAlign: 'center',
          transform: withMicroJitter(frame, '', {
            delay: 8,
            amplitudeX: 1.1,
            amplitudeY: 0.9,
            rotateDeg: 0.18,
            scaleDelta: 0.002,
            seed: 170,
          }),
          zIndex: 2,
          ...panelStyle(accentColor),
          boxShadow: `0 28px 90px rgba(0,0,0,0.24), 0 0 60px ${accentColor}18`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -18,
            borderRadius: 40,
            border: `1px solid ${accentColor}22`,
            opacity: 0.42 + Math.sin(frame * 0.05) * 0.12,
          }}
        />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            borderRadius: kit.radius.pill,
            border: `1px solid ${accentColor}3a`,
            color: accentColor,
            background: `${accentColor}14`,
          }}
        >
          <SemanticIconBadge
            semanticText={`${centerTitle} ${centerDetail || ''}`}
            color={accentColor}
            badgeSize={36}
            size={16}
            family="architecture-map"
            rounded={12}
            motionDelay={8}
            motionSeed={170}
          />
          <span style={{fontSize: 16, lineHeight: 1.2, letterSpacing: 2.2, textTransform: 'uppercase'}}>核心节点</span>
        </div>
        <div style={{marginTop: 22, fontSize: 52, fontWeight: 840, lineHeight: 1.14}}>{centerTitle}</div>
        {centerDetail ? (
          <div
            style={{
              marginTop: 22,
              ...bodyTextStyle(18, kit.colors.textMuted, true),
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {centerDetailLines.map((line, index) => (
              <div key={`${line}-${index}`} style={{marginTop: index === 0 ? 0 : 4}}>
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {useRadial
        ? nodeMetrics.map((entry, index) => {
            const reveal = buildReveal(frame, 8 + index * 6);
            const nodeColor = toneToColor(entry.node.accent ?? accent);
            const position = resolveRadialPosition(index, entry.cardWidth);

            return (
              <div
                key={`${entry.node.label}-card-${index}`}
                style={{
                  position: 'absolute',
                  left: position.left,
                  top: position.top,
                  width: entry.cardWidth,
                  height: entry.cardHeight,
                  padding: '24px 26px',
                  boxSizing: 'border-box',
                  opacity: reveal,
                  zIndex: 3,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                    {
                      delay: 8 + index * 6,
                      amplitudeX: 1.2,
                      amplitudeY: 1,
                      rotateDeg: 0.22,
                      scaleDelta: 0.002,
                      seed: 180 + index,
                    },
                  ),
                  ...panelStyle(nodeColor),
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `1px solid ${nodeColor}66`,
                    opacity: 0.42 + Math.sin(frame * 0.08 + index) * 0.22,
                    boxShadow: ultimateGlow(nodeColor, 0.18),
                  }}
                />
                <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
                  <SemanticIconBadge
                    iconValue={entry.node.icon}
                    semanticText={`${entry.node.label} ${entry.node.detail || ''}`}
                    color={nodeColor}
                    badgeSize={36}
                    size={15}
                    fallbackIndex={index}
                    family="architecture-map"
                    rounded={12}
                    motionDelay={8 + index * 6}
                    motionSeed={180 + index}
                  />
                  <div style={{flex: 1, minWidth: 0}}>
                    {entry.labelLines.map((line, lineIndex) => (
                      <div
                        key={`${line}-${lineIndex}`}
                        style={{
                          fontSize: entry.labelSize,
                          fontWeight: 760,
                          lineHeight: 1.12,
                          marginTop: lineIndex === 0 ? 0 : 2,
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
                {entry.detailLines.length > 0 ? (
                  <div style={{marginTop: 16, ...bodyTextStyle(entry.detailSize)}}>
                    {entry.detailLines.map((line, lineIndex) => (
                      <div key={`${line}-${lineIndex}`} style={{marginTop: lineIndex === 0 ? 0 : 3}}>
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        : (
          <div
            style={{
              position: 'absolute',
              left: 120,
              right: 120,
              top: 700,
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(Math.max(visibleNodes.length, 1), 3)}, minmax(0, 1fr))`,
              gap: 24,
            }}
          >
            {nodeMetrics.map((entry, index) => {
              const reveal = buildReveal(frame, 8 + index * 6);
              const nodeColor = toneToColor(entry.node.accent ?? accent);
              return (
                <div
                  key={`${entry.node.label}-${index}`}
                  style={{
                    minHeight: entry.cardHeight,
                    padding: '24px 26px',
                    opacity: reveal,
                    transform: withMicroJitter(
                      frame,
                      `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                      {
                        delay: 8 + index * 6,
                        amplitudeX: 1.1,
                        amplitudeY: 1,
                        rotateDeg: 0.22,
                        scaleDelta: 0.002,
                        seed: 190 + index,
                      },
                    ),
                    ...panelStyle(nodeColor),
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
                    <SemanticIconBadge
                      iconValue={entry.node.icon}
                      semanticText={`${entry.node.label} ${entry.node.detail || ''}`}
                      color={nodeColor}
                      badgeSize={36}
                      size={15}
                      fallbackIndex={index}
                      family="architecture-map"
                      rounded={12}
                      motionDelay={8 + index * 6}
                      motionSeed={190 + index}
                    />
                    <div style={{flex: 1, minWidth: 0}}>
                      {entry.labelLines.map((line, lineIndex) => (
                        <div
                          key={`${line}-${lineIndex}`}
                          style={{
                            fontSize: Math.min(entry.labelSize, 26),
                            fontWeight: 760,
                            lineHeight: 1.12,
                            marginTop: lineIndex === 0 ? 0 : 2,
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                  {entry.detailLines.length > 0 ? (
                    <div style={{marginTop: 16, ...bodyTextStyle(entry.detailSize)}}>
                      {entry.detailLines.map((line, lineIndex) => (
                        <div key={`${line}-${lineIndex}`} style={{marginTop: lineIndex === 0 ? 0 : 3}}>
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

export const UltimateTerminalPanel: React.FC<UltimateTerminalPanelProps> = ({
  heading,
  windowTitle = '',
  command,
  outputs,
  note,
  accent = 'green',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const commandLength = Math.min(command.length, Math.floor(Math.max(frame - 8, 0) * 2.6));
  const visibleOutputs = outputs.slice(0, 4);
  const outputStart = Math.max(frame - 34, 0);
  const blinkVisible = Math.floor(frame / 10) % 2 === 0;

  // Terminal: 扩大窗口内容区和行距，让命令、输出、备注三层信息更容易扫读。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 126, left: 0, right: 0}}>
        <div style={eyebrowStyle(accentColor)}>{heading}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 340,
          right: 340,
          top: 228,
          transform: withMicroJitter(frame, '', {
            delay: 10,
            amplitudeX: 1.1,
            amplitudeY: 0.9,
            rotateDeg: 0.14,
            scaleDelta: 0.002,
            seed: 200,
          }),
          ...panelStyle(accentColor),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 22px',
            background: 'rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
            <div key={color} style={{width: 12, height: 12, borderRadius: '50%', background: color}} />
          ))}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: kit.fonts.mono,
              fontSize: 17,
              lineHeight: 1.2,
              color: kit.colors.textSoft,
            }}
          >
            {windowTitle}
          </div>
        </div>
        <div style={{padding: '34px 40px 40px', fontFamily: kit.fonts.mono}}>
          <div style={{display: 'flex', gap: 14, fontSize: 24, lineHeight: 1.66}}>
            <span style={{color: accentColor}}>$</span>
            <span style={{color: kit.colors.text}}>{command.slice(0, commandLength)}</span>
            {commandLength < command.length && blinkVisible ? (
              <span style={{width: 3, background: accentColor, boxShadow: ultimateGlow(accentColor, 0.4)}} />
            ) : null}
          </div>
          <div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18}}>
            {visibleOutputs.map((line, index) => {
              const reveal = interpolate(outputStart - index * 10, [0, 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const typedChars = Math.max(0, Math.floor((frame - 40 - index * 10) * 2.2));
              const lineDone = typedChars >= line.length;
              const visibleText = line.slice(0, typedChars);
              return (
                <div
                  key={`${line}-${index}`}
                  style={{
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [6, 0])}px)`,
                    fontSize: 20,
                    lineHeight: 1.72,
                    color: line.startsWith('>') ? resolveUltimateAccent('green') : kit.colors.textMuted,
                    minHeight: 38,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{opacity: 0.7}}>{visibleText}</span>
                  {!lineDone && typedChars > 0 && blinkVisible ? (
                    <span style={{width: 3, height: 24, background: accentColor, boxShadow: ultimateGlow(accentColor, 0.26)}} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {note ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 144,
            textAlign: 'center',
            ...bodyTextStyle(18, kit.colors.textMuted, true),
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
};

export const UltimateTagMatrix: React.FC<UltimateTagMatrixProps> = ({
  heading,
  tabs = [],
  activeTab,
  items,
}) => {
  const frame = useCurrentFrame();
  const primaryItems = items.slice(0, Math.min(3, items.length));
  const secondaryItems = items.slice(primaryItems.length);

  // Tag matrix: 突出前三个主模块，其余标签收成次级胶囊，减少同屏等权元素。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 112, left: 0, right: 0}}>
        <div
          style={{
            marginTop: 0,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg),
          }}
        >
          {heading}
        </div>
      </div>
      {tabs.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 242,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            const color = isActive ? resolveUltimateAccent('orange') : 'rgba(229, 236, 255, 0.22)';
            return (
              <div
                key={tab}
                style={{
                  padding: '14px 24px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${isActive ? `${color}40` : 'rgba(229,236,255,0.12)'}`,
                  background: isActive ? 'rgba(255, 173, 99, 0.12)' : 'rgba(255,255,255,0.04)',
                  color,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </div>
            );
          })}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 210,
          right: 210,
          top: 356,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(primaryItems.length, 1)}, minmax(0, 1fr))`,
          columnGap: 28,
          rowGap: 28,
        }}
      >
        {primaryItems.map((item, index) => {
          const color = toneToColor(item.accent ?? (index % 2 === 0 ? 'cyan' : 'green'));
          const reveal = buildReveal(frame, index * 4);
          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                ...panelStyle(color),
                minHeight: 144,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 28px',
                opacity: reveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                  {
                    delay: index * 4,
                    amplitudeX: 1,
                    amplitudeY: 0.8,
                    rotateDeg: 0.18,
                    scaleDelta: 0.002,
                    seed: 210 + index,
                  },
                ),
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1.28,
                  textAlign: 'center',
                  color,
                  textShadow: ultimateGlow(color, 0.35),
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      {secondaryItems.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 240,
            right: 240,
            top: 568,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
            rowGap: 18,
          }}
        >
          {secondaryItems.map((item, index) => {
            const color = toneToColor(item.accent ?? (index % 2 === 0 ? 'cyan' : 'green'));
            const reveal = buildReveal(frame, 14 + index * 2);
            return (
              <div
                key={`${item.label}-${index + primaryItems.length}`}
                style={{
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${color}24`,
                  background: `linear-gradient(180deg, ${color}12, rgba(10, 13, 24, 0.92))`,
                  padding: '14px 20px',
                  minWidth: 156,
                  textAlign: 'center',
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [12, 0])}px)`,
                    {
                      delay: 14 + index * 2,
                      amplitudeX: 0.9,
                      amplitudeY: 0.7,
                      rotateDeg: 0.12,
                      scaleDelta: 0.002,
                      seed: 260 + index,
                    },
                  ),
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.28,
                    color,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const UltimateCodePanel: React.FC<UltimateCodePanelProps> = ({
  heading,
  filename = '',
  lines,
  highlightLine = 1,
  footer,
  accent = 'purple',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const headingLines = splitDisplayLines(heading, 14, 2);
  const summaryLines = splitDisplayLines(footer || '', 28, 2);
  const facts = parseCodeFacts(lines).slice(0, 3);

  // Code panel: 把结论卡、文件头和代码行都拉开，避免高信息密度时一屏发闷。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 128, left: 220, right: 220, textAlign: 'center'}}>
        {headingLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              ...sectionHeadingStyle(headingLines.length > 1 ? 52 : 56),
            }}
          >
            {line}
          </div>
        ))}
        {summaryLines.length > 0 ? (
          <div style={{marginTop: 20}}>
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
          left: 198,
          right: 198,
          top: 330,
          bottom: 138,
          display: 'grid',
          gridTemplateColumns: '436px minmax(0, 1fr)',
          gap: 32,
        }}
      >
        <div
          style={{
            ...panelStyle(accentColor),
            padding: `${relaxedPanelPadding.y}px ${relaxedPanelPadding.x}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transform: withMicroJitter(frame, '', {
              delay: 8,
              amplitudeX: 1,
              amplitudeY: 0.9,
              rotateDeg: 0.14,
              scaleDelta: 0.002,
              seed: 230,
            }),
          }}
        >
          {facts.map((fact, index) => {
            const factColor =
              fact.tone === 'accent'
                ? accentColor
                : fact.tone === 'muted'
                  ? resolveUltimateAccent('yellow')
                  : index % 2 === 0
                    ? accentColor
                    : resolveUltimateAccent('cyan');
            const reveal = buildReveal(frame, 8 + index * 4);

            return (
              <div
                key={`${fact.label}-${index}`}
                style={{
                  padding: '24px 22px 22px',
                  borderRadius: 22,
                  border: `1px solid ${factColor}30`,
                  background: `linear-gradient(180deg, ${factColor}10, rgba(10, 13, 24, 0.92))`,
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [14, 0])}px)`,
                    {
                      delay: 8 + index * 4,
                      amplitudeX: 1,
                      amplitudeY: 0.9,
                      rotateDeg: 0.2,
                      scaleDelta: 0.002,
                      seed: 240 + index,
                    },
                  ),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    ...overlineLabelStyle(factColor),
                    fontSize: 17,
                  }}
                >
                  <SemanticIconBadge
                    semanticText={`${fact.label} ${fact.value}`}
                    color={factColor}
                    badgeSize={34}
                    size={14}
                    fallbackIndex={index}
                    family="code"
                    rounded={12}
                    motionDelay={8 + index * 4}
                    motionSeed={240 + index}
                  />
                  {fact.label}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    fontSize: 26,
                    lineHeight: 1.46,
                    fontWeight: 800,
                    color: kit.colors.text,
                    ...lineClampStyle(2),
                  }}
                >
                  {fact.value}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            ...panelStyle(accentColor),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transform: withMicroJitter(frame, '', {
              delay: 12,
              amplitudeX: 1,
              amplitudeY: 0.8,
              rotateDeg: 0.12,
              scaleDelta: 0.0016,
              seed: 250,
            }),
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              fontFamily: kit.fonts.mono,
              fontSize: 18,
              lineHeight: 1.3,
              color: kit.colors.textSoft,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {filename || 'agent-workflow.json'}
          </div>
          <div style={{padding: '28px 0 22px 0', fontFamily: kit.fonts.mono, flex: 1}}>
          {lines.map((line, index) => {
            const reveal = buildReveal(frame, index * 3);
            const toneColor =
              line.tone === 'accent'
                ? accentColor
                : line.tone === 'muted'
                  ? kit.colors.textSoft
                  : kit.colors.text;
            return (
                <div
                  key={`${line.text}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr',
                    alignItems: 'start',
                    padding: '12px 30px',
                    background: highlightLine === index + 1 ? `${accentColor}18` : 'transparent',
                    borderLeft: highlightLine === index + 1 ? `3px solid ${accentColor}` : '3px solid transparent',
                    opacity: reveal,
                    transform: withMicroJitter(
                      frame,
                      `translateY(${interpolate(reveal, [0, 1], [6, 0])}px)`,
                      {
                        delay: index * 3,
                        amplitudeX: 0.55,
                        amplitudeY: 0.45,
                        rotateDeg: 0.06,
                        scaleDelta: 0.001,
                        seed: 260 + index,
                      },
                    ),
                  }}
                >
                <div
                  style={{
                    color: highlightLine === index + 1 ? accentColor : 'rgba(255,255,255,0.28)',
                    textAlign: 'right',
                    paddingRight: 20,
                    fontWeight: highlightLine === index + 1 ? 800 : 500,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div style={{fontSize: 20, lineHeight: 1.74, whiteSpace: 'pre-wrap'}}>
                  {renderCodeLineText(line.text, accentColor, toneColor)}
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const UltimateMetricBars: React.FC<UltimateMetricBarsProps> = ({
  heading,
  summary,
  items,
  layout = 'bars',
}) => {
  const frame = useCurrentFrame();
  const headingLines = splitDisplayLines(heading, 18, 2);
  const summaryLines = splitDisplayLines(summary || '', 28, 2);
  const headingSize = headingLines.length > 1 || measureText(heading) > 22 ? 58 : 66;

  const resolvedLayout = layout === 'cards' || items.length > 4 ? 'cards' : 'bars';

  // Metrics: 提升数字区行高与卡片留白，让结果优先被看到，辅助标签退到第二层。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div
        style={{
          position: 'absolute',
          top: 132,
          left: 220,
          right: 220,
          textAlign: 'center',
        }}
      >
        {headingLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              marginTop: index === 0 ? 0 : 6,
              ...sectionHeadingStyle(Math.min(headingSize, 56)),
            }}
          >
            {line}
          </div>
        ))}
        {summaryLines.length > 0 ? (
          <div style={{marginTop: 22}}>
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
      {resolvedLayout === 'cards' ? (
        <div
          style={{
            position: 'absolute',
            left: 170,
            right: 810,
            top: 340,
            bottom: 160,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 28,
            alignContent: 'center',
          }}
        >
          {items.map((item, index) => {
            const color = toneToColor(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'green' : 'yellow'));
            const progress = interpolate(frame, [10 + index * 8, 34 + index * 8], [0, item.ratio], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const animatedValue = animateMetricDisplay(item.value, progress);
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  ...panelStyle(color),
                  minHeight: 220,
                  padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transform: withMicroJitter(frame, '', {
                    delay: 10 + index * 8,
                    amplitudeX: 1.1,
                    amplitudeY: 0.9,
                    rotateDeg: 0.18,
                    scaleDelta: 0.002,
                    seed: 270 + index,
                  }),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      <SemanticIconBadge
                        iconValue={item.icon}
                        semanticText={`${item.label} ${item.value}`}
                      color={color}
                      badgeSize={38}
                      size={16}
                      fallbackIndex={index}
                      family="metrics"
                      rounded={14}
                      motionDelay={10 + index * 8}
                      motionSeed={270 + index}
                    />
                    <div
                      style={{
                        ...overlineLabelStyle(color),
                        fontSize: 17,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                  <div style={{width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: ultimateGlow(color, 0.45)}} />
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
                  <div>
                    <div
                      style={{
                        fontSize: 58,
                        lineHeight: 1.18,
                        fontWeight: 800,
                        color,
                        textShadow: ultimateGlow(color, 0.35),
                      }}
                    >
                      {animatedValue}
                    </div>
                    <div style={{fontSize: 17, lineHeight: 1.3, color: kit.colors.textMuted, marginTop: 14}}>Key signal</div>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      width: 110,
                      height: 110,
                      borderRadius: '50%',
                      background: `conic-gradient(${color} ${Math.max(6, progress * 360)}deg, rgba(255,255,255,0.08) 0deg)`,
                      boxShadow: ultimateGlow(color, 0.28),
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 13,
                        borderRadius: '50%',
                        background: 'rgba(8, 10, 18, 0.92)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 17,
                        fontWeight: 800,
                        color,
                      }}
                    >
                      {Math.round(progress * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 120,
            right: 120,
            top: 328,
            bottom: 148,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: items.length >= 4 ? 32 : 38,
            }}
          >
            {items.slice(0, 4).map((item, index) => {
              const color = toneToColor(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'green' : 'yellow'));
              const reveal = buildReveal(frame, 8 + index * 5);
              const progress = interpolate(frame, [10 + index * 8, 38 + index * 8], [0, item.ratio], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const fillWidth = Math.max(0, progress * 100);
              const dotVisible = progress > 0.04;
              const animatedValue = animateMetricDisplay(item.value, progress);

              return (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: item.icon ? '250px 1fr 156px' : '210px 1fr 156px',
                    alignItems: 'center',
                    gap: 32,
                    opacity: reveal,
                    transform: withMicroJitter(
                      frame,
                      `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                      {
                        delay: 8 + index * 5,
                        amplitudeX: 1.1,
                        amplitudeY: 0.9,
                        rotateDeg: 0.16,
                        scaleDelta: 0.002,
                        seed: 280 + index,
                      },
                    ),
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: item.icon ? 16 : 0,
                      fontSize: 28,
                      fontWeight: 700,
                      color: color,
                      textShadow: ultimateGlow(color, 0.2),
                    }}
                  >
                    {item.icon ? (
                      <SemanticIconBadge
                        iconValue={item.icon}
                        semanticText={`${item.label} ${item.value}`}
                        color={color}
                        badgeSize={48}
                        size={20}
                        fallbackIndex={index}
                        family="metrics"
                        rounded={18}
                        motionDelay={8 + index * 5}
                        motionSeed={280 + index}
                      />
                    ) : null}
                    <span>{item.label}</span>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: 38,
                      borderRadius: kit.radius.pill,
                      overflow: 'hidden',
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.08))',
                      border: '1px solid rgba(255,255,255,0.05)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <div
                      style={{
                        width: `${fillWidth}%`,
                        height: '100%',
                        borderRadius: kit.radius.pill,
                        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.96))`,
                        boxShadow: ultimateGlow(color, 0.42),
                      }}
                    />
                    {dotVisible ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: `calc(${100 - fillWidth}% - 11px)`,
                          top: '50%',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(255,255,255,0.92)',
                          boxShadow: ultimateGlow(color, 0.7),
                          opacity: reveal,
                        }}
                      />
                    ) : null}
                  </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 122,
                          height: 122,
                          borderRadius: '50%',
                          background: `conic-gradient(${color} ${Math.max(6, progress * 360)}deg, rgba(255,255,255,0.08) 0deg)`,
                          boxShadow: ultimateGlow(color, 0.32),
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 15,
                            borderRadius: '50%',
                            background: 'rgba(8, 10, 18, 0.94)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              fontSize: animatedValue.length > 8 ? 20 : 24,
                              lineHeight: 1.16,
                              fontWeight: 800,
                              color,
                              textShadow: ultimateGlow(color, 0.3),
                            }}
                          >
                            {animatedValue}
                          </div>
                          <div style={{fontSize: 12, letterSpacing: 1.4, color: kit.colors.textSoft}}>progress</div>
                        </div>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const UltimateDataStream: React.FC<UltimateDataStreamProps> = ({
  heading,
  summary,
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 3);

  // Data stream: 放大左侧指标卡和右侧流场留白，让数值、说明、动态图层更容易分层阅读。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 118, left: 150, right: 150}}>
        <div style={eyebrowStyle(accentColor)}>实时数据流</div>
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
              maxWidth: 920,
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
          left: 150,
          top: 332,
          width: 450,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {visibleItems.map((item, index) => {
          const color = toneToColor(item.accent ?? (index === 0 ? accent : index === 1 ? 'green' : 'purple'));
          const reveal = buildReveal(frame, 8 + index * 6);
          const progress = interpolate(frame, [12 + index * 8, 34 + index * 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                ...panelStyle(color),
                minHeight: 180,
                padding: `${relaxedPanelPadding.y}px ${relaxedPanelPadding.x}px`,
                opacity: reveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                  {
                    delay: 8 + index * 6,
                    amplitudeX: 1,
                    amplitudeY: 0.9,
                    rotateDeg: 0.18,
                    scaleDelta: 0.002,
                    seed: 320 + index,
                  },
                ),
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
                <div style={{...overlineLabelStyle(color), fontSize: 16}}>{item.label}</div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: kit.radius.pill,
                    border: `1px solid ${color}32`,
                    background: `${color}12`,
                    color,
                    fontSize: 14,
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                    letterSpacing: 1.6,
                  }}
                >
                  {item.trend || 'steady'}
                </div>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: 56,
                  lineHeight: 1.18,
                  fontWeight: 800,
                  color,
                  textShadow: ultimateGlow(color, 0.28),
                }}
              >
                {animateMetricDisplay(item.value, progress)}
              </div>
              {item.detail ? (
                <div style={{marginTop: 16, ...bodyTextStyle(17)}}>
                  {item.detail}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 150,
          top: 334,
          width: 1050,
          height: 468,
          ...panelStyle(accentColor),
          padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.roomyX}px`,
          overflow: 'hidden',
        }}
      >
        <div style={{...overlineLabelStyle(accentColor), fontSize: 16}}>stream field</div>
        {[0, 1, 2].map((lane) => {
          const color = toneToColor(visibleItems[lane]?.accent ?? (lane === 0 ? accent : lane === 1 ? 'green' : 'purple'));
          const travel = ((frame * (3.2 + lane * 0.7)) % 1120) - 180;
          return (
            <div key={lane} style={{position: 'absolute', left: 36, right: 36, top: 108 + lane * 116, height: 92}}>
              <div
                style={{
                  position: 'absolute',
                  inset: '50% 0 auto 0',
                  height: 2,
                  transform: 'translateY(-50%)',
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  opacity: 0.56,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 11,
                  left: travel,
                  width: 190,
                  height: 70,
                  borderRadius: 22,
                  border: `1px solid ${color}36`,
                  background: `linear-gradient(180deg, ${color}16, rgba(8, 10, 18, 0.88))`,
                  boxShadow: ultimateGlow(color, 0.18),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                  fontWeight: 800,
                  fontSize: 18,
                  lineHeight: 1.2,
                }}
              >
                {visibleItems[lane]?.label || `Lane ${lane + 1}`}
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 32,
            display: 'flex',
            gap: 14,
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
              {item.trend || (index === 0 ? 'up' : 'steady')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  const positions = [
    {left: 286, top: 326},
    {left: 1360, top: 302},
    {left: 1264, top: 690},
    {left: 360, top: 716},
  ];
  const center = {x: 960, y: 530};

  // Memory graph: 放松中心节点与外围节点的排版，让“核心概念 + 关联记忆”层次更清楚。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 108, left: 140, right: 140}}>
        <div style={eyebrowStyle(accentColor)}>记忆图谱</div>
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
          left: center.x - 220,
          top: center.y - 166,
          width: 440,
          minHeight: 332,
          padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px`,
          borderRadius: 36,
          textAlign: 'center',
          ...panelStyle(accentColor),
          boxShadow: `0 0 0 18px ${accentColor}08, ${ultimateGlow(accentColor, 0.2)}`,
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            margin: '0 auto',
            borderRadius: '50%',
            border: `1px solid ${accentColor}55`,
            background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.18), ${accentColor} 28%, rgba(8, 10, 18, 0.96) 78%)`,
            boxShadow: ultimateGlow(accentColor, 0.45),
          }}
        />
        <div style={{marginTop: 28, fontSize: 44, fontWeight: 840, lineHeight: 1.16}}>{centerTitle}</div>
        {centerDetail ? (
          <div style={{marginTop: 18, ...bodyTextStyle(18, kit.colors.textMuted, true)}}>
            {centerDetail}
          </div>
        ) : null}
      </div>

      {visibleNodes.map((node, index) => {
        const color = toneToColor(node.accent ?? accent);
        const position = positions[index];
        const dx = position.left + 160 - center.x;
        const dy = position.top + 86 - center.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const length = Math.hypot(dx, dy) - 220;
        const pulse = 0.28 + (((frame * 0.018) + index * 0.2) % 0.42);

        return (
          <div key={`${node.label}-${index}`}>
            <div
              style={{
                position: 'absolute',
                left: center.x,
                top: center.y,
                width: length,
                height: 2,
                transformOrigin: '0 50%',
                transform: `rotate(${angle}deg)`,
                background: `linear-gradient(90deg, ${accentColor}70, ${color}50, transparent)`,
                opacity: 0.76,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: center.x + Math.cos((angle * Math.PI) / 180) * length * pulse - 6,
                top: center.y + Math.sin((angle * Math.PI) / 180) * length * pulse - 6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: color,
                boxShadow: ultimateGlow(color, 0.36),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: position.left,
                top: position.top,
                width: 332,
                minHeight: 184,
                padding: `${relaxedPanelPadding.y}px 28px 24px`,
                ...panelStyle(color),
                transform: withMicroJitter(frame, '', {
                  delay: index * 6,
                  amplitudeX: 0.8,
                  amplitudeY: 0.8,
                  rotateDeg: 0.16,
                  scaleDelta: 0.002,
                  seed: 340 + index,
                }),
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <SemanticIconBadge
                  iconValue={node.icon}
                  semanticText={`${node.label} ${node.detail || ''}`}
                  color={color}
                  badgeSize={38}
                  size={16}
                  fallbackIndex={index}
                  family="memory-graph"
                  rounded={14}
                />
                <div style={{fontSize: 26, fontWeight: 800, lineHeight: 1.2}}>{node.label}</div>
              </div>
              {node.detail ? (
                <div style={{marginTop: 16, ...bodyTextStyle(17), ...lineClampStyle(2)}}>
                  {node.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const UltimatePipelineFlow: React.FC<UltimatePipelineFlowProps> = ({
  heading,
  summary,
  stages,
  accent = 'green',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleStages = stages.slice(0, 4);

  // Pipeline flow: 加大步骤卡与连接器周围留白，让流程感比“卡片堆积感”更强。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 112, left: 150, right: 150}}>
        <div style={eyebrowStyle(accentColor)}>管线流程</div>
        <div
          style={{
            marginTop: 22,
            ...sectionHeadingStyle(relaxedTypeScale.title.lg),
          }}
        >
          {heading}
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
          left: 150,
          right: 150,
          top: 408,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(visibleStages.length, 1)}, minmax(0, 1fr))`,
          gap: 28,
        }}
      >
        {visibleStages.map((stage, index) => {
          const color = toneToColor(stage.accent ?? (index === 0 ? accent : index === 1 ? 'cyan' : index === 2 ? 'yellow' : 'purple'));
          const reveal = buildReveal(frame, 8 + index * 6);
          return (
            <div key={`${stage.label}-${index}`} style={{position: 'relative'}}>
              <div
                style={{
                  ...panelStyle(color),
                  minHeight: 254,
                  padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.x}px 24px`,
                  opacity: reveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                    {
                      delay: 8 + index * 6,
                      amplitudeX: 0.9,
                      amplitudeY: 0.8,
                      rotateDeg: 0.14,
                      scaleDelta: 0.002,
                      seed: 360 + index,
                    },
                  ),
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
                  <SemanticIconBadge
                    iconValue={stage.icon}
                    semanticText={`${stage.label} ${stage.detail || ''}`}
                    color={color}
                    badgeSize={42}
                    size={18}
                    fallbackIndex={index}
                    family="pipeline-flow"
                    rounded={14}
                  />
                  <div style={{fontSize: 15, lineHeight: 1.2, letterSpacing: 2, color, textTransform: 'uppercase'}}>0{index + 1}</div>
                </div>
                <div style={{marginTop: 22, fontSize: 32, fontWeight: 800, lineHeight: 1.24}}>{stage.label}</div>
                {stage.detail ? (
                  <div style={{marginTop: 16, ...bodyTextStyle(17), ...lineClampStyle(2)}}>
                    {stage.detail}
                  </div>
                ) : null}
              </div>
              {index < visibleStages.length - 1 ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 116,
                      right: -20,
                      width: 42,
                      height: 3,
                      background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.14))`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 107,
                      right: -5 + (((frame * 3.2) % 24) - 12),
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: ultimateGlow(color, 0.3),
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UltimateBenchmarkChart: React.FC<UltimateBenchmarkChartProps> = ({
  heading,
  summary,
  primaryLabel,
  secondaryLabel,
  items,
  accent = 'yellow',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const visibleItems = items.slice(0, 3);

  // Benchmark chart: 增加图例、条形和数值列之间的留白，让对比关系先于细节被读到。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 114, left: 160, right: 160}}>
        <div style={eyebrowStyle(accentColor)}>性能对比</div>
        <div style={{marginTop: 22, ...sectionHeadingStyle(relaxedTypeScale.title.lg)}}>
          {heading}
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
          left: 180,
          right: 180,
          top: 334,
          bottom: 142,
          ...panelStyle(accentColor),
          padding: `${relaxedPanelPadding.roomyY}px ${relaxedPanelPadding.roomyX}px`,
        }}
      >
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 20, marginBottom: 24}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, color: resolveUltimateAccent('cyan'), fontSize: 16, lineHeight: 1.2}}>
            <div style={{width: 12, height: 12, borderRadius: '50%', background: resolveUltimateAccent('cyan')}} />
            {primaryLabel}
          </div>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, color: resolveUltimateAccent('yellow'), fontSize: 16, lineHeight: 1.2}}>
            <div style={{width: 12, height: 12, borderRadius: '50%', background: resolveUltimateAccent('yellow')}} />
            {secondaryLabel}
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 28}}>
          {visibleItems.map((item, index) => {
            const reveal = buildReveal(frame, 8 + index * 6);
            const primaryColor = resolveUltimateAccent('cyan');
            const secondaryColor = toneToColor(item.accent ?? 'yellow');
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  opacity: reveal,
                  transform: withMicroJitter(frame, `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`, {
                    delay: 8 + index * 6,
                    amplitudeX: 0.8,
                    amplitudeY: 0.7,
                    rotateDeg: 0.12,
                    scaleDelta: 0.002,
                    seed: 390 + index,
                  }),
                }}
              >
                <div style={{fontSize: 22, lineHeight: 1.24, fontWeight: 800, marginBottom: 14}}>{item.label}</div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 132px', gap: 24, alignItems: 'center'}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                    <div style={{height: 20, borderRadius: kit.radius.pill, background: 'rgba(255,255,255,0.06)', overflow: 'hidden'}}>
                      <div style={{width: `${item.primaryRatio * 100}%`, height: '100%', background: `linear-gradient(90deg, ${primaryColor}, rgba(255,255,255,0.9))`}} />
                    </div>
                    <div style={{height: 20, borderRadius: kit.radius.pill, background: 'rgba(255,255,255,0.06)', overflow: 'hidden'}}>
                      <div style={{width: `${item.secondaryRatio * 100}%`, height: '100%', background: `linear-gradient(90deg, ${secondaryColor}, rgba(255,255,255,0.9))`}} />
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'right'}}>
                    <div style={{fontSize: 20, lineHeight: 1.2, fontWeight: 800, color: primaryColor}}>{item.primaryValue}</div>
                    <div style={{fontSize: 20, lineHeight: 1.2, fontWeight: 800, color: secondaryColor}}>{item.secondaryValue}</div>
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

export const UltimateQuoteHighlight: React.FC<UltimateQuoteHighlightProps> = ({
  heading,
  quote,
  attribution,
  tags = [],
  accent = 'orange',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const reveal = buildReveal(frame, 0);
  const quoteLines = splitDisplayLinesBalanced(quote, 18, 3);

  // Quote highlight: 降低大段引文压迫感，拉开引文、署名和标签的三层节奏。
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: reveal,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 980,
          height: 980,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}14 0%, transparent 62%)`,
          filter: 'blur(12px)',
        }}
      />
      {heading ? <div style={{...eyebrowStyle(accentColor), marginBottom: 28}}>{heading}</div> : null}
      <div style={{maxWidth: 1280, fontFamily: kit.fonts.display, fontSize: 66, lineHeight: 1.16, letterSpacing: -2.2}}>
        {quoteLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
      {attribution ? (
        <div style={{marginTop: 28, ...bodyTextStyle(18, kit.colors.textMuted, true)}}>
          {attribution}
        </div>
      ) : null}
      {tags.length > 0 ? (
        <div style={{marginTop: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16}}>
          {tags.slice(0, 3).map((tag, index) => (
            <div
              key={`${tag.label}-${index}`}
              style={{
                padding: '14px 18px',
                borderRadius: kit.radius.pill,
                border: `1px solid ${toneToColor(tag.accent ?? accent)}28`,
                background: `${toneToColor(tag.accent ?? accent)}10`,
                color: toneToColor(tag.accent ?? accent),
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {tag.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const UltimateGlossaryTerm: React.FC<UltimateGlossaryTermProps> = ({
  heading,
  term,
  pronunciation,
  definition,
  related = [],
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);

  // Glossary term: 强化读音与术语卡节奏，并收紧定义文本宽度来减少左右两栏失衡。
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 118, left: 150, right: 150}}>
        <div style={eyebrowStyle(accentColor)}>术语定义</div>
        <div style={{marginTop: 22, ...sectionHeadingStyle(relaxedTypeScale.title.lg)}}>
          {heading}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 170,
          right: 170,
          top: 334,
          bottom: 168,
          display: 'grid',
          gridTemplateColumns: '0.84fr 1.16fr',
          gap: 36,
        }}
      >
        <div
          style={{
            ...panelStyle(accentColor),
            padding: `${relaxedPanelPadding.roomyY}px 42px 34px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{...overlineLabelStyle(accentColor), fontSize: 16}}>term</div>
            <div
              style={{
                marginTop: 24,
                fontFamily: kit.fonts.display,
                fontSize: 88,
                lineHeight: 0.98,
                color: accentColor,
              }}
            >
              {term}
            </div>
            {pronunciation ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: 26,
                  padding: '12px 18px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${accentColor}28`,
                  background: `linear-gradient(180deg, ${accentColor}16, rgba(10, 13, 24, 0.92))`,
                  color: kit.colors.textSoft,
                  fontFamily: kit.fonts.mono,
                  fontSize: 22,
                  lineHeight: 1.3,
                }}
              >
                {pronunciation}
              </div>
            ) : null}
          </div>
          <div
            style={{
              width: 168,
              height: 2,
              borderRadius: kit.radius.pill,
              background: `linear-gradient(90deg, ${accentColor}, transparent)`,
              boxShadow: ultimateGlow(accentColor, 0.22),
            }}
          />
        </div>
        <div
          style={{
            ...panelStyle(resolveUltimateAccent('purple')),
            padding: `${relaxedPanelPadding.roomyY}px 44px ${relaxedPanelPadding.y}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{maxWidth: 560}}>
            <div style={{...overlineLabelStyle(resolveUltimateAccent('purple')), fontSize: 16}}>
              plain-language definition
            </div>
            <div style={{marginTop: 24, fontSize: 30, lineHeight: 1.68, fontWeight: 760}}>
              {definition}
            </div>
          </div>
          {related.length > 0 ? (
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 30}}>
              {related.slice(0, 4).map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: kit.radius.pill,
                    border: `1px solid ${toneToColor(item.accent ?? 'purple')}28`,
                    background: `${toneToColor(item.accent ?? 'purple')}12`,
                    color: toneToColor(item.accent ?? 'purple'),
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const UltimateCtaPanel: React.FC<UltimateCtaPanelProps> = ({
  heading,
  subtitle,
  searchLabel = '',
  badge = '',
  highlights = [],
}) => {
  const frame = useCurrentFrame();
  const reveal = buildReveal(frame, 0);
  const headingLines = splitDisplayLines(heading, 12, 2);
  const subtitleLines = splitDisplayLines(subtitle || '', 22, 2);

  // CTA: 拉开主文案、亮点卡和搜索框三层节奏，并把高亮卡控制在三列以内。
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: reveal,
        transform: `scale(${interpolate(reveal, [0, 1], [0.96, 1])})`,
      }}
      >
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: '1px solid rgba(216, 227, 255, 0.10)',
          boxShadow: '0 0 0 30px rgba(110, 123, 255, 0.025)',
        }}
      />
      {badge ? (
        <div
          style={{
            marginBottom: 28,
            padding: '12px 20px',
            borderRadius: kit.radius.pill,
            background: 'rgba(255,255,255,0.06)',
            color: kit.colors.textMuted,
            fontSize: 18,
            lineHeight: 1.2,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
          }}
        >
          {badge}
        </div>
      ) : null}
      <div
        style={{
          maxWidth: 1120,
          fontFamily: kit.fonts.display,
          fontSize: headingLines.length > 1 ? 52 : 56,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: -2.2,
        }}
      >
        {headingLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
      {subtitleLines.length > 0 ? (
        <div style={{marginTop: 22, maxWidth: 760}}>
          {subtitleLines.map((line, index) => (
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
      {highlights.length > 0 ? (
        <div
          style={{
            marginTop: 48,
            width: 1460,
            maxWidth: 'calc(100% - 320px)',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(Math.max(highlights.length, 1), 3)}, minmax(0, 1fr))`,
            gap: 26,
          }}
        >
          {highlights.map((item, index) => {
            const color = toneToColor(index === 0 ? 'orange' : index === 1 ? 'yellow' : 'cyan');
            const chipReveal = buildReveal(frame, index * 4);
            return (
              <div
                key={`${item}-${index}`}
              style={{
                ...panelStyle(color),
                minHeight: 186,
                padding: `${relaxedPanelPadding.y}px 24px 24px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                  opacity: chipReveal,
                  transform: withMicroJitter(
                    frame,
                    `translateY(${interpolate(chipReveal, [0, 1], [16, 0])}px)`,
                    {
                      delay: index * 4,
                      amplitudeX: 1.1,
                      amplitudeY: 0.9,
                      rotateDeg: 0.18,
                      scaleDelta: 0.002,
                      seed: 290 + index,
                    },
                  ),
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12, ...overlineLabelStyle(color), fontSize: 16}}>
                  <SemanticIconBadge
                    semanticText={item}
                    color={color}
                    badgeSize={36}
                    size={15}
                    fallbackIndex={index}
                    family="cta"
                    rounded={12}
                    motionDelay={index * 4}
                    motionSeed={290 + index}
                  />
                  <span>关键元素</span>
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    color: kit.colors.text,
                    ...lineClampStyle(2),
                  }}
                >
                  {item}
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: kit.radius.pill,
                    background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.08))`,
                    boxShadow: ultimateGlow(color, 0.28),
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}
      {searchLabel ? (
        <div
          style={{
            marginTop: 40,
            padding: '16px 24px',
            borderRadius: kit.radius.pill,
            border: '1px solid rgba(215, 225, 255, 0.16)',
            background: 'rgba(8, 10, 18, 0.64)',
            minWidth: 520,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 20,
            lineHeight: 1.2,
            color: kit.colors.textMuted,
            transform: withMicroJitter(frame, '', {
              delay: 18,
              amplitudeX: 0.9,
              amplitudeY: 0.8,
              rotateDeg: 0.12,
              scaleDelta: 0.0016,
              seed: 300,
            }),
          }}
        >
          <span>{searchLabel}</span>
          <span style={{fontWeight: 700, color: resolveUltimateAccent('cyan')}}>GO</span>
        </div>
      ) : null}
    </div>
  );
};
