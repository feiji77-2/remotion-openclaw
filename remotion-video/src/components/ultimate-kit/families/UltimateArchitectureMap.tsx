import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {resolveUltimateAccent, ultimateGlow, ultimateKitTokens} from '../tokens';
import type {UltimateArchitectureMapProps} from '../types';
import {useFloatMotion, useStaggerScale} from '../motionGrammar';
import {cleanDisplayText, iconMaskStyle, withMicroJitter, SemanticIconGlyph, SemanticIconBadge} from '../SemanticIcon';

const kit = ultimateKitTokens;

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
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
  const useRadial = layout !== 'stack' && visibleNodes.length > 3;
  const headingLines = splitDisplayLinesBalanced(heading, useRadial ? 14 : 18, 3);
  const headingSize = headingLines.length >= 3 ? 40 : headingLines.length === 2 || measureText(heading) > 24 ? 48 : 58;
  const centerDetailLines = centerDetail ? splitDisplayLinesBalanced(centerDetail, 28, 2) : [];
  const center = {x: 960, y: useRadial ? 596 : 542};
  const nodeSlots = useRadial
    ? [
        {x: 364, y: 390, labelLeft: 92, labelTop: 308, width: 332, align: 'left' as const},
        {x: 944, y: 256, labelLeft: 760, labelTop: 112, width: 370, align: 'center' as const},
        {x: 1542, y: 406, labelLeft: 1202, labelTop: 324, width: 352, align: 'right' as const},
        {x: 1416, y: 810, labelLeft: 1122, labelTop: 722, width: 360, align: 'right' as const},
        {x: 496, y: 838, labelLeft: 268, labelTop: 738, width: 340, align: 'left' as const},
      ]
    : [
        {x: 520, y: 808, labelLeft: 314, labelTop: 724, width: 316, align: 'center' as const},
        {x: 960, y: 808, labelLeft: 802, labelTop: 724, width: 316, align: 'center' as const},
        {x: 1400, y: 808, labelLeft: 1206, labelTop: 724, width: 316, align: 'center' as const},
      ];

  const links = visibleNodes.map((node, index) => {
    const slot = nodeSlots[index] || nodeSlots[nodeSlots.length - 1];
    const direction = slot.x >= center.x ? 1 : -1;
    const midX = center.x + direction * 240;
    const terminalX = slot.x - direction * 54;
    return {
      key: `${node.label}-${index}`,
      node,
      slot,
      markerX: terminalX,
      markerY: slot.y,
      d: `M ${center.x} ${center.y} L ${midX} ${center.y} L ${midX} ${slot.y} L ${terminalX} ${slot.y} L ${slot.x} ${slot.y}`,
    };
  });

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${kit.spacing.pageY}px ${kit.spacing.pageX}px`}}>
      <div style={{position: 'absolute', top: 94, left: 122, right: useRadial ? 520 : 130}}>
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
          系统结构
        </div>
        <div style={{marginTop: 22, maxWidth: useRadial ? 860 : 980}}>
          {headingLines.map((line, index) => (
            <div
              key={`${line}-${index}`}
              style={{
                marginTop: index === 0 ? 0 : 4,
                fontFamily: kit.fonts.display,
                fontSize: headingSize,
                fontWeight: 800,
                letterSpacing: -2.4,
                lineHeight: 1.08,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 98,
          top: 108,
          fontSize: 176,
          lineHeight: 0.84,
          fontWeight: 900,
          letterSpacing: -11,
          color: `${accentColor}10`,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        SYSTEM
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 220, bottom: 0}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            opacity: 0.12,
          }}
        >
          {Array.from({length: 8}).map((_, index) => (
            <div key={index} style={{height: 710, borderLeft: `1px solid ${accentColor}18`}} />
          ))}
        </div>

        <svg viewBox="0 0 1920 860" style={{width: '100%', height: '100%', overflow: 'visible'}}>
          {links.map((link, index) => {
            const linkDelay = 10 + index * 7;
            const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const nodeColor = toneToColor(link.node.accent ?? accent);
            return (
              <PathDrawLink
                key={link.key}
                d={link.d}
                color={nodeColor}
                progress={linkProgress}
                frame={frame}
                marker={{
                  x: link.markerX,
                  y: link.markerY,
                  size: 5,
                  shape: 'diamond',
                }}
                baseColor="rgba(255,255,255,0.03)"
                guideOpacity={0.8}
                baseStrokeWidth={3}
                flowStrokeWidth={4.4}
                drawStrokeWidth={1.8}
                dashPattern="12 14"
                flowOpacity={0.56}
              />
            );
          })}
        </svg>

        <GeometryAccent
          variant="hexagon-outline"
          color={accentColor}
          opacity={0.18}
          style={{left: center.x - 230, top: center.y - 248, width: 460, height: 500}}
        />
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.24}
          style={{left: center.x - 154, top: center.y - 154, width: 308, height: 308}}
        />
        <GeometryAccent
          variant="ring"
          color={accentColor}
          opacity={0.12}
          style={{left: center.x - 212, top: center.y - 212, width: 424, height: 424}}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: center.x - 166,
          top: center.y - 166,
          width: 332,
          height: 332,
          borderRadius: 48,
          background: `linear-gradient(180deg, ${accentColor}18 0%, rgba(7,10,18,0.98) 24%, rgba(7,10,18,0.98) 100%)`,
          border: `1px solid ${accentColor}34`,
          boxShadow: `0 0 0 16px ${accentColor}08, 0 0 80px ${accentColor}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: `rotate(45deg) ${withMicroJitter(frame, '', {
            delay: 8,
            amplitudeX: 0.8,
            amplitudeY: 0.8,
            rotateDeg: 0.08,
            scaleDelta: 0.002,
            seed: 170,
          })}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 22,
            borderRadius: 34,
            border: `1px solid ${accentColor}24`,
            opacity: 0.36 + Math.sin(frame * 0.06) * 0.08,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: 58,
            border: `1px solid ${accentColor}1b`,
            opacity: 0.24 + Math.sin(frame * 0.05) * 0.06,
          }}
        />
        <div style={{width: 236, transform: 'rotate(-45deg)'}}>
          <div style={{fontSize: 15, letterSpacing: 2.2, color: accentColor, textTransform: 'uppercase'}}>core system</div>
          <div style={{marginTop: 16, fontSize: 48, lineHeight: 1.08, fontWeight: 840}}>{centerTitle}</div>
          {centerDetailLines.length > 0 ? (
            <div style={{marginTop: 18, fontSize: 17, lineHeight: 1.54, color: 'rgba(255,255,255,0.66)'}}>
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
        const linkDelay = 10 + index * 7;
        const linkProgress = interpolate(frame, [linkDelay, linkDelay + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const nodeReveal = interpolate(linkProgress, [0.7, 1], [0, 1], {
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
        const staggerStyle = useStaggerScale(frame, index, 6);
        const floatStyle = useFloatMotion(frame, index * 7 + 20, 5, 100);
        const nodeTransform = [
          `translateY(${interpolate(nodeReveal, [0, 1], [16, 0])}px)`,
          staggerStyle.transform,
          floatStyle.transform,
        ].join(' ');

        return (
          <div
            key={`${link.key}-node`}
            style={{
              position: 'absolute',
              left: link.slot.labelLeft,
              top: link.slot.labelTop,
              width: link.slot.width,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              opacity: nodeReveal * staggerStyle.opacity,
              ...alignStyle,
              transform: withMicroJitter(
                frame,
                nodeTransform,
                {delay: linkDelay, amplitudeX: 0.8, amplitudeY: 0.8, rotateDeg: 0.14, scaleDelta: 0.002, seed: 200 + index},
              ),
              padding: '10px 0 0',
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 12, flexDirection: link.slot.align === 'right' ? 'row-reverse' : 'row'}}>
              <SemanticIconBadge
                iconValue={link.node.icon}
                semanticText={`${link.node.label} ${link.node.detail || ''}`}
                color={nodeColor}
                badgeSize={34}
                size={14}
                fallbackIndex={index}
                motionDelay={linkDelay}
                family="architecture-map"
              />
              <div style={{fontSize: 12, lineHeight: 1.2, letterSpacing: 2.1, color: nodeColor, textTransform: 'uppercase'}}>
                N/0{index + 1}
              </div>
            </div>
            <div style={{marginTop: 10}}>
              {labelLines.map((line, lineIndex) => (
                <div
                  key={`${line}-${lineIndex}`}
                  style={{
                    marginTop: lineIndex === 0 ? 0 : 3,
                    fontSize: 28,
                    lineHeight: 1.08,
                    fontWeight: 820,
                    textShadow: `0 0 22px ${nodeColor}18`,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
            {detailLines.length > 0 ? (
              <div style={{marginTop: 8, fontSize: 16, lineHeight: 1.54, color: 'rgba(255,255,255,0.6)'}}>
                {detailLines.map((line, lineIndex) => (
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
  );
};
