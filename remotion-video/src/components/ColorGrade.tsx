/**
 * ColorGrade.tsx — 电影级色彩调色覆盖层
 *
 * 支持效果：
 * - FilmGrain: 电影颗粒（帧级随机噪点）
 * - Vignette: 暗角
 * - ChromaticAberration: 色差
 * - ColorLUT: 模拟调色（LUT效果）
 * - VignetteGrain: 组合（暗角+颗粒）
 * - CinematicGrade: 全套电影感调色
 */

import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate, spring, AbsoluteFill } from 'remotion';

// ===== 电影颗粒 =====

interface FilmGrainProps {
  intensity?: number;       // 强度 0-1
  animated?: boolean;       // 是否随帧变化
  size?: number;           // 噪点大小
  color?: boolean;          // 彩色噪点还是灰度
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.08,
  animated = true,
  size = 2,
  color = false,
}) => {
  const frame = useCurrentFrame();
  const seed = animated ? frame * 137.5 : 0;

  // 生成伪随机噪点（基于帧的确定性随机）
  const noise = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const x = ((seed + i * 17) % 100) / 100;
      const y = ((seed + i * 23) % 100) / 100;
      const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.001) * 43758.5453;
      return v - Math.floor(v);
    });
  }, [seed]);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: color ? 'color' : 'overlay',
        opacity: intensity,
      }}
    >
      {noise.slice(0, 80).map((v, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${((seed + i * 29) % 100)}%`,
            top: `${((seed + i * 37) % 100)}%`,
            width: size,
            height: size,
            background: color
              ? `hsl(${(v * 360) | 0}, 50%, 50%)`
              : `rgba(255,255,255,${v})`,
            opacity: v * intensity * 2,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ===== 暗角 =====

interface VignetteProps {
  intensity?: number;      // 强度 0-1
  radius?: number;         // 半径（0-1）
  color?: string;          // 暗角颜色
  animated?: boolean;      // 是否脉冲
  animatedSpeed?: number;  // 脉冲速度
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.6,
  radius = 0.5,
  color = '#000',
  animated = false,
  animatedSpeed = 0.05,
}) => {
  const frame = useCurrentFrame();
  const pulse = animated ? 1 + Math.sin(frame * animatedSpeed) * 0.1 : 1;
  const effectiveIntensity = intensity * pulse;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center,
          transparent 0%,
          transparent ${radius * 60}%,
          ${color}${Math.round(effectiveIntensity * 60).toString(16).padStart(2, '0')} ${radius * 80}%,
          ${color}${Math.round(effectiveIntensity * 100).toString(16).padStart(2, '0')} 100%
        )`,
      }}
    />
  );
};

// ===== 色差 =====

interface ChromaticAberrationProps {
  intensity?: number;      // 偏移强度（像素）
  animated?: boolean;      // 是否随帧变化
}

