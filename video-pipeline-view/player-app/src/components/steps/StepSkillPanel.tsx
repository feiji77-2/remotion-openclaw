import React from 'react';
import type {SkillDrivenStepId, StepSkillConfig} from '../../app/pipelineTypes';
import {
  buildSkillFromPreset,
  estimateStep3WordCount,
  getStepSkillPresets,
  normalizeStepSkill,
} from '../../workflow/stepSkillCatalog';

interface StepSkillPanelProps {
  stepId: SkillDrivenStepId;
  titleKeywords: string;
  hasPendingTitleKeywords: boolean;
  skill: StepSkillConfig | null | undefined;
  dirty: boolean;
  onTitleKeywordsChange: (value: string) => void;
  onApplyTitleKeywords: () => void;
  onUpdateSkill: (stepId: SkillDrivenStepId, patch: Partial<StepSkillConfig>) => void;
}

const FIELD_META: Array<{field: keyof StepSkillConfig; label: string; placeholder: string}> = [
  {
    field: 'goal',
    label: '目标',
    placeholder: '这一步想产出什么类型的结果',
  },
  {
    field: 'style',
    label: '风格',
    placeholder: '希望结果怎么表达',
  },
  {
    field: 'emphasis',
    label: '重点强调',
    placeholder: '哪些点必须展开',
  },
  {
    field: 'avoid',
    label: '避免内容',
    placeholder: '哪些内容或口吻不要出现',
  },
  {
    field: 'notes',
    label: '补充说明',
    placeholder: '补充限制、输出偏好或额外要求',
  },
];

const STEP3_ANTI_AI_OPTIONS: Array<{value: NonNullable<StepSkillConfig['antiAiLevel']>; label: string}> = [
  {value: 'natural', label: '标准去 AI'},
  {value: 'strong', label: '强去 AI'},
  {value: 'max', label: '极强拟人'},
];

export const StepSkillPanel: React.FC<StepSkillPanelProps> = ({
  stepId,
  titleKeywords,
  hasPendingTitleKeywords,
  skill,
  dirty,
  onTitleKeywordsChange,
  onApplyTitleKeywords,
  onUpdateSkill,
}) => {
  const normalizedSkill = normalizeStepSkill(stepId, skill);
  const presets = getStepSkillPresets(stepId);
  const normalizedTopic = String(titleKeywords || '').trim();
  const isStep3 = stepId === 3;
  const estimatedWordCount = isStep3
    ? estimateStep3WordCount(normalizedSkill.targetDurationSeconds)
    : null;
  const updateSkill = (patch: Partial<StepSkillConfig>) => {
    onUpdateSkill(stepId, {
      presetId: normalizedSkill.presetId,
      presetLabel: normalizedSkill.presetLabel,
      ...patch,
    });
  };

  return (
    <section className="mac-step-skill-panel">
      <div className="mac-step-skill-head">
        <div className="mac-step-skill-topic">
          <span className="mac-kicker">主题输入</span>
          <div className="mac-step-skill-topic-row">
            <input
              className="mac-input mac-step-skill-topic-input"
              type="text"
              value={titleKeywords}
              onChange={(event) => onTitleKeywordsChange(event.target.value)}
              placeholder="输入主题或标题关键词"
            />
            <button
              type="button"
              className={`mac-btn mac-btn-primary ${hasPendingTitleKeywords ? '' : 'is-quiet'}`}
              onClick={onApplyTitleKeywords}
              disabled={!normalizedTopic || !hasPendingTitleKeywords}
            >
              {hasPendingTitleKeywords ? '同步主题并重开' : '主题已生效'}
            </button>
          </div>
        </div>

        <div className="mac-step-skill-status">
          <span className={`mac-status-pill ${dirty ? 'is-warning' : 'is-done'}`}>
            {dirty ? '待按新 skill 更新' : '当前结果已对齐 skill'}
          </span>
        </div>
      </div>

      <div className="mac-step-skill-presets">
        {presets.map((preset) => {
          const active = normalizedSkill.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`mac-step-skill-preset ${active ? 'active' : ''}`}
              onClick={() => onUpdateSkill(stepId, buildSkillFromPreset(stepId, preset.id))}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {isStep3 ? (
        <div className="mac-step-skill-grid">
          <label className="mac-step-skill-card">
            <span>目标口播时长</span>
            <div className="mac-step-skill-inline-input">
              <input
                className="mac-input"
                type="number"
                min={15}
                max={240}
                step={5}
                value={normalizedSkill.targetDurationSeconds ?? ''}
                onChange={(event) => updateSkill({
                  targetDurationSeconds: event.target.value ? Number(event.target.value) : null,
                })}
                placeholder="例如 60"
              />
              <small>秒</small>
            </div>
            <small className="mac-step-skill-hint">
              {estimatedWordCount
                ? `按正常口播速度，系统会自动按约 ${estimatedWordCount} 字生成`
                : '输入秒数后，系统会自动匹配对应字数'}
            </small>
          </label>

          <div className="mac-step-skill-card">
            <span>去 AI 味</span>
            <div className="mac-step-skill-option-row">
              {STEP3_ANTI_AI_OPTIONS.map((option) => {
                const active = normalizedSkill.antiAiLevel === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`mac-step-skill-option ${active ? 'active' : ''}`}
                    onClick={() => updateSkill({antiAiLevel: option.value})}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mac-step-skill-card">
            <span>拟人口播人设</span>
            <input
              className="mac-input"
              type="text"
              value={normalizedSkill.spokenPersona || ''}
              onChange={(event) => updateSkill({spokenPersona: event.target.value})}
              placeholder="例如：像真人面对面讲，不背稿，不端着"
            />
          </label>
        </div>
      ) : null}

      <div className="mac-step-skill-grid">
        {FIELD_META.map(({field, label, placeholder}) => (
          <label
            key={field}
            className={`mac-step-skill-card ${field === 'notes' ? 'is-wide' : ''}`}
          >
            <span>{label}</span>
            <textarea
              className="wf-edit-textarea"
              rows={field === 'notes' ? 4 : 3}
              value={String(normalizedSkill[field] || '')}
              onChange={(event) => updateSkill({
                [field]: event.target.value,
              })}
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>

      {dirty ? (
        <div className="mac-step-skill-banner">
          skill 已修改，当前结果未按新 skill 重生成
        </div>
      ) : null}
    </section>
  );
};
