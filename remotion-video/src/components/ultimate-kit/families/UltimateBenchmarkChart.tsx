import React from 'react';
import {UltimateHeading} from '../UltimateHeading';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {GeometryAccent, PathDrawLink} from '../../visual-atoms';
import {resolveUltimateAccent, ultimateGlow, ultimateKitTokens} from '../tokens';
import { useStaggerScale, useStaggerSlide } from '../motionGrammar';
import {resolveSceneDirective, resolveEntranceParams} from '../directive';
import type {UltimateBenchmarkChartProps, UltimateSceneGrammar, FamilyDirectorMeta} from '../types';

const toneToColor = (tone?: Parameters<typeof resolveUltimateAccent>[0]) => {
  return resolveUltimateAccent(tone ?? 'cyan');
};

const animateMetricDisplay = (value: string, progress: number) => {
  const raw = String(value);
  const numeric = Number(raw.replace(/[^\d.+-]/g, ''));
  if (!Number.isFinite(numeric)) {
    return value;
  }

  const prefix = raw.match(/^[^\d+-]*/)?.[0] ?? '';
  const suffix = raw.match(/[^\d.+-]*$/)?.[0] ?? '';
  return `${prefix}${Math.round(numeric * progress)}${suffix}`;
};

export const UltimateBenchmarkChart: React.FC<UltimateBenchmarkChartProps & {grammar?: UltimateSceneGrammar; directorMeta?: FamilyDirectorMeta}> = ({
  heading,
  summary,
  primaryLabel,
  secondaryLabel,
  items,
  accent = 'yellow',
  grammar,
  directorMeta,
}) => {
  const frame = useCurrentFrame();
  const accentColor = toneToColor(accent);
  const primaryColor = resolveUltimateAccent('cyan');
  const secondaryColor = resolveUltimateAccent('yellow');
  const d = resolveSceneDirective(grammar, 'benchmark-chart');
  const gap = d.animation.staggerGap;
  const ep = resolveEntranceParams(d);
  const adaptive = directorMeta?.adaptive;
  const sizeScale = adaptive?.contrast.sizeRatio ?? 1;
  const adaptiveGap = adaptive ? Math.round(d.spacing.gap * adaptive.density.spacing) : d.spacing.gap;
  const visibleItems = items.slice(0, 3);
  const trackLeft = 360;
  const trackWidth = 1060;
  const bestLead = visibleItems.reduce((max, item) => {
    return Math.max(max, Math.round((item.primaryRatio - item.secondaryRatio) * 100));
  }, 0);

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 88,
          maxWidth: 860,
          zIndex: 3,
        }}
      >
        <UltimateHeading
          heading={heading}
          archetype={grammar?.archetype}
          accent={accent}
          grammar={grammar}
          subtitle={summary}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: 94,
          top: 82,
          fontSize: 200,
          lineHeight: 0.8,
          fontWeight: 900,
          letterSpacing: -12,
          color: `${accentColor}14`,
          textAlign: 'right',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        PACE
      </div>

      <div
        style={{
          position: 'absolute',
          right: 108,
          top: 254,
          textAlign: 'right',
          zIndex: 2,
        }}
      >
        <div style={{fontSize: Math.round((d.typography.label.size + 5) * sizeScale), letterSpacing: 2.6, textTransform: 'uppercase', color: `rgba(255,255,255,${d.atmosphere.labelOpacity})`}}>
          max lead
        </div>
        <div style={{marginTop: 10, fontSize: 132, lineHeight: 0.84, fontWeight: 900, letterSpacing: -7, color: accentColor}}>
          +{Math.max(0, bestLead)}
        </div>
      </div>

      <GeometryAccent
        variant="ring"
        color={accentColor}
        opacity={0.12}
        style={{left: 1216, top: 118, width: 430, height: 430}}
      />
      <GeometryAccent
        variant="slanted-panel"
        color={accentColor}
        opacity={0.14}
        style={{left: 278, top: 332, width: 1256, height: 518, transform: 'rotate(-5deg)'}}
      />

      <div
        style={{
          position: 'absolute',
          left: 86,
          right: 86,
          top: 344,
          bottom: 108,
          display: 'grid',
          gap: adaptiveGap * 2,
        }}
      >
        {visibleItems.map((item, index) => {
          const laneDelay = 10 + index * gap;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - laneDelay),
            config: {damping: 18, stiffness: 150},
          });
          const primaryProgress = interpolate(frame, [laneDelay, laneDelay + 28], [0, item.primaryRatio], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const secondaryProgress = interpolate(frame, [laneDelay + 6, laneDelay + 34], [0, item.secondaryRatio], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const laneColor = toneToColor(item.accent ?? accent);
          const lead = Math.round((item.primaryRatio - item.secondaryRatio) * 100);
          const primaryX = trackLeft + primaryProgress * trackWidth;
          const secondaryX = trackLeft + secondaryProgress * trackWidth;
          const topY = 56;
          const bottomY = 110;
          const primaryPath = `M ${trackLeft} ${topY} C ${trackLeft + 260} ${topY - 16}, ${trackLeft + 760} ${topY + 20}, ${primaryX} ${topY}`;
          const secondaryPath = `M ${trackLeft} ${bottomY} C ${trackLeft + 220} ${bottomY + 18}, ${trackLeft + 700} ${bottomY - 12}, ${secondaryX} ${bottomY}`;
          const staggerScale = useStaggerScale(frame, index, 8);
          const staggerSlide = ep.useSlide
            ? useStaggerSlide(frame, index, 8, ep.slideDirection, ep.slideDistance)
            : {opacity: 1, transform: 'none'};

          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                position: 'relative',
                height: 182,
                opacity: reveal * staggerScale.opacity,
                transform: `${staggerScale.transform} translateY(${interpolate(reveal, [0, 1], [28, 0])}px)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 18,
                  width: 246,
                  zIndex: 2,
                }}
              >
                <div style={{fontSize: Math.round(d.typography.label.size * sizeScale), lineHeight: 1.2, letterSpacing: 2.4, textTransform: 'uppercase', color: laneColor}}>
                  lane 0{index + 1}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: -4,
                    top: -16,
                    fontSize: 118,
                    lineHeight: 0.84,
                    fontWeight: 900,
                    color: `${laneColor}${Math.round(d.atmosphere.decorationOpacity * 100).toString(16).padStart(2, '0')}`,
                  }}
                >
                  0{index + 1}
                </div>
                <div style={{marginTop: adaptiveGap + 4, fontSize: Math.round((d.typography.value.size + 12) * sizeScale), lineHeight: 1.02, fontWeight: 860, color: ultimateKitTokens.colors.text}}>
                  {item.label}
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: 252,
                  right: 208,
                  top: 10,
                  height: 152,
                  borderRadius: 24,
                  background: 'transparent',
                  overflow: 'hidden',
                  transform: 'skewX(-10deg)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(90deg, transparent 0%, ${laneColor}09 50%, transparent 100%)`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: trackLeft - 252,
                    top: topY - 7,
                    width: trackWidth + 42,
                    height: 14,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: trackLeft - 252,
                    top: bottomY - 7,
                    width: trackWidth + 42,
                    height: 14,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.025)',
                  }}
                />

                <PathDrawLink
                  d={primaryPath}
                  color={primaryColor}
                  progress={1}
                  frame={frame}
                  marker={null}
                  baseColor="transparent"
                  baseStrokeWidth={0}
                  flowStrokeWidth={12}
                  drawStrokeWidth={0}
                  drawOpacity={0}
                  dashPattern="220 0"
                  flowOpacity={0.96}
                />
                <PathDrawLink
                  d={secondaryPath}
                  color={secondaryColor}
                  progress={1}
                  frame={frame}
                  marker={null}
                  baseColor="transparent"
                  baseStrokeWidth={0}
                  flowStrokeWidth={10}
                  drawStrokeWidth={0}
                  drawOpacity={0}
                  dashPattern="220 0"
                  flowOpacity={0.82}
                />

                <div
                  style={{
                    position: 'absolute',
                    left: primaryX - 252 - 12,
                    top: topY - 13,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: primaryColor,
                    boxShadow: ultimateGlow(primaryColor, 0.4),
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: secondaryX - 252 - 10,
                    top: bottomY - 10,
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    transform: 'rotate(45deg)',
                    background: secondaryColor,
                    boxShadow: `0 0 18px ${secondaryColor}88`,
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    right: 44,
                    top: 18,
                    fontSize: 98,
                    lineHeight: 0.8,
                    fontWeight: 900,
                    color: `${laneColor}10`,
                  }}
                >
                  {lead > 0 ? `+${lead}` : lead}
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 18,
                  width: 188,
                  textAlign: 'right',
                  zIndex: 2,
                  opacity: staggerSlide.opacity,
                  transform: staggerSlide.transform,
                }}
              >
                <div style={{fontSize: Math.round((d.typography.value.size + 14) * sizeScale), fontWeight: 860, lineHeight: 1, color: primaryColor}}>
                  {animateMetricDisplay(item.primaryValue, Math.min(1, reveal))}
                </div>
                <div style={{marginTop: d.spacing.density === 'compact' ? 2 : 4, fontSize: Math.round((d.typography.label.size - 1) * sizeScale), lineHeight: 1.2, letterSpacing: 1.8, textTransform: 'uppercase', color: `rgba(255,255,255,${d.atmosphere.labelOpacity})`}}>
                  {primaryLabel}
                </div>
                <div style={{marginTop: adaptiveGap - 4, fontSize: Math.round(d.typography.value.size * sizeScale), fontWeight: 760, lineHeight: 1, color: secondaryColor}}>
                  {animateMetricDisplay(item.secondaryValue, Math.min(1, reveal))}
                </div>
                <div style={{marginTop: d.spacing.density === 'compact' ? 2 : 4, fontSize: d.typography.label.size - 1, lineHeight: 1.2, letterSpacing: 1.8, textTransform: 'uppercase', color: `rgba(255,255,255,${d.atmosphere.labelOpacity})`}}>
                  {secondaryLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          bottom: 60,
          display: 'flex',
          gap: 26,
          alignItems: 'center',
          color: `rgba(255,255,255,${d.atmosphere.labelOpacity + 0.08})`,
          fontSize: Math.round(d.typography.label.size * sizeScale),
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 18, height: 18, borderRadius: '50%', background: primaryColor, boxShadow: ultimateGlow(primaryColor, 0.34)}} />
          <span>{primaryLabel}</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 16, height: 16, borderRadius: 4, transform: 'rotate(45deg)', background: secondaryColor, boxShadow: `0 0 14px ${secondaryColor}66`}} />
          <span>{secondaryLabel}</span>
        </div>
      </div>
    </div>
  );
};
