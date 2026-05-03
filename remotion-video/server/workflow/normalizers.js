const { createLogger } = require('../utils/logger');
const { clone, toNumber, clamp, normalizeTopicResearch } = require('./searchUtils');
const { ULTIMATE_TEMPLATE } = require('../../scripts/lib/index.js');

function normalizeAnalysisPayload(candidate, input) {
  const current = clone(input.pipelineState.analysis || {});
  const next = candidate.analysis && typeof candidate.analysis === 'object' ? candidate.analysis : {};
  const currentLayers = Array.isArray(current.layers) ? current.layers : [];
  const nextLayers = Array.isArray(next.layers) ? next.layers : [];
  const currentProcess = Array.isArray(current.process) ? current.process : [];
  const nextProcess = Array.isArray(next.process) ? next.process : [];
  const mergedLayers = (nextLayers.length > 0 ? nextLayers : currentLayers).slice(0, 4);

  return {
    analysis: {
      thesis: String(next.thesis || current.thesis || '').trim(),
      audience: String(next.audience || current.audience || '').trim(),
      corePromise: String(next.corePromise || current.corePromise || '').trim(),
      layers: mergedLayers.map((layer, index) => {
        const currentLayer = currentLayers[index] || {};
        const incoming = nextLayers[index] || {};
        return {
          id: incoming.id || currentLayer.id || layer.id || `analysis-${index + 1}`,
          label: String(incoming.label || currentLayer.label || layer.label || `逻辑层 ${index + 1}`).trim(),
          insight: String(incoming.insight || currentLayer.insight || layer.insight || '').trim(),
          evidence: String(incoming.evidence || currentLayer.evidence || layer.evidence || '').trim(),
        };
      }),
      process: (nextProcess.length > 0 ? nextProcess : currentProcess).slice(0, 4).map((item, index) => ({
        id: item.id || currentProcess[index]?.id || `analysis-p${index + 1}`,
        label: String(item.label || currentProcess[index]?.label || `步骤 ${index + 1}`).trim(),
        detail: String(item.detail || currentProcess[index]?.detail || '').trim(),
      })),
    },
  };
}

function normalizeTitlesPayload(candidate, input) {
  const current = clone(input.pipelineState.titles || {});
  const nextTitles = candidate.titles && typeof candidate.titles === 'object' ? candidate.titles : {};
  const rawOptions = Array.isArray(nextTitles.options) ? nextTitles.options : [];
  const previousOptions = Array.isArray(current.options) ? current.options : [];

  const normalizedOptions = (rawOptions.length > 0 ? rawOptions : previousOptions)
    .slice(0, 5)
    .map((option, index) => {
      const previous = previousOptions[index] || {};
      const fallbackId = previous.id || `title-${Date.now()}-${index + 1}`;
      return {
        id: String(option.id || previous.id || fallbackId),
        title: String(option.title || previous.title || `标题 ${index + 1}`).trim(),
        angle: String(option.angle || previous.angle || '解释型').trim(),
        score: clamp(Math.round(toNumber(option.score, previous.score || 80)), 0, 100),
      };
    });

  const selectedIndex = clamp(Math.round(toNumber(nextTitles.selectedIndex, 0)), 0, Math.max(0, normalizedOptions.length - 1));
  const requestedSelectedId = input.pipelineState?.selectedTitleId;
  const hasRequestedSelection = requestedSelectedId && normalizedOptions.some((item) => item.id === requestedSelectedId);
  const selectedId = hasRequestedSelection
    ? requestedSelectedId
    : normalizedOptions[selectedIndex]?.id || normalizedOptions[0]?.id || null;

  return {
    titles: {
      ...current,
      options: normalizedOptions,
      selectedId,
      selectedReason: String(nextTitles.selectedReason || current.selectedReason || '').trim(),
    },
    projectName: String(candidate.projectName || normalizedOptions[selectedIndex]?.title || input.projectState.name || '').trim(),
  };
}

