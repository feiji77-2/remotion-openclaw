import React, {useMemo} from 'react';
import {usePersistentStepEditor} from './usePersistentStepEditor';
export type {ResearchFact, AnalysisLayer, AnalysisProcessItem, AnalysisBrief, AnalysisData} from './step1AnalysisUtils';
import {
  buildDraft,
  sanitizeDraft,
  hasMeaningfulAnalysis,
  hasText,
  isMeaningfulFact,
  isMeaningfulLayer,
  isMeaningfulProcess,
  createFact,
  createLayer,
  createProcess,
} from './step1AnalysisUtils';
import type {ResearchFact, AnalysisLayer, AnalysisProcessItem, AnalysisData} from './step1AnalysisUtils';

// ── Props interface ─────────────────────────────────────────────────────────

interface Step1AnalysisProps {
  data: AnalysisData | null;
  topicResearch: {results?: Array<{title?: string; snippet?: string}>};
  titleKeywords?: string;
  appliedTitleKeywords?: string;
  hasPendingTitleKeywords?: boolean;
  loading?: boolean;
  confirmed?: boolean;
  onGenerate: () => void;
  onApplyTitleKeywords: () => void;
  onConfirm: () => void;
  onUpdate: (updated: AnalysisData) => void;
  workbenchMode?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

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
    () => sourceResults.filter((item) => hasText(item.title) || hasText(item.snippet)).slice(0, 3),
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

  const updateFact = (index: number, field: keyof ResearchFact, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextFacts = (base.researchFacts || []).map((item, itemIndex) =>
        itemIndex === index ? {...item, [field]: value} : item,
      );
      return {...base, researchFacts: nextFacts};
    });
  };

  const addFact = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, researchFacts: [...(base.researchFacts || []), createFact((base.researchFacts || []).length)]};
    });
  };

  const removeFact = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, researchFacts: (base.researchFacts || []).filter((_, itemIndex) => itemIndex !== index)};
    });
  };

  const updateLayer = (index: number, field: keyof AnalysisLayer, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextLayers = (base.layers || []).map((item, itemIndex) =>
        itemIndex === index ? {...item, [field]: value} : item,
      );
      return {...base, layers: nextLayers};
    });
  };

  const addLayer = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, layers: [...(base.layers || []), createLayer((base.layers || []).length)]};
    });
  };

  const removeLayer = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, layers: (base.layers || []).filter((_, itemIndex) => itemIndex !== index)};
    });
  };

  const updateProcess = (index: number, field: keyof AnalysisProcessItem, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextProcess = (base.process || []).map((item, itemIndex) =>
        itemIndex === index ? {...item, [field]: value} : item,
      );
      return {...base, process: nextProcess};
    });
  };

  const addProcess = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, process: [...(base.process || []), createProcess((base.process || []).length)]};
    });
  };

  const removeProcess = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {...base, process: (base.process || []).filter((_, itemIndex) => itemIndex !== index)};
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
              {loading ? '生成中...' : '确认标题并生成'}
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
            {hasPendingTitleKeywords ? <p>当前结果还是旧标题版本，先同步最新标题。</p> : null}
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
                编辑结果
              </button>
            )}
          </div>
        </div>
      )}

      {/* Facts */}
      {visibleResearchFacts.length > 0 && (
        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-label">核心事实</span>
            {editing && <button type="button" className="wf-btn wf-btn-add" onClick={addFact}>+ 事实</button>}
          </div>
          <div className="wf-fact-list">
            {visibleResearchFacts.map((item, index) => (
              <div key={item.id || index} className="wf-fact-row">
                <div className="wf-fact-label">{item.label}</div>
                <textarea
                  className="wf-fact-input"
                  value={item.fact || ''}
                  onChange={(e) => updateFact(index, 'fact', e.target.value)}
                  placeholder="输入事实..."
                  rows={2}
                  disabled={!editing}
                />
                <textarea
                  className="wf-fact-input"
                  value={item.evidenceAnchor || ''}
                  onChange={(e) => updateFact(index, 'evidenceAnchor', e.target.value)}
                  placeholder="证据锚点..."
                  rows={1}
                  disabled={!editing}
                />
                <textarea
                  className="wf-fact-input"
                  value={item.sourceTitle || ''}
                  onChange={(e) => updateFact(index, 'sourceTitle', e.target.value)}
                  placeholder="来源标题..."
                  rows={1}
                  disabled={!editing}
                />
                {editing && (
                  <button type="button" className="wf-btn wf-btn-remove" onClick={() => removeFact(index)}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layers */}
      {visibleLayers.length > 0 && (
        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-label">逻辑层</span>
            {editing && <button type="button" className="wf-btn wf-btn-add" onClick={addLayer}>+ 逻辑层</button>}
          </div>
          <div className="wf-layer-list">
            {visibleLayers.map((item, index) => (
              <div key={item.id || index} className="wf-layer-row">
                <div className="wf-layer-label">{item.label}</div>
                <textarea
                  className="wf-layer-input"
                  value={item.insight || ''}
                  onChange={(e) => updateLayer(index, 'insight', e.target.value)}
                  placeholder="洞察..."
                  rows={2}
                  disabled={!editing}
                />
                <textarea
                  className="wf-layer-input"
                  value={item.evidence || ''}
                  onChange={(e) => updateLayer(index, 'evidence', e.target.value)}
                  placeholder="证据..."
                  rows={1}
                  disabled={!editing}
                />
                {editing && (
                  <button type="button" className="wf-btn wf-btn-remove" onClick={() => removeLayer(index)}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process */}
      {visibleProcess.length > 0 && (
        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-label">分析路径</span>
            {editing && <button type="button" className="wf-btn wf-btn-add" onClick={addProcess}>+ 步骤</button>}
          </div>
          <div className="wf-process-list">
            {visibleProcess.map((item, index) => (
              <div key={item.id || index} className="wf-process-row">
                <div className="wf-process-label">{item.label}</div>
                <textarea
                  className="wf-process-input"
                  value={item.detail || ''}
                  onChange={(e) => updateProcess(index, 'detail', e.target.value)}
                  placeholder="步骤详情..."
                  rows={2}
                  disabled={!editing}
                />
                {editing && (
                  <button type="button" className="wf-btn wf-btn-remove" onClick={() => removeProcess(index)}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source results */}
      {compactSourceResults.length > 0 && (
        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-label">参考来源</span>
          </div>
          <div className="wf-source-list">
            {compactSourceResults.map((item, index) => (
              <div key={index} className="wf-source-item">
                <span className="wf-source-title">{item.title}</span>
                <span className="wf-source-snippet">{item.snippet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="wf-stage-action-row">
        {!confirmed ? (
          <button
            type="button"
            className={`wf-btn wf-btn-primary ${loading ? 'is-loading' : ''}`}
            onClick={triggerGeneration}
            disabled={loading}
          >
            {loading ? '生成中...' : hasPendingTitleKeywords ? '确认标题并生成' : '重新生成'}
          </button>
        ) : (
          <span className="wf-confirmed-badge">已确认</span>
        )}
        <button type="button" className="wf-btn wf-btn-confirm" onClick={onConfirm} disabled={!hasContent || confirmed}>
          确认
        </button>
      </div>
    </div>
  );
};

export default Step1Analysis;
