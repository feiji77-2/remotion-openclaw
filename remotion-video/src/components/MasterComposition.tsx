/**
 * MasterComposition.tsx — 全链路美化合成器
 *
 * 整合所有美化层，一次调用完成全套电影感包装：
 *   - 镜头过渡动效
 *   - 动态 Lower Third
 *   - 色彩分级（FilmGrain + Vignette + LUT）
 *   - 运动特效
 *   - 韵律标记接入
 *
 * 用法:
 *   <MasterComposition>
 *     <YourShot />
 *   </MasterComposition>
 */

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';

// 导入所有美化组件（懒加载避免循环依赖）
import { TransitionManager, TransitionType } from './Transitions';
import { CinematicGrade } from './ColorGrade';
import { SpeedLines, PulseRing, DepthOfField } from './MotionFX';
import { SlideLowerThird, TagLowerThird } from './LowerThirds';
import { SplitReveal } from './KineticText';

// ===== 主合成器 Props =====

export interface MasterCompositionProps {
  children: React.ReactNode;

  // 色彩分级
  enableGrade?: boolean;
  gradeIntensity?: number;
  lutType?: 'warm' | 'cool' | 'teal-orange' | 'desaturated' | 'cinema' | 'none';

  // 镜头过渡
  transitions?: {
    at: number;         // 帧位置（必填）
    type: TransitionType;
  }[];

  // Lower Third
  lowerThird?: {
    at: number;
    title: string;
    subtitle?: string;
    tags?: { label: string; color?: string }[];
    tagLabel?: string;
  };

  // 运动特效
  speedLines?: { at: number; intensity?: number };
  pulseRing?: { at: number; x?: number; y?: number; color?: string };

  // 景深
  depthOfField?: { focusX?: number; focusY?: number; blurStrength?: number };

  // 水印
  watermark?: {
    text?: string;
    showFrame?: number;  // 多少帧后显示
  };
}

// ===== 内部子组件 =====

const GradeLayer: React.FC<{
  enabled: boolean;
  intensity: number;
  lut: 'warm' | 'cool' | 'teal-orange' | 'desaturated' | 'cinema' | 'none';
}> = ({ enabled, intensity, lut }) => {
  if (!enabled) return null;
  return (
    <CinematicGrade
      grain
      grainIntensity={0.05}
      vignette
      vignetteIntensity={0.45}
      lut={lut}
      lutIntensity={intensity}
      opacity={1}
    />
  );
};

const TransitionLayer: React.FC<{
  transitions: MasterCompositionProps['transitions'];
}> = ({ transitions }) => {
  const frame = useCurrentFrame();
  if (!transitions) return null;

  return (
    <>
      {transitions.map((t, i) => {
        const isActive = frame >= t.at && frame < t.at + 20;
        if (!isActive) return null;
        return (
          <TransitionManager
            key={i}
            type={t.type}
            frame={frame - t.at}
            transitionFrames={20}
          />
        );
      })}
    </>
  );
};

const LowerThirdLayer: React.FC<{
  config: MasterCompositionProps['lowerThird'];
}> = ({ config }) => {
  const frame = useCurrentFrame();
  if (!config) return null;

  const { at, title, subtitle, tags, tagLabel } = config;
  const visible = frame >= at && frame < at + 120;

  if (!visible) return null;

  return (
    <SlideLowerThird
      startFrame={at}
      duration={120}
      exitFrame={at + 100}
      title={title}
      subtitle={subtitle}
      accentColor="#00d4ff"
    />
  );
};

const TagLayer: React.FC<{
  config: MasterCompositionProps['lowerThird'];
}> = ({ config }) => {
  const frame = useCurrentFrame();
  if (!config?.tags) return null;

  const { at, tags, tagLabel } = config;
  const visible = frame >= at && frame < at + 150;

  if (!visible) return null;

  return (
    <TagLowerThird
      startFrame={at}
      duration={150}
      exitFrame={at + 120}
      tags={tags}
      label={tagLabel}
    />
  );
};

const SpeedFXLayer: React.FC<{
  speedLines?: { at: number; intensity?: number };
}> = ({ speedLines }) => {
  const frame = useCurrentFrame();
  if (!speedLines) return null;

  const { at, intensity } = speedLines;
  const visible = frame >= at && frame < at + 30;

  if (!visible) return null;

  return <SpeedLines startFrame={at} intensity={intensity || 0.3} count={30} />;
};

const WatermarkLayer: React.FC<{
  text?: string;
  showFrame?: number;
}> = ({ text, showFrame = 500 }) => {
  const frame = useCurrentFrame();
  if (frame < showFrame || !text) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        right: 40,
        fontSize: 18,
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'monospace',
        letterSpacing: 2,
      }}
    >
      {text}
    </div>
  );
};

// ===== 主组件 =====

export const MasterComposition: React.FC<MasterCompositionProps> = ({
  children,

  enableGrade = true,
  gradeIntensity = 1,
  lutType = 'cinema',

  transitions,

  lowerThird,

  speedLines,

  depthOfField,

  watermark,
}) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 主内容层 */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>

      {/* 景深 */}
      {depthOfField && (
        <DepthOfField
          focusX={depthOfField.focusX || 0.5}
          focusY={depthOfField.focusY || 0.5}
          blurStrength={depthOfField.blurStrength || 6}
        />
      )}

      {/* 速度线 */}
      <SpeedFXLayer speedLines={speedLines} />

      {/* 镜头过渡 */}
      <TransitionLayer transitions={transitions} />

      {/* Lower Third */}
      <LowerThirdLayer config={lowerThird} />

      {/* 标签 */}
      {lowerThird?.tags && <TagLayer config={lowerThird} />}

      {/* 色彩分级（最顶层） */}
      <GradeLayer
        enabled={enableGrade}
        intensity={gradeIntensity}
        lut={lutType}
      />

      {/* 水印 */}
      <WatermarkLayer text={watermark?.text} showFrame={watermark?.showFrame} />
    </div>
  );
};

// ===== 快速镜头工厂 =====

interface StyledShotProps {
  children: React.ReactNode;
  /** 镜头ID，用于标识 */
  shotId?: string;
  /** 调色 LUT */
  lut?: MasterCompositionProps['lutType'];
  /** 过渡类型 */
  transition?: TransitionType;
  /** 过渡位置 */
  transitionAt?: number;
  /** Lower Third */
  lowerThird?: MasterCompositionProps['lowerThird'];
  /** 水印文本 */
  watermark?: string;
}

export const StyledShot: React.FC<StyledShotProps> = ({
  children,
  shotId,
  lut = 'cinema',
  transition,
  transitionAt,
  lowerThird,
  watermark,
}) => {
  return (
    <MasterComposition
      enableGrade
      gradeIntensity={1}
      lutType={lut}
      transitions={
        transition
          ? [{ at: transitionAt || 0, type: transition }]
          : undefined
      }
      lowerThird={lowerThird}
      watermark={{ text: watermark, showFrame: 200 }}
    >
      {children}
    </MasterComposition>
  );
};
