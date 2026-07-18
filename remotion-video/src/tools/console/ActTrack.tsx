// src/tools/console/ActTrack.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface ActConfig {
  id: string;
  name: string;
  energy: 'explosive' | 'high' | 'moderate' | 'calm';
  color: string;
  scenes: SceneTimeline[];
  totalFrames: number;
}

const energyColors: Record<string, string> = {
  explosive: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  calm: '#22c55e',
};

export const ActTrack: React.FC<{act: ActConfig}> = ({act}) => {
  const [expanded, setExpanded] = useState(true);
  const color = energyColors[act.energy];

  return (
    <div style={{marginBottom: 2, border: `1px solid ${theme.border.subtle}`, borderRadius: 4, overflow: 'hidden'}}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px',
          background: theme.bg.surface, cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{fontSize: 7, color: theme.text.muted, transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s'}}>
          ▾
        </span>
        <span style={{fontSize: 7, color: theme.text.muted, width: 36}}>Act {act.id}</span>
        <span style={{fontSize: 8, color: theme.text.primary, fontWeight: 600}}>{act.name}</span>
        <span style={{fontSize: 7, color, display: 'flex', alignItems: 'center', gap: 3}}>⬤ {act.energy}</span>
        <span style={{fontSize: 7, color: theme.text.muted}}>
          {act.scenes[0]?.start ?? 0}-{act.scenes[act.scenes.length - 1]?.end ?? 0}f
        </span>
        <span style={{marginLeft: 'auto', fontSize: 7, color: theme.text.muted}}>
          {act.scenes.length} 场景
        </span>
      </div>

      {/* Scene segments */}
      {expanded && (
        <div style={{padding: '4px 8px 6px'}}>
          <div style={{display: 'flex', height: 24, background: theme.bg.deep, borderRadius: 3, position: 'relative', overflow: 'hidden'}}>
            {act.scenes.map(({scene, start, end}, index) => {
              const left = (start / act.totalFrames) * 100;
              const width = ((end - start) / act.totalFrames) * 100;
              const isFirst = index === 0;
              const isLast = index === act.scenes.length - 1;
              return (
                <div
                  key={scene.id}
                  style={{
                    position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%',
                    background: `${color}22`, border: `1px solid ${color}66`,
                    borderRadius: isFirst ? '3px 0 0 3px' : isLast ? '0 3px 3px 0' : '0',
                    display: 'flex', alignItems: 'center', padding: '0 5px',
                    cursor: 'pointer',
                  }}
                  title={`${scene.id} (${start}-${end}f)`}
                >
                  <span style={{fontSize: 7, color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {scene.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
