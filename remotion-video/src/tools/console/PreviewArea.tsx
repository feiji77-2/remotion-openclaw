// src/tools/console/PreviewArea.tsx
import React from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {theme} from './theme';
import type {CompiledProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';

interface PreviewAreaProps {
  compiled: {project: CompiledProject | null; error: string | null};
  project: VideoProject;
  stillUrl: string | null;
  totalFrames: number;
}

export const PreviewArea: React.FC<PreviewAreaProps> = ({compiled, project, stillUrl, totalFrames}) => (
  <div>
    <div style={{padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>▶ 预览</span>
    </div>
    <div style={{padding: 8, background: '#050608', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
            style={{width: '100%', aspectRatio: '16/9', background: '#05070d'}}
          />
        </div>
      ) : (
        <div style={{
          aspectRatio: '16/9', width: '100%', background: '#080b10',
          border: `1px solid ${theme.border.subtle}`, borderRadius: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, color: theme.text.muted, fontSize: 9,
        }}>
          <span style={{fontSize: 18, color: theme.accent.blue}}>▶</span>
          <span>Remotion Player</span>
          {compiled.error && <span style={{color: theme.accent.red, fontSize: 8}}>{compiled.error}</span>}
        </div>
      )}
    </div>
    <div style={{padding: '4px 10px', fontSize: 8, color: theme.text.muted, textAlign: 'center', borderBottom: `1px solid ${theme.border.subtle}`}}>
      帧 {stillUrl ? '已生成关键帧' : `0 / ${totalFrames}`}
    </div>
  </div>
);
