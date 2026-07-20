/**
 * Family Registry — machine-readable source of truth for all 20 scene families.
 *
 * Single source of truth for:
 *   - family metadata (semantic tags, description)
 *   - required data fields per family
 *   - timing config defaults (enter / emphasis / exit / speed / easing)
 *   - default transition presets per family
 *   - stage shell config defaults
 *
 * AI-editable, version-controlled. No more switch-dispatch scattered across
 * Reusable rhythm and family metadata for the Ultimate component library.
 *
 * NOTE: This module is the canonical source. A JSON copy at public/r/registry.json
 * is generated from this file for runtime/CLI consumption.
 */

import type {
  UltimateSceneFamily,
  UltimateTransitionPreset,
} from '../components/ultimate-kit/project';
import type {UltimateHudMode, UltimateStagePreset} from '../components/ultimate-kit/types';

// ─── Timing config shape ────────────────────────────────────────────────────

export type EasingName =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring-default'
  | 'spring-bounce'
  | 'spring-soft'
  | 'spring-snappy';

/** Spring preset bound to motion.ts getSpringConfig() — drives all per-element spring animations. */
export type SpringPreset = 'smooth' | 'snappy' | 'bouncy' | 'heavy';

/**
 * Camera motion preset — maps to CameraDirector.tsx spring-driven transform.
 * Each preset maps to specific spring config + transform axis.
 *
 * | Preset        | 轴向       | 典型用途                          |
 * |---------------|------------|-----------------------------------|
 * | drift         | Y ±30px    | 背景/装饰元素微微浮动               |
 * | push-in       | scale 1→1.08 | 强调/聚焦/进入感                 |
 * | pan-x         | X -50→0px  | 横向扫描（rail/compare/timeline）  |
 * | pan-y         | Y ±60px    | 纵向滚动（list/evidence-wall）     |
 * | zoom-pulse    | scale循环   | 数据强调/数字跳动                 |
 * | growth        | scale Y     | 柱状图/流程节点/benchmark bar      |
 * | none          | —          | 纯静态，无 camera motion           |
 */
export type CameraMotionPreset =
  | 'drift'
  | 'push-in'
  | 'pan-x'
  | 'pan-y'
  | 'zoom-pulse'
  | 'growth'
  | 'none';

export type RhythmLayer =
  | 'context'
  | 'structure'
  | 'emphasis'
  | 'proof'
  | 'closing';

export type BackdropVariant =
  | 'particle-grid'
  | 'god-rays'
  | 'dot-grid';

export interface FamilyRhythmContract {
  layer: RhythmLayer;
  staggerGap: number;
  revealStiffness: number;
  preferredCameraMotion?: CameraMotionPreset;
  backdropCycle: readonly BackdropVariant[];
}

export interface FamilyTimingConfig {
  /** Whole-scene base duration in frames (at 30 fps). Override per-shot via shot.frames. */
  baseDurationFrames: number;
  /** Enter phase: frames from scene start to fully visible. */
  enterFrames: number;
  /** Emphasis phase: frames where core content is "active" before exit. */
  emphasisFrames: number;
  /** Exit phase: frames from last note to scene end. */
  exitFrames: number;
  /** Per-element stagger gap in frames (applied to lists/rails). */
  staggerFrames: number;
  /** Default easing preset name. */
  easing: EasingName;
  /**
   * Spring preset — resolved via motion.ts getSpringConfig() → Remotion spring config.
   *
   * IMPORTANT: All presets resolve to { damping: 200 }. The preset name is a
   * narrative intent label only (reveal/emphasize/background/data). The actual
   * spring parameter is ALWAYS damping: 200 (github-unwrapped canonical).
   *
   * Preset labels exist to communicate intent to developers and to future-proof
   * if Remotion ever exposes per-preset tuning. Do NOT use them to get
   * visually different spring behaviours — use frame offset and stagger instead.
   */
  springPreset: SpringPreset;
  /**
   * Camera motion preset — drives CameraDirector.tsx layer wrapping each scene.
   * Controls the "director-level" motion layer (not per-element micro-motion).
   */
  cameraMotion: CameraMotionPreset;
}

export interface FamilyStageConfig {
  showOverlay?: boolean;
  showMediaCard?: boolean;
  showIconOrbit?: boolean;
  stagePreset?: UltimateStagePreset;
  hudMode?: UltimateHudMode;
}

const FAMILY_STAGE_PRESET: Record<UltimateSceneFamily, UltimateStagePreset> = {
  hero: 'opening',
  'feature-rail': 'data',
  focus: 'evidence',
  'number-strip': 'data',
  'step-flow': 'data',
  timeline: 'data',
  'compare-board': 'climax',
  terminal: 'data',
  'skill-showcase': 'data',
  'evidence-wall': 'evidence',
  'architecture-map': 'evidence',
  'tag-matrix': 'evidence',
  code: 'data',
  metrics: 'data',
  'data-stream': 'data',
  'memory-graph': 'evidence',
  'pipeline-flow': 'data',
  'benchmark-chart': 'data',
  'quote-highlight': 'climax',
  'glossary-term': 'evidence',
  cta: 'cta',
  // ── Minimal (抖音风格) ──────────────────
  'minimal-hero': 'opening',
  'minimal-step-flow': 'data',
  'minimal-tag-matrix': 'data',
  'minimal-number-strip': 'data',
  'minimal-timeline': 'data',
  'minimal-compare-board': 'climax',
  // ── Spoken (口播驱动模式) ────────────────
  'spoken-title': 'opening',
  'spoken-metric': 'data',
  'spoken-process': 'data',
  'spoken-ranking': 'data',
  'spoken-compare': 'climax',
  'spoken-tags': 'data',
  'spoken-code': 'data',
  'spoken-takeaway': 'climax',
  // ── Swiss (Swiss 极简口播) ────────────────
  'swiss-title':    'opening',
  'swiss-question': 'opening',
  'swiss-list':     'evidence',
  'swiss-compare':  'climax',
  'swiss-number':   'data',
  'swiss-grid':     'data',
  'swiss-flow':     'data',
  'swiss-tabular':  'evidence',
  'swiss-stamp':    'cta',
};

