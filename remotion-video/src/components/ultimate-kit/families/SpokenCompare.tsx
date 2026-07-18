import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {SpokenCenterStage, SpokenGlassPanel, SpokenKicker, getAccentColor} from './SpokenVisualKit';

interface SpokenCompareItem {
  label: string;
  value: string;
  accent?: string;
}

interface SpokenCompareProps {
  heading?: string;
  items: SpokenCompareItem[];
  accent?: string;
  grammar?: unknown;
}

function splitCompare(items: SpokenCompareItem[]) {
  const safeItems = items?.length ? items : [{label: '旧方式', value: '画面先行'}, {label: '新方式', value: '口播驱动'}];
  return [
    safeItems[0] ?? {label: 'A', value: '旧方案'},
    safeItems[1] ?? {label: 'B', value: '新方案'},
  ];
}

export const SpokenCompare: React.FC<SpokenCompareProps> = ({
  heading = '关键对比',
  items,
  accent = 'cyan',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [left, right] = splitCompare(items);
  const color = getAccentColor(accent);
  const reveal = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const divider = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SpokenCenterStage compact>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
      <SpokenKicker color={color}>BEFORE / AFTER</SpokenKicker>
      <div style={{
        fontSize: heading.length > 18 ? 38 : 46,
        fontWeight: 950,
        color: '#fff',
        marginBottom: 34,
        opacity: reveal,
        textAlign: 'center',
      }}>
        {heading}
      </div>
      <SpokenGlassPanel width={1040}>
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 58,
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 3,
          height: `${divider * 100}%`,
          background: 'rgba(255,255,255,0.18)',
          transform: 'translateX(-50%)',
        }} />
        {[left, right].map((item, index) => {
          const sideReveal = interpolate(frame, [fps * (0.15 + index * 0.16), fps * (0.55 + index * 0.16)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const color = index === 0 ? 'rgba(255,255,255,0.55)' : '#00d4ff';
          return (
            <div key={`${item.label}-${index}`} style={{
              opacity: sideReveal,
              transform: `translateX(${(index === 0 ? -1 : 1) * (1 - sideReveal) * 36}px)`,
              textAlign: index === 0 ? 'right' : 'left',
            }}>
              <div style={{fontSize: 18, color: 'rgba(255,255,255,0.48)', fontWeight: 900, marginBottom: 18, letterSpacing: 2}}>
                {item.label}
              </div>
              <div style={{fontSize: 54, lineHeight: 1.03, fontWeight: 950, color, textShadow: index === 1 ? `0 0 22px ${color}77` : 'none'}}>
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
