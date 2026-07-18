/**
 * adaptiveCoefficients.ts — 自适应系数系统
 *
 * 将 12 种 ShotArchetype 映射到连续值系数 (AdaptiveIntent)，
 * 再叠加平台适配与内容自适应，最终输出 family 组件可消费的导演元数据。
 *
 * 调用链：
 *   computeAdaptiveIntent(archetype, context?)
 *     → archetypeToAdaptiveBase(archetype)        // 镜头原型基线
 *     → applyPlatformAdaptation(base, platform)   // 平台适配
 *     → applyContentAdaptation(... , ctx)         // 内容自适应
 *
 * 所有系数均为相对基线 (1.0 = 中性) 的连续值。
 */

import type {
  AdaptiveIntent,
  FamilyContext,
} from '../types/director';

// ─── 12 种 Archetype 基线系数 ──────────────────────────────────────────────

/**
 * 将镜头原型名称映射到自适应系数基线。
 *
 * 系数设计原则：
 *   - 对比度：决定视觉冲击力 — lock-on / threshold 高，aftershock / compress 低
 *   - 能量：决定动画力度 — burst / bullet-train 高，aftershock / compress 低
 *   - 密度：决定信息密度 — burst 疏松，compress / lock-on 紧凑
 *   - 高亮色：每个 archetype 有语义关联的记忆色
 *   - 视差：反映镜头运动语义 — drift 上浮，overtake 横移，burst 膨胀
 */
