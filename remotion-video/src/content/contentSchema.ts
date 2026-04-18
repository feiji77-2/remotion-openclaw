/**
 * contentSchema.ts — 视频内容结构定义
 *
 * 流程：contentSchema.Content → ContentAnalyzer → ShotPlan[]
 * ShotPlan[] → NarrationGenerator → Video1.tsx + 音频
 */

// ============ 内容定义 ============

export interface ContentSection {
  /** 章节标题 */
  title: string;
  /** 核心文案（口播原文） */
  narration: string;
  /** 视觉呈现方式 */
  shotType: ShotType;
  /** 额外数据（bullet列表/flowchart步骤/dialog消息等） */
  data?: SectionData;
  /** 备注 */
  note?: string;
}

export type SectionData =
  | { type: 'bullets'; items: string[] }
  | { type: 'flowchart'; steps: { label: string; icon?: string; desc?: string }[] }
  | { type: 'dialog'; messages: { role: 'user' | 'assistant'; content: string }[] }
  | { type: 'scenegrid'; items: string[]; cols?: number; rows?: number }
  | { type: 'countup'; value: number; label: string }
  | { type: 'wordcloud'; words: { text: string; weight: number }[] }
  | { type: 'data'; value: string }
  | { type: 'none' };

// ============ 分镜规划 ============

export type ShotType =
  | 'title'      // 封面大标题
  | 'concept'    // 概念说明
  | 'bullets'    // 要点列表
  | 'flowchart'  // 流程图
  | 'terminal'   // 终端演示
  | 'scenegrid'  // 场景网格
  | 'countup'    // 数字滚动
  | 'dialog'     // 对话演示
  | 'stats'      // 统计面板
  | 'timeline'   // 时间线
  | 'wordcloud'  // 词云
  | 'cta';       // 结束CTA

export interface ShotPlan {
  /** 镜头ID */
  id: string;
  /** 镜头类型 */
  shotType: ShotType;
  /** 开始帧 */
  startFrame: number;
  /** 持续帧数（初步估算） */
  durationFrames: number;
  /** 实际口播时长（秒） */
  narrationDuration: number;
  /** 口播文案 */
  narration: string;
  /** 视觉数据 */
  data: SectionData;
  /** 组件props（自动填充） */
  componentProps: Record<string, unknown>;
}

// ============ 视频配置 ============

export interface VideoConfig {
  fps: number;
  width: number;
  height: number;
  bgColor: string;
  accentColor: string;
}

export const DEFAULT_CONFIG: VideoConfig = {
  fps: 30,
  width: 1080,
  height: 1920,
  bgColor: '#0D0D1A',
  accentColor: '#FF6B35',
};
