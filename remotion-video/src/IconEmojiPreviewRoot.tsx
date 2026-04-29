import React from 'react';
import {Composition, registerRoot} from 'remotion';
import IconEmojiCapabilityPreview from './compositions/IconEmojiCapabilityPreview';

const IconEmojiPreviewRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IconEmojiCapabilityPreview"
        component={IconEmojiCapabilityPreview}
        durationInFrames={1}
        fps={30}
        width={1600}
        height={900}
      />
    </>
  );
};

registerRoot(IconEmojiPreviewRoot);
