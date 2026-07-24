import React from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {visualPlanEntriesForScene} from '../../project/visualPlan';
import type {RunnerJob, SceneStillsManifest} from './types';
import {scenePurpose, sceneTitle} from './scene-labels';

interface SceneEditWorkspaceProps {
  project: VideoProject;
  selectedScene: number;
  sceneStills: SceneStillsManifest | null;
  fps: number;
  writable: boolean;
  saving: boolean;
  busy: boolean;
  activeJob?: RunnerJob | null;
  runnerOnline: boolean;
  onSaveScene: (sceneIndex: number, payload: Record<string, unknown>) => void | boolean | Promise<void | boolean>;
  onRenderSceneStills: () => void;
  trace?: React.ReactNode;
  allowStillRender?: boolean;
}

const captionText = (project: VideoProject, startIndex: number, endIndex: number) =>
  project.captions.slice(startIndex, endIndex + 1).map((caption) => caption.text).join('');

export const SceneEditWorkspace: React.FC<SceneEditWorkspaceProps> = ({
  project,
  selectedScene,
  sceneStills,
  fps,
  busy,
  activeJob = null,
  runnerOnline,
  onRenderSceneStills,
  trace,
  allowStillRender = false,
}) => {
  const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
  const scene = project.scenes[sceneIndex];
  if (!scene) return <div className="preview-empty-state">保存并更新口播后，这里会显示 Visual Plan。</div>;

  const entries = visualPlanEntriesForScene(project.visualPlan, scene.id);
  const diagnostics = entries.flatMap((entry) => entry.diagnostics.map((diagnostic) => ({...diagnostic, entryId: entry.id})));
  const stillRenderBusyLabel = activeJob?.commandId === 'project-scene-stills'
    ? '正在渲染关键帧'
    : activeJob?.commandId === 'build-check'
      ? '正在更新生产计划'
      : activeJob
        ? '等待当前任务完成'
        : null;

  return <section className="scene-edit visual-plan-inspector" aria-label="当前分镜 Visual Plan">
    <div className="scene-edit__summary">
      <div>
        <small>{String(sceneIndex + 1).padStart(2, '0')} / {(scene.durationInFrames / fps).toFixed(1)}s</small>
        <strong>{sceneTitle(scene)}</strong>
        <span>{scenePurpose(scene)}</span>
      </div>
    </div>

    {!project.visualPlan && <div className="notice notice--danger">当前项目没有 Visual Plan，不能证明分镜与成片一致。请重新生成项目。</div>}
    {project.visualPlan && entries.length === 0 && <div className="notice notice--danger">当前场景没有 Visual Plan entry，生产检查会阻止渲染。</div>}
    {diagnostics.map((diagnostic) => <div className={`notice notice--${diagnostic.level === 'error' ? 'danger' : diagnostic.level === 'warning' ? 'warning' : 'neutral'}`} key={`${diagnostic.entryId}:${diagnostic.code}`}>
      <strong>{diagnostic.code}</strong> {diagnostic.message}
    </div>)}

    <div className="visual-plan-list">
      {entries.map((entry) => <article className="visual-plan-entry" key={entry.id} data-component-id={entry.componentId}>
        <div className="visual-plan-entry__time">
          <strong>{(entry.startFrame / fps).toFixed(2)}s</strong>
          <span>{(entry.endFrame / fps).toFixed(2)}s</span>
        </div>
        <div className="visual-plan-entry__content">
          <small>字幕 {entry.captionStartIndex + 1} · {entry.intent.key}</small>
          <p>{captionText(project, entry.captionStartIndex, entry.captionEndIndex)}</p>
          <div className="visual-plan-entry__meta">
            <span>{entry.componentId}</span>
            <span>{entry.shot.kind}</span>
            <span>{entry.resolution}</span>
          </div>
        </div>
      </article>)}
    </div>

    <div className="scene-edit__actions">
      {allowStillRender && <button className="primary-action" type="button" disabled={!runnerOnline || busy || project.scenes.length === 0 || entries.length === 0} onClick={onRenderSceneStills}>{stillRenderBusyLabel ? <><i className="action-spinner" aria-hidden="true" />{stillRenderBusyLabel}</> : sceneStills ? '重渲染关键帧' : '渲染关键帧'}</button>}
    </div>
    {trace}
  </section>;
};
