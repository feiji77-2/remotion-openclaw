import React, {useMemo} from 'react';
import {usePersistentStepEditor} from './usePersistentStepEditor';

interface ResearchFact {
  id?: string;
  label?: string;
  fact?: string;
  evidenceAnchor?: string;
  sourceTitle?: string;
}

interface AnalysisBrief {
  mainQuestion?: string;
  audienceFocus?: string;
  narrativeApproach?: string;
  whyNow?: string;
}

interface AnalysisLayer {
  id?: string;
  label?: string;
  insight?: string;
  evidence?: string;
}

interface AnalysisProcessItem {
  id?: string;
  label?: string;
  detail?: string;
}

interface TopicResearchResult {
  title?: string;
  snippet?: string;
  publishedAt?: string;
}

interface TopicResearch {
  results?: TopicResearchResult[];
}

interface AnalysisData {
  thesis?: string;
  audience?: string;
  corePromise?: string;
  analysisBrief?: AnalysisBrief | null;
  researchFacts?: ResearchFact[];
  layers?: AnalysisLayer[];
  process?: AnalysisProcessItem[];
}

interface Step1AnalysisProps {
  data: AnalysisData | null;
  topicResearch?: TopicResearch | null;
  titleKeywords: string;
  appliedTitleKeywords: string;
  hasPendingTitleKeywords: boolean;
  loading: boolean;
  confirmed: boolean;
  onGenerate: () => void;
  onApplyTitleKeywords: () => void;
  onConfirm: () => void;
  onUpdate: (updated: AnalysisData) => void;
  workbenchMode?: boolean;
}

const DEFAULT_BRIEF: AnalysisBrief = {
  mainQuestion: '',
  audienceFocus: '',
  narrativeApproach: '',
  whyNow: '',
};

function hasText(value: unknown) {
  return String(value || '').trim().length > 0;
}

function isMeaningfulFact(item: ResearchFact | null | undefined) {
  return Boolean(
    hasText(item?.fact)
    || hasText(item?.evidenceAnchor)
    || hasText(item?.sourceTitle),
  );
}

function isMeaningfulLayer(item: AnalysisLayer | null | undefined) {
  return Boolean(hasText(item?.insight) || hasText(item?.evidence));
}

function isMeaningfulProcess(item: AnalysisProcessItem | null | undefined) {
  return Boolean(hasText(item?.detail));
}

function createFact(index: number): ResearchFact {
  return {
    id: `research-fact-${index + 1}`,
    label: `事实 ${index + 1}`,
    fact: '',
    evidenceAnchor: '',
    sourceTitle: '',
  };
}

function createLayer(index: number): AnalysisLayer {
  return {
    id: `analysis-layer-${index + 1}`,
    label: `逻辑层 ${index + 1}`,
    insight: '',
    evidence: '',
  };
}

function createProcess(index: number): AnalysisProcessItem {
  return {
    id: `analysis-process-${index + 1}`,
    label: `步骤 ${index + 1}`,
    detail: '',
  };
}

function buildDraft(data: AnalysisData | null): AnalysisData {
  return {
    thesis: data?.thesis || '',
    audience: data?.audience || '',
    corePromise: data?.corePromise || '',
    analysisBrief: {
      ...DEFAULT_BRIEF,
      ...(data?.analysisBrief || {}),
    },
    researchFacts: Array.isArray(data?.researchFacts) && data.researchFacts.length > 0
      ? data.researchFacts.map((item, index) => ({
        id: item.id || `research-fact-${index + 1}`,
        label: item.label || `事实 ${index + 1}`,
        fact: item.fact || '',
        evidenceAnchor: item.evidenceAnchor || '',
        sourceTitle: item.sourceTitle || '',
      }))
      : [createFact(0), createFact(1), createFact(2)],
    layers: Array.isArray(data?.layers) && data.layers.length > 0
      ? data.layers.map((item, index) => ({
        id: item.id || `analysis-layer-${index + 1}`,
        label: item.label || `逻辑层 ${index + 1}`,
        insight: item.insight || '',
        evidence: item.evidence || '',
      }))
      : [createLayer(0), createLayer(1), createLayer(2)],
    process: Array.isArray(data?.process) && data.process.length > 0
      ? data.process.map((item, index) => ({
        id: item.id || `analysis-process-${index + 1}`,
        label: item.label || `步骤 ${index + 1}`,
        detail: item.detail || '',
      }))
      : [createProcess(0), createProcess(1), createProcess(2)],
  };
}

