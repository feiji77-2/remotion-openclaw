import React, {useMemo} from 'react';
import {useVideoConfig} from 'remotion';
import type {SequenceConfig} from '../../data/directorScore';

interface PreviewCompositionProps {
  sequences: SequenceConfig[];
}

export const PreviewComposition: React.FC<PreviewCompositionProps> = ({sequences}) => {
  const {fps} = useVideoConfig();

  const Orchestrator = React.lazy(() =>
    import('../../components/ultimate-kit/DirectorScoreOrchestrator').then(
      (mod) => ({default: mod.DirectorScoreOrchestrator})
    )
  );

  const elementRenderMap = useMemo(() => new Map(), []);

  return (
    <React.Suspense fallback={<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontFamily: 'sans-serif'}}>Loading...</div>}>
      <Orchestrator
        sequences={sequences}
        fps={fps}
        elementRenderMap={elementRenderMap}
      />
    </React.Suspense>
  );
};