function normalizeCopyPayload(candidate, input) {
  const current = clone(input.pipelineState.copy || {});
  const nextCopy = candidate.copy && typeof candidate.copy === 'object' ? candidate.copy : {};
  const currentBody = Array.isArray(current.body) ? current.body : [];
  const nextBody = Array.isArray(nextCopy.body) ? nextCopy.body : [];
  const mergedBody = (nextBody.length > 0 ? nextBody : currentBody)
    .slice(0, Math.max(3, currentBody.length || 3))
    .map((item, index) => ({
      id: currentBody[index]?.id || `copy-${index + 1}`,
      label: String(item.label || currentBody[index]?.label || `段落 ${index + 1}`).trim(),
      text: String(item.text || currentBody[index]?.text || '').trim(),
    }));

  return {
    copy: {
      hook: String(nextCopy.hook || current.hook || '').trim(),
      body: mergedBody,
      cta: String(nextCopy.cta || current.cta || '').trim(),
    },
  };
}

function normalizeShotsPayload(candidate, input) {
  const currentShots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const nextShots = Array.isArray(candidate.shots) ? candidate.shots : [];

  if (nextShots.length > 0) {
    return {
      shots: nextShots.map((shot) => ({
        ...(currentShots.find((item) => item.id === shot.id) || {}),
        ...(shot && typeof shot === 'object' ? shot : {}),
        id: String(shot.id || '').trim() || undefined,
        title: String(shot.title || '').trim(),
        narration: String(shot.narration || '').trim(),
        durationSeconds: Math.max(0.1, toNumber(shot.durationSeconds, 5)),
      })),
    };
  }

  return {
    shots: currentShots.map((shot) => ({
      ...shot,
      title: String(shot.title || '').trim(),
      narration: String(shot.narration || '').trim(),
      durationSeconds: Math.max(0.1, toNumber(shot.durationSeconds, 5)),
    })),
  };
}

function normalizePromptsPayload(candidate, input) {
  const current = clone(input.pipelineState.prompts || {});
  const nextPrompts = candidate.prompts && candidate.prompts.byShotId && typeof candidate.prompts.byShotId === 'object'
    ? candidate.prompts.byShotId
    : {};
  const nextByShotId = {};

  for (const shot of input.shotsState || []) {
    const currentPrompt = current.byShotId?.[shot.id] || {};
    const incoming = nextPrompts[shot.id] || {};
    nextByShotId[shot.id] = {
      ...currentPrompt,
      ...incoming,
      prompt: String(incoming.prompt || currentPrompt.prompt || '').trim(),
      negativePrompt: String(incoming.negativePrompt || currentPrompt.negativePrompt || '').trim(),
      style: String(incoming.style || currentPrompt.style || '').trim(),
      mood: String(incoming.mood || currentPrompt.mood || '').trim(),
      visualFocus: String(incoming.visualFocus || currentPrompt.visualFocus || '').trim(),
      text: String(incoming.text || currentPrompt.text || shot.narration || '').trim(),
      promptZh: String(incoming.promptZh || currentPrompt.promptZh || '').trim(),
      visualSummaryZh: String(incoming.visualSummaryZh || currentPrompt.visualSummaryZh || '').trim(),
      visualFocusZh: String(incoming.visualFocusZh || currentPrompt.visualFocusZh || '').trim(),
      negativePromptZh: String(incoming.negativePromptZh || currentPrompt.negativePromptZh || '').trim(),
      comparisonSummaryZh: String(incoming.comparisonSummaryZh || currentPrompt.comparisonSummaryZh || '').trim(),
      sceneIntent: String(incoming.sceneIntent || currentPrompt.sceneIntent || shot.sceneIntent || '').trim(),
      evidenceAnchor: String(incoming.evidenceAnchor || currentPrompt.evidenceAnchor || shot.evidenceAnchor || '').trim(),
      scriptBlockId: String(incoming.scriptBlockId || currentPrompt.scriptBlockId || shot.scriptBlockId || '').trim(),
      scriptBlockLabel: String(incoming.scriptBlockLabel || currentPrompt.scriptBlockLabel || shot.scriptBlockLabel || '').trim(),
      scriptSourceText: String(incoming.scriptSourceText || currentPrompt.scriptSourceText || shot.scriptSourceText || shot.narration || '').trim(),
      scriptExcerpt: String(incoming.scriptExcerpt || currentPrompt.scriptExcerpt || shot.scriptExcerpt || shot.narration || '').trim(),
      storyboardCueZh: String(incoming.storyboardCueZh || currentPrompt.storyboardCueZh || shot.storyboardCueZh || shot.sceneIntent || '').trim(),
      family: String(incoming.family || incoming.sceneFamily || currentPrompt.family || currentPrompt.sceneFamily || shot.family || shot.sceneFamily || '').trim(),
      sceneFamily: String(incoming.sceneFamily || incoming.family || currentPrompt.sceneFamily || currentPrompt.family || shot.sceneFamily || shot.family || '').trim(),
      templateCandidates: Array.isArray(incoming.templateCandidates)
        ? incoming.templateCandidates
        : Array.isArray(currentPrompt.templateCandidates)
          ? currentPrompt.templateCandidates
          : Array.isArray(shot.templateCandidates)
            ? shot.templateCandidates
            : [],
      canvasRatio: String(incoming.canvasRatio || currentPrompt.canvasRatio || '').trim(),
      canvasWidth: toNumber(incoming.canvasWidth || currentPrompt.canvasWidth, 0),
      canvasHeight: toNumber(incoming.canvasHeight || currentPrompt.canvasHeight, 0),
      visual: incoming.visual || currentPrompt.visual || shot.visual || null,
      dataPoints: Array.isArray(incoming.dataPoints) ? incoming.dataPoints : Array.isArray(currentPrompt.dataPoints) ? currentPrompt.dataPoints : shot.dataPoints,
      comparisons: Array.isArray(incoming.comparisons) ? incoming.comparisons : Array.isArray(currentPrompt.comparisons) ? currentPrompt.comparisons : shot.comparisons,
      keywords: Array.isArray(incoming.keywords) ? incoming.keywords : Array.isArray(currentPrompt.keywords) ? currentPrompt.keywords : shot.keywords,
      imageUrl: String(incoming.imageUrl || currentPrompt.imageUrl || '').trim(),
    };
  }

  return {
    prompts: {
      byShotId: nextByShotId,
    },
  };
}

