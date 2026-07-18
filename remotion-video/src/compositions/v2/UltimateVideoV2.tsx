import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {CompiledProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';
import {AudioTrack} from '../../timeline/AudioTrack';
import {CaptionTrack} from '../../timeline/CaptionTrack';
import {GlobalOverlays} from '../../timeline/GlobalOverlays';
import {SceneTimeline} from '../../timeline/SceneTimeline';

export type UltimateVideoV2Props = VideoProject & {compiledProject?: CompiledProject};

export const UltimateVideoV2: React.FC<UltimateVideoV2Props> = ({compiledProject}) => {
  if (!compiledProject) {
    throw new Error('[COMPILED_PROJECT_MISSING] calculateMetadata must compile the project before rendering');
  }
  return (
    <AbsoluteFill style={{backgroundColor: '#05070d'}}>
      <SceneTimeline project={compiledProject} />
      <AudioTrack project={compiledProject} />
      <CaptionTrack project={compiledProject} />
      <GlobalOverlays project={compiledProject} />
    </AbsoluteFill>
  );
};
