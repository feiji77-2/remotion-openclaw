import React from 'react';
import {Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
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

const resolveMediaSource = (src: string) => {
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
};

const sceneMediaLayout: Partial<Record<ResolvedUltimateSceneConfig['family'], {
  top: number;
  right: number;
  width: number;
  height: number;
  opacity?: number;
}>> = {
  hero: {top: 138, right: 86, width: 392, height: 662, opacity: 0.9},
  focus: {top: 186, right: 72, width: 332, height: 566, opacity: 0.82},
  'feature-rail': {top: 178, right: 72, width: 332, height: 566, opacity: 0.8},
  metrics: {top: 198, right: 74, width: 312, height: 530, opacity: 0.78},
  cta: {top: 172, right: 98, width: 324, height: 552, opacity: 0.68},
};

const UltimateSceneMediaCard: React.FC<{scene: ResolvedUltimateSceneConfig}> = ({scene}) => {
  const frame = useCurrentFrame();
  const mediaSrc = typeof scene.mediaSrc === 'string' ? scene.mediaSrc.trim() : '';
  const layout = sceneMediaLayout[scene.family];

  if (!mediaSrc || !layout) {
    return null;
  }

  const reveal = spring({
    fps: 30,
    frame,
    config: {damping: 18, stiffness: 110},
  });
  const translateX = interpolate(reveal, [0, 1], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, Math.max(36, scene.durationInFrames - 1)], [1.02, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: layout.top,
        right: layout.right,
        width: layout.width,
        height: layout.height,
        borderRadius: 30,
        overflow: 'hidden',
        opacity: (layout.opacity ?? 0.82) * reveal,
        transform: `translateX(${translateX}px)`,
        border: '1px solid rgba(194, 219, 255, 0.2)',
        boxShadow: '0 26px 90px rgba(0,0,0,0.3), 0 0 56px rgba(99,221,255,0.12)',
        background: 'rgba(6, 10, 18, 0.56)',
      }}
    >
      <Img
        src={resolveMediaSource(mediaSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(4, 6, 12, 0.06), rgba(4, 6, 12, 0.18) 56%, rgba(4, 6, 12, 0.34) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      />
    </div>
  );
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
                <UltimateSceneMediaCard scene={scene} />
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
