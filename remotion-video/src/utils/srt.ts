// SRT 字幕文件解析和生成工具

import type { SubtitleTrack, SubtitleCue, SubtitleWord } from '../types';

/**
 * 解析 SRT 文件内容为 SubtitleTrack
 */
export function parseSRT(srtContent: string): SubtitleTrack {
  const cues: SubtitleCue[] = [];
  const blocks = srtContent.trim().split(/\n\n+/);
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    const id = lines[0].trim();
    const timeLine = lines[1].trim();
    const textLines = lines.slice(2);
    const text = textLines.join('\n').trim();
    
    const [startTime, endTime] = parseTimeLine(timeLine);
    
    cues.push({
      id,
      startTime,
      endTime,
      text,
    });
  }
  
  return {
    cues,
    language: 'zh-CN',
  };
}

/**
 * 解析时间行 (00:00:00,000 --> 00:00:00,000)
 */
function parseTimeLine(timeLine: string): [number, number] {
  const match = timeLine.match(
    /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
  );
  
  if (!match) {
    console.warn('Invalid time line format:', timeLine);
    return [0, 0];
  }
  
  const [, sh, sm, ss, sms, eh, em, es, ems] = match;
  
  const startTime = 
    parseInt(sh) * 3600 +
    parseInt(sm) * 60 +
    parseInt(ss) +
    parseInt(sms) / 1000;
    
  const endTime = 
    parseInt(eh) * 3600 +
    parseInt(em) * 60 +
    parseInt(es) +
    parseInt(ems) / 1000;
    
  return [startTime, endTime];
}

/**
 * 生成 SRT 格式内容
 */
export function generateSRT(track: SubtitleTrack): string {
  return track.cues
    .map((cue, index) => {
      const startTime = formatTime(cue.startTime);
      const endTime = formatTime(cue.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${cue.text}`;
    })
    .join('\n\n');
}

/**
 * 格式化时间为 SRT 格式
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/**
 * 补零
 */
function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

/**
 * 将帧数转换为秒数
 */
export function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps;
}

/**
 * 将秒数转换为帧数
 */
export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps);
}

/**
 * 根据当前时间获取当前字幕
 */
export function getCurrentCue(
  track: SubtitleTrack,
  currentTime: number
): SubtitleCue | null {
  return track.cues.find(
    cue => currentTime >= cue.startTime && currentTime <= cue.endTime
  ) || null;
}

/**
 * 创建简单的占位字幕（用于测试）
 */
export function createPlaceholderTrack(durationSeconds: number): SubtitleTrack {
  const cues: SubtitleCue[] = [];
  const cueDuration = 3; // 每条字幕3秒
  const texts = [
    '这是第一条字幕',
    '这里是第二条字幕',
    '现在播放的是第三条',
    '最后一条字幕信息',
  ];
  
  let currentTime = 0;
  let cueIndex = 0;
  
  while (currentTime < durationSeconds && cueIndex < texts.length) {
    cues.push({
      id: String(cueIndex + 1),
      startTime: currentTime,
      endTime: Math.min(currentTime + cueDuration, durationSeconds),
      text: texts[cueIndex],
    });
    
    currentTime += cueDuration;
    cueIndex++;
  }
  
  return { cues, language: 'zh-CN' };
}
