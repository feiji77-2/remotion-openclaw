import {useMemo} from 'react';
import type {JobStatus, WorkflowStepId} from '../workflow/types';
import type {ProjectBuildState} from './pipelineTypes';

/** Derives human-readable badge label for a step button. */
export function computeStepBadgeLabel(opts: {
  stepId: WorkflowStepId;
  isRenderStep: boolean;
  isLoading: boolean;
  isConfirmed: boolean;
  isGenerated: boolean;
  isSkillDirty: boolean;
  blockedBy: {id: number; label: string} | null;
  renderStepHasError: boolean;
  renderStepIsRunning: boolean;
  renderMediaReady: boolean;
  renderStepConfigured: boolean;
}): string {
  const {isRenderStep, isLoading, isConfirmed, isGenerated, isSkillDirty, blockedBy,
    renderStepHasError, renderStepIsRunning, renderMediaReady, renderStepConfigured} = opts;

  if (isRenderStep) {
    if (isLoading) return '生成中';
    if (renderStepHasError) return '失败';
    if (renderStepIsRunning) return '渲染中';
    if (renderMediaReady) return '结果可用';
    if (renderStepConfigured) return '待渲染';
    if (blockedBy) return '锁定';
    return '待生成';
  }
  if (isSkillDirty) return '待更新';
  if (isLoading) return '生成中';
  if (isConfirmed) return '已确认';
  if (isGenerated) return '待确认';
  if (blockedBy) return '锁定';
  return '待生成';
}

/** Derives badge CSS class for a step button. */
export function computeStepBadgeClass(opts: {
  stepId: WorkflowStepId;
  isRenderStep: boolean;
  isLoading: boolean;
  isConfirmed: boolean;
  isGenerated: boolean;
  isSkillDirty: boolean;
  blockedBy: {id: number; label: string} | null;
  renderStepHasError: boolean;
  renderStepIsRunning: boolean;
  renderMediaReady: boolean;
  renderStepConfigured: boolean;
}): string {
  const {isRenderStep, isLoading, isConfirmed, isGenerated, isSkillDirty, blockedBy,
    renderStepHasError, renderStepIsRunning, renderMediaReady, renderStepConfigured} = opts;

  if (isRenderStep) {
    if (renderStepHasError) return 'is-error';
    if (renderStepIsRunning) return 'is-generating';
    if (renderMediaReady) return 'is-confirmed';
    if (renderStepConfigured) return 'done';
    if (blockedBy) return 'is-blocked';
    return '';
  }
  if (isSkillDirty) return 'is-warning';
  if (isLoading) return 'is-generating';
  if (isConfirmed) return 'is-confirmed';
  if (isGenerated) return 'done';
  if (blockedBy) return 'is-blocked';
  return '';
}

/** Derives build-status pill class + label from projectBuild state. */
export function useBuildStatus(projectBuild: ProjectBuildState | null | undefined) {
  return useMemo(() => {
    const status = projectBuild?.buildStatus;
    if (status === 'ready') {
      return {className: 'is-done', label: '就绪'};
    }
    if (status === 'missing') {
      return {className: 'is-error', label: '缺失'};
    }
    if (status === 'error') {
      return {className: 'is-error', label: '错误'};
    }
    return {className: 'is-idle', label: '待生成'};
  }, [projectBuild?.buildStatus]);
}

/** Derives active-step status pill. */
export function useStepStatus(opts: {
  stepConfirmed: Record<number, boolean>;
  stepDone: Record<number, boolean>;
  stepSkillDirty: Record<number, boolean>;
  stepId: WorkflowStepId;
}) {
  const {stepConfirmed, stepDone, stepSkillDirty, stepId} = opts;
  return useMemo(() => {
    if (stepSkillDirty[stepId]) {
      return {className: 'is-warning', label: '待更新'};
    }
    if (stepConfirmed[stepId]) {
      return {className: 'is-done', label: '已确认'};
    }
    if (stepDone[stepId]) {
      return {className: 'is-running', label: '待确认'};
    }
    return {className: 'is-idle', label: '待生成'};
  }, [stepConfirmed, stepDone, stepSkillDirty, stepId]);
}

/** Derives global pipeline status class + label from job statuses. */
export function usePipelineStatus(imageStatus: JobStatus, voiceJobStatus: JobStatus, renderJobStatus: JobStatus) {
  return useMemo(() => {
    // If any error, show error
    if (imageStatus === 'error' || voiceJobStatus === 'error' || renderJobStatus === 'error') {
      return {className: 'is-error', label: '错误'};
    }
    // If any running, show running
    if (imageStatus === 'running' || voiceJobStatus === 'running' || renderJobStatus === 'running') {
      return {className: 'is-running', label: '运行中'};
    }
    // If any pending, show pending
    if (imageStatus === 'pending' || voiceJobStatus === 'pending' || renderJobStatus === 'pending') {
      return {className: 'is-running', label: '运行中'};
    }
    if (imageStatus === 'done' && voiceJobStatus === 'done' && renderJobStatus === 'done') {
      return {className: 'is-done', label: '完成'};
    }
    return {className: 'is-idle', label: '空闲'};
  }, [imageStatus, voiceJobStatus, renderJobStatus]);
}
