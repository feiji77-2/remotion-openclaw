import React from 'react';
import {Audio, Img, Sequence, interpolate, spring, useCurrentFrame, AbsoluteFill} from 'remotion';
import {resolveAudioSource, resolveMediaSource} from '../utils/mediaSources';
import {TransitionSeries, linearTiming, springTiming, type TransitionPresentation} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {flip} from '@remotion/transitions/flip';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {SpeedLines, PulseRing, Orbit} from '../components/MotionFX';
import {
  UltimateArchitectureMap,
  UltimateBenchmarkChart,
  UltimateCaptionOverlay,
  UltimateCodePanel,
  UltimateCompareBoard,
  UltimateCtaPanel,
  UltimateDirectorEffects,
  UltimateDataStream,
  UltimateEvidenceWall,
  UltimateFeatureCardRail,
  UltimateFocusDiagram,
  UltimateGlossaryTerm,
  UltimateHeroPanel,
  UltimateMemoryGraph,
  UltimateMetricBars,
  UltimateNumberStrip,
  UltimatePlatformOverlay,
  UltimatePipelineFlow,
  UltimateQuoteHighlight,
  UltimateSceneTransition,
  UltimateStage,
  UltimateStepFlow,
  UltimateTagMatrix,
  UltimateTerminalPanel,
  UltimateTimeline,
  type UltimatePlatformOverlayProps,
  getUltimateIncomingTransitionDurationInFrames,
  normalizeUltimateProjectConfig,
  resolveUltimateAccent,
  type ResolvedUltimateTransitionConfig,
  type ResolvedUltimateSceneConfig,
  type UltimateSceneTemplateProps,
} from '../components/ultimate-kit';
import {
  ULTIMATE_ICON_URLS,
  isUltimateManualGlyph,
  resolveUltimateIconPack,
  type UltimateIconName,
} from '../components/ultimate-kit/iconography';
import {sceneMediaLayout, sceneIconOrbitLayout} from '../components/ultimate-kit/layouts';
import {appendUltimateMicroJitter, createUltimateMicroJitter} from '../components/ultimate-kit/motion';
import {getFamily} from '../data/registry';
import {hydrateUltimateProjectConfigWithDirectorGrammar} from '../data/storyboardLoader';

// ── Minimal (抖音风格) 组件 ──────────────────────────────
import {MinimalHero} from '../components/ultimate-kit/families/MinimalHero';
import {MinimalStepFlow} from '../components/ultimate-kit/families/MinimalStepFlow';
import {MinimalTagMatrix} from '../components/ultimate-kit/families/MinimalTagMatrix';
import {MinimalNumberStrip} from '../components/ultimate-kit/families/MinimalNumberStrip';
import {MinimalTimeline} from '../components/ultimate-kit/families/MinimalTimeline';
import {MinimalCompareBoard} from '../components/ultimate-kit/families/MinimalCompareBoard';

const renderSceneContent = (scene: ResolvedUltimateSceneConfig) => {
  const entry = getFamily(scene.family);
  if (!entry) return null;

  const componentMap: Record<string, React.ComponentType<any> | undefined> = {
    hero: UltimateHeroPanel,
    'feature-rail': UltimateFeatureCardRail,
    focus: UltimateFocusDiagram,
    'number-strip': UltimateNumberStrip,
    'step-flow': UltimateStepFlow,
    timeline: UltimateTimeline,
    'compare-board': UltimateCompareBoard,
    terminal: UltimateTerminalPanel,
    'evidence-wall': UltimateEvidenceWall,
    'architecture-map': UltimateArchitectureMap,
    'tag-matrix': UltimateTagMatrix,
    code: UltimateCodePanel,
    metrics: UltimateMetricBars,
    'data-stream': UltimateDataStream,
    'memory-graph': UltimateMemoryGraph,
    'pipeline-flow': UltimatePipelineFlow,
    'benchmark-chart': UltimateBenchmarkChart,
    'quote-highlight': UltimateQuoteHighlight,
    'glossary-term': UltimateGlossaryTerm,
    cta: UltimateCtaPanel,
    // ── Minimal (抖音风格) ──────────────────────
    'minimal-hero': MinimalHero,
    'minimal-step-flow': MinimalStepFlow,
    'minimal-tag-matrix': MinimalTagMatrix,
    'minimal-number-strip': MinimalNumberStrip,
    'minimal-timeline': MinimalTimeline,
    'minimal-compare-board': MinimalCompareBoard,
  };

  const Component = componentMap[scene.family];
  if (!Component) return null;

  return <Component {...scene.data} grammar={scene.grammar} />;
};