export function archetypeToAdaptiveBase(archetype: string): AdaptiveIntent {
  switch (archetype) {
    // ── lock-on reveal：信息锁定，高对比高能量，紧凑 ──
    case 'lock-on reveal':
      return {
        density: {padding: 0.85, spacing: 0.85, scale: 0.95},
        contrast: {sizeRatio: 1.15, weightRatio: 1.20, opacityRatio: 1.10},
        energy: {duration: 1.00, bounce: 0.80, intensity: 1.20},
        entryEvent: {type: 'pin', stagger: 0, direction: 'center'},
        parallax: {offsetX: 0, offsetY: 0, scale: 1.00},
        highlight: {color: '#FFD700', glowIntensity: 0.80, weight: 'bold'},
      };

    // ── pressure countdown：数字冲击，高能量 ──
    case 'pressure countdown':
      return {
        density: {padding: 0.90, spacing: 1.00, scale: 1.05},
        contrast: {sizeRatio: 1.20, weightRatio: 1.30, opacityRatio: 1.15},
        energy: {duration: 1.10, bounce: 0.90, intensity: 1.30},
        entryEvent: {type: 'count-up', stagger: 4, direction: 'down'},
        parallax: {offsetX: 0, offsetY: -2, scale: 1.05},
        highlight: {color: '#FF4500', glowIntensity: 0.90, weight: 'bold'},
      };

    // ── overtake race：竞速追赶，横向动能 ──
    case 'overtake race':
      return {
        density: {padding: 0.95, spacing: 1.00, scale: 1.00},
        contrast: {sizeRatio: 1.10, weightRatio: 1.15, opacityRatio: 1.05},
        energy: {duration: 1.15, bounce: 1.10, intensity: 1.20},
        entryEvent: {type: 'overtake', stagger: 6, direction: 'right'},
        parallax: {offsetX: -3, offsetY: 0, scale: 1.10},
        highlight: {color: '#FF8C00', glowIntensity: 0.70, weight: 'bold'},
      };

    // ── evidence pin：证据钉入，稳定扎实 ──
    case 'evidence pin':
      return {
        density: {padding: 0.90, spacing: 0.95, scale: 0.95},
        contrast: {sizeRatio: 1.05, weightRatio: 1.10, opacityRatio: 1.05},
        energy: {duration: 0.90, bounce: 0.70, intensity: 1.00},
        entryEvent: {type: 'pin', stagger: 0, direction: 'center'},
        parallax: {offsetX: 0, offsetY: 0, scale: 1.00},
        highlight: {color: '#00BFFF', glowIntensity: 0.60, weight: 'bold'},
      };

    // ── threshold breach：阈值突破，高冲击 ──
    case 'threshold breach':
      return {
        density: {padding: 1.00, spacing: 1.00, scale: 1.10},
        contrast: {sizeRatio: 1.25, weightRatio: 1.30, opacityRatio: 1.20},
        energy: {duration: 1.20, bounce: 1.30, intensity: 1.40},
        entryEvent: {type: 'threshold-cross', stagger: 8, direction: 'up'},
        parallax: {offsetX: 0, offsetY: -3, scale: 1.15},
        highlight: {color: '#FF00FF', glowIntensity: 1.00, weight: 'bold'},
      };

    // ── aftershock hold：余韵停留，低能量 ──
    case 'aftershock hold':
      return {
        density: {padding: 0.95, spacing: 1.10, scale: 0.90},
        contrast: {sizeRatio: 0.85, weightRatio: 0.90, opacityRatio: 0.80},
        energy: {duration: 0.80, bounce: 0.30, intensity: 0.60},
        entryEvent: {type: 'settle', stagger: 0, direction: 'center'},
        parallax: {offsetX: 0, offsetY: 0, scale: 0.95},
        highlight: {color: '#E2E8F0', glowIntensity: 0.30, weight: 'normal'},
      };

    // ── follow focus：追焦跟随 ──
    case 'follow focus':
      return {
        density: {padding: 1.00, spacing: 1.05, scale: 1.00},
        contrast: {sizeRatio: 1.00, weightRatio: 1.00, opacityRatio: 1.00},
        energy: {duration: 1.00, bounce: 0.80, intensity: 0.90},
        entryEvent: {type: 'trace-flow', stagger: 10, direction: 'left'},
        parallax: {offsetX: 0, offsetY: -2, scale: 1.05},
        highlight: {color: '#00CED1', glowIntensity: 0.50, weight: 'normal'},
      };

    // ── compress compare：压缩对比，低密度低能量 ──
    case 'compress compare':
      return {
        density: {padding: 0.80, spacing: 0.80, scale: 0.75},
        contrast: {sizeRatio: 0.90, weightRatio: 0.85, opacityRatio: 0.80},
        energy: {duration: 0.80, bounce: 0.30, intensity: 0.70},
        entryEvent: {type: 'delta-hit', stagger: 4, direction: 'left'},
        parallax: {offsetX: -2, offsetY: 0, scale: 0.90},
        highlight: {color: '#E2E8F0', glowIntensity: 0.30, weight: 'normal'},
      };

    // ── drift reveal：漂移浮现，中性基线 ──
    case 'drift reveal':
      return {
        density: {padding: 1.00, spacing: 1.00, scale: 1.00},
        contrast: {sizeRatio: 1.00, weightRatio: 1.00, opacityRatio: 1.00},
        energy: {duration: 1.00, bounce: 0.80, intensity: 0.90},
        entryEvent: {type: 'trace-flow', stagger: 8, direction: 'up'},
        parallax: {offsetX: 0, offsetY: 3, scale: 1.00},
        highlight: {color: '#00BFFF', glowIntensity: 0.50, weight: 'normal'},
      };

    // ── bullet train：子弹列车，高速连续 ──
    case 'bullet train':
      return {
        density: {padding: 0.85, spacing: 0.90, scale: 1.05},
        contrast: {sizeRatio: 1.15, weightRatio: 1.20, opacityRatio: 1.10},
        energy: {duration: 0.90, bounce: 1.20, intensity: 1.30},
        entryEvent: {type: 'count-up', stagger: 3, direction: 'right'},
        parallax: {offsetX: -4, offsetY: 0, scale: 1.10},
        highlight: {color: '#FFD700', glowIntensity: 0.90, weight: 'bold'},
      };

    // ── burst spread：爆发扩散，高密度高能量 ──
    case 'burst spread':
      return {
        density: {padding: 1.15, spacing: 1.15, scale: 1.20},
        contrast: {sizeRatio: 1.10, weightRatio: 1.05, opacityRatio: 1.10},
        energy: {duration: 1.20, bounce: 1.50, intensity: 1.30},
        entryEvent: {type: 'burst-spread', stagger: 6, direction: 'center'},
        parallax: {offsetX: 0, offsetY: 0, scale: 1.20},
        highlight: {color: '#FF6B6B', glowIntensity: 1.00, weight: 'bold'},
      };

    // ── trace flow：追溯流动 ──
    case 'trace flow':
      return {
        density: {padding: 1.00, spacing: 1.10, scale: 1.00},
        contrast: {sizeRatio: 0.95, weightRatio: 0.95, opacityRatio: 0.95},
        energy: {duration: 0.90, bounce: 0.70, intensity: 0.80},
        entryEvent: {type: 'trace-flow', stagger: 10, direction: 'left'},
        parallax: {offsetX: 0, offsetY: 3, scale: 1.00},
        highlight: {color: '#00FF7F', glowIntensity: 0.40, weight: 'normal'},
      };

    // ── 兜底：未知 archetype 返回中性基线 ──
    default:
      return {
        density: {padding: 1.00, spacing: 1.00, scale: 1.00},
        contrast: {sizeRatio: 1.00, weightRatio: 1.00, opacityRatio: 1.00},
        energy: {duration: 1.00, bounce: 0.80, intensity: 1.00},
        entryEvent: {type: 'none', stagger: 6, direction: 'center'},
        parallax: {offsetX: 0, offsetY: 0, scale: 1.00},
        highlight: {color: '#FFFFFF', glowIntensity: 0.50, weight: 'normal'},
      };
  }
}

// ─── 平台适配 ──────────────────────────────────────────────────────────────

/**
 * 根据目标平台调整 AdaptiveIntent。
 *
 * 规则：
 *   - tiktok: 短视频 → 更快节奏 (duration*0.8), 更强冲击 (intensity*1.2), 更紧凑 (spacing*0.9)
 *   - youtube: 长视频 → 更舒缓 (duration*1.2), 稍宽松 (spacing*1.05)
 *   - web: 保持基线不变
 */
