import type {
  UltimateCodePanelProps,
  UltimateCtaPanelProps,
  UltimateFeatureCardRailProps,
  UltimateFocusDiagramProps,
  UltimateHeroPanelProps,
  UltimateMetricBarsProps,
  UltimateNumberStripProps,
  UltimatePlatformOverlayProps,
  UltimateStepFlowProps,
  UltimateTagMatrixProps,
  UltimateTerminalPanelProps,
} from './types';

export type UltimateSceneFamily =
  | 'hero'
  | 'feature-rail'
  | 'focus'
  | 'number-strip'
  | 'step-flow'
  | 'terminal'
  | 'tag-matrix'
  | 'code'
  | 'metrics'
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

export type UltimateTerminalScene = UltimateSceneBase & {
  family: 'terminal';
  data: UltimateTerminalPanelProps;
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
  | UltimateTerminalScene
  | UltimateTagMatrixScene
  | UltimateCodeScene
  | UltimateMetricsScene
  | UltimateCtaScene;

export type UltimateProjectConfig = {
  title?: string;
  defaultPlatformOverlay?: UltimatePlatformOverlayProps | false;
  defaultTransition?: UltimateTransitionConfig | false;
  scenes: UltimateSceneConfig[];
};

export type UltimateSceneTemplateProps = {
  config: UltimateProjectConfig;
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
export type ResolvedUltimateTerminalScene = WithResolvedTiming<UltimateTerminalScene>;
export type ResolvedUltimateTagMatrixScene = WithResolvedTiming<UltimateTagMatrixScene>;
export type ResolvedUltimateCodeScene = WithResolvedTiming<UltimateCodeScene>;
export type ResolvedUltimateMetricsScene = WithResolvedTiming<UltimateMetricsScene>;
export type ResolvedUltimateCtaScene = WithResolvedTiming<UltimateCtaScene>;

export type ResolvedUltimateSceneConfig =
  | ResolvedUltimateHeroScene
  | ResolvedUltimateFeatureRailScene
  | ResolvedUltimateFocusScene
  | ResolvedUltimateNumberStripScene
  | ResolvedUltimateStepFlowScene
  | ResolvedUltimateTerminalScene
  | ResolvedUltimateTagMatrixScene
  | ResolvedUltimateCodeScene
  | ResolvedUltimateMetricsScene
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
    case 'terminal':
      return (
        countMany([scene.data.heading, scene.data.windowTitle, scene.data.command, scene.data.note, scene.subtitle]) +
        scene.data.outputs.length * 16 +
        scene.data.outputs.reduce((total, line) => total + countText(line), 0)
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
  terminal: {base: 84, max: 186},
  'tag-matrix': {base: 78, max: 168},
  code: {base: 74, max: 162},
  metrics: {base: 66, max: 144},
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
    case 'terminal':
      return scene.data.note ?? scene.data.heading;
    case 'tag-matrix':
      return scene.data.heading;
    case 'code':
      return scene.data.footer ?? scene.data.heading;
    case 'metrics':
      return scene.data.heading;
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
