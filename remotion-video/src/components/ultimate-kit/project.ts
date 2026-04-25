import type {
  UltimateArchitectureMapProps,
  UltimateBenchmarkChartProps,
  UltimateCodePanelProps,
  UltimateCompareBoardProps,
  UltimateCtaPanelProps,
  UltimateDataStreamProps,
  UltimateEvidenceWallProps,
  UltimateFeatureCardRailProps,
  UltimateFocusDiagramProps,
  UltimateGlossaryTermProps,
  UltimateHeroPanelProps,
  UltimateMemoryGraphProps,
  UltimateMetricBarsProps,
  UltimateNumberStripProps,
  UltimatePlatformOverlayProps,
  UltimatePipelineFlowProps,
  UltimateQuoteHighlightProps,
  UltimateStepFlowProps,
  UltimateTagMatrixProps,
  UltimateTerminalPanelProps,
  UltimateTimelineProps,
} from './types';

export type UltimateSceneFamily =
  | 'hero'
  | 'feature-rail'
  | 'focus'
  | 'number-strip'
  | 'step-flow'
  | 'timeline'
  | 'compare-board'
  | 'terminal'
  | 'evidence-wall'
  | 'architecture-map'
  | 'tag-matrix'
  | 'code'
  | 'metrics'
  | 'data-stream'
  | 'memory-graph'
  | 'pipeline-flow'
  | 'benchmark-chart'
  | 'quote-highlight'
  | 'glossary-term'
  | 'cta';

export type UltimateTransitionPreset = 'fade' | 'lift' | 'flash';

export type UltimateTransitionConfig = {
  preset?: UltimateTransitionPreset;
  durationInFrames?: number;
  color?: string;
};

type UltimateSceneBase = {
  id: string;
  family: UltimateSceneFamily;
  durationInFrames?: number;
  subtitle?: string;
  iconPack?: string[];
  mediaSrc?: string | null;
  warm?: boolean;
  showGrid?: boolean;
  overlay?: Partial<UltimatePlatformOverlayProps> | false;
  transition?: Partial<UltimateTransitionConfig> | false;
};

export type UltimateHeroScene = UltimateSceneBase & {
  family: 'hero';
  data: UltimateHeroPanelProps;
};

export type UltimateFeatureRailScene = UltimateSceneBase & {
  family: 'feature-rail';
  data: UltimateFeatureCardRailProps;
};

export type UltimateFocusScene = UltimateSceneBase & {
  family: 'focus';
  data: UltimateFocusDiagramProps;
};

export type UltimateNumberStripScene = UltimateSceneBase & {
  family: 'number-strip';
  data: UltimateNumberStripProps;
};

export type UltimateStepFlowScene = UltimateSceneBase & {
  family: 'step-flow';
  data: UltimateStepFlowProps;
};

export type UltimateTimelineScene = UltimateSceneBase & {
  family: 'timeline';
  data: UltimateTimelineProps;
};

export type UltimateCompareBoardScene = UltimateSceneBase & {
  family: 'compare-board';
  data: UltimateCompareBoardProps;
};

export type UltimateTerminalScene = UltimateSceneBase & {
  family: 'terminal';
  data: UltimateTerminalPanelProps;
};

export type UltimateEvidenceWallScene = UltimateSceneBase & {
  family: 'evidence-wall';
  data: UltimateEvidenceWallProps;
};

export type UltimateArchitectureMapScene = UltimateSceneBase & {
  family: 'architecture-map';
  data: UltimateArchitectureMapProps;
};

export type UltimateTagMatrixScene = UltimateSceneBase & {
  family: 'tag-matrix';
  data: UltimateTagMatrixProps;
};

export type UltimateCodeScene = UltimateSceneBase & {
  family: 'code';
  data: UltimateCodePanelProps;
};

export type UltimateMetricsScene = UltimateSceneBase & {
  family: 'metrics';
  data: UltimateMetricBarsProps;
};

export type UltimateDataStreamScene = UltimateSceneBase & {
  family: 'data-stream';
  data: UltimateDataStreamProps;
};

