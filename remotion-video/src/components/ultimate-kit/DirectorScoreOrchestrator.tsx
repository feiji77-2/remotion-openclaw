/**
 * DirectorScoreOrchestrator.tsx — 导演总谱运行时编排器
 *
 * 接收 scoreToSequences() 编译后的 SequenceConfig[] 树，
 * 递归渲染为 Remotion <Sequence> 组件嵌套树。
 *
 * 职责：
 *   1. 递归渲染 <Sequence> 层级结构
 *   2. 摄像机路径逐帧插值（精确模式）或 CameraDirector 预设模式
 *   3. 元素级动画参数映射到 spring / interpolate 值
 *   4. 持续循环动画（float / pulse / drift）
 *   5. SVG 路径追踪（stroke-dasharray 动画）
 *   6. 导演效果预设层（ghost-title / burst-particles / trace-path 等）
 *   7. Per-cue 独立缓动控制
 */

import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, Sequence} from 'remotion';
import type {
  SequenceConfig,
  ElementCue,
  SpringPresetLabel,
  EasingFunction,
  EffectPreset,
} from '../../data/directorScore';
import {
  interpolateCameraPath,
  cameraPathToPreset,
  SPRING_PRESET_MAP,
} from '../../data/directorScore';
import {CameraDirector} from '../camera/CameraDirector';

// ── Props ────────────────────────────────────────────────────────

export interface DirectorScoreOrchestratorProps {
  /** scoreToSequences() 编译后的 Sequence 树 */
  sequences: SequenceConfig[];
  /** elementId → ReactNode 映射表 */
  elementRenderMap: Map<string, React.ReactNode>;
  /** 未找到 elementId 时的降级组件 */
  fallbackComponent?: React.ComponentType<{elementId: string}>;
  /** 全局帧率 */
  fps?: number;
}

// ── Defaults ──────────────────────────────────────────────────────

const defaultSpringPreset: SpringPresetLabel = 'smooth';

// ── 顶级组件 ─────────────────────────────────────────────────────

export const DirectorScoreOrchestrator: React.FC<DirectorScoreOrchestratorProps> = ({
  sequences,
  elementRenderMap,
  fallbackComponent: Fallback,
  fps = 30,
}) => {
  return (
    <>
      {sequences.map((seq, index) => (
        <SequenceRenderer
          key={`${seq.elementId ?? 'seq'}-${index}`}
          config={seq}
          elementRenderMap={elementRenderMap}
          fallbackComponent={Fallback}
          fps={fps}
        />
      ))}
    </>
  );
};

// ── 递归渲染器 ────────────────────────────────────────────────────

interface SequenceRendererProps {
  config: SequenceConfig;
  elementRenderMap: Map<string, React.ReactNode>;
  fallbackComponent?: React.ComponentType<{elementId: string}>;
  fps: number;
}

