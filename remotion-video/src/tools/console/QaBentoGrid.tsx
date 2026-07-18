// src/tools/console/QaBentoGrid.tsx
import React from 'react';
import {theme} from './theme';

interface QaBentoGridProps {
  compiled: {project: unknown; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  onRunCommand: (cmd: string, label: string) => void;
}

export const QaBentoGrid: React.FC<QaBentoGridProps> = ({compiled, stillUrl, videoUrl, onRunCommand}) => {
  const cards = [
    {
      label: 'Check', value: compiled.project ? '✓ 通过' : '✗ 未通过',
      color: compiled.project ? theme.accent.green : theme.accent.red,
      border: compiled.project ? theme.accent.green : theme.accent.red,
      sub: compiled.project ? '编译正常' : compiled.error ?? '未知错误',
    },
    {
      label: 'Still', value: stillUrl ? '✓ 已生成' : '◷ 待生成',
      color: stillUrl ? theme.accent.green : theme.accent.amber,
      border: stillUrl ? theme.accent.green : theme.accent.amber,
      sub: stillUrl ? '可预览' : '5 场景待渲染',
      action: stillUrl ? null : () => onRunCommand('project-still', '生成关键帧'),
    },
    {
      label: 'MP4', value: videoUrl ? '✓ 已渲染' : '— 待渲染',
      color: videoUrl ? theme.accent.green : theme.text.muted,
      border: videoUrl ? theme.accent.green : theme.text.muted,
      sub: videoUrl ? '可下载' : '排队中',
      action: videoUrl ? null : () => onRunCommand('project-render', '渲染 MP4'),
    },
    {
      label: '导演评分', value: '78', color: theme.accent.blue,
      border: theme.accent.blue, sub: 'B 级 · 良好',
    },
  ];

  return (
    <div style={{
      padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
    }}>
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={card.action ? card.action : undefined}
          style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderLeft: `2px solid ${card.border}`, borderRadius: 5,
            padding: '6px 8px', cursor: card.action ? 'pointer' : 'default',
          }}
        >
          <div style={{fontSize: 7, color: theme.text.muted, textTransform: 'uppercase'}}>
            {card.label}
          </div>
          <div style={{fontSize: 11, color: card.color, fontWeight: 700}}>
            {card.value}
          </div>
          <div style={{fontSize: 7, color: theme.text.muted}}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
};
