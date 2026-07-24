import React from 'react';
import type {DraftScript} from './types';

interface ScriptWorkspaceProps {
  draft: DraftScript;
  dirty: boolean;
  writable: boolean;
  saving: boolean;
  onSetDraft: (draft: DraftScript) => void;
  onSave: () => void;
}

interface FieldProps { label: string; value: string; placeholder: string; onChange: (value: string) => void; rows?: number; disabled?: boolean; className?: string; }
const Field: React.FC<FieldProps> = ({label, value, placeholder, onChange, rows = 1, disabled = false, className = ''}) => (
  <label className={`form-field ${className}`.trim()}>
    <span>{label}</span>
    {rows > 1 ? <textarea rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      : <input value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />}
  </label>
);

export const ScriptWorkspace: React.FC<ScriptWorkspaceProps> = ({draft, dirty, writable, saving, onSetDraft, onSave}) => (
  <div className="workspace-panel script-workspace">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">01 / 口播内容</span><h1>口播文案</h1></div>
      <span className={`state-chip ${dirty ? 'is-stale' : 'is-current'}`}>{dirty ? '未保存' : '已保存'}</span>
    </div>
    <p className="workspace-copy">这里只保存口播内容，不会自动合成语音或生成分镜。</p>
    {!writable && <div className="notice notice--neutral">当前为只读样例。新建项目后可以编辑生产输入。</div>}
    <div className="form-stack">
      <Field className="script-field--title" label="视频标题" value={draft.selectedTitle} placeholder="输入视频标题" disabled={!writable || saving} onChange={(value) => onSetDraft({...draft, selectedTitle: value, topic: value})} rows={3} />
      <Field className="script-field--hook" label="开场钩子" value={draft.hook} placeholder="用一句明确的开场抓住注意力" disabled={!writable || saving} onChange={(value) => onSetDraft({...draft, hook: value})} rows={3} />
      <Field className="script-field--viewpoint" label="核心观点" value={draft.viewpoint} placeholder="这条视频需要传达的关键结论" disabled={!writable || saving} onChange={(value) => onSetDraft({...draft, viewpoint: value})} rows={3} />
      <Field className="script-field--body" label="口播稿" value={draft.script} placeholder="粘贴完整口播稿，保存后可进入语音制作。" disabled={!writable || saving} onChange={(value) => onSetDraft({...draft, script: value})} rows={12} />
      <Field className="script-field--keywords" label="关键词" value={draft.keywords} placeholder="AI, 工作流, 自动化" disabled={!writable || saving} onChange={(value) => onSetDraft({...draft, keywords: value})} rows={3} />
    </div>
    {draft.script.trim().length < 20 && <div className="notice notice--neutral">口播稿至少需要 20 个字符。</div>}
    <button className="primary-action" type="button" disabled={!writable || saving || !dirty || draft.script.trim().length < 20} onClick={onSave}>
      {saving ? '正在保存口播稿' : draft.script.trim().length < 20 ? '口播稿内容不足' : dirty ? '保存口播稿' : '口播稿已保存'}
    </button>
  </div>
);