export type UltimateMemoryGraphScene = UltimateSceneBase & {
  family: 'memory-graph';
  data: UltimateMemoryGraphProps;
};

export type UltimatePipelineFlowScene = UltimateSceneBase & {
  family: 'pipeline-flow';
  data: UltimatePipelineFlowProps;
};

export type UltimateBenchmarkChartScene = UltimateSceneBase & {
  family: 'benchmark-chart';
  data: UltimateBenchmarkChartProps;
};

export type UltimateQuoteHighlightScene = UltimateSceneBase & {
  family: 'quote-highlight';
  data: UltimateQuoteHighlightProps;
};

export type UltimateGlossaryTermScene = UltimateSceneBase & {
  family: 'glossary-term';
  data: UltimateGlossaryTermProps;
};

export type UltimateCtaScene = UltimateSceneBase & {
  family: 'cta';
  data: UltimateCtaPanelProps;
};

export type UltimateSceneConfig =
  | UltimateHeroScene
  | UltimateFeatureRailScene
  | UltimateFocusScene
  | UltimateNumberStripScene
  | UltimateStepFlowScene
  | UltimateTimelineScene
  | UltimateCompareBoardScene
  | UltimateTerminalScene
  | UltimateEvidenceWallScene
  | UltimateArchitectureMapScene
  | UltimateTagMatrixScene
  | UltimateCodeScene
  | UltimateMetricsScene
  | UltimateDataStreamScene
  | UltimateMemoryGraphScene
  | UltimatePipelineFlowScene
  | UltimateBenchmarkChartScene
  | UltimateQuoteHighlightScene
  | UltimateGlossaryTermScene
  | UltimateCtaScene;

export type UltimateProjectConfig = {
  title?: string;
  defaultPlatformOverlay?: UltimatePlatformOverlayProps | false;
  defaultTransition?: UltimateTransitionConfig | false;
  scenes: UltimateSceneConfig[];
};

export type UltimateSceneTemplateProps = {
  config: UltimateProjectConfig;
  voiceFile?: string | null;
  audioSegments?: Array<{
    src: string;
    startFrame: number;
    durationInFrames: number;
  }> | null;
};

export type ResolvedUltimateTransitionConfig = Required<UltimateTransitionConfig>;

type WithResolvedTiming<T extends UltimateSceneConfig> = Omit<T, 'durationInFrames' | 'transition'> & {
  durationInFrames: number;
  transition: ResolvedUltimateTransitionConfig | false;
};

export type ResolvedUltimateHeroScene = WithResolvedTiming<UltimateHeroScene>;
export type ResolvedUltimateFeatureRailScene = WithResolvedTiming<UltimateFeatureRailScene>;
export type ResolvedUltimateFocusScene = WithResolvedTiming<UltimateFocusScene>;
export type ResolvedUltimateNumberStripScene = WithResolvedTiming<UltimateNumberStripScene>;
export type ResolvedUltimateStepFlowScene = WithResolvedTiming<UltimateStepFlowScene>;
export type ResolvedUltimateTimelineScene = WithResolvedTiming<UltimateTimelineScene>;
export type ResolvedUltimateCompareBoardScene = WithResolvedTiming<UltimateCompareBoardScene>;
export type ResolvedUltimateTerminalScene = WithResolvedTiming<UltimateTerminalScene>;
export type ResolvedUltimateEvidenceWallScene = WithResolvedTiming<UltimateEvidenceWallScene>;
export type ResolvedUltimateArchitectureMapScene = WithResolvedTiming<UltimateArchitectureMapScene>;
export type ResolvedUltimateTagMatrixScene = WithResolvedTiming<UltimateTagMatrixScene>;
export type ResolvedUltimateCodeScene = WithResolvedTiming<UltimateCodeScene>;
export type ResolvedUltimateMetricsScene = WithResolvedTiming<UltimateMetricsScene>;
export type ResolvedUltimateDataStreamScene = WithResolvedTiming<UltimateDataStreamScene>;
export type ResolvedUltimateMemoryGraphScene = WithResolvedTiming<UltimateMemoryGraphScene>;
export type ResolvedUltimatePipelineFlowScene = WithResolvedTiming<UltimatePipelineFlowScene>;
export type ResolvedUltimateBenchmarkChartScene = WithResolvedTiming<UltimateBenchmarkChartScene>;
export type ResolvedUltimateQuoteHighlightScene = WithResolvedTiming<UltimateQuoteHighlightScene>;
export type ResolvedUltimateGlossaryTermScene = WithResolvedTiming<UltimateGlossaryTermScene>;
export type ResolvedUltimateCtaScene = WithResolvedTiming<UltimateCtaScene>;

