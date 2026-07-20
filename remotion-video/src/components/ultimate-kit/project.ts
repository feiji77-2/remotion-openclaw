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
  UltimateStagePreset,
  UltimateHudMode,
  UltimateQuoteHighlightProps,
  UltimateStepFlowProps,
  UltimateTagMatrixProps,
  UltimateTerminalPanelProps,
  UltimateTimelineProps,
  UltimateSceneGrammar,
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
  | 'skill-showcase'
  | 'evidence-wall'
  | 'architecture-map'
  | 'tag-matrix'
  | 'code'
  | 'metrics'
  | 'data-stream'
  /** @deprecated Use 'architecture-map' instead */
  | 'memory-graph'
  /** @deprecated Use 'step-flow' instead */
  | 'pipeline-flow'
  | 'benchmark-chart'
  | 'quote-highlight'
  | 'glossary-term'
  | 'cta'
  // ── Minimal (抖音风格) ──────────────────
  | 'minimal-hero'
  | 'minimal-step-flow'
  | 'minimal-tag-matrix'
  | 'minimal-number-strip'
  | 'minimal-timeline'
  | 'minimal-compare-board'
  // ── Spoken (口播驱动模式) ────────────────
  | 'spoken-title'
  | 'spoken-metric'
  | 'spoken-process'
  | 'spoken-ranking'
  | 'spoken-compare'
  | 'spoken-tags'
  | 'spoken-code'
  | 'spoken-takeaway'
  // ── Swiss (Swiss 极简口播 · 反平均审美) ───────────────
  // 白底 #fafafa / 黑字 #0a0a0a / 克制红 accent / Helvetica Neue 左对齐粗网格。
  // 刻意不叫 spoken-* 以避开 ProjectSceneRegistry 的深色 SpokenAssetLayer 外壳 + 径向光晕。
  | 'swiss-title'
  | 'swiss-question'
  | 'swiss-list'      // 编号清单（如 37 条规则 / 8 个类别）
  | 'swiss-compare'   // 左右 before/after 对比（程序化生成素材）
  | 'swiss-number'    // 巨大数字强调（22,000 / 161 / 67 / 57 / 99）
  | 'swiss-grid'      // N 格方向/品牌 tile 网格（6 审美方向 / 4 品牌 / 4 统计）
  | 'swiss-flow'      // 流程示意（锚定→稳定输出）
  | 'swiss-tabular'   // 设计系统 token 表（Color/Type/Space/A11y）
  | 'swiss-stamp';    // 印章式收尾

export type UltimateTransitionPreset =
  | 'fade'
  | 'lift'
  | 'flash'
  | 'slide'
  | 'wipe'
  | 'flip'
  | 'clock-wipe';

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
  /** 舞台外壳配置：控制 PlatformOverlay / MediaCard / IconOrbit 是否启用，null = 全部不显示 */
  stageConfig?: {
    showOverlay?: boolean;
    showMediaCard?: boolean;
    showIconOrbit?: boolean;
    stagePreset?: UltimateStagePreset;
    hudMode?: UltimateHudMode;
  } | null;
  /** Optional motion grammar consumed by reusable Ultimate components. */
  grammar?: UltimateSceneGrammar;
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