const STAGE_PRESET_SHELLS: Record<UltimateStagePreset, Required<Pick<FamilyStageConfig, 'showOverlay' | 'showMediaCard' | 'showIconOrbit'>> & {hudMode: UltimateHudMode}> = {
  opening: {showOverlay: false, showMediaCard: false, showIconOrbit: true, hudMode: 'minimal'},
  data: {showOverlay: true, showMediaCard: false, showIconOrbit: false, hudMode: 'terminal'},
  evidence: {showOverlay: false, showMediaCard: true, showIconOrbit: false, hudMode: 'minimal'},
  climax: {showOverlay: false, showMediaCard: false, showIconOrbit: false, hudMode: 'minimal'},
  cta: {showOverlay: false, showMediaCard: false, showIconOrbit: false, hudMode: 'minimal'},
};

const ARCHETYPE_TRANSITIONS: Partial<Record<string, {preset: UltimateTransitionPreset; durationInFrames: number}>> = {
  'lock-on reveal': {preset: 'fade', durationInFrames: 12},
  'pressure countdown': {preset: 'lift', durationInFrames: 12},
  'overtake race': {preset: 'slide', durationInFrames: 12},
  'evidence pin': {preset: 'flash', durationInFrames: 10},
  'threshold breach': {preset: 'flash', durationInFrames: 12},
  'aftershock hold': {preset: 'fade', durationInFrames: 16},
  'follow focus': {preset: 'slide', durationInFrames: 14},
  'compress compare': {preset: 'wipe', durationInFrames: 12},
  'drift reveal': {preset: 'fade', durationInFrames: 14},
  'bullet train': {preset: 'wipe', durationInFrames: 10},
  'burst spread': {preset: 'lift', durationInFrames: 12},
  'trace flow': {preset: 'wipe', durationInFrames: 14},
};

const STAGE_BACKDROP_CYCLE: Record<UltimateStagePreset, readonly BackdropVariant[]> = {
  opening: ['god-rays', 'particle-grid', 'dot-grid'],
  data: ['dot-grid', 'particle-grid', 'god-rays'],
  evidence: ['particle-grid', 'god-rays', 'dot-grid'],
  climax: ['god-rays', 'dot-grid', 'particle-grid'],
  cta: ['god-rays', 'particle-grid', 'dot-grid'],
};

export interface FamilyEntry {
  family: UltimateSceneFamily;
  /** Human-readable label for tooling / docs. */
  label: string;
  /** Short description of the family purpose. */
  description: string;
  /** Semantic tags used by AI agents to select this family. */
  semanticTags: string[];
  /** Fields that MUST be present in shot.visualProps / shot data for this family. */
  requiredFields: string[];
  /** Fields that this family CAN use but does not require. */
  optionalFields: string[];
  /** Default accent colour for this family when not overridden. */
  defaultAccent: 'cyan' | 'orange' | 'purple';
  /** Default timing values used by component previews and visual tooling. */
  timing: FamilyTimingConfig;
  /** Transition preset used when shot.transition is absent. */
  defaultTransition: {
    preset: UltimateTransitionPreset;
    durationInFrames: number;
  };
  /** Default stage shell config. null = all visible (backward-compatible). */
  stageConfig: FamilyStageConfig | null;
}

// ─── Transition Techniques（借鉴 shellbot-video-generator）──────────────────────
//
// 8 种场景过渡手法，用于 `defaultTransition.preset` 选型参考：
//
// | 手法              | preset      | 适用场景                                        |
// |-------------------|-------------|------------------------------------------------|
// | 淡入淡出          | fade        | 情感柔和过渡、场景切换                          |
// | 抬起揭示          | lift        | 新元素从下方滑入，旧场景缩小退场                |
// | 闪光过渡          | flash       | 强调、节奏感强、戏剧性时刻                      |
// | 缩放穿越          | zoom-through| 镜头推入元素，从元素内部穿出进入新场景（ZoomIn） |
// | Clip-path 揭示    | clip        | 圆形/多边形从某点生长揭示（TextMaskWipe）        |
// | 3D 翻转           | flip        | 绕 Y 轴翻转，perspective flip                   |
// | Wipe 横扫         | wipe        | 有色形状横扫画面揭示下一场景                    |
// | 场景叠化          | dissolve    | 两场景短暂重叠，soft dissolve                   |
//
// 原则：
// - 场景切换用短过渡（8-18 帧），避免拖沓
// - 叙事转折点用长过渡（20-30 帧），给观众消化时间
// - 相邻场景色调差异大 → 用 fade/dissolve 软过渡
// - 相邻场景色调接近 → 用 wipe/slide 硬过渡制造节奏感

// ─── Registry ───────────────────────────────────────────────────────────────

