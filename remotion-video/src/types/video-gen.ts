/**
 * types.ts — 视频项目共享类型定义
 */

export interface SegmentMeta {
  id: string;
  start: number;          // 起始帧
  frames: number;         // 持续帧数
  dur: number;            // 持续秒数
  shotType: string;       // 镜头类型
  text: string;           // 原始文本（口播稿）
}

export interface SubtitleLine {
  id: string;
  start: number;          // 相对起始秒数
  end: number;            // 相对结束秒数
  text: string;
}

export interface ShotSubtitles {
  chunks: Array<{
    chunk_id: string;
    subtitles: SubtitleLine[];
  }>;
}
