// 视频项目类型定义
// 共享类型：video-gen 生产合同类型
export type { SegmentMeta } from './video-gen';


export type TemplateType = 'caption' | 'split' | 'fullscreen' | 'ultimate';
export type VoiceType = 'chattts' | 'melo' | 'openvoice' | 'xtts' | 'azure';
export type RenderStatus = 'pending' | 'running' | 'done' | 'error';

export interface SubtitleWord {
  word: string;
  startTime: number;
  endTime: number;
}

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: SubtitleWord[];
}

export interface SubtitleTrack {
  cues: SubtitleCue[];
  language: string;
}

export interface VideoRenderConfig {
  projectId: string;
  template: TemplateType;
  script: string;
  voice: VoiceType;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderJob {
  id: string;
  priority: 'low' | 'normal' | 'high';
  config: VideoRenderConfig;
  status: RenderStatus;
  progress: number;
  progressMsg: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: RenderResult;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
  fileSize: number;
  subtitles?: SubtitleTrack;
}

// 组件Props类型
export interface CaptionProps {
  text: string;
  startTime: number;
  endTime: number;
  style?: CaptionStyle;
}

export interface CaptionStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  position?: 'bottom' | 'top' | 'center';
  animation?: 'fade' | 'slide' | 'typewriter';
}

export interface CompositionConfig {
  id: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
}