export type ResolvedUltimateSceneConfig =
  | ResolvedUltimateHeroScene
  | ResolvedUltimateFeatureRailScene
  | ResolvedUltimateFocusScene
  | ResolvedUltimateNumberStripScene
  | ResolvedUltimateStepFlowScene
  | ResolvedUltimateTimelineScene
  | ResolvedUltimateCompareBoardScene
  | ResolvedUltimateTerminalScene
  | ResolvedUltimateEvidenceWallScene
  | ResolvedUltimateArchitectureMapScene
  | ResolvedUltimateTagMatrixScene
  | ResolvedUltimateCodeScene
  | ResolvedUltimateMetricsScene
  | ResolvedUltimateDataStreamScene
  | ResolvedUltimateMemoryGraphScene
  | ResolvedUltimatePipelineFlowScene
  | ResolvedUltimateBenchmarkChartScene
  | ResolvedUltimateQuoteHighlightScene
  | ResolvedUltimateGlossaryTermScene
  | ResolvedUltimateCtaScene;

export type ResolvedUltimateProjectConfig = Omit<UltimateProjectConfig, 'defaultTransition' | 'scenes'> & {
  defaultTransition: ResolvedUltimateTransitionConfig | false;
  scenes: ResolvedUltimateSceneConfig[];
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const countText = (value?: string) => {
  return (value ?? '').replace(/\s+/g, '').length;
};

const countMany = (values: Array<string | undefined>) => {
  return values.reduce((total, current) => total + countText(current), 0);
};

const readSceneComplexity = (scene: UltimateSceneConfig) => {
  switch (scene.family) {
    case 'hero':
      return countMany([
        scene.data.kicker,
        scene.data.title,
        scene.data.subtitle,
        scene.data.badge,
        scene.subtitle,
      ]);
    case 'feature-rail':
      return (
        countMany([scene.data.kicker, scene.data.heading, scene.subtitle]) +
        scene.data.items.length * 18 +
        scene.data.items.reduce(
          (total, item) => total + countMany([item.title, item.eyebrow, item.caption]),
          0,
        )
      );
    case 'focus':
      return countMany([
        scene.data.eyebrow,
        scene.data.keyword,
        scene.data.question,
        scene.data.description,
        scene.subtitle,
      ]);
    case 'number-strip':
      return (
        countMany([scene.data.count, scene.data.heading, scene.subtitle]) +
        scene.data.items.length * 14 +
        scene.data.items.reduce((total, item) => total + countText(item.label), 0)
      );
    case 'step-flow':
      return (
        countMany([scene.data.heading, scene.subtitle]) +
        scene.data.steps.length * 22 +
        scene.data.steps.reduce(
          (total, step) => total + countMany([step.label, step.detail]),
          0,
        )
      );
    case 'timeline':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        scene.data.items.length * 18 +
        scene.data.items.reduce(
          (total, item) => total + countMany([item.label, item.title, item.detail]),
          0,
        )
      );
    case 'compare-board':
      return (
        countMany([
          scene.data.heading,
          scene.data.summary,
          scene.data.leftTitle,
          scene.data.rightTitle,
          scene.subtitle,
        ]) +
        scene.data.rows.length * 20 +
        scene.data.rows.reduce(
          (total, row) => total + countMany([row.label, row.left, row.right]),
          0,
        )
      );
    case 'terminal':
      return (
        countMany([scene.data.heading, scene.data.windowTitle, scene.data.command, scene.data.note, scene.subtitle]) +
        scene.data.outputs.length * 16 +
        scene.data.outputs.reduce((total, line) => total + countText(line), 0)
      );
    case 'evidence-wall':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        scene.data.cards.length * 22 +
        scene.data.cards.reduce(
          (total, card) =>
            total +
            countMany([
              card.source,
              card.quote,
              card.detail,
              ...(card.chips ?? []),
            ]),
          0,
        )
      );
    case 'architecture-map':
      return (
        countMany([
          scene.data.heading,
          scene.data.centerTitle,
          scene.data.centerDetail,
          scene.subtitle,
        ]) +
        scene.data.nodes.length * 18 +
        scene.data.nodes.reduce(
          (total, node) => total + countMany([node.label, node.detail]),
          0,
        )
      );
    case 'tag-matrix':
      return (
        countMany([scene.data.heading, scene.data.activeTab, scene.subtitle]) +
        (scene.data.tabs?.reduce((total, tab) => total + countText(tab), 0) ?? 0) +
        scene.data.items.length * 10 +
        scene.data.items.reduce((total, item) => total + countText(item.label), 0)
      );
    case 'code':
      return (
        countMany([scene.data.heading, scene.data.filename, scene.data.footer, scene.subtitle]) +
        scene.data.lines.length * 12 +
        scene.data.lines.reduce((total, line) => total + countText(line.text), 0)
      );
    case 'metrics':
      return (
        countMany([scene.data.heading, scene.subtitle]) +
        scene.data.items.length * 16 +
        scene.data.items.reduce(
          (total, item) => total + countMany([item.label, item.value]),
          0,
        )
      );
    case 'data-stream':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        scene.data.items.length * 16 +
        scene.data.items.reduce(
          (total, item) => total + countMany([item.label, item.value, item.detail]),
          0,
        )
      );
    case 'memory-graph':
      return (
        countMany([
          scene.data.heading,
          scene.data.summary,
          scene.data.centerTitle,
          scene.data.centerDetail,
          scene.subtitle,
        ]) +
        scene.data.nodes.length * 16 +
        scene.data.nodes.reduce(
          (total, node) => total + countMany([node.label, node.detail]),
          0,
        )
      );
    case 'pipeline-flow':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        scene.data.stages.length * 18 +
        scene.data.stages.reduce(
          (total, stage) => total + countMany([stage.label, stage.detail]),
          0,
        )
      );
    case 'benchmark-chart':
      return (
        countMany([
          scene.data.heading,
          scene.data.summary,
          scene.data.primaryLabel,
          scene.data.secondaryLabel,
          scene.subtitle,
        ]) +
        scene.data.items.length * 18 +
        scene.data.items.reduce(
          (total, item) =>
            total + countMany([item.label, item.primaryValue, item.secondaryValue]),
          0,
        )
      );
    case 'quote-highlight':
      return countMany([
        scene.data.heading,
        scene.data.quote,
        scene.data.attribution,
        ...((scene.data.tags ?? []).map((tag) => tag.label)),
        scene.subtitle,
      ]);
    case 'glossary-term':
      return countMany([
        scene.data.heading,
        scene.data.term,
        scene.data.pronunciation,
        scene.data.definition,
        ...((scene.data.related ?? []).map((tag) => tag.label)),
        scene.subtitle,
      ]);
    case 'cta':
      return countMany([
        scene.data.heading,
        scene.data.subtitle,
        scene.data.searchLabel,
        scene.data.badge,
        scene.subtitle,
      ]);
  }
};

