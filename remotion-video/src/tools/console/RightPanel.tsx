// src/tools/console/RightPanel.tsx
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {CompiledProject} from '../../project/compileProject';
import type {SceneTimeline} from './types';
import {PreviewArea} from './PreviewArea';
import {QaBentoGrid} from './QaBentoGrid';
import {SceneMiniList} from './SceneMiniList';

interface RightPanelProps {
  compiled: {project: CompiledProject | null; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  timeline: SceneTimeline[];
  project: VideoProject;
  totalFrames: number;
  onRunCommand: (cmd: string, label: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  compiled, project, stillUrl, videoUrl, timeline, totalFrames, onRunCommand,
}) => (
  <div style={{
    width: 280, borderLeft: `1px solid ${theme.border.subtle}`,
    display: 'flex', flexDirection: 'column', background: theme.bg.base,
  }}>
    <PreviewArea compiled={compiled} project={project} stillUrl={stillUrl} totalFrames={totalFrames} />
    <QaBentoGrid compiled={compiled} stillUrl={stillUrl} videoUrl={videoUrl} onRunCommand={onRunCommand} />
    <SceneMiniList timeline={timeline} />
  </div>
);
