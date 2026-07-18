// src/tools/console/SceneMiniList.tsx
import React from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface SceneMiniListProps {
  timeline: SceneTimeline[];
}

const sceneLabel = (family: string) => {
  const labels: Record<string, string> = {
    'spoken-title': '标题开场', 'spoken-metric': '数据指标',
    'spoken-process': '步骤流程', 'spoken-ranking': '排行重点',
    'spoken-compare': '左右对比', 'spoken-tags': '标签矩阵',
    'spoken-code': '代码窗口', 'spoken-takeaway': '结论收束',
  };
  return labels[family] ?? family;
};

export const SceneMiniList: React.FC<SceneMiniListProps> = ({timeline}) => (
  <div style={{padding: '8px 10px', flex: 1, overflow: 'auto'}}>
    <div style={{fontSize: 8, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3}}>
      场景结构
    </div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
      {timeline.map(({scene, start, end}, index) => (
        <div
          key={scene.id}
          style={{
            background: theme.bg.surface, border: `1px solid ${index === 0 ? theme.accent.blue + '33' : theme.border.subtle}`,
            borderLeft: index === 0 ? `2px solid ${theme.accent.blue}` : `2px solid transparent`,
            borderRadius: 4, padding: '5px 8px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{fontSize: 7, color: index === 0 ? theme.accent.blue : theme.text.muted, fontWeight: 700}}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span style={{fontSize: 10, color: theme.text.primary}}>{scene.id}</span>
          </div>
          <span style={{fontSize: 8, color: theme.text.muted}}>{start}-{end}f</span>
        </div>
      ))}
    </div>
  </div>
);
