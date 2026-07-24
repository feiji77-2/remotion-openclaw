import React from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {sceneKeywords, scenePurpose, sceneTitle} from './scene-labels';
import type {SceneStillsManifest} from './types';

interface SceneTimelineProps {
  project: VideoProject;
  totalFrames: number;
  fps: number;
  selectedScene: number;
  sceneStills?: SceneStillsManifest | null;
  stillsRendering?: boolean;
  onSelectScene: (index: number) => void;
}

export const SceneTimeline: React.FC<SceneTimelineProps> = ({project, totalFrames, fps, selectedScene, sceneStills, stillsRendering = false, onSelectScene}) => {
  if (!project.scenes.length) return <div className="timeline-empty">保存并更新分镜后，场景将在此处出现。</div>;
  const sceneIndex = Math.min(Math.max(selectedScene, 0), project.scenes.length - 1);
  const selected = project.scenes[sceneIndex];
  const selectedStart = project.scenes.slice(0, sceneIndex).reduce((total, scene) => total + scene.durationInFrames, 0);
  const selectedEnd = selectedStart + selected.durationInFrames;
  const detailOffset = totalFrames > 0 ? Math.min((selectedStart / totalFrames) * 100, 68) : 0;
  const detailAccent = String(selected.payload.accent || '#42d3b6');
  const keywords = sceneKeywords(selected).slice(0, 4);
  const generatedSceneIds = new Set((sceneStills?.scenes || []).map((still) => still.sceneId));
  const selectedStillStatus = stillsRendering ? '关键帧渲染中' : generatedSceneIds.has(selected.id) ? '关键帧已生成' : '关键帧未生成';
  return (
    <div className="scene-timeline">
      <div className="timeline-summary"><strong>{project.scenes.length}</strong><span>场景</span><span>{Math.round(totalFrames / fps)} 秒</span></div>
      <div className="timeline-main">
        <div className="timeline-track">
          {project.scenes.map((scene, index) => {
            const width = `${Math.max((scene.durationInFrames / totalFrames) * 100, 8)}%`;
            const accent = String(scene.payload.accent || '#42d3b6');
            return <button
              className={`timeline-scene ${sceneIndex === index ? 'is-selected' : ''}`}
              disabled={stillsRendering}
              key={scene.id}
              onClick={() => onSelectScene(index)}
              style={{'--scene-accent': accent, flexBasis: width} as React.CSSProperties}
              title={`场景 ${index + 1}: ${sceneTitle(scene)}`}
              type="button"
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{sceneTitle(scene)}</strong>
              <small>{(scene.durationInFrames / fps).toFixed(1)}s</small>
            </button>;
          })}
        </div>
        <div
          className="timeline-detail"
          style={{'--scene-accent': detailAccent, '--detail-offset': `${detailOffset}%`} as React.CSSProperties}
        >
          <small>{String(sceneIndex + 1).padStart(2, '0')} / {(selectedStart / fps).toFixed(1)} - {(selectedEnd / fps).toFixed(1)}s</small>
          <i className={`timeline-detail__still ${stillsRendering ? 'is-running' : generatedSceneIds.has(selected.id) ? 'is-ready' : ''}`}>{selectedStillStatus}</i>
          <strong>{sceneTitle(selected)}</strong>
          <em>{scenePurpose(selected)}</em>
          {keywords.length > 0 && <span>{keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</span>}
        </div>
      </div>
    </div>
  );
};
