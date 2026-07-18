// src/tools/console/FlowSteps.tsx
import React from 'react';
import {theme} from './theme';
import type {StudioFile, ContractKey} from './types';

interface FlowStepsProps {
  files: Record<ContractKey, StudioFile | null>;
  onStepClick: (index: number) => void;
}

const steps = [
  {key: 'brief.json', label: '选题 Brief', desc: '确定选题和观点'},
  {key: 'script-pack.json', label: '标题 / 口播', desc: '撰写口播文案'},
  {key: 'asset-pack.json', label: '素材检查', desc: '检查图片/视频素材'},
  {key: null, label: '配音 / 字幕', desc: '生成配音和字幕'},
  {key: null, label: '分镜编排', desc: '编排场景顺序'},
  {key: null, label: '关键帧验收', desc: '生成关键帧预览'},
  {key: null, label: '成片输出', desc: '渲染最终视频'},
];

export const FlowSteps: React.FC<FlowStepsProps> = ({files, onStepClick}) => (
  <div style={{padding: '10px 12px', flex: 1, overflow: 'auto', fontSize: 10}}>
    {steps.map((step, i) => {
      const fileExists = step.key ? files[step.key as ContractKey]?.exists : false;
      const isChecked = fileExists;
      return (
        <div
          key={i}
          onClick={() => onStepClick(i)}
          style={{
            display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start',
            opacity: 1,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 6,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = theme.bg.hover}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700,
            background: isChecked ? theme.accent.green : theme.bg.elevated,
            border: isChecked ? 'none' : `1px solid ${theme.border.default}`,
            color: isChecked ? '#fff' : theme.text.muted,
          }}>
            {isChecked ? '✓' : i + 1}
          </div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 600, color: theme.text.primary, fontSize: 10, marginBottom: 1}}>
              {step.label}
              {isChecked && <span style={{color: theme.accent.green, fontSize: 8, marginLeft: 6}}>已完成</span>}
            </div>
            <div style={{color: theme.text.muted, fontSize: 8}}>
              {step.desc}
            </div>
          </div>
          <span style={{color: theme.text.muted, fontSize: 8, alignSelf: 'center'}}>→</span>
        </div>
      );
    })}
  </div>
);
