import {create} from 'zustand';
import {DEFAULT_SHOTS} from '../workflow/steps';
import type {JobStatus, PreviewRatio, ProjectState, RenderJobResult, Shot, VoiceJobResult, WorkflowStepId} from '../workflow/types';
import {API_BASE_DEFAULT, API_KEY_DEFAULT, createInitialProjectState} from './pipelineConstants';
import type {PersistedPipelineSnapshot, PipelineAnalysisState, PipelinePayload} from './pipelineTypes';

type Updater<T> = T | ((prev: T) => T);

function resolveUpdater<T>(next: Updater<T>, prev: T): T {
  return typeof next === 'function' ? (next as (value: T) => T)(prev) : next;
}

interface PipelineSessionState {
  // ── Config ───────────────────────────────────────────────────────────────
  apiBase: string;
  apiKey: string;
  previewRatio: PreviewRatio;

  // ── Topic ────────────────────────────────────────────────────────────────
  titleKeywords: string;
  appliedTitleKeywords: string;

  // ── Project ──────────────────────────────────────────────────────────────
  projectState: ProjectState;
  shotsState: Shot[];

  // ── Pipeline payload (all step outputs) ─────────────────────────────────
  pipelineState: PipelinePayload;

  // ── Navigation ───────────────────────────────────────────────────────────
  activeStep: WorkflowStepId;

  // ── Step flags (Record<stepId, value>) ─────────────────────────────────
  stepLoading: Record<number, boolean>;
  stepDone: Record<number, boolean>;
  stepConfirmed: Record<number, boolean>;
  stepSkillDirty: Record<number, boolean>;

  // ── Selection ───────────────────────────────────────────────────────────
  selectedAnalysis: PipelineAnalysisState | null;
  selectedTitleId: string | null;
  selectedShotId: string;

  // ── Voice job ──────────────────────────────────────────────────────────
  voiceJobId: string | null;
  voiceJobResult: VoiceJobResult | null;
  voiceJobStatus: JobStatus;
  voiceProgress: number;

  // ── Render job ──────────────────────────────────────────────────────────
  renderJobId: string | null;
  renderJobResult: RenderJobResult | null;
  renderJobStatus: JobStatus;
  renderProgress: number;

  // ── Image job ───────────────────────────────────────────────────────────
  imageStatus: JobStatus;
  imageCount: number;

  // ── Regeneration ─────────────────────────────────────────────────────────
  regenerateAttempts: Record<number, number>;

  // ── UI ─────────────────────────────────────────────────────────────────
  busyAll: boolean;
  errorMsg: string | null;
  skillError: string | null;
  toast: string | null;
  playbackResetKey: number;
  hasHydrated: boolean;
}

interface PipelineSessionActions {
  // ── Config ───────────────────────────────────────────────────────────────
  setApiBase: (next: Updater<string>) => void;
  setApiKey: (next: Updater<string>) => void;
  setPreviewRatio: (next: Updater<PreviewRatio>) => void;
  setTitleKeywords: (next: Updater<string>) => void;
  setAppliedTitleKeywords: (next: Updater<string>) => void;

  // ── Project ──────────────────────────────────────────────────────────────
  setProjectState: (next: Updater<ProjectState>) => void;
  setShotsState: (next: Updater<Shot[]>) => void;
  setPipelineState: (next: Updater<PipelinePayload>) => void;

  // ── Navigation ──────────────────────────────────────────────────────────
  setActiveStep: (next: Updater<WorkflowStepId>) => void;

  // ── Step flags (individual — kept for orchestrator's functional updater pattern) ──
  setStepLoading: (next: Updater<Record<number, boolean>>) => void;
  setStepDone: (next: Updater<Record<number, boolean>>) => void;
  setStepConfirmed: (next: Updater<Record<number, boolean>>) => void;
  setStepSkillDirty: (next: Updater<Record<number, boolean>>) => void;
  setRegenerateAttempts: (next: Updater<Record<number, number>>) => void;

  // ── Step flags (bulk) ─────────────────────────────────────────────────
  /** Bulk-update step flags. Partial update — only provided keys are merged. */
  patchStepFlags: (flags: {
    loading?: Record<number, boolean>;
    done?: Record<number, boolean>;
    confirmed?: Record<number, boolean>;
    dirty?: Record<number, boolean>;
  }) => void;

  // ── Selection ────────────────────────────────────────────────────────────
  setSelectedAnalysis: (next: Updater<PipelineAnalysisState | null>) => void;
  setSelectedTitleId: (next: Updater<string | null>) => void;
  setSelectedShotId: (next: Updater<string>) => void;