const SequenceRenderer: React.FC<SequenceRendererProps> = ({
  config,
  elementRenderMap,
  fallbackComponent: Fallback,
  fps,
}) => {
  const frame = useCurrentFrame();
  const hasChildren = config.children && config.children.length > 0;
  const hasCameraPath = config.cameraPath && config.cameraPath.length > 0;
  const hasAnimation = config.animationParams;
  const anim = config.animationParams;
  const isPresetCamera = config.cameraMode === 'preset' || (hasCameraPath && config.cameraMode !== 'exact' && anim?.type !== 'path');

  // ── 解析内容 ──
  const innerContent = useMemo(() => {
    if (hasChildren) {
      return config.children!.map((child, idx) => (
        <SequenceRenderer
          key={`${child.elementId ?? 'sub'}-${idx}`}
          config={child}
          elementRenderMap={elementRenderMap}
          fallbackComponent={Fallback}
          fps={fps}
        />
      ));
    }

    // SVG path 渲染（覆盖 elementRenderMap）
    if (anim?.type === 'path' && anim.pathD) {
      return <SVGPathRenderer cue={anim} frame={frame} fps={fps} />;
    }

    if (config.elementId) {
      const mapped = elementRenderMap.get(config.elementId);
      if (mapped) return mapped;
      if (Fallback) return <Fallback elementId={config.elementId} />;
      return null;
    }

    return null;
  }, [hasChildren, config.children, config.elementId, elementRenderMap, Fallback, fps, anim, frame]);

  // ── 效果预设层 ──
  const effectLayer = useMemo(() => {
    if (!anim?.effectPreset || anim.effectPreset === 'none') return null;
    return <EffectLayer preset={anim.effectPreset} cue={anim} frame={frame} fps={fps} />;
  }, [anim, frame, fps]);

  // ── 摄像机路径插值（精确模式） ──
  const cameraTransform = useMemo(() => {
    if (!hasCameraPath || !config.cameraPath || isPresetCamera) return null;
    const interpolator = interpolateCameraPath(config.cameraPath, config.durationInFrames);
    return interpolator(frame);
  }, [hasCameraPath, config.cameraPath, config.durationInFrames, frame, isPresetCamera]);

  // ── 元素动画解析 ──
  const animationStyle = useMemo((): React.CSSProperties | null => {
    if (!hasAnimation || !anim) return null;
    if (anim.type === 'path') return null; // SVG path 使用自己的渲染器
    return resolveAnimationStyle(frame, anim, fps);
  }, [hasAnimation, anim, frame, fps]);

  // ── 摄像机预设模式（使用 CameraDirector） ──
  const cameraPreset = useMemo(() => {
    if (!isPresetCamera || !config.cameraPath) return undefined;
    return cameraPathToPreset(config.cameraPath);
  }, [isPresetCamera, config.cameraPath]);

  // ── 内容 JSX ──
  let content: React.ReactNode = (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      ...(cameraTransform ? {
        transform: `scale(${cameraTransform.zoom}) translate3d(${cameraTransform.panX}px, ${cameraTransform.panY}px, 0) rotate(${cameraTransform.rotate}deg)`,
        transformOrigin: '50% 50%',
        willChange: 'transform',
      } : {}),
      ...(animationStyle ?? {}),
    }}>
      {innerContent}
      {effectLayer}
    </div>
  );

  // 预设摄像机模式：用 CameraDirector 包裹
  if (isPresetCamera && cameraPreset) {
    content = (
      <CameraDirector preset={cameraPreset} enterFrames={anim?.enterDuration ?? 18}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          ...(animationStyle ?? {}),
        }}>
          {innerContent}
          {effectLayer}
        </div>
      </CameraDirector>
    );
  }

  return (
    <Sequence
      from={config.from}
      durationInFrames={config.durationInFrames}
      premountFor={0}
    >
      <AbsoluteFill style={{overflow: 'hidden'}}>
        {content}
      </AbsoluteFill>
    </Sequence>
  );
};

// ══════════════════════════════════════════════════════════════════
// SVG Path 追踪渲染器
// ══════════════════════════════════════════════════════════════════

const SVGPathRenderer: React.FC<{cue: ElementCue; frame: number; fps: number}> = ({cue, frame, fps}) => {
  const localFrame = Math.max(0, frame - cue.enterAtFrame);
  const pathDuration = cue.pathDuration ?? cue.enterDuration;
  const pathProgress = Math.min(1, localFrame / Math.max(pathDuration, 1));
  const easedProgress = applyEasingFn(pathProgress, cue.enterEasing ?? cue.easing ?? 'ease-out');

  // 计算 stroke-dashoffset（路径总长约 2000，实际由 SVG 决定）
  const dashOffset = 2000 * (1 - easedProgress);
  const opacity = interpolate(easedProgress, [0, 0.05, 1], [0, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const keepVisible = cue.pathKeepVisible ?? true;
  const exitOpacity = (cue.exitAtFrame !== undefined && frame >= cue.exitAtFrame)
    ? interpolate(frame - cue.exitAtFrame, [0, cue.exitDuration ?? 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: 'absolute',
        inset: 0,
        opacity: opacity * exitOpacity,
        pointerEvents: 'none',
      }}
    >
      <path
        d={cue.pathD}
        fill={cue.pathFill ?? 'none'}
        stroke={cue.pathColor ?? '#38bdf8'}
        strokeWidth={cue.pathWidth ?? 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 2000,
          strokeDashoffset: keepVisible ? (easedProgress >= 1 ? 0 : dashOffset) : dashOffset,
          filter: `drop-shadow(0 0 8px ${cue.pathColor ?? '#38bdf8'})`,
          transition: 'none',
        }}
      />
    </svg>
  );
};

