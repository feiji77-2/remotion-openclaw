import React from 'react';
import {OpenClawVideo} from '../OpenClawVideo';
import type {VideoProps} from '../Root';
import {useFileBackedProps} from '../hooks/useFileBackedProps';

// Legacy compat wrapper. Current runtime no longer registers this composition in Root.tsx.
export type FileBackedOpenClawVideoProps = VideoProps & {
  propsFile?: string | null;
};

export const FileBackedOpenClawVideo: React.FC<FileBackedOpenClawVideoProps> = ({
  propsFile,
  ...inlineProps
}) => {
  const inlineSignature = JSON.stringify(inlineProps);
  const stableInlineProps = React.useMemo(() => inlineProps, [inlineSignature]);
  const {resolvedProps, loadError} = useFileBackedProps<VideoProps>(stableInlineProps, propsFile);

  if (loadError) {
    throw loadError;
  }

  return <OpenClawVideo {...resolvedProps} />;
};

export default FileBackedOpenClawVideo;
