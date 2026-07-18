// src/tools/console/SettingsPanel.tsx
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {ProjectOption, DraftScript} from './types';

interface SettingsPanelProps {
  project: VideoProject;
  draft: DraftScript;
  selectedProject: ProjectOption;
  onSaveProject: () => Promise<boolean>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({project, selectedProject, onSaveProject}) => {
  const totalFrames = project.scenes.reduce((t, s) => t + s.durationInFrames, 0);

  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
      {/* Header */}
      <div style={{
        padding: '6px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
        background: theme.bg.elevated,
      }}>
        <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>项目设置</span>
      </div>

      <div style={{flex: 1, overflow: 'auto', padding: 14, fontSize: 10}}>
        {/* Project info */}
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase'}}>
            项目信息
          </div>
          <div style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Row label="项目 ID" value={project.projectId} />
            <Row label="标题" value={project.title} />
            <Row label="生产目录" value={selectedProject.productionPath} />
            <Row label="输出路径" value={selectedProject.outputVideoPath} />
          </div>
        </div>

        {/* Render config */}
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase'}}>
            渲染配置
          </div>
          <div style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Row label="分辨率" value={`${project.render.width} × ${project.render.height}`} />
            <Row label="帧率" value={`${project.render.fps} fps`} />
            <Row label="质量模式" value={project.render.qualityMode} />
            <Row label="方向" value={project.render.orientation} />
            <Row label="总帧数" value={`${totalFrames} 帧 (${(totalFrames / project.render.fps).toFixed(1)}s)`} />
          </div>
        </div>

        {/* Scene list */}
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase'}}>
            场景列表 ({project.scenes.length})
          </div>
          <div style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderRadius: 6, overflow: 'hidden',
          }}>
            {project.scenes.map((scene, i) => (
              <div key={scene.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px', fontSize: 9,
                borderBottom: i < project.scenes.length - 1 ? `1px solid ${theme.border.subtle}` : 'none',
              }}>
                <span style={{color: theme.text.muted, fontWeight: 600, fontSize: 8}}>#{i + 1}</span>
                <span style={{color: theme.text.primary, flex: 1}}>{scene.id}</span>
                <span style={{color: theme.text.muted, fontSize: 8, background: theme.bg.elevated, padding: '1px 6px', borderRadius: 3}}>
                  {scene.family}
                </span>
                <span style={{color: theme.text.muted, fontSize: 8}}>{scene.durationInFrames}f</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audio config */}
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 9, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase'}}>
            音频配置
          </div>
          <div style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Row label="配音" value={project.audio.voiceAssetId || '未设置'} />
            <Row label="背景音乐" value={project.audio.musicAssetId || '未设置'} />
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onSaveProject}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
            border: 'none', color: '#fff', padding: '6px 0', borderRadius: 6,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          保存设置
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{label: string; value: string}> = ({label, value}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
    <span style={{color: theme.text.muted}}>{label}</span>
    <span style={{color: theme.text.primary, fontFamily: theme.mono, fontSize: 9}}>{value}</span>
  </div>
);
