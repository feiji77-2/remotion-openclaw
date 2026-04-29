/**
 * KineticText.tsx — 动态字体效果库 v2
 *
 * v2 新增：
 * - GlitchText: 字符级故障效果（借鉴 remotion-bits）
 * - 所有效果接入统一 motion.ts 框架
 * - Oklch 渐变色文字
 *
 * 支持效果：
 * - Typewriter: 逐字打字机效果
 * - SplitReveal: 字符分离展开
 * - WaveText: 波浪效果
 * - BlurReveal: 模糊到清晰
 * - ScaleReveal: 缩放入场
 * - GradientText: 渐变色文字（Oklch）
 * - SkewReveal: 斜切入场
 * - GlitchText: 故障效果 ★ 新增
 */

import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, random } from 'remotion';
import {
  useMotionTiming,
  useSpring,
  buildMotionStyles,
  transformToString,
  type EasingName,
  type TimingConfig,
} from '../utils/motion';
import {
  buildGradientTextStyle,
  type PaletteName,
} from '../utils/gradient';

// ===== 基础类型 =====

interface KineticTextProps {
  text: string;
  startFrame?: number;
  style?: React.CSSProperties;
  className?: string;
}

// ===== 打字机效果 =====

interface TypewriterProps extends KineticTextProps {
  speed?: number;
  cursor?: boolean;
  cursorColor?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  startFrame = 0,
  speed = 0.8,
  cursor = true,
  cursorColor = '#00d4ff',
  style,
}) => {
  const frame = useCurrentFrame();
  const progress = Math.max(0, frame - startFrame);
  const charCount = Math.floor(progress * speed);
  const visibleText = text.slice(0, charCount);
  const currentChar = text[charCount];
  const isTyping = charCount < text.length;
  const blink = Math.sin(frame * 0.3) > 0;

  return (
    <span style={{ ...style, display: 'inline-block' }}>
      {visibleText}
      {cursor && isTyping && (
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: cursorColor,
            marginLeft: 2,
            opacity: blink ? 1 : 0,
            verticalAlign: 'text-bottom',
          }}
        />
      )}
      {cursor && !isTyping && (
        <span style={{ width: 2, height: '1em', display: 'inline-block', marginLeft: 2 }} />
      )}
    </span>
  );
};

// ===== 字符分离展开 =====

interface SplitRevealProps extends KineticTextProps {
  stagger?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  overshoot?: boolean;
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  text,
  startFrame = 0,
  stagger = 3,
  direction = 'up',
  overshoot = true,
  style,
}) => {
  const chars = useMemo(() => text.split(''), [text]);

  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden' }}>
      {chars.map((char, i) => (
        <SplitChar
          key={i}
          char={char}
          startFrame={startFrame + i * stagger}
          direction={direction}
          overshoot={overshoot}
          style={style}
        />
      ))}
    </span>
  );
};

const SplitChar: React.FC<{
  char: string;
  startFrame: number;
  direction: 'up' | 'down' | 'left' | 'right';
  overshoot: boolean;
  style?: React.CSSProperties;
}> = ({ char, startFrame, direction, overshoot, style }) => {
  const { spring: s } = useSpring({
    duration: 30,
    delay: startFrame,
    config: overshoot ? 'bounce' : 'soft',
  });

  const getOffset = () => {
    const dist = (1 - s) * 50;
    switch (direction) {
      case 'up':   return { y: dist };
      case 'down': return { y: -dist };
      case 'left': return { x: dist };
      case 'right':return { x: -dist };
    }
  };

  const offset = getOffset();

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `translate(${offset.x || 0}px, ${offset.y || 0}px)`,
        opacity: s,
        ...style,
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  );
};

// ===== 波浪效果 =====

interface WaveTextProps extends KineticTextProps {
  amplitude?: number;
  frequency?: number;
  stagger?: number;
}