function normalizeVoicePayload(candidate, input) {
  const currentVoice = clone(input.pipelineState.voice || {});
  const currentShots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const nextVoice = candidate.voice && typeof candidate.voice === 'object' ? candidate.voice : {};
  const nextVoiceShots = Array.isArray(nextVoice.shots) ? nextVoice.shots : [];

  const nextShots = currentShots.map((shot) => {
    const incoming = nextVoiceShots.find((item) => item.id === shot.id) || {};
    const nextText = String(incoming.text || currentVoice.byShotId?.[shot.id]?.text || shot.narration || '').trim();
    return {
      ...shot,
      narration: nextText || shot.narration,
      durationSeconds: Math.max(0.1, toNumber(incoming.durationSeconds, shot.durationSeconds || 5)),
    };
  });

  const byShotId = {};
  nextShots.forEach((shot) => {
    const incoming = nextVoiceShots.find((item) => item.id === shot.id) || {};
    const currentEntry = currentVoice.byShotId?.[shot.id] || {};
    byShotId[shot.id] = {
      text: shot.narration,
      emotion: String(incoming.emotion || currentEntry.emotion || nextVoice.emotion || '').trim(),
      emphasis: String(incoming.emphasis || currentEntry.emphasis || shot.title || '').trim(),
      durationSeconds: Math.max(0.1, toNumber(incoming.durationSeconds, currentEntry.durationSeconds || shot.durationSeconds)),
    };
  });

  // Build script array from nextVoiceShots (for display)
  const script = nextVoiceShots.map((vs) => ({
    shotId: vs.id,
    text: String(vs.text || '').trim(),
    duration: Math.max(0.1, toNumber(vs.durationSeconds, 5)),
  }));
  const totalDuration = script.reduce((s, v) => s + v.duration, 0);
  const totalChars = script.reduce((s, v) => s + v.text.length, 0);

  return {
    voice: {
      preset: String(nextVoice.preset || currentVoice.preset || '').trim(),
      engine: String(nextVoice.engine || currentVoice.engine || 'qwen-tts').trim(),
      language: String(nextVoice.language || currentVoice.language || 'zh-CN').trim(),
      speed: String(nextVoice.speed || currentVoice.speed || '1.0').trim(),
      pitch: toNumber(nextVoice.pitch ?? currentVoice.pitch ?? 0, 0),
      emotion: String(nextVoice.emotion || currentVoice.emotion || '').trim(),
      pauses: String(nextVoice.pauses || currentVoice.pauses || '').trim(),
      byShotId,
      script,
      totalDuration: toNumber(nextVoice.totalDuration || Math.round(totalDuration), 0),
      totalChars: toNumber(nextVoice.totalChars || totalChars, 0),
    },
    shots: nextShots,
  };
}

