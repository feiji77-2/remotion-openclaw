import React, {useMemo} from 'react';
import {usePersistentStepEditor} from './usePersistentStepEditor';
import type {StepSkillConfig} from '../../app/pipelineTypes';

interface CopyBrief {
  hookAngle?: string;
  tone?: string;
  pacing?: string;
  ctaIntent?: string;
}

interface CopyRequirements {
  focus?: string;
  avoid?: string;
  style?: string;
  length?: string;
}

interface OutlineItem {
  id?: string;
  label?: string;
  beat?: string;
  goal?: string;
  evidenceAnchor?: string;
}

interface ContentBlock {
  id?: string;
  label?: string;
  text?: string;
}

interface CopyData {
  requirements?: CopyRequirements | null;
  brief?: CopyBrief | null;
  outline?: OutlineItem[];
  hook?: string;
  body?: ContentBlock[];
  cta?: string;
}

interface Step3ContentGenerationProps {
  stepId: number;
  data: CopyData | null;
  stepSkill?: StepSkillConfig | null;
  confirmed: boolean;
  onConfirm: () => void;
  onGenerate: () => void;
  onUpdate: (updated: CopyData) => void;
  loading: boolean;
  workbenchMode?: boolean;
}

type Draft = {
  requirements: CopyRequirements;
  brief: CopyBrief;
  outline: OutlineItem[];
  hook: string;
  body: ContentBlock[];
  cta: string;
};

const DEFAULT_REQUIREMENTS: CopyRequirements = {
  focus: '',
  avoid: '',
  style: '',
  length: '',
};

const DEFAULT_BRIEF: CopyBrief = {
  hookAngle: '',
  tone: '',
  pacing: '',
  ctaIntent: '',
};

const REQUIREMENT_FIELDS: Array<{field: keyof CopyRequirements; label: string; placeholder: string}> = [
  {
    field: 'focus',
    label: '重点要讲',
    placeholder: '例如：只讲核心判断、关键动作、结果差异',
  },
  {
    field: 'avoid',
    label: '不要出现',
    placeholder: '例如：空话、鸡汤、背景铺垫、营销腔',
  },
  {
    field: 'style',
    label: '文风要求',
    placeholder: '例如：短句、强节奏、像复盘、像实战手记',
  },
  {
    field: 'length',
    label: '节奏要求',
    placeholder: '例如：45 秒左右，3 段推进，前 8 秒先抛结论',
  },
];

function createOutline(index: number): OutlineItem {
  return {
    id: `copy-outline-${index + 1}`,
    label: `节拍 ${index + 1}`,
    beat: '',
    goal: '',
    evidenceAnchor: '',
  };
}

function createBody(index: number): ContentBlock {
  return {
    id: `copy-${index + 1}`,
    label: `段落 ${index + 1}`,
    text: '',
  };
}

function buildDraft(data: CopyData | null): Draft {
  return {
    requirements: {
      ...DEFAULT_REQUIREMENTS,
      ...(data?.requirements || {}),
    },
    brief: {
      ...DEFAULT_BRIEF,
      ...(data?.brief || {}),
    },
    outline: Array.isArray(data?.outline) && data.outline.length > 0
      ? data.outline.map((item, index) => ({
        id: item.id || `copy-outline-${index + 1}`,
        label: item.label || `节拍 ${index + 1}`,
        beat: item.beat || '',
        goal: item.goal || '',
        evidenceAnchor: item.evidenceAnchor || '',
      }))
      : [createOutline(0), createOutline(1), createOutline(2)],
    hook: String(data?.hook || '').trim(),
    body: Array.isArray(data?.body) && data.body.length > 0
      ? data.body.map((item, index) => ({
        id: item.id || `copy-${index + 1}`,
        label: item.label || `段落 ${index + 1}`,
        text: item.text || '',
      }))
      : [createBody(0), createBody(1), createBody(2)],
    cta: String(data?.cta || '').trim(),
  };
}