  // ── Voice job ───────────────────────────────────────────────────────────
  setVoiceJobId: (next: Updater<string | null>) => void;
  setVoiceJobResult: (next: Updater<VoiceJobResult | null>) => void;
  setVoiceJobStatus: (next: Updater<JobStatus>) => void;
  setVoiceProgress: (next: Updater<number>) => void;

  // ── Render job ──────────────────────────────────────────────────────────
  setRenderJobId: (next: Updater<string | null>) => void;
  setRenderJobResult: (next: Updater<RenderJobResult | null>) => void;
  setRenderJobStatus: (next: Updater<JobStatus>) => void;
  setRenderProgress: (next: Updater<number>) => void;

  // ── Image job ───────────────────────────────────────────────────────────
  setImageStatus: (next: Updater<JobStatus>) => void;
  setImageCount: (next: Updater<number>) => void;

  // ── UI ─────────────────────────────────────────────────────────────────
  setBusyAll: (next: Updater<boolean>) => void;
  setErrorMsg: (next: Updater<string | null>) => void;
  setSkillError: (next: Updater<string | null>) => void;
  setToast: (next: Updater<string | null>) => void;
  setPlaybackResetKey: (next: Updater<number>) => void;
  setHasHydrated: (next: Updater<boolean>) => void;

  // ── Persistence ─────────────────────────────────────────────────────────
  hydrateFromSnapshot: (snapshot: PersistedPipelineSnapshot) => void;
}

export type PipelineSessionStore = PipelineSessionState & PipelineSessionActions;

function createInitialPipelineSessionState(): PipelineSessionState {
  return {
    apiBase: API_BASE_DEFAULT,
    apiKey: API_KEY_DEFAULT,
    previewRatio: 'landscape',
    titleKeywords: 'OpenClaw 小龙虾为什么这么火？',
    appliedTitleKeywords: '',
    projectState: createInitialProjectState(),
    shotsState: DEFAULT_SHOTS,
    pipelineState: {},
    activeStep: 1,
    stepLoading: {},
    stepDone: {},
    stepConfirmed: {},
    stepSkillDirty: {},
    selectedAnalysis: null,
    selectedTitleId: null,
    selectedShotId: DEFAULT_SHOTS[0]?.id || '',
    voiceJobId: null,
    voiceJobResult: null,
    voiceJobStatus: 'idle',
    voiceProgress: 0,
    renderJobId: null,
    renderJobResult: null,
    renderJobStatus: 'idle',
    renderProgress: 0,
    imageStatus: 'idle',
    imageCount: 0,
    regenerateAttempts: {},
    busyAll: false,
    errorMsg: null,
    skillError: null,
    toast: null,
    playbackResetKey: 0,
    hasHydrated: false,
  };
}

// ── Per-key setter factory ────────────────────────────────────────────────────

function makeSetter<K extends keyof PipelineSessionState>(key: K) {
  return (set: (partial: (state: PipelineSessionStore) => Partial<PipelineSessionStore>) => void) =>
    (next: Updater<PipelineSessionState[K]>) => {
      set((state) => ({
        [key]: resolveUpdater(next, state[key] as PipelineSessionState[K]),
      }));
    };
}

// ── Store ───────────────────────────────────────────────────────────────────

