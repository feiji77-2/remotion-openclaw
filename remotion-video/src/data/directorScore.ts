/**
 * directorScore.ts — 导演总谱类型系统
 *
 * DirectorScore 是"导演总谱"类型系统，在现有 ShotGrammar（叙事意图）
 * 和 FamilyRegistry（节奏配置）之上新增元素级编排层。
 *
 * 核心思路：
 *   1. DirectorScore 是纯 JSON 数据格式（非运行时状态）
 *   2. scoreToSequences() 编译为 SequenceConfig[] 树 → 可直接渲染为 <Sequence> 嵌套
 *   3. shotScoreToGrammar() 向下稀释为 ResolvedShotGrammar 形状（向后兼容）
 *   4. 所有帧偏移为绝对帧号，编译时转为相对偏移
 *
 * ─── 数据流 ───
 *   DirectorScore (JSON)
 *     → scoreToSequences() → SequenceConfig[] 树
 *       → DirectorScoreOrchestrator → <Sequence> 嵌套树
 *     → shotScoreToGrammar() → ResolvedShotGrammar 形状
 *       → 现有 TransitionSeries 路径（向后兼容）
 *
 * @packageDocumentation
 */

import type {CameraMotionPreset} from './registry';

// ================================================================
// 1. Energy / Act Level
// ================================================================

/** 能量等级 */
export type EnergyLevel = 'explosive' | 'high' | 'moderate' | 'calm';

/** 能量曲线：描述整片或单幕的能量变化弧 */
export interface EnergyCurve {
  /** 每一幕的能量等级，长度必须匹配 acts.length */
  perAct: EnergyLevel[];
  /** 能量弧的文字描述，如"渐进攀升，第二幕达到峰值" */
  description: string;
}

// ================================================================
// 2. DirectorScore — 顶级总谱
// ================================================================

/**
 * 导演总谱 — 整条视频的编排蓝图。
 * 包含多幕结构、每幕的镜头编排、摄像机路径、元素级动画 cue。
 */
export interface DirectorScore {
  /** 总谱 ID */
  id: string;
  /** 总帧数 */
  totalFrames: number;
  /** 帧率（默认 30） */
  fps: number;
  /** 幕列表 */
  acts: ActBlock[];
  /** 全局能量曲线 */
  globalEnergy: EnergyCurve;
  /** 导演注释：节奏、风格、注意事项 */
  directorNotes: string;
}

// ================================================================
// 3. ActBlock — 幕结构
// ================================================================

/**
 * 一幕 — 构成叙事弧的一个逻辑段落。
 * 如"同步爆发"、"模块展开"、"收尾"。
 */
export interface ActBlock {
  /** 幕 ID */
  actId: string;
  /** 幕标题，如"同步爆发" */
  label: string;
  /** 起始帧（绝对帧号） */
  fromFrame: number;
  /** 持续帧数 */
  durationInFrames: number;
  /** 能量等级 */
  energy: EnergyLevel;
  /** 本幕包含的镜头 */
  shots: ShotScore[];
}

// ================================================================
// 4. ShotScore — 镜头编排
// ================================================================

/**
 * 镜头编排 — 单个镜头的完整编排说明。
 * 包含：摄像机路径、元素动画 cue、叙事语法提示（向后兼容）。
 */
export interface ShotScore {
  /** 镜头 ID，用于与场景匹配 */
  shotId: string;
  /** 起始帧（绝对帧号） */
  fromFrame: number;
  /** 持续帧数 */
  durationInFrames: number;
  /** 摄像机运动路径 */
  cameraPath: CameraPathCue[];
  /** 摄像机模式：preset 使用 CameraDirector，exact 逐帧插值 */
  cameraMode?: CameraMode;
  /** 场景过渡预设 */
  transitionPreset?: ShotTransitionPreset;
  /** 元素动画 cue 列表 */
  cues: ElementCue[];
  /** 时间线标记（调试/可视化用） */
  timelineMarkers?: TimelineMarker[];
  // ── 向后兼容：叙事语法提示 ──
  /** ShotArchetype 提示（如 'lock-on reveal'） */
  archetypeHint?: string;
  /** CameraIntent 提示（如 'pin'） */
  cameraIntentHint?: string;
  /** DataEventVerb 提示（如 'count-up'） */
  dataEventHint?: string;
}

