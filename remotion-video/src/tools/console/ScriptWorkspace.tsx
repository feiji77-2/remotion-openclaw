import React from 'react';
import type {DraftScript} from './types';

interface ScriptWorkspaceProps {
  draft: DraftScript;
  dirty: boolean;
  writable: boolean;
  saving: boolean;
  onSetDraft: (draft: DraftScript) => void;
  onBuild: () => void;
}

interface FieldProps { label: string; value: string; placeholder: string; onChange: (value: string) => void; rows?: number; disabled?: boolean; }
const Field: React.FC<FieldProps> = ({label, value, placeholder, onChange, rows = 1, disabled = false}) => (
  <label className="form-field">
    <span>{label}</span>
    {rows > 1 ? <textarea rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      : <input value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />}
  </label>
);

export const ScriptWorkspace: React.FC<ScriptWorkspaceProps> = ({draft, dirty, writable, saving, onSetDraft, onBuild}) => (
  <div className="workspace-panel script-workspace">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">01 / 生产输入</span><h1>文案</h1></div>
      <span className={`state-chip ${dirty ? 'is-stale' : 'is-current'}`}>{dirty ? '未同步' : '已同步'}</span>
    </div>
    <p className="workspace-copy">文案与关键词会驱动当前 Project 的字幕、节奏和 Scene 语义。</p>
    {!writable && <div className="notice notice--neutral">当前为只读样例。新建项目后可以编辑生产输入。</div>}
    <div className="form-stack">
      <Field label="视频标题" value={draft.selectedTitle} placeholder="输入视频标题" disabled={!writable} onChange={(value) => onSetDraft({...draft, selectedTitle: value, topic: value})} />
      <Field label="开场钩子" value={draft.hook} placeholder="用一句明确的开场抓住注意力" disabled={!writable} onChange={(value) => onSetDraft({...draft, hook: value})} rows={2} />
      <Field label="核心观点" value={draft.viewpoint} placeholder="这条视频需要传达的关键结论" disabled={!writable} onChange={(value) => onSetDraft({...draft, viewpoint: value})} rows={2} />
      <Field label="口播稿" value={draft.script} placeholder="粘贴完整口播稿，系统将生成字幕和分镜。" disabled={!writable} onChange={(value) => onSetDraft({...draft, script: value})} rows={9} />
      <Field label="关键词" value={draft.keywords} placeholder="AI, 工作流, 自动化" disabled={!writable} onChange={(value) => onSetDraft({...draft, keywords: value})} />
    </div>
    <button className="primary-action" type="button" disabled={!writable || saving || !dirty} onClick={onBuild}>
      {saving ? '正在保存并检查' : dirty ? '保存并更新分镜' : '分镜已是最新'}
    </button>
  </div>
);
