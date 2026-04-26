import {useCallback, useEffect, useMemo} from 'react';
import {DEFAULT_SHOTS, STEP_LIST, getStepOutputPreview} from '../workflow/steps';
import type {AudioSegment, JobStatus, ProjectState, RenderJobResult, Shot, WorkflowStepId} from '../workflow/types';
import {callJson} from './pipelineApi';
import {startPollingLoop, waitForJob} from './jobPolling';
import {readPersistedPipelineSnapshot, writePersistedPipelineSnapshot} from './pipelinePersistence';
import {
  backfillShotDurations,
  buildRenderPlan,
  buildRenderScript,
  buildStepPayloadSnapshot,
  getAppliedTitleKeywords,
  hasCopyContent,
  getSelectedTitle,
  getStatusClass,
  getStatusLabel,
  getStepAccess,
  getTotalFrames,
  getValidTitleOptions,
  getVoiceAssetPreviews,
  hasAnalysisContent,
  hasPendingTitleKeywords as getHasPendingTitleKeywords,
  normalizeShots,
  resolveManifestUrl,
  resolveRenderResult,
} from './pipelineSelectors';
import {usePipelineSessionStore} from './pipelineStore';
import type {
  PipelinePayload,
  SkillDrivenStepId,
  SkillSpec,
  StepEvaluation,
  StepSkillConfig,
} from './pipelineTypes';
import {normalizeStepSkill} from '../workflow/stepSkillCatalog';
import {useSkillCatalogLoader, useSkillSpecLoader} from './useSkillResolver';
import {useVoiceJobPolling, useRenderJobPolling} from './useJobPolling';

const SKILL_INVALIDATION_MAP: Record<SkillDrivenStepId, SkillDrivenStepId[]> = {
  1: [1, 2, 3, 4, 5],
  2: [2, 3, 4, 5],
  3: [3, 4, 5],
  4: [4, 5],
  5: [5],
};

const SKILL_OVERRIDE_FIELDS: Record<SkillDrivenStepId, Array<keyof StepSkillConfig>> = {
  1: ['goal', 'style', 'emphasis', 'avoid', 'notes'],
  2: ['goal', 'style', 'emphasis', 'avoid', 'notes'],
  3: ['goal', 'style', 'emphasis', 'avoid', 'notes', 'targetDurationSeconds', 'antiAiLevel', 'spokenPersona'],
  4: ['goal', 'style', 'emphasis', 'avoid', 'notes'],
  5: ['goal', 'style', 'emphasis', 'avoid', 'notes'],
};

function normalizeImageUrls(
  apiBase: string,
  images: Array<{shotId?: string; path?: string; url?: string}> | undefined,
  versionKey?: string | number | null,
) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item) => item?.shotId && (item.url || item.path))
    .map((item) => {
      const rawUrl = item.url || item.path || '';
      const baseUrl = rawUrl.startsWith('http') ? rawUrl : `${apiBase}${rawUrl}`;
      const suffix =
        versionKey !== undefined && versionKey !== null && versionKey !== ''
          ? `${baseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(versionKey))}`
          : '';
      return {shotId: item.shotId || '', url: `${baseUrl}${suffix}`};
    });
}

interface WorkflowGenerateResponse {
  stepId: WorkflowStepId;
  source?: string;
  model?: string;
  generatedAt?: string;
  payload: PipelinePayload;
  resolvedSkill?: SkillSpec;
  evaluation?: StepEvaluation;
}

interface WorkflowJobResponse {
  jobId?: string;
  status?: JobStatus | string;
  progress?: number;
  progressMsg?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  result?: WorkflowGenerateResponse | null;
}

