// src/tools/console/ProductionStepper.tsx
// R1: 左侧生产步骤导航 — 6 步流程
import React from 'react';
import {theme} from './theme';

export type StepId = 'script' | 'style' | 'storyboard' | 'preview' | 'render' | 'deliver';

interface StepDef {
  id: StepId;
  label: string;
  icon: string;
}

const STEPS: StepDef[] = [
  {id: 'script',     label: '文案', icon: '✎'},
  {id: 'style',      label: '风格', icon: '🎨'},
  {id: 'storyboard', label: '分镜', icon: '☰'},
  {id: 'preview',    label: '预览', icon: '▶'},
  {id: 'render',     label: '渲染', icon: '⚡'},
  {id: 'deliver',    label: '交付', icon: '↓'},
];

interface StatusMap {
  script: 'pending' | 'done';
  style: 'pending' | 'done';
  storyboard: 'pending' | 'done';
  preview: 'pending' | 'done';
  render: 'pending' | 'done';
  deliver: 'pending' | 'done';
}

interface ProductionStepperProps {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
  status: StatusMap;
}

export const ProductionStepper: React.FC<ProductionStepperProps> = ({currentStep, onStepClick, status}) => (
  <div style={{padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
    {STEPS.map((step) => {
      const isActive = currentStep === step.id;
      const isDone = status[step.id] === 'done';
      const borderColor = isActive ? theme.accent.blue
        : isDone ? theme.accent.green + '66'
        : theme.border.subtle;
      const bgColor = isActive ? `${theme.accent.blue}18`
        : isDone ? `${theme.accent.green}0d`
        : 'transparent';
      const textColor = isActive ? theme.accent.blue
        : isDone ? theme.accent.green
        : theme.text.muted;

      return (
        <button
          key={step.id}
          onClick={() => onStepClick(step.id)}
          title={step.label}
          style={{
            width: 48, height: 48, borderRadius: 10,
            border: `1px solid ${borderColor}`,
            background: bgColor,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2, cursor: 'pointer',
            transition: 'all 0.15s',
            transform: isActive ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <span style={{fontSize: 14, lineHeight: 1}}>{isDone ? '✓' : step.icon}</span>
          <span style={{fontSize: 8, fontWeight: isActive ? 700 : 500, color: textColor}}>
            {step.label}
          </span>
        </button>
      );
    })}
  </div>
);

export const defaultStepStatus = (): StatusMap => ({
  script: 'pending',
  style: 'pending',
  storyboard: 'pending',
  preview: 'pending',
  render: 'pending',
  deliver: 'pending',
});
