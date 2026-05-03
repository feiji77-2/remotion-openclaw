import React, {Suspense, useMemo} from 'react';
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
  UltimateCaptionOverlay,
  UltimateDirectorEffects,
  UltimatePlatformOverlay,
  UltimateSceneTransition,
  UltimateStage,
  DirectorScoreOrchestrator,
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
  type UltimateIconName,
} from '../components/ultimate-kit/iconography';
import {BRAND_ICON_COLORS, RenderIcon, RENDER_ICON_IDS_SET} from '../render/iconRegistry';
import type {RenderIconId} from '../render/types';
import {scoreToSequences, type DirectorScore, type SequenceConfig} from '../data/directorScore';
import {sceneMediaLayout, sceneIconOrbitLayout} from '../components/ultimate-kit/layouts';
import {appendUltimateMicroJitter, createUltimateMicroJitter} from '../components/ultimate-kit/motion';
import {hydrateUltimateProjectConfigWithDirectorGrammar} from '../data/storyboardLoader';

// ── Lazy-loaded family components (code-split, loaded on demand) ──
import {
  LazyHeroPanel,
  LazyFeatureCardRail,
  LazyFocusDiagram,
  LazyNumberStrip,
  LazyStepFlow,
  LazyTimeline,
  LazyCompareBoard,
  LazyTerminalPanel,
  LazyEvidenceWall,
  LazyArchitectureMap,
  LazyTagMatrix,
  LazyCodePanel,
  LazyMetricBars,
  LazyDataStream,
  LazyBenchmarkChart,
  LazyQuoteHighlight,
  LazyGlossaryTerm,
  LazyCtaPanel,
  LazyMinimalHero,
  LazyMinimalStepFlow,
  LazyMinimalTagMatrix,
  LazyMinimalNumberStrip,
  LazyMinimalTimeline,
  LazyMinimalCompareBoard,
} from '../components/ultimate-kit/lazyFamilies';