// ══════════════════════════════════════════════════════════════════
// 导演效果预设层
// ══════════════════════════════════════════════════════════════════

interface EffectLayerProps {
  preset: EffectPreset;
  cue: ElementCue;
  frame: number;
  fps: number;
}

const EffectLayer: React.FC<EffectLayerProps> = ({preset, cue, frame, fps}) => {
  const localFrame = Math.max(0, frame - cue.enterAtFrame);
  const enterT = Math.min(1, localFrame / Math.max(cue.enterDuration, 1));
  const accent = cue.pathColor ?? '#38bdf8';

  switch (preset) {
    case 'ghost-title': {
      const ghostOpacity = interpolate(enterT, [0, 0.3, 1], [0, 0.08, 0.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const ghostScale = interpolate(enterT, [0, 1], [0.92, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      return (
        <div
          style={{
            position: 'absolute',
            left: 110,
            right: 110,
            top: 140,
            fontSize: 88,
            fontWeight: 'bold',
            color: accent,
            opacity: ghostOpacity,
            transform: `scale(${ghostScale})`,
            letterSpacing: -2,
            lineHeight: 0.92,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {cue.elementId.replace(/[-_]/g, ' ')}
        </div>
      );
    }

    case 'burst-particles': {
      const particles = useMemo(() => {
        const frags: Array<{x: number; y: number; opacity: number; scale: number; rotation: number}> = [];
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const dist = 80 + Math.random() * 160;
          const localT = Math.max(0, localFrame - 4) / Math.max(cue.enterDuration - 4, 1);
          const progress = Math.min(1, localT);
          frags.push({
            x: 960 + Math.cos(angle) * dist * progress,
            y: 540 + Math.sin(angle) * dist * progress,
            opacity: progress < 0.7 ? interpolate(progress, [0, 0.3, 0.7], [1, 0.8, 0]) : 0,
            scale: interpolate(progress, [0, 0.5, 1], [1.2, 0.8, 0.2]),
            rotation: angle * 180 / Math.PI + progress * 360,
          });
        }
        return frags;
      }, [localFrame, cue.enterDuration]);

      return (
        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1}}>
          {particles.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
                borderRadius: '50%',
                background: accent,
                opacity: p.opacity * 0.5,
                transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${p.scale})`,
                boxShadow: `0 0 12px ${accent}`,
              }}
            />
          ))}
        </div>
      );
    }

    case 'trace-path': {
      if (!cue.pathD) return null;
      const traceT = Math.min(1, localFrame / Math.max(cue.enterDuration, 1));
      const dashOffset = 2000 * (1 - applyEasingFn(traceT, 'ease-out'));
      return (
        <svg
          width="100%"
          height="100%"
          style={{position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', zIndex: 1}}
        >
          <path
            d={cue.pathD}
            fill="none"
            stroke={accent}
            strokeWidth={cue.pathWidth ?? 2}
            strokeLinecap="round"
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: dashOffset,
              filter: `drop-shadow(0 0 6px ${accent})`,
            }}
          />
        </svg>
      );
    }

    case 'pin-frame': {
      const pinOpacity = interpolate(enterT, [0, 0.5, 1], [0, 0.3, 0.25], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      return (
        <div
          style={{
            position: 'absolute',
            left: 200,
            right: 200,
            top: 120,
            bottom: 120,
            border: `1px solid ${accent}44`,
            borderRadius: 36,
            opacity: pinOpacity,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {[
            {top: -1, left: -1, style: {}},
            {top: -1, right: -1, style: {transform: 'scaleX(-1)'}},
            {bottom: -1, left: -1, style: {transform: 'scaleY(-1)'}},
            {bottom: -1, right: -1, style: {transform: 'scale(-1)'}},
          ].map((corner, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 60,
                height: 60,
                borderTop: `3px solid ${accent}`,
                borderLeft: `3px solid ${accent}`,
                borderTopLeftRadius: 16,
                ...corner.style,
                ...corner,
              }}
            />
          ))}
        </div>
      );
    }

    case 'race-bars': {
      const raceT = Math.min(1, localFrame / Math.max(cue.enterDuration, 1));
      const barCount = 4;
      return (
        <div style={{position: 'absolute', left: 120, right: 120, bottom: 80, display: 'grid', gap: 12, pointerEvents: 'none', zIndex: 1}}>
          {Array.from({length: barCount}, (_, i) => {
            const staggerT = Math.max(0, Math.min(1, (raceT * barCount - i * 0.15) / (1 - i * 0.15)));
            const width = interpolate(staggerT, [0, 1], [40, 800 - i * 120], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return (
              <div
                key={i}
                style={{
                  height: 10 + i * 2,
                  width,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${accent}cc, ${accent}33)`,
                  opacity: 0.15 + i * 0.08,
                  transform: `translateX(${i * 14}px)`,
                  boxShadow: `0 0 12px ${accent}33`,
                }}
              />
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
};

// ══════════════════════════════════════════════════════════════════
// 动画解析引擎
// ══════════════════════════════════════════════════════════════════

/**
 * 将 ElementCue 解析为 React.CSSProperties。
 * 在 Sequence 内部调用（frame 是 Sequence 内相对帧）。
 * 支持 per-cue 缓动覆盖（enterEasing / exitEasing / easing）。
 */
function resolveAnimationStyle(
  frame: number,
  cue: ElementCue,
  fps: number,
): React.CSSProperties {
  const style: React.CSSProperties = {
    zIndex: cue.zIndex,
    opacity: cue.opacityRange?.[0] ?? 1,
    transformOrigin: cue.transformOrigin ?? '50% 50%',
  };

  const localFrame = Math.max(0, frame);
  const springConfig = cue.springPreset
    ? {
        damping: cue.enterSpringDamping ?? SPRING_PRESET_MAP[cue.springPreset].damping,
        stiffness: cue.enterSpringStiffness ?? SPRING_PRESET_MAP[cue.springPreset].stiffness,
        mass: cue.enterSpringMass ?? SPRING_PRESET_MAP[cue.springPreset].mass ?? 1,
      }
    : SPRING_PRESET_MAP[defaultSpringPreset];

  const enterEasing = cue.enterEasing ?? cue.easing ?? undefined;

  // ── 入场动画 ──
  if (localFrame < cue.enterAtFrame + cue.enterDuration) {
    const enterProgress = localFrame - cue.enterAtFrame;
    const rawT = Math.max(0, enterProgress) / Math.max(cue.enterDuration, 1);
    const t = applyEasingFn(rawT, enterEasing);

    switch (cue.enterAnimation) {
      case 'spring': {
        const s = spring({
          fps,
          frame: Math.max(0, enterProgress),
          config: springConfig,
        });
        style.opacity = s;
        if (cue.enterFrom === 'bottom') {
          style.transform = `translate3d(0, ${(1 - s) * 60}px, 0)`;
        } else if (cue.enterFrom === 'top') {
          style.transform = `translate3d(0, ${(s - 1) * 60}px, 0)`;
        } else if (cue.enterFrom === 'left') {
          style.transform = `translate3d(${(s - 1) * 80}px, 0, 0)`;
        } else if (cue.enterFrom === 'right') {
          style.transform = `translate3d(${(1 - s) * 80}px, 0, 0)`;
        } else if (cue.enterFrom === 'center') {
          style.transform = `scale(${s})`;
        }
        style.opacity = Math.min(1, s * 1.1);
        break;
      }

      case 'burst': {
        const initial = cue.initialScale ?? 0.5;
        const final = cue.finalScale ?? 1.0;
        const burstScale = interpolate(t, [0, 0.5, 1], [initial, final * 1.2, final], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        style.transform = `scale(${burstScale})`;
        style.opacity = interpolate(t, [0, 0.15, 1], [0, 1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        break;
      }

      case 'slide': {
        const slideProgress = t;
        if (cue.enterFrom === 'bottom') {
          style.transform = `translate3d(0, ${(1 - slideProgress) * 80}px, 0)`;
        } else if (cue.enterFrom === 'top') {
          style.transform = `translate3d(0, ${(slideProgress - 1) * 80}px, 0)`;
        } else if (cue.enterFrom === 'left') {
          style.transform = `translate3d(${(slideProgress - 1) * 100}px, 0, 0)`;
        } else if (cue.enterFrom === 'right') {
          style.transform = `translate3d(${(1 - slideProgress) * 100}px, 0, 0)`;
        }
        style.opacity = slideProgress;
        break;
      }

      case 'fade': {
        style.opacity = t;
        break;
      }

      case 'scale': {
        const scaleProgress = interpolate(t, [0, 1], [cue.initialScale ?? 0.8, cue.finalScale ?? 1.0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        style.transform = `scale(${scaleProgress})`;
        style.opacity = interpolate(t, [0, 0.3, 1], [0, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        break;
      }

      case 'flip': {
        style.transform = `perspective(800px) rotateX(${(1 - t) * 90}deg)`;
        style.opacity = interpolate(t, [0, 0.2, 1], [0, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        break;
      }
    }
  } else {
    // ── 入场完成后的稳态 ──
    style.opacity = 1;

    // ── 退场动画 ──
    if (cue.exitAtFrame !== undefined && localFrame >= cue.exitAtFrame) {
      const exitProgress = localFrame - cue.exitAtFrame;
      const exitDuration = cue.exitDuration ?? 8;
      const rawExitT = exitProgress / Math.max(exitDuration, 1);
      const exitT = applyEasingFn(rawExitT, cue.exitEasing ?? cue.easing ?? undefined);

      if (cue.exitAnimation === 'fade') {
        style.opacity = 1 - exitT;
      } else if (cue.exitAnimation === 'slide') {
        const dir = cue.exitTo ?? 'bottom';
        if (dir === 'bottom') style.transform = `translate3d(0, ${exitT * 60}px, 0)`;
        else if (dir === 'top') style.transform = `translate3d(0, ${-exitT * 60}px, 0)`;
        else if (dir === 'left') style.transform = `translate3d(${-exitT * 80}px, 0, 0)`;
        else if (dir === 'right') style.transform = `translate3d(${exitT * 80}px, 0, 0)`;
        style.opacity = 1 - exitT;
      } else if (cue.exitAnimation === 'scale') {
        style.transform = `scale(${interpolate(exitT, [0, 1], [1, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`;
        style.opacity = 1 - exitT;
      } else if (cue.exitAnimation === 'burst') {
        const burstExit = interpolate(exitT, [0, 0.5, 1], [1, 1.15, 0.3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        style.transform = `scale(${burstExit})`;
        style.opacity = 1 - exitT * 0.8;
      }
    }

    // ── 循环动画 ──
    if (cue.loopAnimation && cue.loopAnimation !== 'none') {
      const loopFrame = localFrame - (cue.exitAtFrame ?? localFrame);
      const baseTransform = style.transform ?? '';

      switch (cue.loopAnimation) {
        case 'float': {
          const floatY = Math.sin(loopFrame / 12) * 6;
          style.transform = `${baseTransform} translateY(${floatY}px)`;
          break;
        }
        case 'pulse': {
          const pulse = 1 + Math.sin(loopFrame / 8) * 0.04;
          style.transform = `${baseTransform} scale(${pulse})`;
          break;
        }
        case 'drift': {
          const driftX = Math.sin(loopFrame / 30) * 8;
          const driftY = Math.cos(loopFrame / 25) * 4;
          style.transform = `${baseTransform} translate3d(${driftX}px, ${driftY}px, 0)`;
          break;
        }
      }
    }

    // 应用 opacityRange 最终值
    if (cue.opacityRange?.[1] !== undefined) {
      style.opacity = (style.opacity as number ?? 1) * cue.opacityRange[1];
    }
  }

  // 应用 opacityRange 起始值（入场阶段）
  if (cue.opacityRange && localFrame < cue.enterAtFrame + cue.enterDuration) {
    const enterRaw = Math.max(0, localFrame - cue.enterAtFrame) / Math.max(cue.enterDuration, 1);
    const enterT = applyEasingFn(enterRaw, enterEasing);
    const rangeOpacity = interpolate(enterT, [0, 1], [cue.opacityRange[0], cue.opacityRange[1] ?? 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    style.opacity = (style.opacity as number ?? 1) * rangeOpacity;
  }

  return style;
}

// ══════════════════════════════════════════════════════════════════
// 缓动函数工具
// ══════════════════════════════════════════════════════════════════

/**
 * 应用缓动函数到进度值 t [0, 1]。
 * 当 easing 为 undefined 或 'linear' 时返回 t 本身。
 */
function applyEasingFn(t: number, easing?: EasingFunction): number {
  if (!easing || easing === 'linear' || easing === 'spring') return t;
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}