// ================================================================
// 5. ElementCue — 元素级动画规范
// ================================================================

/** 元素类型 */
export type ElementType = 'text' | 'shape' | 'image' | 'icon' | 'container' | 'path';

/** 入场方向/方式 */
export type EnterFrom =
  | 'center'    // 从中心放大
  | 'left'      // 从左侧滑入
  | 'right'     // 从右侧滑入
  | 'top'       // 从顶部滑入
  | 'bottom'    // 从底部滑入
  | 'fade'      // 淡入
  | 'scale';    // 缩放进入

/** 入场动画类型 */
export type EnterAnimation =
  | 'spring'    // 弹簧弹性
  | 'burst'     // 爆发（过冲后回弹）
  | 'slide'     // 滑动
  | 'fade'      // 淡入
  | 'scale'     // 缩放
  | 'flip';     // 翻转

/** 退场方向/方式 */
export type ExitTo =
  | 'left' | 'right' | 'top' | 'bottom'
  | 'fade' | 'scale';

/** 退场动画类型 */
export type ExitAnimation =
  | 'fade' | 'slide' | 'scale' | 'burst';

/** 持续循环动画 */
export type LoopAnimation =
  | 'float'     // 上下浮动
  | 'pulse'     // 脉动缩放
  | 'drift'     // 漂移
  | 'none';     // 无循环

/** Spring 预设标签 */
export type SpringPresetLabel =
  | 'snappy'
  | 'smooth'
  | 'bouncy'
  | 'heavy';

/** 缓动函数类型 */
export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring';

/** 摄像机模式：预设（使用 CameraDirector）或精确（逐帧插值） */
export type CameraMode = 'preset' | 'exact';

/** 元素渲染方式 */
export type RenderMode = 'div' | 'svg' | 'canvas';

/** 导演效果预设 */
export type EffectPreset =
  | 'ghost-title'      // 幽灵标题水印
  | 'burst-particles'  // 爆发粒子
  | 'trace-path'       // 路径追踪
  | 'race-bars'        // 赛跑柱状图
  | 'pin-frame'        // 别针边框
  | 'morph-diagram'    // 图表变形
  | 'parallax'         // 视差层
  | 'kinetic-typo'     // 动态文字
  | 'none';

/** 场景过渡预设 */
export type ShotTransitionPreset =
  | 'fade'
  | 'lift'
  | 'slide'
  | 'wipe'
  | 'flip'
  | 'clock-wipe'
  | 'none';

/**
 * 元素动画 cue — 描述单个元素的完整动画生命周期。
 * 所有帧偏移相对**所属镜头**的起始。
 */
export interface ElementCue {
  /** 元素 ID，用于在 renderMap 中查找对应的 ReactNode */
  elementId: string;
  /** 元素类型 */
  type: ElementType;
  /** 渲染方式（默认 div） */
  renderAs?: RenderMode;

  // ── 入场 ──
  /** 入场起始帧（相对镜头起始） */
  enterAtFrame: number;
  /** 入场来源方向 */
  enterFrom: EnterFrom;
  /** 入场动画类型 */
  enterAnimation: EnterAnimation;
  /** 入场持续帧数 */
  enterDuration: number;
  /** 入场缓动函数（覆盖 easing 通用设置） */
  enterEasing?: EasingFunction;
  /** 入场自定义弹簧阻尼（默认由 springPreset 决定） */
  enterSpringDamping?: number;
  /** 入场自定义弹簧刚度 */
  enterSpringStiffness?: number;
  /** 入场自定义弹簧质量 */
  enterSpringMass?: number;

  // ── 退场（可选） ──
  /** 退场起始帧（相对镜头起始，省略则不退场） */
  exitAtFrame?: number;
  /** 退场目标方向 */
  exitTo?: ExitTo;
  /** 退场动画类型 */
  exitAnimation?: ExitAnimation;
  /** 退场持续帧数 */
  exitDuration?: number;
  /** 退场缓动函数（覆盖 easing 通用设置） */
  exitEasing?: EasingFunction;