export const WaveText: React.FC<WaveTextProps> = ({
  text,
  startFrame = 0,
  amplitude = 10,
  frequency = 0.3,
  stagger = 2,
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = useMemo(() => text.split(''), [text]);

  return (
    <span style={{ display: 'inline-flex' }}>
      {chars.map((char, i) => {
        const phase = i * stagger * frequency;
        const y = Math.sin((frame - startFrame) * frequency + phase) * amplitude;
        const rotate = Math.sin((frame - startFrame) * frequency + phase) * 5;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px) rotate(${rotate}deg)`,
              transition: 'transform 0.05s',
              ...style,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
};

// ===== 模糊到清晰 =====

interface BlurRevealProps extends KineticTextProps {
  maxBlur?: number;
}

export const BlurReveal: React.FC<BlurRevealProps> = ({
  text,
  startFrame = 0,
  maxBlur = 20,
  style,
}) => {
  const { spring: s } = useSpring({
    duration: 30,
    delay: startFrame,
    config: 'gentle',
  });

  const blur = interpolate(s, [0, 1], [maxBlur, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(s, [0, 0.5, 1], [0, 0.5, 1], { extrapolateRight: 'clamp' });

  return (
    <span
      style={{
        filter: `blur(${blur}px)`,
        opacity,
        ...style,
      }}
    >
      {text}
    </span>
  );
};

// ===== 缩放入场 =====

interface ScaleRevealProps extends KineticTextProps {
  fromScale?: number;
  overshoot?: boolean;
}

export const ScaleReveal: React.FC<ScaleRevealProps> = ({
  text,
  startFrame = 0,
  fromScale = 0.5,
  overshoot = true,
  style,
}) => {
  const { spring: s } = useSpring({
    duration: 30,
    delay: startFrame,
    config: overshoot ? 'bounce' : 'soft',
  });

  const scale = interpolate(s, [0, 1], [fromScale, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(s, [0, 0.3, 1], [0, 1, 1], { extrapolateRight: 'clamp' });

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `scale(${scale})`,
        opacity,
        ...style,
      }}
    >
      {text}
    </span>
  );
};

// ===== 渐变色文字（Oklch）=====

interface GradientTextProps {
  text: string;
  palette?: PaletteName;
  angle?: number;
  animated?: boolean;
  style?: React.CSSProperties;
}

export const GradientText: React.FC<GradientTextProps> = ({
  text,
  palette = 'techBlue',
  angle = 90,
  animated = false,
  style,
}) => {
  const gradientStyle = buildGradientTextStyle(palette, angle);

  return (
    <span
      style={{
        ...gradientStyle,
        ...style,
      }}
    >
      {text}
    </span>
  );
};

// ===== 斜切入场 =====

interface SkewRevealProps extends KineticTextProps {
  direction?: 'left' | 'right';
}

export const SkewReveal: React.FC<SkewRevealProps> = ({
  text,
  startFrame = 0,
  direction = 'left',
  style,
}) => {
  const { spring: s } = useSpring({
    duration: 30,
    delay: startFrame,
    config: 'gentle',
  });

  const skewX = interpolate(
    s,
    [0, 1],
    direction === 'left' ? [-30, 0] : [30, 0],
    { extrapolateRight: 'clamp' }
  );
  const translateX = interpolate(
    s,
    [0, 1],
    direction === 'left' ? [-20, 0] : [20, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <span
      style={{
        display: 'inline-block',
        transform: `skewX(${skewX}deg) translateX(${translateX}px)`,
        opacity: s,
        ...style,
      }}
    >
      {text}
    </span>
  );
};

// ===== ★ 新增：故障效果（借鉴 remotion-bits）=====

interface GlitchTextProps extends KineticTextProps {
  intensity?: number;       // 故障强度 0~1
  glitchProbability?: number; // 每帧触发概率
  glitchChars?: string;     // 替换字符集
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  startFrame = 0,
  intensity = 0.3,
  glitchProbability = 0.08,
  glitchChars = '!@#$%^&*<>?/|\\',
  style,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  // 主文字淡入
  const opacity = interpolate(f, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // 故障层1：横向偏移
  const glitchOffsetX = intensity * 8 * (Math.random() > 0.5 ? 1 : -1);

  // 故障层2：RGB 分色
  const rgbSplit = intensity * 3;

  const glitchText = useMemo(() => {
    return text.split('').map((char, i) => {
      // 确定此字符是否故障
      const seed = i * 100 + frame;
      const r = random(seed as unknown as string);

      if (r < glitchProbability) {
        // 随机替换字符
        const replacementIndex = Math.floor(random(seed + 1 as unknown as string) * glitchChars.length);
        return glitchChars[replacementIndex];
      }
      return char;
    }).join('');
  }, [text, frame, glitchProbability, glitchChars]);

  if (f <= 0) return null;

  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }}>
      {/* 主文字层 */}
      <span style={{ opacity, color: '#fff' }}>{text}</span>

      {/* 故障阴影层（红偏） */}
      {glitchOffsetX !== 0 && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: glitchOffsetX,
            opacity: opacity * intensity * 0.8,
            color: '#ff0040',
            clipPath: `inset(${Math.random() * 100}% 0 0 0)`,
          }}
          aria-hidden
        >
          {glitchText}
        </span>
      )}

      {/* 故障阴影层（青偏） */}
      {glitchOffsetX !== 0 && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: -glitchOffsetX,
            opacity: opacity * intensity * 0.8,
            color: '#00ffff',
            clipPath: `inset(${Math.random() * 100}% 0 0 0)`,
          }}
          aria-hidden
        >
          {glitchText}
        </span>
      )}

      {/* 扫描线效果 */}
      {intensity > 0.2 && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,255,255,${intensity * 0.1}) 2px,
              rgba(0,255,255,${intensity * 0.1}) 4px
            )`,
            pointerEvents: 'none',
          }}
          aria-hidden
        />
      )}
    </span>
  );
};

