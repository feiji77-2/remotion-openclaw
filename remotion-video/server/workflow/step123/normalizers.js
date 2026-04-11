const {clone, normalizeTopicResearch} = require('./context');

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCopyRequirements(requirements) {
  const normalized = {
    focus: String(requirements?.focus || '').trim(),
    avoid: String(requirements?.avoid || '').trim(),
    style: String(requirements?.style || '').trim(),
    length: String(requirements?.length || '').trim(),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function normalizeStep1Payload(stage1, stage2, input) {
  const current = clone(input.pipelineState?.analysis || {});
  const currentLayers = Array.isArray(current.layers) ? current.layers : [];
  const currentProcess = Array.isArray(current.process) ? current.process : [];
  const currentFacts = Array.isArray(current.researchFacts) ? current.researchFacts : [];

  return {
    topicResearch: normalizeTopicResearch(input.pipelineState?.topicResearch, input).topicResearch || null,
    selectedAnalysis: null,
    analysis: {
      thesis: String(stage2.analysis.thesis || current.thesis || '').trim(),
      audience: String(stage2.analysis.audience || current.audience || '').trim(),
      corePromise: String(stage2.analysis.corePromise || current.corePromise || '').trim(),
      analysisBrief: {
        mainQuestion: String(stage2.analysisBrief.mainQuestion || current.analysisBrief?.mainQuestion || stage1.mainQuestion || '').trim(),
        audienceFocus: String(stage2.analysisBrief.audienceFocus || current.analysisBrief?.audienceFocus || stage1.audienceFocus || '').trim(),
        narrativeApproach: String(stage2.analysisBrief.narrativeApproach || current.analysisBrief?.narrativeApproach || stage1.contentAngle || '').trim(),
        whyNow: String(stage2.analysisBrief.whyNow || current.analysisBrief?.whyNow || stage1.whyNow || '').trim(),
      },
      researchFacts: stage1.researchFacts.map((item, index) => ({
        id: currentFacts[index]?.id || `research-fact-${index + 1}`,
        label: String(item.label || currentFacts[index]?.label || `事实 ${index + 1}`).trim(),
        fact: String(item.fact || currentFacts[index]?.fact || '').trim(),
        evidenceAnchor: String(item.evidenceAnchor || currentFacts[index]?.evidenceAnchor || '').trim(),
        sourceTitle: String(item.sourceTitle || currentFacts[index]?.sourceTitle || '').trim(),
      })),
      layers: stage2.analysis.layers.map((layer, index) => ({
        id: currentLayers[index]?.id || `analysis-${index + 1}`,
        label: String(layer.label || currentLayers[index]?.label || `逻辑层 ${index + 1}`).trim(),
        insight: String(layer.insight || currentLayers[index]?.insight || '').trim(),
        evidence: String(layer.evidence || currentLayers[index]?.evidence || '').trim(),
      })),
      process: stage2.analysis.process.map((item, index) => ({
        id: currentProcess[index]?.id || `analysis-p${index + 1}`,
        label: String(item.label || currentProcess[index]?.label || `步骤 ${index + 1}`).trim(),
        detail: String(item.detail || currentProcess[index]?.detail || '').trim(),
      })),
    },
  };
}

function normalizeStep2Payload(stage1, stage2, input) {
  const current = clone(input.pipelineState?.titles || {});
  const previousOptions = Array.isArray(current.options) ? current.options : [];
  const previousStrategies = Array.isArray(current.strategies) ? current.strategies : [];
  const normalizedOptions = stage2.titles.options.map((option, index) => {
    const previous = previousOptions[index] || {};
    const fallbackId = previous.id || `title-${Date.now()}-${index + 1}`;
    return {
      id: String(option.id || previous.id || fallbackId),
      title: String(option.title || previous.title || `标题 ${index + 1}`).trim(),
      angle: String(option.angle || previous.angle || '解释型').trim(),
      score: clamp(Math.round(toNumber(option.score, previous.score || 80)), 0, 100),
      rationale: String(option.rationale || previous.rationale || '').trim(),
      evidenceAnchor: String(option.evidenceAnchor || previous.evidenceAnchor || '').trim(),
      hookStyle: String(option.hookStyle || previous.hookStyle || '').trim(),
    };
  });
  const requestedSelectedId = input.pipelineState?.selectedTitleId;
  const selectedIndex = clamp(Math.round(toNumber(stage2.titles.selectedIndex, 0)), 0, Math.max(0, normalizedOptions.length - 1));
  const selectedId = normalizedOptions.find((item) => item.id === requestedSelectedId)?.id
    || normalizedOptions[selectedIndex]?.id
    || normalizedOptions[0]?.id
    || null;

  return {
    projectName: String(stage2.projectName || input.projectState?.name || '').trim(),
    titles: {
      ...current,
      strategies: stage1.strategies.map((item, index) => ({
        id: previousStrategies[index]?.id || `title-strategy-${index + 1}`,
        angle: String(item.angle || previousStrategies[index]?.angle || '').trim(),
        audienceTrigger: String(item.audienceTrigger || previousStrategies[index]?.audienceTrigger || '').trim(),
        evidenceAnchor: String(item.evidenceAnchor || previousStrategies[index]?.evidenceAnchor || '').trim(),
        hookStyle: String(item.hookStyle || previousStrategies[index]?.hookStyle || '').trim(),
        rationale: String(item.rationale || previousStrategies[index]?.rationale || '').trim(),
      })),
      directionSummary: String(stage1.directionSummary || current.directionSummary || '').trim(),
      options: normalizedOptions,
      selectedId,
      selectedReason: String(stage2.titles.selectedReason || current.selectedReason || '').trim(),
    },
  };
}

function normalizeStep3Payload(stage1, stage2, input) {
  const current = clone(input.pipelineState?.copy || {});
  const currentBody = Array.isArray(current.body) ? current.body : [];
  const currentOutline = Array.isArray(current.outline) ? current.outline : [];

  return {
    copy: {
      requirements: normalizeCopyRequirements(current.requirements),
      hook: String(stage2.copy.hook || current.hook || '').trim(),
      brief: {
        hookAngle: String(stage1.brief.hookAngle || current.brief?.hookAngle || '').trim(),
        tone: String(stage1.brief.tone || current.brief?.tone || '').trim(),
        pacing: String(stage1.brief.pacing || current.brief?.pacing || '').trim(),
        ctaIntent: String(stage1.brief.ctaIntent || current.brief?.ctaIntent || '').trim(),
      },
      outline: stage1.outline.map((item, index) => ({
        id: currentOutline[index]?.id || `copy-outline-${index + 1}`,
        label: String(item.label || currentOutline[index]?.label || `节拍 ${index + 1}`).trim(),
        beat: String(item.beat || currentOutline[index]?.beat || '').trim(),
        goal: String(item.goal || currentOutline[index]?.goal || '').trim(),
        evidenceAnchor: String(item.evidenceAnchor || currentOutline[index]?.evidenceAnchor || '').trim(),
      })),
      body: stage2.copy.body.map((item, index) => ({
        id: currentBody[index]?.id || `copy-${index + 1}`,
        label: String(item.label || currentBody[index]?.label || `段落 ${index + 1}`).trim(),
        text: String(item.text || currentBody[index]?.text || '').trim(),
      })),
      cta: String(stage2.copy.cta || current.cta || '').trim(),
    },
  };
}

module.exports = {
  normalizeStep1Payload,
  normalizeStep2Payload,
  normalizeStep3Payload,
};