  // ── 循环动画（入场完成后持续） ──
  /** 入场完成后的持续循环动画 */
  loopAnimation?: LoopAnimation;

  // ── 动画参数 ──
  /** 通用缓动函数（可被 enterEasing/exitEasing 覆盖） */
  easing?: EasingFunction;
  /** 起始缩放（如 burst 从 0.5 开始） */
  initialScale?: number;
  /** 最终缩放（如 burst 稳定到 1.0） */
  finalScale?: number;
  /** Spring 预设 */
  springPreset?: SpringPresetLabel;
  /** Transform origin，如 "50% 50%" */
  transformOrigin?: string;
  /** 层叠顺序 */
  zIndex?: number;
  /** 透明度范围 [起始, 结束] */
  opacityRange?: [number, number];

  // ── SVG 路径追踪 ──
  /** SVG path d 属性（仅 type='path' 时生效） */
  pathD?: string;
  /** 路径描边颜色 */
  pathColor?: string;
  /** 路径描边宽度 */
  pathWidth?: number;
  /** 路径填充色（默认 'none'） */
  pathFill?: string;
  /** 路径绘制持续帧数（默认 = enterDuration） */
  pathDuration?: number;
  /** 路径追踪完成后是否保持 */
  pathKeepVisible?: boolean;

  // ── 导演效果集成 ──
  /** 效果预设（触发 UltimateDirectorEffects 对应的视觉层） */
  effectPreset?: EffectPreset;

  // ── 向后兼容 ──
  /** 元素级叙事语法覆盖 */
  grammarOverride?: {
    dataEvent?: string;
    archetype?: string;
  };
}

// ================================================================
// 6. CameraPathCue — 摄像机运动关键帧
// ================================================================

/**
 * 摄像机路径关键帧 — 描述摄像机在镜头内的运动。
 * 引擎在两个关键帧之间插值产生平滑运动。
 */
export interface CameraPathCue {
  /** 帧偏移（相对镜头起始） */
  atFrame: number;
  /** 缩放（1.0 = 基准） */
  zoom: number;
  /** 水平偏移（px） */
  panX: number;
  /** 垂直偏移（px） */
  panY: number;
  /** 旋转角度（deg） */
  rotate?: number;
  /** 缓动函数 */
  easing?: EasingFunction;
}

// ================================================================
// 6. TimelineMarker — 时间线标记
// ================================================================

/** 时间线标记（调试/可视化用） */
export interface TimelineMarker {
  /** 帧偏移（相对镜头起始） */
  atFrame: number;
  /** 标记标签 */
  label: string;
  /** 标记类型 */
  type: 'event' | 'emphasis' | 'transition' | 'debug';
  /** 标记颜色 */
  color?: string;
}

// ================================================================
// 8. SequenceConfig — 编译目标
// ================================================================

/**
 * Sequence 编译配置 — scoreToSequences() 的输出。
 * 直接映射到 Remotion <Sequence from={} durationInFrames={}> 组件。
 *
 * 注意：from 是**相对父级**的偏移（Remotion 要求），
 * 编译时由 scoreToSequences 从绝对帧号转换。
 */
export interface SequenceConfig {
  /** 相对父级的起始帧偏移 */
  from: number;
  /** 持续帧数 */
  durationInFrames: number;
  /** 子 Sequence 列表 */
  children?: SequenceConfig[];
  /** 如果非空，此 Sequence 包裹特定元素 */
  elementId?: string;
  /** 元素动画参数（由 Orchestrator 消费） */
  animationParams?: ElementCue;
  /** 摄像机路径（由 Orchestrator 消费） */
  cameraPath?: CameraPathCue[];
  /** 摄像机模式：preset 使用 CameraDirector，exact 逐帧插值 */
  cameraMode?: CameraMode;
  /** 场景过渡预设 */
  transitionPreset?: ShotTransitionPreset;
  /** 向下兼容的叙事语法 */
  grammar?: {
    archetype: string;
    cameraIntent: string;
    dataEvent: string;
  };
}

// ================================================================
// 9. Validation
// ================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  shotId: string;
  elementId?: string;
  message: string;
}

