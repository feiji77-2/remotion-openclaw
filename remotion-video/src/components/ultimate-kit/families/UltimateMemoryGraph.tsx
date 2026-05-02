import React, {type CSSProperties} from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {getUltimateManualGlyph, isUltimateManualGlyph, resolveUltimateIconPack, ULTIMATE_ICON_URLS, type UltimateIconName} from '../iconography';
import {appendUltimateMicroJitter, createUltimateMicroJitter, resolveUltimateMicroJitterConfig} from '../motion';
import {resolveUltimateAccent, ultimateGlow, ultimateKitTokens} from '../tokens';
import type {UltimateMemoryGraphProps} from '../types';

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

const buildReveal = (frame: number, delay = 0) => {
  return spring({
    fps: 30,
    frame: Math.max(0, frame - delay),
    config: {damping: 200, stiffness: 140},
  });
};

const withMicroJitter = (
  frame: number,
  baseTransform: string,
  config?: Parameters<typeof createUltimateMicroJitter>[1],
) => {
  return appendUltimateMicroJitter(baseTransform, createUltimateMicroJitter(frame, config));
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
    family: 'memory-graph',
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
}> = ({iconValue, semanticText, color, badgeSize = 34, size = 14, fallbackIndex = 0, motionDelay = 0}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: 17,
        border: `1px solid ${color}33`,
        background: `linear-gradient(180deg, ${color}16 0%, rgba(10, 13, 24, 0.88) 100%)`,
        boxShadow: ultimateGlow(color, 0.16),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: withMicroJitter(frame, '', resolveUltimateMicroJitterConfig('steady', {delay: motionDelay, seed: fallbackIndex + 600})),
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
  const visibleNodes = nodes.slice(0, 5);
  const headingLines = splitDisplayLinesBalanced(heading, 18, 2);
  const centerDetailLines = centerDetail ? splitDisplayLinesBalanced(centerDetail, 24, 3) : [];
  const core = {x: 340, y: 728};
  const clusterField = {x: 734, y: 214, width: 1060, height: 642};
  const fieldReveal = buildReveal(frame, 8);
  const nodeSlots = [
    {x: 956, y: 336, size: 176, driftY: -24},
    {x: 1326, y: 286, size: 146, driftY: -8},
    {x: 1574, y: 498, size: 188, driftY: 20},
    {x: 1154, y: 742, size: 164, driftY: 32},
    {x: 1548, y: 722, size: 138, driftY: -16},
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
      x: (inverse ** 3) * p0.x + 3 * (inverse ** 2) * t * p1.x + 3 * inverse * (t ** 2) * p2.x + (t ** 3) * p3.x,
      y: (inverse ** 3) * p0.y + 3 * (inverse ** 2) * t * p1.y + 3 * inverse * (t ** 2) * p2.y + (t ** 3) * p3.y,
    };
  };

  const links = visibleNodes.map((node, index) => {
    const slot = nodeSlots[index] || nodeSlots[nodeSlots.length - 1];
    const startY = core.y - 32 + (index - Math.max(0, (visibleNodes.length - 1) / 2)) * 54;
    const p0 = {x: core.x + 124, y: startY};
    const p1 = {x: core.x + 264, y: startY + slot.driftY};
    const p2 = {x: slot.x - Math.min(180, slot.size * 0.75), y: slot.y + slot.driftY};
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

  const associationPairs = [
    [0, 2],
    [1, 2],
    [2, 4],
    [0, 3],
  ]
    .filter(([fromIndex, toIndex]) => fromIndex < links.length && toIndex < links.length)
    .map(([fromIndex, toIndex], pairIndex) => {
      const from = links[fromIndex];
      const to = links[toIndex];
      const midX = (from.slot.x + to.slot.x) / 2;
      const verticalLift = pairIndex % 2 === 0 ? -84 : 72;
      const p0 = {x: from.slot.x, y: from.slot.y};
      const p1 = {x: midX - 90, y: from.slot.y + verticalLift};
      const p2 = {x: midX + 90, y: to.slot.y - verticalLift * 0.55};
      const p3 = {x: to.slot.x, y: to.slot.y};
      return {
        key: `association-${from.key}-${to.key}`,
        color: toneToColor(to.node.accent ?? from.node.accent ?? accent),
        p0,
        p1,
        p2,
        p3,
        d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
      };
    });

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 104, left: 138, right: 920}}>
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
          记忆网络
        </div>
        <div style={{marginTop: 20, maxWidth: 720}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 6,
                fontFamily: kit.fonts.display,
                fontSize: 56,
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
          left: 122,
          bottom: 118,
          fontSize: 190,
          lineHeight: 0.82,
          fontWeight: 900,
          letterSpacing: -12,
          color: `${accentColor}0d`,
          pointerEvents: 'none',
          textTransform: 'uppercase',
        }}
      >
        MEMORY
      </div>

      <div
        style={{
          position: 'absolute',
          left: clusterField.x,
          top: clusterField.y,
          width: clusterField.width,
          height: clusterField.height,
          borderRadius: '50%',
          background: `radial-gradient(circle at 34% 28%, ${accentColor}12 0%, rgba(8, 10, 18, 0.12) 36%, transparent 78%)`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.18)',
          opacity: 0.36 + fieldReveal * 0.4,
          pointerEvents: 'none',
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 854,
          top: 234,
          width: 420,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${resolveUltimateAccent('purple')}18, transparent 72%)`,
          opacity: 0.28 + fieldReveal * 0.18,
          pointerEvents: 'none',
          filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1194,
          top: 514,
          width: 500,
          height: 260,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 40%, ${resolveUltimateAccent('green')}14, transparent 74%)`,
          opacity: 0.24 + fieldReveal * 0.18,
          pointerEvents: 'none',
          filter: 'blur(10px)',
        }}
      />

      <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}}>
        <svg viewBox="0 0 1920 1080" style={{width: '100%', height: '100%', overflow: 'visible'}}>
          {associationPairs.map((link, index) => {
            const pairDelay = 42 + index * 6;
            const pairProgress = interpolate(frame, [pairDelay, pairDelay + 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const point = sampleCubic(Math.max(0.01, pairProgress), link.p0, link.p1, link.p2, link.p3);
            return (
              <PathDrawLink
                key={link.key}
                d={link.d}
                color={link.color}
                progress={pairProgress}
                frame={frame}
                marker={{
                  x: point.x,
                  y: point.y,
                  size: 4,
                  shape: 'diamond',
                }}
                baseColor="rgba(255,255,255,0.03)"
                guideOpacity={0.6}
                baseStrokeWidth={1.5}
                flowStrokeWidth={2.4}
                drawStrokeWidth={1}
                dashPattern="4 16"
                flowOpacity={0.24}
                drawOpacity={0.42}
              />
            );
          })}

          {links.map((link, index) => {
            const nodeColor = toneToColor(link.node.accent ?? accent);
            const linkDelay = 14 + index * 8;
            const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const point = sampleCubic(Math.max(0.01, linkProgress), link.p0, link.p1, link.p2, link.p3);
            return (
              <PathDrawLink
                key={link.key}
                d={link.d}
                color={nodeColor}
                progress={linkProgress}
                frame={frame}
                marker={{
                  x: point.x,
                  y: point.y,
                  size: 5,
                  shape: 'ring',
                }}
                baseStrokeWidth={2}
                flowStrokeWidth={3.8}
                drawStrokeWidth={1.5}
                dashPattern="7 14"
                flowOpacity={0.46}
              />
            );
          })}
        </svg>

        <GeometryAccent
          variant="slanted-panel"
          color={accentColor}
          opacity={0.12}
          style={{left: 950, top: 336, width: 540, height: 260, transform: 'rotate(-11deg)'}}
        />
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.16}
          style={{left: 1246, top: 236, width: 240, height: 240}}
        />
        <GeometryAccent
          variant="arc"
          color={accentColor}
          opacity={0.14}
          style={{left: 1008, top: 694, width: 420, height: 110}}
        />
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.1}
          style={{left: 1510, top: 620, width: 150, height: 150}}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: core.x - 128,
          top: core.y - 128,
          width: 256,
          height: 256,
          borderRadius: '50%',
          border: `1px solid ${accentColor}28`,
          background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.18), ${accentColor} 26%, rgba(7,10,18,0.98) 74%)`,
          boxShadow: '0 32px 90px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: withMicroJitter(frame, `scale(${interpolate(buildReveal(frame, 2), [0, 1], [0.94, 1])})`, {
            delay: 4,
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
            inset: 18,
            borderRadius: '50%',
            border: `1px solid ${accentColor}18`,
            opacity: 0.42,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: -18,
            borderRadius: '50%',
            border: `1px solid ${accentColor}12`,
            opacity: 0.26 + Math.sin(frame * 0.05) * 0.04,
          }}
        />
        <div style={{width: 184, display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center'}}>
          <div style={{fontSize: 14, letterSpacing: 2.2, color: accentColor, textTransform: 'uppercase'}}>seed memory</div>
          <div style={{fontSize: 42, lineHeight: 1.04, fontWeight: 840}}>{centerTitle}</div>
        </div>
      </div>

      {centerDetailLines.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 126,
            top: 734,
            width: 230,
            display: 'grid',
            gap: 4,
            color: 'rgba(255,255,255,0.64)',
            fontSize: 18,
            lineHeight: 1.44,
          }}
        >
          {centerDetailLines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      ) : null}

      {links.map((link, index) => {
        const nodeColor = toneToColor(link.node.accent ?? accent);
        const linkDelay = 14 + index * 8;
        const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const nodeReveal = interpolate(linkProgress, [0.7, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const labelLines = splitDisplayLinesBalanced(link.node.label, 10, 2);
        const detailLines = link.node.detail ? splitDisplayLinesBalanced(link.node.detail, 14, 2) : [];
        const size = link.slot.size;

        return (
          <div key={`${link.key}-node`}>
            <div
              style={{
                position: 'absolute',
                left: link.slot.x - size / 2 - 18,
                top: link.slot.y - size / 2 - 18,
                width: size + 36,
                height: size + 36,
                borderRadius: '50%',
                background: `radial-gradient(circle at 34% 28%, ${nodeColor}32, transparent 72%)`,
                opacity: 0.18 + nodeReveal * 0.1,
                filter: 'blur(8px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: link.slot.x - size / 2,
                top: link.slot.y - size / 2,
                width: size,
                height: size,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                textAlign: 'center',
                opacity: nodeReveal,
                transform: withMicroJitter(
                  frame,
                  `translateY(${interpolate(nodeReveal, [0, 1], [18, 0])}px) rotate(${index % 2 === 0 ? -4 : 4}deg)`,
                  {
                    delay: linkDelay,
                    amplitudeX: 1.2,
                    amplitudeY: 1,
                    rotateDeg: 0.16,
                    scaleDelta: 0.003,
                    seed: 360 + index,
                  },
                ),
                borderRadius: '50%',
                border: `1px solid ${nodeColor}26`,
                background: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.12), rgba(8,10,18,0.94) 72%)',
                boxShadow: '0 24px 56px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <SemanticIconBadge
                iconValue={link.node.icon}
                semanticText={`${link.node.label} ${link.node.detail || ''}`}
                color={nodeColor}
                badgeSize={34}
                size={14}
                fallbackIndex={index}
                motionDelay={linkDelay}
              />
              <div>
                {labelLines.map((line, lineIndex) => (
                  <div
                    key={`${line}-${lineIndex}`}
                    style={{
                      marginTop: lineIndex === 0 ? 0 : 3,
                      fontSize: size > 170 ? 29 : 24,
                      fontWeight: 820,
                      lineHeight: 1.08,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
              {detailLines.length > 0 ? (
                <div style={{fontSize: size > 170 ? 15 : 14, lineHeight: 1.44, color: 'rgba(255,255,255,0.64)', width: Math.max(82, size - 44)}}>
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