interface ImageJobResponse {
  jobId?: string;
  status?: JobStatus | string;
  progress?: number;
  progressMsg?: string | null;
  total?: number;
  completed?: number;
  currentShotId?: string | null;
  currentShotTitle?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  byShotStatus?: Record<string, string>;
  images?: Array<{shotId?: string; path?: string; url?: string}>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePipelineOrchestrator() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const {
    apiBase,
    apiKey,
    titleKeywords,
    projectState,
    shotsState,
    pipelineState,
    activeStep,
    stepLoading,
    stepDone,
    voiceJobId,
    voiceJobResult,
    renderJobId,
    renderJobResult,
    voiceJobStatus,
    renderJobStatus,
    voiceProgress,
    renderProgress,
    imageStatus,
    imageCount,
    stepSkillDirty,
    regenerateAttempts,
    previewRatio,
    busyAll,
    errorMsg,
    toast,
    selectedAnalysis,
    selectedTitleId,
    stepConfirmed,
    selectedShotId,
    playbackResetKey,
    hasHydrated,
    setApiBase,
    setApiKey,
    setTitleKeywords,
    setProjectState,
    setShotsState,
    setPipelineState,
    setActiveStep,
    setStepLoading,
    setStepDone,
    setVoiceJobId,
    setVoiceJobResult,
    setRenderJobId,
    setRenderJobResult,
    setVoiceJobStatus,
    setRenderJobStatus,
    setVoiceProgress,
    setRenderProgress,
    setImageStatus,
    setImageCount,
    setStepSkillDirty,
    setRegenerateAttempts,
    setPreviewRatio,
    setBusyAll,
    setErrorMsg,
    setToast,
    setSelectedAnalysis,
    setSelectedTitleId,
    setStepConfirmed,
    setSelectedShotId,
    setPlaybackResetKey,
    setHasHydrated,
    hydrateFromSnapshot,
  } = usePipelineSessionStore();