// ─── Spring 预设配置映射 ──────────────────────────────────────────

export const SPRING_PRESET_MAP: Record<SpringPresetLabel, {damping: number; stiffness: number; mass?: number}> = {
  snappy: {damping: 20, stiffness: 180},
  smooth: {damping: 30, stiffness: 120},
  bouncy: {damping: 12, stiffness: 100, mass: 0.8},
  heavy: {damping: 40, stiffness: 60, mass: 1.2},
};

// ================================================================
// Engine: scoreToSequences — DirectorScore → SequenceConfig[]
// ================================================================

export interface ScoreToSequencesOptions {
  /** strict 模式在验证失败时 throw，compat 模式静默处理 */
  resolveMode?: 'strict' | 'compat';
  /** 帧率（用于插值计算） */
  fps?: number;
}

/**
 * 编译 DirectorScore 为 SequenceConfig 树。
 * 遍历所有 act → shot → cue，构建嵌套的 Sequence 结构。
 */
export function scoreToSequences(
  score: DirectorScore,
  options?: ScoreToSequencesOptions,
): SequenceConfig[] {
  const resolveMode = options?.resolveMode ?? 'compat';

  // 验证
  const validation = validateScore(score);
  if (!validation.valid && resolveMode === 'strict') {
    const msgs = validation.errors.map(e => `[${e.code}] ${e.shotId}: ${e.message}`).join('; ');
    throw new Error(`DirectorScore validation failed: ${msgs}`);
  }

  const result: SequenceConfig[] = [];

  for (const act of score.acts) {
    for (const shot of act.shots) {
      const seq = shotScoreToSequence(shot, act.fromFrame);
      result.push(seq);
    }
  }

  // 按 from 排序
  result.sort((a, b) => a.from - b.from);

  return result;
}

/**
 * 将单个 ShotScore 编译为 SequenceConfig（包含子元素 Sequence）。
 * parentOffset 是父级（act）的起始帧，用于计算相对偏移。
 */
export function shotScoreToSequence(
  shot: ShotScore,
  parentOffset: number,
): SequenceConfig {
  const grammar = shotScoreToGrammar(shot);

  const config: SequenceConfig = {
    from: shot.fromFrame - parentOffset,
    durationInFrames: shot.durationInFrames,
    cameraPath: shot.cameraPath.length > 0 ? shot.cameraPath : undefined,
    cameraMode: shot.cameraMode,
    transitionPreset: shot.transitionPreset,
    grammar,
  };

  if (shot.cues.length > 0) {
    const children: SequenceConfig[] = [];

    for (const cue of shot.cues) {
      // 计算持续帧数
      let duration: number;
      if (cue.exitAtFrame !== undefined && cue.exitDuration !== undefined) {
        duration = cue.exitAtFrame + cue.exitDuration - cue.enterAtFrame;
      } else {
        duration = shot.durationInFrames - cue.enterAtFrame;
      }

      // 确保最小持续帧数
      duration = Math.max(duration, 1);

      children.push({
        from: cue.enterAtFrame,
        durationInFrames: duration,
        elementId: cue.elementId,
        animationParams: cue,
      });
    }

    // 按 from 排序
    children.sort((a, b) => a.from - b.from);
    config.children = children;
  }

  return config;
}

// ================================================================
// Engine: shotScoreToGrammar — 向后兼容转换
// ================================================================

/**
 * 从 ShotScore 推导 ResolvedShotGrammar 形状。
 * 优先使用 hint 字段，其次从 cues 和 cameraPath 推导。
 */
