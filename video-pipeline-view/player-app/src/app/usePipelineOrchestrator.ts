import {useCallback, useEffect, useMemo} from 'react';
import {DEFAULT_SHOTS, STEP_LIST, getStepOutputPreview} from '../workflow/steps';
import type {AudioSegment, JobStatus, ProjectState, RenderJobResult, Shot, VoiceJobResult, WorkflowStepId} from '../workflow/types';
import {callJson} from './pipelineApi';
import {readPersistedPipelineSnapshot, writePersistedPipelineSnapshot} from './pipelinePersistence';
import {
  backfillShotDurations,
  buildRenderPlan,
  buildRenderScript,
  buildStepPayloadSnapshot,
  getAppliedTitleKeywords,
  hasCopyContent,
  getResolvedSelectedTitleId,
  getSelectedTitle,
  getStatusClass,
  getStatusLabel,
  getStepAccess,
  getTotalFrames,
  getValidTitleOptions,
  getVoiceAssetPreviews,
  hasAnalysisContent,
  hasPendingTitleKeywords as getHasPendingTitleKeywords,
  mergeVoiceUpdateIntoShots,
  normalizeShots,
  resolveManifestUrl,
  resolveRenderResult,
} from './pipelineSelectors';
import {usePipelineSessionStore} from './pipelineStore';
import type {
  PersistedPipelineSnapshot,
  PipelinePayload,
  SkillCatalogEntry,
  SkillDrivenStepId,
  SkillSpec,
  StepEvaluation,
  StepSkillConfig,
} from './pipelineTypes';
import {getSkillIdForStep, sortSkillCatalog} from '../workflow/sidebarCatalog';
import {normalizeStepSkill} from '../workflow/stepSkillCatalog';

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

interface WorkflowGenerateResponse {
  stepId: WorkflowStepId;
  source?: string;
  model?: string;
  generatedAt?: string;
  payload: PipelinePayload;
  resolvedSkill?: SkillSpec;
  evaluation?: StepEvaluation;
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

function normalizeCatalogEntries(entries: unknown) {
  return sortSkillCatalog(Array.isArray(entries) ? entries as SkillCatalogEntry[] : []);
}

function normalizeImageUrls(apiBase: string, images: Array<{shotId?: string; path?: string; url?: string}> | undefined, versionKey?: string | number | null) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .filter((item) => item?.shotId && (item.url || item.path))
    .map((item) => {
      const rawUrl = item.url || item.path || '';
      const baseUrl = rawUrl.startsWith('http') ? rawUrl : `${apiBase}${rawUrl}`;
      const suffix = versionKey !== undefined && versionKey !== null && versionKey !== ''
        ? `${baseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(versionKey))}`
        : '';
      return {
        shotId: item.shotId || '',
        url: `${baseUrl}${suffix}`,
      };
    });
}

