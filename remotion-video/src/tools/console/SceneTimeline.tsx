// src/tools/console/SceneTimeline.tsx
// R1: 底部场景时间线 — scene 卡片横排 + 时长条
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';

interface SceneTimelineProps {
  project: VideoProject;
  totalFrames: number;
  fps: number;
}

const rendererLabel = (scene: VideoProject['scenes'][number]) =>
  scene.payload.heroStyle === 'cinematic' ? 'Cinematic' : 'Hero Track';

export const SceneTimeline: React.FC<SceneTimelineProps> = ({project, totalFrames, fps}) => {
  if (project.scenes.length === 0) {
    return (
      <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: theme.text.muted}}>
        暂无场景 — 保存文案并生成分镜后出现
      </div>
    );
  }

  let cursor = 0;
  const totalSec = Math.round(totalFrames / fps);

  return (
    <div style={{height: '100%', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 3, overflow: 'auto'}}>
      {project.scenes.map((scene, i) => {
        const start = cursor;
        const end = cursor + scene.durationInFrames;
        cursor = end;
        const startSec = Math.round(start / fps * 10) / 10;
        const endSec = Math.round(end / fps * 10) / 10;
        const pct = (scene.durationInFrames / totalFrames) * 100;
        const accent = String(scene.payload.accent || 'cyan');
        const accentColor = theme.accent[accent as keyof typeof theme.accent] || theme.accent.blue;

        return (
          <div
            key={scene.id}
            title={`${scene.id} (${rendererLabel(scene)}) ${startSec}s–${endSec}s`}
            style={{
              flex: `0 0 ${Math.max(pct * 4, 2.5)}%`,
              height: 44, borderRadius: 6, padding: '4px 6px',
              background: theme.bg.surface,
              border: `1px solid ${theme.border.subtle}`,
              borderLeft: `3px solid ${accentColor}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              transition: 'all 0.1s',
              cursor: 'default',
            }}
          >
            <div style={{fontSize: 7, fontWeight: 700, color: accentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
              {String(i + 1).padStart(2, '0')} {rendererLabel(scene)}
            </div>
            <div style={{fontSize: 6, color: theme.text.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
              {scene.id}
            </div>
            <div style={{fontSize: 6, color: theme.text.muted}}>
              {Math.round(scene.durationInFrames / fps * 10) / 10}s
            </div>
          </div>
        );
      })}
      <div style={{fontSize: 8, color: theme.text.muted, marginLeft: 6, flexShrink: 0}}>
        {project.scenes.length} 场景 · {totalSec}s
      </div>
    </div>
  );
};
