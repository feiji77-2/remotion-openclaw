import {STEP_LIST} from '../workflow/steps';
import type {AudioSegment, JobStatus, RenderJobResult, Shot, VoiceQueueItem, WorkflowStepId} from '../workflow/types';
import type {PipelinePayload, PipelineTitleOption, VoiceAssetPreview} from './pipelineTypes';

export interface RenderableShot {
  id: string;
  title: string;
  narration: string;
  durationSeconds: number;
  imageUrl: string | null;
  promptZh?: string;
  visualSummaryZh?: string;
  visualFocusZh?: string;
  comparisonSummaryZh?: string;
  mood?: string;
  style?: string;
  keywords?: string[];
  dataPoints?: string[];
}

export function buildRenderScript(pipelineState: PipelinePayload, titleKeywords: string) {
  const copy = pipelineState.copy;
  if (!copy) return titleKeywords;

  const body = Array.isArray(copy.body)
    ? copy.body.map((block) => block?.text).filter(Boolean).join('\n')
    : '';

  return [copy.hook, body, copy.cta].filter(Boolean).join('\n\n').trim() || titleKeywords;
}

export function getTotalFrames(shotsState: Shot[], fps: number) {
  const totalSeconds = shotsState.reduce((sum, shot) => sum + (shot.durationSeconds || 0), 0);
  return Math.max(1, Math.round(totalSeconds * fps));
}

export function getShotStartFrameMap(shotsState: Shot[], fps: number) {
  const offsets: Record<string, number> = {};
  let currentFrame = 0;
  for (const shot of shotsState) {
    offsets[shot.id] = currentFrame;
    currentFrame += Math.max(1, Math.round((shot.durationSeconds || 0) * fps));
  }
  return offsets;
}

export function buildRenderPlan(
  shotsState: Shot[],
  prompts: PipelinePayload['prompts'] | null | undefined,
  images: PipelinePayload['images'] | null | undefined,
  queue: VoiceQueueItem[],
  fps: number,
): {
  shots: RenderableShot[];
  audioSegments: AudioSegment[];
  totalFrames: number;
} {
  const promptByShotId = prompts?.byShotId && typeof prompts.byShotId === 'object' ? prompts.byShotId : {};
  const imageMap = Object.fromEntries(
    Array.isArray(images?.urls)
      ? images.urls
        .filter((entry) => entry?.shotId && entry?.url)
        .map((entry) => [entry.shotId, entry.url])
      : [],
  );
  const voiceMap = Object.fromEntries(
    Array.isArray(queue)
      ? queue.map((item) => [item.shotId, item])
      : [],
  );

  let currentFrame = 0;
  const audioSegments: AudioSegment[] = [];

  const shots = shotsState.map((shot) => {
    const prompt = promptByShotId[shot.id] || {};
    const voiceClip = voiceMap[shot.id];
    const durationSeconds = Math.max(
      0.1,
      Number(
        voiceClip?.durationSeconds
        ?? shot.durationSeconds
        ?? prompt.durationSeconds
        ?? 5,
      ) || 5,
    );
    const durationInFrames = Math.max(1, Math.round(durationSeconds * fps));

    if (typeof voiceClip?.voiceFile === 'string' && voiceClip.voiceFile.trim()) {
      audioSegments.push({
        src: voiceClip.voiceFile,
        startFrame: currentFrame,
        durationInFrames,
      });
    }

    const renderShot: RenderableShot = {
      id: shot.id,
      title: String(shot.title || prompt.shotTitle || shot.id || '镜头').trim(),
      narration: String(shot.narration || prompt.text || '').trim(),
      durationSeconds,
      imageUrl: typeof imageMap[shot.id] === 'string'
        ? imageMap[shot.id]
        : typeof prompt.imageUrl === 'string' && prompt.imageUrl.trim()
          ? prompt.imageUrl.trim()
          : null,
      promptZh: String(prompt.promptZh || prompt.prompt || '').trim() || undefined,
      visualSummaryZh: String(prompt.visualSummaryZh || '').trim() || undefined,
      visualFocusZh: String(prompt.visualFocusZh || prompt.visualFocus || '').trim() || undefined,
      comparisonSummaryZh: String(prompt.comparisonSummaryZh || '').trim() || undefined,
      mood: String(prompt.mood || '').trim() || undefined,
      style: String(prompt.style || '').trim() || undefined,
      keywords: Array.isArray(prompt.keywords)
        ? prompt.keywords.map((item) => String(item || '').trim()).filter(Boolean)
        : undefined,
      dataPoints: Array.isArray(prompt.dataPoints)
        ? prompt.dataPoints.map((item) => String(item || '').trim()).filter(Boolean)
        : undefined,
    };

    currentFrame += durationInFrames;
    return renderShot;
  });

  return {
    shots,
    audioSegments,
    totalFrames: Math.max(1, currentFrame),
  };
}

