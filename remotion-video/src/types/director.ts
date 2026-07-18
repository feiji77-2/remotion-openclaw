/**
 * director.ts — 导演层自适应系数类型定义
 *
 * 定义 AdaptiveIntent / FamilyContext / FamilyDirectorMeta / ArchetypeKey
 * 作为 family 组件与自适应系数系统之间的接口契约。
 *
 * 调用路径：
 *   Storyboard → computeAdaptiveIntent(archetype, context) → AdaptiveIntent
 *   → Family 组件消费 FamilyDirectorMeta.adaptive
 */

// ─── AdaptiveIntent：连续值系数系统 ──────────────────────────────────────────

/**
 * 自适应系数 — 所有值均为相对基线 (1.0 = 中性) 的连续值。
 * family 组件根据这些系数动态调整渲染参数。
 */
export interface AdaptiveIntent {
  /** 密度：控制元素间距与缩放 */
  density: {
    /** 内边距乘数 (< 1 紧凑, > 1 宽松) */
    padding: number;
    /** 元素间距乘数 */
    spacing: number;
    /** 整体缩放乘数 */
    scale: number;
  };
  /** 对比度：控制视觉反差 */
  contrast: {
    /** 字号对比 (大 vs 小) 乘数 */
    sizeRatio: number;
    /** 字重对比 (粗 vs 细) 乘数 */
    weightRatio: number;
    /** 透明度对比乘数 */
    opacityRatio: number;
  };
  /** 能量：控制动画力度与速度 */
  energy: {
    /** 动画持续时间乘数 (> 1 更慢, < 1 更快) */
    duration: number;
    /** 弹性/弹跳幅度乘数 */
    bounce: number;
    /** 总体强度/冲击力乘数 */
    intensity: number;
    /** 峰值出现帧 (可选) */
    peakFrame?: number;
  };
  /** 入场事件：元素如何进入画面 */
  entryEvent: {
    /** 事件类型 (与 DataEventVerb 对齐) */
    type: string;
    /** 元素之间的错帧间隔 (帧数) */
    stagger?: number;
    /** 入场方向 */
    direction?: string;
  };
  /** 视差：背景/前景相对运动 */
  parallax: {
    /** X 轴偏移量 */
    offsetX: number;
    /** Y 轴偏移量 */
    offsetY: number;
    /** 视差缩放 */
    scale: number;
  };
  /** 高亮：记忆物/关键词强调 */
  highlight: {
    /** 高亮颜色 */
    color: string;
    /** 辉光强度 (0 - 1) */
    glowIntensity: number;
    /** 字重 */
    weight: 'bold' | 'normal';
  };
  /** 总持续时间 (秒)，可选覆盖 */
  totalDuration?: number;
}

// ─── FamilyContext：场景上下文 ──────────────────────────────────────────────

/**
 * family 场景上下文 — 用于内容自适应调整。
 * 由 family 组件在渲染时提供。
 */
export interface FamilyContext {
  /** family 标识 */
  familyId: string;
  /** 文本总长度 (字符数) */
  textLength: number;
  /** 单词数量 */
  wordCount: number;
  /** 场景持续时间 (秒) */
  duration: number;
  /** 目标平台 */
  platform: 'tiktok' | 'web' | 'youtube';
  /** 数值字段的最大值长度 (用于数值动画适应) */
  maxValueLength?: number;
  /** label/标签数量 */
  labelCount?: number;
}

// ─── FamilyDirectorMeta：传给 family 组件的导演元数据 ────────────────────────

/**
 * family 组件消费的导演元数据。
 * 由 computeAdaptiveIntent() 计算后注入 family props。
 */
export interface FamilyDirectorMeta {
  /** 自适应系数 */
  adaptive: AdaptiveIntent;
  /** 目标平台 (冗余字段，方便 family 直接消费) */
  platform: string;
}

// ─── ArchetypeKey：镜头原型字面量联合 ────────────────────────────────────────

/**
 * 12 种镜头原型的字面量联合。
 * 与 shotGrammar.ts 中的 ShotArchetype 严格对齐。
 */
export type ArchetypeKey =
  | 'lock-on reveal'
  | 'pressure countdown'
  | 'overtake race'
  | 'evidence pin'
  | 'threshold breach'
  | 'aftershock hold'
  | 'follow focus'
  | 'compress compare'
  | 'drift reveal'
  | 'bullet train'
  | 'burst spread'
  | 'trace flow';
