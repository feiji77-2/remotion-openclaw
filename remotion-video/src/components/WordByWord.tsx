/**
 * WordByWord.tsx — TikTok逐字字幕组件
 * 每词单独显示，配合语音节奏
 */

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolate, spring } from 'remotion';
import type { CSSProperties } from 'react';

interface WordByWordProps {
  text: string;
  fontSize?: number;
  color?: string;
  accentColor?: string;
  highlightWords?: string[]; // 需要高亮的词
  startFrame?: number;
  framesPerWord?: number;
  wrapperStyle?: CSSProperties;
  trackStyle?: CSSProperties;
  inactiveOpacity?: number;
  baseTextShadow?: string;
}

const WordByWord: React.FC<WordByWordProps> = ({
  text,
  fontSize = 38,
  color = '#FFFFFF',
  accentColor = '#00d4ff',
  highlightWords = [],
  startFrame = 0,
  framesPerWord,
  wrapperStyle,
  trackStyle,
  inactiveOpacity = 0.3,
  baseTextShadow = '0 2px 18px rgba(0,0,0,0.58)',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 中文分词：按标点+相邻中文字符数切分phrase
  // 每段约 8-12 字，保证每个phrase单独高亮，模拟逐字效果
  const words = useMemo(() => {
    if (!text) return [];
    // 先按标点和空格分割
    const raw = text.split(/([，。！？、；：""''（）【】《》…—～·,!?;:()\[\].<>。])/);
    const tokens = [];
    let buf = "";
    for (const chunk of raw) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      if (/[，。！？、；：""''（）【】《》…—～·,!?;:()\[\].<>。]/.test(trimmed)) {
        // 标点符号：并入上一个token
        if (buf) {
          buf += trimmed;
        } else {
          buf = trimmed;
        }
      } else {
        // 文本内容：按每8字分段（最后一段允许更长）
        const chars = trimmed.replace(/\s+/g, "");
        const PHRASE_LEN = 8;
        for (let i = 0; i < chars.length; i += PHRASE_LEN) {
          const phrase = chars.slice(i, i + PHRASE_LEN);
          if (phrase) tokens.push(phrase);
        }
      }
    }
    if (buf && tokens.length > 0) {
      // 合并剩余标点到最后一个 token
      tokens[tokens.length - 1] += buf;
    } else if (buf) {
      tokens.push(buf);
    }
    return tokens.length > 0 ? tokens : [text];
  }, [text]);

  // 每词持续帧数（默认15帧=0.5秒@30fps，可按beat动态调整）
  const resolvedFramesPerWord = Math.max(5, Math.floor(framesPerWord ?? 15));

  // 当前帧（相对起始帧）
  const relativeFrame = Math.max(0, frame - startFrame);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 180,
        pointerEvents: 'none',
        ...wrapperStyle,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px',
          maxWidth: '900px',
          padding: '0 40px',
          ...trackStyle,
        }}
      >
        {words.map((word, index) => {
          // 计算每个词的开始和结束帧
          const wordStart = index * resolvedFramesPerWord;
          const wordEnd = wordStart + resolvedFramesPerWord;

          // 判断当前词是否处于显示状态
          const isActive = relativeFrame >= wordStart && relativeFrame < wordEnd;
          const isPast = relativeFrame >= wordEnd;

          // 计算透明度（淡入淡出）
          const opacity = isActive
            ? 1
            : isPast
            ? interpolate(relativeFrame, [wordEnd, wordEnd + 10], [1, inactiveOpacity], { extrapolateRight: 'clamp' })
            : inactiveOpacity;

          // 是否高亮
          const isHighlighted = highlightWords.some((hw) =>
            word.toLowerCase().includes(hw.toLowerCase())
          );

          // 当前词进入时的缩放动画
          const scale = isActive
            ? spring({ fps, frame: relativeFrame - wordStart, config: { damping: 15, stiffness: 150 } })
            : isPast
            ? 1
            : 0.8;

          return (
            <span
              key={index}
              style={{
                fontSize,
                color: isHighlighted ? accentColor : color,
                opacity,
                transform: `scale(${scale})`,
                display: 'inline-block',
                fontWeight: isHighlighted ? 700 : 400,
                textShadow: isHighlighted
                  ? `${baseTextShadow}, 0 0 20px ${accentColor}80, 0 0 40px ${accentColor}40`
                  : baseTextShadow,
                transition: 'color 0.2s, text-shadow 0.2s',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default WordByWord;