export function getReusableVoiceSegments(queue: VoiceQueueItem[], shotsState: Shot[], fps: number): AudioSegment[] {
  return buildRenderPlan(shotsState, null, null, queue, fps).audioSegments;
}

export function getVoiceAssetPreviews(queue: VoiceQueueItem[], shotsState: Shot[], apiBase: string): VoiceAssetPreview[] {
  return queue.map((item) => {
    const matchedShot = shotsState.find((shot) => shot.id === item.shotId);
    const relativePath = typeof item.voiceFile === 'string' ? item.voiceFile.trim() : '';
    const url = relativePath
      ? relativePath.startsWith('http')
        ? relativePath
        : `${apiBase}${relativePath}`
      : '';
    return {
      ...item,
      title: matchedShot?.title || item.shotId,
      url,
    };
  });
}

export function resolveManifestUrl(apiBase: string, manifestFile?: string | null) {
  if (!manifestFile) {
    return null;
  }
  return manifestFile.startsWith('http') ? manifestFile : `${apiBase}${manifestFile}`;
}

export function resolveRenderResult(apiBase: string, renderJobResult: RenderJobResult | null): RenderJobResult | null {
  if (!renderJobResult) {
    return null;
  }

  const toAbsoluteUrl = (value: unknown) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      return null;
    }
    return normalized.startsWith('http') ? normalized : `${apiBase}${normalized}`;
  };

  return {
    ...renderJobResult,
    outputUrl: toAbsoluteUrl(renderJobResult.outputUrl),
    downloadUrl: toAbsoluteUrl(renderJobResult.downloadUrl),
    voiceUrl: toAbsoluteUrl(renderJobResult.voiceUrl),
    subtitleUrl: toAbsoluteUrl(renderJobResult.subtitleUrl),
  };
}

export function buildStepPayloadSnapshot(stepId: WorkflowStepId, pipelineState: PipelinePayload, shotsState: Shot[]) {
  if (stepId === 1) return pipelineState.analysis || null;
  if (stepId === 2) return pipelineState.titles || null;
  if (stepId === 3) return pipelineState.copy || null;
  if (stepId === 4) return shotsState;
  if (stepId === 5) return pipelineState.prompts || null;
  if (stepId === 6) return pipelineState.voice || null;
  if (stepId === 7) return pipelineState.projectBuild || null;
  if (stepId === 8) return pipelineState.render || null;
  return null;
}

export function getAppliedTitleKeywords(pipelineState: PipelinePayload) {
  return [
    pipelineState.inputTitleKeywords,
    pipelineState.inputTopic,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean) || '';
}

export function hasPendingTitleKeywords(titleKeywords: string, appliedTitleKeywords: string) {
  const normalizedInput = String(titleKeywords || '').trim();
  if (!normalizedInput) {
    return false;
  }
  return normalizedInput !== appliedTitleKeywords;
}

export function getStatusLabel(status: JobStatus) {
  if (status === 'running' || status === 'pending') return '运行中';
  if (status === 'done') return '完成';
  if (status === 'error') return '错误';
  return '空闲';
}

export function getStatusClass(status: JobStatus) {
  if (status === 'running' || status === 'pending') return 'is-running';
  if (status === 'done') return 'is-done';
  if (status === 'error') return 'is-error';
  return 'is-idle';
}

