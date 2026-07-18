// src/tools/console/FullPreview.tsx
import React from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {theme} from './theme';
import type {CompiledProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';

interface FullPreviewProps {
  compiled: {project: CompiledProject | null; error: string | null};
  project: VideoProject;
  stillUrl: string | null;
  videoUrl: string | null;
  totalFrames: number;
  onRunCommand: (cmd: string, label: string) => void;
}

export const FullPreview: React.FC<FullPreviewProps> = ({compiled, project, stillUrl, videoUrl, totalFrames, onRunCommand}) => (
  <div style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
    {/* Toolbar */}
    <div style={{
      padding: '6px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: theme.bg.elevated,
    }}>
      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>全屏预览</span>
        <span style={{fontSize: 9, color: theme.text.muted}}>
          {totalFrames} 帧 · {project.render.fps} fps
        </span>
      </div>
      <div style={{display: 'flex', gap: 6}}>
        <button
          onClick={() => onRunCommand('project-still', '生成关键帧')}
          style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
            fontSize: 9, cursor: 'pointer',
          }}
        >
          生成关键帧
        </button>
        <button
          onClick={() => onRunCommand('project-render', '渲染视频')}
          style={{
            background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
            border: 'none', color: '#fff', padding: '4px 14px', borderRadius: 6,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          渲染 MP4
        </button>
      </div>
    </div>

    {/* Player area */}
    <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050608', padding: 20, minHeight: 0}}>
      <div style={{width: '80%', maxWidth: 960}}>
        {compiled.project ? (
          <div style={{aspectRatio: '16/9', width: '100%'}}>
            <Player
              component={UltimateVideoV2}
              durationInFrames={compiled.project.durationInFrames}
              fps={compiled.project.fps}
              compositionWidth={compiled.project.width}
              compositionHeight={compiled.project.height}
              controls
              loop
              inputProps={{...project, compiledProject: compiled.project}}
              style={{width: '100%', aspectRatio: '16/9', background: '#05070d', borderRadius: 8}}
            />
          </div>
        ) : (
          <div style={{
            aspectRatio: '16/9', width: '100%', background: '#080b10',
            border: `1px solid ${theme.border.subtle}`, borderRadius: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8, color: theme.text.muted, fontSize: 10,
          }}>
            <span style={{fontSize: 24, color: theme.accent.blue}}>▶</span>
            <span>项目暂未编译</span>
            {compiled.error && <span style={{color: theme.accent.red, fontSize: 9, maxWidth: 400, textAlign: 'center'}}>{compiled.error}</span>}
          </div>
        )}
      </div>
    </div>

    {/* Still/Video results */}
    {(stillUrl || videoUrl) && (
      <div style={{
        padding: '8px 14px', borderTop: `1px solid ${theme.border.subtle}`,
        display: 'flex', gap: 12, background: theme.bg.elevated,
      }}>
        {stillUrl && (
          <div>
            <div style={{fontSize: 8, color: theme.text.muted, marginBottom: 4}}>关键帧</div>
            <img src={stillUrl} alt="still" style={{height: 80, borderRadius: 4, border: `1px solid ${theme.border.subtle}`}} />
          </div>
        )}
        {videoUrl && (
          <div>
            <div style={{fontSize: 8, color: theme.text.muted, marginBottom: 4}}>成片</div>
            <video src={videoUrl} controls style={{height: 80, borderRadius: 4, border: `1px solid ${theme.border.subtle}`}} />
          </div>
        )}
      </div>
    )}
  </div>
);
