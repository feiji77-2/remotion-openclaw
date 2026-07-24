import React, {useEffect, useRef} from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {runnerJobProgressPercent, runnerJobHeadline} from './RenderWorkspace';
import type {ProjectState, RunnerJob} from './types';

interface PreviewCanvasProps {
  project: VideoProject;
  state: ProjectState | null;
  selectedScene: number;
  projectTitle: string;
  videoUrl: string | null;
  activeJob: RunnerJob | null;
  starting?: boolean;
}

const statusText = (state: ProjectState | null, renderBusy: boolean) => {
  if (!state) return '读取项目状态';
  if (renderBusy) return '渲染中';
  if (state.deliveryReady) return '成片已生成';
  if (state.activeJob) return '生产中';
  if (state.stages.project.status !== 'current') return '分镜待更新';
  if (state.stages.render.status === 'current' && state.stages.verify.status === 'current') return '成片已通过检查';
  if (state.stages.render.status === 'current') return '成片已生成';
  if (state.stages.render.status === 'stale') return '成片需更新';
  return '等待生成成片';
};

export const canShowFinalVideo = (state: ProjectState | null, videoUrl: string | null, renderBusy: boolean) => Boolean(
  !renderBusy
  && videoUrl
  && state?.deliveryReady
  && state.stages.render.status === 'current'
  && state.stages.verify.status === 'current',
);

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({project, state, selectedScene, projectTitle, videoUrl, activeJob, starting = false}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
  const sceneStart = project.scenes.slice(0, sceneIndex).reduce((total, item) => total + item.durationInFrames, 0);
  const renderBusy = starting || Boolean(activeJob);
  const hasRenderedVideo = canShowFinalVideo(state, videoUrl, renderBusy);
  const progress = activeJob ? runnerJobProgressPercent(activeJob) : starting ? 2 : 0;
  useEffect(() => {
    if (!hasRenderedVideo || !videoRef.current) return;
    const video = videoRef.current;
    const targetTime = sceneStart / project.render.fps;
    const syncTime = () => { video.currentTime = targetTime; };
    if (video.readyState >= 1) syncTime();
    else {
      video.addEventListener('loadedmetadata', syncTime, {once: true});
      return () => video.removeEventListener('loadedmetadata', syncTime);
    }
    return undefined;
  }, [hasRenderedVideo, project.render.fps, sceneStart, selectedScene, videoUrl]);
  if (!hasRenderedVideo) {
    const reason = state?.stages.project.status === 'stale'
      ? '分镜已过期，请先保存并更新分镜。'
      : '成片生成并通过检查后，会在这里显示。';
    const headline = renderBusy
      ? activeJob ? runnerJobHeadline(activeJob, '正在生成最终视频') : '正在准备渲染'
      : '等待生成最终视频';
    return <div className={`preview-empty render-preview-state${renderBusy ? ' is-running' : ''}`} aria-live="polite">
      <div className="preview-empty__message">
        {renderBusy && <i className="render-preview-state__spinner" aria-hidden="true" />}
        <strong>{headline}</strong>
        <span>{renderBusy ? '当前只显示后端渲染进度，不会提前播放预览或旧成片。' : reason}</span>
        {renderBusy && <div className="render-preview-state__progress" aria-label={`渲染进度 ${progress}%`}><i style={{width: `${Math.max(4, progress)}%`}} /></div>}
        {renderBusy && <em>{progress}%</em>}
      </div>
    </div>;
  }
  const displaySpec = `1080 x 1920 / ${project.render.fps} FPS`;

  return (
    <div className="preview-canvas">
      <div className="preview-meta preview-meta--top">
        <span className={`stage-dot ${state?.deliveryReady ? 'is-ready' : ''}`} />
        <span>{statusText(state, renderBusy)}</span>
      </div>
      <div className="portrait-frame">
        <video
          ref={videoRef}
          key={videoUrl}
          className="preview-video-player"
          src={videoUrl || undefined}
          controls
          playsInline
        />
      </div>
      <div className="preview-meta preview-meta--bottom">
        <span>{projectTitle}</span>
        <span>{displaySpec}</span>
      </div>
    </div>
  );
};
