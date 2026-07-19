// src/tools/console/ScriptWorkspace.tsx
// R1: 步骤1 — 文案编辑
import React from 'react';
import {theme} from './theme';
import type {DraftScript} from './types';

interface ScriptWorkspaceProps {
  draft: DraftScript;
  onSetDraft: (d: DraftScript) => void;
  onSave: () => void;
  saving: boolean;
  hasProject: boolean;
}

const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string, rows = 1) => (
  <div style={{marginBottom: 12}}>
    <div style={{fontSize: 9, fontWeight: 600, color: theme.text.secondary, marginBottom: 4, textTransform: 'uppercase'}}>
      {label}
    </div>
    {rows > 1 ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', minHeight: rows * 34, resize: 'vertical',
          background: theme.bg.surface, color: theme.text.primary,
          border: `1px solid ${theme.border.default}`, borderRadius: 6,
          padding: '8px 10px', fontSize: 10, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: theme.bg.surface, color: theme.text.primary,
          border: `1px solid ${theme.border.default}`, borderRadius: 6,
          padding: '8px 10px', fontSize: 10, outline: 'none', boxSizing: 'border-box',
        }}
      />
    )}
  </div>
);

export const ScriptWorkspace: React.FC<ScriptWorkspaceProps> = ({draft, onSetDraft, onSave, saving, hasProject}) => (
  <div style={{padding: '16px 18px', height: '100%', overflow: 'auto'}}>
    <div style={{marginBottom: 16}}>
      <h2 style={{margin: 0, fontSize: 13, fontWeight: 700, color: theme.text.primary}}>✎ 文案编辑</h2>
      <p style={{margin: '4px 0 0', fontSize: 9, color: theme.text.muted}}>
        填写选题信息和口播稿，系统将自动拆分为分镜场景。
      </p>
    </div>

    {!hasProject && (
      <div style={{
        padding: 12, borderRadius: 6, marginBottom: 14,
        background: `${theme.accent.amber}14`, border: `1px solid ${theme.accent.amber}33`,
        fontSize: 9, color: theme.text.secondary,
      }}>
        请先新建或选择一个视频项目。
      </div>
    )}

    {field('视频标题', draft.selectedTitle, (v) => onSetDraft({...draft, selectedTitle: v, topic: v}), '输入视频标题', 1)}
    {field('话题/主题', draft.topic, (v) => onSetDraft({...draft, topic: v}), '例如：AI Agent 实战指南', 1)}
    {field('开场钩子', draft.hook, (v) => onSetDraft({...draft, hook: v}), '先用一句反常识的开场抓住观众', 2)}
    {field('核心观点', draft.viewpoint, (v) => onSetDraft({...draft, viewpoint: v}), '这条视频最重要的一个观点', 2)}
    {field('口播稿', draft.script, (v) => onSetDraft({...draft, script: v}), '粘贴完整口播稿。系统会按句号、感叹号、换行自动拆分为字幕。', 8)}
    {field('关键词', draft.keywords, (v) => onSetDraft({...draft, keywords: v}), 'AI, 工作流, 自动化', 1)}

    <button
      onClick={onSave}
      disabled={saving || !hasProject}
      style={{
        width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
        background: saving || !hasProject ? theme.bg.surface
          : `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
        color: saving || !hasProject ? theme.text.muted : '#fff',
        fontSize: 11, fontWeight: 700, cursor: saving || !hasProject ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {saving ? '保存中…' : '保存文案'}
    </button>
  </div>
);
