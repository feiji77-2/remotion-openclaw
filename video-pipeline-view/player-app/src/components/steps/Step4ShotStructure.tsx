import React, {useCallback, useMemo} from 'react';
import {usePersistentStepEditor} from './usePersistentStepEditor';

interface Shot {
  id?: string;
  title?: string;
  narration?: string;
  durationSeconds?: number;
  visualStyle?: string;
}

interface Step4ShotStructureProps {
  stepId: number;
  shots: Shot[];
  onUpdate: (updated: Shot[]) => void;
  onGenerate: () => void;
  loading: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  workbenchMode?: boolean;
}

export const Step4ShotStructure: React.FC<Step4ShotStructureProps> = ({
  stepId,
  shots,
  onUpdate,
  onGenerate,
  loading,
  confirmed,
  onConfirm,
  workbenchMode = false,
}) => {
  const {
    editing,
    setEditing,
    draft,
    setDraft,
    clearEditor,
  } = usePersistentStepEditor<Shot[]>('remotion-step-editor-step4-shots');

  const openEditor = useCallback(() => {
    setDraft(shots.map(s => ({ ...s })));
    setEditing(true);
  }, [shots]);

  const saveEditor = useCallback(() => {
    onUpdate(draft || []);
    clearEditor();
  }, [clearEditor, draft, onUpdate]);

  const cancelEditor = useCallback(() => {
    clearEditor();
  }, [clearEditor]);

  const updateShot = useCallback((idx: number, field: keyof Shot, value: any) => {
    setDraft((prev) => (prev || []).map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }, []);

  const addShot = useCallback(() => {
    setDraft((prev) => [
      ...(prev || []),
      {
        title: `镜头 ${(prev || []).length + 1}`,
        narration: '',
        durationSeconds: 5,
      },
    ]);
  }, []);

  const removeShot = useCallback((idx: number) => {
    setDraft((prev) => (prev || []).filter((_, i) => i !== idx));
  }, []);

  const display = editing ? (draft || []) : shots;
  const totalDuration = display.reduce((s, sh) => s + (sh.durationSeconds || 0), 0);
  const hasShots = display.length > 0;
  const statLabel = useMemo(() => `${Number(totalDuration.toFixed(1))}s`, [totalDuration]);

  if (!hasShots && !editing && workbenchMode) {
    return (
      <div className="wf-step4-root">
        <div className="wf-inline-empty wf-inline-empty-workbench">
          还没有分镜结果，先按当前 skill 生成镜头卡。
        </div>
      </div>
    );
  }

  return (
    <div className="wf-step4-root">
      <div className={workbenchMode ? 'wf-result-toolbar' : 'wf-step4-stats'}>
        <div className={workbenchMode ? 'wf-result-toolbar-meta' : 'wf-step4-stats-meta'}>
          <span className="wf-stat-pill">镜头 {display.length}</span>
          <span className="wf-stat-pill">总时长 {statLabel}</span>
        </div>
        {!editing ? (
          <div className="wf-stage-action-row">
            <button type="button" className="wf-btn wf-btn-edit" onClick={openEditor} disabled={loading}>
              编辑结果
            </button>
          </div>
        ) : null}
      </div>

      <div className="wf-shot-list">
        {display.map((shot, idx) => (
          <div key={shot.id || idx} className="wf-shot">
            {editing ? (
              <>
                <div className="wf-shot-edit-header">
                  <span className="wf-shot-index">镜{idx + 1}</span>
                  <div className="wf-shot-edit-row">
                    <label>标题</label>
                    <input
                      type="text"
                      value={shot.title || ''}
                      onChange={e => updateShot(idx, 'title', e.target.value)}
                      placeholder="镜头标题"
                    />
                    <label>时长(s)</label>
                    <input
                      type="number"
                      value={shot.durationSeconds || 5}
                      onChange={e => updateShot(idx, 'durationSeconds', Number(e.target.value))}
                      min={1}
                      max={60}
                      style={{ width: 60 }}
                    />
                    <button type="button" className="wf-btn-remove-block"
                      onClick={() => removeShot(idx)}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <textarea
                  className="wf-edit-textarea"
                  value={shot.narration || ''}
                  onChange={e => updateShot(idx, 'narration', e.target.value)}
                  placeholder="旁白台词 / 场景描述"
                  rows={3}
                />
              </>
            ) : (
              <>
                <div className="wf-shot-head">
                  <strong>{shot.title || '无标题'}</strong>
                  <span className="wf-shot-duration">{shot.durationSeconds || '?'}s</span>
                </div>
                <p className="wf-shot-narration">{shot.narration || '（无旁白）'}</p>
                {shot.visualStyle && (
                  <span className="wf-shot-style">🎨 {shot.visualStyle}</span>
                )}
              </>
            )}
          </div>
        ))}

        {display.length === 0 && !editing && (
          <div className="wf-empty-visual">
            <div className="wf-empty-title">暂无场景数据</div>
            <div className="wf-empty-text">生成后将在这里展示场景编排结果</div>
          </div>
        )}
      </div>

      <div className="wf-inline-actions" style={{ marginTop: 16 }}>
        {editing ? (
          <>
            <button type="button" className="wf-btn wf-btn-add-block" onClick={addShot}>
              + 添加场景
            </button>
            <button type="button" className="wf-btn wf-btn-save" onClick={saveEditor}>
              保存场景
            </button>
            <button type="button" className="wf-btn wf-btn-cancel" onClick={cancelEditor}>
              取消
            </button>
          </>
        ) : !workbenchMode ? (
          <>
            <button
              type="button"
              className={`wf-btn wf-btn-regenerate ${loading ? 'loading' : ''}`}
              onClick={onGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '重新生成 Step ' + stepId}
            </button>
            <button
              type="button"
              className={`wf-btn wf-btn-confirm ${confirmed ? 'active' : ''}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {confirmed ? '✓ 已确认场景' : '确认当前场景'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
