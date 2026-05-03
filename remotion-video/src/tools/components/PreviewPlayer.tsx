import React from 'react';
import {Player} from '@remotion/player';
import type {SequenceConfig} from '../../data/directorScore';
import {PreviewComposition} from '../remotion/PreviewComposition';

interface PreviewPlayerProps {
  sequences: SequenceConfig[];
  totalFrames: number;
  fps: number;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#111827',
  borderRadius: 6,
  overflow: 'hidden',
};

const playerWrapper: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  aspectRatio: '16 / 9',
};

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({sequences, totalFrames, fps}) => {
  return (
    <div style={containerStyle}>
      <div style={playerWrapper}>
        <Player
          component={PreviewComposition}
          inputProps={{sequences}}
          durationInFrames={totalFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          controls
          style={{width: '100%', height: '100%'}}
        />
      </div>
    </div>
  );
};