// Module-level component map (defined once, not recreated every frame)
const COMPONENT_MAP: Record<string, React.ComponentType<any> | undefined> = {
  hero: LazyHeroPanel,
  'feature-rail': LazyFeatureCardRail,
  focus: LazyFocusDiagram,
  'number-strip': LazyNumberStrip,
  'step-flow': LazyStepFlow,
  timeline: LazyTimeline,
  'compare-board': LazyCompareBoard,
  terminal: LazyTerminalPanel,
  'evidence-wall': LazyEvidenceWall,
  'architecture-map': LazyArchitectureMap,
  'tag-matrix': LazyTagMatrix,
  code: LazyCodePanel,
  metrics: LazyMetricBars,
  'data-stream': LazyDataStream,
  'memory-graph': LazyArchitectureMap,
  'pipeline-flow': LazyStepFlow,
  'benchmark-chart': LazyBenchmarkChart,
  'quote-highlight': LazyQuoteHighlight,
  'glossary-term': LazyGlossaryTerm,
  cta: LazyCtaPanel,
  // ── Minimal (抖音风格) ──────────────────────
  'minimal-hero': LazyMinimalHero,
  'minimal-step-flow': LazyMinimalStepFlow,
  'minimal-tag-matrix': LazyMinimalTagMatrix,
  'minimal-number-strip': LazyMinimalNumberStrip,
  'minimal-timeline': LazyMinimalTimeline,
  'minimal-compare-board': LazyMinimalCompareBoard,
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

// ── RenderIcon (彩色品牌图标) support ──

// ── Per-family colorful brand icon assignments for orbit badges ──
const FAMILY_ORBIT_RENDER_ICONS: Record<string, RenderIconId[]> = {
  hero: ['github', 'vercel', 'apple'],
  'feature-rail': ['figma', 'slack', 'notion'],
  focus: ['google', 'linear', 'linkedin'],
  'number-strip': ['aws', 'mongodb', 'redis'],
  'step-flow': ['jira', 'gitlab', 'linear'],
  timeline: ['vercel', 'x', 'linkedin'],
  'compare-board': ['google', 'aws', 'graphql'],
  terminal: ['x', 'docker', 'typescript'],
  'evidence-wall': ['meta', 'stripe', 'cloudflare'],
  'architecture-map': ['aws', 'docker', 'mongodb'],
  'tag-matrix': ['notion', 'react', 'tailwind'],
  code: ['github', 'typescript', 'gitlab'],
  metrics: ['stripe', 'python', 'cloudflare'],
  'data-stream': ['aws', 'graphql', 'docker'],
  'memory-graph': ['notion', 'figma', 'postgres'],
  'pipeline-flow': ['gitlab', 'jira', 'github'],
  'benchmark-chart': ['google', 'graphql', 'vercel'],
  'quote-highlight': ['linkedin', 'meta'],
  'glossary-term': ['notion', 'python'],
  cta: ['youtube', 'whatsapp', 'telegram'],
};

const resolveOrbitIcons = (scene: ResolvedUltimateSceneConfig, seed: number) => {
  const count = sceneIconOrbitLayout[scene.family]?.length ?? 3;
  const shotIcons = (scene.iconPack ?? []).filter((id) => RENDER_ICON_IDS_SET.has(id)) as RenderIconId[];
  const familyIcons = FAMILY_ORBIT_RENDER_ICONS[scene.family] ?? ['github', 'vercel', 'typescript'];
  const offset = seed % familyIcons.length;
  const rotated = [...familyIcons.slice(offset), ...familyIcons.slice(0, offset)];
  const result: RenderIconId[] = [];
  const seen = new Set<string>();
  for (const icon of [...shotIcons, ...rotated]) {
    if (seen.has(icon)) continue;
    seen.add(icon);
    result.push(icon);
    if (result.length >= count) return result;
  }
  return result;
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

  const icons = resolveOrbitIcons(scene, sceneIndex);
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
            {RENDER_ICON_IDS_SET.has(icon) ? (
              <RenderIcon id={icon as RenderIconId} size={node.size} color={BRAND_ICON_COLORS[icon] ?? accentColor} secondaryColor="#ffffff" />
            ) : (
              <div
                style={{
                  width: node.size,
                  height: node.size,
                  color: accentColor,
                  ...sceneIconMaskStyle(icon as unknown as UltimateIconName),
                }}
              />
            )}
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

  // ── DirectorScore 检测 ─────────────────────────────────────────
  const directorScore: DirectorScore | undefined = (normalizedConfig as any).directorScore;
  const hasDirectorScore = Boolean(directorScore);

  // 编译 DirectorScore → SequenceConfig 树
  const compiledSequences: SequenceConfig[] | null = useMemo(() => {
    if (!directorScore) return null;
    return scoreToSequences(directorScore, {resolveMode: 'compat', fps: 30});
  }, [directorScore]);

  // 构建 elementRenderMap（scene 内容 → elementId）
  const elementRenderMap: Map<string, React.ReactNode> = useMemo(() => {
    const map = new Map<string, React.ReactNode>();

    if (!compiledSequences || !normalizedConfig.scenes) return map;

    // 遍历所有 Sequence，为每个 elementId 查找对应场景组件
    const collectElementIds = (seqs: SequenceConfig[], parentComponent?: React.ReactNode) => {
      for (const seq of seqs) {
        if (seq.elementId) {
          // 尝试从 scene.data 的字段名匹配 elementId
          // elementId 如 'main-title' → 查找场景数据中的 title 字段
          // 先从已渲染的场景组件查找
          if (parentComponent) {
            map.set(seq.elementId, parentComponent);
          }
        }
        if (seq.children) {
          collectElementIds(seq.children, parentComponent);
        }
      }
    };

    // 对每个场景，将它的 renderSceneContent 注册到对应的 elementId
    for (const scene of normalizedConfig.scenes) {
      const content = renderSceneContent(scene);
      // 注册 scene.id 作为 fallback（匹配 shotId）
      map.set(scene.id, content);

      // 如果有 directorCues，逐个注册 elementId
      const sceneAny = scene as any;
      if (sceneAny.directorCues) {
        for (const cue of sceneAny.directorCues) {
          if (cue.elementId) {
            map.set(cue.elementId, content);
          }
        }
      }
    }

    return map;
  }, [compiledSequences, normalizedConfig.scenes]);

  const renderSceneContent = React.useCallback(
    (scene: ResolvedUltimateSceneConfig) => {
      const Component = COMPONENT_MAP[scene.family];
      if (!Component) return null;
      return (
        <Suspense fallback={null}>
          <Component key={scene.id} {...scene.data} grammar={scene.grammar} />
        </Suspense>
      );
    },
    [],
  );

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
              premountFor={Math.min(24, segment.durationInFrames)}
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

      {hasDirectorScore && compiledSequences ? (
        <DirectorScoreOrchestrator
          sequences={compiledSequences}
          elementRenderMap={elementRenderMap}
          fps={30}
        />
      ) : (
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
      )}

      <UltimateCaptionOverlay subtitleData={subtitleData} />
    </>
  );
};

export default UltimateSceneTemplate;
