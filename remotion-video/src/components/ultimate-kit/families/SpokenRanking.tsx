import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {SpokenCenterStage, SpokenGlassPanel, SpokenKicker, getAccentColor} from './SpokenVisualKit';

interface SpokenRankingItem {
  label: string;
  value: string;
  accent?: string;
}

interface SpokenRankingProps {
  heading?: string;
  items: SpokenRankingItem[];
  accent?: string;
  grammar?: unknown;
}

export const SpokenRanking: React.FC<SpokenRankingProps> = ({
  heading = '排名变化',
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const color = getAccentColor(accent);
  const safeItems = (items?.length ? items : [{label: '核心观点', value: heading}]).slice(0, 4);
  const headingOpacity = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <SpokenCenterStage compact>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
      <SpokenKicker color={color}>RANKING</SpokenKicker>
      <div style={{
        fontSize: heading.length > 18 ? 38 : 48,
        lineHeight: 1.08,
        fontWeight: 950,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 38,
        opacity: headingOpacity,
      }}>
        {heading}
      </div>
      <SpokenGlassPanel width={980}>
      <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: 18}}>
        {safeItems.map((item, index) => {
          const delay = fps * 0.2 + index * fps * 0.16;
          const reveal = interpolate(frame, [delay, delay + fps * 0.35], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const width = interpolate(reveal, [0, 1], [12, 100], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={`${item.label}-${index}`} style={{
              display: 'grid',
              gridTemplateColumns: '78px 1fr 160px',
              alignItems: 'center',
              gap: 22,
              opacity: reveal,
              transform: `translateY(${(1 - reveal) * 24}px)`,
            }}>
              <div style={{
                fontSize: 42,
                fontWeight: 950,
                color: index === 0 ? color : 'rgba(255,255,255,0.55)',
                fontVariantNumeric: 'tabular-nums',
                textShadow: index === 0 ? `0 0 20px ${color}66` : 'none',
              }}>
                #{index + 1}
              </div>
              <div>
                <div style={{fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 10}}>
                  {item.label}
                </div>
                <div style={{height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
                  <div style={{height: '100%', width: `${width}%`, borderRadius: 999, background: color}} />
                </div>
              </div>
              <div style={{fontSize: 30, fontWeight: 950, color, textAlign: 'right'}}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
      </SpokenGlassPanel>
      </div>
    </SpokenCenterStage>
  );
};
