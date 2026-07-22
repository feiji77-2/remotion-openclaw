import React from 'react';

interface CopyWorkshopProps {
  projectTitle: string;
  text: string;
  savedText: string;
  savedAt: string | null;
  writable: boolean;
  saving: boolean;
  transferPending: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onTransfer: () => void;
}

export const CopyWorkshop: React.FC<CopyWorkshopProps> = ({
  projectTitle,
  text,
  savedText,
  savedAt,
  writable,
  saving,
  transferPending,
  onChange,
  onSave,
  onTransfer,
}) => {
  const dirty = text !== savedText;
  const canTransfer = Boolean(savedText.trim()) && !dirty && !saving;
  return <div className="workspace-panel copy-workshop">
    <div className="workspace-heading">
      <div><span className="workspace-kicker">创作空间 / {projectTitle}</span><h1>文案制作</h1></div>
      <span className={`state-chip ${dirty ? 'is-stale' : savedAt ? 'is-current' : ''}`}>
        {dirty ? '有未保存修改' : savedAt ? '草稿已保存' : '尚未保存'}
      </span>
    </div>
    <p className="workspace-copy">在这里整理想法。只有保存并转入口播后，内容才会进入视频生产。</p>
    {!writable && <div className="notice notice--neutral">样例项目不可保存创作草稿。</div>}
    <label className="copy-editor">
      <span>创作草稿</span>
      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="从一个观点、一段开场或完整草稿开始。"
        disabled={!writable}
      />
    </label>
    <div className="copy-workshop__status">
      <span>{text.length} 字</span>
      {transferPending && <strong>已准备转入口播文案，离开本阶段时确认</strong>}
    </div>
    <div className="workspace-actions">
      <button className="secondary-action" type="button" disabled={!writable || saving || !dirty || !text.trim()} onClick={onSave}>
        {saving ? '正在保存' : '保存草稿'}
      </button>
      <button className="primary-action" type="button" disabled={!writable || !canTransfer || transferPending} onClick={onTransfer}>
        {transferPending ? '等待确认转入' : '转为口播文案'}
      </button>
    </div>
  </div>;
};
