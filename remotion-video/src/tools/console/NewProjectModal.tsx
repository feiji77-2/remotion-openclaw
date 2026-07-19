// src/tools/console/NewProjectModal.tsx
import React, {useState, useCallback} from 'react';
import {theme} from './theme';
import type {CreateProjectDraft, CreateProjectResult, CreateProjectError} from './types';
import {createProject} from './api';
import {StyleCard} from './StyleCard';
import {STYLE_PRESETS, type StylePresetId} from '../../styles/video-gen/style-presets';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: theme.bg.surface,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: theme.text.secondary,
  marginBottom: 4,
  display: 'block',
  textTransform: 'uppercase' as const,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

const halfInputStyle: React.CSSProperties = {
  ...inputStyle,
  flex: 1,
};

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
};

const radioStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 6,
  border: `1px solid ${active ? theme.accent.blue : theme.border.default}`,
  background: active ? `${theme.accent.blue}22` : theme.bg.surface,
  color: active ? theme.accent.blue : theme.text.muted,
  fontSize: 10,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (result: CreateProjectResult) => void;
  onError: (message: string) => void;
}

const DEFAULT_DRAFT: CreateProjectDraft = {
  projectId: '',
  title: '',
  orientation: 'portrait',
  style: 'tech-explainer',
  spokenScript: '',
  keywords: '',
};

const projectIdHint = '仅支持字母、数字、._-，最多 96 字符';
const spokenScriptHint = '至少 20 字，将用于生成字幕和初始分镜';

export const NewProjectModal: React.FC<NewProjectModalProps> = ({onClose, onCreated, onError}) => {
  const [draft, setDraft] = useState<CreateProjectDraft>({...DEFAULT_DRAFT});
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof CreateProjectDraft>(key: K, value: CreateProjectDraft[K]) => {
    setDraft((prev) => ({...prev, [key]: value}));
    setFieldError((prev) => { const next = {...prev}; delete next[key]; return next; });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!/^[A-Za-z0-9._-]{1,96}$/.test(draft.projectId)) {
      errors.projectId = projectIdHint;
    }
    if (!draft.title.trim()) {
      errors.title = '标题是必填的';
    }
    if (draft.spokenScript.trim().length < 20) {
      errors.spokenScript = spokenScriptHint;
    }
    setFieldError(errors);
    return Object.keys(errors).length === 0;
  }, [draft]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await createProject(draft);
      onCreated(result);
    } catch (error) {
      const err = error as CreateProjectError | Error;
      onError('error' in err ? err.error : err.message);
      setSubmitting(false);
    }
  }, [draft, validate, onCreated, onError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
    if (e.key === 'Escape') onClose();
  }, [handleSubmit, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5,7,13,0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: 520,
          maxHeight: '90vh',
          overflow: 'auto',
          background: theme.bg.elevated,
          border: `1px solid ${theme.border.subtle}`,
          borderRadius: 12,
          boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px ${theme.border.subtle}`,
          padding: 0,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: `1px solid ${theme.border.subtle}`,
        }}>
          <h2 style={{margin: 0, fontSize: 14, fontWeight: 700, color: theme.text.primary}}>
            新建视频项目
          </h2>
          <p style={{margin: '4px 0 0', fontSize: 10, color: theme.text.muted}}>
            填写基本信息后，生产台会创建项目结构并生成初始分镜。
          </p>
        </div>

        {/* Form */}
        <div style={{padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14}}>
          {/* Row: projectId + orientation */}
          <div style={rowStyle}>
            <div style={{flex: 1}}>
              <label style={labelStyle}>项目 ID *</label>
              <input
                type="text"
                style={{
                  ...halfInputStyle,
                  borderColor: fieldError.projectId ? theme.accent.red : theme.border.default,
                }}
                placeholder="my-first-video"
                value={draft.projectId}
                onChange={(e) => updateField('projectId', e.target.value.replace(/[^A-Za-z0-9._-]/g, ''))}
                maxLength={96}
                autoFocus
              />
              {fieldError.projectId && (
                <div style={{fontSize: 8, color: theme.accent.red, marginTop: 3}}>{fieldError.projectId}</div>
              )}
            </div>
            <div style={{flex: 1}}>
              <label style={labelStyle}>画幅</label>
              <div style={radioGroupStyle}>
                <div
                  style={radioStyle(draft.orientation === 'portrait')}
                  onClick={() => updateField('orientation', 'portrait')}
                >📱 竖屏</div>
                <div
                  style={radioStyle(draft.orientation === 'landscape')}
                  onClick={() => updateField('orientation', 'landscape')}
                >🖥 横屏</div>
              </div>
            </div>
          </div>

          {/* title */}
          <div>
            <label style={labelStyle}>标题 *</label>
            <input
              type="text"
              style={{
                ...inputStyle,
                borderColor: fieldError.title ? theme.accent.red : theme.border.default,
              }}
              placeholder="视频标题（将显示在开场画面）"
              value={draft.title}
              onChange={(e) => updateField('title', e.target.value)}
              maxLength={200}
            />
            {fieldError.title && (
              <div style={{fontSize: 8, color: theme.accent.red, marginTop: 3}}>{fieldError.title}</div>
            )}
          </div>

          {/* style — 视觉卡片选择器 (Stage C) */}
          <div>
            <label style={labelStyle}>风格</label>
            <StyleCard
              presets={STYLE_PRESETS}
              selected={draft.style}
              onSelect={(id) => updateField('style', id as StylePresetId)}
            />
          </div>

          {/* keywords */}
          <div>
            <label style={labelStyle}>关键词</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="AI, 工作流, 效率"
              value={draft.keywords}
              onChange={(e) => updateField('keywords', e.target.value)}
            />
          </div>

          {/* spokenScript */}
          <div>
            <label style={labelStyle}>口播稿 *</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: 120,
                resize: 'vertical',
                fontFamily: 'inherit',
                borderColor: fieldError.spokenScript ? theme.accent.red : theme.border.default,
              }}
              placeholder={'粘贴口播稿……\n\n例如：\n你有没有发现，过去我们花很多时间不是在创造，而是在推动流程？\n新工具的价值，是把输入、处理和输出变成一条可重复的链路。'}
              value={draft.spokenScript}
              onChange={(e) => updateField('spokenScript', e.target.value)}
            />
            <div style={{fontSize: 8, color: fieldError.spokenScript ? theme.accent.red : theme.text.muted, marginTop: 3}}>
              {fieldError.spokenScript || `${draft.spokenScript.length} 字 — ${spokenScriptHint}`}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: `1px solid ${theme.border.default}`,
              background: theme.bg.surface,
              color: theme.text.secondary,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '8px 24px',
              borderRadius: 6,
              border: 'none',
              background: submitting
                ? theme.bg.surface
                : `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
              color: submitting ? theme.text.muted : '#fff',
              fontSize: 10,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '创建中…' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  );
};
