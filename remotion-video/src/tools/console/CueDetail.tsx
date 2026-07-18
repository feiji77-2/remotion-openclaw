// src/tools/console/CueDetail.tsx
import React from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface CueDetailProps {
  selectedScene: SceneTimeline | null;
}

export const CueDetail: React.FC<CueDetailProps> = ({selectedScene}) => {
  if (!selectedScene) return null;
  const {scene, start, end} = selectedScene;

  return (
    <div style={{
      margin: '4px 12px 6px', background: theme.bg.deep,
      border: `1px solid ${theme.border.default}`, borderRadius: 4,
      padding: '6px 10px',
    }}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{fontWeight: 600, fontSize: 10, color: theme.accent.blue}}>{scene.id}</span>
          <span style={{color: theme.text.muted, fontSize: 8, background: theme.bg.surface, padding: '1px 6px', borderRadius: 3}}>
            {scene.family}
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>{start}-{end}f</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <div style={{background: theme.bg.surface, padding: '2px 8px', borderRadius: 3, fontSize: 8, color: theme.text.muted}}>
            入场: spring
          </div>
          <div style={{background: theme.accent.blue + '22', padding: '2px 8px', borderRadius: 3, fontSize: 8, color: theme.accent.blue, cursor: 'pointer'}}>
            预览此段 ▶
          </div>
        </div>
      </div>
    </div>
  );
};
