// src/tools/console/LeftPanel.tsx
import React from 'react';
import {theme} from './theme';
import type {StudioFile, ContractKey} from './types';
import {FlowSteps} from './FlowSteps';

interface LeftPanelProps {
  files: Record<ContractKey, StudioFile | null>;
  totalFrames: number;
  fps: number;
  onStepClick: (index: number) => void;
  onNewProject: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({files, totalFrames, fps, onStepClick, onNewProject}) => {
  const checkedCount = ['brief.json', 'script-pack.json', 'asset-pack.json']
    .filter((key) => files[key as ContractKey]?.exists).length;
  return (
    <div style={{
      width: 220, borderRight: `1px solid ${theme.border.subtle}`,
      display: 'flex', flexDirection: 'column', background: theme.bg.base,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px', borderBottom: `1px solid ${theme.border.subtle}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>制作流程</span>
        <span style={{fontSize: 9, color: theme.text.muted, background: theme.bg.surface, padding: '1px 8px', borderRadius: 10}}>
          {checkedCount}/7
        </span>
      </div>

      {/* P1: New project button */}
      <div style={{padding: '10px 12px 4px'}}>
        <button
          onClick={onNewProject}
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: 6,
            border: `1px dashed ${theme.border.accent}`,
            background: `${theme.accent.blue}0f`,
            color: theme.accent.blue,
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{fontSize: 12}}>+</span> 新建视频
        </button>
      </div>

      <FlowSteps files={files} onStepClick={onStepClick} />

      {/* Info bar */}
      <div style={{
        padding: '8px 12px', borderTop: `1px solid ${theme.border.subtle}`,
        background: theme.bg.surface,
      }}>
        <div style={{
          background: `${theme.accent.blue}11`, border: `1px solid ${theme.border.accent}`,
          borderRadius: 6, padding: '6px 10px',
        }}>
          <div style={{fontSize: 9, color: theme.text.secondary, marginBottom: 2}}>
            ✨ 点击步骤导航
          </div>
          <div style={{fontSize: 8, color: theme.text.muted}}>
            {totalFrames} 帧 · {fps} fps
          </div>
        </div>
      </div>
    </div>
  );
};
