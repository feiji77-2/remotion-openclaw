/**
 * SpokenMetric — 口播数据指标（递增数字动画）
 *
 * 大数字递增 + 标签，无图表无卡片
 * 适配 spoken-metric / spoken-ranking family
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {SpokenCenterStage, SpokenHeadline, SpokenKicker, getAccentColor} from './SpokenVisualKit';

interface SpokenMetricItem {
  label: string;
  value: string;
  accent?: string;
}

interface SpokenMetricProps {
  /** 可选标题 */
  heading?: string;
  /** 数据项（取自 beat.payload.items） */
  items: SpokenMetricItem[];
  accent?: string;
  grammar?: unknown;
}

function parseNumericDisplay(raw: string): {target: number; suffix: string} {
  const match = raw.match(/^([\d,.]+)(.*)/);
  if (!match) return {target: 0, suffix: raw};
  const target = parseFloat(match[1].replace(/,/g, ''));
  return {target: isNaN(target) ? 0 : target, suffix: match[2] ?? ''};
}

export const SpokenMetric: React.FC<SpokenMetricProps> = ({
  heading,
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const color = getAccentColor(accent);
  const safeItems = (items?.length ? items : [{label: '核心数字', value: heading ?? '1'}]).slice(0, 3);

  return (
    <SpokenCenterStage compact>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
        {heading ? (
          <>
            <SpokenKicker color={color}>DATA POINT</SpokenKicker>
            <SpokenHeadline size={heading.length > 22 ? 42 : 50}>{heading}</SpokenHeadline>
          </>
        ) : null}
      <div style={{
        display: 'flex',
        gap: safeItems.length > 1 ? 66 : 0,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: heading ? 44 : 0,
      }}>
        {safeItems.map((item, i) => {
          const delay = 10 + i * 12;
          const reveal = spring({
            fps: 30,
            frame: Math.max(0, frame - delay),
            config: {damping: 200, stiffness: 120},
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(reveal, [0, 1], [30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

          const {target, suffix} = parseNumericDisplay(item.value);
          const progress = interpolate(frame, [delay, delay + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const current = Math.round(target * progress);
          const displayValue = current.toLocaleString() + suffix;

          return (
            <div key={i} style={{
              textAlign: 'center',
              opacity,
              transform: `translateY(${y}px)`,
              minWidth: safeItems.length === 1 ? 560 : 280,
            }}>
              <div style={{
                fontSize: item.value.length > 6 ? 96 : 128,
                lineHeight: 0.92,
                fontWeight: 950,
                color,
                letterSpacing: -5,
                textShadow: `0 0 26px ${color}88, 0 8px 30px rgba(0,0,0,0.62)`,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {displayValue}
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: 'rgba(226,232,240,0.62)',
                marginTop: 16,
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}>
                {item.label}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </SpokenCenterStage>
  );
};
