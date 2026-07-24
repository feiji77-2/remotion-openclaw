import React from 'react';
import type {VideoProject} from '../../project/projectSchema';
import type {ProjectState, RunnerJob, SceneStillsManifest} from './types';
import {SceneEditWorkspace} from './SceneEditWorkspace';

interface StoryboardWorkspaceProps {
  project: VideoProject;
  fps: number;
  selectedScene: number;
  state: ProjectState | null;
  sceneStills: SceneStillsManifest | null;
  activeJob: RunnerJob | null;
  runnerOnline: boolean;
  busy: boolean;
  writable: boolean;
  saving: boolean;
  onSaveScene: (sceneIndex: number, payload: Record<string, unknown>) => void | boolean | Promise<void | boolean>;
  onRenderSceneStills: () => void;
}

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  project,
  fps,
  selectedScene,
  state,
  sceneStills,
  activeJob,
  runnerOnline,
  busy,
  writable,
  saving,
  onSaveScene,
  onRenderSceneStills,
}) => {
  return <div className="workspace-panel storyboard-workspace">
    <div className="workspace-heading"><div><span className="workspace-kicker">04 / 分镜编辑</span><h1>当前分镜</h1></div><span className={`state-chip is-${state?.stages.project.status || 'missing'}`}>{state?.stages.project.status === 'current' ? '已检查' : '待更新'}</span></div>
    <p className="workspace-copy">底部时间线选择分镜，中间区域显示当前分镜图片；这里只改当前分镜的内容、组件和画面设定。</p>
    <SceneEditWorkspace project={project} selectedScene={selectedScene} sceneStills={sceneStills} fps={fps} writable={writable} saving={saving} busy={busy} activeJob={activeJob} runnerOnline={runnerOnline} onSaveScene={onSaveScene} onRenderSceneStills={onRenderSceneStills} allowStillRender />
  </div>;
};
