import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

interface SpokenCodeItem {
  label: string;
  value: string;
  accent?: string;
}

interface SpokenCodeProps {
  heading?: string;
  items: SpokenCodeItem[];
  accent?: string;
  grammar?: unknown;
}

function codeLinesFromItems(items: SpokenCodeItem[], heading: string) {
  const safeItems = items?.length ? items : [{label: 'flow', value: heading}];
  return safeItems.slice(0, 5).map((item, index) => {
    const key = item.label.replace(/\s+/g, '_').toLowerCase() || `step_${index + 1}`;
    return `${key}: ${item.value}`;
  });
}

export const SpokenCode: React.FC<SpokenCodeProps> = ({
  heading = '实现路径',
  items,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = codeLinesFromItems(items, heading);
  const panelReveal = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 150px 150px',
    }}>
      <div style={{
        fontSize: heading.length > 20 ? 40 : 52,
        fontWeight: 900,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 28,
        opacity: panelReveal,
      }}>
        {heading}
      </div>
      <div style={{
        width: '100%',
        maxWidth: 940,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(2,8,23,0.72)',
        borderRadius: 24,
        overflow: 'hidden',
        opacity: panelReveal,
        transform: `translateY(${(1 - panelReveal) * 28}px)`,
      }}>
        <div style={{
          height: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 22px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}>
          {['#ff5f57', '#ffbd2e', '#28c840'].map((color) => (
            <span key={color} style={{width: 13, height: 13, borderRadius: 999, background: color}} />
          ))}
          <span style={{marginLeft: 12, color: 'rgba(255,255,255,0.46)', fontSize: 18, fontWeight: 700}}>
            spoken_contract.yaml
          </span>
        </div>
        <div style={{padding: '30px 34px', fontFamily: 'Menlo, Monaco, Consolas, monospace'}}>
          {lines.map((line, index) => {
            const delay = fps * 0.25 + index * fps * 0.18;
            const chars = Math.floor(interpolate(frame, [delay, delay + fps * 0.45], [0, line.length], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }));
            return (
              <div key={`${line}-${index}`} style={{
                fontSize: 30,
                lineHeight: 1.65,
                color: index === 0 ? '#00d4ff' : 'rgba(226,232,240,0.88)',
                whiteSpace: 'pre',
              }}>
                <span style={{color: 'rgba(148,163,184,0.62)', marginRight: 22}}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                {line.slice(0, chars)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