export function shotScoreToGrammar(shot: ShotScore): {
  archetype: string;
  cameraIntent: string;
  dataEvent: string;
  enterFrames: number;
  emphasisFrames: number;
  staggerGap: number;
} {
  // 从 hint 或 cues 推导 archetype
  const archetype = shot.archetypeHint ?? deriveArchetypeFromCues(shot.cues);

  // 从 hint 或 cameraPath 推导 cameraIntent
  const cameraIntent = shot.cameraIntentHint ?? deriveCameraIntent(shot.cameraPath);

  // 从 hint 或 cues 推导 dataEvent
  const dataEvent = shot.dataEventHint ?? deriveDataEventFromCues(shot.cues);

  // 从 cues 计算 enterFrames
  const maxEnterEnd = shot.cues.length > 0
    ? Math.max(...shot.cues.map(c => c.enterAtFrame + c.enterDuration))
    : 16;
  const enterFrames = Math.max(8, Math.min(maxEnterEnd, shot.durationInFrames - 4));

  // emphasisFrames = 剩余帧数 - 退场缓冲
  const emphasisFrames = Math.max(8, shot.durationInFrames - enterFrames - 8);

  // 计算平均 stagger gap
  const staggerGap = deriveStaggerGap(shot.cues);

  return {
    archetype,
    cameraIntent,
    dataEvent,
    enterFrames,
    emphasisFrames,
    staggerGap,
  };
}

// ================================================================
// Engine: interpolateCameraPath — 摄像机路径插值
// ================================================================

export interface CameraTransform {
  zoom: number;
  panX: number;
  panY: number;
  rotate: number;
}

/**
 * 将 CameraPathCue[] 关键帧数组编译为逐帧插值函数。
 * 返回 (frame: number) => CameraTransform。
 * 在边界外 clamp（前后端保持恒定）。
 */
export function interpolateCameraPath(
  path: CameraPathCue[],
  totalFrames: number,
): (frame: number) => CameraTransform {
  if (path.length === 0) {
    return () => ({zoom: 1, panX: 0, panY: 0, rotate: 0});
  }

  const sorted = [...path].sort((a, b) => a.atFrame - b.atFrame);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // 确保起始帧 = 0 和结束帧 = totalFrames 有关键帧
  const hasStart = sorted[0].atFrame === 0;
  const hasEnd = sorted[sorted.length - 1].atFrame >= totalFrames - 1;

  const extended = [...sorted];
  if (!hasStart) {
    extended.unshift({atFrame: 0, zoom: first.zoom, panX: first.panX, panY: first.panY, rotate: first.rotate ?? 0});
  }
  if (!hasEnd) {
    extended.push({atFrame: totalFrames - 1, zoom: last.zoom, panX: last.panX, panY: last.panY, rotate: last.rotate ?? 0});
  }

  return (frame: number): CameraTransform => {
    if (frame <= extended[0].atFrame) {
      return {zoom: extended[0].zoom, panX: extended[0].panX, panY: extended[0].panY, rotate: extended[0].rotate ?? 0};
    }
    if (frame >= extended[extended.length - 1].atFrame) {
      return {zoom: extended[extended.length - 1].zoom, panX: extended[extended.length - 1].panX, panY: extended[extended.length - 1].panY, rotate: extended[extended.length - 1].rotate ?? 0};
    }

    for (let i = 0; i < extended.length - 1; i++) {
      const a = extended[i];
      const b = extended[i + 1];
      if (frame >= a.atFrame && frame < b.atFrame) {
        const t = (frame - a.atFrame) / (b.atFrame - a.atFrame);
        const eased = applyEasing(t, b.easing ?? 'linear');
        return {
          zoom: lerp(a.zoom, b.zoom, eased),
          panX: lerp(a.panX, b.panX, eased),
          panY: lerp(a.panY, b.panY, eased),
          rotate: lerp(a.rotate ?? 0, b.rotate ?? 0, eased),
        };
      }
    }

    return {zoom: 1, panX: 0, panY: 0, rotate: 0};
  };
}

// ================================================================
// Engine: validateScore — 验证规则
// ================================================================

/**
 * 验证 DirectorScore 的完整性和正确性。
 * 包含 6 条规则：
 *   1. OVERLAPPING_CUES — 同一镜头内相同 elementId 的时间重叠
 *   2. OUT_OF_BOUNDS — 帧超出 totalFrames
 *   3. INCONSISTENT_DURATION — 幕与其镜头 duration 不匹配
 *   4. MISSING_REQUIRED — ElementCue 缺少必要字段
 *   5. ZERO_DURATION (warn) — enterDuration 或 exitDuration 为 0
 *   6. RAPID_ENTRY (warn) — enterDuration < 4 帧（30fps 下太快）
 */
