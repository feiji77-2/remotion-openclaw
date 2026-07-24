import type {StageStatus} from './types';

export type WorkflowStepId = 'copy' | 'script' | 'voice' | 'style' | 'storyboard' | 'preview' | 'render' | 'deliver' | 'components';

const sceneTimelineSteps = new Set<WorkflowStepId>(['storyboard', 'render', 'deliver']);
const wideEditorSteps = new Set<WorkflowStepId>(['copy', 'script', 'voice', 'style']);

export const usesSceneTimeline = (step: WorkflowStepId) => sceneTimelineSteps.has(step);
export const usesWideEditor = (step: WorkflowStepId) => wideEditorSteps.has(step);
export const shouldBuildBeforeFirstSceneOverride = (projectStatus: StageStatus, hasSceneOverrides: boolean) =>
  projectStatus !== 'current' && !hasSceneOverrides;

export interface WorkflowSnapshot {
  hasProject: boolean;
  scriptDraftReady?: boolean;
  scriptReady: boolean;
  voiceReady: boolean;
  styleReady: boolean;
  projectStatus: StageStatus;
  previewStatus: StageStatus;
  renderStatus: StageStatus;
  verifyStatus: StageStatus;
}

export interface NavigationEntry {
  enabled: boolean;
  reason: string | null;
}

export type NavigationState = Record<WorkflowStepId, NavigationEntry>;

const entry = (enabled: boolean, reason: string): NavigationEntry => ({
  enabled,
  reason: enabled ? null : reason,
});

export const navigationState = (snapshot: WorkflowSnapshot): NavigationState => {
  const hasScript = snapshot.hasProject && snapshot.scriptReady;
  const hasVoice = hasScript && snapshot.voiceReady;
  const hasStyle = hasVoice && snapshot.styleReady;
  const hasStoryboard = hasStyle && snapshot.projectStatus === 'current';
  const canRender = hasStyle;
  const hasRender = canRender && snapshot.renderStatus === 'current';

  return {
    copy: entry(snapshot.hasProject, '请先新建视频'),
    script: entry(snapshot.hasProject, '请先新建视频'),
    voice: entry(hasScript, '等待保存口播文案'),
    style: entry(hasVoice, '等待语音'),
    storyboard: entry(hasStyle, '等待应用风格'),
    preview: entry(false, '已移至渲染'),
    render: entry(canRender, '等待应用风格'),
    deliver: entry(hasRender, '等待生成成片'),
    components: entry(snapshot.hasProject, '请先新建视频'),
  };
};

export interface SavedCopyDraft {
  savedText: string;
  savedAt: string | null;
}

export interface PendingCopyTransfer {
  text: string;
  requestedAt: string;
}

export const requestCopyTransfer = (draft: SavedCopyDraft): PendingCopyTransfer => {
  const text = draft.savedText.trim();
  if (!text || !draft.savedAt) throw new Error('请先保存草稿');
  return {text, requestedAt: draft.savedAt};
};

export interface ProductionArtifactSnapshot {
  projectStatus: StageStatus;
  previewStatus: StageStatus;
  sceneStillsStatus?: StageStatus;
  renderStatus: StageStatus;
  verifyStatus: StageStatus;
  deliveryReady: boolean;
}

export const invalidateProductionArtifacts = (
  _snapshot: ProductionArtifactSnapshot,
): ProductionArtifactSnapshot => ({
  projectStatus: 'stale',
  previewStatus: 'stale',
  sceneStillsStatus: 'stale',
  renderStatus: 'stale',
  verifyStatus: 'stale',
  deliveryReady: false,
});

export interface CreatorArtifactStatus {
  label: string;
  downloadAllowed: boolean;
}

export const creatorArtifactStatus = (
  renderStatus: StageStatus,
  verifyStatus: StageStatus,
): CreatorArtifactStatus => {
  if (renderStatus !== 'current') return {label: '尚未生成成片', downloadAllowed: false};
  if (verifyStatus === 'current') return {label: '已生成，可下载', downloadAllowed: true};
  if (verifyStatus === 'stale') return {label: '视频文件有问题，暂时不能下载', downloadAllowed: false};
  return {label: '已生成，可播放', downloadAllowed: false};
};