export function usePipelineOrchestrator() {
  const {
    apiBase,
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

  useEffect(() => {
    const snapshot = readPersistedPipelineSnapshot();
    if (!snapshot) {
      setHasHydrated(true);
      return;
    }
    hydrateFromSnapshot(snapshot);
  }, [hydrateFromSnapshot, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    const payload: PersistedPipelineSnapshot = {
      savedAt: Date.now(),
      apiBase,
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
    activeStep,
    apiBase,
    hasHydrated,
    imageCount,
    imageStatus,
    pipelineState,
    previewRatio,
    projectState,
    renderJobId,
    renderJobResult,
    renderJobStatus,
    renderProgress,
    selectedAnalysis,
    selectedTitleId,
    shotsState,
    stepSkillDirty,
    stepConfirmed,
    stepDone,
    titleKeywords,
    voiceJobId,
    voiceJobResult,
    voiceJobStatus,
    voiceProgress,
  ]);

  const scriptForRender = useMemo(() => buildRenderScript(pipelineState, titleKeywords), [pipelineState, titleKeywords]);
  const totalFrames = useMemo(() => getTotalFrames(shotsState, projectState.fps), [projectState.fps, shotsState]);
  const renderPlan = useMemo(() => {
    const queue = Array.isArray(voiceJobResult?.queue) ? voiceJobResult.queue : [];
    return buildRenderPlan(shotsState, pipelineState.prompts, pipelineState.images, queue, projectState.fps);
  }, [pipelineState.images, pipelineState.prompts, projectState.fps, shotsState, voiceJobResult?.queue]);
  const reusableVoiceSegments = useMemo<AudioSegment[]>(() => {
    return renderPlan.audioSegments;
  }, [renderPlan.audioSegments]);
  const voiceAssetPreviews = useMemo(() => {
    const queue = Array.isArray(voiceJobResult?.queue) ? voiceJobResult.queue : [];
    return getVoiceAssetPreviews(queue, shotsState, apiBase);
  }, [apiBase, shotsState, voiceJobResult?.queue]);
  const voiceManifestUrl = useMemo(() => resolveManifestUrl(apiBase, voiceJobResult?.manifestFile), [apiBase, voiceJobResult?.manifestFile]);
  const resolvedRenderResult = useMemo<RenderJobResult | null>(() => resolveRenderResult(apiBase, renderJobResult), [apiBase, renderJobResult]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadSkillCatalog = useCallback(async () => {
    try {
      const data = await callJson(`${apiBase}/api/skills/catalog`, {method: 'GET'});
      const catalog = normalizeCatalogEntries(data?.skills);
      setPipelineState((prev) => ({
        ...prev,
        skillCatalog: catalog,
      }));
      return catalog;
    } catch {
      return null;
    }
  }, [apiBase, setPipelineState]);

  const loadSkillSpec = useCallback(async (stepId: WorkflowStepId) => {
    const skillId = getSkillIdForStep(stepId);
    if (!skillId) {
      return null;
    }

    const currentState = usePipelineSessionStore.getState().pipelineState;
    const cached = currentState.skillSpecsById?.[skillId];
    if (cached) {
      return cached;
    }

    try {
      const data = await callJson(`${apiBase}/api/skills/${skillId}`, {method: 'GET'});
      const skillSpec = data as SkillSpec;
      setPipelineState((prev) => ({
        ...prev,
        skillSpecsById: {
          ...(prev.skillSpecsById || {}),
          [skillId]: skillSpec,
        },
      }));
      return skillSpec;
    } catch {
      return null;
    }
  }, [apiBase, setPipelineState]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadSkillCatalog();
  }, [hasHydrated, loadSkillCatalog]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadSkillSpec(activeStep);
  }, [activeStep, hasHydrated, loadSkillSpec]);

  const updateWithStepPayload = useCallback((stepId: WorkflowStepId, response: WorkflowGenerateResponse) => {
    const payload = response?.payload;
    if (!payload || typeof payload !== 'object') return;

    const nextProjectName = typeof payload.projectName === 'string' ? payload.projectName : '';
    if (nextProjectName) {
      setProjectState((prev) => ({...prev, name: nextProjectName}));
    }

    if (payload.shots && Array.isArray(payload.shots)) {
      setShotsState(payload.shots);
      if (payload.shots[0]?.id) {
        setSelectedShotId(payload.shots[0].id);
      }
    }

    setPipelineState((prev) => ({
      ...prev,
      ...payload,
      skillSpecsById: response?.resolvedSkill
        ? {
          ...(prev.skillSpecsById || {}),
          [response.resolvedSkill.skillId]: response.resolvedSkill,
        }
        : prev.skillSpecsById,
      stepResolvedSkills: response?.resolvedSkill
        ? {
          ...(prev.stepResolvedSkills || {}),
          [stepId]: response.resolvedSkill,
        }
        : prev.stepResolvedSkills,
      stepEvaluations: response?.evaluation
        ? {
          ...(prev.stepEvaluations || {}),
          [stepId]: response.evaluation,
        }
        : prev.stepEvaluations,
      analysis: payload.analysis
        ? {
          ...(prev.analysis || {}),
          ...payload.analysis,
        }
        : prev.analysis,
      titles: payload.titles
        ? {
          ...(prev.titles || {}),
          ...payload.titles,
        }
        : prev.titles,
      copy: payload.copy
        ? {
          ...(prev.copy || {}),
          ...payload.copy,
          requirements: payload.copy.requirements ?? prev.copy?.requirements ?? null,
        }
        : prev.copy,
      prompts: payload.prompts
        ? {
          ...(prev.prompts || {}),
          ...payload.prompts,
        }
        : prev.prompts,
      voice: payload.voice
        ? {
          ...(prev.voice || {}),
          ...payload.voice,
        }
        : prev.voice,
      projectBuild: payload.projectBuild
        ? {
          ...(prev.projectBuild || {}),
          ...payload.projectBuild,
        }
        : prev.projectBuild,
      render: payload.render
        ? {
          ...(prev.render || {}),
          ...payload.render,
        }
        : prev.render,
      images: payload.images
        ? {
          ...(prev.images || {}),
          ...payload.images,
        }
        : prev.images,
    }));
  }, [setPipelineState]);

  const invalidateFromStep = useCallback((stepId: SkillDrivenStepId) => {
    const affectedSteps = SKILL_INVALIDATION_MAP[stepId];
    setStepSkillDirty((prev) => affectedSteps.reduce<Record<number, boolean>>((acc, currentStepId) => {
      acc[currentStepId] = true;
      return acc;
    }, {...prev}));
    setStepConfirmed((prev) => affectedSteps.reduce<Record<number, boolean>>((acc, currentStepId) => {
      acc[currentStepId] = false;
      return acc;
    }, {...prev}));
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
      const data = await callJson(`${apiBase}/api/workflow/generate`, {
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
      }) as WorkflowGenerateResponse;

      if (shouldForceVariation) {
        setRegenerateAttempts((prev) => ({...prev, [stepId]: nextAttempt}));
      }

      updateWithStepPayload(stepId, data);
      setStepDone((prev) => ({...prev, [stepId]: true}));
      setStepConfirmed((prev) => ({...prev, [stepId]: false}));
      if (stepId >= 1 && stepId <= 5) {
        setStepSkillDirty((prev) => ({...prev, [stepId]: false}));
      }

      if (stepId === 1) {
        setSelectedAnalysis(null);
      }

      if (stepId === 2 && data?.payload?.titles?.options?.length) {
        const nextSelectedId = data?.payload?.titles?.selectedId
          || data.payload.titles.options[0]?.id
          || data.payload.titles.options[0]?.title
          || null;
        setSelectedTitleId(nextSelectedId);
      }

      if (stepId === 1 && Array.isArray(data?.payload?.topicResearch?.results) && data.payload.topicResearch.results.length > 0) {
        showToast(shouldForceVariation
          ? `Step 1 已重新生成，并重新检索了 ${data.payload.topicResearch.results.length} 条相关内容`
          : `逻辑分析已更新，并已基于标题搜索 ${data.payload.topicResearch.results.length} 条相关内容`);
      } else {
        showToast(`${STEP_LIST.find((s) => s.id === stepId)?.label || stepId}${shouldForceVariation ? ' 已重新生成' : ' 已更新'}，请确认后继续`);
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setStepLoading((prev) => ({...prev, [stepId]: false}));
    }
  }, [apiBase, pipelineState, projectState, regenerateAttempts, selectedAnalysis, selectedTitleId, setStepSkillDirty, shotsState, showToast, stepDone, titleKeywords, updateWithStepPayload]);

  const appliedTitleKeywords = useMemo(() => getAppliedTitleKeywords(pipelineState), [pipelineState]);
  const titleKeywordsPending = useMemo(() => getHasPendingTitleKeywords(titleKeywords, appliedTitleKeywords), [appliedTitleKeywords, titleKeywords]);

  const applyTitleKeywords = useCallback(async () => {
    const nextTitleKeywords = String(titleKeywords || '').trim();
    if (!nextTitleKeywords) {
      setErrorMsg('请先输入标题关键词');
      return;
    }

    const nextProjectState = {
      ...projectState,
      name: '未命名项目',
    };
    const nextPipelineState = {
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
    setSelectedShotId(DEFAULT_SHOTS[0].id);
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
    setPlaybackResetKey((prev) => prev + 1);
    setStepDone((prev) => ({...prev, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
    setStepConfirmed((prev) => ({...prev, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
    setErrorMsg(null);
    showToast('标题已应用，正在重新生成 Step 1');

    await generateStep(1, {
      titleKeywords: nextTitleKeywords,
      pipelineState: nextPipelineState,
      projectState: nextProjectState,
      shotsState: DEFAULT_SHOTS,
    });
  }, [generateStep, pipelineState, projectState, setStepSkillDirty, showToast, titleKeywords]);

  const submitVoice = useCallback(async (voiceOverride?: Record<string, any>) => {
    setErrorMsg(null);
    try {
      const liveState = usePipelineSessionStore.getState();
      const voiceSettings = voiceOverride || liveState.pipelineState.voice || {};
      const latestShots = liveState.shotsState || shotsState;
      const latestProjectId = liveState.projectState.id || projectState.id;
      const data = await callJson(`${apiBase}/api/voice`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: latestProjectId,
          shots: latestShots,
          voiceSettings,
        }),
      });

      setVoiceJobId(data.jobId);
      setVoiceJobResult(null);
      setVoiceJobStatus('pending');
      setVoiceProgress(0);
      showToast('配音任务已提交');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
    }
  }, [apiBase, callJson, projectState.id, shotsState, showToast]);

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
          voice: pipelineState.voice?.engine || 'chattts',
          shots: renderPlan.shots,
          audioSegments: hasReusableVoice ? reusableVoiceSegments : null,
          durationInFrames: renderPlan.totalFrames,
          renderFps: Number(render.fps) || projectState.fps,
          renderWidth: Number(render.width) || projectState.width,
          renderHeight: Number(render.height) || projectState.height,
          subtitleText: scriptForRender,
        }),
      });

      setRenderJobId(data.jobId);
      setRenderJobResult(null);
      setRenderJobStatus('pending');
      setRenderProgress(0);
      showToast(hasReusableVoice ? '渲染任务已提交，将直接复用已完成配音' : '渲染任务已提交');
      return data;
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [apiBase, pipelineState.projectBuild?.compositionId, pipelineState.render, pipelineState.voice?.engine, projectState.fps, projectState.height, projectState.id, projectState.width, renderPlan.shots, renderPlan.totalFrames, reusableVoiceSegments, scriptForRender, showToast]);

  const generateStoryboardImages = useCallback(async () => {
    setErrorMsg(null);
    setImageStatus('pending');

    try {
      const prompts = pipelineState.prompts;
      const byShotId = prompts?.byShotId;
      const shotIds = byShotId ? Object.keys(byShotId) : [];
      if (!shotIds.length) {
        setImageStatus('error');
        throw new Error('请先生成 Step 5 的提示词（需要先有分镜结构）');
      }

      const missingShots = shotIds.filter((id) => !byShotId?.[id]?.prompt?.trim());
      if (missingShots.length > 0) {
        setImageStatus('error');
        throw new Error(`以下镜头缺少 prompt 内容：${missingShots.join(', ')}。请先确认 Step 5 内容完整。`);
      }

      const data = await callJson(`${apiBase}/api/images/generate`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectState.id,
          prompts,
          shots: shotsState,
        }),
      }) as ImageJobResponse;

      const initialByShotStatus = shotIds.reduce<Record<string, string>>((acc, shotId) => {
        acc[shotId] = 'pending';
        return acc;
      }, {});
      setPipelineState((prev) => ({
        ...prev,
        images: {
          ...(prev.images || {}),
          jobId: data.jobId || null,
          status: data.status || 'pending',
          progress: Number(data.progress) || 0,
          progressMsg: data.progressMsg || '等待生成分镜图',
          total: Number(data.total) || shotIds.length,
          completed: Number(data.completed) || 0,
          currentShotId: data.currentShotId || null,
          currentShotTitle: data.currentShotTitle || null,
          byShotStatus: initialByShotStatus,
          error: null,
        },
      }));
      setImageStatus((data.status as JobStatus) || 'pending');
      setImageCount((pipelineState.images?.urls || []).length);
      showToast('分镜图任务已提交');
      return data;
    } catch (error) {
      setImageStatus('error');
      setErrorMsg(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [apiBase, pipelineState.prompts, projectState.id, setImageCount, shotsState, showToast]);

  useEffect(() => {
    if (activeStep !== 5) return;
    const prompts = pipelineState.prompts;
    const byShotId = prompts?.byShotId;
    const imageUrls = pipelineState.images?.urls || [];
    const imageJobId = pipelineState.images?.jobId;
    const imageJobStatus = String(pipelineState.images?.status || '');
    if (!byShotId) return;
    if (imageUrls.length > 0 || imageJobStatus === 'done') return;
    if (imageJobId && (imageJobStatus === 'pending' || imageJobStatus === 'running')) return;
    const shotIds = Object.keys(byShotId);
    if (shotIds.length === 0) return;
    generateStoryboardImages();
  }, [activeStep, generateStoryboardImages, pipelineState.images?.jobId, pipelineState.images?.status, pipelineState.images?.urls?.length, pipelineState.prompts]);

  useEffect(() => {
    const imageJobId = pipelineState.images?.jobId;
    const currentStatus = String(pipelineState.images?.status || imageStatus || '');
    if (!imageJobId || !['pending', 'running'].includes(currentStatus)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const job = await callJson(`${apiBase}/api/images/${imageJobId}`, {method: 'GET'}) as ImageJobResponse;
        const versionKey = job.completedAt || job.progress || job.startedAt || '';
        const urls = normalizeImageUrls(apiBase, job.images, versionKey);

        setPipelineState((prev) => ({
          ...prev,
          images: {
            ...(prev.images || {}),
            jobId: imageJobId,
            status: job.status || 'pending',
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

        const resolvedUrlCount = urls.length || (usePipelineSessionStore.getState().pipelineState.images?.urls || []).length;
        setImageStatus((job.status as JobStatus) || 'pending');
        setImageCount(resolvedUrlCount);

        if (job.status === 'done') {
          showToast(`分镜图已生成 ${Number(job.completed) || resolvedUrlCount} 张`);
        }

        if (job.status === 'error') {
          setErrorMsg(job.error || '分镜图生成失败');
        }
      } catch {
        // ignore polling errors
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [apiBase, callJson, imageStatus, pipelineState.images?.jobId, pipelineState.images?.status, setPipelineState, showToast]);

  const runAll = useCallback(async () => {
    setBusyAll(true);
    setErrorMsg(null);

    try {
      for (const step of STEP_LIST.filter((item) => item.id <= 6)) {
        // eslint-disable-next-line no-await-in-loop
        await generateStep(step.id);
      }

      await generateStoryboardImages();
      await submitVoice();
      await generateStep(7);
      await generateStep(8);
      showToast('Step 1-8 已更新，配音完成后请在 Step 8 手动提交渲染');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAll(false);
    }
  }, [generateStep, generateStoryboardImages, showToast, submitVoice]);

  useEffect(() => {
    if (!voiceJobId) return;
    const timer = window.setInterval(async () => {
      try {
        const job = await callJson(`${apiBase}/api/voice/${voiceJobId}`, {method: 'GET'});
        setVoiceProgress(Number(job.progress) || 0);
        setVoiceJobStatus(job.status || 'pending');
        if ((job.status === 'done' || job.status === 'error') && job.result && typeof job.result === 'object') {
          setVoiceJobResult(job.result as VoiceJobResult);
        } else if ((job.status === 'done' || job.status === 'error') && job.queue) {
          setVoiceJobResult(job as VoiceJobResult);
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [apiBase, callJson, voiceJobId]);

  useEffect(() => {
    if (!renderJobId) return;
    const timer = window.setInterval(async () => {
      try {
        const job = await callJson(`${apiBase}/api/render/${renderJobId}`, {method: 'GET'});
        setRenderProgress(Number(job.progress) || 0);
        setRenderJobStatus(job.status || 'pending');
        if (
          job?.outputUrl
          || job?.downloadUrl
          || job?.outputFile
          || job?.status === 'done'
          || job?.status === 'error'
        ) {
          setRenderJobResult(job as RenderJobResult);
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [apiBase, callJson, renderJobId]);

  const statusLabel = getStatusLabel;
  const statusClass = getStatusClass;

  const getStepPreview = useCallback((stepId: WorkflowStepId) => {
    return getStepOutputPreview(stepId, pipelineState, shotsState);
  }, [pipelineState, shotsState]);

  const activeStepIndex = STEP_LIST.findIndex((s) => s.id === activeStep);
  const nextStepId = activeStepIndex >= 0 && activeStepIndex < STEP_LIST.length - 1
    ? STEP_LIST[activeStepIndex + 1].id
    : null;

  const canEnterStep = useCallback((targetStepId: WorkflowStepId) => {
    return getStepAccess(targetStepId, stepConfirmed);
  }, [stepConfirmed]);

  const handleStepSelect = useCallback(async (targetStepId: WorkflowStepId) => {
    const check = canEnterStep(targetStepId);
    if (!check.ok && check.blockedBy) {
      setActiveStep(check.blockedBy.id);
      setErrorMsg(`请先按顺序确认 Step ${check.blockedBy.id} · ${check.blockedBy.label}`);
      return;
    }

    setActiveStep(targetStepId);
    setErrorMsg(null);

    if (!stepDone[targetStepId] && !stepLoading[targetStepId]) {
      await generateStep(targetStepId);
    }
  }, [canEnterStep, generateStep, stepDone, stepLoading]);

  const updateCopyState = useCallback((updated: PipelinePayload) => {
    let nextCopy: PipelinePayload['copy'] = null;
    setPipelineState((prev) => {
      nextCopy = {
        ...(prev.copy || {}),
        ...updated,
      };

      return {
        ...prev,
        copy: nextCopy,
      };
    });
    setStepDone((prev) => ({...prev, 3: hasCopyContent(nextCopy)}));
    setStepConfirmed((prev) => ({...prev, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, []);

  const updateAnalysisState = useCallback((updated: PipelinePayload) => {
    const nextAnalysis = {
      ...(pipelineState.analysis || {}),
      ...updated,
    };
    const nextAnalysisReady = hasAnalysisContent(nextAnalysis);

    setPipelineState((prev) => ({
      ...prev,
      analysis: nextAnalysis,
      selectedAnalysis: null,
    }));
    setSelectedAnalysis(null);
    setStepDone((prev) => ({...prev, 1: nextAnalysisReady}));
    setStepConfirmed((prev) => ({...prev, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [pipelineState.analysis]);

  const updateTitlesState = useCallback((updated: PipelinePayload) => {
    const nextTitles = {
      ...(pipelineState.titles || {}),
      ...updated,
    };
    const normalizedOptions = getValidTitleOptions(nextTitles.options);
    const nextSelected = getResolvedSelectedTitleId(normalizedOptions, nextTitles.selectedId, selectedTitleId);

    setPipelineState((prev) => ({
      ...prev,
      titles: {
        ...(prev.titles || {}),
        ...nextTitles,
        selectedId: nextSelected,
      },
    }));
    setSelectedTitleId(nextSelected);
    setStepDone((prev) => ({...prev, 2: normalizedOptions.length > 0}));
    setStepConfirmed((prev) => ({...prev, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [pipelineState.titles, selectedTitleId]);

  const updateShotsState = useCallback((updated: Array<Partial<Shot>>) => {
    const normalized = normalizeShots(updated, shotsState);

    setShotsState(normalized);
    if (normalized[0]?.id && !normalized.some((shot) => shot.id === selectedShotId)) {
      setSelectedShotId(normalized[0].id);
    }
    setStepDone((prev) => ({...prev, 4: true}));
    setStepConfirmed((prev) => ({...prev, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, [selectedShotId, shotsState]);

  const updatePromptsState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({
      ...prev,
      prompts: {
        ...(prev.prompts || {}),
        ...updated,
      },
    }));
    setStepDone((prev) => ({...prev, 5: true}));
    setStepConfirmed((prev) => ({...prev, 5: false, 7: false, 8: false}));
  }, []);

  const updateVoiceState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({
      ...prev,
      voice: {
        ...(prev.voice || {}),
        ...updated,
      },
    }));
    setShotsState((prev) => mergeVoiceUpdateIntoShots(prev, updated));

    setStepDone((prev) => ({...prev, 6: true}));
    setStepConfirmed((prev) => ({...prev, 6: false, 7: false, 8: false}));
  }, []);

  const backfillVoiceDurations = useCallback(() => {
    const queue = Array.isArray(voiceJobResult?.queue) ? voiceJobResult.queue : [];
    if (queue.length === 0) {
      setErrorMsg('当前还没有可回填的配音产物');
      return;
    }

    setShotsState((prev) => backfillShotDurations(prev, queue));
    setStepDone((prev) => ({...prev, 4: true, 6: true}));
    setStepConfirmed((prev) => ({...prev, 4: false, 6: false, 7: false, 8: false}));
    showToast('已按配音实际时长回填镜头时长');
  }, [showToast, voiceJobResult?.queue]);

  const updateRenderState = useCallback((updated: PipelinePayload) => {
    setPipelineState((prev) => ({
      ...prev,
      render: {
        ...(prev.render || {}),
        ...updated,
      },
    }));
    setStepDone((prev) => ({...prev, 8: true}));
    setStepConfirmed((prev) => ({...prev, 8: false}));
  }, []);

  const handleSelectTitle = useCallback((titleId: string) => {
    setSelectedTitleId(titleId);
    setPipelineState((prev) => ({
      ...prev,
      titles: {
        ...(prev.titles || {}),
        selectedId: titleId,
      },
    }));
    setStepDone((prev) => ({...prev, 2: true}));
    setStepConfirmed((prev) => ({...prev, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false}));
  }, []);

  const confirmCurrentStep = useCallback(() => {
    const skillStepId = activeStep >= 1 && activeStep <= 5 ? activeStep as SkillDrivenStepId : null;
    const hadDirtySkill = Boolean(skillStepId && stepSkillDirty[activeStep]);

    if (activeStep === 1) {
      if (titleKeywordsPending) {
        setErrorMsg(null);
        showToast('检测到标题已更新，先按最新标题重生成 Step 1');
        void applyTitleKeywords();
        return;
      }

      const analysis = pipelineState.analysis || selectedAnalysis;
      if (!hasAnalysisContent(analysis)) {
        setErrorMsg('请先生成或填写 Step 1 的逻辑分析，再确认');
        return;
      }
    }

    if (activeStep === 2) {
      const options = getValidTitleOptions(pipelineState.titles?.options);
      const nextSelected = getResolvedSelectedTitleId(options, selectedTitleId);

      if (!nextSelected) {
        setErrorMsg('请先在标题候选池里保留至少一个标题，并确认一个主标题');
        return;
      }

      if (nextSelected !== selectedTitleId) {
        handleSelectTitle(nextSelected);
      }
    }

    if (activeStep === 7) {
      if (!pipelineState.projectBuild?.compositionId || !pipelineState.projectBuild?.projectPath) {
        setErrorMsg('请先生成 Step 7 的项目构建结果，再确认');
        return;
      }
    }

    if (activeStep === 1) {
      const analysis = pipelineState.analysis || null;
      setSelectedAnalysis(analysis);
      setPipelineState((prev) => ({
        ...prev,
        selectedAnalysis: analysis,
      }));
    }

    if (skillStepId && hadDirtySkill) {
      const affectedSteps = SKILL_INVALIDATION_MAP[skillStepId] || [skillStepId];
      setStepSkillDirty((prev) => affectedSteps.reduce<Record<number, boolean>>((acc, stepId) => {
        acc[stepId] = false;
        return acc;
      }, {...prev}));
    }

    setStepConfirmed((prev) => ({...prev, [activeStep]: true}));
    setErrorMsg(null);
    showToast(hadDirtySkill ? `Step ${activeStep} 已确认，继续沿用当前结果` : `Step ${activeStep} 已确认`);
  }, [activeStep, applyTitleKeywords, handleSelectTitle, pipelineState.analysis, pipelineState.projectBuild?.compositionId, pipelineState.projectBuild?.projectPath, pipelineState.titles?.options, selectedAnalysis, selectedTitleId, setStepSkillDirty, showToast, stepSkillDirty, titleKeywordsPending]);

  const goNextStep = useCallback(async () => {
    if (!stepConfirmed[activeStep]) {
      setErrorMsg('请先确认当前步骤，再进入下一步');
      return;
    }

    if (nextStepId) {
      setActiveStep(nextStepId);
      setErrorMsg(null);

      if (!stepDone[nextStepId]) {
        await generateStep(nextStepId);
      }
    }
  }, [activeStep, generateStep, nextStepId, stepConfirmed, stepDone]);

  const selectedShot = useMemo(() => shotsState.find((shot) => shot.id === selectedShotId) || shotsState[0], [selectedShotId, shotsState]);
  const activeStepMeta = useMemo(() => STEP_LIST.find((step) => step.id === activeStep) || STEP_LIST[0], [activeStep]);
  const selectedTitle = useMemo(() => getSelectedTitle(pipelineState.titles?.options, selectedTitleId), [pipelineState.titles?.options, selectedTitleId]);
  const renderMediaReady = Boolean(
    resolvedRenderResult
    && resolvedRenderResult.mediaReady
    && (resolvedRenderResult.outputUrl || resolvedRenderResult.downloadUrl),
  );
  const skillCatalog = useMemo(
    () => normalizeCatalogEntries(pipelineState.skillCatalog),
    [pipelineState.skillCatalog],
  );
  const currentStepSkillId = useMemo(
    () => getSkillIdForStep(activeStep),
    [activeStep],
  );
  const currentStepResolvedSkill = useMemo(() => {
    if (pipelineState.stepResolvedSkills?.[activeStep]) {
      return pipelineState.stepResolvedSkills[activeStep] || null;
    }
    if (currentStepSkillId && pipelineState.skillSpecsById?.[currentStepSkillId]) {
      return pipelineState.skillSpecsById[currentStepSkillId] || null;
    }
    return null;
  }, [activeStep, currentStepSkillId, pipelineState.skillSpecsById, pipelineState.stepResolvedSkills]);
  const currentStepEvaluation = useMemo(
    () => pipelineState.stepEvaluations?.[activeStep] || (activeStep === 7 ? pipelineState.projectBuild?.eval || null : null),
    [activeStep, pipelineState.projectBuild?.eval, pipelineState.stepEvaluations],
  );
  const currentSkillOverride = useMemo(() => {
    if (activeStep < 1 || activeStep > 5) {
      return null;
    }

    const stepId = activeStep as SkillDrivenStepId;
    const defaults = normalizeStepSkill(
      stepId,
      currentStepResolvedSkill?.defaults && typeof currentStepResolvedSkill.defaults === 'object'
        ? currentStepResolvedSkill.defaults as StepSkillConfig
        : null,
    );
    const current = normalizeStepSkill(stepId, pipelineState.stepSkills?.[stepId] || defaults);
    const changedKeys = SKILL_OVERRIDE_FIELDS[stepId].filter((key) => {
      const currentValue = current[key];
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        return false;
      }
      return String(currentValue) !== String(defaults[key] ?? '');
    });

    return {
      count: changedKeys.length,
      labels: changedKeys,
    };
  }, [activeStep, currentStepResolvedSkill?.defaults, pipelineState.stepSkills]);
  const renderStepHasError = renderJobStatus === 'error';
  const renderStepIsRunning = renderJobStatus === 'running' || renderJobStatus === 'pending';
  const renderStepConfigured = Boolean(stepDone[8] || renderJobId || renderMediaReady || renderStepHasError);
  const previewMode = activeStep <= 5 || activeStep === 7 ? 'planning' : 'media';
  const activeStepSummary = getStepPreview(activeStep);
  const activeStepStatusClass = stepSkillDirty[activeStep]
    ? 'is-warning'
    : stepConfirmed[activeStep]
      ? 'is-done'
      : stepDone[activeStep]
        ? 'is-running'
        : 'is-idle';
  const activeStepStatusLabel = stepSkillDirty[activeStep]
    ? '待更新'
    : stepConfirmed[activeStep]
      ? '已确认'
      : stepDone[activeStep]
        ? '待确认'
        : '待生成';
  const hasPendingTitleKeywords = titleKeywordsPending;

  return {
    activeStep,
    activeStepMeta,
    activeStepStatusClass,
    activeStepStatusLabel,
    activeStepSummary,
    apiBase,
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
    hasPendingTitleKeywords,
    currentSkillOverride,
    currentStepEvaluation,
    currentStepResolvedSkill,
    currentStepSkillId,
    imageCount,
    imageStatus,
    invalidateFromStep,
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
