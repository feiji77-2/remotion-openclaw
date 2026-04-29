import React from 'react';
import {Composition, registerRoot} from 'remotion';
import MorfeoStylePreview from './compositions/MorfeoStylePreview';

const MorfeoStylePreviewRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MorfeoStylePreview"
        component={MorfeoStylePreview}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

registerRoot(MorfeoStylePreviewRoot);