const sceneBaseDurations: Record<UltimateSceneFamily, {base: number; max: number}> = {
  hero: {base: 84, max: 180},
  'feature-rail': {base: 82, max: 180},
  focus: {base: 78, max: 168},
  'number-strip': {base: 64, max: 144},
  'step-flow': {base: 88, max: 210},
  timeline: {base: 82, max: 186},
  'compare-board': {base: 90, max: 204},
  terminal: {base: 84, max: 186},
  'evidence-wall': {base: 84, max: 192},
  'architecture-map': {base: 90, max: 210},
  'tag-matrix': {base: 78, max: 168},
  code: {base: 74, max: 162},
  metrics: {base: 66, max: 144},
  'data-stream': {base: 80, max: 174},
  'memory-graph': {base: 88, max: 192},
  'pipeline-flow': {base: 84, max: 180},
  'benchmark-chart': {base: 84, max: 180},
  'quote-highlight': {base: 68, max: 144},
  'glossary-term': {base: 74, max: 156},
  cta: {base: 72, max: 150},
};

export const deriveUltimateSceneSubtitle = (scene: UltimateSceneConfig) => {
  if (scene.subtitle && scene.subtitle.trim().length > 0) {
    return scene.subtitle;
  }

  switch (scene.family) {
    case 'hero':
      return scene.data.subtitle ?? scene.data.title;
    case 'feature-rail':
      return scene.data.heading;
    case 'focus':
      return scene.data.question ?? scene.data.keyword;
    case 'number-strip':
      return `${scene.data.count} ${scene.data.heading}`;
    case 'step-flow':
      return scene.data.heading;
    case 'timeline':
      return scene.data.summary ?? scene.data.heading;
    case 'compare-board':
      return scene.data.summary ?? scene.data.heading;
    case 'terminal':
      return scene.data.note ?? scene.data.heading;
    case 'evidence-wall':
      return scene.data.summary ?? scene.data.heading;
    case 'architecture-map':
      return scene.data.centerDetail ?? scene.data.heading;
    case 'tag-matrix':
      return scene.data.heading;
    case 'code':
      return scene.data.footer ?? scene.data.heading;
    case 'metrics':
      return scene.data.heading;
    case 'data-stream':
      return scene.data.summary ?? scene.data.heading;
    case 'memory-graph':
      return scene.data.centerDetail ?? scene.data.heading;
    case 'pipeline-flow':
      return scene.data.summary ?? scene.data.heading;
    case 'benchmark-chart':
      return scene.data.summary ?? scene.data.heading;
    case 'quote-highlight':
      return scene.data.heading ?? scene.data.quote;
    case 'glossary-term':
      return scene.data.definition ?? scene.data.term;
    case 'cta':
      return scene.data.subtitle ?? scene.data.heading;
  }
};

