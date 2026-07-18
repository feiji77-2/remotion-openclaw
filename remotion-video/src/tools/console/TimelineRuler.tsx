// src/tools/console/TimelineRuler.tsx
import React from 'react';
import {theme} from './theme';

interface TimelineRulerProps {
  totalFrames: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({totalFrames}) => {
  const tickInterval = 30;
  const ticks: number[] = [];
  for (let f = 0; f <= totalFrames; f += tickInterval) ticks.push(f);

  return (
    <div style={{
      display: 'flex', height: 16, position: 'relative',
      borderBottom: `1px solid ${theme.border.subtle}`, fontSize: 7, color: theme.text.muted,
      marginBottom: 4,
    }}>
      {ticks.map((f) => (
        <React.Fragment key={f}>
          <span style={{position: 'absolute', left: `${(f / totalFrames) * 100}%`, top: 2}}>
            {f}
          </span>
          <div style={{
            position: 'absolute', left: `${(f / totalFrames) * 100}%`, top: 10,
            width: 1, height: 4, background: theme.border.default,
          }} />
        </React.Fragment>
      ))}
      {/* Playhead at 30% */}
      <div style={{
        position: 'absolute', left: '30%', top: 0, width: 1, height: 14,
        background: theme.accent.blue, zIndex: 2,
      }}>
        <div style={{
          width: 7, height: 7, background: theme.accent.blue,
          borderRadius: '50%', marginLeft: -3,
        }} />
      </div>
    </div>
  );
};
