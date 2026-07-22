import React, {useEffect, useRef} from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import type {CompiledProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';
import type {ProjectState} from './types';

interface PreviewCanvasProps {
  compiled: {project: CompiledProject | null; error: string | null};
  project: VideoProject;
  state: ProjectState | null;
  selectedScene: number;
  projectTitle: string;
  videoUrl: string | null;
}

const statusText = (state: ProjectState | null) => {
  if (!state) return '读取项目状态';
  if (state.deliveryReady) return '成片已生成';
  if (state.activeJob?.commandId === 'render-verify') return '渲染中';
  if (state.activeJob) return '生产中';
  if (state.stages.project.status !== 'current') return '分镜待更新';
  if (state.stages.render.status === 'current' && state.stages.verify.status === 'current') return '成片已通过检查';
  if (state.stages.render.status === 'current') return '成片已生成';
  if (state.stages.render.status === 'stale') return '成片需更新';
  return '等待生成成片';
};

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({compiled, project, state, selectedScene, projectTitle, videoUrl}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
  const sceneStart = project.scenes.slice(0, sceneIndex).reduce((total, item) => total + item.durationInFrames, 0);
  const hasRenderedVideo = Boolean(videoUrl && state?.stages.render.status === 'current');
  const canShowLiveComposition = Boolean(compiled.project && (!state || state.stages.project.status === 'current'));
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
  if (!hasRenderedVideo && !canShowLiveComposition) {
    const reason = compiled.error || (state?.stages.project.status === 'stale' ? '分镜已过期，请先保存并更新分镜。' : '分镜更新后，在渲染页生成并审看成片。');
    return <div className="preview-empty"><div className="preview-empty__message"><strong>等待生成最终视频</strong><span>{reason}</span></div></div>;
  }
  const cp = compiled.project;
  const displaySpec = cp ? `${cp.width} x ${cp.height} / ${cp.fps} FPS` : `1080 x 1920 / ${project.render.fps} FPS`;

  return (
    <div className="preview-canvas">
      <div className="preview-meta preview-meta--top">
        <span className={`stage-dot ${state?.deliveryReady ? 'is-ready' : ''}`} />
        <span>{statusText(state)}</span>
      </div>
      <div className="portrait-frame">
        {hasRenderedVideo && videoUrl ? <video
          ref={videoRef}
          key={videoUrl}
          className="preview-video-player"
          src={videoUrl}
          controls
          playsInline
        /> : cp && <Player
            key={`${project.projectId}-${selectedScene}`}
            component={UltimateVideoV2}
            durationInFrames={cp.durationInFrames}
            fps={cp.fps}
            compositionWidth={cp.width}
            compositionHeight={cp.height}
            controls
            loop
            initialFrame={sceneStart}
            inputProps={{...project, compiledProject: cp}}
            style={{width: '100%', height: '100%', background: '#fffaf2'}}
          />}
      </div>
      <div className="preview-meta preview-meta--bottom">
        <span>{projectTitle}</span>
        <span>{displaySpec}</span>
      </div>
    </div>
  );
};
