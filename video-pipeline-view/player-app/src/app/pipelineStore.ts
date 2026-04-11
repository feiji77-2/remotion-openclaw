import {create} from 'zustand';
import {DEFAULT_SHOTS} from '../workflow/steps';
import type {JobStatus, PreviewRatio, ProjectState, RenderJobResult, Shot, VoiceJobResult, WorkflowStepId} from '../workflow/types';
import {API_BASE_DEFAULT, createInitialProjectState} from './pipelineConstants';
import type {PersistedPipelineSnapshot, PipelinePayload} from './pipelineTypes';

type Updater<T> = T | ((prev: T) => T);

function resolveUpdater<T>(next: Updater<T>, prev: T): T {
  return typeof next === 'function' ? (next as (value: T) => T)(prev) : next;
}

interface PipelineSessionState {
  apiBase: string;
  titleKeywords: string;
  projectState: ProjectState;
  shotsState: Shot[];
  pipelineState: PipelinePayload;
  activeStep: WorkflowStepId;
  stepLoading: Record<number, boolean>;
  stepDone: Record<number, boolean>;
  voiceJobId: string | null;
  voiceJobResult: VoiceJobResult | null;
  renderJobId: string | null;
  renderJobResult: RenderJobResult | null;
  voiceJobStatus: JobStatus;
  renderJobStatus: JobStatus;
  voiceProgress: number;
  renderProgress: number;
  imageStatus: JobStatus;
  imageCount: number;
  stepSkillDirty: Record<number, boolean>;
  regenerateAttempts: Record<number, number>;
  previewRatio: PreviewRatio;
  busyAll: boolean;
  errorMsg: string | null;
  toast: string | null;
  selectedAnalysis: any;
  selectedTitleId: string | null;
  stepConfirmed: Record<number, boolean>;
  selectedShotId: string;
  playbackResetKey: number;
  hasHydrated: boolean;
}

interface PipelineSessionActions {
  setApiBase: (next: Updater<string>) => void;
  setTitleKeywords: (next: Updater<string>) => void;
  setProjectState: (next: Updater<ProjectState>) => void;
  setShotsState: (next: Updater<Shot[]>) => void;
  setPipelineState: (next: Updater<PipelinePayload>) => void;
  setActiveStep: (next: Updater<WorkflowStepId>) => void;
  setStepLoading: (next: Updater<Record<number, boolean>>) => void;
  setStepDone: (next: Updater<Record<number, boolean>>) => void;
  setVoiceJobId: (next: Updater<string | null>) => void;
  setVoiceJobResult: (next: Updater<VoiceJobResult | null>) => void;
  setRenderJobId: (next: Updater<string | null>) => void;
  setRenderJobResult: (next: Updater<RenderJobResult | null>) => void;
  setVoiceJobStatus: (next: Updater<JobStatus>) => void;
  setRenderJobStatus: (next: Updater<JobStatus>) => void;
  setVoiceProgress: (next: Updater<number>) => void;
  setRenderProgress: (next: Updater<number>) => void;
  setImageStatus: (next: Updater<JobStatus>) => void;
  setImageCount: (next: Updater<number>) => void;
  setStepSkillDirty: (next: Updater<Record<number, boolean>>) => void;
  setRegenerateAttempts: (next: Updater<Record<number, number>>) => void;
  setPreviewRatio: (next: Updater<PreviewRatio>) => void;
  setBusyAll: (next: Updater<boolean>) => void;
  setErrorMsg: (next: Updater<string | null>) => void;
  setToast: (next: Updater<string | null>) => void;
  setSelectedAnalysis: (next: Updater<any>) => void;
  setSelectedTitleId: (next: Updater<string | null>) => void;
  setStepConfirmed: (next: Updater<Record<number, boolean>>) => void;
  setSelectedShotId: (next: Updater<string>) => void;
  setPlaybackResetKey: (next: Updater<number>) => void;
  setHasHydrated: (next: Updater<boolean>) => void;
  hydrateFromSnapshot: (snapshot: PersistedPipelineSnapshot) => void;
}

export type PipelineSessionStore = PipelineSessionState & PipelineSessionActions;

function createInitialPipelineSessionState(): PipelineSessionState {
  return {
    apiBase: API_BASE_DEFAULT,
    titleKeywords: 'OpenClaw 小龙虾为什么这么火？',
    projectState: createInitialProjectState(),
    shotsState: DEFAULT_SHOTS,
    pipelineState: {},
    activeStep: 1,
    stepLoading: {},
    stepDone: {},
    voiceJobId: null,
    voiceJobResult: null,
    renderJobId: null,
    renderJobResult: null,
    voiceJobStatus: 'idle',
    renderJobStatus: 'idle',
    voiceProgress: 0,
    renderProgress: 0,
    imageStatus: 'idle',
    imageCount: 0,
    stepSkillDirty: {},
    regenerateAttempts: {},
    previewRatio: 'landscape',
    busyAll: false,
    errorMsg: null,
    toast: null,
    selectedAnalysis: null,
    selectedTitleId: null,
    stepConfirmed: {},
    selectedShotId: DEFAULT_SHOTS[0].id,
    playbackResetKey: 0,
    hasHydrated: false,
  };
}