const resolveSceneOverlay = (
  config: {title?: string; defaultPlatformOverlay?: UltimatePlatformOverlayProps | false},
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
  merged.brand = merged.brand ?? config.title ?? 'Studio';

  return merged;
};


const resolveTransitionPresentation = (
  transition: ResolvedUltimateTransitionConfig,
): TransitionPresentation<Record<string, unknown>> => {
  switch (transition.preset) {
    case 'lift':
    case 'slide':
      return slide({direction: 'from-bottom'}) as unknown as TransitionPresentation<Record<string, unknown>>;
    case 'wipe':
      return wipe() as unknown as TransitionPresentation<Record<string, unknown>>;
    case 'flip':
      return flip() as unknown as TransitionPresentation<Record<string, unknown>>;
    case 'clock-wipe':
      return clockWipe({width: 1920, height: 1080}) as unknown as TransitionPresentation<Record<string, unknown>>;
    case 'flash':
    case 'fade':
    default:
      return fade() as unknown as TransitionPresentation<Record<string, unknown>>;
  }
};

const resolveTransitionTiming = (transition: ResolvedUltimateTransitionConfig, durationInFrames: number) => {
  switch (transition.preset) {
    case 'lift':
    case 'slide':
      return springTiming({
        durationInFrames,
        config: {damping: 18, stiffness: 120, mass: 0.9},
      });
    case 'fade':
    case 'flash':
    case 'wipe':
    case 'flip':
    case 'clock-wipe':
    default:
      return linearTiming({durationInFrames});
  }
};

const sceneIconMaskStyle = (icon: UltimateIconName) => ({
  background: 'currentColor',
  WebkitMaskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskImage: `url(${ULTIMATE_ICON_URLS[icon]})`,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskSize: 'contain',
});

