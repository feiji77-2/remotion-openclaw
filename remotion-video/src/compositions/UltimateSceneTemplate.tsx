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
  scene: Pick<ResolvedUltimateSceneConfig, 'family' | 'overlay'>,
) => {
  if (scene.overlay === false) {
    return null;
  }

  const baseOverlay = config.defaultPlatformOverlay === false ? null : config.defaultPlatformOverlay ?? null;

  if (!baseOverlay && !scene.overlay) {
    return null;
  }

  const merged = {
    ...(baseOverlay ?? {}),
    ...(scene.overlay ?? {}),
  };

  merged.searchLabel = '';

  return merged;
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
  right?: number;
  left?: number;
  width: number;
  height: number;
  opacity?: number;
  tiltDeg?: number;
  mode?: 'frame' | 'ambient';
}>> = {
  hero: {top: 186, right: 88, width: 704, height: 396, opacity: 0.74, tiltDeg: -3},
  focus: {top: 214, right: 94, width: 600, height: 338, opacity: 0.68, tiltDeg: -3},
  'feature-rail': {top: 214, right: 92, width: 612, height: 344, opacity: 0.64, tiltDeg: -3},
  metrics: {top: 300, right: 102, width: 704, height: 412, opacity: 0.88, tiltDeg: -2, mode: 'frame'},
  'number-strip': {top: 198, left: 116, width: 1688, height: 560, opacity: 0.28, tiltDeg: 0, mode: 'ambient'},
  code: {top: 188, left: 778, width: 980, height: 608, opacity: 0.24, tiltDeg: -2, mode: 'ambient'},
  cta: {top: 174, left: 148, width: 1624, height: 540, opacity: 0.24, tiltDeg: 0, mode: 'ambient'},
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
  const tilt = layout.tiltDeg ?? -2;
  const mode = layout.mode ?? 'frame';

  return (
    <div
      style={{
        position: 'absolute',
        top: layout.top,
        left: layout.left,
        right: layout.right,
        width: layout.width,
        height: layout.height,
        borderRadius: mode === 'ambient' ? 44 : 30,
        overflow: 'hidden',
        opacity: (layout.opacity ?? 0.82) * reveal,
        transform: mode === 'ambient' ? `translateY(${translateX * 0.3}px) rotate(${tilt}deg)` : `translateX(${translateX}px) rotate(${tilt}deg)`,
        border: mode === 'ambient' ? 'none' : '1px solid rgba(194, 219, 255, 0.2)',
        boxShadow:
          mode === 'ambient'
            ? '0 46px 120px rgba(0,0,0,0.22), 0 0 100px rgba(99,221,255,0.10)'
            : '0 26px 90px rgba(0,0,0,0.3), 0 0 56px rgba(99,221,255,0.12)',
        background: mode === 'ambient' ? 'transparent' : 'rgba(6, 10, 18, 0.56)',
      }}
    >
      <Img
        src={resolveMediaSource(mediaSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          filter: mode === 'ambient' ? 'saturate(1.08) brightness(0.88)' : 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            mode === 'ambient'
              ? 'linear-gradient(180deg, rgba(4, 6, 12, 0.22), rgba(4, 6, 12, 0.38) 50%, rgba(4, 6, 12, 0.62) 100%)'
              : 'linear-gradient(180deg, rgba(4, 6, 12, 0.06), rgba(4, 6, 12, 0.18) 56%, rgba(4, 6, 12, 0.34) 100%)',
        }}
      />
      {mode === 'frame' ? (
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: 22,
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        />
      ) : null}
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
              </UltimateStage>
            </UltimateSceneTransition>
          </Sequence>
        );
      })}
    </>
  );
};

export default UltimateSceneTemplate;
