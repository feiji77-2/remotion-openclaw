import React, {type CSSProperties} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {ParticleBackground} from '../ParticleBackground';
import {
  resolveUltimateAccent,
  ultimateGlow,
  ultimateKitTokens,
  ultimateKitVideo,
} from './tokens';
import type {
  UltimateCodeLine,
  UltimateCodePanelProps,
  UltimateCtaPanelProps,
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
                {item.icon ?? '[]'}
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
                    fontSize: 18,
                    letterSpacing: 2,
                    color: toneToColor(primaryItem.accent ?? accent),
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
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
                    fontSize: 17,
                    letterSpacing: 2,
                    color,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
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
                  {step.icon ?? `${index + 1}`}
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
                    fontSize: 17,
                    letterSpacing: 2,
                    color: factColor,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
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

export const UltimateMetricBars: React.FC<UltimateMetricBarsProps> = ({heading, summary, items}) => {
  const frame = useCurrentFrame();
  const headingLines = splitDisplayLines(heading, 18, 2);
  const summaryLines = splitDisplayLines(summary || '', 28, 2);
  const headingSize = headingLines.length > 1 || measureText(heading) > 22 ? 58 : 66;

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
                }}
              >
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
              <div style={{fontSize: 17, color: kit.colors.textMuted}}>关键信号</div>
            </div>
          );
        })}
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
                <div style={{fontSize: 16, letterSpacing: 2, color}}>关键元素</div>
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
