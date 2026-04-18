/**
 * ContentAnalyzer.ts — 文案 → 分镜 + 口播稿 自动生成
 *
 * 输入: ContentSection[] (纯文案)
 * 输出: ShotPlan[] (带帧时间线和组件props)
 *
 * 策略: 口播稿时长 = 镜头时长，音频驱动视频
 */

import { ContentSection, ShotPlan, ShotType, SectionData, VideoConfig, DEFAULT_CONFIG } from './contentSchema';

const AVG_SPEECH_RATE = 5; // 中文字/秒（正常语速）

// ============ 辅助函数 ============

function estimateDuration(narration: string, extraSec = 0): number {
  const chars = narration.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').length;
  return Math.ceil(chars / AVG_SPEECH_RATE + extraSec);
}

function makeComponentProps(section: ContentSection): Record<string, unknown> {
  const { shotType, data } = section;
  const base = { bgColor: '#0D0D1A', accentColor: '#FF6B35' };

  switch (shotType) {
    case 'title':
      return {
        ...base,
        title: section.narration.split('，')[0] || section.narration,
        subtitle: section.narration.split('，').slice(1).join('，'),
      };
    case 'concept':
      const parts = section.narration.split('，');
      return { ...base, title: parts[0] || section.narration, body: parts.slice(1).join('，'), highlight: section.note };
    case 'bullets':
      return { ...base, title: section.data && 'type' in section.data && section.data.type === 'bullets' ? section.title : section.title, points: section.data && 'type' in section.data && section.data.type === 'bullets' ? section.data.items : [section.narration] };
    case 'flowchart':
      return { ...base, steps: section.data && 'type' in section.data && section.data.type === 'flowchart' ? section.data.steps : [] };
    case 'terminal':
      return {
        ...base,
        title: 'video-gen',
        code: `video-gen generate --prompt '${section.title}'`,
        outputLines: ['> Analyzing...', '> Rendering complete.'],
        prompt: '>>>',
      };
    case 'scenegrid':
      return {
        ...base,
        items: section.data && 'type' in section.data && section.data.type === 'scenegrid' ? section.data.items : [],
        cols: section.data && 'type' in section.data && section.data.type === 'scenegrid' ? (section.data.cols ?? 5) : 5,
        rows: section.data && 'type' in section.data && section.data.type === 'scenegrid' ? (section.data.rows ?? 5) : 5,
      };
    case 'countup':
      return {
        ...base,
        value: section.data && 'type' in section.data && section.data.type === 'countup' ? section.data.value : 0,
        label: section.data && 'type' in section.data && section.data.type === 'countup' ? section.data.label : section.title,
      };
    case 'dialog':
      return {
        ...base,
        messages: section.data && 'type' in section.data && section.data.type === 'dialog' ? section.data.messages : [],
        userColor: '#FF6B35',
        assistantColor: '#00BCD4',
      };
    case 'wordcloud':
      return {
        ...base,
        words: section.data && 'type' in section.data && section.data.type === 'wordcloud' ? section.data.words : [],
      };
    case 'cta':
      return { ...base, mainText: section.narration.split('，')[0], subText: section.narration.split('，').slice(1).join('，'), ctaText: '开始使用 →' };
    default:
      return { ...base, text: section.narration };
  }
}

// ============ 核心函数 ============

/**
 * analyzeContent — 将文案章节转换为分镜计划
 * @param sections 文案章节数组（顺序即为视频顺序）
 * @param config 视频配置
 * @returns 带帧时间线的完整分镜计划
 */
export function analyzeContent(
  sections: ContentSection[],
  config: Partial<VideoConfig> = {}
): { shots: ShotPlan[]; totalFrames: number; totalSeconds: number; timeline: TimelineEntry[] } {
  const fps = config.fps ?? DEFAULT_CONFIG.fps;
  let currentFrame = 0;

  const shots: ShotPlan[] = sections.map((section, index) => {
    const narrationDuration = estimateDuration(section.narration);
    // 每个镜头预留 口播时长 + 0.5s 留白（视觉过渡）
    const durationSec = narrationDuration + 0.5;
    const durationFrames = Math.ceil(durationSec * fps);

    const shot: ShotPlan = {
      id: `shot_${index}`,
      shotType: section.shotType,
      startFrame: currentFrame,
      durationFrames,
      narrationDuration,
      narration: section.narration,
      data: section.data ?? { type: 'none' },
      componentProps: makeComponentProps(section),
    };

    currentFrame += durationFrames;
    return shot;
  });

  const totalSeconds = currentFrame / fps;
  const totalFrames = currentFrame;

  // 生成可读时间线
  const timeline = shots.map(s => ({
    id: s.id,
    shotType: s.shotType,
    startFrame: s.startFrame,
    durationFrames: s.durationFrames,
    durationSec: s.durationFrames / fps,
    narration: s.narration.slice(0, 40) + (s.narration.length > 40 ? '...' : ''),
  }));

  return { shots, totalFrames, totalSeconds, timeline };
}

export interface TimelineEntry {
  id: string;
  shotType: string;
  startFrame: number;
  durationFrames: number;
  durationSec: number;
  narration: string;
}
