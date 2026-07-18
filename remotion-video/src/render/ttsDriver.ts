/**
 * ttsDriver.ts — TTS 动态编排模块（Phase 3）
 *
 * 将 TTS 音频段与 AdaptiveIntent 融合，产生帧级驱动参数。
 *
 * 依赖：
 *   - types/director.ts 中的 AdaptiveIntent（Phase 2 产出）
 *
 * 纯函数，无副作用。
 * 所有类型显式定义，假设 fps=30。
 */

import type {AdaptiveIntent} from '../types/director';

// ── 常量 ──

/** 默认帧率 */
const FPS = 30;

/** 段间间隙（秒） */
const INTER_SEGMENT_GAP = 0.5;

/** 末尾淡出（秒） */
const FADE_OUT_DURATION = 0.3;

/** 短促内容判断阈值（秒）—— 平均段长低于此值属于"短促" */
const SHORT_CONTENT_THRESHOLD = 0.5;

/** 舒缓内容判断阈值（秒）—— 平均段长高于此值属于"舒缓" */
const LONG_CONTENT_THRESHOLD = 1.5;

/** 短促内容：spacing 缩放因子 */
const SHORT_SPACING_SCALE = 0.9;

/** 短促内容：padding 缩放因子 */
const SHORT_PADDING_SCALE = 0.9;

/** 舒缓内容：spacing 缩放因子 */
const LONG_SPACING_SCALE = 1.1;

/** 舒缓内容：padding 缩放因子 */
const LONG_PADDING_SCALE = 1.05;

// ── 接口定义 ──

export interface TTSAudioSegment {
  /** 唯一标识 */
  id: string;
  /** 文本内容 */
  text: string;
  /** 语音时长（秒） */
  duration: number;
  /** 归一化波形 0-1，可选 */
  waveform?: number[];
  /** 波形峰值出现时间（秒） */
  peakTime: number;
  /** Remotion 起始帧 */
  startFrame: number;
  /** Remotion 持续帧 */
  durationInFrames: number;
}

export interface TTSDriveResult {
  /** 融合后的 AdaptiveIntent（peakFrame / totalDuration 已填充） */
  intent: AdaptiveIntent;
  /** 每个 segment 的逐段信息 */
  segments: Array<{
    id: string;
    text: string;
    /** 该 segment 在总时长中的归一化位置 0-1 */
    normalizedStart: number;
    normalizedEnd: number;
  }>;
}

export interface SceneWithDuration {
  id: string;
  durationInFrames: number;
  grammar?: {
    archetype?: string;
  };
}

// ── 辅助函数 ──

/**
 * 计算 TTS 总时长 = 各段语音时长之和 + 间隙 + 淡出。
 */
function computeTotalDuration(segments: TTSAudioSegment[]): number {
  if (segments.length === 0) {
    return 0;
  }

  const speechDuration = segments.reduce(
    (sum, seg) => sum + seg.duration,
    0,
  );
  return speechDuration + INTER_SEGMENT_GAP + FADE_OUT_DURATION;
}

/**
 * 计算所有 segment 的平均时长（秒）。
 */
function computeAverageDuration(segments: TTSAudioSegment[]): number {
  if (segments.length === 0) {
    return 0;
  }

  return segments.reduce((sum, seg) => sum + seg.duration, 0) / segments.length;
}

/**
 * 将持续时间（秒）转换为帧数。
 */
function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

/**
 * 构建 segments 的归一化位置信息。
 * normalizedStart / normalizedEnd 范围 0-1，基于总时长。
 */
function buildSegmentPositions(
  segments: TTSAudioSegment[],
  totalDuration: number,
): TTSDriveResult['segments'] {
  if (segments.length === 0 || totalDuration <= 0) {
    return [];
  }

  let cursor = 0;

  return segments.map((seg) => {
    const normalizedStart = cursor / totalDuration;
    const segmentEndInSeconds = cursor + seg.duration;
    const normalizedEnd = segmentEndInSeconds / totalDuration;
    cursor = segmentEndInSeconds + INTER_SEGMENT_GAP;

    return {
      id: seg.id,
      text: seg.text,
      normalizedStart: Math.min(normalizedStart, 1),
      normalizedEnd: Math.min(normalizedEnd, 1),
    };
  });
}

/**
 * 根据平均段长调整 AdaptiveIntent 的密度参数。
 *
 * - 短促内容（avgDuration < 0.5s）：spacing *= 0.9, padding *= 0.9
 * - 舒缓内容（avgDuration > 1.5s）：spacing *= 1.1, padding *= 1.05
 */
function applyContentBasedDensityAdjustment(
  intent: AdaptiveIntent,
  avgDuration: number,
): AdaptiveIntent {
  if (avgDuration < SHORT_CONTENT_THRESHOLD) {
    return {
      ...intent,
      density: {
        ...intent.density,
        padding: intent.density.padding * SHORT_PADDING_SCALE,
        spacing: intent.density.spacing * SHORT_SPACING_SCALE,
      },
    };
  }

  if (avgDuration > LONG_CONTENT_THRESHOLD) {
    return {
      ...intent,
      density: {
        ...intent.density,
        padding: intent.density.padding * LONG_PADDING_SCALE,
        spacing: intent.density.spacing * LONG_SPACING_SCALE,
      },
    };
  }

  return intent;
}

