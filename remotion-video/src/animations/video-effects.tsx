/**
 * video-effects.tsx
 *
 * 基于 remotion-animated 的声明式动画效果库
 * remotion-animated: npm i remotion-animated
 *
 * 设计原则：
 * - delay → 放在 <Animated> wrapper 上（所有子动画共享）
 * - individual animations → 用 start: 0（从 0 开始，配合 wrapper 的 delay）
 * - 缓动通过 spring 参数控制：damping / stiffness / mass
 *
 * 使用示例：
 *
 *   import { FadeIn, SlideUp, ScaleIn, StaggeredEntrance, TitleEntrance, CardReveal } from './animations/video-effects';
 *
 *   // 淡入
 *   <FadeIn delay={0} duration={20}><Text>标题</Text></FadeIn>
 *
 *   // 滑入 + 淡入
 *   <SlideUp delay={5} duration={25} distance={60}><Card /></SlideUp>
 *
 *   // 带弹跳物理（回弹效果）
 *   <SlideUp delay={0} duration={30} damping={10}><Card /></SlideUp>
 *
 *   // 交错入场
 *   <StaggeredEntrance baseDelay={5} staggerMs={8} animationType="slide-up">
 *     <P1 /><P2 /><P3 />
 *   </StaggeredEntrance>
 *
 *   // 标题入场预设
 *   <TitleEntrance delay={0}><BigTitle /></TitleEntrance>
 *
 *   // 卡片揭示
 *   <CardReveal delay={i*5} direction="up" distance={50}>
 *     <ShotCard />
 *   </CardReveal>
 */

import React from 'react';
import { Animated, Fade, Move, Rotate, Scale, Ease } from 'remotion-animated';

// ─── Ease 命名空间导出 ───────────────────────────────────────────────
export { Ease };

// ─── 缓动弹簧参数预设 ───────────────────────────────────────────────
export const SPRING_PRESETS = {
  /** 快速弹出（默认）*/
  snappy: { damping: 15, stiffness: 200, mass: 0.5 },
  /** 弹性回弹 */
  bouncy: { damping: 10, stiffness: 180, mass: 0.8 },
  /** 平滑慢入 */
  smooth: { damping: 20, stiffness: 90, mass: 1 },
  /** 僵硬精准 */
  stiff: { damping: 25, stiffness: 300, mass: 0.3 },
} as const;

// ─── Fade 淡入淡出 ─────────────────────────────────────────────────

