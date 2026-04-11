import React, {useMemo} from 'react';
import {Step1Analysis} from './Step1Analysis';
import {Step2TitleGeneration} from './Step2TitleGeneration';
import {Step3ContentGeneration} from './Step3ContentGeneration';
import {Step4ShotStructure} from './Step4ShotStructure';
import {Step5Prompts} from './Step5Prompts';
import {Step6VoiceScript} from './Step6VoiceScript';
import {Step7ProjectBuild} from './Step7ProjectBuild';
import {Step8RenderSettings} from './Step8RenderSettings';
import {StepSkillPanel} from './StepSkillPanel';
import type {JobStatus, RenderJobResult, Shot, StepMeta, VoiceJobResult, WorkflowStepId} from '../../workflow/types';
import type {SkillDrivenStepId, StepEvaluation, StepSkillConfig} from '../../app/pipelineTypes';
import {normalizeStepSkill, SKILL_STEP_IDS} from '../../workflow/stepSkillCatalog';

interface StepWorkspaceProps {
  step: StepMeta;
  stepId: WorkflowStepId;
  titleKeywords: string;
  appliedTitleKeywords: string;
  hasPendingTitleKeywords: boolean;
  onTitleKeywordsChange: (value: string) => void;
  shots: Shot[];
  pipelineState: Record<string, any>;
  selectedTitleId: string | null;
  loading: boolean;
  confirmed: boolean;
  skillDirty: boolean;
  voiceStatus: JobStatus;
  voiceJobId: string | null;
  voiceProgress: number;
  voiceResult: VoiceJobResult | null;
  voiceManifestUrl: string | null;
  voiceAssets: Array<{shotId: string; title: string; durationSeconds: number; voiceFile: string; url: string}>;
  onBackfillVoiceDurations: () => void;
  renderStatus: JobStatus;
  renderJobId: string | null;
  renderProgress: number;
  renderResult: RenderJobResult | null;
  stepEvaluation: StepEvaluation | null;
  imageStatus: JobStatus;
  imageCount: number;
  onGenerateStep: () => void;
  onApplyTitleKeywords: () => void;
  onConfirmStep: () => void;
  onUpdateStepSkill: (stepId: SkillDrivenStepId, patch: Partial<StepSkillConfig>) => void;
  onSelectTitle: (titleId: string) => void;
  onUpdateAnalysis: (updated: Record<string, any>) => void;
  onUpdateTitles: (updated: Record<string, any>) => void;
  onUpdateCopy: (updated: Record<string, any>) => void;
  onUpdateShots: (updated: Array<{id?: string; title?: string; narration?: string; durationSeconds?: number}>) => void;
  onUpdatePrompts: (updated: Record<string, any>) => void;
  onUpdateVoice: (updated: Record<string, any>) => void;
  onUpdateRender: (updated: Record<string, any>) => void;
  onGenerateImages: () => void;
  onSubmitVoice: (voiceOverride?: Record<string, any>) => void;
  onSubmitRender: () => void;
}

