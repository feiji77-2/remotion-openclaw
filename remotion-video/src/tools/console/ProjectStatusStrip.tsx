// src/tools/console/ProjectStatusStrip.tsx
// P1: 生产动作状态条 — 根据项目状态展示智能主按钮
import React, {useState, useCallback} from 'react';
import {theme} from './theme';
import type {StudioFile, ContractKey} from './types';
import type {CompiledProject} from '../../project/compileProject';

interface ProjectStatusStripProps {
  files: Record<ContractKey, StudioFile | null>;
  compiled: {project: CompiledProject | null; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  onRunCommand: (cmd: string, label: string) => void;
  onSaveScript: () => Promise<boolean>;
  runnerOnline: boolean;
  draftDirty: boolean;
}

type PhaseAction = {
  key: string;
  label: string;
  commandId: string | null;
  status: 'ready' | 'pending' | 'done' | 'disabled' | 'saving';
  description: string;
};

const computePhaseActions = (props: ProjectStatusStripProps): PhaseAction[] => {
  const {files, compiled, stillUrl, videoUrl, runnerOnline, draftDirty} = props;
  const briefExists = files['brief.json']?.exists;
  const scriptExists = files['script-pack.json']?.exists;
  const projectValid = compiled.project !== null;
  const hasScenes = compiled.project ? compiled.project.scenes.length > 3 : false;
  const savedAndClean = briefExists && scriptExists && !draftDirty;

  const online = runnerOnline ? 'ready' as const : 'disabled' as const;

  return [
    {
      key: 'save-script',
      label: '保存文案',
      commandId: null,
      status: savedAndClean ? 'done' : online,
      description: savedAndClean ? '文案已保存' : draftDirty ? '文案已修改，点击保存' : '保存 brief + 口播稿',
    },
    {
      key: 'build-project',
      label: '生成 Project JSON',
      commandId: 'build-project',
      status: !briefExists || !scriptExists ? 'pending'
        : hasScenes ? 'done'
        : online,
      description: hasScenes ? '分镜已生成' : !briefExists ? '请先保存文案' : '拆口播稿为场景',
    },
    {
      key: 'project-still',
      label: '生成关键帧',
      commandId: 'project-still',
      status: !projectValid ? 'pending'
        : stillUrl ? 'done'
        : online,
      description: stillUrl ? '关键帧已生成' : !projectValid ? 'Project JSON 未校验' : '输出 PNG',
    },
    {
      key: 'project-render',
      label: '渲染视频',
      commandId: 'project-render',
      status: !projectValid ? 'pending'
        : !stillUrl ? 'pending'
        : videoUrl ? 'done'
        : online,
      description: videoUrl ? '视频已生成' : !stillUrl ? '请先生成关键帧' : '输出 MP4',
    },
  ];
};

const statusDot = (status: PhaseAction['status']): React.CSSProperties => {
  switch (status) {
    case 'done': return {background: theme.accent.green, width: 8, height: 8, borderRadius: '50%'};
    case 'ready': return {background: theme.accent.blue, width: 8, height: 8, borderRadius: '50%'};
    case 'saving': return {background: theme.accent.amber, width: 8, height: 8, borderRadius: '50%', animation: 'none'};
    case 'pending': return {background: theme.accent.amber, width: 8, height: 8, borderRadius: '50%'};
    case 'disabled': return {background: theme.text.muted, width: 8, height: 8, borderRadius: '50%'};
  }
};

export const ProjectStatusStrip: React.FC<ProjectStatusStripProps> = (props) => {
  const [saving, setSaving] = useState(false);
  const actions = computePhaseActions(props);

  const handleClick = useCallback(async (action: PhaseAction) => {
    if (action.status === 'disabled' || action.status === 'pending' || action.status === 'saving') return;

    // 保存文案 — 直接调用 onSaveScript
    if (action.key === 'save-script') {
      if (action.status === 'done') return;
      setSaving(true);
      await props.onSaveScript();
      setSaving(false);
      return;
    }

    // 其他命令 — 走 onRunCommand
    if (action.commandId) {
      props.onRunCommand(action.commandId, action.label);
    }
  }, [props]);

  return (
    <div style={{
      padding: '6px 14px',
      borderBottom: `1px solid ${theme.border.subtle}`,
      background: theme.bg.surface,
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {actions.map((action) => {
        const effectiveStatus = action.key === 'save-script' && saving ? 'saving' : action.status;
        const isActive = effectiveStatus === 'ready';
        const isDone = effectiveStatus === 'done';
        const isSaving = effectiveStatus === 'saving';
        const isDisabled = effectiveStatus === 'disabled' || effectiveStatus === 'pending' || isSaving;

        return (
          <button
            key={action.key}
            onClick={() => handleClick(action)}
            disabled={isDisabled}
            title={isSaving ? '保存中…' : action.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 16,
              border: `1px solid ${isDone ? theme.accent.green + '66' : isActive || isSaving ? theme.accent.blue + '66' : theme.border.subtle}`,
              background: isDone ? `${theme.accent.green}11`
                : isActive || isSaving ? `${theme.accent.blue}11`
                : theme.bg.base,
              color: isDone ? theme.accent.green : isActive || isSaving ? theme.accent.blue : theme.text.muted,
              fontSize: 9,
              fontWeight: isActive || isDone || isSaving ? 600 : 400,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled && !isDone ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >
            <span style={statusDot(isSaving ? 'saving' : effectiveStatus)} />
            <span>{isSaving ? '保存中…' : action.label}</span>
            {isDone && <span style={{fontSize: 8}}>✓</span>}
          </button>
        );
      })}

      {/* Download button for complete video */}
      {props.videoUrl && (
        <a
          href={props.videoUrl}
          download
          style={{
            marginLeft: 'auto',
            padding: '5px 16px',
            borderRadius: 6,
            border: 'none',
            background: `linear-gradient(135deg, ${theme.accent.green}, ${theme.accent.blue})`,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          下载视频
        </a>
      )}
    </div>
  );
};
