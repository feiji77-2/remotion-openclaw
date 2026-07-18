import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {SpokenCenterStage, SpokenKicker, getAccentColor} from './SpokenVisualKit';

interface SpokenTagItem {
  label: string;
  value: string;
  accent?: string;
}

interface SpokenTagsProps {
  heading?: string;
  items: SpokenTagItem[];
  accent?: string;
  grammar?: unknown;
}

export const SpokenTags: React.FC<SpokenTagsProps> = ({
  heading = '关键词',
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const safeItems = (items?.length ? items : [{label: heading, value: heading}]).slice(0, 8);
  const color = getAccentColor(accent);
  const headingOpacity = interpolate(frame, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <SpokenCenterStage compact>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <SpokenKicker color={color}>MODEL MAP</SpokenKicker>
      <div style={{
        fontSize: heading.length > 20 ? 38 : 48,
        fontWeight: 950,
        color: '#fff',
        marginBottom: 34,
        opacity: headingOpacity,
        textAlign: 'center',
      }}>
        {heading}
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center', maxWidth: 1080}}>
        {safeItems.map((item, index) => {
          const delay = fps * 0.12 + index * fps * 0.08;
          const reveal = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const text = item.value && item.value !== item.label ? item.value : item.label;
          return (
            <div key={`${text}-${index}`} style={{
              padding: '14px 24px',
              borderRadius: 999,
              border: `1px solid ${index === 0 ? color : 'rgba(255,255,255,0.16)'}`,
              background: index === 0 ? `${color}1f` : 'rgba(255,255,255,0.07)',
              color: index === 0 ? '#fff' : 'rgba(255,255,255,0.78)',
              fontSize: text.length > 12 ? 26 : 32,
              fontWeight: index === 0 ? 950 : 800,
              opacity: reveal,
              transform: `scale(${0.92 + reveal * 0.08}) translateY(${(1 - reveal) * 16}px)`,
              boxShadow: index === 0 ? `0 0 20px ${color}44` : 'none',
            }}>
              {text}
            </div>
          );
        })}
      </div>
      </div>
    </SpokenCenterStage>
  );
};
