import React, {useMemo} from 'react';
import {usePersistentStepEditor} from './usePersistentStepEditor';

interface TitleStrategy {
  id?: string;
  angle?: string;
  audienceTrigger?: string;
  evidenceAnchor?: string;
  hookStyle?: string;
  rationale?: string;
}

interface TitleOption {
  id?: string;
  title?: string;
  angle?: string;
  score?: number;
  rationale?: string;
  evidenceAnchor?: string;
  hookStyle?: string;
}

interface TitleData {
  strategies?: TitleStrategy[];
  directionSummary?: string;
  options?: TitleOption[];
  selectedId?: string | null;
  selectedReason?: string;
}

interface Step2TitleGenerationProps {
  data: TitleData | null;
  selectedTitleId: string | null;
  loading: boolean;
  confirmed: boolean;
  onGenerate: () => void;
  onConfirm: () => void;
  onSelectTitle: (titleId: string) => void;
  onUpdate: (updated: TitleData) => void;
  workbenchMode?: boolean;
}

function hasText(value: unknown) {
  return String(value || '').trim().length > 0;
}

function createStrategy(index: number): TitleStrategy {
  return {
    id: `title-strategy-${index + 1}`,
    angle: '',
    audienceTrigger: '',
    evidenceAnchor: '',
    hookStyle: '',
    rationale: '',
  };
}

function createOption(index: number): TitleOption {
  return {
    id: `manual-title-${index + 1}`,
    title: '',
    angle: '',
    score: 85 - index * 3,
    rationale: '',
    evidenceAnchor: '',
    hookStyle: '',
  };
}

function buildDraft(data: TitleData | null, selectedTitleId: string | null): TitleData {
  const options = Array.isArray(data?.options) && data.options.length > 0
    ? data.options.map((item, index) => ({
      id: item.id || `manual-title-${index + 1}`,
      title: item.title || '',
      angle: item.angle || '',
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : 80,
      rationale: item.rationale || '',
      evidenceAnchor: item.evidenceAnchor || '',
      hookStyle: item.hookStyle || '',
    }))
    : [createOption(0), createOption(1), createOption(2), createOption(3)];
  const strategies = Array.isArray(data?.strategies) && data.strategies.length > 0
    ? data.strategies.map((item, index) => ({
      id: item.id || `title-strategy-${index + 1}`,
      angle: item.angle || '',
      audienceTrigger: item.audienceTrigger || '',
      evidenceAnchor: item.evidenceAnchor || '',
      hookStyle: item.hookStyle || '',
      rationale: item.rationale || '',
    }))
    : options.slice(0, 3).map((item, index) => ({
      id: `title-strategy-${index + 1}`,
      angle: item.angle || '',
      audienceTrigger: '',
      evidenceAnchor: item.evidenceAnchor || '',
      hookStyle: item.hookStyle || '',
      rationale: item.rationale || '',
    }));
  const fallbackSelectedId = options.find((item) => item.id === selectedTitleId)?.id
    || options.find((item) => item.id === data?.selectedId)?.id
    || options[0]?.id
    || null;

  return {
    strategies,
    directionSummary: data?.directionSummary || '',
    options,
    selectedId: fallbackSelectedId,
    selectedReason: data?.selectedReason || '',
  };
}

function sanitizeDraft(data: TitleData): TitleData {
  const options = (Array.isArray(data.options) ? data.options : [])
    .map((item, index) => ({
      id: String(item.id || `manual-title-${index + 1}`),
      title: String(item.title || '').trim(),
      angle: String(item.angle || '').trim(),
      score: Math.min(100, Math.max(0, Math.round(Number(item.score) || 0))),
      rationale: String(item.rationale || '').trim(),
      evidenceAnchor: String(item.evidenceAnchor || '').trim(),
      hookStyle: String(item.hookStyle || '').trim(),
    }))
    .filter((item) => item.title);
  const strategies = (Array.isArray(data.strategies) ? data.strategies : [])
    .map((item, index) => ({
      id: item.id || `title-strategy-${index + 1}`,
      angle: String(item.angle || '').trim(),
      audienceTrigger: String(item.audienceTrigger || '').trim(),
      evidenceAnchor: String(item.evidenceAnchor || '').trim(),
      hookStyle: String(item.hookStyle || '').trim(),
      rationale: String(item.rationale || '').trim(),
    }))
    .filter((item) => item.angle || item.audienceTrigger || item.evidenceAnchor || item.hookStyle || item.rationale);
  const selectedId = options.find((item) => item.id === data.selectedId)?.id || options[0]?.id || null;

  return {
    strategies,
    directionSummary: String(data.directionSummary || '').trim(),
    options,
    selectedId,
    selectedReason: String(data.selectedReason || '').trim(),
  };
}