function sanitizeRequirements(requirements: CopyRequirements | null | undefined): CopyRequirements | null {
  const normalized = {
    focus: String(requirements?.focus || '').trim(),
    avoid: String(requirements?.avoid || '').trim(),
    style: String(requirements?.style || '').trim(),
    length: String(requirements?.length || '').trim(),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function sanitizeDraft(data: Draft): CopyData {
  return {
    requirements: sanitizeRequirements(data.requirements),
    brief: {
      hookAngle: String(data.brief.hookAngle || '').trim(),
      tone: String(data.brief.tone || '').trim(),
      pacing: String(data.brief.pacing || '').trim(),
      ctaIntent: String(data.brief.ctaIntent || '').trim(),
    },
    outline: (Array.isArray(data.outline) ? data.outline : [])
      .map((item, index) => ({
        id: item.id || `copy-outline-${index + 1}`,
        label: String(item.label || `节拍 ${index + 1}`).trim(),
        beat: String(item.beat || '').trim(),
        goal: String(item.goal || '').trim(),
        evidenceAnchor: String(item.evidenceAnchor || '').trim(),
      }))
      .filter((item) => item.beat || item.goal || item.evidenceAnchor),
    hook: String(data.hook || '').trim(),
    body: (Array.isArray(data.body) ? data.body : [])
      .map((item, index) => ({
        id: item.id || `copy-${index + 1}`,
        label: String(item.label || `段落 ${index + 1}`).trim(),
        text: String(item.text || '').trim(),
      }))
      .filter((item) => item.text),
    cta: String(data.cta || '').trim(),
  };
}

function hasMeaningfulCopy(data: CopyData | null) {
  if (!data) return false;
  return Boolean(
    String(data.hook || '').trim()
    || String(data.cta || '').trim()
    || (Array.isArray(data.body) && data.body.some((item) => String(item?.text || '').trim()))
    || (Array.isArray(data.outline) && data.outline.some((item) => String(item?.beat || '').trim() || String(item?.goal || '').trim()))
  );
}

function getAntiAiLabel(level?: string | null) {
  if (level === 'max') return '极强拟人';
  if (level === 'strong') return '强去 AI';
  if (level === 'natural') return '标准去 AI';
  return '';
}

export const Step3ContentGeneration: React.FC<Step3ContentGenerationProps> = ({
  data,
  stepSkill,
  confirmed,
  onConfirm,
  onGenerate,
  onUpdate,
  loading,
  workbenchMode = false,
}) => {
  const normalized = useMemo(() => buildDraft(data), [data]);
  const hasContent = useMemo(() => hasMeaningfulCopy(data), [data]);
  const stepSkillPills = useMemo(() => {
    const pills: string[] = [];
    if (stepSkill?.targetDurationSeconds && stepSkill?.targetWordCount) {
      pills.push(`${stepSkill.targetDurationSeconds} 秒口播 · 约 ${stepSkill.targetWordCount} 字`);
    } else if (stepSkill?.targetDurationSeconds) {
      pills.push(`${stepSkill.targetDurationSeconds} 秒口播`);
    } else if (stepSkill?.targetWordCount) {
      pills.push(`约 ${stepSkill.targetWordCount} 字`);
    }
    const antiAiLabel = getAntiAiLabel(stepSkill?.antiAiLevel);
    if (antiAiLabel) {
      pills.push(antiAiLabel);
    }
    if (stepSkill?.spokenPersona) {
      pills.push(`人设 ${stepSkill.spokenPersona}`);
    }
    return pills;
  }, [stepSkill?.antiAiLevel, stepSkill?.spokenPersona, stepSkill?.targetDurationSeconds, stepSkill?.targetWordCount]);
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<Draft>('remotion-step-editor-step3-copy');

  const current = editing && draft ? draft : normalized;

  const openEditor = () => {
    setDraft(buildDraft(data));
    setEditing(true);
  };

  const saveEditor = () => {
    if (!draft) return;
    onUpdate(sanitizeDraft(draft));
    clearEditor();
  };

  const updateBrief = (field: keyof CopyBrief, value: string) => {
    setDraft((prev) => ({
      ...(prev || buildDraft(data)),
      brief: {
        ...DEFAULT_BRIEF,
        ...((prev || buildDraft(data)).brief || {}),
        [field]: value,
      },
    }));
  };

  const updateRequirements = (field: keyof CopyRequirements, value: string) => {
    if (editing) {
      setDraft((prev) => ({
        ...(prev || buildDraft(data)),
        requirements: {
          ...DEFAULT_REQUIREMENTS,
          ...((prev || buildDraft(data)).requirements || {}),
          [field]: value,
        },
      }));
    }

    onUpdate({
      requirements: sanitizeRequirements({
        ...DEFAULT_REQUIREMENTS,
        ...(current.requirements || {}),
        [field]: value,
      }),
    });
  };

  const updateOutline = (index: number, field: keyof OutlineItem, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextOutline = (base.outline || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, outline: nextOutline};
    });
  };

  const addOutline = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        outline: [...(base.outline || []), createOutline((base.outline || []).length)],
      };
    });
  };

  const removeOutline = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        outline: (base.outline || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const updateBody = (index: number, field: keyof ContentBlock, value: string) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      const nextBody = (base.body || []).map((item, itemIndex) => (
        itemIndex === index ? {...item, [field]: value} : item
      ));
      return {...base, body: nextBody};
    });
  };

  const addBody = () => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        body: [...(base.body || []), createBody((base.body || []).length)],
      };
    });
  };

  const removeBody = (index: number) => {
    setDraft((prev) => {
      const base = buildDraft(prev || data);
      return {
        ...base,
        body: (base.body || []).filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const requirementsSection = (
    <section className="wf-struct-section wf-requirements-section">
      <div className="wf-struct-head">
        <div>
          <span className="wf-stage-kicker">生成要求</span>
          <h5>具体控制这次文案怎么写</h5>
        </div>
        <span className="wf-stat-pill is-accent">生成前生效</span>
      </div>
      <div className="wf-requirements-grid">
        {REQUIREMENT_FIELDS.map(({field, label, placeholder}) => (
          <label key={field} className="wf-requirement-card">
            <strong>{label}</strong>
            <textarea
              className="wf-edit-textarea"
              rows={3}
              value={current.requirements[field] || ''}
              onChange={(event) => updateRequirements(field, event.target.value)}
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>
    </section>
  );

  if (!hasContent && !editing) {
    if (workbenchMode) {
      return (
        <div className="wf-step3-root">
          <div className="wf-inline-empty wf-inline-empty-workbench">
            还没有文案结果，先按当前 skill 生成文案。
          </div>
        </div>
      );
    }

    return (
      <div className="wf-step3-root">
        <div className="wf-stage-hero">
          <div className="wf-stage-hero-copy">
            <span className="wf-stage-kicker">Step 3</span>
            <h4>先生成文案 brief，再出最终成稿</h4>
            <p>这一步会先锁定 Hook 角度、语气和节拍，再落成 Hook / Body / CTA。</p>
          </div>
          <div className="wf-stage-action-row">
            <button
              type="button"
              className={`wf-btn wf-btn-primary ${loading ? 'is-loading' : ''}`}
              onClick={onGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '生成文案 brief 与成稿'}
            </button>
            <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor}>
              手动录入文案结构
            </button>
          </div>
        </div>
        {requirementsSection}
      </div>
    );
  }

  return (
    <div className="wf-step3-root">
      {workbenchMode ? (
        <div className="wf-result-toolbar">
          <div className="wf-result-toolbar-meta">
            <span className="wf-stat-pill">正文 {(current.body || []).length} 段</span>
            <span className="wf-stat-pill">节拍 {(current.outline || []).length} 个</span>
            <span className="wf-stat-pill">语气 {current.brief.tone || '待定'}</span>
            {stepSkillPills.map((pill) => (
              <span key={pill} className="wf-stat-pill">{pill}</span>
            ))}
          </div>
          <div className="wf-stage-action-row">
            {editing ? (
              <>
                <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存文案</button>
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
        <>
          <div className="wf-stage-hero">
            <div className="wf-stage-hero-copy">
              <span className="wf-stage-kicker">文案主链</span>
              <h4>{current.hook || '待生成 Hook'}</h4>
              <p>先用 brief 定方向，再把正文和 CTA 收成可直接进 Step 4 的结构。</p>
            </div>
            <div className="wf-stage-action-row">
              <span className="wf-stat-pill">节拍 {(current.outline || []).length} 个</span>
              <span className="wf-stat-pill">正文 {(current.body || []).length} 段</span>
              <span className="wf-stat-pill">语气 {current.brief.tone || '待定'}</span>
              {stepSkillPills.map((pill) => (
                <span key={pill} className="wf-stat-pill">{pill}</span>
              ))}
              {editing ? (
                <>
                  <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>保存文案</button>
                  <button type="button" className="wf-btn wf-btn-cancel" onClick={clearEditor}>取消</button>
                </>
              ) : (
                <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
                  编辑 Step 3
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

          {requirementsSection}
        </>
      )}

      {!workbenchMode || editing ? (
        <section className="wf-struct-section">
          <div className="wf-struct-head">
            <div>
              <span className="wf-stage-kicker">文案策略</span>
              <h5>先把开场方式和节奏说清楚</h5>
            </div>
          </div>
          <div className="wf-brief-grid">
            {([
              ['hookAngle', 'Hook 角度'],
              ['tone', '语气'],
              ['pacing', '节奏'],
              ['ctaIntent', 'CTA 意图'],
            ] as Array<[keyof CopyBrief, string]>).map(([field, label]) => (
              <div key={field} className="wf-brief-card">
                <span>{label}</span>
                {editing ? (
                  <textarea
                    className="wf-edit-textarea"
                    rows={3}
                    value={current.brief[field] || ''}
                    onChange={(event) => updateBrief(field, event.target.value)}
                  />
                ) : (
                  <p>{current.brief[field] || '待补充'}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!workbenchMode || editing ? (
        <section className="wf-struct-section">
          <div className="wf-struct-head">
            <div>
              <span className="wf-stage-kicker">大纲节拍</span>
              <h5>先定每一拍要完成什么</h5>
            </div>
            {editing ? (
              <button type="button" className="wf-btn wf-btn-add-block" onClick={addOutline}>+ 添加节拍</button>
            ) : null}
          </div>
          <div className="wf-detail-list">
            {(current.outline || []).map((item, index) => (
              <div key={item.id || index} className="wf-detail-card">
                <div className="wf-detail-card-top">
                  <strong>{item.label || `节拍 ${index + 1}`}</strong>
                  {editing ? (
                    <button type="button" className="wf-btn-remove-block" onClick={() => removeOutline(index)}>删除</button>
                  ) : null}
                </div>
                {editing ? (
                  <div className="wf-form-stack">
                    <input className="wf-edit-label-input" value={item.label || ''} onChange={(event) => updateOutline(index, 'label', event.target.value)} placeholder="节拍标签" />
                    <textarea className="wf-edit-textarea" rows={2} value={item.beat || ''} onChange={(event) => updateOutline(index, 'beat', event.target.value)} placeholder="这一拍讲什么" />
                    <textarea className="wf-edit-textarea" rows={2} value={item.goal || ''} onChange={(event) => updateOutline(index, 'goal', event.target.value)} placeholder="这一拍的目标" />
                    <input className="wf-edit-label-input" value={item.evidenceAnchor || ''} onChange={(event) => updateOutline(index, 'evidenceAnchor', event.target.value)} placeholder="证据锚点" />
                  </div>
                ) : (
                  <>
                    <p>{item.beat || '待补充节拍说明'}</p>
                    <div className="wf-fact-meta">
                      <span>{item.goal || '待补充节拍目标'}</span>
                      <small>{item.evidenceAnchor || '待补充证据锚点'}</small>
                    </div>
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
            <span className="wf-stage-kicker">最终文案</span>
            <h5>{workbenchMode ? '直接看可继续推进的成稿' : '确认后直接进入 Step 4 分镜'}</h5>
          </div>
          {editing ? (
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addBody}>+ 添加正文段落</button>
          ) : null}
        </div>

        <div className="wf-copy-hero-block">
          <span className="wf-stage-kicker">Hook</span>
          {editing ? (
            <textarea className="wf-edit-textarea" rows={4} value={current.hook} onChange={(event) => setDraft((prev) => ({...(prev || buildDraft(data)), hook: event.target.value}))} placeholder="输入开场 Hook..." />
          ) : (
            <p>{current.hook || '待生成 Hook'}</p>
          )}
        </div>

        <div className="wf-detail-list">
          {(current.body || []).map((item, index) => (
            <div key={item.id || index} className="wf-detail-card">
              <div className="wf-detail-card-top">
                <strong>{item.label || `段落 ${index + 1}`}</strong>
                {editing ? (
                  <button type="button" className="wf-btn-remove-block" onClick={() => removeBody(index)}>删除</button>
                ) : null}
              </div>
              {editing ? (
                <div className="wf-form-stack">
                  <input className="wf-edit-label-input" value={item.label || ''} onChange={(event) => updateBody(index, 'label', event.target.value)} placeholder="段落标签" />
                  <textarea className="wf-edit-textarea" rows={4} value={item.text || ''} onChange={(event) => updateBody(index, 'text', event.target.value)} placeholder="输入正文段落..." />
                </div>
              ) : (
                <p>{item.text || '待补充正文内容'}</p>
              )}
            </div>
          ))}
        </div>

        <div className="wf-copy-hero-block wf-copy-cta-block">
          <span className="wf-stage-kicker">CTA</span>
          {editing ? (
            <textarea className="wf-edit-textarea" rows={3} value={current.cta} onChange={(event) => setDraft((prev) => ({...(prev || buildDraft(data)), cta: event.target.value}))} placeholder="输入 CTA..." />
          ) : (
            <p>{current.cta || '待生成 CTA'}</p>
          )}
        </div>
      </section>

      {!workbenchMode ? (
        <div className="wf-confirm-row">
          <div className="wf-confirm-note">
            {confirmed
              ? '当前文案已确认，可继续拆成分镜结构。'
              : '确认后，Step 4 将直接按这版 Hook / Body / CTA 拆分镜。'}
          </div>
          <button
            type="button"
            className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmed ? '✓ 已确认内容' : '确认当前内容'}
          </button>
        </div>
      ) : null}
    </div>
  );
};
