import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {
  UltimateCodePanel,
  UltimateCtaPanel,
  UltimateFeatureCardRail,
  UltimateFocusDiagram,
  UltimateHeroPanel,
  UltimateMetricBars,
  UltimateNumberStrip,
  UltimatePlatformOverlay,
  UltimateSceneTransition,
  UltimateStage,
  UltimateStepFlow,
  UltimateSubtitleBar,
  UltimateTagMatrix,
  UltimateTerminalPanel,
  type UltimatePlatformOverlayProps,
  normalizeUltimateProjectConfig,
  type ResolvedUltimateSceneConfig,
  type UltimateSceneTemplateProps,
} from '../components/ultimate-kit';

const renderSceneContent = (scene: ResolvedUltimateSceneConfig) => {
  switch (scene.family) {
    case 'hero':
      return <UltimateHeroPanel {...scene.data} />;
    case 'feature-rail':
      return <UltimateFeatureCardRail {...scene.data} />;
    case 'focus':
      return <UltimateFocusDiagram {...scene.data} />;
    case 'number-strip':
      return <UltimateNumberStrip {...scene.data} />;
    case 'step-flow':
      return <UltimateStepFlow {...scene.data} />;
    case 'terminal':
      return <UltimateTerminalPanel {...scene.data} />;
    case 'tag-matrix':
      return <UltimateTagMatrix {...scene.data} />;
    case 'code':
      return <UltimateCodePanel {...scene.data} />;
    case 'metrics':
      return <UltimateMetricBars {...scene.data} />;
    case 'cta':
      return <UltimateCtaPanel {...scene.data} />;
    default:
      return null;
  }
};

const resolveSceneOverlay = (
  config: {defaultPlatformOverlay?: UltimatePlatformOverlayProps | false},
  scene: Pick<ResolvedUltimateSceneConfig, 'overlay'>,
) => {
  if (scene.overlay === false) {
    return null;
  }

  const baseOverlay = config.defaultPlatformOverlay === false ? null : config.defaultPlatformOverlay ?? null;

  if (!baseOverlay && !scene.overlay) {
    return null;
  }

  return {
    ...(baseOverlay ?? {}),
    ...(scene.overlay ?? {}),
  };
};

const normalizeStaticAssetPath = (assetPath: string) => assetPath.replace(/^\/+/, '');

const resolveAudioSource = (src: string) => {
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
};

export const UltimateSceneTemplate: React.FC<UltimateSceneTemplateProps> = ({
  config,
  voiceFile,
  audioSegments,
}) => {
  const normalizedConfig = React.useMemo(() => normalizeUltimateProjectConfig(config), [config]);
  let currentFrame = 0;

  return (
    <>
      {typeof voiceFile === 'string' && voiceFile.trim().length > 0 ? (
        <Audio src={resolveAudioSource(voiceFile)} />
      ) : null}
      {Array.isArray(audioSegments) && (!voiceFile || voiceFile.trim().length === 0)
        ? audioSegments.map((segment) => (
            <Sequence
              key={`${segment.src}-${segment.startFrame}`}
              from={segment.startFrame}
              durationInFrames={segment.durationInFrames}
            >
              <Audio src={resolveAudioSource(segment.src)} />
            </Sequence>
          ))
        : null}
      {normalizedConfig.scenes.map((scene) => {
        const startFrame = currentFrame;
        currentFrame += scene.durationInFrames;
        const overlay = resolveSceneOverlay(normalizedConfig, scene);

        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={scene.durationInFrames}>
            <UltimateSceneTransition scene={scene}>
              <UltimateStage warm={scene.warm} showGrid={scene.showGrid}>
                {overlay ? <UltimatePlatformOverlay {...overlay} /> : null}
                {renderSceneContent(scene)}
                <UltimateSubtitleBar text={scene.subtitle} />
              </UltimateStage>
            </UltimateSceneTransition>
          </Sequence>
        );
      })}
    </>
  );
};

export default UltimateSceneTemplate;