export const Step2TitleGeneration: React.FC<Step2TitleGenerationProps> = ({
  data,
  selectedTitleId,
  loading,
  confirmed,
  onGenerate,
  onConfirm,
  onSelectTitle,
  onUpdate,
  workbenchMode = false,
}) => {
  const normalized = useMemo(() => buildDraft(data, selectedTitleId), [data, selectedTitleId]);
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<TitleData>('remotion-step-editor-step2-titles');

  const current = editing && draft ? draft : normalized;
  const options = current.options || [];
  const strategies = current.strategies || [];
  const selectedId = current.selectedId || options[0]?.id || null;
  const selectedTitle = options.find((item) => item.id === selectedId) || options[0] || null;
  const hasOptions = options.some((item) => hasText(item.title));

  const openEditor = () => {
    setDraft(buildDraft(data, selectedTitleId));
    setEditing(true);
  };

  const saveEditor = () => {
    if (!draft) return;
    onUpdate(sanitizeDraft(draft));
    clearEditor();
  };

  const selectTitle = (titleId: string | null | undefined) => {
    if (!titleId) return;
    if (editing) {
      updateMeta({selectedId: titleId});
      return;
    }
    onSelectTitle(titleId);
  };

  const updateStrategy = (index: number, field: keyof TitleStrategy, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      const nextStrategies = (base.strategies || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, strategies: nextStrategies};
    });
  };

  const addStrategy = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      return {
        ...base,
        strategies: [...(base.strategies || []), createStrategy((base.strategies || []).length)],
      };
    });
  };

  const removeStrategy = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      return {
        ...base,
        strategies: (base.strategies || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const updateOption = (index: number, field: keyof TitleOption, value: string | number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      const nextOptions = (base.options || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, options: nextOptions};
    });
  };

  const updateMeta = (patch: Partial<TitleData>) => {
    setDraft((prev) => ({...buildDraft(prev || data, selectedTitleId), ...patch}));
  };

  const addOption = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      const nextOptions = [...(base.options || []), createOption((base.options || []).length)];
      return {
        ...base,
        options: nextOptions,
        selectedId: base.selectedId || nextOptions[0]?.id || null,
      };
    });
  };

  const removeOption = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data, selectedTitleId);
      const targetId = base.options?.[index]?.id;
      const nextOptions = (base.options || []).filter((_, itemIndex) => itemIndex !== index);
      const nextSelectedId = targetId && base.selectedId === targetId
        ? nextOptions[0]?.id || null
        : base.selectedId || nextOptions[0]?.id || null;
      return {
        ...base,
        options: nextOptions,
        selectedId: nextSelectedId,
      };
    });
  };

  if (!hasOptions && !editing) {
    if (workbenchMode) {
      return (
        <div className="wf-step2-root">
          <div className="wf-inline-empty wf-inline-empty-workbench">
            还没有标题结果，先按当前 skill 生成标题池。
          </div>
        </div>
      );
    }

    return (
      <div className="wf-step2-root">
        <div className="wf-stage-hero">
          <div className="wf-stage-hero-copy">
            <span className="wf-stage-kicker">Step 2</span>
            <h4>先定角度，再定标题池</h4>
            <p>这一步会先生成标题策略，再挑出主标题。</p>
          </div>
          <div className="wf-stage-action-row">
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'is-loading' : ''}`}
              onClick={onGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '生成标题策略与标题池'}
            </button>
            <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor}>
              手动搭建标题池
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-step2-root">
      {workbenchMode ? (
        <div className="wf-result-toolbar">
          <div className="wf-result-toolbar-meta">
            <span className="wf-stat-pill">候选 {options.filter((item) => hasText(item.title)).length || options.length} 条</span>
            <span className="wf-stat-pill">主推 {selectedTitle?.score ?? '--'} 分</span>
            {selectedTitle?.angle ? <span className="wf-stat-pill">{selectedTitle.angle}</span> : null}
          </div>
          <div className="wf-stage-action-row">
            {editing ? (
              <>
                <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存标题池</button>
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
        <div className="wf-stage-hero">
          <div className="wf-stage-hero-copy">
            <span className="wf-stage-kicker">标题主链</span>
            <h4>{selectedTitle?.title || '待选择主标题'}</h4>
            <p>{current.directionSummary || '先筛出有效角度，再挑最适合继续做 Hook 和分镜的主标题。'}</p>
          </div>
          <div className="wf-stage-action-row">
            <span className="wf-stat-pill">策略 {strategies.length} 张</span>
            <span className="wf-stat-pill">候选 {options.filter((item) => hasText(item.title)).length || options.length} 条</span>
            <span className="wf-stat-pill">主推 {selectedTitle?.score ?? '--'} 分</span>
            {editing ? (
              <>
                <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存标题池</button>
                <button type="button" className="wf-btn wf-btn-cancel" onClick={clearEditor}>取消</button>
              </>
            ) : (
              <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
                编辑 Step 2
              </button>
            )}
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'loading' : ''}`}
              onClick={onGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '重新生成'}
            </button>
          </div>
        </div>
      )}

      {!workbenchMode || editing ? (
        <section className="wf-struct-section">
          <div className="wf-struct-head">
            <div>
              <span className="wf-stage-kicker">标题策略</span>
              <h5>先把不同打法拆开</h5>
            </div>
            {editing ? (
              <button type="button" className="wf-btn wf-btn-add-block" onClick={addStrategy}>+ 添加策略</button>
            ) : null}
          </div>
          <div className="wf-strategy-grid">
            {strategies.map((item, index) => (
              <div key={item.id || index} className="wf-strategy-card">
                <div className="wf-detail-card-top">
                  <strong>{item.angle || `策略 ${index + 1}`}</strong>
                  {editing ? (
                    <button type="button" className="wf-btn-remove-block" onClick={() => removeStrategy(index)}>删除</button>
                  ) : null}
                </div>
                {editing ? (
                  <div className="wf-form-stack">
                    <input className="wf-edit-label-input" value={item.angle || ''} onChange={(event) => updateStrategy(index, 'angle', event.target.value)} placeholder="标题角度" />
                    <textarea className="wf-edit-textarea" rows={2} value={item.audienceTrigger || ''} onChange={(event) => updateStrategy(index, 'audienceTrigger', event.target.value)} placeholder="受众触发点" />
                    <input className="wf-edit-label-input" value={item.evidenceAnchor || ''} onChange={(event) => updateStrategy(index, 'evidenceAnchor', event.target.value)} placeholder="证据锚点" />
                    <input className="wf-edit-label-input" value={item.hookStyle || ''} onChange={(event) => updateStrategy(index, 'hookStyle', event.target.value)} placeholder="开场方式" />
                    <textarea className="wf-edit-textarea" rows={3} value={item.rationale || ''} onChange={(event) => updateStrategy(index, 'rationale', event.target.value)} placeholder="策略理由" />
                  </div>
                ) : (
                  <>
                    <p>{item.audienceTrigger || '待补充受众触发点'}</p>
                    <div className="wf-meta-pills">
                      <span className="wf-keyword-tag">{item.hookStyle || '待补充开场方式'}</span>
                      <span className="wf-keyword-tag">{item.evidenceAnchor || '待补充证据锚点'}</span>
                    </div>
                    <small>{item.rationale || '待补充策略理由'}</small>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wf-struct-section">
        <div className="wf-struct-head">
          <div>
            <span className="wf-stage-kicker">标题池</span>
            <h5>{workbenchMode ? '直接点选主标题' : '直接选主标题，不需要跳页'}</h5>
          </div>
          {editing ? (
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addOption}>+ 添加标题</button>
          ) : null}
        </div>
        <div className="wf-title-grid-upgraded">
          {options.map((option, index) => {
            const isActive = option.id === selectedId || (!selectedId && index === 0);
            return (
              <div
                key={option.id || index}
                className={`wf-title-option-card ${isActive ? 'active' : ''} ${editing ? '' : 'is-clickable'}`}
                role={editing ? undefined : 'button'}
                tabIndex={editing ? undefined : 0}
                onClick={editing ? undefined : () => selectTitle(option.id)}
                onKeyDown={editing ? undefined : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectTitle(option.id);
                  }
                }}
              >
                <div className="wf-title-option-top">
                  <button
                    type="button"
                    className={`wf-btn wf-btn-select ${isActive ? 'active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectTitle(option.id);
                    }}
                  >
                    {isActive ? '当前主标题' : '设为主标题'}
                  </button>
                  {editing ? (
                    <button
                      type="button"
                      className="wf-btn-remove-block"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeOption(index);
                      }}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
                {editing ? (
                  <div className="wf-form-stack">
                    <textarea className="wf-edit-textarea" rows={3} value={option.title || ''} onChange={(event) => updateOption(index, 'title', event.target.value)} placeholder="标题文案" />
                    <div className="wf-title-meta-grid">
                      <input className="wf-edit-label-input" value={option.angle || ''} onChange={(event) => updateOption(index, 'angle', event.target.value)} placeholder="角度" />
                      <input className="wf-edit-label-input" type="number" min={0} max={100} value={option.score ?? 80} onChange={(event) => updateOption(index, 'score', Number(event.target.value))} placeholder="分数" />
                    </div>
                    <input className="wf-edit-label-input" value={option.hookStyle || ''} onChange={(event) => updateOption(index, 'hookStyle', event.target.value)} placeholder="Hook 风格" />
                    <input className="wf-edit-label-input" value={option.evidenceAnchor || ''} onChange={(event) => updateOption(index, 'evidenceAnchor', event.target.value)} placeholder="证据锚点" />
                    <textarea className="wf-edit-textarea" rows={3} value={option.rationale || ''} onChange={(event) => updateOption(index, 'rationale', event.target.value)} placeholder="标题理由" />
                  </div>
                ) : (
                  <>
                    <h6>{option.title || '待补充标题'}</h6>
                    <div className="wf-meta-pills">
                      <span className="wf-keyword-tag">{option.angle || '待补充角度'}</span>
                      <span className="wf-keyword-tag">{option.hookStyle || '待补充 Hook 风格'}</span>
                      <span className="wf-keyword-tag">{option.score ?? '--'} 分</span>
                    </div>
                    <p>{option.rationale || '待补充标题理由'}</p>
                    <small>{option.evidenceAnchor || '待补充证据锚点'}</small>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="wf-struct-section">
        <div className="wf-struct-head">
          <div>
            <span className="wf-stage-kicker">{workbenchMode ? '当前入选' : '入选理由'}</span>
            <h5>{workbenchMode ? '告诉下一步为什么选这一条' : '给 Step 3 一个明确的开稿方向'}</h5>
          </div>
        </div>
        {editing ? (
          <textarea
            className="wf-edit-textarea"
            rows={4}
            value={current.selectedReason || ''}
            onChange={(event) => updateMeta({selectedReason: event.target.value})}
            placeholder="为什么这条主标题最适合继续生成 Hook / Body / CTA？"
          />
        ) : (
          <div className="wf-confirm-note wf-confirm-note-block">
            {current.selectedReason || '确认后，Step 3 会围绕这条标题生成文案 brief 和最终文案。'}
          </div>
        )}
      </section>

      {!workbenchMode ? (
        <div className="wf-confirm-row">
          <div className="wf-confirm-note">
            {confirmed
              ? '当前主标题已确认，可继续推进内容生成。'
              : '确认后，Step 3 只会围绕这条主标题继续生成。'}
          </div>
          <button
            type="button"
            className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmed ? '✓ 已确认标题方向' : '确认当前标题'}
          </button>
        </div>
      ) : null}
    </div>
  );
};
