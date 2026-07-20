// src/tools/console/StoryboardWorkspace.tsx
// R1: 步骤3 — 分镜阅览
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';

interface StoryboardWorkspaceProps {
  project: VideoProject;
  totalFrames: number;
  fps: number;
}

const rendererLabel = (scene: VideoProject['scenes'][number]) =>
  scene.payload.heroStyle === 'cinematic' ? 'Cinematic' : 'Hero Track';

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({project, totalFrames, fps}) => {
  if (project.scenes.length === 0) {
    return (
      <div style={{padding: '16px 18px', height: '100%'}}>
        <h2 style={{margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: theme.text.primary}}>☰ 分镜</h2>
        <div style={{
          padding: 16, borderRadius: 6, textAlign: 'center',
          background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
          fontSize: 10, color: theme.text.muted,
        }}>
          暂无分镜数据。请先生成 Project JSON。
        </div>
      </div>
    );
  }

  let cursor = 0;

  return (
    <div style={{padding: '16px 18px', height: '100%', overflow: 'auto'}}>
      <div style={{marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <h2 style={{margin: 0, fontSize: 13, fontWeight: 700, color: theme.text.primary}}>☰ 分镜</h2>
        <span style={{fontSize: 9, color: theme.text.muted}}>
          {project.scenes.length} 场景 · {Math.round(totalFrames / fps)}s
        </span>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        {project.scenes.map((scene, i) => {
          const start = cursor;
          const end = cursor + scene.durationInFrames;
          cursor = end;
          const accent = String(scene.payload.accent || 'cyan');
          const accentColor = theme.accent[accent as keyof typeof theme.accent] || theme.accent.blue;
          const payloadPreview = Object.entries(scene.payload)
            .filter(([k]) => k !== 'accent' && k !== 'assetIds')
            .slice(0, 2)
            .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
            .join(' · ');

          return (
            <div key={scene.id} style={{
              padding: '8px 10px', borderRadius: 6,
              background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
              borderLeft: `3px solid ${accentColor}`,
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3}}>
                <span style={{fontSize: 10, fontWeight: 700, color: theme.text.primary}}>
                  {String(i + 1).padStart(2, '0')}. {rendererLabel(scene)}
                </span>
                <span style={{fontSize: 8, color: theme.text.muted}}>
                  {Math.round(start / fps * 10) / 10}s → {Math.round(end / fps * 10) / 10}s
                </span>
              </div>
              <div style={{fontSize: 8, color: theme.text.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {scene.id}
              </div>
              {payloadPreview && (
                <div style={{fontSize: 7, color: accentColor + 'aa', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {payloadPreview}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
