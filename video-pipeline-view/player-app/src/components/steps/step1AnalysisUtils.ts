// ── Types ────────────────────────────────────────────────────────────────────

export interface ResearchFact {
  id?: string;
  label?: string;
  fact?: string;
  evidenceAnchor?: string;
  sourceTitle?: string;
}

export interface AnalysisLayer {
  id?: string;
  label?: string;
  insight?: string;
  evidence?: string;
}

export interface AnalysisProcessItem {
  id?: string;
  label?: string;
  detail?: string;
}

export interface AnalysisBrief {
  mainQuestion?: string;
  audienceFocus?: string;
  narrativeApproach?: string;
  whyNow?: string;
}

export interface AnalysisData {
  thesis?: string;
  audience?: string;
  corePromise?: string;
  analysisBrief?: AnalysisBrief;
  researchFacts?: ResearchFact[];
  layers?: AnalysisLayer[];
  process?: AnalysisProcessItem[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_BRIEF: AnalysisBrief = {
  mainQuestion: '',
  audienceFocus: '',
  narrativeApproach: '',
  whyNow: '',
};

// ── Predicates ──────────────────────────────────────────────────────────────

export function hasText(value: unknown): boolean {
  return String(value || '').trim().length > 0;
}

export function isMeaningfulFact(item: ResearchFact | null | undefined): boolean {
  return Boolean(hasText(item?.fact) || hasText(item?.evidenceAnchor) || hasText(item?.sourceTitle));
}

export function isMeaningfulLayer(item: AnalysisLayer | null | undefined): boolean {
  return Boolean(hasText(item?.insight) || hasText(item?.evidence));
}

export function isMeaningfulProcess(item: AnalysisProcessItem | null | undefined): boolean {
  return Boolean(hasText(item?.detail));
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createFact(index: number): ResearchFact {
  return {
    id: `research-fact-${index + 1}`,
    label: `事实 ${index + 1}`,
    fact: '',
    evidenceAnchor: '',
    sourceTitle: '',
  };
}

export function createLayer(index: number): AnalysisLayer {
  return {
    id: `analysis-layer-${index + 1}`,
    label: `逻辑层 ${index + 1}`,
    insight: '',
    evidence: '',
  };
}

export function createProcess(index: number): AnalysisProcessItem {
  return {
    id: `analysis-process-${index + 1}`,
    label: `步骤 ${index + 1}`,
    detail: '',
  };
}

// ── Draft builder ──────────────────────────────────────────────────────────

export function buildDraft(data: AnalysisData | null): AnalysisData {
  return {
    thesis: data?.thesis || '',
    audience: data?.audience || '',
    corePromise: data?.corePromise || '',
    analysisBrief: {
      ...DEFAULT_BRIEF,
      ...(data?.analysisBrief || {}),
    },
    researchFacts:
      Array.isArray(data?.researchFacts) && data.researchFacts.length > 0
        ? data.researchFacts.map((item, index) => ({
            id: item.id || `research-fact-${index + 1}`,
            label: item.label || `事实 ${index + 1}`,
            fact: item.fact || '',
            evidenceAnchor: item.evidenceAnchor || '',
            sourceTitle: item.sourceTitle || '',
          }))
        : [createFact(0), createFact(1), createFact(2)],
    layers:
      Array.isArray(data?.layers) && data.layers.length > 0
        ? data.layers.map((item, index) => ({
            id: item.id || `analysis-layer-${index + 1}`,
            label: item.label || `逻辑层 ${index + 1}`,
            insight: item.insight || '',
            evidence: item.evidence || '',
          }))
        : [createLayer(0), createLayer(1), createLayer(2)],
    process:
      Array.isArray(data?.process) && data.process.length > 0
        ? data.process.map((item, index) => ({
            id: item.id || `analysis-process-${index + 1}`,
            label: item.label || `步骤 ${index + 1}`,
            detail: item.detail || '',
          }))
        : [createProcess(0), createProcess(1), createProcess(2)],
  };
}

// ── Sanitizer ───────────────────────────────────────────────────────────────

export function sanitizeDraft(data: AnalysisData): AnalysisData {
  return {
    thesis: String(data.thesis || '').trim(),
    audience: String(data.audience || '').trim(),
    corePromise: String(data.corePromise || '').trim(),
    analysisBrief: {
      mainQuestion: String(data.analysisBrief?.mainQuestion || '').trim(),
      audienceFocus: String(data.analysisBrief?.audienceFocus || '').trim(),
      narrativeApproach: String(data.analysisBrief?.narrativeApproach || '').trim(),
      whyNow: String(data.analysisBrief?.whyNow || '').trim(),
    },
    researchFacts: (Array.isArray(data.researchFacts) ? data.researchFacts : [])
      .map((item, index) => ({
        id: item.id || `research-fact-${index + 1}`,
        label: String(item.label || `事实 ${index + 1}`).trim(),
        fact: String(item.fact || '').trim(),
        evidenceAnchor: String(item.evidenceAnchor || '').trim(),
        sourceTitle: String(item.sourceTitle || '').trim(),
      }))
      .filter((item) => hasText(item.fact) || hasText(item.evidenceAnchor) || hasText(item.sourceTitle)),
    layers: (Array.isArray(data.layers) ? data.layers : [])
      .map((item, index) => ({
        id: item.id || `analysis-layer-${index + 1}`,
        label: String(item.label || `逻辑层 ${index + 1}`).trim(),
        insight: String(item.insight || '').trim(),
        evidence: String(item.evidence || '').trim(),
      }))
      .filter((item) => hasText(item.insight) || hasText(item.evidence)),
    process: (Array.isArray(data.process) ? data.process : [])
      .map((item, index) => ({
        id: item.id || `analysis-process-${index + 1}`,
        label: String(item.label || `步骤 ${index + 1}`).trim(),
        detail: String(item.detail || '').trim(),
      }))
      .filter((item) => hasText(item.detail)),
  };
}

export function hasMeaningfulAnalysis(data: AnalysisData | null): boolean {
  if (!data) return false;
  const normalized = sanitizeDraft(buildDraft(data));
  return Boolean(
    normalized.thesis
    || normalized.audience
    || normalized.corePromise
    || normalized.researchFacts?.length
    || normalized.layers?.length
    || normalized.process?.length,
  );
}