export interface FadeInProps {
  children: React.ReactNode;
  /** 整体延迟（传递给 <Animated> wrapper）*/
  delay?: number;
  duration?: number;
  from?: number;
  to?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 淡入动画（Fade In）*/
export const FadeIn: React.FC<FadeInProps> = ({
  children, delay = 0, duration = 15, from = 0, to = 1,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Fade({
        to,
        initial: from,
        duration,
        start: 0,
        damping,
        stiffness,
        mass,
      }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface FadeOutProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: number;
  to?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 淡出动画（Fade Out）*/
export const FadeOut: React.FC<FadeOutProps> = ({
  children, delay = 0, duration = 15, from = 1, to = 0,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Fade({
        to,
        initial: from,
        duration,
        start: 0,
        damping,
        stiffness,
        mass,
      }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

// ─── Slide 滑入 ─────────────────────────────────────────────────────

export interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 从下方滑入（Slide Up）+ 同步淡入 */
export const SlideUp: React.FC<SlideUpProps> = ({
  children, delay = 0, duration = 20, distance = 40,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Move({ y: 0, initialY: distance, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.6), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface SlideDownProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 从上方滑入（Slide Down）+ 淡入 */
export const SlideDown: React.FC<SlideDownProps> = ({
  children, delay = 0, duration = 20, distance = 40,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Move({ y: 0, initialY: -distance, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.6), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface SlideLeftProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 从右侧滑入（Slide Left）+ 淡入 */
export const SlideLeft: React.FC<SlideLeftProps> = ({
  children, delay = 0, duration = 20, distance = 100,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Move({ x: 0, initialX: distance, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.6), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface SlideRightProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 从左侧滑入（Slide Right）+ 淡入 */
export const SlideRight: React.FC<SlideRightProps> = ({
  children, delay = 0, duration = 20, distance = 100,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Move({ x: 0, initialX: -distance, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.6), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

// ─── Scale 缩放 ──────────────────────────────────────────────────────

export interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: number;
  to?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 缩放出现动画（Scale In）+ 淡入 */
export const ScaleIn: React.FC<ScaleInProps> = ({
  children, delay = 0, duration = 15, from = 0, to = 1,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Scale({ by: to, initial: from, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.5), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface PopInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  /** 回弹程度：低 damping = 更弹 */
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 弹跳出现（Pop In）— 带 Overshoot 回弹效果 */
export const PopIn: React.FC<PopInProps> = ({
  children, delay = 0, duration = 25,
  damping = 10, stiffness = 180, mass = 0.8,
  absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Scale({ by: 1, initial: 0, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.4), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

// ─── Rotate 旋转 ────────────────────────────────────────────────────

export interface SpinInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  degrees?: number;
  fromDegrees?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** 旋转出现动画（Spin In）+ 淡入 */
export const SpinIn: React.FC<SpinInProps> = ({
  children, delay = 0, duration = 20, degrees = 360, fromDegrees = 0,
  damping, stiffness, mass, absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Rotate({ degrees, initial: fromDegrees, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.5), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

// ─── 交错入场 ──────────────────────────────────────────────────────

export interface StaggeredEntranceProps {
  children: React.ReactNode;
  /** 首个元素的起始延迟 */
  baseDelay?: number;
  /** 相邻元素间隔（帧）*/
  staggerMs?: number;
  /** 入场动画类型 */
  animationType?: 'slide-up' | 'fade' | 'scale' | 'pop';
  /** slide-up 的滑入距离 */
  slideDistance?: number;
  /** scale/pop 的起始 scale */
  scaleFrom?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 交错入场（Staggered Entrance）
 * 多个子元素按 staggerMs 间隔依次入场
 *
 * 示例：
 *   <StaggeredEntrance baseDelay={5} staggerMs={8} animationType="slide-up">
 *     <BulletPoint key="1"><BulletPoint key="2"><BulletPoint key="3"/>
 *   </StaggeredEntrance>
 */
export const StaggeredEntrance: React.FC<StaggeredEntranceProps> = ({
  children,
  baseDelay = 0,
  staggerMs = 8,
  animationType = 'slide-up',
  slideDistance = 30,
  scaleFrom = 0.3,
  absolute: abs,
  style,
  className,
}) => (
  <>
    {React.Children.map(children, (child, idx) => {
      if (!React.isValidElement(child)) return child;
      const d = baseDelay + idx * staggerMs;
      switch (animationType) {
        case 'fade':
          return <FadeIn delay={d} duration={15}>{child}</FadeIn>;
        case 'scale':
          return <ScaleIn delay={d} duration={18} from={scaleFrom}>{child}</ScaleIn>;
        case 'pop':
          return <PopIn delay={d} duration={20}>{child}</PopIn>;
        default:
          return <SlideUp delay={d} duration={20} distance={slideDistance}>{child}</SlideUp>;
      }
    })}
  </>
);

// ─── 特效 ───────────────────────────────────────────────────────────

export interface BounceInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  /** 弹跳次数控制（damping 高 = 少弹）*/
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 弹落入场（Bounce In）
 * 元素从上方落下并弹跳停止
 *
 * 示例：
 *   <BounceIn delay={5} distance={80} damping={12}>
 *     <Card>内容</Card>
 *   </BounceIn>
 */
export const BounceIn: React.FC<BounceInProps> = ({
  children, delay = 0, duration = 35, distance = 80,
  damping = 12, stiffness = 180, mass = 0.8,
  absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Move({ y: 0, initialY: -distance, duration, start: 0, damping, stiffness, mass }),
      Fade({ to: 1, initial: 0, duration: Math.round(duration * 0.4), start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

// ─── 预设入场 ─────────────────────────────────────────────────────

export interface TitleEntranceProps {
  children: React.ReactNode;
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 标题入场预设（Title Entrance Preset）
 * 组合动画：Move（斜向）+ Scale + Rotate + Fade 同时执行
 *
 * 示例：
 *   <TitleEntrance delay={0}>
 *     <BigTitle>视频标题</BigTitle>
 *   </TitleEntrance>
 */
export const TitleEntrance: React.FC<TitleEntranceProps> = ({
  children, delay = 0,
  damping = 15, stiffness = 200, mass = 0.5,
  absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      // 从左下方斜向出现
      Move({ y: 0, initialY: 30, x: 0, initialX: -20, duration: 25, start: 0, damping, stiffness, mass }),
      // 缩放出现
      Scale({ by: 1, initial: 0.85, duration: 30, start: 0, damping, stiffness, mass }),
      // 微旋转修正
      Rotate({ degrees: 0, initial: -2, duration: 30, start: 0, damping, stiffness, mass }),
      // 淡入
      Fade({ to: 1, initial: 0, duration: 20, start: 0 }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);

export interface CardRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 卡片揭示动画（Card Reveal）
 * 用于分镜图卡片的入场动画
 *
 * 示例：
 *   <CardReveal delay={i * 5} direction="up" distance={50}>
 *     <ShotCard />
 *   </CardReveal>
 */
export const CardReveal: React.FC<CardRevealProps> = ({
  children, delay = 0, direction = 'up', distance = 40,
  damping = 15, stiffness = 200, mass = 0.5,
  absolute: abs, style, className,
}) => {
  const isY = direction === 'up' || direction === 'down';
  const isNeg = direction === 'down' || direction === 'right';
  const dist = isNeg ? -distance : distance;

  return (
    <Animated
      animations={[
        isY
          ? Move({ y: 0, initialY: dist, duration: 20, start: 0, damping, stiffness, mass })
          : Move({ x: 0, initialX: dist, duration: 20, start: 0, damping, stiffness, mass }),
        Scale({ by: 1, initial: 0.9, duration: 18, start: 0, damping, stiffness, mass }),
        Fade({ to: 1, initial: 0, duration: 12, start: 0 }),
      ]}
      delay={delay}
      absolute={abs}
      style={style}
      className={className}
    >
      {children}
    </Animated>
  );
};

export interface PulseGlowProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  absolute?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 脉冲动画（Pulse Glow）
 * 用于强调关键元素（数据指标、数字等）
 *
 * 示例：
 *   <PulseGlow delay={20} scale={1.08}>
 *     <Number>99.8%</Number>
 *   </PulseGlow>
 */
export const PulseGlow: React.FC<PulseGlowProps> = ({
  children, delay = 0, duration = 20, scale = 1.05,
  damping = 15, stiffness = 200, mass = 0.5,
  absolute: abs, style, className,
}) => (
  <Animated
    animations={[
      Scale({ by: scale, initial: 1, duration, start: 0, damping, stiffness, mass }),
    ]}
    delay={delay}
    absolute={abs}
    style={style}
    className={className}
  >
    {children}
  </Animated>
);