export type UltimateSkillShowcaseScene = UltimateSceneBase & {
  family: 'skill-showcase';
  data: Record<string, unknown>;
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

export type SpokenMetricItem = {
  label: string;
  value: string;
  accent?: string;
};

export type SpokenProcessStep = {
  label: string;
  detail?: string;
  accent?: string;
};

export type SpokenTitleData = {
  title: string;
  subtitle?: string;
  kicker?: string;
  accent?: string;
};

export type SpokenMetricData = {
  heading?: string;
  items: SpokenMetricItem[];
  accent?: string;
};

export type SpokenProcessData = {
  steps: SpokenProcessStep[];
  accent?: string;
};

// ── Spoken scene types (口播驱动模式) ────────────────
// Extends UltimateSceneBase to inherit iconPack, grammar, stageConfig, etc.
export type SpokenSceneBase = UltimateSceneBase & {
  family: Exclude<UltimateSceneFamily,
    | 'hero' | 'feature-rail' | 'focus' | 'number-strip' | 'step-flow'
    | 'timeline' | 'compare-board' | 'terminal' | 'skill-showcase' | 'evidence-wall'
    | 'architecture-map' | 'tag-matrix' | 'code' | 'metrics' | 'data-stream'
    | 'memory-graph' | 'pipeline-flow' | 'benchmark-chart' | 'quote-highlight'
    | 'glossary-term' | 'cta'
    | 'minimal-hero' | 'minimal-step-flow' | 'minimal-tag-matrix'
    | 'minimal-number-strip' | 'minimal-timeline' | 'minimal-compare-board'>;
  id: string;
  durationInFrames: number;
};

export type SpokenTitleScene = SpokenSceneBase & {family: 'spoken-title'; data: SpokenTitleData};
export type SpokenMetricScene = SpokenSceneBase & {family: 'spoken-metric'; data: SpokenMetricData};
export type SpokenProcessScene = SpokenSceneBase & {family: 'spoken-process'; data: SpokenProcessData};
export type SpokenRankingScene = SpokenSceneBase & {family: 'spoken-ranking'; data: SpokenMetricData};
export type SpokenCompareScene = SpokenSceneBase & {family: 'spoken-compare'; data: SpokenMetricData};
export type SpokenTagsScene = SpokenSceneBase & {family: 'spoken-tags'; data: SpokenMetricData};
export type SpokenCodeScene = SpokenSceneBase & {family: 'spoken-code'; data: SpokenMetricData};
export type SpokenTakeawayScene = SpokenSceneBase & {family: 'spoken-takeaway'; data: SpokenTitleData};

export type UltimateSceneConfig =
  | UltimateHeroScene
  | UltimateFeatureRailScene
  | UltimateFocusScene
  | UltimateNumberStripScene
  | UltimateStepFlowScene
  | UltimateTimelineScene
  | UltimateCompareBoardScene
  | UltimateTerminalScene
  | UltimateSkillShowcaseScene
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
  | UltimateCtaScene
  // ── Spoken (口播驱动模式) ────────────────
  | SpokenTitleScene
  | SpokenMetricScene
  | SpokenProcessScene
  | SpokenRankingScene
  | SpokenCompareScene
  | SpokenTagsScene
  | SpokenCodeScene
  | SpokenTakeawayScene;

export type UltimateProjectConfig = {
  title?: string;
  defaultPlatformOverlay?: UltimatePlatformOverlayProps | false;
  defaultTransition?: UltimateTransitionConfig | false;
  scenes: UltimateSceneConfig[];
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
export type ResolvedUltimateSkillShowcaseScene = WithResolvedTiming<UltimateSkillShowcaseScene>;
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

// ── Spoken resolved types (口播驱动模式) ────────────────
export type ResolvedSpokenTitleScene = WithResolvedTiming<SpokenTitleScene>;
export type ResolvedSpokenMetricScene = WithResolvedTiming<SpokenMetricScene>;
export type ResolvedSpokenProcessScene = WithResolvedTiming<SpokenProcessScene>;
export type ResolvedSpokenRankingScene = WithResolvedTiming<SpokenRankingScene>;
export type ResolvedSpokenCompareScene = WithResolvedTiming<SpokenCompareScene>;
export type ResolvedSpokenTagsScene = WithResolvedTiming<SpokenTagsScene>;
export type ResolvedSpokenCodeScene = WithResolvedTiming<SpokenCodeScene>;
export type ResolvedSpokenTakeawayScene = WithResolvedTiming<SpokenTakeawayScene>;

export type ResolvedUltimateSceneConfig =
  | ResolvedUltimateHeroScene
  | ResolvedUltimateFeatureRailScene
  | ResolvedUltimateFocusScene
  | ResolvedUltimateNumberStripScene
  | ResolvedUltimateStepFlowScene
  | ResolvedUltimateTimelineScene
  | ResolvedUltimateCompareBoardScene
  | ResolvedUltimateTerminalScene
  | ResolvedUltimateSkillShowcaseScene
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
  | ResolvedUltimateCtaScene
  // ── Spoken (口播驱动模式) ────────────────
  | ResolvedSpokenTitleScene
  | ResolvedSpokenMetricScene
  | ResolvedSpokenProcessScene
  | ResolvedSpokenRankingScene
  | ResolvedSpokenCompareScene
  | ResolvedSpokenTagsScene
  | ResolvedSpokenCodeScene
  | ResolvedSpokenTakeawayScene;

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
        (scene.data.items?.length ?? 0) * 18 +
        (scene.data.items?.reduce(
          (total, item) => total + countMany([item.title, item.eyebrow, item.caption]),
          0,
        ) ?? 0)
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
        (scene.data.items?.length ?? 0) * 14 +
        (scene.data.items?.reduce((total, item) => total + countText(item.label), 0) ?? 0)
      );
    case 'step-flow':
      return (
        countMany([scene.data.heading, scene.subtitle]) +
        (scene.data.steps?.length ?? 0) * 22 +
        (scene.data.steps?.reduce(
          (total, step) => total + countMany([step.label, step.detail]),
          0,
        ) ?? 0)
      );
    case 'timeline':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        (scene.data.items?.length ?? 0) * 18 +
        (scene.data.items?.reduce(
          (total, item) => total + countMany([item.label, item.title, item.detail]),
          0,
        ) ?? 0)
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
        (scene.data.rows?.length ?? 0) * 20 +
        (scene.data.rows?.reduce(
          (total, row) => total + countMany([row.label, row.left, row.right]),
          0,
        ) ?? 0)
      );
    case 'terminal':
      return (
        countMany([scene.data.heading, scene.data.windowTitle, scene.data.command, scene.data.note, scene.subtitle]) +
        (scene.data.outputs?.length ?? 0) * 16 +
        (scene.data.outputs?.reduce((total, line) => total + countText(line), 0) ?? 0)
      );
    case 'evidence-wall':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        (scene.data.cards?.length ?? 0) * 22 +
        (scene.data.cards?.reduce(
          (total, card) =>
            total +
            countMany([
              card.source,
              card.quote,
              card.detail,
              ...(card.chips ?? []),
            ]),
          0,
        ) ?? 0)
      );
    case 'architecture-map':
      return (
        countMany([
          scene.data.heading,
          scene.data.centerTitle,
          scene.data.centerDetail,
          scene.subtitle,
        ]) +
        (scene.data.nodes?.length ?? 0) * 18 +
        (scene.data.nodes?.reduce(
          (total, node) => total + countMany([node.label, node.detail]),
          0,
        ) ?? 0)
      );
    case 'tag-matrix':
      return (
        countMany([scene.data.heading, scene.data.activeTab, scene.subtitle]) +
        (scene.data.tabs?.reduce((total, tab) => total + countText(tab), 0) ?? 0) +
        (scene.data.items?.length ?? 0) * 10 +
        (scene.data.items?.reduce((total, item) => total + countText(item.label), 0) ?? 0)
      );
    case 'code':
      return (
        countMany([scene.data.heading, scene.data.filename, scene.data.footer, scene.subtitle]) +
        (scene.data.lines?.length ?? 0) * 12 +
        (scene.data.lines?.reduce((total, line) => total + countText(line.text), 0) ?? 0)
      );
    case 'metrics':
      return (
        countMany([scene.data.heading, scene.subtitle]) +
        (scene.data.items?.length ?? 0) * 16 +
        (scene.data.items?.reduce(
          (total, item) => total + countMany([item.label, item.value]),
          0,
        ) ?? 0)
      );
    case 'data-stream':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        (scene.data.items?.length ?? 0) * 16 +
        (scene.data.items?.reduce(
          (total, item) => total + countMany([item.label, item.value, item.detail]),
          0,
        ) ?? 0)
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
        (scene.data.nodes?.length ?? 0) * 16 +
        (scene.data.nodes?.reduce(
          (total, node) => total + countMany([node.label, node.detail]),
          0,
        ) ?? 0)
      );
    case 'pipeline-flow':
      return (
        countMany([scene.data.heading, scene.data.summary, scene.subtitle]) +
        (scene.data.stages?.length ?? 0) * 18 +
        (scene.data.stages?.reduce(
          (total, stage) => total + countMany([stage.label, stage.detail]),
          0,
        ) ?? 0)
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
        (scene.data.items?.length ?? 0) * 18 +
        (scene.data.items?.reduce(
          (total, item) =>
            total + countMany([item.label, item.primaryValue, item.secondaryValue]),
          0,
        ) ?? 0)
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
    // ── Minimal / spoken families: no complex data, just count subtitle ─
    // (MinimalXxxScene types not in UltimateSceneConfig union — handled by default)
    // (SpokenXxxScene types have simple structure — counted via subtitle)
    default:
      // Covers minimal-*, spoken-*, and any future families added to UltimateSceneFamily
      return countText(scene.subtitle);
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
  'skill-showcase': {base: 240, max: 900},
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
  // ── Minimal (抖音风格) ──────────────────
  'minimal-hero': {base: 90, max: 180},
  'minimal-step-flow': {base: 120, max: 300},
  'minimal-tag-matrix': {base: 100, max: 240},
  'minimal-number-strip': {base: 90, max: 180},
  'minimal-timeline': {base: 120, max: 300},
  'minimal-compare-board': {base: 100, max: 240},
  // ── Spoken (口播驱动模式) ────────────────
  'spoken-title': {base: 90, max: 180},
  'spoken-metric': {base: 80, max: 180},
  'spoken-process': {base: 110, max: 300},
  'spoken-ranking': {base: 80, max: 180},
  'spoken-compare': {base: 90, max: 240},
  'spoken-tags': {base: 70, max: 150},
  'spoken-code': {base: 90, max: 240},
  'spoken-takeaway': {base: 70, max: 150},
  // ── Swiss (Swiss 极简口播) ────────────────
  // Swiss scene 的实际时长由 project.json 的 durationInFrames 显式决定（口播按秒×30 给）；
  // 这里的 base/max 只给 estimateUltimateSceneDuration 在缺省兜底、及工具预览用。
  'swiss-title':    {base: 180, max: 540},
  'swiss-question': {base: 180, max: 360},
  'swiss-list':     {base: 240, max: 540},
  'swiss-compare':  {base: 300, max: 600},
  'swiss-number':   {base: 180, max: 360},
  'swiss-grid':     {base: 240, max: 540},
  'swiss-flow':     {base: 240, max: 420},
  'swiss-tabular':  {base: 300, max: 600},
  'swiss-stamp':    {base: 360, max: 720},
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

type SceneTimingLike = {
  durationInFrames: number;
  transition?: {
    durationInFrames?: number;
  } | false;
};

export const getUltimateIncomingTransitionDurationInFrames = (
  previousScene: Pick<SceneTimingLike, 'durationInFrames'> | null,
  scene: SceneTimingLike,
) => {
  if (!previousScene || !scene.transition) {
    return 0;
  }

  const requestedDuration = Number(
    scene.transition.durationInFrames ?? DEFAULT_TRANSITION.durationInFrames,
  );

  if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
    return 0;
  }

  const previousDuration = Math.max(1, Math.round(Number(previousScene.durationInFrames) || 1));
  const currentDuration = Math.max(1, Math.round(Number(scene.durationInFrames) || 1));
  const maxOverlap = Math.max(0, Math.min(previousDuration, currentDuration) - 1);

  return Math.min(Math.round(requestedDuration), maxOverlap);
};

export const getUltimateTimelineDurationInFrames = (
  scenes: readonly SceneTimingLike[],
) => {
  const summedDuration = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  const overlapDuration = scenes.reduce((total, scene, index) => {
    const previousScene = index > 0 ? scenes[index - 1] : null;
    return total + getUltimateIncomingTransitionDurationInFrames(previousScene, scene);
  }, 0);

  return Math.max(0, summedDuration - overlapDuration);
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
  return getUltimateTimelineDurationInFrames(normalizeUltimateProjectConfig(config).scenes);
};