export function applyPlatformAdaptation(
  base: AdaptiveIntent,
  platform: string,
): AdaptiveIntent {
  const adapted: AdaptiveIntent = {
    density: {...base.density},
    contrast: {...base.contrast},
    energy: {...base.energy},
    entryEvent: {...base.entryEvent},
    parallax: {...base.parallax},
    highlight: {...base.highlight},
    totalDuration: base.totalDuration,
  };

  switch (platform) {
    case 'tiktok':
      adapted.energy = {
        ...adapted.energy,
        duration: Number((adapted.energy.duration * 0.8).toFixed(3)),
        intensity: Number((adapted.energy.intensity * 1.2).toFixed(3)),
        peakFrame: adapted.energy.peakFrame,
      };
      adapted.density = {
        ...adapted.density,
        spacing: Number((adapted.density.spacing * 0.9).toFixed(3)),
      };
      adapted.contrast = {
        ...adapted.contrast,
        sizeRatio: Number((adapted.contrast.sizeRatio * 0.95).toFixed(3)),
      };
      break;

    case 'youtube':
      adapted.energy = {
        ...adapted.energy,
        duration: Number((adapted.energy.duration * 1.2).toFixed(3)),
        peakFrame: adapted.energy.peakFrame,
      };
      adapted.density = {
        ...adapted.density,
        spacing: Number((adapted.density.spacing * 1.05).toFixed(3)),
      };
      adapted.contrast = {
        ...adapted.contrast,
        sizeRatio: Number((adapted.contrast.sizeRatio * 1.05).toFixed(3)),
      };
      break;

    case 'web':
    default:
      // web: 保持基线不变
      break;
  }

  return adapted;
}

// ─── 内容自适应 ──────────────────────────────────────────────────────────────

/**
 * 根据具体场景内容 (文本长度、持续时间等) 微调系数。
 *
 * 规则：
 *   - 长文本 (textLength > 30): 稍紧凑 (spacing*0.95, padding*0.95), 字号对比略增 (sizeRatio*1.05)
 *   - 短视频 (duration < 3s): 更快 (duration*0.7), 更强弹跳 (bounce*1.5), 更高强度 (intensity*1.3)
 *   - 长视频 (duration > 8s): 更慢 (duration*1.2), 更少弹跳 (bounce*0.8)
 */
export function applyContentAdaptation(
  base: AdaptiveIntent,
  ctx: FamilyContext,
): AdaptiveIntent {
  let adapted: AdaptiveIntent = {
    density: {...base.density},
    contrast: {...base.contrast},
    energy: {...base.energy},
    entryEvent: {...base.entryEvent},
    parallax: {...base.parallax},
    highlight: {...base.highlight},
    totalDuration: base.totalDuration,
  };

  // ── 长文本适应性 ──
  if (ctx.textLength > 30) {
    adapted.density = {
      ...adapted.density,
      spacing: Number((adapted.density.spacing * 0.95).toFixed(3)),
      padding: Number((adapted.density.padding * 0.95).toFixed(3)),
    };
    adapted.contrast = {
      ...adapted.contrast,
      sizeRatio: Number((adapted.contrast.sizeRatio * 1.05).toFixed(3)),
    };
  }

  // ── 短场景适应性 (小于 3 秒) ──
  if (ctx.duration < 3) {
    adapted.energy = {
      ...adapted.energy,
      duration: Number((adapted.energy.duration * 0.7).toFixed(3)),
      bounce: Number((adapted.energy.bounce * 1.5).toFixed(3)),
      intensity: Number((adapted.energy.intensity * 1.3).toFixed(3)),
    };
  }

  // ── 长场景适应性 (大于 8 秒) ──
  if (ctx.duration > 8) {
    adapted.energy = {
      ...adapted.energy,
      duration: Number((adapted.energy.duration * 1.2).toFixed(3)),
      bounce: Number((adapted.energy.bounce * 0.8).toFixed(3)),
    };
    adapted.contrast = {
      ...adapted.contrast,
      sizeRatio: Number((adapted.contrast.sizeRatio * 0.95).toFixed(3)),
    };
  }

  return adapted;
}

// ─── 组合函数 ───────────────────────────────────────────────────────────────

/**
 * 组合函数：从 archetype 到最终 AdaptiveIntent。
 *
 * 依次调用：
 *   1. archetypeToAdaptiveBase — 镜头原型基线
 *   2. applyPlatformAdaptation — 平台适配 (从 context 中提取 platform)
 *   3. applyContentAdaptation — 内容自适应
 *
 * @param archetype - 镜头原型名称 (与 ShotArchetype 对齐)
 * @param context  - 可选的场景上下文 (包含 platform / textLength / duration 等)
 * @returns 最终的 AdaptiveIntent，可直接注入 FamilyDirectorMeta
 */
export function computeAdaptiveIntent(
  archetype: string,
  context?: FamilyContext,
): AdaptiveIntent {
  // Step 1: 原型基线
  let intent = archetypeToAdaptiveBase(archetype);

  // Step 2: 平台适配
  if (context?.platform) {
    intent = applyPlatformAdaptation(intent, context.platform);
  }

  // Step 3: 内容自适应
  if (context) {
    intent = applyContentAdaptation(intent, context);
  }

  return intent;
}