export function validateScore(
  score: DirectorScore,
  _options?: {strict?: boolean},
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 逐幕验证
  for (const act of score.acts) {
    // 幕边界检查
    if (act.fromFrame + act.durationInFrames > score.totalFrames) {
      errors.push({
        code: 'OUT_OF_BOUNDS',
        shotId: act.actId,
        message: `Act "${act.actId}" 帧 ${act.fromFrame}-${act.fromFrame + act.durationInFrames} 超出 totalFrames (${score.totalFrames})`,
      });
    }

    for (const shot of act.shots) {
      // 镜头边界检查
      if (shot.fromFrame + shot.durationInFrames > score.totalFrames) {
        errors.push({
          code: 'OUT_OF_BOUNDS',
          shotId: shot.shotId,
          message: `Shot "${shot.shotId}" 帧 ${shot.fromFrame}-${shot.fromFrame + shot.durationInFrames} 超出 totalFrames (${score.totalFrames})`,
        });
      }

      // 镜头帧范围是否在幕内
      const shotEnd = shot.fromFrame + shot.durationInFrames;
      const actEnd = act.fromFrame + act.durationInFrames;
      if (shotEnd > actEnd) {
        warnings.push({
          code: 'INCONSISTENT_DURATION',
          shotId: shot.shotId,
          message: `Shot "${shot.shotId}" 持续到帧 ${shotEnd}，超出 Act "${act.actId}" 的结束帧 ${actEnd}`,
        });
      }

      // 检查元素 cue 重叠
      const seen = new Map<string, ElementCue[]>();
      for (const cue of shot.cues) {
        // 必要字段检查
        if (!cue.enterAnimation) {
          errors.push({
            code: 'MISSING_REQUIRED',
            shotId: shot.shotId,
            elementId: cue.elementId,
            message: `cue "${cue.elementId}" enterAnimation 是必需的`,
          });
        }

        // 零持续时间警告
        if (cue.enterDuration === 0) {
          warnings.push({
            code: 'ZERO_DURATION',
            shotId: shot.shotId,
            elementId: cue.elementId,
            message: `cue "${cue.elementId}" enterDuration 为 0`,
          });
        }

        // 太快警告
        if (cue.enterDuration > 0 && cue.enterDuration < 4) {
          warnings.push({
            code: 'RAPID_ENTRY',
            shotId: shot.shotId,
            elementId: cue.elementId,
            message: `cue "${cue.elementId}" enterDuration ${cue.enterDuration} 帧在 30fps 下太快（< 4帧）`,
          });
        }

        // 收集同 elementId 的 cue
        const existing = seen.get(cue.elementId) ?? [];
        existing.push(cue);
        seen.set(cue.elementId, existing);
      }

      // 检查重叠
      for (const [elementId, cues] of seen) {
        if (cues.length > 1) {
          // 检查时间范围是否重叠
          for (let i = 0; i < cues.length; i++) {
            for (let j = i + 1; j < cues.length; j++) {
              const a = cues[i];
              const b = cues[j];
              const aEnd = a.exitAtFrame !== undefined
                ? a.exitAtFrame + (a.exitDuration ?? 8)
                : shot.durationInFrames;
              const bEnd = b.exitAtFrame !== undefined
                ? b.exitAtFrame + (b.exitDuration ?? 8)
                : shot.durationInFrames;

              if (a.enterAtFrame < bEnd && b.enterAtFrame < aEnd) {
                errors.push({
                  code: 'OVERLAPPING_CUES',
                  shotId: shot.shotId,
                  elementId,
                  message: `elementId "${elementId}" 有重叠的 cue 在帧区间 [${a.enterAtFrame}-${aEnd}] 和 [${b.enterAtFrame}-${bEnd}]`,
                });
              }
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ================================================================
// Internal Helpers
// ================================================================

/** 线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 缓动函数映射 */
function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear':
    default:
      return t;
  }
}

/** 从 cues 推导 archetype */
function deriveArchetypeFromCues(cues: ElementCue[]): string {
  if (cues.length === 0) return 'lock-on reveal';

  // 如果有 burst 动画 → burst spread
  const hasBurst = cues.some(c => c.enterAnimation === 'burst');
  if (hasBurst) return 'burst spread';

  // 如果有 spring 动画 → drift reveal
  const hasSpring = cues.some(c => c.enterAnimation === 'spring');
  if (hasSpring) return 'drift reveal';

  // 如果多个元素交错 → bullet train
  if (cues.length > 2) return 'bullet train';

  return 'lock-on reveal';
}

/** 从 cameraPath 推导 cameraIntent */
function deriveCameraIntent(path: CameraPathCue[]): string {
  if (path.length === 0) return 'none';

  const first = path[0];
  const last = path[path.length - 1];

  const hasPanX = Math.abs(last.panX - first.panX) > 10;
  const hasPanY = Math.abs(last.panY - first.panY) > 10;
  const hasZoom = Math.abs(last.zoom - first.zoom) > 0.02;

  if (hasPanX) return 'drift';
  if (hasZoom && last.zoom > first.zoom) return 'reveal';
  if (hasPanY) return 'chase';

  return 'pin';
}

/** 从 cues 推导 dataEvent */
function deriveDataEventFromCues(cues: ElementCue[]): string {
  if (cues.length === 0) return 'none';

  const hasBurst = cues.some(c => c.enterAnimation === 'burst');
  if (hasBurst) return 'burst-spread';

  const hasSpring = cues.some(c => c.enterAnimation === 'spring');
  if (hasSpring) return 'settle';

  const hasScale = cues.some(c => c.enterAnimation === 'scale');
  if (hasScale) return 'count-up';

  return 'flash';
}

/** 从 cues 计算 stagger gap */
function deriveStaggerGap(cues: ElementCue[]): number {
  if (cues.length <= 1) return 0;

  // 计算相邻 cue 的 enterAtFrame 间隔，取平均值
  const sorted = [...cues].sort((a, b) => a.enterAtFrame - b.enterAtFrame);
  let totalGap = 0;
  let count = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].enterAtFrame - sorted[i - 1].enterAtFrame;
    if (gap > 0) {
      totalGap += gap;
      count++;
    }
  }

  return count > 0 ? Math.round(totalGap / count) : 0;
}

// ================================================================
// CameraDirector 集成：路径 → 预设映射
// ================================================================

/**
 * CameraMotionPreset 映射表。
 * 与 CameraDirector.tsx 的 7 个预设对应。
 * 类型定义来自 registry.ts — 此处仅重导出。
 */
export type {CameraMotionPreset};

/**
 * 将 CameraPathCue[] 转换为 CameraMotionPreset。
 * 用于 preset 模式下委托给 CameraDirector 组件。
 * 规则：检测 first→last 之间的变化量，选择最匹配的预设。
 * 如果路径长度 < 2 或无明显变化，返回 'none'。
 */
export function cameraPathToPreset(path: CameraPathCue[]): CameraMotionPreset {
  if (path.length < 2) return 'none';

  const sorted = [...path].sort((a, b) => a.atFrame - b.atFrame);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const dZoom = Math.abs(last.zoom - first.zoom);
  const dPanX = Math.abs(last.panX - first.panX);
  const dPanY = Math.abs(last.panY - first.panY);
  const dRotate = Math.abs((last.rotate ?? 0) - (first.rotate ?? 0));

  // 纯缩放
  if (dZoom > 0.03 && dPanX < 30 && dPanY < 30) {
    return last.zoom > first.zoom ? 'push-in' : 'none';
  }

  // 水平平移
  if (dPanX > 30 && dPanY < 30) {
    return 'pan-x';
  }

  // 垂直平移
  if (dPanY > 30 && dPanX < 30) {
    return 'pan-y';
  }

  // 缩放 + 平移 → zoom-pulse
  if (dZoom > 0.02 && (dPanX > 20 || dPanY > 20)) {
    return 'zoom-pulse';
  }

  // 旋转 → growth
  if (dRotate > 5) {
    return 'growth';
  }

  // 小幅度漂移
  if (dPanX > 10 || dPanY > 10) {
    return 'drift';
  }

  return 'none';
}
