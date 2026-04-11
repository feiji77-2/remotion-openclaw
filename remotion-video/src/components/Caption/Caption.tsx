// 字幕组件 - 支持多种样式和动画

import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import type { CaptionStyle, SubtitleCue } from '../../types';
import { ColorPalette, hexToRgba } from '../../utils/colors';

export interface CaptionProps {
  cue: SubtitleCue;
  style?: CaptionStyle;
  animation?: 'fade' | 'slide' | 'typewriter' | 'none';
}

/**
 * 字幕组件
 * 支持淡入淡出、滑入、打字机动画
 */
export const Caption: React.FC<CaptionProps> = ({
  cue,
  style = {},
  animation = 'fade',
}) => {
  const frame = useCurrentFrame();
  
  const {
    fontSize = 48,
    fontFamily = 'Arial, sans-serif',
    color = ColorPalette.subtitle.default,
    backgroundColor = hexToRgba('#000000', 0.6),
    position = 'bottom',
    animation: animType = animation,
  } = style;
  
  // 计算动画
  const getAnimatedStyle = () => {
    const duration = 15; // 动画持续帧数
    const startFrame = cue.startTime * 30; // 假设30fps
    const endFrame = cue.endTime * 30;
    const relativeFrame = frame - startFrame;
    
    // 透明度
    let opacity = 1;
    if (animType === 'fade') {
      if (relativeFrame < duration) {
        opacity = interpolate(relativeFrame, [0, duration], [0, 1]);
      }
      if (frame > endFrame - duration) {
        opacity = interpolate(frame, [endFrame - duration, endFrame], [1, 0]);
      }
    }
    
    // Y轴偏移（用于滑入动画）
    let translateY = 0;
    if (animType === 'slide') {
      if (relativeFrame < duration) {
        translateY = interpolate(relativeFrame, [0, duration], [30, 0]);
      }
    }
    
    return { opacity, translateY };
  };
  
  const { opacity, translateY } = getAnimatedStyle();
  
  // 位置计算
  const getPositionStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: '10%',
      right: '10%',
      textAlign: 'center',
      fontSize,
      fontFamily,
      color,
      backgroundColor,
      padding: '12px 24px',
      borderRadius: '8px',
      opacity,
    };
    
    switch (position) {
      case 'top':
        return { ...baseStyle, top: '10%' };
      case 'center':
        return { ...baseStyle, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom':
      default:
        return { ...baseStyle, bottom: '15%' };
    }
  };
  
  return (
    <div
      style={{
        ...getPositionStyle(),
        transform: `translateY(${translateY}px)`,
      }}
    >
      {cue.text}
    </div>
  );
};

/**
 * 多行字幕组件
 * 用于需要同时显示多行字幕的场景
 */
export interface MultiLineCaptionProps {
  cues: SubtitleCue[];
  currentTime: number;
  style?: CaptionStyle;
}

export const MultiLineCaption: React.FC<MultiLineCaptionProps> = ({
  cues,
  currentTime,
  style = {},
}) => {
  // 找到当前时间的字幕
  const currentCue = cues.find(
    (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
  );
  
  if (!currentCue) return null;
  
  return <Caption cue={currentCue} style={style} />;
};

/**
 * 卡拉OK风格字幕
 * 逐字高亮显示
 */
export interface KaraokeCaptionProps {
  cue: SubtitleCue;
  style?: CaptionStyle;
}

export const KaraokeCaption: React.FC<KaraokeCaptionProps> = ({
  cue,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { color = ColorPalette.subtitle.default } = style;
  
  const duration = cue.endTime - cue.startTime;
  const progress = Math.min(1, Math.max(0, (frame / 30 - cue.startTime) / duration));
  
  const chars = cue.text.split('');
  const highlightIndex = Math.floor(chars.length * progress);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: '10%',
        right: '10%',
        bottom: '15%',
        textAlign: 'center',
        fontSize: style.fontSize || 48,
        fontFamily: style.fontFamily || 'Arial, sans-serif',
        color: hexToRgba(color, 0.3),
        backgroundColor: hexToRgba('#000000', 0.6),
        padding: '12px 24px',
        borderRadius: '8px',
      }}
    >
      {chars.map((char, index) => (
        <span
          key={index}
          style={{
            color: index <= highlightIndex ? color : hexToRgba(color, 0.3),
            transition: 'color 0.05s',
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};