function normalizeRenderPayload(candidate, input) {
  const current = clone(input.pipelineState.render || {});
  const nextRender = candidate.render && typeof candidate.render === 'object' ? candidate.render : {};
  const template = ULTIMATE_TEMPLATE;
  const quality = ['low', 'medium', 'high'].includes(nextRender.quality)
    ? nextRender.quality
    : current.quality || 'high';
  const currentIsUltimate = current.template === ULTIMATE_TEMPLATE;
  const requestedWidth = toNumber(nextRender.width, 0);
  const requestedHeight = toNumber(nextRender.height, 0);
  const currentWidth = currentIsUltimate ? toNumber(current.width, 0) : 0;
  const currentHeight = currentIsUltimate ? toNumber(current.height, 0) : 0;
  const width = requestedWidth > 0 ? requestedWidth : currentWidth > 0 ? currentWidth : 1920;
  const height = requestedHeight > 0 ? requestedHeight : currentHeight > 0 ? currentHeight : 1080;

  // Compute sensible defaults from shots if LLM returned zeros/empties
  const shotsDur = (input.shotsState || []).reduce((s, sh) => s + (sh.durationSeconds || 5), 0);
  const computedDuration = shotsDur || toNumber(nextRender.estimatedDuration, 0);
  const fallbackBitrate = 12000;
  const computedMB = Math.round((toNumber(nextRender.bitrate, fallbackBitrate) * computedDuration / 8) / 1024);

  return {
    render: {
      template,
      quality,
      fps: toNumber(nextRender.fps || current.fps || 30, 30),
      width,
      height,
      format: String(nextRender.format || current.format || 'mp4').trim(),
      codec: String(nextRender.codec || current.codec || 'h264').trim(),
      bitrate: toNumber(nextRender.bitrate || current.bitrate || fallbackBitrate, fallbackBitrate),
      estimatedDuration: computedDuration > 0 ? computedDuration : toNumber(current.estimatedDuration, 0),
      estimatedSize: computedMB > 0 ? '~' + computedMB + 'MB' : String(current.estimatedSize || '').trim(),
      notes: (nextRender.notes || current.notes || '').trim() || (
        computedDuration > 0
          ? `${computedDuration}s 横版 1920x1080 Ultimate 模板，适合结构化讲解和章节化信息视频`
          : ''
      ),
    },
  };
}

function normalizeProjectBuildPayload(candidate, input) {
  const current = clone(input.pipelineState.projectBuild || {});
  const nextBuild = candidate.projectBuild && typeof candidate.projectBuild === 'object' ? candidate.projectBuild : {};
  return {
    projectBuild: {
      projectPath: String(nextBuild.projectPath || current.projectPath || '').trim(),
      compositionId: String(nextBuild.compositionId || current.compositionId || 'UltimateSceneTemplate').trim(),
      buildStatus: String(nextBuild.buildStatus || current.buildStatus || '').trim(),
      notes: String(nextBuild.notes || current.notes || '').trim(),
    },
  };
}

function normalizeStepPayload(stepId, candidate, input) {
  if (stepId === 1) {
    return {
      ...normalizeAnalysisPayload(candidate, input),
      ...normalizeTopicResearch(candidate.topicResearch, input),
    };
  }
  if (stepId === 2) {
    return normalizeTitlesPayload(candidate, input);
  }
  if (stepId === 3) {
    return normalizeCopyPayload(candidate, input);
  }
  if (stepId === 4) {
    return normalizeShotsPayload(candidate, input);
  }
  if (stepId === 5) {
    return normalizePromptsPayload(candidate, input);
  }
  if (stepId === 6) {
    return normalizeVoicePayload(candidate, input);
  }
  if (stepId === 7) {
    return normalizeProjectBuildPayload(candidate, input);
  }
  if (stepId === 8) {
    return normalizeRenderPayload(candidate, input);
  }
  throw new Error(`Unsupported workflow step: ${stepId}`);
}

module.exports = {
  normalizeAnalysisPayload,
  normalizeTitlesPayload,
  normalizeCopyPayload,
  normalizeShotsPayload,
  normalizePromptsPayload,
  normalizeVoicePayload,
  normalizeRenderPayload,
  normalizeProjectBuildPayload,
  normalizeStepPayload,
};