  // ── Sub-hooks ─────────────────────────────────────────────────────────────
  useSkillCatalogLoader();
  useSkillSpecLoader(activeStep);
  useVoiceJobPolling(voiceJobId);
  useRenderJobPolling(renderJobId);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    const snapshot = readPersistedPipelineSnapshot();
    if (!snapshot) { setHasHydrated(true); return; }
    hydrateFromSnapshot(snapshot);
  }, [hydrateFromSnapshot, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const payload = {
      savedAt: Date.now(),
      apiBase,
      apiKey,
      titleKeywords,
      projectState,
      shotsState,
      pipelineState,
      activeStep,
      stepDone,
      stepConfirmed,
      selectedAnalysis,
      selectedTitleId,
      previewRatio,
      voiceJobId,
      voiceJobResult,
      renderJobId,
      renderJobResult,
      voiceJobStatus,
      renderJobStatus,
      voiceProgress,
      renderProgress,
      imageStatus,
      imageCount,
      stepSkillDirty,
    };
    writePersistedPipelineSnapshot(payload);
  }, [
    hasHydrated,
    apiBase,
    apiKey,
    titleKeywords,
    projectState,
    shotsState,
    pipelineState,
    activeStep,
    stepDone,
    stepConfirmed,
    selectedAnalysis,
    selectedTitleId,
    previewRatio,
    voiceJobId,
    voiceJobResult,
    renderJobId,
    renderJobResult,
    voiceJobStatus,
    renderJobStatus,
    voiceProgress,
    renderProgress,
    imageStatus,
    imageCount,
    stepSkillDirty,
  ]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  // ── Derived selectors ─────────────────────────────────────────────────────
  const scriptForRender = useMemo(
    () => buildRenderScript(pipelineState, titleKeywords),
    [pipelineState, titleKeywords],
  );
  const totalFrames = useMemo(
    () => getTotalFrames(shotsState, projectState.fps),
    [projectState.fps, shotsState],
  );
  const renderPlan = useMemo(
    () => buildRenderPlan(shotsState, pipelineState.prompts, pipelineState.images, voiceJobResult?.queue ?? [], projectState.fps),
    [shotsState, pipelineState.prompts, pipelineState.images, voiceJobResult?.queue, projectState.fps],
  );
  const reusableVoiceSegments = useMemo<AudioSegment[]>(
    () => buildRenderPlan(shotsState, null, null, voiceJobResult?.queue ?? [], projectState.fps).audioSegments,
    [shotsState, voiceJobResult?.queue, projectState.fps],
  );
  const voiceAssetPreviews = useMemo(
    () => getVoiceAssetPreviews(voiceJobResult?.queue ?? [], shotsState, apiBase),
    [shotsState, voiceJobResult?.queue, apiBase],
  );
  const voiceManifestUrl = useMemo(
    () => resolveManifestUrl(apiBase, voiceJobResult?.manifestFile),
    [apiBase, voiceJobResult?.manifestFile],
  );
  const resolvedRenderResult = useMemo<RenderJobResult | null>(
    () => resolveRenderResult(apiBase, renderJobResult),
    [apiBase, renderJobResult],
  );

  const showToast = useCallback(
    (msg: string) => { setToast(msg); },
    [setToast],
  );

  // ── Internal helpers ───────────────────────────────────────────────────────

  const updateWithStepPayload = useCallback((_stepId: WorkflowStepId, response: WorkflowGenerateResponse) => {
    const payload = response?.payload;
    if (!payload || typeof payload !== 'object') return;

    const nextProjectName = typeof payload.projectName === 'string' ? payload.projectName : '';
    if (nextProjectName) {
      setProjectState((prev) => ({...prev, name: nextProjectName}));
    }

    if (payload.shots && Array.isArray(payload.shots)) {
      setShotsState(normalizeShots(payload.shots, shotsState));
    }

    setPipelineState((prev) => {
      const next = {...prev};
      const update = (
        key: keyof PipelinePayload,
        value: unknown,
      ) => {
        if (value !== undefined) (next as Record<string, unknown>)[key] = value;
      };
      update('stepSkills', payload.stepSkills ?? prev.stepSkills);
      update('stepResolvedSkills', payload.stepResolvedSkills ?? prev.stepResolvedSkills);
      update('stepEvaluations', payload.stepEvaluations ?? prev.stepEvaluations);
      update('topicResearch', payload.topicResearch);
      update('analysis', payload.analysis ?? prev.analysis);
      update('titles', payload.titles ?? prev.titles);
      update('copy', payload.copy ?? prev.copy);
      update('prompts', payload.prompts ?? prev.prompts);
      update('voice', payload.voice ?? prev.voice);
      update('projectBuild', payload.projectBuild ?? prev.projectBuild);
      update('render', payload.render ?? prev.render);
      update('selectedAnalysis', payload.selectedAnalysis ?? prev.selectedAnalysis);
      update('shots', payload.shots);
      return next;
    });
  }, [shotsState, setProjectState, setShotsState, setPipelineState]);

  const invalidateFromStep = useCallback((stepId: SkillDrivenStepId) => {
    const affectedSteps = SKILL_INVALIDATION_MAP[stepId];
    setStepSkillDirty((prev) =>
      affectedSteps.reduce<Record<number, boolean>>((acc, id) => ({...acc, [id]: true}), {...prev}),
    );
    setStepConfirmed((prev) =>
      affectedSteps.reduce<Record<number, boolean>>((acc, id) => ({...acc, [id]: false}), {...prev}),
    );
  }, [setStepConfirmed, setStepSkillDirty]);

  const updateStepSkill = useCallback((stepId: SkillDrivenStepId, patch: Partial<StepSkillConfig>) => {
    setPipelineState((prev) => ({
      ...prev,
      stepSkills: {
        ...(prev.stepSkills || {}),
        [stepId]: normalizeStepSkill(stepId, {
          ...(prev.stepSkills?.[stepId] || {}),
          ...patch,
        }),
      },
    }));
    invalidateFromStep(stepId);
  }, [invalidateFromStep, setPipelineState]);

  // ── Step generation ───────────────────────────────────────────────────────

  const generateStep = useCallback(async (
    stepId: WorkflowStepId,
    overrides?: {
      titleKeywords?: string;
      pipelineState?: PipelinePayload;
      projectState?: ProjectState;
      shotsState?: Shot[];
      trigger?: 'manual' | 'auto';
    },
  ) => {
    setErrorMsg(null);
    setStepLoading((prev) => ({...prev, [stepId]: true}));

    try {
      const liveState = usePipelineSessionStore.getState();
      const nextTitleKeywords = String(overrides?.titleKeywords ?? liveState.titleKeywords ?? titleKeywords).trim() || titleKeywords;
      const pipelineForRequest = overrides?.pipelineState ?? liveState.pipelineState ?? pipelineState;
      const projectForRequest = overrides?.projectState ?? liveState.projectState ?? projectState;
      const shotsForRequest = overrides?.shotsState ?? liveState.shotsState ?? shotsState;
      const trigger = overrides?.trigger || 'auto';
      const previousPayload = buildStepPayloadSnapshot(stepId, pipelineForRequest, shotsForRequest);
      const shouldForceVariation = trigger === 'manual' && Boolean(stepDone[stepId] && previousPayload);
      const nextAttempt = shouldForceVariation ? (regenerateAttempts[stepId] || 0) + 1 : (regenerateAttempts[stepId] || 0);

      const queuedJob = await callJson(`${apiBase}/api/workflow/generate`, {
        method: 'POST',
        body: JSON.stringify({
          stepId,
          generationMeta: {
            mode: shouldForceVariation ? 'regenerate' : 'generate',
            trigger,
            attempt: nextAttempt,
            previousPayload: shouldForceVariation ? previousPayload : null,
          },
          projectState: {
            ...projectForRequest,
            name: stepId === 1
              ? nextTitleKeywords
              : projectForRequest.name === '未命名项目'
                ? nextTitleKeywords
                : projectForRequest.name,
          },
          shotsState: shotsForRequest,
          pipelineState: {
            ...pipelineForRequest,
            inputTopic: nextTitleKeywords,
            inputTitleKeywords: nextTitleKeywords,
            selectedAnalysis: pipelineForRequest.selectedAnalysis ?? selectedAnalysis,
            selectedTitleId: pipelineForRequest.selectedTitleId ?? selectedTitleId,
          },
        }),
      }, apiKey) as WorkflowJobResponse;

      if (!queuedJob.jobId) {
        throw new Error('工作流任务提交失败，缺少 jobId');
      }

      const finalJob = await waitForJob<WorkflowJobResponse>({
        load: async () =>
          await callJson(`${apiBase}/api/workflow/${queuedJob.jobId}`, {method: 'GET'}, apiKey) as WorkflowJobResponse,
        isDone: (job) => job.status === 'done' || job.status === 'error',
        getError: (job) => job.status === 'error' ? job.error || '工作流生成失败' : null,
        timeoutMs: stepId <= 3 ? 240000 : 120000,
      });

      const data = finalJob.result;
      if (!data) throw new Error('工作流任务完成但未返回结果');

      if (shouldForceVariation) {
        setRegenerateAttempts((prev) => ({...prev, [stepId]: nextAttempt}));
      }

      updateWithStepPayload(stepId, data);
      setStepDone((prev) => ({...prev, [stepId]: true}));
      setStepConfirmed((prev) => ({...prev, [stepId]: false}));
      if (stepId >= 1 && stepId <= 5) {
        setStepSkillDirty((prev) => ({...prev, [stepId]: false}));
      }

      if (stepId === 1) setSelectedAnalysis(null);

      if (stepId === 2 && data?.payload?.titles?.options?.length) {
        const nextSelectedId =
          data.payload.titles.selectedId
          || data.payload.titles.options[0]?.id
          || data.payload.titles.options[0]?.title
          || null;
        setSelectedTitleId(nextSelectedId);
      }

      if (stepId === 1 && Array.isArray(data.payload.topicResearch?.results) && data.payload.topicResearch.results.length > 0) {
        showToast(shouldForceVariation
          ? `Step 1 已重新生成，并重新检索了 ${data.payload.topicResearch.results.length} 条相关内容`
          : `逻辑分析已更新，并已基于标题搜索 ${data.payload.topicResearch.results.length} 条相关内容`);
      } else {
        showToast(`${STEP_LIST.find((s) => s.id === stepId)?.label || stepId}${shouldForceVariation ? ' 已重新生成' : ' 已更新'}，请确认后继续`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setStepLoading((prev) => ({...prev, [stepId]: false}));
    }
  }, [
    apiBase,
    apiKey,
    pipelineState,
    projectState,
    regenerateAttempts,
    selectedAnalysis,
    selectedTitleId,
    setStepSkillDirty,
    shotsState,
    showToast,
    stepDone,
    titleKeywords,
    updateWithStepPayload,
  ]);

  const appliedTitleKeywords = useMemo(() => getAppliedTitleKeywords(pipelineState), [pipelineState]);
  const titleKeywordsPending = useMemo(
    () => getHasPendingTitleKeywords(titleKeywords, appliedTitleKeywords),
    [appliedTitleKeywords, titleKeywords],
  );

  const applyTitleKeywords = useCallback(async () => {
    const nextTitleKeywords = String(titleKeywords || '').trim();
    if (!nextTitleKeywords) {
      setErrorMsg('请先输入标题关键词');
      return;
    }

    const nextProjectState = {...projectState, name: '未命名项目'};
    const nextPipelineState: PipelinePayload = {
      ...pipelineState,
      inputTopic: nextTitleKeywords,
      inputTitleKeywords: nextTitleKeywords,
      topicResearch: null,
      analysis: null,
      titles: null,
      copy: null,
      prompts: null,
      voice: null,
      projectBuild: null,
      render: null,
      images: null,
      selectedAnalysis: null,
      selectedTitleId: null,
      stepResolvedSkills: null,
      stepEvaluations: null,
    };

    setTitleKeywords(nextTitleKeywords);
    setProjectState(nextProjectState);
    setPipelineState(nextPipelineState);
    setSelectedAnalysis(null);
    setSelectedTitleId(null);
    setShotsState(DEFAULT_SHOTS);
    setSelectedShotId(DEFAULT_SHOTS[0]?.id || '');
    setVoiceJobId(null);
    setVoiceJobResult(null);
    setVoiceJobStatus('idle');
    setVoiceProgress(0);
    setRenderJobId(null);
    setRenderJobResult(null);
    setRenderJobStatus('idle');
    setRenderProgress(0);
    setImageStatus('idle');
    setImageCount(0);
    setStepSkillDirty({});
    setActiveStep(1);
    setRegenerateAttempts({});
    setPlaybackResetKey((k) => k + 1);
    setStepDone({});
    setStepConfirmed({});
    setErrorMsg(null);
    showToast('标题已应用，正在重新生成 Step 1');

    await generateStep(1, {
      titleKeywords: nextTitleKeywords,
      pipelineState: nextPipelineState,
      projectState: nextProjectState,
      shotsState: DEFAULT_SHOTS,
    });
  }, [
    generateStep,
    pipelineState,
    projectState,
    setStepSkillDirty,
    showToast,
    titleKeywords,
  ]);

  // ── Voice ──────────────────────────────────────────────────────────────────

  const submitVoice = useCallback(async (voiceOverride?: Record<string, unknown>) => {
    setErrorMsg(null);
    try {
      const liveState = usePipelineSessionStore.getState();
      const voiceSettings = voiceOverride || liveState.pipelineState.voice || {};
      const latestShots = liveState.shotsState || shotsState;
      const latestProjectId = liveState.projectState.id || projectState.id;
      const data = await callJson(`${apiBase}/api/voice`, {
        method: 'POST',
        body: JSON.stringify({projectId: latestProjectId, shots: latestShots, voiceSettings}),
      }, apiKey);

      setVoiceJobId(data.jobId);
      setVoiceJobResult(null);
      setVoiceJobStatus('pending');
      setVoiceProgress(0);
      showToast('配音任务已提交');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [apiBase, apiKey, projectState.id, shotsState, showToast]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const submitRender = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!pipelineState.projectBuild?.compositionId) {
        throw new Error('请先完成 Step 7 · Remotion 项目生成');
      }
      const render = pipelineState.render || {};
      const hasReusableVoice = reusableVoiceSegments.length > 0;
      const data = await callJson(`${apiBase}/api/render`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectState.id,
          script: scriptForRender,
          template: render.template || 'caption',
          quality: render.quality || 'high',
          voice: pipelineState.voice?.engine || 'qwen-tts',
          shots: renderPlan.shots,
          audioSegments: hasReusableVoice ? reusableVoiceSegments : null,
          durationInFrames: renderPlan.totalFrames,
          renderFps: Number(render.fps) || projectState.fps,
          renderWidth: Number(render.width) || projectState.width,
          renderHeight: Number(render.height) || projectState.height,
          subtitleText: scriptForRender,
        }),
      }, apiKey);

      setRenderJobId(data.jobId);
      setRenderJobResult(null);
      setRenderJobStatus('pending');
      setRenderProgress(0);
      showToast(hasReusableVoice ? '渲染任务已提交，将直接复用已完成配音' : '渲染任务已提交');
      return data;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [
    apiBase,
    apiKey,
    pipelineState.projectBuild?.compositionId,
    pipelineState.render,
    pipelineState.voice?.engine,
    projectState.fps,
    projectState.height,
    projectState.id,
    projectState.width,
    renderPlan.shots,
    renderPlan.totalFrames,
    reusableVoiceSegments,
    scriptForRender,
    showToast,
  ]);

  // ── Images ─────────────────────────────────────────────────────────────────

  const generateStoryboardImages = useCallback(async () => {
    setErrorMsg(null);
    setImageStatus('pending');
    try {
      const prompts = pipelineState.prompts;
      const byShotId = prompts?.byShotId;
      const shotIds = byShotId ? Object.keys(byShotId) : [];
      if (!shotIds.length) {
        setImageStatus('error');
        throw new Error('请先生成 Step 5 的视觉提示词（需要先有场景编排）');
      }
      const missingShots = shotIds.filter((id) => !byShotId?.[id]?.prompt?.trim());
      if (missingShots.length > 0) {
        setImageStatus('error');
        throw new Error(`以下场景缺少 prompt 内容：${missingShots.join(', ')}。请先确认 Step 5 内容完整。`);
      }

      const data = await callJson(`${apiBase}/api/images/generate`, {
        method: 'POST',
        body: JSON.stringify({projectId: projectState.id, prompts, shots: shotsState}),
      }, apiKey) as ImageJobResponse;

      const initialByShotStatus = shotIds.reduce<Record<string, string>>((acc, sid) => {
        acc[sid] = 'pending';
        return acc;
      }, {});
      setPipelineState((prev) => ({
        ...prev,
        images: {
          ...(prev.images || {}),
          jobId: data.jobId || null,
          status: (data.status as JobStatus) || 'pending',
          progress: Number(data.progress) || 0,
          progressMsg: data.progressMsg || '等待生成分镜图',
          total: Number(data.total) || shotIds.length,
          completed: 0,
          currentShotId: null,
          currentShotTitle: null,
          byShotStatus: initialByShotStatus,
          error: null,
        },
      }));
      setImageStatus((data.status as JobStatus) || 'pending');
      showToast('分镜图任务已提交');
      return data;
    } catch (err) {
      setImageStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [apiBase, apiKey, pipelineState.prompts, projectState.id, setImageCount, shotsState, showToast]);

  // Auto-generate images when entering step 5
  useEffect(() => {
    if (activeStep !== 5) return;
    const byShotId = pipelineState.prompts?.byShotId;
    const imageUrls = pipelineState.images?.urls || [];
    const imageJobId = pipelineState.images?.jobId;
    const imageJobStatus = String(pipelineState.images?.status || '');
    if (!byShotId) return;
    if (imageUrls.length > 0 || imageJobStatus === 'done') return;
    if (imageJobId && (imageJobStatus === 'pending' || imageJobStatus === 'running')) return;
    const shotIds = Object.keys(byShotId);
    if (shotIds.length === 0) return;
    void generateStoryboardImages();
  }, [activeStep, generateStoryboardImages, pipelineState.images?.jobId, pipelineState.images?.status, pipelineState.images?.urls?.length, pipelineState.prompts]);

  // Image polling — inline because it also updates pipelineState.images (complex shape)
  useEffect(() => {
    const imageJobId = pipelineState.images?.jobId;
    const currentStatus = String(pipelineState.images?.status || imageStatus || '');
    if (!imageJobId || !['pending', 'running'].includes(currentStatus)) return;

    const cleanup = startPollingLoop<ImageJobResponse>({
      load: async () =>
        await callJson(`${apiBase}/api/images/${imageJobId}`, {method: 'GET'}, apiKey) as ImageJobResponse,
      onData: (job) => {
        const versionKey = job.completedAt || job.progress || job.startedAt || '';
        const urls = normalizeImageUrls(apiBase, job.images, versionKey);

        setPipelineState((prev) => ({
          ...prev,
          images: {
            ...(prev.images || {}),
            jobId: imageJobId,
            status: (job.status as JobStatus) || 'pending',
            progress: Number(job.progress) || 0,
            progressMsg: job.progressMsg || null,
            total: Number(job.total) || prev.images?.total || 0,
            completed: Number(job.completed) || 0,
            currentShotId: job.currentShotId || null,
            currentShotTitle: job.currentShotTitle || null,
            byShotStatus: job.byShotStatus || prev.images?.byShotStatus || {},
            createdAt: job.createdAt || prev.images?.createdAt || null,
            startedAt: job.startedAt || prev.images?.startedAt || null,
            completedAt: job.completedAt || prev.images?.completedAt || null,
            error: job.error || null,
            urls: urls.length > 0 ? urls : (prev.images?.urls || []),
          },
        }));

        const resolvedCount = urls.length || (usePipelineSessionStore.getState().pipelineState.images?.urls || []).length;
        setImageStatus((job.status as JobStatus) || 'pending');
        setImageCount(resolvedCount);

        if (job.status === 'done') {
          showToast(`分镜图已生成 ${Number(job.completed) || resolvedCount} 张`);
        }
        if (job.status === 'error') {
          setErrorMsg(job.error || '分镜图生成失败');
        }
      },
      shouldStop: (job) => job.status === 'done' || job.status === 'error',
      onError: (err, failureCount) => {
        const message = err.message || '分镜图状态轮询失败';
        if (failureCount >= 3) {
          setImageStatus('error');
          setPipelineState((prev) => ({
            ...prev,
            images: {...(prev.images || {}), status: 'error', error: message, progressMsg: '分镜图状态同步失败'},
          }));
          setErrorMsg(message);
          return false;
        }
        return true;
      },
      intervalMs: 1200,
    });
    return cleanup;
  }, [apiBase, apiKey, imageStatus, pipelineState.images?.jobId, pipelineState.images?.status, setPipelineState, showToast]);

  // ── Run all ────────────────────────────────────────────────────────────────

  const runAll = useCallback(async () => {
    setBusyAll(true);
    setErrorMsg(null);
    try {
      await generateStep(1);
      await generateStoryboardImages();
      await submitVoice();
      showToast('流水线已全部提交');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAll(false);
    }
  }, [generateStep, generateStoryboardImages, setBusyAll, setErrorMsg, showToast, submitVoice]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const statusLabel = getStatusLabel;
  const statusClass = getStatusClass;

  const getStepPreview = useCallback((stepId: WorkflowStepId) =>
    getStepOutputPreview(stepId, pipelineState, shotsState),
  [pipelineState, shotsState]);

  const activeStepIndex = STEP_LIST.findIndex((s) => s.id === activeStep);
  const nextStepId = activeStepIndex >= 0 && activeStepIndex < STEP_LIST.length - 1
    ? STEP_LIST[activeStepIndex + 1].id
    : null;

  const canEnterStep = useCallback((targetStepId: WorkflowStepId) =>
    getStepAccess(targetStepId, stepConfirmed),
  [stepConfirmed]);

  const handleStepSelect = useCallback(async (targetStepId: WorkflowStepId) => {
    const {ok, blockedBy} = canEnterStep(targetStepId);
    if (!ok && blockedBy) {
      showToast(`请先确认 Step ${blockedBy.id} · ${blockedBy.label}`);
      return;
    }
    setActiveStep(targetStepId);
  }, [canEnterStep, setActiveStep, showToast]);

  // ── Update callbacks ────────────────────────────────────────────────────────

  const updateCopyState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({...prev, copy: updated.copy ?? prev.copy}));
    setStepDone((prev) => ({...prev, 3: hasCopyContent(updated.copy) ?? prev[3]}));
    setStepConfirmed((prev) => ({...prev, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [setPipelineState, setStepDone, setStepConfirmed]);

  const updateAnalysisState = useCallback((updated: PipelinePayload) => {
    const nextAnalysisReady = hasAnalysisContent(updated.analysis ?? null);
    setPipelineState((prev) => ({...prev, analysis: updated.analysis ?? prev.analysis}));
    setStepDone((prev) => ({...prev, 1: nextAnalysisReady}));
    setStepConfirmed((prev) => ({...prev, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [setPipelineState, setStepDone, setStepConfirmed]);

  const updateTitlesState = useCallback((updated: PipelinePayload) => {
    const normalizedOptions = getValidTitleOptions(updated.titles?.options);
    setPipelineState((prev) => ({...prev, titles: updated.titles ?? prev.titles}));
    setStepDone((prev) => ({...prev, 2: normalizedOptions.length > 0}));
    setStepConfirmed((prev) => ({...prev, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [setPipelineState, setStepDone, setStepConfirmed]);

  const updateShotsState = useCallback((updated: Array<Partial<Shot>>) => {
    const next = normalizeShots(updated, shotsState);
    setShotsState(next);
    setStepDone((prev) => ({...prev, 4: next.length > 0}));
    setStepConfirmed((prev) => ({...prev, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [shotsState, setShotsState, setStepDone, setStepConfirmed]);

  const updatePromptsState = useCallback((updated: PipelinePayload) => {
    const count = updated.prompts?.byShotId ? Object.keys(updated.prompts.byShotId).length : 0;
    setPipelineState((prev) => ({...prev, prompts: updated.prompts ?? prev.prompts}));
    setStepDone((prev) => ({...prev, 5: count > 0}));
    setStepConfirmed((prev) => ({...prev, 5: false, 7: false, 8: false}));
  }, [setPipelineState, setStepDone, setStepConfirmed]);

  const updateVoiceState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({...prev, voice: updated.voice ?? prev.voice}));
  }, [setPipelineState]);

  const backfillVoiceDurations = useCallback(() => {
    const queue = voiceJobResult?.queue ?? [];
    const updated = backfillShotDurations(shotsState, queue);
    setShotsState(updated);
    showToast(`已用 ${queue.length} 条配音片段更新镜头时长`);
  }, [shotsState, voiceJobResult?.queue, setShotsState, showToast]);

  const updateRenderState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({...prev, render: updated.render ?? prev.render}));
  }, [setPipelineState]);

  const handleSelectTitle = useCallback((titleId: string) => {
    setSelectedTitleId(titleId);
    setStepDone((prev) => ({...prev, 2: true}));
  }, [setSelectedTitleId, setStepDone]);

  const confirmCurrentStep = useCallback(() => {
    setStepConfirmed((prev) => ({...prev, [activeStep]: true}));
    showToast(`Step ${activeStep} 已确认`);
  }, [activeStep, setStepConfirmed, showToast]);

  const goNextStep = useCallback(async () => {
    if (!nextStepId) return;
    await handleStepSelect(nextStepId);
    const currentStepMeta = STEP_LIST.find((s) => s.id === activeStep);
    if (!stepConfirmed[activeStep]) {
      showToast(`请先确认当前步骤 ${currentStepMeta?.label || activeStep}`);
      return;
    }
    await generateStep(nextStepId);
  }, [activeStep, generateStep, handleStepSelect, nextStepId, setStepConfirmed, showToast, stepConfirmed]);

  // ── Skill / eval derived values ────────────────────────────────────────────

  const selectedShot = useMemo(
    () => shotsState.find((s) => s.id === selectedShotId) || shotsState[0],
    [selectedShotId, shotsState],
  );
  const activeStepMeta = useMemo(
    () => STEP_LIST.find((s) => s.id === activeStep) || STEP_LIST[0],
    [activeStep],
  );
  const selectedTitle = useMemo(
    () => getSelectedTitle(pipelineState.titles?.options, selectedTitleId),
    [pipelineState.titles?.options, selectedTitleId],
  );
  const renderMediaReady = Boolean(
    renderJobStatus === 'done' && (renderJobResult?.outputUrl || renderJobResult?.outputFile),
  );

  const skillCatalog = pipelineState.skillCatalog ?? [];
  const currentStepSkillId = activeStep <= 5 ? String(activeStep) : null;

  const currentStepResolvedSkill = useMemo((): SkillSpec | null => {
    if (!currentStepSkillId) return null;
    return pipelineState.stepResolvedSkills?.[activeStep] ?? null;
  }, [activeStep, currentStepSkillId, pipelineState.stepResolvedSkills]);

  const currentStepEvaluation = pipelineState.stepEvaluations?.[activeStep] ?? null;

  const currentSkillOverride = useMemo(() => {
    if (!currentStepResolvedSkill?.defaults) return {count: 0};
    const overrideFields = SKILL_OVERRIDE_FIELDS[activeStep as SkillDrivenStepId] ?? [];
    const userConfig = pipelineState.stepSkills?.[activeStep as SkillDrivenStepId];
    if (!userConfig) return {count: 0};
    let count = 0;
    for (const field of overrideFields) {
      if (userConfig[field] !== undefined) count++;
    }
    return {count};
  }, [activeStep, currentStepResolvedSkill?.defaults, pipelineState.stepSkills]);

  // ── Render step derived values ─────────────────────────────────────────────

  const renderStepHasError = renderJobStatus === 'error';
  const renderStepIsRunning = renderJobStatus === 'running' || renderJobStatus === 'pending';
  const renderStepConfigured = Boolean(stepDone[8] || renderJobId || renderMediaReady || renderStepHasError);
  const previewMode = activeStep <= 5 || activeStep === 7 ? 'planning' : 'media';

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    activeStep,
    activeStepMeta,
    apiBase,
    apiKey,
    appliedTitleKeywords,
    applyTitleKeywords,
    backfillVoiceDurations,
    busyAll,
    confirmCurrentStep,
    errorMsg,
    generateStep,
    generateStoryboardImages,
    getStepPreview,
    goNextStep,
    handleSelectTitle,
    handleStepSelect,
    hasPendingTitleKeywords: titleKeywordsPending,
    currentSkillOverride,
    currentStepEvaluation,
    currentStepResolvedSkill,
    currentStepSkillId,
    imageCount,
    imageStatus,
    nextStepId,
    pipelineState,
    playbackResetKey,
    previewMode,
    previewRatio,
    projectState,
    renderJobId,
    renderJobStatus,
    renderMediaReady,
    renderProgress,
    renderResult: resolvedRenderResult,
    renderStepConfigured,
    renderStepHasError,
    renderStepIsRunning,
    runAll,
    selectedShot,
    selectedShotId,
    selectedTitle,
    selectedTitleId,
    setApiBase,
    setApiKey,
    setPreviewRatio,
    setSelectedShotId,
    setTitleKeywords,
    shotsState,
    skillCatalog,
    statusClass,
    statusLabel,
    stepConfirmed,
    stepDone,
    stepSkillDirty,
    stepLoading,
    submitRender,
    submitVoice,
    showToast,
    titleKeywords,
    toast,
    totalFrames,
    updateAnalysisState,
    updateCopyState,
    updatePromptsState,
    updateRenderState,
    updateStepSkill,
    updateShotsState,
    updateTitlesState,
    updateVoiceState,
    voiceAssetPreviews,
    voiceJobId,
    voiceJobStatus,
    voiceManifestUrl,
    voiceProgress,
    voiceResult: voiceJobResult,
  };
}
