import React from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {visualPlanEntriesForScene} from '../../project/visualPlan';
import {sceneStillsProgressPercent} from './RenderWorkspace';
import {sceneKeywords, scenePurpose, sceneTitle} from './scene-labels';
import type {ProjectState, RunnerJob, SceneStillsManifest} from './types';

interface StoryboardFrameCanvasProps {
  project: VideoProject;
  projectTitle: string;
  selectedScene: number;
  sceneStills: SceneStillsManifest | null;
  state: ProjectState | null;
  activeJob: RunnerJob | null;
  fps: number;
}

const stringOf = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

const captionForScene = (project: VideoProject, scene: VideoProject['scenes'][number]) => {
  const range = scene.captionRange;
  if (!range) return '';
  return project.captions
    .slice(range.startIndex, range.endIndex + 1)
    .map((caption) => caption.text)
    .join('');
};

const stillStatus = (
  state: ProjectState | null,
  still: SceneStillsManifest['scenes'][number] | null,
  activeJob: RunnerJob | null,
) => {
  if (activeJob?.commandId === 'project-scene-stills') return '正在渲染关键帧';
  if (still) return '关键帧已生成';
  if (state?.stages.sceneStills?.status === 'stale') return '关键帧待更新';
  return 'Visual Plan 诊断';
};

export const StoryboardFrameCanvas: React.FC<StoryboardFrameCanvasProps> = ({
  project,
  projectTitle,
  selectedScene,
  sceneStills,
  state,
  activeJob,
  fps,
}) => {
  const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
  const scene = project.scenes[sceneIndex];
  const still = scene ? sceneStills?.scenes.find((item) => item.sceneId === scene.id) || null : null;
  const rendering = activeJob?.commandId === 'project-scene-stills';
  const progress = rendering ? sceneStillsProgressPercent(activeJob, project.scenes.length) : 0;

  if (!scene) {
    return <div className="preview-empty"><div className="preview-empty__message"><strong>等待分镜</strong><span>保存并更新口播后，这里会显示当前选中的分镜图片。</span></div></div>;
  }

  const title = sceneTitle(scene);
  const purpose = scenePurpose(scene);
  const keywords = sceneKeywords(scene).slice(0, 5);
  const caption = stringOf(scene.payload.footer, captionForScene(project, scene)).slice(0, 96);
  const accent = stringOf(scene.payload.accent, '#d9642a');
  const duration = (scene.durationInFrames / fps).toFixed(1);
  const status = stillStatus(state, still, activeJob);
  const planEntries = visualPlanEntriesForScene(project.visualPlan, scene.id);
  const componentLabel = planEntries.map((entry) => entry.componentId).filter((value, index, values) => values.indexOf(value) === index).join(' / ');
  const planErrors = planEntries.flatMap((entry) => entry.diagnostics).filter((diagnostic) => diagnostic.level === 'error');

  return <div className="storyboard-canvas" aria-label="当前分镜画布">
    <div className="preview-meta preview-meta--top">
      <span className={`stage-dot ${still ? 'is-ready' : ''}`} />
      <span>{status}</span>
    </div>
    <figure className={`storyboard-frame ${still ? 'has-still' : 'is-structure'}`} style={{'--scene-accent': accent} as React.CSSProperties}>
      {still
        ? <img src={still.url} alt={`分镜 ${sceneIndex + 1} 关键帧`} />
        : <div className="storyboard-plan-empty">
          <div className="storyboard-static-shot__top">
            <span>{String(sceneIndex + 1).padStart(2, '0')} / {duration}s</span>
            <em>{componentLabel || 'Visual Plan missing'}</em>
          </div>
          <div className="storyboard-plan-empty__message">
            <small>{projectTitle}</small>
            <strong>{planErrors.length ? '生产计划存在错误' : '关键帧尚未生成'}</strong>
            <p>{planErrors.map((diagnostic) => diagnostic.message).join(' / ') || '这里先展示同一份 Visual Plan 的元数据与诊断，生成关键帧后会切换成与最终 MP4 相同的真实画面。'}</p>
          </div>
          {caption && <div className="storyboard-static-shot__caption">{caption}</div>}
        </div>}
      {rendering && <div className="storyboard-rendering" aria-live="polite">
        <div className="action-spinner" aria-hidden="true" />
        <strong>正在渲染关键帧</strong>
        <span>{progress}% · 完成后自动替换为当前分镜图片</span>
        <div className="storyboard-rendering__bar"><i style={{width: `${Math.max(6, progress)}%`}} /></div>
      </div>}
    </figure>
    <div className="preview-meta preview-meta--bottom">
      <span>{String(sceneIndex + 1).padStart(2, '0')} / {title}</span>
      <span>{duration}s · 1080 x 1920</span>
    </div>
  </div>;
};