export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({
  intensity = 3,
  animated = false,
}) => {
  const frame = useCurrentFrame();
  const offset = animated
    ? intensity + Math.sin(frame * 0.1) * intensity * 0.5
    : intensity;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: 0.15,
      }}
    >
      {/* R 通道 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,0,0,0.3)',
          transform: `translate(${-offset}px, 0)`,
        }}
      />
      {/* B 通道 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,255,0.3)',
          transform: `translate(${offset}px, 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ===== 调色 LUT 模拟 =====

type LUTType = 'warm' | 'cool' | 'teal-orange' | 'desaturated' | 'cinema' | 'none';

interface ColorLUTProps {
  type?: LUTType;
  intensity?: number;     // 效果强度 0-1
  animated?: boolean;     // 强度是否随帧渐变
  fadeIn?: number;        // 淡入帧数（0=立即）
}

export const ColorLUT: React.FC<ColorLUTProps> = ({
  type = 'none',
  intensity = 1,
  animated = false,
  fadeIn = 0,
}) => {
  const frame = useCurrentFrame();
  const progress = fadeIn > 0
    ? Math.min(1, spring({ fps: 30, frame, config: { damping: 200, stiffness: 100 } }))
    : 1;

  const eff = animated ? intensity * (0.7 + Math.sin(frame * 0.03) * 0.3) : intensity;
  const finalIntensity = eff * progress;

  if (type === 'none') return null;

  const overlays: React.CSSProperties[] = [];

  switch (type) {
    case 'warm':
      // 暖色调（偏高光黄色）
      overlays.push({
        background: 'rgba(255,180,50,0.05)',
        mixBlendMode: 'overlay',
      });
      overlays.push({
        background: 'rgba(255,100,0,0.03)',
        mixBlendMode: 'soft-light',
      });
      break;

    case 'cool':
      // 冷色调（偏蓝）
      overlays.push({
        background: 'rgba(0,100,200,0.06)',
        mixBlendMode: 'overlay',
      });
      overlays.push({
        background: 'rgba(100,0,200,0.03)',
        mixBlendMode: 'soft-light',
      });
      break;

    case 'teal-orange':
      // 分区调色（青-橙）
      overlays.push({
        background: 'linear-gradient(to bottom, rgba(0,150,180,0.08) 0%, transparent 40%, rgba(255,120,50,0.06) 100%)',
        mixBlendMode: 'overlay',
      });
      break;

    case 'desaturated':
      // 去饱和
      overlays.push({
        background: 'rgba(128,128,128,0.1)',
        mixBlendMode: 'saturation',
        opacity: 0.5,
      });
      break;

    case 'cinema':
      // 电影感：偏青绿 + 阴影色调
      overlays.push({
        background: 'linear-gradient(to bottom, rgba(0,20,30,0.15) 0%, transparent 30%, transparent 70%, rgba(0,10,20,0.2) 100%)',
        mixBlendMode: 'multiply',
      });
      overlays.push({
        background: 'rgba(0,150,130,0.04)',
        mixBlendMode: 'overlay',
      });
      break;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: finalIntensity }}>
      {overlays.map((style, i) => (
        <div key={i} style={{ ...style, position: 'absolute', inset: 0, ...style }} />
      ))}
    </AbsoluteFill>
  );
};

// ===== 动态光晕 =====

interface LensFlareProps {
  intensity?: number;
  color?: string;
  position?: { x: number; y: number };  // 0-1 归一化
  animated?: boolean;
}

export const LensFlare: React.FC<LensFlareProps> = ({
  intensity = 0.15,
  color = '#ffffff',
  position = { x: 0.2, y: 0.15 },
  animated = true,
}) => {
  const frame = useCurrentFrame();
  const pulse = animated ? 1 + Math.sin(frame * 0.08) * 0.3 : 1;
  const flicker = animated ? 1 + Math.sin(frame * 0.23) * 0.1 : 1;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 主光晕 */}
      <div
        style={{
          position: 'absolute',
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          width: 200 * pulse,
          height: 200 * pulse,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          opacity: intensity * pulse * flicker,
        }}
      />

      {/* 次级光晕 */}
      <div
        style={{
          position: 'absolute',
          left: `${position.x * 100 + 10}%`,
          top: `${position.y * 100 - 5}%`,
          width: 80 * pulse,
          height: 80 * pulse,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}30 0%, transparent 60%)`,
          opacity: intensity * 0.5 * flicker,
        }}
      />

      {/* 镜头耀斑条纹 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${position.x * 100 + (i - 1.5) * 8}%`,
            top: `${position.y * 100}%`,
            width: 2,
            height: `${100 + i * 30}%`,
            background: `linear-gradient(to bottom, ${color}60, transparent)`,
            transform: 'translateX(-50%) rotate(0deg)',
            opacity: intensity * 0.3 * flicker,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ===== 组合：全套电影感调色 =====

interface CinematicGradeProps {
  grain?: boolean;
  grainIntensity?: number;
  vignette?: boolean;
  vignetteIntensity?: number;
  lut?: LUTType;
  lutIntensity?: number;
  chromaticAberration?: boolean;
  lensFlare?: boolean;
  /** 整体透明度 */
  opacity?: number;
}

export const CinematicGrade: React.FC<CinematicGradeProps> = ({
  grain = true,
  grainIntensity = 0.06,
  vignette = true,
  vignetteIntensity = 0.5,
  lut = 'cinema',
  lutIntensity = 1,
  chromaticAberration = false,
  lensFlare = false,
  opacity = 1,
}) => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity,
        zIndex: 9999,
      }}
    >
      {/* 调色 LUT */}
      {lut !== 'none' && (
        <ColorLUT type={lut} intensity={lutIntensity} />
      )}

      {/* 暗角 */}
      {vignette && <Vignette intensity={vignetteIntensity} radius={0.4} />}

      {/* 颗粒 */}
      {grain && <FilmGrain intensity={grainIntensity} animated size={2} />}

      {/* 色差 */}
      {chromaticAberration && <ChromaticAberration intensity={2} animated />}

      {/* 镜头耀斑 */}
      {lensFlare && (
        <LensFlare intensity={0.1} position={{ x: 0.25, y: 0.2 }} animated />
      )}
    </AbsoluteFill>
  );
};

// ===== 宽银幕黑边 =====

interface LetterboxProps {
  aspectRatio?: number;   // 目标比例，如 2.39
  animated?: boolean;     // 是否渐变出现
}

export const Letterbox: React.FC<LetterboxProps> = ({
  aspectRatio = 2.39,
  animated = false,
}) => {
  const frame = useCurrentFrame();
  const progress = animated
    ? spring({ fps: 30, frame, config: { damping: 200, stiffness: 100 } })
    : 1;

  // 当前视频是 9:16 (0.5625)，目标 2.39:1 需要上下加黑边
  const targetRatio = 1 / aspectRatio; // 0.418 (竖屏对应的横版)
  const currentRatio = 9 / 16; // 0.5625

  if (currentRatio <= targetRatio) return null; // 不需要

  const barHeight = ((currentRatio - targetRatio) / 2 / currentRatio) * 100;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* 上黑边 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${barHeight * progress}%`,
          background: '#000',
        }}
      />
      {/* 下黑边 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${barHeight * progress}%`,
          background: '#000',
        }}
      />
    </AbsoluteFill>
  );
};
