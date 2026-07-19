// src/tools/console/RenderWorkspace.tsx
// R1: 步骤5+6 — 渲染与交付
import React from 'react';
import {theme} from './theme';

interface RenderWorkspaceProps {
  compiled: {project: unknown; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  onRunCommand: (cmd: string, label: string) => void;
  runnerOnline: boolean;
  totalFrames: number;
  fps: number;
  sceneCount: number;
}

const actionBtn = (
  label: string, onClick: () => void, active: boolean, primary = false,
  description?: string,
) => (
  <button
    onClick={onClick}
    disabled={!active}
    style={{
      width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
      marginBottom: 6,
      background: primary
        ? active ? `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})` : theme.bg.surface
        : active ? `${theme.accent.blue}14` : theme.bg.surface,
      color: active ? primary ? '#fff' : theme.accent.blue : theme.text.muted,
      fontSize: 11, fontWeight: 700, cursor: active ? 'pointer' : 'not-allowed',
      transition: 'all 0.15s', opacity: active ? 1 : 0.5,
    }}
  >
    {label}
    {description && <span style={{display: 'block', fontSize: 8, fontWeight: 400, opacity: 0.6, marginTop: 2}}>{description}</span>}
  </button>
);

export const RenderWorkspace: React.FC<RenderWorkspaceProps> = ({
  compiled, stillUrl, videoUrl, onRunCommand, runnerOnline, totalFrames, fps, sceneCount,
}) => {
  const hasCompiled = compiled.project !== null;
  const duration = Math.round(totalFrames / fps);

  return (
    <div style={{padding: '16px 18px', height: '100%', overflow: 'auto'}}>
      <div style={{marginBottom: 16}}>
        <h2 style={{margin: 0, fontSize: 13, fontWeight: 700, color: theme.text.primary}}>⚡ 渲染与交付</h2>
        <p style={{margin: '4px 0 0', fontSize: 9, color: theme.text.muted}}>
          确认分镜无误后，生成视频并下载。
        </p>
      </div>

      {/* Project stats */}
      {hasCompiled && (
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 14,
          background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
          display: 'flex', gap: 12, fontSize: 9,
        }}>
          <div>
            <span style={{color: theme.text.muted}}>场景</span>
            <div style={{color: theme.text.primary, fontWeight: 700}}>{sceneCount}</div>
          </div>
          <div>
            <span style={{color: theme.text.muted}}>时长</span>
            <div style={{color: theme.text.primary, fontWeight: 700}}>{duration}s</div>
          </div>
          <div>
            <span style={{color: theme.text.muted}}>帧数</span>
            <div style={{color: theme.text.primary, fontWeight: 700}}>{totalFrames}</div>
          </div>
          <div>
            <span style={{color: theme.text.muted}}>fps</span>
            <div style={{color: theme.text.primary, fontWeight: 700}}>{fps}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      {actionBtn('📸 生成关键帧', () => onRunCommand('project-still', '生成关键帧'), hasCompiled && runnerOnline, true, '输出一张 PNG 截图预览')}
      {actionBtn('🎬 渲染成片', () => onRunCommand('project-render', '渲染视频'), hasCompiled && runnerOnline, true, '输出完整 MP4 视频文件')}

      {/* Results */}
      {stillUrl && (
        <div style={{marginTop: 12, padding: 10, borderRadius: 6, background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`}}>
          <div style={{fontSize: 9, color: theme.text.muted, marginBottom: 6}}>📸 关键帧</div>
          <img src={stillUrl} alt="still" style={{width: '100%', borderRadius: 4, border: `1px solid ${theme.border.subtle}`}} />
        </div>
      )}

      {videoUrl && (
        <div style={{marginTop: 12, padding: 10, borderRadius: 6, background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`}}>
          <div style={{fontSize: 9, color: theme.text.muted, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>🎬 成片</span>
            <a
              href={videoUrl}
              download
              style={{
                color: theme.accent.green, fontSize: 9, fontWeight: 600, textDecoration: 'none',
                padding: '3px 10px', borderRadius: 4, background: `${theme.accent.green}14`,
              }}
            >
              下载 ↓
            </a>
          </div>
          <video src={videoUrl} controls style={{width: '100%', borderRadius: 4, border: `1px solid ${theme.border.subtle}`}} />
        </div>
      )}
    </div>
  );
};
