import React from 'react';
import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';
import type {CompiledAsset} from '../project/assetResolver';
import type {CompiledProject} from '../project/compileProject';

const resolveAudioSrc = (asset: CompiledAsset) => (
  asset.source === 'remote' ? asset.src : staticFile(asset.src)
);

export const AudioTrack: React.FC<{project: CompiledProject}> = ({project}) => (
  <>
    {project.audioTracks.map((track) => {
      if (track.kind === 'voice') {
        return <Audio key={`voice-${track.asset.id}`} src={resolveAudioSrc(track.asset)} volume={track.volume} />;
      }
      return <Audio key={`music-${track.asset.id}`} src={resolveAudioSrc(track.asset)} loop volume={track.volume} />;
    })}
  </>
);