const collectSceneIconHints = (scene: ResolvedUltimateSceneConfig) => {
  switch (scene.family) {
    case 'hero':
      return [scene.data.title, scene.data.subtitle, scene.subtitle];
    case 'feature-rail':
      return [scene.data.heading, ...scene.data.items.map((item) => `${item.title} ${item.caption || ''}`), scene.subtitle];
    case 'focus':
      return [scene.data.keyword, scene.data.question, scene.data.description, scene.subtitle];
    case 'number-strip':
      return [
        scene.data.heading,
        scene.data.summary,
        ...scene.data.items.map((item) => `${item.tag || ''} ${item.label} ${item.detail || ''}`),
        scene.subtitle,
      ];
    case 'step-flow':
      return [scene.data.heading, ...scene.data.steps.map((step) => `${step.label} ${step.detail || ''}`), scene.subtitle];
    case 'timeline':
      return [scene.data.heading, scene.data.summary, ...scene.data.items.map((item) => `${item.label} ${item.title} ${item.detail || ''}`), scene.subtitle];
    case 'compare-board':
      return [
        scene.data.heading,
        scene.data.summary,
        scene.data.leftTitle,
        scene.data.rightTitle,
        ...scene.data.rows.map((row) => `${row.label} ${row.left} ${row.right}`),
        scene.subtitle,
      ];
    case 'terminal':
      return [scene.data.heading, scene.data.command, ...scene.data.outputs, scene.subtitle];
    case 'evidence-wall':
      return [
        scene.data.heading,
        scene.data.summary,
        ...scene.data.cards.map((card) => `${card.source} ${card.quote} ${card.detail || ''}`),
        scene.subtitle,
      ];
    case 'architecture-map':
      return [
        scene.data.heading,
        scene.data.centerTitle,
        scene.data.centerDetail,
        ...scene.data.nodes.map((node) => `${node.label} ${node.detail || ''}`),
        scene.subtitle,
      ];
    case 'tag-matrix':
      return [scene.data.heading, ...scene.data.items.map((item) => item.label), scene.subtitle];
    case 'code':
      return [scene.data.heading, scene.data.footer, ...scene.data.lines.map((line) => line.text), scene.subtitle];
    case 'metrics':
      return [scene.data.heading, scene.data.summary, ...scene.data.items.map((item) => `${item.label} ${item.value}`), scene.subtitle];
    case 'data-stream':
      return [scene.data.heading, scene.data.summary, ...scene.data.items.map((item) => `${item.label} ${item.value} ${item.detail || ''}`), scene.subtitle];
    case 'memory-graph':
      return [scene.data.heading, scene.data.summary, scene.data.centerTitle, scene.data.centerDetail, ...scene.data.nodes.map((node) => `${node.label} ${node.detail || ''}`), scene.subtitle];
    case 'pipeline-flow':
      return [scene.data.heading, scene.data.summary, ...scene.data.stages.map((stage) => `${stage.label} ${stage.detail || ''}`), scene.subtitle];
    case 'benchmark-chart':
      return [scene.data.heading, scene.data.summary, scene.data.primaryLabel, scene.data.secondaryLabel, ...scene.data.items.map((item) => `${item.label} ${item.primaryValue} ${item.secondaryValue}`), scene.subtitle];
    case 'quote-highlight':
      return [scene.data.heading, scene.data.quote, scene.data.attribution, ...(scene.data.tags ?? []).map((item) => item.label), scene.subtitle];
    case 'glossary-term':
      return [scene.data.heading, scene.data.term, scene.data.pronunciation, scene.data.definition, ...(scene.data.related ?? []).map((item) => item.label), scene.subtitle];
    case 'cta':
      return [scene.data.heading, scene.data.subtitle, ...(scene.data.highlights ?? []), scene.subtitle];
  }
};

const collectSceneIconRequests = (scene: ResolvedUltimateSceneConfig) => {
  const requested: Array<string | null | undefined> = [...(scene.iconPack ?? [])];

  switch (scene.family) {
    case 'feature-rail':
      requested.push(...scene.data.items.map((item) => item.icon));
      break;
    case 'step-flow':
      requested.push(...scene.data.steps.map((step) => step.icon));
      break;
    case 'timeline':
      requested.push(...scene.data.items.map((item) => item.icon));
      break;
    case 'evidence-wall':
      requested.push(...scene.data.cards.map((card) => card.icon));
      break;
    case 'architecture-map':
      requested.push(...scene.data.nodes.map((node) => node.icon));
      break;
    case 'metrics':
      requested.push(...scene.data.items.map((item) => item.icon));
      break;
    case 'memory-graph':
      requested.push(...scene.data.nodes.map((node) => node.icon));
      break;
    case 'pipeline-flow':
      requested.push(...scene.data.stages.map((stage) => stage.icon));
      break;
    default:
      break;
  }

  return requested.filter((value) => !!value && !isUltimateManualGlyph(value));
};

