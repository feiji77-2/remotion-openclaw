// src/tools/console/CueLayerRow.tsx
import React from 'react';
import {theme} from './theme';

const layers = [
  {label: 'text 入场 0-15f', width: 80, color: theme.accent.blue},
  {label: 'icon 5-20f', width: 60, color: theme.accent.green},
  {label: 'shape bg 0-30f', width: 100, color: theme.accent.purple},
  {label: 'text 退场', width: 70, color: theme.accent.amber},
];

export const CueLayerRow: React.FC = () => (
  <div style={{
    margin: '0 12px 6px', background: theme.bg.deep,
    border: `1px solid ${theme.border.default}`, borderRadius: 4,
    padding: '6px 10px',
  }}>
    <div style={{fontSize: 8, color: theme.text.muted, marginBottom: 4}}>
      Cue 层细节 · <span style={{color: theme.accent.blue}}>cue-opening-title</span>
    </div>
    <div style={{display: 'flex', gap: 6, overflow: 'auto'}}>
      {layers.map((layer) => (
        <div
          key={layer.label}
          style={{
            flex: `0 0 ${layer.width}px`, height: 14,
            background: `${layer.color}22`, border: `1px solid ${layer.color}88`,
            borderRadius: 2, display: 'flex', alignItems: 'center', padding: '0 4px',
          }}
        >
          <span style={{fontSize: 6, color: layer.color}}>{layer.label}</span>
        </div>
      ))}
    </div>
  </div>
);