export function getStepAccess(targetStepId: WorkflowStepId, stepConfirmed: Record<number, boolean>) {
  const targetIndex = STEP_LIST.findIndex((step) => step.id === targetStepId);
  if (targetIndex <= 0) return {ok: true as const, blockedBy: null};

  const blockedBy = STEP_LIST.slice(0, targetIndex).find((step) => !stepConfirmed[step.id]) || null;
  if (blockedBy) {
    return {ok: false as const, blockedBy};
  }
  return {ok: true as const, blockedBy: null};
}

export function hasAnalysisContent(analysis: Record<string, any> | null | undefined) {
  return Boolean(
    String(analysis?.thesis || '').trim()
    || String(analysis?.audience || '').trim()
    || String(analysis?.corePromise || '').trim()
    || (Array.isArray(analysis?.layers) && analysis.layers.length > 0)
    || (Array.isArray(analysis?.process) && analysis.process.length > 0),
  );
}

export function getValidTitleOptions(options: PipelineTitleOption[] | undefined) {
  return Array.isArray(options)
    ? options.filter((item) => String(item?.title || '').trim())
    : [];
}

export function getResolvedSelectedTitleId(options: PipelineTitleOption[], preferredId?: string | null, fallbackId?: string | null) {
  return options.find((item) => item.id === preferredId)?.id
    || options.find((item) => item.id === fallbackId)?.id
    || options[0]?.id
    || null;
}

export function hasCopyContent(copy: PipelinePayload['copy']) {
  return Boolean(
    String(copy?.hook || '').trim()
    || String(copy?.cta || '').trim()
    || (Array.isArray(copy?.body) && copy.body.some((item) => String(item?.text || '').trim()))
    || (Array.isArray(copy?.outline) && copy.outline.some((item) => String(item?.beat || '').trim() || String(item?.goal || '').trim()))
  );
}

export function getSelectedTitle(options: PipelineTitleOption[] | undefined, selectedTitleId: string | null) {
  const normalizedOptions = Array.isArray(options) ? options : [];
  return normalizedOptions.find((option) => option.id === selectedTitleId) || normalizedOptions[0] || null;
}

export function normalizeShots(updated: Array<Partial<Shot>>, currentShots: Shot[]) {
  return updated.map((shot, index) => ({
    ...(currentShots.find((item) => item.id === shot.id) || currentShots[index] || {}),
    ...(shot || {}),
    id: shot.id || currentShots[index]?.id || `shot-${String(index + 1).padStart(2, '0')}`,
    title: shot.title || currentShots[index]?.title || `场景 ${index + 1}`,
    narration: shot.narration || currentShots[index]?.narration || '',
    durationSeconds: Math.max(0.1, Number(shot.durationSeconds ?? currentShots[index]?.durationSeconds ?? 5) || 5),
  }));
}

export function mergeVoiceUpdateIntoShots(shotsState: Shot[], updated: PipelinePayload) {
  const byShotId = updated?.byShotId && typeof updated.byShotId === 'object' ? updated.byShotId : {};
  const scriptMap = Array.isArray(updated?.script)
    ? Object.fromEntries(updated.script.map((item: any) => [item.shotId, item]))
    : {};

  if (Object.keys(byShotId).length === 0 && Object.keys(scriptMap).length === 0) {
    return shotsState;
  }

  return shotsState.map((shot) => {
    const fromByShot = byShotId[shot.id] || {};
    const fromScript = scriptMap[shot.id] || {};
    return {
      ...shot,
      narration: String(fromScript.text || fromByShot.text || shot.narration || '').trim(),
      durationSeconds: Number(fromScript.duration ?? fromByShot.duration ?? fromByShot.durationSeconds ?? shot.durationSeconds ?? 5),
    };
  });
}

export function backfillShotDurations(shotsState: Shot[], queue: VoiceQueueItem[]) {
  const byShotId = Object.fromEntries(queue.map((item) => [item.shotId, item]));
  return shotsState.map((shot) => {
    const clip = byShotId[shot.id];
    if (!clip) {
      return shot;
    }
    return {
      ...shot,
      durationSeconds: Math.max(0.1, Number(clip.durationSeconds) || shot.durationSeconds),
    };
  });
}
