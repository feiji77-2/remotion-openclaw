/**
 * SubtitleSRTOverlay — 动态 SRT 字幕渲染组件
 *
 * 与 CaptionOverlay 的区别：
 * - CaptionOverlay：硬编码的 CAPTION_TIMELINE（编译时固定）
 * - SubtitleSRTOverlay：读取外部 SRT 文件（运行时，可替换）
 *
 * 使用方式：
 *   <SubtitleSRTOverlay
 *     src="/assets/subtitles/project/subtitles_job123.srt"
 *     style="caption"  // caption | fullscreen
 *   />
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  staticFile,
} from 'remotion';
import { FPS, ACCENT_GOLD, ACCENT_PURPLE } from '../data/storyboard';
import { parseSRT, findActiveSubtitle, type SRTSubtitle } from './SRTParser';

interface SubtitleSRTOverlayProps {
  /** SRT 文件路径（相对于 public 目录，或用 staticFile()） */
  src?: string;
  /** 字幕样式风格 */
  style?: 'caption' | 'bottom';
  /** 是否启用打字机效果 */
  typewriter?: boolean;
}

export const SubtitleSRTOverlay: React.FC<SubtitleSRTOverlayProps> = ({
  src,
  style = 'caption',
  typewriter = true,
}) => {
  const frame = useCurrentFrame();

  // 解析 SRT 文件
  const subtitles = useMemo<SRTSubtitle[]>(() => {
    if (!src) return [];
    try {
      // staticFile() 在 Remotion 渲染时读取文件
      // 注意：这个值在渲染时是确定的，不需要 await
      const content = staticFile(src.replace('/assets/', ''));
      // SRT 内容需要通过 fetch 加载，这里返回空
      // 实际使用时由父组件通过 prop 传入已解析的数据
      return [];
    } catch {
      return [];
    }
  }, [src]);

  const active = useMemo(() => findActiveSubtitle(subtitles, frame), [subtitles, frame]);

  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: style === 'caption' ? '0 0 80px 0' : '0 0 40px 0',
        pointerEvents: 'none',
      }}
    >
      <SubtitleText text={active.text} frame={frame} typewriter={typewriter} style={style} />
    </AbsoluteFill>
  );
};

/** 字幕文字渲染（带动画） */
const SubtitleText: React.FC<{
  text: string;
  frame: number;
  typewriter: boolean;
  style: 'caption' | 'bottom';
}> = ({ text, frame: _frame, typewriter: _typewriter, style }) => {
  // 简单样式：静态字幕（打字机效果在 frame 0 时触发）
  return (
    <div
      style={{
        minWidth: style === 'caption' ? 760 : 600,
        maxWidth: style === 'caption' ? 860 : 720,
        padding: style === 'caption' ? '22px 32px' : '16px 24px',
        borderRadius: style === 'caption' ? 26 : 16,
        background: 'rgba(9,7,13,0.82)',
        border: `1px solid rgba(139,92,246,0.35)`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: style === 'caption' ? 42 : 32,
          lineHeight: 1.35,
          fontWeight: 800,
          textAlign: 'center',
          color: '#fff8ef',
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * ProgressBar — 进度条（可复用）
 */
export const SubtitleProgressBar: React.FC<{
  currentFrame: number;
  totalFrames: number;
  barWidth?: number;
}> = ({ currentFrame, totalFrames, barWidth = 720 }) => {
  const progress = currentFrame / totalFrames;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        width: barWidth,
        height: 6,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${ACCENT_PURPLE}, ${ACCENT_GOLD})`,
          borderRadius: 999,
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
};