export const usePipelineSessionStore = create<PipelineSessionStore>((set) => {
  const initial = createInitialPipelineSessionState();

  return {
    // ── Initial state ──────────────────────────────────────────────────────
    ...initial,

    // ── Config ────────────────────────────────────────────────────────────
    setApiBase: makeSetter('apiBase')(set),
    setApiKey: makeSetter('apiKey')(set),
    setPreviewRatio: makeSetter('previewRatio')(set),
    setTitleKeywords: makeSetter('titleKeywords')(set),
    setAppliedTitleKeywords: makeSetter('appliedTitleKeywords')(set),

    // ── Project ───────────────────────────────────────────────────────────
    setProjectState: makeSetter('projectState')(set),
    setShotsState: makeSetter('shotsState')(set),
    setPipelineState: makeSetter('pipelineState')(set),

    // ── Navigation ────────────────────────────────────────────────────────
    setActiveStep: makeSetter('activeStep')(set),

    // ── Step flags (individual — functional updaters used by orchestrator) ──
    setStepLoading: makeSetter('stepLoading')(set),
    setStepDone: makeSetter('stepDone')(set),
    setStepConfirmed: makeSetter('stepConfirmed')(set),
    setStepSkillDirty: makeSetter('stepSkillDirty')(set),
    setRegenerateAttempts: makeSetter('regenerateAttempts')(set),

    // ── Step flags (bulk) ─────────────────────────────────────────────────
    patchStepFlags: (flags) => {
      set((state) => ({
        stepLoading: flags.loading !== undefined ? flags.loading : state.stepLoading,
        stepDone: flags.done !== undefined ? flags.done : state.stepDone,
        stepConfirmed: flags.confirmed !== undefined ? flags.confirmed : state.stepConfirmed,
        stepSkillDirty: flags.dirty !== undefined ? flags.dirty : state.stepSkillDirty,
      }));
    },

    // ── Selection ─────────────────────────────────────────────────────────
    setSelectedAnalysis: makeSetter('selectedAnalysis')(set),
    setSelectedTitleId: makeSetter('selectedTitleId')(set),
    setSelectedShotId: makeSetter('selectedShotId')(set),

    // ── Voice job ─────────────────────────────────────────────────────────
    setVoiceJobId: makeSetter('voiceJobId')(set),
    setVoiceJobResult: makeSetter('voiceJobResult')(set),
    setVoiceJobStatus: makeSetter('voiceJobStatus')(set),
    setVoiceProgress: makeSetter('voiceProgress')(set),

    // ── Render job ─────────────────────────────────────────────────────────
    setRenderJobId: makeSetter('renderJobId')(set),
    setRenderJobResult: makeSetter('renderJobResult')(set),
    setRenderJobStatus: makeSetter('renderJobStatus')(set),
    setRenderProgress: makeSetter('renderProgress')(set),

    // ── Image job ─────────────────────────────────────────────────────────
    setImageStatus: makeSetter('imageStatus')(set),
    setImageCount: makeSetter('imageCount')(set),

    // ── UI ─────────────────────────────────────────────────────────────────
    setBusyAll: makeSetter('busyAll')(set),
    setErrorMsg: makeSetter('errorMsg')(set),
    setSkillError: makeSetter('skillError')(set),
    setToast: makeSetter('toast')(set),
    setPlaybackResetKey: makeSetter('playbackResetKey')(set),
    setHasHydrated: makeSetter('hasHydrated')(set),

    // ── Persistence ────────────────────────────────────────────────────────
    hydrateFromSnapshot: (snapshot) => {
      const migratedStep7Done = Boolean(
        snapshot.stepDone?.[7]
        || snapshot.pipelineState?.projectBuild
        || snapshot.pipelineState?.render
        || snapshot.renderJobId
        || snapshot.renderJobResult,
      );

      const migratedStepDone = Object.fromEntries([
        ...Object.entries(snapshot.stepDone ?? {}),
        ...(migratedStep7Done ? [['7', true as boolean]] : []),
      ].map(([k, v]) => [Number(k), Boolean(v)]));

      const migratedStepConfirmed = Object.fromEntries([
        ...Object.entries(snapshot.stepConfirmed ?? {}),
        ...(migratedStep7Done
          ? [['7', Boolean(snapshot.stepConfirmed?.[7] ?? snapshot.stepConfirmed?.[8] ?? snapshot.stepDone?.[8])]]
          : []),
      ].map(([k, v]) => [Number(k), Boolean(v)]));

      const migratedPipelineState: PipelinePayload = {
        ...(snapshot.pipelineState ?? {}),
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
        apiKey: snapshot.apiKey || API_KEY_DEFAULT,
        titleKeywords: snapshot.titleKeywords,
        projectState: snapshot.projectState,
        shotsState: snapshot.shotsState,
        pipelineState: migratedPipelineState,
        activeStep: snapshot.activeStep,
        stepDone: migratedStepDone,
        stepConfirmed: migratedStepConfirmed,
        selectedAnalysis: snapshot.selectedAnalysis ?? null,
        selectedTitleId: snapshot.selectedTitleId ?? null,
        previewRatio: snapshot.previewRatio,
        voiceJobId: snapshot.voiceJobId ?? null,
        voiceJobResult: snapshot.voiceJobResult ?? null,
        renderJobId: snapshot.renderJobId ?? null,
        renderJobResult: snapshot.renderJobResult ?? null,
        voiceJobStatus: snapshot.voiceJobStatus ?? 'idle',
        renderJobStatus: snapshot.renderJobStatus ?? 'idle',
        voiceProgress: snapshot.voiceProgress ?? 0,
        renderProgress: snapshot.renderProgress ?? 0,
        imageStatus: snapshot.imageStatus ?? 'idle',
        imageCount: snapshot.imageCount ?? 0,
        stepSkillDirty: snapshot.stepSkillDirty ?? {},
        hasHydrated: true,
      }));
    },
  };
});
