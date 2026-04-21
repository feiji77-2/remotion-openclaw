import React from 'react';
import type {AudioSegmentProps, UltimateSceneCompositionProps} from '../Root';
import type {UltimateProjectConfig} from '../components/ultimate-kit';
import {ULTIMATE_SCENE_DEMO} from '../data/ultimateSceneDemo';
import UltimateSceneTemplate from './UltimateSceneTemplate';
import {useFileBackedProps} from '../hooks/useFileBackedProps';

type InlineUltimateProps = {
  config?: UltimateProjectConfig;
  voiceFile?: string | null;
  audioSegments?: AudioSegmentProps[] | null;
};

export const FileBackedUltimateSceneTemplate: React.FC<UltimateSceneCompositionProps> = ({
  propsFile,
  config,
  voiceFile,
  audioSegments,
}) => {
  const hasPropsFile = typeof propsFile === 'string' && propsFile.trim().length > 0;
  const inlinePayload: InlineUltimateProps = React.useMemo(() => (
    hasPropsFile
      ? {}
      : {
          config,
          voiceFile: voiceFile ?? null,
          audioSegments: Array.isArray(audioSegments) ? audioSegments : null,
        }
  ), [audioSegments, config, hasPropsFile, voiceFile]);
  const {resolvedProps, loadError} = useFileBackedProps<InlineUltimateProps>(inlinePayload, propsFile);

  if (loadError) {
    throw loadError;
  }

  return (
    <UltimateSceneTemplate
      config={resolvedProps.config ?? ULTIMATE_SCENE_DEMO}
      voiceFile={resolvedProps.voiceFile ?? null}
      audioSegments={resolvedProps.audioSegments ?? null}
    />
  );
};

export default FileBackedUltimateSceneTemplate;
