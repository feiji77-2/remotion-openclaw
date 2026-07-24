import React from 'react';
import type {StageStatus} from './types';
import type {NavigationState, WorkflowStepId} from './workflow-model';

export type StepId = WorkflowStepId;
export type StepStatus = 'draft' | 'running' | StageStatus | 'ready';

type StepIconId = 'copy' | 'script' | 'voice' | 'style' | 'storyboard' | 'render' | 'deliver' | 'components' | 'video-library';

interface StepDef { id: StepId; label: string; icon: StepIconId; group: 'creation' | 'production' | 'library'; }

const steps: StepDef[] = [
  {id: 'copy', label: '文案制作', icon: 'copy', group: 'creation'},
  {id: 'script', label: '口播文案', icon: 'script', group: 'production'},
  {id: 'voice', label: '语音', icon: 'voice', group: 'production'},
  {id: 'style', label: '风格', icon: 'style', group: 'production'},
  {id: 'storyboard', label: '分镜', icon: 'storyboard', group: 'production'},
  {id: 'render', label: '渲染', icon: 'render', group: 'production'},
  {id: 'deliver', label: '交付', icon: 'deliver', group: 'production'},
];
const libraryStep: StepDef = {id: 'components', label: '组件库', icon: 'components', group: 'library'};

interface ProductionStepperProps {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
  onOpenVideoLibrary: () => void;
  status: Record<StepId, StepStatus>;
  navigation: NavigationState;
  busy?: boolean;
}

const stateLabel = (status: StepStatus) => ({
  current: '就绪', ready: '可交付', stale: '需更新', missing: '未生成', running: '处理中', draft: '草稿',
}[status]);

const StepIcon: React.FC<{icon: StepIconId}> = ({icon}) => (
  <span className={`production-step__icon is-${icon}`} aria-hidden="true">
    <svg viewBox="0 0 28 28" focusable="false">
      {icon === 'copy' && <><rect x="7" y="5" width="12" height="17" rx="3" /><path d="M11 10h7M11 14h5" /><path d="M17 18l5-5 2 2-5 5-3 1z" /></>}
      {icon === 'script' && <><rect x="10" y="4" width="8" height="13" rx="4" /><path d="M7 13a7 7 0 0 0 14 0M14 20v4M10 24h8" /></>}
      {icon === 'voice' && <><path d="M6 16h4l5 5V7l-5 5H6z" /><path d="M19 10a6 6 0 0 1 0 8M22 7a10 10 0 0 1 0 14" /></>}
      {icon === 'style' && <><path d="M14 4a10 10 0 0 0-1 20h3a3 3 0 0 0 1-6h-1a2 2 0 0 1 0-4h2a4 4 0 0 0 4-4c0-3-4-6-8-6z" /><circle cx="10" cy="10" r="1.6" /><circle cx="14" cy="8" r="1.6" /><circle cx="18" cy="11" r="1.6" /></>}
      {icon === 'storyboard' && <><rect x="5" y="6" width="8" height="7" rx="2" /><rect x="15" y="6" width="8" height="7" rx="2" /><rect x="5" y="15" width="8" height="7" rx="2" /><rect x="15" y="15" width="8" height="7" rx="2" /></>}
      {icon === 'render' && <><rect x="5" y="6" width="18" height="16" rx="3" /><path d="M12 10l6 4-6 4z" /><path d="M8 6l2-3M14 6l2-3M20 6l2-3" /></>}
      {icon === 'deliver' && <><path d="M14 4l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V8z" /><path d="M10 14l3 3 6-7" /></>}
      {icon === 'components' && <><path d="M14 4l8 4-8 4-8-4z" /><path d="M6 12l8 4 8-4M6 16l8 4 8-4" /></>}
      {icon === 'video-library' && <><rect x="5" y="7" width="18" height="14" rx="3" /><path d="M5 11h18M10 7v14M15 13l4 3-4 3z" /></>}
    </svg>
  </span>
);

export const ProductionStepper: React.FC<ProductionStepperProps> = ({currentStep, onStepClick, onOpenVideoLibrary, status, navigation, busy = false}) => (
  <nav className="production-nav" aria-label="视频生产流程">
    <div className="production-nav__heading">创作与生产</div>
    <div className="production-nav__list">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const stepState = status[step.id];
        const availability = navigation[step.id];
        const displayState = busy ? '处理中' : availability.enabled ? stateLabel(stepState) : availability.reason;
        return (
          <button
            className={`production-step is-${step.group} ${isActive ? 'is-active' : ''} is-${stepState}`}
            disabled={busy || !availability.enabled}
            key={step.id}
            onClick={() => onStepClick(step.id)}
            title={availability.reason || step.label}
            type="button"
          >
            <StepIcon icon={step.icon} />
            <span className="production-step__label">{step.label}</span>
            <span className="production-step__state">{displayState}</span>
          </button>
        );
      })}
    </div>
    <div className="production-nav__library">
      <div className="production-nav__heading production-nav__heading--sub">素材与组件</div>
      {(() => {
        const isActive = currentStep === libraryStep.id;
        const stepState = status[libraryStep.id];
        const availability = navigation[libraryStep.id];
        return <>
          <button
            className={`production-step is-${libraryStep.group} ${isActive ? 'is-active' : ''} is-${stepState}`}
            disabled={busy || !availability.enabled}
            onClick={() => onStepClick(libraryStep.id)}
            title={availability.reason || libraryStep.label}
            type="button"
          >
            <StepIcon icon={libraryStep.icon} />
            <span className="production-step__label">{libraryStep.label}</span>
            <span className="production-step__state">{busy ? '处理中' : availability.enabled ? '可选组件' : availability.reason}</span>
          </button>
          <button
            className="production-step is-library is-video-library is-current"
            disabled={busy}
            onClick={onOpenVideoLibrary}
            title="视频库"
            type="button"
          >
            <StepIcon icon="video-library" />
            <span className="production-step__label">视频库</span>
            <span className="production-step__state">成片记录</span>
          </button>
        </>;
      })()}
    </div>
  </nav>
);