const REGISTRY: Record<UltimateSceneFamily, FamilyEntry> = {
  hero: {
    family: 'hero',
    label: 'Hero / Title Card',
    description: 'Full-screen opening title with strong visual focal point. Used for opening shots.',
    semanticTags: ['opening', 'title', 'hero', 'hook', 'intro', '开场', '标题'],
    requiredFields: ['title'],
    optionalFields: ['kicker', 'subtitle', 'visualSummary', 'heroMark', 'topLabel'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 20,
      emphasisFrames: 50,
      exitFrames: 20,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 18},
    stageConfig: null,
  },

  'feature-rail': {
    family: 'feature-rail',
    label: 'Feature Card Rail',
    description: 'Horizontal scrolling or static rail of feature cards. Used for listing capabilities.',
    semanticTags: ['feature', 'capability', 'list', 'rail', 'card', '功能', '特性', '列表'],
    requiredFields: ['items'],
    optionalFields: ['heading', 'subtitle'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 82,
      enterFrames: 18,
      emphasisFrames: 48,
      exitFrames: 16,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-x',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  focus: {
    family: 'focus',
    label: 'Focus / Keyword Highlight',
    description: 'Single keyword or phrase pulled into visual focus with supporting context.',
    semanticTags: ['focus', 'keyword', 'highlight', 'single', 'emphasis', '聚焦', '重点', '单点'],
    requiredFields: ['keyword', 'description'],
    optionalFields: ['eyebrow', 'question', 'diagram', 'kicker'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 72,
      enterFrames: 16,
      emphasisFrames: 40,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showIconOrbit: false},
  },

  'number-strip': {
    family: 'number-strip',
    label: 'Number Strip',
    description: 'Large animated numbers with supporting detail. Used for key stats and metrics.',
    semanticTags: ['number', 'stat', 'metric', 'count', 'data', '数字', '统计', '指标'],
    requiredFields: ['count'],
    optionalFields: ['items', 'summary', 'heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 75,
      enterFrames: 18,
      emphasisFrames: 42,
      exitFrames: 15,
      staggerFrames: 6,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'zoom-pulse',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'step-flow': {
    family: 'step-flow',
    label: 'Step Flow',
    description: 'Sequential numbered steps with icons. Used for processes and workflows.',
    semanticTags: ['step', 'process', 'workflow', 'sequence', 'numbered', '步骤', '流程', '顺序'],
    requiredFields: ['steps'],
    optionalFields: ['items', 'variant', 'stepVariants'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 84,
      enterFrames: 16,
      emphasisFrames: 52,
      exitFrames: 16,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-y',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  timeline: {
    family: 'timeline',
    label: 'Timeline',
    description: 'Horizontal timeline with labeled milestones. Used for historical or sequential events.',
    semanticTags: ['timeline', 'history', 'milestone', 'sequence', 'chronological', '时间线', '时间轴'],
    requiredFields: ['items'],
    optionalFields: ['heading', 'subtitle'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 18,
      emphasisFrames: 46,
      exitFrames: 16,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-y',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'compare-board': {
    family: 'compare-board',
    label: 'Comparison Board',
    description: 'Side-by-side bilateral comparison rows. Used for before/after, pro/con, A/B analysis.',
    semanticTags: ['compare', 'comparison', 'bilateral', 'before-after', 'pro-con', '对比', '比较', 'A/B'],
    requiredFields: ['rows'],
    optionalFields: ['leftTitle', 'rightTitle', 'comparisons', 'dataPoints'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 82,
      enterFrames: 16,
      emphasisFrames: 50,
      exitFrames: 16,
      staggerFrames: 6,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-x',
    },
    defaultTransition: {preset: 'lift', durationInFrames: 12},
    stageConfig: null,
  },

  terminal: {
    family: 'terminal',
    label: 'Terminal / Code Panel',
    description: 'Simulated terminal or code window. Used for commands, outputs, and technical demos.',
    semanticTags: ['terminal', 'code', 'command', 'cli', 'technical', 'terminal', '代码', '命令'],
    requiredFields: ['command'],
    optionalFields: ['windowTitle', 'outputs', 'note', 'heading', 'filename', 'language'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 75,
      enterFrames: 14,
      emphasisFrames: 46,
      exitFrames: 15,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false},
  },

  'skill-showcase': {
    family: 'skill-showcase',
    label: 'Skill Showcase',
    description: 'Portrait editorial showcase with chapter headers, semantic beats, matched icons, and purpose-built proof visuals.',
    semanticTags: ['skill', 'showcase', 'editorial', 'portrait', 'chapter', 'beat', 'icon', '口播', '技能', '竖屏', '章节', '语义节拍'],
    requiredFields: ['variant', 'title'],
    optionalFields: ['subtitle', 'index', 'accent', 'secondaryAccent', 'bullets', 'labels', 'beats'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 300,
      enterFrames: 18,
      emphasisFrames: 252,
      exitFrames: 30,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 10},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false, hudMode: 'minimal'},
  },

  'evidence-wall': {
    family: 'evidence-wall',
    label: 'Evidence Wall',
    description: 'Grid or stack of evidence cards with quotes and citations. Used for proof and social proof.',
    semanticTags: ['evidence', 'proof', 'quote', 'citation', 'wall', 'testimonial', '证据', '引用', '证言'],
    requiredFields: ['cards'],
    optionalFields: ['comparisons', 'heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 85,
      enterFrames: 20,
      emphasisFrames: 48,
      exitFrames: 17,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-y',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'architecture-map': {
    family: 'architecture-map',
    label: 'Architecture / System Map',
    description: 'Radial or stacked node graph representing system architecture.',
    semanticTags: ['architecture', 'system', 'graph', 'nodes', 'radial', '架构', '系统图', '节点'],
    requiredFields: ['nodes', 'centerTitle'],
    optionalFields: ['centerDetail', 'layout', 'items', 'heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 82,
      enterFrames: 18,
      emphasisFrames: 48,
      exitFrames: 16,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'drift',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'tag-matrix': {
    family: 'tag-matrix',
    label: 'Tag Matrix',
    description: 'Tabbed or grid layout of tags and labels. Used for categorisation and overviews.',
    semanticTags: ['tag', 'matrix', 'grid', 'category', 'overview', '标签', '分类', '矩阵'],
    requiredFields: ['tabs'],
    optionalFields: ['activeTab', 'items', 'heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 70,
      enterFrames: 14,
      emphasisFrames: 40,
      exitFrames: 16,
      staggerFrames: 6,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-x',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  code: {
    family: 'code',
    label: 'Code Panel',
    description: 'Syntax-highlighted code block with optional filename and line annotations.',
    semanticTags: ['code', 'snippet', 'syntax', 'programming', '代码', '代码块'],
    requiredFields: ['lines'],
    optionalFields: ['filename', 'language', 'heading', 'visualProps'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 78,
      enterFrames: 14,
      emphasisFrames: 48,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false},
  },

  metrics: {
    family: 'metrics',
    label: 'Metrics / KPI Bars',
    description: 'Animated horizontal bars showing KPI values and ratios.',
    semanticTags: ['metric', 'kpi', 'bar', 'ratio', 'data', '指标', 'KPI', '数据'],
    requiredFields: ['items'],
    optionalFields: ['dataPoints', 'heading', 'layout'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 76,
      enterFrames: 16,
      emphasisFrames: 44,
      exitFrames: 16,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'growth',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'data-stream': {
    family: 'data-stream',
    label: 'Data Stream / Live Feed',
    description: 'Scrolling or animated stream of data points with trend indicators.',
    semanticTags: ['data', 'stream', 'live', 'feed', 'realtime', '数据流', '实时', '动态数据'],
    requiredFields: ['items'],
    optionalFields: ['summary', 'dataPoints', 'heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 16,
      emphasisFrames: 48,
      exitFrames: 16,
      staggerFrames: 6,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'zoom-pulse',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  // Alias: resolved from memory-graph -> architecture-map
  'memory-graph': {
    family: 'memory-graph',
    label: 'Memory / Knowledge Graph',
    description: 'Node-graph with a central concept and surrounding related nodes. (Alias for architecture-map)',
    semanticTags: ['graph', 'nodes', 'memory', 'knowledge', 'network', '关系图', '知识图', '节点'],
    requiredFields: ['centerTitle', 'nodes'],
    optionalFields: ['centerDetail', 'layout', 'items', 'heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 82,
      enterFrames: 18,
      emphasisFrames: 48,
      exitFrames: 16,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'drift',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  // Alias: resolved from pipeline-flow -> step-flow
  'pipeline-flow': {
    family: 'pipeline-flow',
    label: 'Pipeline Flow',
    description: 'Horizontal or vertical pipeline with labelled stages. Used for process illustration. (Alias for step-flow)',
    semanticTags: ['pipeline', 'flow', 'stage', 'process', 'pipeline', '流程', '管道', '阶段'],
    requiredFields: ['steps'],
    optionalFields: ['items', 'variant', 'stepVariants', 'heading', 'summary'],
    defaultAccent: 'cyan',
    // Uses step-flow's timing config
    timing: {
      baseDurationFrames: 84,
      enterFrames: 16,
      emphasisFrames: 52,
      exitFrames: 16,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'pan-y',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'benchmark-chart': {
    family: 'benchmark-chart',
    label: 'Benchmark Chart',
    description: 'Dual-bar benchmark comparison between primary and secondary candidates.',
    semanticTags: ['benchmark', 'chart', 'comparison', 'dual-bar', 'performance', '基准', '对比图'],
    requiredFields: ['items'],
    optionalFields: ['primaryLabel', 'secondaryLabel', 'dataPoints', 'heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 82,
      enterFrames: 16,
      emphasisFrames: 50,
      exitFrames: 16,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: null,
  },

  'quote-highlight': {
    family: 'quote-highlight',
    label: 'Quote Highlight',
    description: 'Large-format pull quote with optional attribution. Used for key statements.',
    semanticTags: ['quote', 'highlight', 'statement', 'attribution', '引用', '金句', '语录'],
    requiredFields: ['quote'],
    optionalFields: ['attribution', 'tags', 'heading', 'visualProps'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 70,
      enterFrames: 16,
      emphasisFrames: 38,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showIconOrbit: false},
  },

  'glossary-term': {
    family: 'glossary-term',
    label: 'Glossary Term',
    description: 'Definition card for a single term or concept. Used for explainers.',
    semanticTags: ['glossary', 'term', 'definition', 'explain', '概念', '术语', '定义'],
    requiredFields: ['term', 'definition'],
    optionalFields: ['heading', 'visualProps'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 68,
      enterFrames: 14,
      emphasisFrames: 38,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showIconOrbit: false},
  },

  cta: {
    family: 'cta',
    label: 'Call to Action',
    description: 'Closing CTA screen with title and optional action label.',
    semanticTags: ['cta', 'closing', 'call-to-action', 'end', 'action', '收尾', '号召', '结束'],
    requiredFields: ['heading'],
    optionalFields: ['subtitle', 'badge'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 72,
      enterFrames: 16,
      emphasisFrames: 40,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'push-in',
    },
    defaultTransition: {preset: 'lift', durationInFrames: 16},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  // ── Minimal (抖音风格) 家族 ────────────────────────────────
  'minimal-hero': {
    family: 'minimal-hero',
    label: 'Minimal Hero',
    description: '极简大标题，纯黑背景 + 居中文字，无装饰。抖音风格开场。',
    semanticTags: ['minimal', 'hero', 'title', '抖音', '开场', '极简'],
    requiredFields: ['title'],
    optionalFields: ['subtitle', 'kicker', 'lines'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 20,
      emphasisFrames: 50,
      exitFrames: 20,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'minimal-step-flow': {
    family: 'minimal-step-flow',
    label: 'Minimal Step Flow',
    description: '极简步骤流，每步一行文字逐行淡入。抖音风格。',
    semanticTags: ['minimal', 'step', 'flow', '抖音', '步骤', '极简'],
    requiredFields: ['steps'],
    optionalFields: ['heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 120,
      enterFrames: 20,
      emphasisFrames: 70,
      exitFrames: 20,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'minimal-tag-matrix': {
    family: 'minimal-tag-matrix',
    label: 'Minimal Tag Matrix',
    description: '极简标签矩阵，标签逐个弹入。抖音风格。',
    semanticTags: ['minimal', 'tag', 'matrix', '抖音', '标签', '极简'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 100,
      enterFrames: 18,
      emphasisFrames: 60,
      exitFrames: 18,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'minimal-number-strip': {
    family: 'minimal-number-strip',
    label: 'Minimal Number Strip',
    description: '极简大数字展示，数字递增动画。抖音风格。',
    semanticTags: ['minimal', 'number', 'data', '抖音', '数字', '极简'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 18,
      emphasisFrames: 52,
      exitFrames: 18,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'minimal-timeline': {
    family: 'minimal-timeline',
    label: 'Minimal Timeline',
    description: '极简时间线，时间节点逐个出现。抖音风格。',
    semanticTags: ['minimal', 'timeline', 'time', '抖音', '时间线', '极简'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 120,
      enterFrames: 20,
      emphasisFrames: 70,
      exitFrames: 20,
      staggerFrames: 12,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'minimal-compare-board': {
    family: 'minimal-compare-board',
    label: 'Minimal Compare Board',
    description: '极简对比，左右文字对比。抖音风格。',
    semanticTags: ['minimal', 'compare', '抖音', '对比', '极简'],
    requiredFields: ['left', 'right'],
    optionalFields: ['heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 100,
      enterFrames: 18,
      emphasisFrames: 58,
      exitFrames: 18,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  // ── Spoken (口播驱动模式) ────────────────
  'spoken-title': {
    family: 'spoken-title',
    label: 'Spoken Title',
    description: '口播驱动大标题，逐字淡入。',
    semanticTags: ['spoken', 'title', '口播', '大标题'],
    requiredFields: ['title'],
    optionalFields: ['subtitle', 'kicker'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 16,
      emphasisFrames: 50,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-metric': {
    family: 'spoken-metric',
    label: 'Spoken Metric',
    description: '口播驱动数字递增动画。',
    semanticTags: ['spoken', 'metric', 'number', 'data', '口播', '数字'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 14,
      emphasisFrames: 46,
      exitFrames: 14,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-process': {
    family: 'spoken-process',
    label: 'Spoken Process',
    description: '口播驱动横向步骤条。',
    semanticTags: ['spoken', 'process', 'step', '口播', '步骤'],
    requiredFields: ['steps'],
    optionalFields: [],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 110,
      enterFrames: 18,
      emphasisFrames: 70,
      exitFrames: 18,
      staggerFrames: 10,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-ranking': {
    family: 'spoken-ranking',
    label: 'Spoken Ranking',
    description: '口播驱动榜单排名。',
    semanticTags: ['spoken', 'ranking', 'top', '口播', '排名'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 14,
      emphasisFrames: 46,
      exitFrames: 14,
      staggerFrames: 8,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-compare': {
    family: 'spoken-compare',
    label: 'Spoken Compare',
    description: '口播驱动对比展示。',
    semanticTags: ['spoken', 'compare', '口播', '对比'],
    requiredFields: ['left', 'right'],
    optionalFields: ['heading'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 16,
      emphasisFrames: 54,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'smooth',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-tags': {
    family: 'spoken-tags',
    label: 'Spoken Tags',
    description: '口播驱动标签云。',
    semanticTags: ['spoken', 'tags', '口播', '标签'],
    requiredFields: ['items'],
    optionalFields: ['heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 14,
      emphasisFrames: 46,
      exitFrames: 14,
      staggerFrames: 6,
      easing: 'ease-out',
      springPreset: 'bouncy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-code': {
    family: 'spoken-code',
    label: 'Spoken Code',
    description: '口播驱动代码展示。',
    semanticTags: ['spoken', 'code', '口播', '代码'],
    requiredFields: ['code'],
    optionalFields: ['heading'],
    defaultAccent: 'cyan',
    timing: {
      baseDurationFrames: 80,
      enterFrames: 14,
      emphasisFrames: 46,
      exitFrames: 14,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 12},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  'spoken-takeaway': {
    family: 'spoken-takeaway',
    label: 'Spoken Takeaway',
    description: '口播驱动结论总结。',
    semanticTags: ['spoken', 'takeaway', 'conclusion', '口播', '结论'],
    requiredFields: ['title'],
    optionalFields: ['subtitle'],
    defaultAccent: 'purple',
    timing: {
      baseDurationFrames: 90,
      enterFrames: 16,
      emphasisFrames: 50,
      exitFrames: 16,
      staggerFrames: 0,
      easing: 'ease-out',
      springPreset: 'snappy',
      cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },

  // ── Swiss (Swiss 极简口播 · 反平均审美) ────────────────
  // 一致视觉语言：白底 #fafafa / 黑字 #0a0a0a / Swiss 红 #d63232 accent /
  // Helvetica Neue 左对齐粗网格。禁止紫色渐变、禁止毛玻璃、禁止居中堆叠。
  // stageConfig 全关，family 组件自带白底，不依赖任何舞台外壳。
  'swiss-title': {
    family: 'swiss-title',
    label: 'Swiss Title',
    description: 'Swiss 极简大标题开场，左对齐粗网格。',
    semanticTags: ['swiss', 'minimal', 'title', 'opening', '极简', '开场', '瑞士'],
    requiredFields: ['title'],
    optionalFields: ['kicker', 'subtitle', 'caption'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 180, enterFrames: 18, emphasisFrames: 130, exitFrames: 18,
      staggerFrames: 0, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-question': {
    family: 'swiss-question',
    label: 'Swiss Question',
    description: 'Swiss 极简提问钩子，大字提问 + 划掉的反面。',
    semanticTags: ['swiss', 'question', 'hook', '极简', '提问', '瑞士'],
    requiredFields: ['question'],
    optionalFields: ['crossedOut', 'caption'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 180, enterFrames: 18, emphasisFrames: 120, exitFrames: 18,
      staggerFrames: 0, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-list': {
    family: 'swiss-list',
    label: 'Swiss Numbered List',
    description: 'Swiss 极简编号清单，左对齐竖排，每条编号 + 文本。',
    semanticTags: ['swiss', 'list', 'rules', '极简', '清单', '规则', '瑞士'],
    requiredFields: ['items'],
    optionalFields: ['heading', 'bigNumber'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 240, enterFrames: 18, emphasisFrames: 180, exitFrames: 18,
      staggerFrames: 6, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-compare': {
    family: 'swiss-compare',
    label: 'Swiss Before/After Compare',
    description: 'Swiss 极简左右 before/after 程序化生成对比，左锚定右默认。',
    semanticTags: ['swiss', 'compare', 'before-after', '极简', '对比', '瑞士'],
    requiredFields: ['left', 'right'],
    optionalFields: ['heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 300, enterFrames: 18, emphasisFrames: 240, exitFrames: 18,
      staggerFrames: 0, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-number': {
    family: 'swiss-number',
    label: 'Swiss Big Number',
    description: 'Swiss 极简巨大数字强调，左对齐 + 单位说明。',
    semanticTags: ['swiss', 'number', 'metric', '极简', '数字', '强调', '瑞士'],
    requiredFields: ['number'],
    optionalFields: ['unit', 'caption'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 180, enterFrames: 16, emphasisFrames: 130, exitFrames: 16,
      staggerFrames: 0, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-grid': {
    family: 'swiss-grid',
    label: 'Swiss Tile Grid',
    description: 'Swiss 极简 N 格 tile 网格，支持高亮锚定格。用于审美方向/品牌/统计。',
    semanticTags: ['swiss', 'grid', 'tiles', '极简', '网格', '瑞士'],
    requiredFields: ['tiles'],
    optionalFields: ['heading', 'highlightIndex'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 240, enterFrames: 18, emphasisFrames: 180, exitFrames: 18,
      staggerFrames: 4, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-flow': {
    family: 'swiss-flow',
    label: 'Swiss Flow',
    description: 'Swiss 极简水平流程示意，左→右阶段。',
    semanticTags: ['swiss', 'flow', 'process', '极简', '流程', '瑞士'],
    requiredFields: ['steps'],
    optionalFields: ['heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 240, enterFrames: 18, emphasisFrames: 180, exitFrames: 18,
      staggerFrames: 8, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-tabular': {
    family: 'swiss-tabular',
    label: 'Swiss Design Token Table',
    description: 'Swiss 极简设计系统 token 表（Color/Type/Space/A11y），左对齐表格。',
    semanticTags: ['swiss', 'design-system', 'tokens', 'table', '极简', '设计系统', '表', '瑞士'],
    requiredFields: ['rows'],
    optionalFields: ['heading'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 300, enterFrames: 18, emphasisFrames: 240, exitFrames: 18,
      staggerFrames: 5, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 14},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
  'swiss-stamp': {
    family: 'swiss-stamp',
    label: 'Swiss Closing Stamp',
    description: 'Swiss 极简印章式收尾，大字主张 + 印章标记。',
    semanticTags: ['swiss', 'closing', 'stamp', '极简', '收尾', '印章', '瑞士'],
    requiredFields: ['headline'],
    optionalFields: ['subhead', 'stamp'],
    defaultAccent: 'orange',
    timing: {
      baseDurationFrames: 360, enterFrames: 20, emphasisFrames: 280, exitFrames: 24,
      staggerFrames: 0, easing: 'ease-out', springPreset: 'smooth', cameraMotion: 'none',
    },
    defaultTransition: {preset: 'fade', durationInFrames: 18},
    stageConfig: {showOverlay: false, showMediaCard: false, showIconOrbit: false},
  },
};

const DEFAULT_BACKDROP_CYCLE = ['particle-grid', 'god-rays', 'dot-grid'] as const satisfies readonly BackdropVariant[];

const RHYTHM_CONTRACTS: Record<UltimateSceneFamily, FamilyRhythmContract> = {
  hero: {
    layer: 'context',
    staggerGap: 0,
    revealStiffness: 96,
    preferredCameraMotion: 'push-in',
    backdropCycle: ['god-rays', 'particle-grid', 'dot-grid'],
  },
  'feature-rail': {
    layer: 'emphasis',
    staggerGap: 2,
    revealStiffness: 260,
    backdropCycle: ['particle-grid', 'dot-grid', 'god-rays'],
  },
  focus: {
    layer: 'context',
    staggerGap: 0,
    revealStiffness: 120,
    backdropCycle: ['god-rays', 'dot-grid', 'particle-grid'],
  },
  'number-strip': {
    layer: 'emphasis',
    staggerGap: 4,
    revealStiffness: 300,
    backdropCycle: ['particle-grid', 'god-rays', 'dot-grid'],
  },
  'step-flow': {
    layer: 'structure',
    staggerGap: 6,
    revealStiffness: 150,
    preferredCameraMotion: 'pan-y',
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  timeline: {
    layer: 'structure',
    staggerGap: 6,
    revealStiffness: 140,
    preferredCameraMotion: 'pan-y',
    backdropCycle: ['dot-grid', 'god-rays', 'particle-grid'],
  },
  'compare-board': {
    layer: 'emphasis',
    staggerGap: 6,
    revealStiffness: 240,
    backdropCycle: ['particle-grid', 'dot-grid', 'god-rays'],
  },
  terminal: {
    layer: 'proof',
    staggerGap: 0,
    revealStiffness: 180,
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  'skill-showcase': {
    layer: 'emphasis',
    staggerGap: 8,
    revealStiffness: 140,
    preferredCameraMotion: 'none',
    backdropCycle: ['dot-grid', 'particle-grid'],
  },
  'evidence-wall': {
    layer: 'proof',
    staggerGap: 6,
    revealStiffness: 180,
    backdropCycle: ['dot-grid', 'god-rays', 'particle-grid'],
  },
  'architecture-map': {
    layer: 'structure',
    staggerGap: 10,
    revealStiffness: 110,
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  'tag-matrix': {
    layer: 'structure',
    staggerGap: 6,
    revealStiffness: 170,
    backdropCycle: ['particle-grid', 'dot-grid', 'god-rays'],
  },
  code: {
    layer: 'proof',
    staggerGap: 0,
    revealStiffness: 200,
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  metrics: {
    layer: 'emphasis',
    staggerGap: 6,
    revealStiffness: 320,
    backdropCycle: ['particle-grid', 'god-rays', 'dot-grid'],
  },
  'data-stream': {
    layer: 'emphasis',
    staggerGap: 6,
    revealStiffness: 280,
    preferredCameraMotion: 'zoom-pulse',
    backdropCycle: ['particle-grid', 'dot-grid', 'god-rays'],
  },
  // Alias: resolved from memory-graph -> architecture-map
  'memory-graph': {
    layer: 'structure',
    staggerGap: 10,
    revealStiffness: 110,
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  // Alias: resolved from pipeline-flow -> step-flow
  'pipeline-flow': {
    layer: 'structure',
    staggerGap: 6,
    revealStiffness: 150,
    preferredCameraMotion: 'pan-y',
    backdropCycle: ['dot-grid', 'particle-grid', 'god-rays'],
  },
  'benchmark-chart': {
    layer: 'emphasis',
    staggerGap: 6,
    revealStiffness: 330,
    preferredCameraMotion: 'push-in',
    backdropCycle: ['particle-grid', 'god-rays', 'dot-grid'],
  },
  'quote-highlight': {
    layer: 'context',
    staggerGap: 0,
    revealStiffness: 120,
    backdropCycle: ['god-rays', 'particle-grid', 'dot-grid'],
  },
  'glossary-term': {
    layer: 'context',
    staggerGap: 0,
    revealStiffness: 130,
    backdropCycle: ['dot-grid', 'god-rays', 'particle-grid'],
  },
  cta: {
    layer: 'closing',
    staggerGap: 0,
    revealStiffness: 180,
    preferredCameraMotion: 'push-in',
    backdropCycle: ['god-rays', 'particle-grid', 'dot-grid'],
  },
  // ── Minimal (抖音风格) RHYTHM_CONTRACTS ──────────────────
  'minimal-hero': {
    layer: 'context',
    staggerGap: 0,
    revealStiffness: 96,
    backdropCycle: [],
  },
  'minimal-step-flow': {
    layer: 'structure',
    staggerGap: 10,
    revealStiffness: 120,
    backdropCycle: [],
  },
  'minimal-tag-matrix': {
    layer: 'emphasis',
    staggerGap: 8,
    revealStiffness: 160,
    backdropCycle: [],
  },
  'minimal-number-strip': {
    layer: 'emphasis',
    staggerGap: 12,
    revealStiffness: 140,
    backdropCycle: [],
  },
  'minimal-timeline': {
    layer: 'structure',
    staggerGap: 12,
    revealStiffness: 140,
    backdropCycle: [],
  },
  'minimal-compare-board': {
    layer: 'emphasis',
    staggerGap: 0,
    revealStiffness: 120,
    backdropCycle: [],
  },
  // ── Spoken (口播驱动模式) RHYTHM_CONTRACTS ────────────────
  'spoken-title': { layer: 'context', staggerGap: 0, revealStiffness: 96, backdropCycle: [] },
  'spoken-metric': { layer: 'emphasis', staggerGap: 8, revealStiffness: 100, backdropCycle: [] },
  'spoken-process': { layer: 'structure', staggerGap: 10, revealStiffness: 110, backdropCycle: [] },
  'spoken-ranking': { layer: 'emphasis', staggerGap: 8, revealStiffness: 100, backdropCycle: [] },
  'spoken-compare': { layer: 'structure', staggerGap: 0, revealStiffness: 110, backdropCycle: [] },
  'spoken-tags': { layer: 'emphasis', staggerGap: 6, revealStiffness: 100, backdropCycle: [] },
  'spoken-code': { layer: 'structure', staggerGap: 0, revealStiffness: 96, backdropCycle: [] },
  'spoken-takeaway': { layer: 'closing', staggerGap: 0, revealStiffness: 96, backdropCycle: [] },
  // ── Swiss (Swiss 极简口播) RHYTHM_CONTRACTS ────────────────
  // backdropCycle 全空 — Swiss 白底自带全部背景，不需要舞台 backdrop。
  'swiss-title':    { layer: 'context',  staggerGap: 0, revealStiffness: 96,  backdropCycle: [] },
  'swiss-question': { layer: 'context',  staggerGap: 0, revealStiffness: 110, backdropCycle: [] },
  'swiss-list':     { layer: 'structure', staggerGap: 6, revealStiffness: 120, preferredCameraMotion: 'none', backdropCycle: [] },
  'swiss-compare':  { layer: 'emphasis', staggerGap: 0, revealStiffness: 110, preferredCameraMotion: 'none', backdropCycle: [] },
  'swiss-number':   { layer: 'emphasis', staggerGap: 0, revealStiffness: 100, backdropCycle: [] },
  'swiss-grid':     { layer: 'structure', staggerGap: 4, revealStiffness: 120, preferredCameraMotion: 'none', backdropCycle: [] },
  'swiss-flow':     { layer: 'structure', staggerGap: 8, revealStiffness: 120, preferredCameraMotion: 'none', backdropCycle: [] },
  'swiss-tabular':  { layer: 'proof',     staggerGap: 5, revealStiffness: 120, preferredCameraMotion: 'none', backdropCycle: [] },
  'swiss-stamp':    { layer: 'closing',   staggerGap: 0, revealStiffness: 96,  preferredCameraMotion: 'none', backdropCycle: [] },
};

// ─── Exports ────────────────────────────────────────────────────────────────

export {REGISTRY};

/** All registered family keys. */
export const ALL_FAMILIES = Object.keys(REGISTRY) as UltimateSceneFamily[];

/** Lookup a family entry. Returns undefined for unknown families. */
export function getFamily(family: string): FamilyEntry | undefined {
  return REGISTRY[family as UltimateSceneFamily];
}

/**
 * Resolve the transition for a shot using registry defaults.
 * level overrides family default for transition preset only.
 */
export function resolveTransitionFromRegistry(
  family: UltimateSceneFamily,
  level?: string,
  archetype?: string,
): {preset: UltimateTransitionPreset; durationInFrames: number} {
  const entry = REGISTRY[family];
  if (!entry) return {preset: 'fade', durationInFrames: 14};

  if (archetype && ARCHETYPE_TRANSITIONS[archetype]) {
    return ARCHETYPE_TRANSITIONS[archetype]!;
  }

  const lvl = level?.toLowerCase();
  if (lvl === 'opening' || lvl === 'hook') {
    return {preset: 'lift', durationInFrames: 18};
  }
  if (lvl === 'closing') {
    return {preset: 'lift', durationInFrames: 16};
  }
  return entry.defaultTransition;
}

/**
 * Resolve stage shell config for a family.
 * Returns null if all elements should be visible (backward-compatible default).
 */
export function resolveStageConfigFromRegistry(
  family: UltimateSceneFamily,
): FamilyStageConfig | null {
  const entry = REGISTRY[family];
  const explicit = entry?.stageConfig ?? {};
  const stagePreset = explicit.stagePreset ?? FAMILY_STAGE_PRESET[family] ?? 'data';
  const defaults = STAGE_PRESET_SHELLS[stagePreset];
  return {
    ...defaults,
    ...explicit,
    stagePreset,
    hudMode: explicit.hudMode ?? defaults.hudMode,
  };
}

/**
 * Get default timing config for a family.
 */
export function getDefaultTiming(
  family: UltimateSceneFamily,
): FamilyTimingConfig | undefined {
  return REGISTRY[family]?.timing;
}

/**
 * Get spring preset for a family — maps to motion.ts getSpringConfig().
 */
export function getSpringPreset(family: UltimateSceneFamily): SpringPreset {
  return REGISTRY[family]?.timing.springPreset ?? 'smooth';
}

/**
 * Get camera motion preset for a family — drives CameraDirector.tsx.
 */
export function getCameraMotion(family: UltimateSceneFamily): CameraMotionPreset {
  return REGISTRY[family]?.timing.cameraMotion ?? 'none';
}

export function getRhythmContract(family: string): FamilyRhythmContract {
  return RHYTHM_CONTRACTS[family as UltimateSceneFamily] ?? {
    layer: 'context',
    staggerGap: 6,
    revealStiffness: 160,
    backdropCycle: DEFAULT_BACKDROP_CYCLE,
  };
}

export function getRhythmLayer(family: string): RhythmLayer {
  return getRhythmContract(family).layer;
}

export function getPreferredStaggerGap(family: string): number {
  return getRhythmContract(family).staggerGap;
}

export function getRevealStiffness(family: string): number {
  return getRhythmContract(family).revealStiffness;
}

export function getPreferredCameraMotion(family: string): CameraMotionPreset | undefined {
  return getRhythmContract(family).preferredCameraMotion;
}

export function resolveBackdropVariant(
  family: string,
  sceneIndex: number,
  stagePreset?: UltimateStagePreset,
): BackdropVariant {
  const contract = getRhythmContract(family);
  const presetCycle = stagePreset ? STAGE_BACKDROP_CYCLE[stagePreset] : undefined;
  const cycle = presetCycle && presetCycle.length > 0
    ? presetCycle
    : contract.backdropCycle.length > 0
      ? contract.backdropCycle
      : DEFAULT_BACKDROP_CYCLE;
  const blockIndex = Math.floor(Math.max(0, sceneIndex) / 3);
  const familySeed = Array.from(family).reduce(
    (sum, char, index) => sum + (char.charCodeAt(0) * (index + 1)),
    0,
  );
  return cycle[(blockIndex + familySeed) % cycle.length];
}
