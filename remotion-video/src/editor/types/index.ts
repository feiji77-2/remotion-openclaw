/**
 * Timeline 数据模型 — 参照 designcombo/react-video-editor
 * 适配 OpenClaw 视频流水线场景
 */

// ============ 基础类型 ============

export type Ratio = number;

export interface ISize {
  width: number;
  height: number;
}

export interface IPosition {
  x: number;
  y: number;
}

export interface ITrim {
  from: number;
  to: number;
}

export interface IDisplay {
  from: number;
  duration: number;
}

export interface IBoxShadow {
  color: string;
  x: number;
  y: number;
  blur: number;
}

export interface ITransform {
  rotate?: string;
  scale?: number | string;
  translateX?: number;
  translateY?: number;
  skewX?: number;
  skewY?: number;
  flipX?: boolean;
  flipY?: boolean;
}

// ============ 轨道项目类型 ============

export type TrackItemType =
  | 'video'
  | 'audio'
  | 'image'
  | 'text'
  | 'caption'
  | 'voiceover'
  | 'sfx'
  | 'composition';

export type TrackType =
  | 'video'
  | 'audio'
  | 'caption'
  | 'text'
  | 'main'
  | 'voiceover'
  | 'sfx';

// ============ 视频项目详情 ============

export interface VideoTrackItemDetails {
  type: 'video';
  src: string;
  url?: string;
  width: number;
  height: number;
  opacity: number;
  volume: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow: IBoxShadow;
  top: string;
  left: string;
  transform: string;
  blur: number;
  brightness: number;
  flipX: boolean;
  flipY: boolean;
  rotate: string;
  visibility: 'visible' | 'hidden';
  trim: ITrim;
  playbackRate: number;
  display: IDisplay;
  duration: number;
  isMain: boolean;
}

// ============ 字幕项目详情 ============

export interface CaptionWord {
  word: string;
  start: number; // 帧
  end: number;    // 帧
  confidence: number;
  is_keyword: boolean;
}

export interface CaptionTrackItemDetails {
  type: 'caption';
  appearedColor: string;
  activeColor: string;
  activeFillColor: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontUrl?: string;
  textAlign: 'left' | 'center' | 'right';
  linesPerCaption: number;
  words: CaptionWord[];
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  lineHeight: string;
  letterSpacing: string;
  wordSpacing: string;
  border: string;
  textShadow: string;
  opacity: number;
  wordWrap: string;
  wordBreak: string;
  WebkitTextStrokeColor: string;
  WebkitTextStrokeWidth: string;
  top: string;
  left: string;
  transform: string;
  skewX: number;
  skewY: number;
  height: number;
  boxShadow: IBoxShadow;
  blur: number;
  brightness: number;
  flipX: boolean;
  flipY: boolean;
  rotate: string;
  visibility: 'visible' | 'hidden';
  trim: ITrim;
  display: IDisplay;
  duration: number;
  // SRT 原始数据（我们的扩展）
  srtData?: string;
}

// ============ 文字项目详情 ============

export interface TextTrackItemDetails {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontUrl?: string;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  opacity: number;
  top: string;
  left: string;
  transform: string;
  width: number;
  height: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow: IBoxShadow;
  blur: number;
  brightness: number;
  flipX: boolean;
  flipY: boolean;
  rotate: string;
  visibility: 'visible' | 'hidden';
  trim: ITrim;
  display: IDisplay;
  duration: number;
}

// ============ 配音/音频项目详情 ============

export interface AudioTrackItemDetails {
  type: 'audio' | 'voiceover' | 'sfx';
  src: string;
  url?: string;
  name: string;
  volume: number;
  opacity: number;
  trim: ITrim;
  display: IDisplay;
  duration: number;
  playbackRate: number;
  fadeIn?: number;
  fadeOut?: number;
  // 语音合成参数（我们的扩展）
  scriptText?: string;
  voiceId?: string;
  speed?: number;
}

// ============ 图片项目详情 ============

export interface ImageTrackItemDetails {
  type: 'image';
  src: string;
  url?: string;
  width: number;
  height: number;
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow: IBoxShadow;
  top: string;
  left: string;
  transform: string;
  blur: number;
  brightness: number;
  flipX: boolean;
  flipY: boolean;
  rotate: string;
  visibility: 'visible' | 'hidden';
  trim: ITrim;
  display: IDisplay;
  duration: number;
}

export type TrackItemDetails =
  | VideoTrackItemDetails
  | CaptionTrackItemDetails
  | TextTrackItemDetails
  | AudioTrackItemDetails
  | ImageTrackItemDetails;

// ============ 轨道项目（核心单元）============

export interface ITrackItem {
  id: string;
  name: string;
  type: TrackItemType;
  details: TrackItemDetails;
  start: number;   // 在 timeline 上的起始帧
  duration: number; // 持续帧数
  trackId: string;  // 所属轨道 ID
}

// ============ 轨道 ============

export interface ITrack {
  id: string;
  name: string;
  type: TrackType;
  items: string[]; // 子项目 ID 列表（按顺序）
  accepts: TrackItemType[];
  magnetic: boolean; // 是否吸附相邻项目
  static: boolean;  // 是否锁定
  height?: number; // 轨道高度（px）
  muted?: boolean;  // 静音
  locked?: boolean;  // 锁定
}

// ============ 转场 ============

export interface ITransition {
  id: string;
  type: string;
  name: string;
  duration: number; // 转场持续帧数
  fromItemId: string;
  toItemId: string;
}

// ============ 分镜（场景）============

export interface IScene {
  id: string;
  name: string;
  duration: number;
  thumbnail?: string;
}

// ============ 视频项目（根对象）============

export interface IBackground {
  type: 'color' | 'image';
  value: string; // 颜色 hex 或图片 URL
}

export interface IDesign {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  duration: number;     // 总时长（帧）
  tracks: ITrack[];
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
  transitionsMap: Record<string, ITransition>;
  background: IBackground;
  createdAt?: string;
  updatedAt?: string;
}

// ============ 时间线缩放状态 ============

export interface ITimelineScaleState {
  index: number;      // 当前缩放级别索引
  unit: number;       // 每单位宽度（px）
  zoom: number;       // 缩放比例
  segments: number;   // 分段数
}

export interface ITimelineScrollState {
  left: number;
  top: number;
}

// ============ 渲染任务 ============

export interface IRenderJob {
  id: string;
  design: IDesign;
  outputFormat: 'mp4' | 'json';
  quality: 'low' | 'medium' | 'high';
  template?: 'caption' | 'split' | 'fullscreen';
  webhookUrl?: string;
}