// ── 核心函数 ──

/**
 * 将 TTS segments 与 AdaptiveIntent 融合。
 *
 * 逻辑：
 * 1. totalDuration = 各段语音时长之和 + 0.5s 间隙 + 0.3s 淡出
 * 2. peakFrame = 首个 segment 的 peakTime * 30 (fps=30)
 * 3. 若 avgDuration < 0.5s（短促内容）：spacing *= 0.9, padding *= 0.9
 * 4. 若 avgDuration > 1.5s（舒缓内容）：spacing *= 1.1, padding *= 1.05
 *
 * @param baseIntent - 基础 AdaptiveIntent（来自导演编排）
 * @param ttsSegments - TTS 音频段数组
 * @returns 融合后的 TTSDriveResult
 */
export function mergeTTSWithIntent(
  baseIntent: AdaptiveIntent,
  ttsSegments: TTSAudioSegment[],
): TTSDriveResult {
  // ── 边界情况：空数组直接返回 baseIntent ──
  if (!ttsSegments || ttsSegments.length === 0) {
    return {
      intent: baseIntent,
      segments: [],
    };
  }

  // ── 计算总时长 ──
  const totalDuration = computeTotalDuration(ttsSegments);

  // ── 计算 peakFrame（首个 segment 的 peakTime * fps）──
  const firstSegment = ttsSegments[0];
  const peakFrame = secondsToFrames(firstSegment.peakTime);

  // ── 构建合并后的 intent ──
  let mergedIntent: AdaptiveIntent = {
    ...baseIntent,
    energy: {
      ...baseIntent.energy,
      peakFrame,
    },
    totalDuration,
  };

  // ── 根据平均段长调整密度参数 ──
  const avgDuration = computeAverageDuration(ttsSegments);
  mergedIntent = applyContentBasedDensityAdjustment(mergedIntent, avgDuration);

  // ── 构建 segment 位置信息 ──
  const segments = buildSegmentPositions(ttsSegments, totalDuration);

  return {
    intent: mergedIntent,
    segments,
  };
}

/**
 * 场景级别的 TTS 编排 — 将 TTS 数据分配到各个场景。
 *
 * 输入：场景列表 + 全局 TTS segments
 * 输出：每个场景对应的 AdaptiveIntent（含场景内 peakFrame）
 *
 * 场景分配逻辑：
 * - 按场景的 durationInFrames 占总帧数的比例分配 TTS segments
 * - 每段 TTS 的 startFrame 决定它属于哪个场景
 *
 * @param scenes - 场景列表，每个场景包含 id、durationInFrames 和可选的 grammar
 * @param baseIntents - 场景 ID 到 AdaptiveIntent 的映射
 * @param ttsSegments - 全局 TTS 音频段数组
 * @param fps - 帧率（默认 30）
 * @returns 场景 ID 到融合后 AdaptiveIntent 的映射
 */
export function orchestrateScenesWithTTS(
  scenes: SceneWithDuration[],
  baseIntents: Map<string, AdaptiveIntent>,
  ttsSegments: TTSAudioSegment[],
  fps: number = FPS,
): Map<string, AdaptiveIntent> {
  const result = new Map<string, AdaptiveIntent>();

  // ── 边界情况：无场景或空 intents ──
  if (!scenes || scenes.length === 0) {
    return result;
  }

  // ── 边界情况：无 TTS segments，直接返回 baseIntents ──
  if (!ttsSegments || ttsSegments.length === 0) {
    scenes.forEach((scene) => {
      const baseIntent = baseIntents.get(scene.id);
      if (baseIntent) {
        result.set(scene.id, {...baseIntent});
      }
    });
    return result;
  }

  // ── 构建场景帧范围索引 ──
  const sceneFrameRanges: Array<{
    id: string;
    startFrame: number;
    endFrame: number;
  }> = [];
  let globalCursor = 0;

  for (const scene of scenes) {
    sceneFrameRanges.push({
      id: scene.id,
      startFrame: globalCursor,
      endFrame: globalCursor + scene.durationInFrames,
    });
    globalCursor += scene.durationInFrames;
  }

  // ── 将 TTS segments 分配到各个场景 ──
  const segmentsByScene = new Map<string, TTSAudioSegment[]>();

  for (const seg of ttsSegments) {
    const belongingScene = sceneFrameRanges.find(
      (range) => seg.startFrame >= range.startFrame && seg.startFrame < range.endFrame,
    );

    if (belongingScene) {
      if (!segmentsByScene.has(belongingScene.id)) {
        segmentsByScene.set(belongingScene.id, []);
      }
      segmentsByScene.get(belongingScene.id)!.push(seg);
    }
  }

  // ── 对每个场景执行 TTS 融合 ──
  for (const scene of scenes) {
    const baseIntent = baseIntents.get(scene.id);
    const sceneSegments = segmentsByScene.get(scene.id) ?? [];

    if (!baseIntent) {
      // 场景没有 baseIntent，跳过
      continue;
    }

    const merged = mergeTTSWithIntent(baseIntent, sceneSegments);
    result.set(scene.id, merged.intent);
  }

  return result;
}
