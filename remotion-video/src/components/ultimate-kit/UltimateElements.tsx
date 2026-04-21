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
import type {
  UltimateArchitectureMapProps,
  UltimateCodeLine,
  UltimateCodePanelProps,
  UltimateCompareBoardProps,
  UltimateCtaPanelProps,
  UltimateEvidenceWallProps,
  UltimateFeatureCardRailProps,
  UltimateFocusDiagramProps,
  UltimateHeroPanelProps,
  UltimateMetricBarsProps,
  UltimateNumberStripProps,
  UltimatePlatformOverlayProps,
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
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: accentColor,
    opacity: 0.92,
    textAlign: centered ? 'center' : 'left',
  };
};

const buildReveal = (frame: number, delay = 0) => {
  return spring({
    fps: ultimateKitVideo.fps,
    frame: Math.max(0, frame - delay),
    config: {damping: 18, stiffness: 110},
  });
};

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
}> = ({
  iconValue,
  semanticText,
  color,
  badgeSize = 46,
  size = 20,
  fallbackIndex = 0,
  family,
  rounded = 16,
}) => (
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
              linear-gradient(180deg, #140c12 0%, #06080e 48%, #04060c 100%)
            `
            : `
              radial-gradient(circle at 22% 30%, rgba(255, 95, 109, 0.20), transparent 24%),
              radial-gradient(circle at 72% 68%, rgba(71, 222, 255, 0.16), transparent 24%),
              radial-gradient(circle at 52% 16%, rgba(158, 118, 255, 0.12), transparent 22%),
              linear-gradient(180deg, #0a0d18 0%, #06080f 48%, #04060c 100%)
            `,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -120,
          transform: `translate(${glowShiftX}px, ${glowShiftY}px)`,
          background:
            'radial-gradient(circle at 30% 35%, rgba(255, 108, 108, 0.16), transparent 22%), radial-gradient(circle at 72% 68%, rgba(99, 221, 255, 0.12), transparent 22%)',
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
          boxShadow: 'inset 0 0 140px rgba(5, 8, 16, 0.76)',
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
      <div
        style={{
          position: 'absolute',
          right: 34,
          bottom: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          opacity: reveal,
        }}
      >
        <div style={{fontSize: 15, color: kit.colors.textSoft, letterSpacing: 3, textTransform: 'uppercase'}}>
          {watermark}
        </div>
        <div style={{fontSize: 16, color: kit.colors.textMuted}}>{account}</div>
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
        gap: 22,
        opacity: reveal,
        transform: `scale(${interpolate(reveal, [0, 1], [0.96, 1])})`,
      }}
    >
      {kicker ? <div style={eyebrowStyle('#f3e7d9')}>{kicker}</div> : null}
      <div
        style={{
          fontFamily: kit.fonts.display,
          fontSize: 148,
          lineHeight: 0.94,
          letterSpacing: -5,
          maxWidth: 1240,
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
            padding: '12px 20px',
            borderRadius: kit.radius.sm,
            border: `1px solid ${accentColor}44`,
            background: 'rgba(18, 14, 12, 0.42)',
            color: '#ffe1bf',
            fontSize: 20,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {badge}
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            maxWidth: 980,
            fontSize: 30,
            lineHeight: 1.5,
            color: kit.colors.textMuted,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {avatarLabel ? (
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 98,
              height: 98,
              borderRadius: '50%',
              border: `1px solid ${accentColor}55`,
              background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${accentColor} 28%, rgba(16, 19, 28, 0.94) 82%)`,
              boxShadow: ultimateGlow(accentColor, 0.7),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10131c',
              fontSize: 30,
              fontWeight: 800,
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
  const lineProgress = interpolate(frame, [12, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
            marginTop: kicker ? 20 : 0,
            textAlign: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 78,
            letterSpacing: -2,
          }}
        >
          {heading}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 180,
          right: 180,
          top: 340,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
          gap: 22,
        }}
      >
        {items.map((item, index) => {
          const accentColor = toneToColor(item.accent);
          const reveal = buildReveal(frame, index * 10);
          return (
            <div
              key={`${item.title}-${index}`}
              style={{
                ...panelStyle(accentColor),
                minHeight: 278,
                padding: '30px 28px 26px',
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  border: `1px solid ${accentColor}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                  fontSize: 28,
                  boxShadow: ultimateGlow(accentColor, 0.55),
                }}
              >
                <SemanticIconGlyph
                  iconValue={item.icon}
                  semanticText={`${item.title} ${item.caption || ''} ${item.eyebrow || ''}`}
                  color={accentColor}
                  size={34}
                  fallbackIndex={index}
                  family="feature-rail"
                />
              </div>
              <div
                style={{
                  marginTop: 28,
                  fontSize: 38,
                  fontWeight: 800,
                  color: accentColor,
                  textShadow: ultimateGlow(accentColor, 0.45),
                }}
              >
                {item.title}
              </div>
              {item.eyebrow ? (
                <div style={{marginTop: 10, fontSize: 18, color: kit.colors.textSoft, letterSpacing: 2}}>
                  {item.eyebrow}
                </div>
              ) : null}
              {item.caption ? (
                <div style={{marginTop: 18, fontSize: 24, lineHeight: 1.5, color: kit.colors.textMuted}}>
                  {item.caption}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 240,
          right: 240,
          top: 470,
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(123, 192, 255, 0.65), transparent)',
          transform: `scaleX(${lineProgress})`,
          transformOrigin: 'left center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 462,
          left: 240 + lineProgress * 1420,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: resolveUltimateAccent('cyan'),
          boxShadow: ultimateGlow(resolveUltimateAccent('cyan')),
          opacity: lineProgress < 0.98 ? 1 : 0,
        }}
      />
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
    <div style={{position: 'absolute', right: 140, top: 220, width: 640, height: 440}}>
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
    <div style={{position: 'absolute', right: 170, top: 238, width: 520, height: 360}}>
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
    <div style={{position: 'absolute', right: 160, top: 230, width: 560, height: 360}}>
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

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div
        style={{
          position: 'absolute',
          left: 160,
          top: 220,
        width: 760,
        opacity: reveal,
        transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
      }}
    >
        {eyebrow ? <div style={eyebrowStyle(accentColor, false)}>{eyebrow}</div> : null}
        <div
          style={{
            marginTop: eyebrow ? 18 : 0,
            fontFamily: kit.fonts.display,
            fontSize: 154,
            lineHeight: 0.96,
            color: accentColor,
            textShadow: ultimateGlow(accentColor, 0.9),
          }}
        >
          {keyword}
        </div>
        {question ? (
          <div style={{marginTop: 72, fontSize: 54, fontWeight: 800, lineHeight: 1.1}}>{question}</div>
        ) : null}
        {description ? (
          <div style={{marginTop: 18, maxWidth: 560, fontSize: 28, lineHeight: 1.5, color: kit.colors.textMuted}}>
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
  const headingSize = headingLines.length > 1 ? 60 : measureText(heading) > 15 ? 62 : 68;
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
          gap: 14,
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
            lineHeight: 1,
            color: '#091018',
            textShadow: 'none',
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
                lineHeight: 1.04,
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
                  marginTop: index === 0 ? 0 : 4,
                  fontSize: 24,
                  lineHeight: 1.38,
                  color: kit.colors.textMuted,
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
            top: 336,
            ...panelStyle(toneToColor(primaryItem.accent ?? accent)),
            minHeight: 202,
            padding: '24px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            opacity: buildReveal(frame, 8),
            transform: `translateY(${interpolate(buildReveal(frame, 8), [0, 1], [18, 0])}px)`,
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
                    gap: 12,
                    fontSize: 18,
                    letterSpacing: 2,
                    color: toneToColor(primaryItem.accent ?? accent),
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  <SemanticIconBadge
                    semanticText={`${primaryItem.tag || '核心判断'} ${primaryItem.label} ${primaryItem.detail || ''}`}
                    color={toneToColor(primaryItem.accent ?? accent)}
                    badgeSize={38}
                    size={16}
                    family="number-strip"
                  />
                  {primaryItem.tag || '核心判断'}
                </div>
                <div style={{marginTop: 12}}>
                  {primaryLines.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      style={{
                        fontSize: primarySize,
                        fontWeight: 800,
                        lineHeight: 1.12,
                        color: kit.colors.text,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 20,
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
          top: 584,
          bottom: 156,
          display: 'grid',
          gridTemplateColumns: secondaryGridColumns,
          gap: 24,
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
                minHeight: isWide ? 212 : 196,
                padding: isWide ? '22px 24px 20px' : '22px 22px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: chipReveal,
                transform: `translateY(${interpolate(chipReveal, [0, 1], [20, 0])}px)`,
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
                    gap: 10,
                    fontSize: 17,
                    letterSpacing: 2,
                    color,
                    textTransform: 'uppercase',
                    fontWeight: 700,
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
                  />
                  {item.tag || `补充 ${index + 1}`}
                </div>
                <div style={{marginTop: 14}}>
                  {itemLines.map((line, lineIndex) => (
                    <div
                      key={`${line}-${lineIndex}`}
                      style={{
                        fontSize: isWide ? 34 : itemLines.length > 2 ? 26 : 30,
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
                          marginTop: lineIndex === 0 ? 0 : 4,
                          fontSize: isWide ? 20 : 18,
                          lineHeight: 1.35,
                          color: kit.colors.textMuted,
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
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    {chips.map((chip, chipIndex) => (
                      <div
                        key={`${chip}-${chipIndex}`}
                        style={{
                          padding: '8px 12px',
                          borderRadius: kit.radius.pill,
                          border: `1px solid ${color}28`,
                          background: `linear-gradient(180deg, ${color}14, rgba(10, 13, 24, 0.92))`,
                          fontSize: 15,
                          fontWeight: 700,
                          color,
                          lineHeight: 1,
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

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0}}>
        <div
          style={{
            marginTop: 0,
            textAlign: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 76,
            letterSpacing: -2,
          }}
        >
          {heading}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 150,
          right: 150,
          top: 360,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`,
          gap: 18,
          alignItems: 'start',
        }}
      >
        {steps.map((step, index) => {
          const accentColor = toneToColor(step.accent ?? 'cyan');
          const reveal = buildReveal(frame, index * 8);
          return (
            <div key={`${step.label}-${index}`} style={{position: 'relative'}}>
              <div
                style={{
                  ...panelStyle(accentColor),
                  minHeight: 244,
                  padding: '26px 24px',
                  opacity: reveal,
                  transform: `translateY(${interpolate(reveal, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: `${accentColor}1e`,
                    border: `1px solid ${accentColor}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accentColor,
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  <SemanticIconGlyph
                    iconValue={step.icon}
                    semanticText={`${step.label} ${step.detail || ''}`}
                    color={accentColor}
                    size={28}
                    fallbackIndex={index}
                    family="step-flow"
                  />
                </div>
                <div style={{marginTop: 12, fontSize: 34, fontWeight: 800, lineHeight: 1.12}}>{step.label}</div>
                {step.detail ? (
                  <div style={{marginTop: 16, fontSize: 22, lineHeight: 1.45, color: kit.colors.textMuted}}>
                    {step.detail}
                  </div>
                ) : null}
              </div>
              {index < steps.length - 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 110,
                    right: -12,
                    width: 24,
                    height: 24,
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

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 94, left: 160, right: 160}}>
        <div style={eyebrowStyle(accentColor)}>时间线</div>
        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 74,
            letterSpacing: -2.6,
          }}
        >
          {heading}
        </div>
        {summary ? (
          <div
            style={{
              margin: '18px auto 0',
              maxWidth: 1040,
              fontSize: 24,
              lineHeight: 1.55,
              color: kit.colors.textMuted,
              textAlign: 'center',
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
          top: 504,
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
        const cardTop = upper ? 286 : 574;
        const lineHeight = upper ? 126 : 70;

        return (
          <div key={`${item.label}-${index}`}>
            <div
              style={{
                position: 'absolute',
                left: left - 2,
                top: upper ? 504 - lineHeight : 508,
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
                top: 492,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: itemColor,
                boxShadow: ultimateGlow(itemColor, 0.8),
                opacity: reveal,
                transform: `scale(${interpolate(reveal, [0, 1], [0.8, 1])})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: left - 170,
                top: cardTop,
                width: 340,
                minHeight: 180,
                padding: '24px 22px 22px',
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
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
                  letterSpacing: 1.4,
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
                />
                <span>{item.label}</span>
              </div>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 30,
                  fontWeight: 800,
                  lineHeight: 1.16,
                  ...lineClampStyle(2),
                }}
              >
                {item.title}
              </div>
              {item.detail ? (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 19,
                    lineHeight: 1.45,
                    color: kit.colors.textMuted,
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
  const visibleRows = rows.slice(0, 4);

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 140, right: 140}}>
        <div style={eyebrowStyle(resolveUltimateAccent('yellow'))}>双栏对照</div>
        <div
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 74,
            letterSpacing: -2.6,
          }}
        >
          {heading}
        </div>
        {summary ? (
          <div
            style={{
              margin: '16px auto 0',
              maxWidth: 980,
              fontSize: 23,
              lineHeight: 1.55,
              color: kit.colors.textMuted,
              textAlign: 'center',
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
          top: 266,
          width: 560,
          padding: '24px 28px',
          ...panelStyle(leftColor),
        }}
      >
        {leftEyebrow ? <div style={{...eyebrowStyle(leftColor, false), fontSize: 14, letterSpacing: 2.2}}>{leftEyebrow}</div> : null}
        <div style={{marginTop: leftEyebrow ? 10 : 0, fontSize: 48, fontWeight: 800, color: leftColor}}>{leftTitle}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: 266,
          width: 560,
          padding: '24px 28px',
          textAlign: 'right',
          ...panelStyle(rightColor),
        }}
      >
        {rightEyebrow ? <div style={{...eyebrowStyle(rightColor, false), fontSize: 14, letterSpacing: 2.2}}>{rightEyebrow}</div> : null}
        <div style={{marginTop: rightEyebrow ? 10 : 0, fontSize: 48, fontWeight: 800, color: rightColor}}>{rightTitle}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 286,
          width: 120,
          height: 120,
          marginLeft: -60,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(8, 10, 18, 0.96))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 3,
          color: kit.colors.text,
          boxShadow: '0 18px 46px rgba(0,0,0,0.26)',
        }}
      >
        VS
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 438,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
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
                gap: 24,
                alignItems: 'center',
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
              }}
            >
              <div style={{...panelStyle(leftColor), minHeight: 116, padding: '22px 24px'}}>
                <div style={{fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: `${leftColor}`}}>左侧</div>
                <div style={{marginTop: 10, fontSize: 28, fontWeight: 750, lineHeight: 1.2}}>{row.left}</div>
              </div>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 22,
                  border: `1px solid ${rowColor}30`,
                  background: `${rowColor}14`,
                  textAlign: 'center',
                  color: rowColor,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  boxShadow: ultimateGlow(rowColor, 0.16),
                }}
              >
                {row.label}
              </div>
              <div style={{...panelStyle(rightColor), minHeight: 116, padding: '22px 24px'}}>
                <div style={{fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: `${rightColor}`}}>右侧</div>
                <div style={{marginTop: 10, fontSize: 28, fontWeight: 750, lineHeight: 1.2}}>{row.right}</div>
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
  const visibleCards = cards.slice(0, 4);
  const positions = [
    {top: 254, left: 120, rotate: -5},
    {top: 232, left: 1028, rotate: 4},
    {top: 584, left: 180, rotate: 3},
    {top: 562, left: 1086, rotate: -4},
  ];

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 130, right: 130}}>
        <div style={eyebrowStyle(accentColor, false)}>证据层</div>
        <div
          style={{
            marginTop: 18,
            fontFamily: kit.fonts.display,
            fontSize: 76,
            letterSpacing: -2.6,
            maxWidth: 1100,
          }}
        >
          {heading}
        </div>
        {summary ? (
          <div
            style={{
              marginTop: 16,
              maxWidth: 720,
              fontSize: 24,
              lineHeight: 1.55,
              color: kit.colors.textMuted,
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
              width: 760,
              minHeight: 238,
              padding: '24px 24px 22px',
              opacity: reveal,
              transform: `translateY(${interpolate(reveal, [0, 1], [20, 0])}px) rotate(${position.rotate}deg)`,
              ...panelStyle(cardColor),
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16}}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${cardColor}34`,
                  color: cardColor,
                  background: `${cardColor}14`,
                  fontSize: 17,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
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
                />
                <span>{card.source}</span>
              </div>
              <div style={{fontSize: 14, color: kit.colors.textSoft, letterSpacing: 2, textTransform: 'uppercase'}}>
                证据 {String(index + 1).padStart(2, '0')}
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 31,
                lineHeight: 1.28,
                fontWeight: 760,
                color: kit.colors.text,
                ...lineClampStyle(3),
              }}
            >
              {card.quote}
            </div>
            {card.detail ? (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: kit.colors.textMuted,
                  ...lineClampStyle(2),
                }}
              >
                {card.detail}
              </div>
            ) : null}
            {card.chips && card.chips.length > 0 ? (
              <div style={{marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10}}>
                {card.chips.slice(0, 3).map((chip) => (
                  <div
                    key={chip}
                    style={{
                      padding: '8px 12px',
                      borderRadius: kit.radius.pill,
                      border: `1px solid ${cardColor}28`,
                      background: 'rgba(255,255,255,0.03)',
                      color: kit.colors.textSoft,
                      fontSize: 15,
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
  const visibleNodes = nodes.slice(0, 6);
  const radialPositions = [
    {top: 226, left: 148},
    {top: 160, left: 760},
    {top: 236, left: 1456},
    {top: 666, left: 1450},
    {top: 748, left: 760},
    {top: 646, left: 154},
  ];
  const centerBox = {left: 640, top: 390, width: 640, height: 256};
  const useRadial = layout !== 'stack' && visibleNodes.length > 3;

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 90, left: 130, right: 130}}>
        <div style={eyebrowStyle(accentColor, false)}>系统结构</div>
        <div
          style={{
            marginTop: 18,
            fontFamily: kit.fonts.display,
            fontSize: 72,
            letterSpacing: -2.5,
            maxWidth: 980,
          }}
        >
          {heading}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: centerBox.left,
          top: centerBox.top,
          width: centerBox.width,
          minHeight: centerBox.height,
          padding: '32px 36px',
          textAlign: 'center',
          ...panelStyle(accentColor),
          boxShadow: `0 28px 90px rgba(0,0,0,0.24), 0 0 60px ${accentColor}18`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
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
          />
          <span style={{fontSize: 16, letterSpacing: 2, textTransform: 'uppercase'}}>核心节点</span>
        </div>
        <div style={{marginTop: 18, fontSize: 54, fontWeight: 840, lineHeight: 1.08}}>{centerTitle}</div>
        {centerDetail ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 22,
              lineHeight: 1.55,
              color: kit.colors.textMuted,
              maxWidth: 500,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {centerDetail}
          </div>
        ) : null}
      </div>
      {useRadial
        ? visibleNodes.map((node, index) => {
            const reveal = buildReveal(frame, 8 + index * 6);
            const nodeColor = toneToColor(node.accent ?? accent);
            const position = radialPositions[index] || radialPositions[radialPositions.length - 1];
            const nodeCenterX = position.left + 150;
            const nodeCenterY = position.top + 72;
            const coreCenterX = centerBox.left + centerBox.width / 2;
            const coreCenterY = centerBox.top + centerBox.height / 2;
            const dx = nodeCenterX - coreCenterX;
            const dy = nodeCenterY - coreCenterY;
            const length = Math.max(0, Math.hypot(dx, dy) - 180);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            return (
              <div key={`${node.label}-${index}`}>
                <div
                  style={{
                    position: 'absolute',
                    left: coreCenterX,
                    top: coreCenterY,
                    width: length,
                    height: 2,
                    transformOrigin: '0 50%',
                    transform: `rotate(${angle}deg)`,
                    background: `linear-gradient(90deg, ${accentColor}70, ${nodeColor}44, transparent)`,
                    opacity: reveal,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: 300,
                    minHeight: 144,
                    padding: '20px 22px',
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                    ...panelStyle(nodeColor),
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <SemanticIconBadge
                      iconValue={node.icon}
                      semanticText={`${node.label} ${node.detail || ''}`}
                      color={nodeColor}
                      badgeSize={36}
                      size={15}
                      fallbackIndex={index}
                      family="architecture-map"
                      rounded={12}
                    />
                    <div style={{fontSize: 26, fontWeight: 760, lineHeight: 1.15}}>{node.label}</div>
                  </div>
                  {node.detail ? (
                    <div style={{marginTop: 12, fontSize: 18, lineHeight: 1.45, color: kit.colors.textMuted}}>
                      {node.detail}
                    </div>
                  ) : null}
                </div>
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
              gridTemplateColumns: `repeat(${Math.max(visibleNodes.length, 1)}, minmax(0, 1fr))`,
              gap: 18,
            }}
          >
            {visibleNodes.map((node, index) => {
              const reveal = buildReveal(frame, 8 + index * 6);
              const nodeColor = toneToColor(node.accent ?? accent);
              return (
                <div
                  key={`${node.label}-${index}`}
                  style={{
                    minHeight: 160,
                    padding: '20px 22px',
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                    ...panelStyle(nodeColor),
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <SemanticIconBadge
                      iconValue={node.icon}
                      semanticText={`${node.label} ${node.detail || ''}`}
                      color={nodeColor}
                      badgeSize={36}
                      size={15}
                      fallbackIndex={index}
                      family="architecture-map"
                      rounded={12}
                    />
                    <div style={{fontSize: 24, fontWeight: 760}}>{node.label}</div>
                  </div>
                  {node.detail ? (
                    <div style={{marginTop: 12, fontSize: 18, lineHeight: 1.45, color: kit.colors.textMuted}}>
                      {node.detail}
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
  const outputStart = Math.max(frame - 38, 0);

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 126, left: 0, right: 0}}>
        <div style={eyebrowStyle(accentColor)}>{heading}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 380,
          right: 380,
          top: 240,
          ...panelStyle(accentColor),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
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
              fontSize: 16,
              color: kit.colors.textSoft,
            }}
          >
            {windowTitle}
          </div>
        </div>
        <div style={{padding: '28px 34px 34px', fontFamily: kit.fonts.mono}}>
          <div style={{display: 'flex', gap: 12, fontSize: 24, lineHeight: 1.5}}>
            <span style={{color: accentColor}}>$</span>
            <span style={{color: kit.colors.text}}>{command.slice(0, commandLength)}</span>
            {commandLength < command.length ? (
              <span style={{width: 3, background: accentColor, boxShadow: ultimateGlow(accentColor, 0.4)}} />
            ) : null}
          </div>
          <div style={{marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12}}>
            {outputs.map((line, index) => {
              const reveal = interpolate(outputStart - index * 10, [0, 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={`${line}-${index}`}
                  style={{
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [6, 0])}px)`,
                    fontSize: 22,
                    lineHeight: 1.4,
                    color: line.startsWith('>') ? resolveUltimateAccent('green') : kit.colors.textMuted,
                  }}
                >
                  {line}
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
            bottom: 152,
            textAlign: 'center',
            fontSize: 24,
            color: kit.colors.textMuted,
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

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0}}>
        <div
          style={{
            marginTop: 0,
            textAlign: 'center',
            fontFamily: kit.fonts.display,
            fontSize: 72,
            letterSpacing: -2,
          }}
        >
          {heading}
        </div>
      </div>
      {tabs.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 250,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            const color = isActive ? resolveUltimateAccent('orange') : 'rgba(229, 236, 255, 0.22)';
            return (
              <div
                key={tab}
                style={{
                  padding: '12px 22px',
                  borderRadius: kit.radius.pill,
                  border: `1px solid ${isActive ? `${color}40` : 'rgba(229,236,255,0.12)'}`,
                  background: isActive ? 'rgba(255, 173, 99, 0.12)' : 'rgba(255,255,255,0.04)',
                  color,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
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
          left: 290,
          right: 290,
          top: 352,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {items.map((item, index) => {
          const color = toneToColor(item.accent ?? (index % 2 === 0 ? 'cyan' : 'green'));
          const reveal = buildReveal(frame, index * 2);
          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                ...panelStyle(color),
                minHeight: 78,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 14px',
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [14, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
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
  const facts = parseCodeFacts(lines).slice(0, 4);

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 128, left: 220, right: 220, textAlign: 'center'}}>
        {headingLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              fontFamily: kit.fonts.display,
              fontSize: headingLines.length > 1 ? 58 : 66,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.02,
            }}
          >
            {line}
          </div>
        ))}
        {summaryLines.length > 0 ? (
          <div style={{marginTop: 16}}>
            {summaryLines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                style={{
                  marginTop: index === 0 ? 0 : 4,
                  fontSize: 22,
                  lineHeight: 1.36,
                  color: kit.colors.textMuted,
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
          top: 318,
          bottom: 150,
          display: 'grid',
          gridTemplateColumns: '412px minmax(0, 1fr)',
          gap: 28,
        }}
      >
        <div
          style={{
            ...panelStyle(accentColor),
            padding: '24px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
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
                  padding: '18px 18px 16px',
                  borderRadius: 22,
                  border: `1px solid ${factColor}30`,
                  background: `linear-gradient(180deg, ${factColor}10, rgba(10, 13, 24, 0.92))`,
                  opacity: reveal,
                  transform: `translateY(${interpolate(reveal, [0, 1], [14, 0])}px)`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 17,
                    letterSpacing: 2,
                    color: factColor,
                    textTransform: 'uppercase',
                    fontWeight: 700,
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
                  />
                  {fact.label}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 26,
                    lineHeight: 1.2,
                    fontWeight: 800,
                    color: kit.colors.text,
                    ...lineClampStyle(3),
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
          }}
        >
          <div
            style={{
              padding: '16px 22px',
              fontFamily: kit.fonts.mono,
              fontSize: 18,
              color: kit.colors.textSoft,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {filename || 'agent-workflow.json'}
          </div>
          <div style={{padding: '24px 0 18px 0', fontFamily: kit.fonts.mono, flex: 1}}>
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
                    gridTemplateColumns: '62px 1fr',
                    alignItems: 'start',
                    padding: '8px 26px',
                    background: highlightLine === index + 1 ? `${accentColor}14` : 'transparent',
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [6, 0])}px)`,
                  }}
                >
                <div style={{color: 'rgba(255,255,255,0.28)', textAlign: 'right', paddingRight: 18}}>{index + 1}</div>
                <div style={{color: toneColor, fontSize: 24, lineHeight: 1.45}}>{line.text}</div>
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
              fontFamily: kit.fonts.display,
              fontSize: headingSize,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.02,
            }}
          >
            {line}
          </div>
        ))}
        {summaryLines.length > 0 ? (
          <div style={{marginTop: 18}}>
            {summaryLines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                style={{
                  marginTop: index === 0 ? 0 : 4,
                  fontSize: 24,
                  lineHeight: 1.35,
                  color: kit.colors.textMuted,
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
            gap: 24,
            alignContent: 'center',
          }}
        >
          {items.map((item, index) => {
            const color = toneToColor(item.accent ?? (index === 0 ? 'cyan' : index === 1 ? 'green' : 'yellow'));
            const progress = interpolate(frame, [10 + index * 8, 34 + index * 8], [0, item.ratio], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={`${item.label}-${index}`}
                style={{
                  ...panelStyle(color),
                  minHeight: 196,
                  padding: '24px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
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
                    />
                    <div
                      style={{
                        fontSize: 17,
                        color,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                  <div style={{width: 14, height: 14, borderRadius: '50%', background: color, boxShadow: ultimateGlow(color, 0.45)}} />
                </div>
                <div
                  style={{
                    fontSize: 58,
                    lineHeight: 1,
                    fontWeight: 800,
                    color,
                    textShadow: ultimateGlow(color, 0.35),
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    height: 12,
                    borderRadius: kit.radius.pill,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      borderRadius: kit.radius.pill,
                      background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.92))`,
                      boxShadow: ultimateGlow(color, 0.45),
                    }}
                  />
                </div>
                <div style={{fontSize: 17, color: kit.colors.textMuted}}>Key signal</div>
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
            top: 320,
            bottom: 150,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: items.length >= 4 ? 28 : 34,
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

              return (
                <div
                  key={`${item.label}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: item.icon ? '240px 1fr 176px' : '200px 1fr 176px',
                    alignItems: 'center',
                    gap: 28,
                    opacity: reveal,
                    transform: `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: item.icon ? 14 : 0,
                      fontSize: 32,
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
                      />
                    ) : null}
                    <span>{item.label}</span>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: 34,
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
                          width: 22,
                          height: 22,
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
                      textAlign: 'right',
                      fontSize: 50,
                      lineHeight: 1,
                      fontWeight: 800,
                      color,
                      textShadow: ultimateGlow(color, 0.35),
                    }}
                  >
                    {item.value}
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
            marginBottom: 22,
            padding: '10px 16px',
            borderRadius: kit.radius.pill,
            background: 'rgba(255,255,255,0.06)',
            color: kit.colors.textMuted,
            fontSize: 18,
            letterSpacing: 2,
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
          fontSize: headingLines.length > 1 ? 60 : 70,
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: -2,
        }}
      >
        {headingLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
      {subtitleLines.length > 0 ? (
        <div style={{marginTop: 16, maxWidth: 760}}>
          {subtitleLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 4,
                fontSize: 24,
                color: kit.colors.textMuted,
                lineHeight: 1.4,
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
            marginTop: 42,
            width: 1460,
            maxWidth: 'calc(100% - 320px)',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(highlights.length, 1)}, minmax(0, 1fr))`,
            gap: 22,
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
                  minHeight: 168,
                  padding: '22px 18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: chipReveal,
                  transform: `translateY(${interpolate(chipReveal, [0, 1], [16, 0])}px)`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, letterSpacing: 2, color}}>
                  <SemanticIconBadge
                    semanticText={item}
                    color={color}
                    badgeSize={36}
                    size={15}
                    fallbackIndex={index}
                    family="cta"
                    rounded={12}
                  />
                  <span>关键元素</span>
                </div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    lineHeight: 1.08,
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
            marginTop: 34,
            padding: '14px 20px',
            borderRadius: kit.radius.pill,
            border: '1px solid rgba(215, 225, 255, 0.16)',
            background: 'rgba(8, 10, 18, 0.64)',
            minWidth: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 20,
            color: kit.colors.textMuted,
          }}
        >
          <span>{searchLabel}</span>
          <span style={{fontWeight: 700, color: resolveUltimateAccent('cyan')}}>GO</span>
        </div>
      ) : null}
    </div>
  );
};