const resolveSceneOrbitAccent = (scene: ResolvedUltimateSceneConfig) => {
  switch (scene.family) {
    case 'hero':
      return resolveUltimateAccent(scene.data.accent ?? 'orange');
    case 'focus':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'number-strip':
      return resolveUltimateAccent(scene.data.accent ?? 'green');
    case 'timeline':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'compare-board':
      return resolveUltimateAccent(scene.data.rightAccent ?? 'green');
    case 'terminal':
      return resolveUltimateAccent(scene.data.accent ?? 'green');
    case 'evidence-wall':
      return resolveUltimateAccent(scene.data.accent ?? 'yellow');
    case 'architecture-map':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'code':
      return resolveUltimateAccent(scene.data.accent ?? 'purple');
    case 'metrics':
      return resolveUltimateAccent('yellow');
    case 'data-stream':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'memory-graph':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'pipeline-flow':
      return resolveUltimateAccent(scene.data.accent ?? 'green');
    case 'benchmark-chart':
      return resolveUltimateAccent(scene.data.accent ?? 'yellow');
    case 'quote-highlight':
      return resolveUltimateAccent(scene.data.accent ?? 'orange');
    case 'glossary-term':
      return resolveUltimateAccent(scene.data.accent ?? 'cyan');
    case 'cta':
      return resolveUltimateAccent('orange');
    default:
      return resolveUltimateAccent('cyan');
  }
};