function createSetter<K extends keyof PipelineSessionState>(key: K) {
  return (set: (partial: (state: PipelineSessionStore) => Partial<PipelineSessionStore>) => void) =>
    (next: Updater<PipelineSessionState[K]>) => {
      set((state) => ({
        [key]: resolveUpdater(next, state[key]),
      }));
    };
}

export const usePipelineSessionStore = create<PipelineSessionStore>((set) => {
  const initialState = createInitialPipelineSessionState();

  return {
    ...initialState,
    setApiBase: createSetter('apiBase')(set),
    setTitleKeywords: createSetter('titleKeywords')(set),
    setProjectState: createSetter('projectState')(set),
    setShotsState: createSetter('shotsState')(set),
    setPipelineState: createSetter('pipelineState')(set),
    setActiveStep: createSetter('activeStep')(set),
    setStepLoading: createSetter('stepLoading')(set),
    setStepDone: createSetter('stepDone')(set),
    setVoiceJobId: createSetter('voiceJobId')(set),
    setVoiceJobResult: createSetter('voiceJobResult')(set),
    setRenderJobId: createSetter('renderJobId')(set),
    setRenderJobResult: createSetter('renderJobResult')(set),
    setVoiceJobStatus: createSetter('voiceJobStatus')(set),
    setRenderJobStatus: createSetter('renderJobStatus')(set),
    setVoiceProgress: createSetter('voiceProgress')(set),
    setRenderProgress: createSetter('renderProgress')(set),
    setImageStatus: createSetter('imageStatus')(set),
    setImageCount: createSetter('imageCount')(set),
    setStepSkillDirty: createSetter('stepSkillDirty')(set),
    setRegenerateAttempts: createSetter('regenerateAttempts')(set),
    setPreviewRatio: createSetter('previewRatio')(set),
    setBusyAll: createSetter('busyAll')(set),
    setErrorMsg: createSetter('errorMsg')(set),
    setToast: createSetter('toast')(set),
    setSelectedAnalysis: createSetter('selectedAnalysis')(set),
    setSelectedTitleId: createSetter('selectedTitleId')(set),
    setStepConfirmed: createSetter('stepConfirmed')(set),
    setSelectedShotId: createSetter('selectedShotId')(set),
    setPlaybackResetKey: createSetter('playbackResetKey')(set),
    setHasHydrated: createSetter('hasHydrated')(set),
    hydrateFromSnapshot: (snapshot) => {
      const migratedStep7Done = Boolean(
        snapshot.stepDone?.[7]
        || snapshot.pipelineState?.projectBuild
        || snapshot.pipelineState?.render
        || snapshot.renderJobId
        || snapshot.renderJobResult,
      );
      const migratedStepDone = Object.entries({
        ...(snapshot.stepDone || {}),
        ...(migratedStep7Done ? {7: true} : {}),
      }).reduce<Record<number, boolean>>((acc, [key, value]) => {
        acc[Number(key)] = Boolean(value);
        return acc;
      }, {});
      const migratedStepConfirmed = Object.entries({
        ...(snapshot.stepConfirmed || {}),
        ...(migratedStep7Done
          ? {7: Boolean(snapshot.stepConfirmed?.[7] || snapshot.stepConfirmed?.[8] || snapshot.stepDone?.[8])}
          : {}),
      }).reduce<Record<number, boolean>>((acc, [key, value]) => {
        acc[Number(key)] = Boolean(value);
        return acc;
      }, {});
      const migratedPipelineState = {
        ...(snapshot.pipelineState || {}),
        ...(migratedStep7Done && !snapshot.pipelineState?.projectBuild
          ? {
            projectBuild: {
              compositionId: 'OpenClawVideo',
              buildStatus: 'ready',
              summary: '从旧快照自动迁移出的默认 Step 7 项目构建状态。',
            },
          }
          : {}),
      };

      set(() => ({
        apiBase: snapshot.apiBase,
        titleKeywords: snapshot.titleKeywords,
        projectState: snapshot.projectState,
        shotsState: snapshot.shotsState,
        pipelineState: migratedPipelineState,
        activeStep: snapshot.activeStep,
        stepDone: migratedStepDone,
        stepConfirmed: migratedStepConfirmed,
        selectedAnalysis: snapshot.selectedAnalysis,
        selectedTitleId: snapshot.selectedTitleId,
        previewRatio: snapshot.previewRatio,
        voiceJobId: snapshot.voiceJobId,
        voiceJobResult: snapshot.voiceJobResult,
        renderJobId: snapshot.renderJobId,
        renderJobResult: snapshot.renderJobResult,
        voiceJobStatus: snapshot.voiceJobStatus,
        renderJobStatus: snapshot.renderJobStatus,
        voiceProgress: snapshot.voiceProgress,
        renderProgress: snapshot.renderProgress,
        imageStatus: snapshot.imageStatus,
        imageCount: snapshot.imageCount,
        stepSkillDirty: snapshot.stepSkillDirty || {},
        hasHydrated: true,
      }));
    },
  };
});