export const StepWorkspace: React.FC<StepWorkspaceProps> = ({
  step,
  stepId,
  titleKeywords,
  appliedTitleKeywords,
  hasPendingTitleKeywords,
  onTitleKeywordsChange,
  shots,
  pipelineState,
  selectedTitleId,
  loading,
  confirmed,
  skillDirty,
  voiceStatus,
  voiceJobId,
  voiceProgress,
  voiceResult,
  voiceManifestUrl,
  voiceAssets,
  onBackfillVoiceDurations,
  renderStatus,
  renderJobId,
  renderProgress,
  renderResult,
  stepEvaluation,
  imageStatus,
  imageCount,
  onGenerateStep,
  onApplyTitleKeywords,
  onConfirmStep,
  onUpdateStepSkill,
  onSelectTitle,
  onUpdateAnalysis,
  onUpdateTitles,
  onUpdateCopy,
  onUpdateShots,
  onUpdatePrompts,
  onUpdateVoice,
  onUpdateRender,
  onGenerateImages,
  onSubmitVoice,
  onSubmitRender,
}) => {
  const skillStepId = useMemo(
    () => (SKILL_STEP_IDS.includes(stepId as SkillDrivenStepId) ? stepId as SkillDrivenStepId : null),
    [stepId],
  );
  const currentSkill = useMemo(
    () => (skillStepId ? normalizeStepSkill(skillStepId, pipelineState.stepSkills?.[skillStepId]) : null),
    [pipelineState.stepSkills, skillStepId],
  );
  const headerMetrics = useMemo(() => {
    if (stepId === 4) return `${shots.length} 个镜头`;
    if (stepId === 5) return `${imageCount} 张图`;
    if (stepId === 6) return `${pipelineState.voice?.engine || 'chattts'} 引擎`;
    if (stepId === 7) return `${pipelineState.projectBuild?.compositionId || '待生成'} 载体`;
    if (stepId === 8) return `${pipelineState.render?.template || 'caption'} 模板`;
    return step.hint;
  }, [imageCount, pipelineState.projectBuild?.compositionId, pipelineState.render?.template, pipelineState.voice?.engine, shots.length, step.hint, stepId]);

  const workspaceStatus = useMemo(() => {
    if (stepId === 8) {
      const mediaReady = Boolean(renderResult?.mediaReady && (renderResult.outputUrl || renderResult.downloadUrl));

      if (loading || renderStatus === 'running' || renderStatus === 'pending') {
        return {label: '渲染中', className: 'is-running'};
      }

      if (renderStatus === 'error') {
        return {label: '渲染失败', className: 'is-error'};
      }

      if (mediaReady) {
        return {label: '结果可用', className: 'is-done'};
      }

      if (pipelineState.render) {
        return {label: '待渲染', className: 'is-idle'};
      }

      return {label: '待生成', className: 'is-idle'};
    }

    if (skillDirty && skillStepId) {
      return {label: '待更新', className: 'is-warning'};
    }

    if (confirmed) {
      return {label: '已确认', className: 'is-done'};
    }

    if (loading) {
      return {label: '生成中', className: 'is-running'};
    }

    return {label: '待确认', className: 'is-idle'};
  }, [confirmed, loading, pipelineState.render, renderResult, renderStatus, skillDirty, skillStepId, stepId]);

  const generateButtonLabel = useMemo(() => {
    if (stepId === 1 && hasPendingTitleKeywords) {
      return '同步主题并重开';
    }
    if (loading) {
      return '生成中...';
    }
    return stepId === 1 && !pipelineState.analysis ? '确认主题并生成' : '重新生成当前 Step';
  }, [hasPendingTitleKeywords, loading, pipelineState.analysis, stepId]);

  return (
    <div className="mac-step-workspace">
      <div className="mac-step-workspace-bar">
        <div>
          <span className="mac-kicker">Step {stepId}</span>
          <h3>{step.label}</h3>
        </div>
        <div className="mac-step-workspace-meta">
          <span className={`mac-status-pill ${workspaceStatus.className}`}>
            {workspaceStatus.label}
          </span>
          <small>{headerMetrics}</small>
        </div>
      </div>

      {skillStepId ? (
        <StepSkillPanel
          stepId={skillStepId}
          titleKeywords={titleKeywords}
          hasPendingTitleKeywords={hasPendingTitleKeywords}
          skill={currentSkill}
          dirty={skillDirty}
          onTitleKeywordsChange={onTitleKeywordsChange}
          onApplyTitleKeywords={onApplyTitleKeywords}
          onUpdateSkill={onUpdateStepSkill}
        />
      ) : null}

      {stepId === 1 ? (
        <Step1Analysis
          data={pipelineState.analysis || null}
          topicResearch={pipelineState.topicResearch || null}
          titleKeywords={titleKeywords}
          appliedTitleKeywords={appliedTitleKeywords}
          hasPendingTitleKeywords={hasPendingTitleKeywords}
          loading={loading}
          confirmed={confirmed}
          onGenerate={onGenerateStep}
          onApplyTitleKeywords={onApplyTitleKeywords}
          onConfirm={onConfirmStep}
          onUpdate={onUpdateAnalysis}
          workbenchMode
        />
      ) : null}

      {stepId === 2 ? (
        <Step2TitleGeneration
          data={pipelineState.titles || null}
          selectedTitleId={selectedTitleId}
          loading={loading}
          confirmed={confirmed}
          onGenerate={onGenerateStep}
          onConfirm={onConfirmStep}
          onSelectTitle={onSelectTitle}
          onUpdate={onUpdateTitles}
          workbenchMode
        />
      ) : null}

      {stepId === 3 ? (
        <Step3ContentGeneration
          stepId={stepId}
          data={pipelineState.copy || null}
          stepSkill={currentSkill}
          confirmed={confirmed}
          onConfirm={onConfirmStep}
          onGenerate={onGenerateStep}
          onUpdate={onUpdateCopy}
          loading={loading}
          workbenchMode
        />
      ) : null}

      {stepId === 4 ? (
        <Step4ShotStructure
          stepId={stepId}
          shots={shots}
          onUpdate={onUpdateShots}
          onGenerate={onGenerateStep}
          loading={loading}
          confirmed={confirmed}
          onConfirm={onConfirmStep}
          workbenchMode
        />
      ) : null}

      {stepId === 5 ? (
        <Step5Prompts
          stepId={stepId}
          data={{
            ...(pipelineState.prompts || {}),
            shots,
          }}
          imageData={pipelineState.images || null}
          onGenerate={onGenerateStep}
          onGenerateImages={onGenerateImages}
          onUpdate={onUpdatePrompts}
          imageStatus={imageStatus}
          imageCount={imageCount}
          loading={loading}
          confirmed={confirmed}
          onConfirm={onConfirmStep}
          workbenchMode
        />
      ) : null}

      {stepId === 6 ? (
        <Step6VoiceScript
          stepId={stepId}
          data={pipelineState.voice || null}
          shots={shots}
          onGenerate={onGenerateStep}
          onSubmitVoice={onSubmitVoice}
          onUpdate={onUpdateVoice}
          voiceStatus={voiceStatus}
          voiceJobId={voiceJobId}
          voiceProgress={voiceProgress}
          voiceResult={voiceResult}
          voiceManifestUrl={voiceManifestUrl}
          voiceAssets={voiceAssets}
          onBackfillDurations={onBackfillVoiceDurations}
          loading={loading}
          confirmed={confirmed}
          onConfirm={onConfirmStep}
        />
      ) : null}

      {stepId === 8 ? (
        <Step8RenderSettings
          stepId={stepId}
          data={pipelineState.render || null}
          onGenerate={onGenerateStep}
          onSubmitRender={onSubmitRender}
          onUpdate={onUpdateRender}
          renderStatus={renderStatus}
          renderJobId={renderJobId}
          renderProgress={renderProgress}
          renderResult={renderResult}
          loading={loading}
        />
      ) : null}

      {stepId === 7 ? (
        <Step7ProjectBuild
          stepId={stepId}
          data={pipelineState.projectBuild || null}
          evaluation={stepEvaluation}
          loading={loading}
          confirmed={confirmed}
          onGenerate={onGenerateStep}
          onConfirm={onConfirmStep}
        />
      ) : null}

      {skillStepId ? (
        <div className="wf-confirm-row wf-confirm-row-workbench">
          <div className="wf-confirm-note">
            {stepId === 1 && hasPendingTitleKeywords
              ? '标题已改动，确认时会先按最新标题重开 Step 1。'
              : skillDirty
                ? 'skill 已改动，可直接确认当前可见结果继续，或先重新生成吃到新 skill。'
              : confirmed
                ? '当前结果已确认，可继续推进下一步。'
                : '确认当前结果后，再继续推进下一步。'}
          </div>
          <div className="wf-inline-actions">
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'loading' : ''}`}
              onClick={stepId === 1 && hasPendingTitleKeywords ? onApplyTitleKeywords : onGenerateStep}
              disabled={loading}
            >
              {generateButtonLabel}
            </button>
            <button
              type="button"
              className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
              onClick={onConfirmStep}
              disabled={loading}
            >
              {confirmed ? '✓ 已确认当前结果' : '确认当前结果'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