const UltimateSceneIconOrbit: React.FC<{scene: ResolvedUltimateSceneConfig; sceneIndex: number}> = ({scene, sceneIndex}) => {
  const frame = useCurrentFrame();
  const layout = sceneIconOrbitLayout[scene.family];

  if (!layout || layout.length === 0) {
    return null;
  }

  const icons = resolveUltimateIconPack({
    hints: collectSceneIconHints(scene),
    requested: collectSceneIconRequests(scene),
    count: layout.length,
    family: scene.family,
    seed: sceneIndex,
  });
  const accentColor = resolveSceneOrbitAccent(scene);

  if (icons.length === 0) {
    return null;
  }

  return (
    <>
      {layout.map((node, index) => {
        const icon = icons[index] || icons[0];
        const reveal = spring({
          fps: 30,
          frame: Math.max(0, frame - node.delay),
          config: {damping: 18, stiffness: 100},
        });
        const floatY = Math.sin((frame + node.delay * 9) / 18) * 8;
        const scale = interpolate(reveal, [0, 1], [0.9, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const jitter = createUltimateMicroJitter(frame, {
          delay: node.delay,
          amplitudeX: 1.4,
          amplitudeY: 1.2,
          rotateDeg: 0.7,
          scaleDelta: 0.006,
          seed: sceneIndex * 11 + index,
        });

        return (
          <div
            key={`${scene.id}-${icon}-${index}`}
            style={{
              position: 'absolute',
              top: node.top,
              right: node.right,
              bottom: node.bottom,
              left: node.left,
              width: node.badgeSize,
              height: node.badgeSize,
              borderRadius: 24,
              border: `1px solid ${accentColor}2f`,
              background: `linear-gradient(180deg, ${accentColor}1f 0%, rgba(8, 10, 18, 0.88) 100%)`,
              boxShadow: `0 18px 46px rgba(0,0,0,0.18), 0 0 34px ${accentColor}24`,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (node.opacity ?? 0.84) * reveal,
              transform: appendUltimateMicroJitter(
                `translateY(${floatY}px) rotate(${node.rotate}deg) scale(${scale})`,
                jitter,
              ),
            }}
          >
            <div
              style={{
                width: node.size,
                height: node.size,
                color: accentColor,
                ...sceneIconMaskStyle(icon),
              }}
            />
          </div>
        );
      })}
    </>
  );
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
  const jitter = createUltimateMicroJitter(frame, {
    delay: 6,
    amplitudeX: mode === 'ambient' ? 1.1 : 1.4,
    amplitudeY: mode === 'ambient' ? 0.9 : 1.2,
    rotateDeg: mode === 'ambient' ? 0.24 : 0.5,
    scaleDelta: mode === 'ambient' ? 0.002 : 0.003,
    seed: layout.top + (layout.left ?? layout.right ?? 0),
  });
  const baseTransform =
    mode === 'ambient'
      ? `translateY(${translateX * 0.3}px) rotate(${tilt}deg)`
      : `translateX(${translateX}px) rotate(${tilt}deg)`;

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
        transform: appendUltimateMicroJitter(baseTransform, jitter),
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
  subtitleData,
}) => {
  const normalizedConfig = React.useMemo(() => {
    const hydratedConfig = hydrateUltimateProjectConfigWithDirectorGrammar(config, {directorQA: 'error'});
    return normalizeUltimateProjectConfig(hydratedConfig);
  }, [config]);
  const hasSegmentAudio = Array.isArray(audioSegments) && audioSegments.length > 0;

  return (
    <>
      {!hasSegmentAudio && typeof voiceFile === 'string' && voiceFile.trim().length > 0 ? (
        <Audio src={resolveAudioSource(voiceFile)} />
      ) : null}
      {hasSegmentAudio
        ? audioSegments.map((segment) => {
          const fadeFrames = Math.min(10, Math.floor(segment.durationInFrames * 0.05));
          return (
            <Sequence
              key={`${segment.src}-${segment.startFrame}`}
              from={segment.startFrame}
              durationInFrames={segment.durationInFrames}
              premountFor={segment.durationInFrames}
            >
              <Audio
                src={resolveAudioSource(segment.src)}
                volume={(f) => {
                  const fadeIn = fadeFrames > 0 ? Math.min(1, f / fadeFrames) : 1;
                  const fadeOut = fadeFrames > 0 ? Math.min(1, (segment.durationInFrames - 1 - f) / fadeFrames) : 1;
                  return 2.4 * fadeIn * fadeOut;
                }}
              />
            </Sequence>
          );
        })
        : null}
      <TransitionSeries>
        {normalizedConfig.scenes.map((scene, sceneIndex) => {
          const overlay = resolveSceneOverlay(normalizedConfig, scene);
          const previousScene = sceneIndex > 0 ? normalizedConfig.scenes[sceneIndex - 1] : null;
          const transitionDuration = getUltimateIncomingTransitionDurationInFrames(previousScene, scene);

          return (
            <React.Fragment key={scene.id}>
              {sceneIndex > 0 && scene.transition !== false && transitionDuration > 0 ? (
                <TransitionSeries.Transition
                  presentation={resolveTransitionPresentation(scene.transition)}
                  timing={resolveTransitionTiming(scene.transition, transitionDuration)}
                />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames} name={scene.id}>
                <UltimateSceneTransition scene={scene}>
                  <div
                    data-grammar={
                      scene.grammar
                        ? `${scene.grammar.archetype} | ${scene.grammar.cameraIntent}→${scene.grammar.dataEvent} | mem:${scene.grammar.memoryObject?.type ?? 'word'}`
                        : scene.family
                    }
                    data-director-note={scene.grammar?.directorNote ?? ''}
                  >
                    <UltimateStage
                      warm={scene.warm}
                      showGrid={scene.showGrid}
                      family={scene.family}
                      sceneIndex={sceneIndex}
                      sceneDurationFrames={scene.durationInFrames}
                      stagePreset={scene.stageConfig?.stagePreset}
                      hudMode={scene.stageConfig?.hudMode}
                    >
                      {(scene.stageConfig?.showOverlay !== false && overlay) ? (
                        <UltimatePlatformOverlay
                          {...overlay}
                          family={scene.family}
                          mode={scene.stageConfig?.hudMode}
                        />
                      ) : null}
                      {(scene.stageConfig?.showMediaCard !== false) ? (
                        <UltimateSceneMediaCard scene={scene} />
                      ) : null}
                      <UltimateDirectorEffects scene={scene} />
                      {(scene.stageConfig?.showIconOrbit !== false) ? (
                        <UltimateSceneIconOrbit scene={scene} sceneIndex={sceneIndex} />
                      ) : null}
                      {renderSceneContent(scene)}
                    </UltimateStage>
                  </div>
                </UltimateSceneTransition>
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      <UltimateCaptionOverlay subtitleData={subtitleData} />
    </>
  );
};

export default UltimateSceneTemplate;