function sanitizeDraft(data: AnalysisData): AnalysisData {
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

function hasMeaningfulAnalysis(data: AnalysisData | null) {
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

export const Step1Analysis: React.FC<Step1AnalysisProps> = ({
  data,
  topicResearch,
  titleKeywords,
  hasPendingTitleKeywords,
  loading,
  confirmed,
  onGenerate,
  onApplyTitleKeywords,
  onConfirm,
  onUpdate,
  workbenchMode = false,
}) => {
  const normalized = useMemo(() => buildDraft(data), [data]);
  const hasContent = useMemo(() => hasMeaningfulAnalysis(data), [data]);
  const normalizedTitleKeywords = useMemo(() => String(titleKeywords || '').trim(), [titleKeywords]);
  const sourceResults = Array.isArray(topicResearch?.results) ? topicResearch.results : [];
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<AnalysisData>('remotion-step-editor-step1-analysis');

  const current = editing && draft ? draft : normalized;
  const visibleResearchFacts = useMemo(
    () => (editing ? (current.researchFacts || []) : (current.researchFacts || []).filter(isMeaningfulFact)),
    [current.researchFacts, editing],
  );
  const visibleLayers = useMemo(
    () => (editing ? (current.layers || []) : (current.layers || []).filter(isMeaningfulLayer)),
    [current.layers, editing],
  );
  const visibleProcess = useMemo(
    () => (editing ? (current.process || []) : (current.process || []).filter(isMeaningfulProcess)),
    [current.process, editing],
  );
  const compactSourceResults = useMemo(
    () => sourceResults
      .filter((item) => hasText(item.title) || hasText(item.snippet))
      .slice(0, 3),
    [sourceResults],
  );

  const openEditor = () => {
    setDraft(buildDraft(data));
    setEditing(true);
  };

  const saveEditor = () => {
    if (!draft) return;
    onUpdate(sanitizeDraft(draft));
    clearEditor();
  };

  const triggerGeneration = () => {
    if (hasPendingTitleKeywords) {
      onApplyTitleKeywords();
      return;
    }
    onGenerate();
  };

  const triggerConfirm = () => {
    if (hasPendingTitleKeywords) {
      onApplyTitleKeywords();
      return;
    }
    onConfirm();
  };

  const updateDraftField = (field: keyof AnalysisData, value: string) => {
    setDraft((prev) => ({...(prev || buildDraft(data)), [field]: value}));
  };

  const updateFact = (index: number, field: keyof ResearchFact, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextFacts = (base.researchFacts || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, researchFacts: nextFacts};
    });
  };

  const addFact = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        researchFacts: [...(base.researchFacts || []), createFact((base.researchFacts || []).length)],
      };
    });
  };

  const removeFact = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        researchFacts: (base.researchFacts || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const updateLayer = (index: number, field: keyof AnalysisLayer, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextLayers = (base.layers || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, layers: nextLayers};
    });
  };

  const addLayer = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        layers: [...(base.layers || []), createLayer((base.layers || []).length)],
      };
    });
  };

  const removeLayer = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        layers: (base.layers || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const updateProcess = (index: number, field: keyof AnalysisProcessItem, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextProcess = (base.process || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, process: nextProcess};
    });
  };

  const addProcess = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        process: [...(base.process || []), createProcess((base.process || []).length)],
      };
    });
  };

  const removeProcess = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        process: (base.process || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  if (!hasContent && !editing) {
    if (workbenchMode) {
      return (
        <div className="wf-step1-root">
          <div className="wf-inline-empty wf-inline-empty-workbench">
            还没有逻辑分析结果，先确认主题和 skill 再生成。
          </div>
        </div>
      );
    }

    return (
      <div className="wf-step1-root">
        <div className="wf-stage-hero">
          <div className="wf-stage-hero-copy">
            <span className="wf-stage-kicker">Step 1</span>
            <h4>先把可用事实和分析骨架拉出来</h4>
            <p>{normalizedTitleKeywords || '请输入标题关键词后开始检索与分析。'}</p>
          </div>
          <div className="wf-stage-action-row">
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'is-loading' : ''}`}
              onClick={triggerGeneration}
              disabled={loading}
            >
              {loading ? '生成中...' : hasPendingTitleKeywords ? '确认标题并生成' : '确认标题并生成'}
            </button>
            <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor}>
              手动搭建分析骨架
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-step1-root">
      {workbenchMode ? (
        <div className="wf-result-toolbar">
          <div className="wf-result-toolbar-meta">
            {normalizedTitleKeywords ? <span className="wf-stat-pill">{normalizedTitleKeywords}</span> : null}
            {sourceResults.length > 0 ? <span className="wf-stat-pill">搜索 {sourceResults.length}</span> : null}
            {visibleResearchFacts.length > 0 ? <span className="wf-stat-pill">事实 {visibleResearchFacts.length}</span> : null}
            {visibleProcess.length > 0 ? <span className="wf-stat-pill">路径 {visibleProcess.length}</span> : null}
          </div>
          <div className="wf-stage-action-row">
            {editing ? (
              <>
                <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存分析</button>
                <button type="button" className="wf-btn wf-btn-cancel" onClick={clearEditor}>取消</button>
              </>
            ) : (
              <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
                编辑结果
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`wf-stage-hero wf-stage-hero-compact ${hasPendingTitleKeywords ? 'is-pending' : ''}`}>
          <div className="wf-stage-hero-copy">
            <span className="wf-stage-kicker">搜索入口</span>
            <h4>{normalizedTitleKeywords || '未输入标题关键词'}</h4>
            {hasPendingTitleKeywords ? (
              <p>当前结果还是旧标题版本，先同步最新标题。</p>
            ) : null}
          </div>
          <div className="wf-stage-action-row">
            {sourceResults.length > 0 ? <span className="wf-stat-pill">搜索 {sourceResults.length}</span> : null}
            {visibleResearchFacts.length > 0 ? <span className="wf-stat-pill">事实 {visibleResearchFacts.length}</span> : null}
            {visibleLayers.length > 0 ? <span className="wf-stat-pill">逻辑 {visibleLayers.length}</span> : null}
            {editing ? (
              <>
                <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存分析</button>
                <button type="button" className="wf-btn wf-btn-cancel" onClick={clearEditor}>取消</button>
              </>
            ) : (
              <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
                编辑 Step 1
              </button>
            )}
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'loading' : ''}`}
              onClick={triggerGeneration}
              disabled={loading}
            >
              {loading ? '生成中...' : hasPendingTitleKeywords ? '确认标题并生成' : '重新生成'}
            </button>
          </div>
        </div>
      )}

      <section className="wf-struct-section">
        <div className="wf-struct-head">
          <span className="wf-stage-kicker">搜索事实</span>
          {editing ? (
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addFact}>+ 添加事实</button>
          ) : (
            <span className="wf-struct-count">{visibleResearchFacts.length || 0} 条</span>
          )}
        </div>

        {editing && sourceResults.length > 0 ? (
          <div className="wf-source-list">
            {sourceResults.map((item, index) => (
              <div key={`${item.title || 'source'}-${index}`} className="wf-source-item">
                <strong>{item.title || `搜索结果 ${index + 1}`}</strong>
                <p>{item.snippet || '暂无摘要'}</p>
                <small>{item.publishedAt || '公开搜索结果'}</small>
              </div>
            ))}
          </div>
        ) : null}
        {!editing && compactSourceResults.length > 0 ? (
          <div className="wf-source-strip">
            {compactSourceResults.map((item, index) => (
              <span key={`${item.title || 'source-chip'}-${index}`} className="wf-source-chip">
                {item.title || item.snippet || `搜索结果 ${index + 1}`}
              </span>
            ))}
          </div>
        ) : null}

        <div className="wf-fact-list">
          {visibleResearchFacts.length > 0 ? visibleResearchFacts.map((item, index) => (
            <div key={item.id || index} className={`wf-fact-card ${editing ? '' : 'is-compact'}`}>
              <div className="wf-fact-card-top">
                <span className="wf-badge-index">{index + 1}</span>
                {editing ? (
                  <button type="button" className="wf-btn-remove-block" onClick={() => removeFact(index)}>删除</button>
                ) : null}
              </div>
              {editing ? (
                <div className="wf-form-stack">
                  <input
                    className="wf-edit-label-input"
                    value={item.label || ''}
                    onChange={(event) => updateFact(index, 'label', event.target.value)}
                    placeholder="事实标签"
                  />
                  <textarea
                    className="wf-edit-textarea"
                    rows={3}
                    value={item.fact || ''}
                    onChange={(event) => updateFact(index, 'fact', event.target.value)}
                    placeholder="提炼出的事实内容"
                  />
                  <input
                    className="wf-edit-label-input"
                    value={item.evidenceAnchor || ''}
                    onChange={(event) => updateFact(index, 'evidenceAnchor', event.target.value)}
                    placeholder="证据锚点"
                  />
                  <input
                    className="wf-edit-label-input"
                    value={item.sourceTitle || ''}
                    onChange={(event) => updateFact(index, 'sourceTitle', event.target.value)}
                    placeholder="来源标题"
                  />
                </div>
              ) : (
                <div className="wf-fact-card-copy">
                  <strong>{item.label || `事实 ${index + 1}`}</strong>
                  {item.fact ? <p>{item.fact}</p> : null}
                  <div className="wf-fact-meta">
                    {item.evidenceAnchor ? <span>{item.evidenceAnchor}</span> : null}
                    {item.sourceTitle ? <small>{item.sourceTitle}</small> : null}
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="wf-inline-empty">暂无有效事实，建议重生成一次。</div>
          )}
        </div>
      </section>

      <section className="wf-struct-section">
        <div className="wf-struct-head">
          <span className="wf-stage-kicker">{workbenchMode && !editing ? '主结论' : '分析骨架'}</span>
          {editing ? (
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addLayer}>+ 添加逻辑层</button>
          ) : (
            <span className="wf-struct-count">{workbenchMode ? '结论已收敛' : `${visibleLayers.length || 0} 层`}</span>
          )}
        </div>

        <div className={`wf-summary-grid ${workbenchMode ? '' : 'wf-summary-grid-expanded'}`}>
          <div className={`wf-summary-item ${workbenchMode ? 'wf-step1-thesis-block' : ''}`}>
            <span className="wf-summary-key">主命题</span>
            {editing ? (
              <textarea className="wf-edit-textarea" rows={3} value={current.thesis || ''} onChange={(event) => updateDraftField('thesis', event.target.value)} />
            ) : (
              <strong className="wf-summary-highlight">{current.thesis || '待生成主命题'}</strong>
            )}
            {!editing && workbenchMode ? (
              <div className="wf-meta-pills">
                {current.audience ? <span className="wf-keyword-tag">{current.audience}</span> : null}
                {current.corePromise ? <span className="wf-keyword-tag">{current.corePromise}</span> : null}
              </div>
            ) : null}
          </div>
          {!workbenchMode || editing ? (
            <>
              <div className="wf-summary-item">
                <span className="wf-summary-key">受众画像</span>
                {editing ? (
                  <textarea className="wf-edit-textarea" rows={3} value={current.audience || ''} onChange={(event) => updateDraftField('audience', event.target.value)} />
                ) : (
                  <p className="wf-summary-copy">{current.audience || '待生成受众画像'}</p>
                )}
              </div>
              <div className="wf-summary-item">
                <span className="wf-summary-key">核心承诺</span>
                {editing ? (
                  <textarea className="wf-edit-textarea" rows={3} value={current.corePromise || ''} onChange={(event) => updateDraftField('corePromise', event.target.value)} />
                ) : (
                  <p className="wf-summary-copy">{current.corePromise || '待生成核心承诺'}</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {!workbenchMode || editing ? (
          <div className="wf-detail-list">
            {visibleLayers.length > 0 ? visibleLayers.map((item, index) => (
              <div key={item.id || index} className={`wf-detail-card ${editing ? '' : 'is-compact'}`}>
                <div className="wf-detail-card-top">
                  <strong>{item.label || `逻辑层 ${index + 1}`}</strong>
                  {editing ? (
                    <button type="button" className="wf-btn-remove-block" onClick={() => removeLayer(index)}>删除</button>
                  ) : null}
                </div>
                {editing ? (
                  <div className="wf-form-stack">
                    <input
                      className="wf-edit-label-input"
                      value={item.label || ''}
                      onChange={(event) => updateLayer(index, 'label', event.target.value)}
                      placeholder="逻辑层标签"
                    />
                    <textarea
                      className="wf-edit-textarea"
                      rows={3}
                      value={item.insight || ''}
                      onChange={(event) => updateLayer(index, 'insight', event.target.value)}
                      placeholder="这一层要讲清的洞察"
                    />
                    <textarea
                      className="wf-edit-textarea"
                      rows={2}
                      value={item.evidence || ''}
                      onChange={(event) => updateLayer(index, 'evidence', event.target.value)}
                      placeholder="对应证据"
                    />
                  </div>
                ) : (
                  <div className="wf-detail-card-copy">
                    {item.insight ? <p>{item.insight}</p> : null}
                    {item.evidence ? <small>{item.evidence}</small> : null}
                  </div>
                )}
              </div>
            )) : (
              <div className="wf-inline-empty">暂无可用逻辑层。</div>
            )}
          </div>
        ) : null}
      </section>

      <section className="wf-struct-section">
        <div className="wf-struct-head">
          <span className="wf-stage-kicker">执行路径</span>
          {editing ? (
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addProcess}>+ 添加步骤</button>
          ) : (
            <span className="wf-struct-count">{visibleProcess.length || 0} 步</span>
          )}
        </div>

        <div className="wf-detail-list">
          {visibleProcess.length > 0 ? visibleProcess.map((item, index) => (
            <div key={item.id || index} className={`wf-detail-card wf-detail-card-inline ${editing ? '' : 'is-compact'}`}>
              <div className="wf-detail-card-top">
                <strong>{item.label || `步骤 ${index + 1}`}</strong>
                {editing ? (
                  <button type="button" className="wf-btn-remove-block" onClick={() => removeProcess(index)}>删除</button>
                ) : null}
              </div>
              {editing ? (
                <div className="wf-form-stack">
                  <input
                    className="wf-edit-label-input"
                    value={item.label || ''}
                    onChange={(event) => updateProcess(index, 'label', event.target.value)}
                    placeholder="步骤名称"
                  />
                  <textarea
                    className="wf-edit-textarea"
                    rows={3}
                    value={item.detail || ''}
                    onChange={(event) => updateProcess(index, 'detail', event.target.value)}
                    placeholder="步骤说明"
                  />
                </div>
              ) : (
                <div className="wf-detail-card-copy">
                  <p>{item.detail}</p>
                </div>
              )}
            </div>
          )) : (
            <div className="wf-inline-empty">暂无执行路径。</div>
          )}
        </div>
      </section>

      {!workbenchMode ? (
        <div className="wf-confirm-row">
          <div className="wf-confirm-note">
            {hasPendingTitleKeywords
              ? '标题有变更，确认会先重跑。'
              : confirmed
                ? '已确认，可进入 Step 2。'
                : '确认后供 Step 2 使用。'}
          </div>
          <button
            type="button"
            className={`wf-btn wf-btn-confirm ${confirmed && !hasPendingTitleKeywords ? 'active' : ''}`}
            onClick={triggerConfirm}
            disabled={loading}
          >
            {hasPendingTitleKeywords
              ? '确认标题并生成'
              : confirmed
                ? '✓ 已确认逻辑分析'
                : '确认当前逻辑分析'}
          </button>
        </div>
      ) : null}
    </div>
  );
};