export const estimateUltimateSceneDuration = (scene: UltimateSceneConfig) => {
  const explicit = scene.durationInFrames;

  if (Number.isFinite(explicit) && Number(explicit) > 0) {
    return Math.round(Number(explicit));
  }

  const preset = sceneBaseDurations[scene.family];
  const complexity = readSceneComplexity(scene);
  const bonus = Math.round(complexity * 0.42);

  return clamp(preset.base + bonus, preset.base, preset.max);
};

const DEFAULT_TRANSITION: ResolvedUltimateTransitionConfig = {
  preset: 'lift',
  durationInFrames: 12,
  color: 'rgba(7, 10, 18, 1)',
};

const resolveTransition = (
  projectTransition: UltimateProjectConfig['defaultTransition'],
  sceneTransition: UltimateSceneConfig['transition'],
): ResolvedUltimateTransitionConfig | false => {
  if (sceneTransition === false) {
    return false;
  }

  if (projectTransition === false && !sceneTransition) {
    return false;
  }

  return {
    ...DEFAULT_TRANSITION,
    ...(projectTransition === false ? {} : projectTransition ?? {}),
    ...(sceneTransition ?? {}),
  };
};

export const normalizeUltimateProjectConfig = (
  config: UltimateProjectConfig,
): ResolvedUltimateProjectConfig => {
  const normalizedDefaultTransition =
    config.defaultTransition === false
      ? false
      : {
          ...DEFAULT_TRANSITION,
          ...(config.defaultTransition ?? {}),
        };

  return {
    ...config,
    defaultTransition: normalizedDefaultTransition,
    scenes: config.scenes.map((scene) => ({
      ...scene,
      subtitle: deriveUltimateSceneSubtitle(scene),
      durationInFrames: estimateUltimateSceneDuration(scene),
      transition: resolveTransition(config.defaultTransition, scene.transition),
    })),
  };
};

export const getUltimateProjectDuration = (config: UltimateProjectConfig) => {
  return normalizeUltimateProjectConfig(config).scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
};
