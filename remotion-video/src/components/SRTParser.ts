/**
 * SRT 字幕文件解析器
 * SRT → 帧时间轴格式，供 SubtitleOverlay 使用
 *
 * 用法：
 *   import { parseSRT, findActiveSubtitle } from './components/SRTParser';
 *   const chunks = parseSRT(srtContent, fps);
 *   const active = findActiveSubtitle(chunks, currentFrame);
 */

export type SRTSubtitle = {
  index: number;
  startMs: number;   // 开始时间（毫秒）
  endMs: number;     // 结束时间（毫秒）
  startFrame: number; // 开始帧
  endFrame: number;  // 结束帧
  text: string;      // 字幕文本（可能含换行）
};

/**
 * 解析 SRT 文本内容为帧时间轴格式
 * @param srtContent SRT 文件原始内容
 * @param fps 每秒帧数
 */
export function parseSRT(srtContent: string, fps: number): SRTSubtitle[] {
  const blocks = srtContent.trim().split(/\n\n+/);
  const subtitles: SRTSubtitle[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // 第1行：序号
    const indexLine = lines[0].trim();
    const index = parseInt(indexLine, 10);
    if (isNaN(index)) continue;

    // 第2行：时间轴
    // 格式：00:00:01,500 --> 00:00:03,200
    const timeLine = lines[1].trim();
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const startMs =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);

    const endMs =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    // 第3行开始：字幕文本
    const text = lines.slice(2).join('\n').replace(/<[^>]+>/g, '').trim();
    if (!text) continue;

    subtitles.push({
      index,
      startMs,
      endMs,
      startFrame: Math.round((startMs / 1000) * fps),
      endFrame: Math.round((endMs / 1000) * fps),
      text,
    });
  }

  return subtitles;
}

/**
 * 根据当前帧查找当前字幕块
 */
export function findActiveSubtitle(subtitles: SRTSubtitle[], frame: number): SRTSubtitle | null {
  for (const sub of subtitles) {
    if (frame >= sub.startFrame && frame < sub.endFrame) {
      return sub;
    }
  }
  return null;
}

/**
 * 将普通文本转为简单的字幕块（用于没有SRT时的回退）
 * @param text 完整文本
 * @param durationFrames 总帧数
 * @param fps 帧率
 */
export function textToFallbackSubtitles(
  text: string,
  durationFrames: number,
  fps: number,
  chunkSize = 15 // 每多少个字一个字幕块
): SRTSubtitle[] {
  const chars = text.replace(/\s+/g, '');
  const chunks: SRTSubtitle[] = [];
  const totalChars = chars.length;
  const framesPerChar = durationFrames / Math.max(totalChars, 1);
  const framesPerChunk = framesPerChar * chunkSize;

  let offset = 0;
  let index = 1;

  while (offset < chars.length) {
    const chunkText = chars.slice(offset, offset + chunkSize);
    const startFrame = Math.round((offset / chunkSize) * framesPerChunk);
    const endFrame =
      index * framesPerChunk > durationFrames
        ? durationFrames
        : Math.round(((offset + chunkSize) / chunkSize) * framesPerChunk);

    chunks.push({
      index,
      startMs: Math.round((startFrame / fps) * 1000),
      endMs: Math.round((endFrame / fps) * 1000),
      startFrame,
      endFrame,
      text: chunkText,
    });

    offset += chunkSize;
    index++;
  }

  return chunks;
}