// ===== 交错动画（借鉴 remotion-bits StaggeredMotion）=====

type StaggerDirection = 'forward' | 'reverse' | 'center' | 'random';

interface StaggeredTextProps {
  text: string;
  startFrame?: number;
  stagger?: number;
  staggerDirection?: StaggerDirection;
  style?: React.CSSProperties;
  children: (char: string, index: number) => React.ReactNode;
}

export const StaggeredText: React.FC<StaggeredTextProps> = ({
  text,
  startFrame = 0,
  stagger = 3,
  staggerDirection = 'forward',
  style,
  children,
}) => {
  const chars = useMemo(() => text.split(''), [text]);

  function getStaggerIndex(actualIndex: number): number {
    const total = chars.length;
    if (staggerDirection === 'reverse') return total - 1 - actualIndex;
    if (staggerDirection === 'center') {
      const mid = Math.floor(total / 2);
      return Math.abs(actualIndex - mid);
    }
    if (staggerDirection === 'random') {
      const seed = `stagger-${actualIndex}`;
      return Math.floor(random(seed as unknown as string) * total);
    }
    return actualIndex;
  }

  return (
    <span style={{ display: 'inline-flex', ...style }}>
      {chars.map((char, i) => {
        const staggerIndex = getStaggerIndex(i);
        return (
          <span key={i} style={{ display: 'inline-block' }}>
            {children(char, i)}
          </span>
        );
      })}
    </span>
  );
};

// ===== 组合动态标题 =====

interface AnimatedTitleProps {
  title: string;
  subtitle?: string;
  startFrame?: number;
  accentColor?: string;
}

export const AnimatedTitle: React.FC<AnimatedTitleProps> = ({
  title,
  subtitle,
  startFrame = 0,
  accentColor = '#00d4ff',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SplitReveal
        text={title}
        startFrame={startFrame}
        direction="down"
        overshoot
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: 2,
        }}
      />
      {subtitle && (
        <BlurReveal
          text={subtitle}
          startFrame={startFrame + title.length * 3 + 10}
          style={{
            fontSize: 28,
            color: accentColor,
            fontWeight: 400,
          }}
        />
      )}
    </div>
  );
};
