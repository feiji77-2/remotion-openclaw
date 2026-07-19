// src/tools/console/PreviewCanvas.tsx
// R1: 中心视频预览画布 — Remotion Player
import React from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {theme} from './theme';
import type {CompiledProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';

interface PreviewCanvasProps {
  compiled: {project: CompiledProject | null; error: string | null};
  project: VideoProject;
  stillUrl: string | null;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({compiled, project, stillUrl}) => {
  if (!compiled.project) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: theme.text.muted, fontSize: 11,
      }}>
        <span style={{fontSize: 32, color: theme.accent.blue + '44'}}>▶</span>
        <span>视频预览</span>
        {compiled.error && (
          <span style={{color: theme.accent.red, fontSize: 9, maxWidth: 320, textAlign: 'center', lineHeight: 1.5}}>
            {compiled.error}
          </span>
        )}
        <span style={{fontSize: 9}}>填写文案并保存后，在此预览</span>
      </div>
    );
  }

  const {project: cp} = compiled;
  const isPortrait = cp.orientation === 'portrait';

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: isPortrait ? 'auto' : '100%',
        height: isPortrait ? '100%' : 'auto',
        maxWidth: isPortrait ? '45%' : '100%',
        maxHeight: isPortrait ? '100%' : '100%',
        aspectRatio: isPortrait ? '9/16' : '16/9',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: `0 4px 32px ${theme.accent.blue}11, 0 0 0 1px ${theme.border.subtle}`,
      }}>
        <Player
          component={UltimateVideoV2}
          durationInFrames={cp.durationInFrames}
          fps={cp.fps}
          compositionWidth={cp.width}
          compositionHeight={cp.height}
          controls
          loop
          inputProps={{...project, compiledProject: cp}}
          style={{width: '100%', height: '100%', background: '#05070d'}}
        />
      </div>
    </div>
  );
};
