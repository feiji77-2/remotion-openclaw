// src/tools/console/Topbar.tsx
import React from 'react';
import {theme} from './theme';
import type {ProjectOption, RunnerStatus} from './types';

interface TopbarProps {
  project: ProjectOption;
  projects: ProjectOption[];
  runnerStatus: RunnerStatus;
  onSelectProject: (p: ProjectOption) => void;
  onRunCommand: (cmd: string, label: string) => void;
  onToggleLog: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  project, projects, runnerStatus, onSelectProject, onRunCommand, onToggleLog,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', height: 44, padding: '0 14px',
    background: theme.bg.elevated, borderBottom: `1px solid ${theme.border.subtle}`,
  }}>
    {/* Logo */}
    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: '#fff', fontWeight: 800,
      }}>V</div>
      <span style={{fontWeight: 700, fontSize: 13, color: theme.text.primary, letterSpacing: -0.3}}>
        Video Factory
      </span>
    </div>

    {/* Breadcrumb */}
    <div style={{display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, fontSize: 10, color: theme.text.muted}}>
      <span>Projects</span>
      <span>›</span>
      <span style={{color: theme.text.secondary}}>{project.id}</span>
    </div>

    {/* Project selector */}
    <select
      value={project.projectJsonPath}
      onChange={(e) => {
        const next = projects.find((p) => p.projectJsonPath === e.target.value);
        if (next) onSelectProject(next);
      }}
      style={{
        marginLeft: 12, background: theme.bg.surface, color: theme.text.primary,
        border: `1px solid ${theme.border.default}`, borderRadius: 4, padding: '3px 8px',
        fontSize: 10, outline: 'none',
      }}
    >
      {projects.map((p) => (
        <option key={p.projectJsonPath} value={p.projectJsonPath}>{p.title}</option>
      ))}
    </select>

    {/* Spacer */}
    <div style={{flex: 1}} />

    {/* Status indicators */}
    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, background: theme.bg.surface,
        padding: '3px 10px', borderRadius: 20, fontSize: 9,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: runnerStatus === 'online' ? theme.accent.green
            : runnerStatus === 'checking' ? theme.accent.amber : theme.accent.red,
        }} />
        <span style={{color: theme.text.muted}}>
          {runnerStatus === 'online' ? 'Executor Online' : runnerStatus === 'checking' ? '检测中' : '离线'}
        </span>
      </div>

      <button
        onClick={onToggleLog}
        style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
          fontSize: 9, cursor: 'pointer',
        }}
      >
        任务管理
      </button>

      <button
        onClick={() => onRunCommand('build-project', '生成分镜')}
        style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
          fontSize: 9, cursor: 'pointer',
        }}
      >
        生成分镜
      </button>

      <button
        onClick={() => onRunCommand('project-render', '生成视频')}
        style={{
          background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
          border: 'none', color: '#fff', padding: '4px 14px', borderRadius: 6,
          fontSize: 10, fontWeight: 600, cursor: 'pointer',
        }}
      >
        渲染
      </button>
    </div>
  </div>
);
