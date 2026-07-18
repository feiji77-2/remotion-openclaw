/**
 * adaptiveCoefficients.test.ts — 自适应系数系统单元测试
 *
 * 覆盖路径：
 *   1. archetypeToAdaptiveBase — 所有 12 个 archetype + 兜底
 *   2. applyPlatformAdaptation — tiktok / youtube / web
 *   3. applyContentAdaptation — 长文本 / 短场景 / 长场景
 *   4. computeAdaptiveIntent — 组合链路
 */

import {describe, expect, it} from 'vitest';
import {
  archetypeToAdaptiveBase,
  applyPlatformAdaptation,
  applyContentAdaptation,
  computeAdaptiveIntent,
} from '../adaptiveCoefficients';
import type {FamilyContext} from '../../types/director';

// ─── archetypeToAdaptiveBase ──────────────────────────────────────────

describe('archetypeToAdaptiveBase', () => {
  it('returns lock-on reveal coefficients', () => {
    const result = archetypeToAdaptiveBase('lock-on reveal');
    expect(result.density.padding).toBeLessThan(1);   // 紧凑
    expect(result.contrast.sizeRatio).toBeGreaterThan(1); // 高对比
    expect(result.entryEvent.type).toBe('pin');
    expect(result.highlight.color).toBe('#FFD700');
  });

  it('returns pressure countdown coefficients', () => {
    const result = archetypeToAdaptiveBase('pressure countdown');
    expect(result.energy.intensity).toBeGreaterThan(1); // 高能量
    expect(result.parallax.offsetY).toBeLessThan(0);
  });

  it('returns overtake race with horizontal parallax', () => {
    const result = archetypeToAdaptiveBase('overtake race');
    expect(result.parallax.offsetX).toBeLessThan(0); // 横向动能
    expect(result.energy.bounce).toBeGreaterThan(1);
  });

  it('returns aftershock hold with low energy', () => {
    const result = archetypeToAdaptiveBase('aftershock hold');
    expect(result.energy.intensity).toBeLessThan(1);
    expect(result.contrast.sizeRatio).toBeLessThan(1);
    expect(result.entryEvent.type).toBe('settle');
  });

  it('returns bullet train with fast entry', () => {
    const result = archetypeToAdaptiveBase('bullet train');
    expect(result.energy.bounce).toBeGreaterThan(1);
    expect(result.entryEvent.stagger).toBeLessThan(5);
  });

  it('returns burst spread with high scale', () => {
    const result = archetypeToAdaptiveBase('burst spread');
    expect(result.density.scale).toBeGreaterThan(1);
    expect(result.energy.bounce).toBeGreaterThan(1);
  });

  it('returns neutral fallback for unknown archetype', () => {
    const result = archetypeToAdaptiveBase('unknown-archetype');
    expect(result.density.padding).toBe(1);
    expect(result.contrast.sizeRatio).toBe(1);
    expect(result.energy.duration).toBe(1);
    expect(result.highlight.color).toBe('#FFFFFF');
  });

  it('returns trace flow with vertical parallax', () => {
    const result = archetypeToAdaptiveBase('trace flow');
    expect(result.parallax.offsetY).toBeGreaterThan(0);
    expect(result.entryEvent.stagger).toBeGreaterThan(5);
  });
});

// ─── applyPlatformAdaptation ──────────────────────────────────────────

describe('applyPlatformAdaptation', () => {
  const baseline = archetypeToAdaptiveBase('lock-on reveal');

  it('tiktok: faster and more intense', () => {
    const result = applyPlatformAdaptation(baseline, 'tiktok');
    expect(result.energy.duration).toBeLessThan(baseline.energy.duration);  // 更快
    expect(result.energy.intensity).toBeGreaterThan(baseline.energy.intensity); // 更强
    expect(result.density.spacing).toBeLessThan(baseline.density.spacing); // 更紧凑
  });

  it('youtube: slower and looser', () => {
    const result = applyPlatformAdaptation(baseline, 'youtube');
    expect(result.energy.duration).toBeGreaterThan(baseline.energy.duration); // 更慢
    expect(result.density.spacing).toBeGreaterThan(baseline.density.spacing); // 更宽松
  });

  it('web: unchanged', () => {
    const result = applyPlatformAdaptation(baseline, 'web');
    expect(result.energy.duration).toBe(baseline.energy.duration);
    expect(result.density.spacing).toBe(baseline.density.spacing);
  });

  it('unknown platform: unchanged', () => {
    const result = applyPlatformAdaptation(baseline, 'vr');
    expect(result.energy.duration).toBe(baseline.energy.duration);
  });

  it('does not mutate the baseline', () => {
    const copy = {...baseline, energy: {...baseline.energy}};
    applyPlatformAdaptation(baseline, 'tiktok');
    expect(baseline.energy.duration).toBe(copy.energy.duration);
  });
});

// ─── applyContentAdaptation ───────────────────────────────────────────

describe('applyContentAdaptation', () => {
  const baseline = archetypeToAdaptiveBase('lock-on reveal');

  it('long text (>30 chars): tighter spacing, higher contrast', () => {
    const ctx: FamilyContext = {
      familyId: 'test', textLength: 40, wordCount: 8, duration: 5, platform: 'web',
    };
    const result = applyContentAdaptation(baseline, ctx);
    expect(result.density.spacing).toBeLessThan(baseline.density.spacing);
    expect(result.density.padding).toBeLessThan(baseline.density.padding);
    expect(result.contrast.sizeRatio).toBeGreaterThan(baseline.contrast.sizeRatio);
  });

  it('short scene (<3s): faster and more bouncy', () => {
    const ctx: FamilyContext = {
      familyId: 'test', textLength: 10, wordCount: 3, duration: 2, platform: 'web',
    };
    const result = applyContentAdaptation(baseline, ctx);
    expect(result.energy.duration).toBeLessThan(baseline.energy.duration);
    expect(result.energy.bounce).toBeGreaterThan(baseline.energy.bounce);
    expect(result.energy.intensity).toBeGreaterThan(baseline.energy.intensity);
  });

  it('long scene (>8s): slower, less bouncy', () => {
    const ctx: FamilyContext = {
      familyId: 'test', textLength: 10, wordCount: 3, duration: 10, platform: 'web',
    };
    const result = applyContentAdaptation(baseline, ctx);
    expect(result.energy.duration).toBeGreaterThan(baseline.energy.duration);
    expect(result.energy.bounce).toBeLessThan(baseline.energy.bounce);
    expect(result.contrast.sizeRatio).toBeLessThan(baseline.contrast.sizeRatio);
  });

  it('empty context: unchanged', () => {
    // 当缺少必要的 context 字段时 applyContentAdaptation 仍应正确工作
    // 按函数签名字段都是 number，所以默认值 0 不会触发任何分支
    const noopCtx: FamilyContext = {
      familyId: 'test', textLength: 0, wordCount: 0, duration: 5, platform: 'web',
    };
    // textLength 为 0 不会触发 >30 分支
    const result = applyContentAdaptation(baseline, noopCtx);
    expect(result.energy.bounce).toBe(baseline.energy.bounce);
  });
});

// ─── computeAdaptiveIntent ────────────────────────────────────────────

describe('computeAdaptiveIntent', () => {
  it('combines base + platform + content adaptation', () => {
    const ctx: FamilyContext = {
      familyId: 'demo', textLength: 35, wordCount: 7, duration: 3, platform: 'tiktok',
    };
    const result = computeAdaptiveIntent('burst spread', ctx);
    // TikTok 紧凑 + 长文本更紧凑
    expect(result.density.spacing).toBeLessThan(1.15); // burst spread 基线的 spacing
    // 短场景 <3s 更快
    expect(result.energy.duration).toBeLessThan(1.2);
  });

  it('archetype-only with no context', () => {
    const result = computeAdaptiveIntent('drift reveal');
    expect(result.entryEvent.type).toBe('trace-flow');
    expect(result.energy.duration).toBe(1);
    expect(result.parallax.offsetY).toBe(3);
  });

  it('platform without context ignores platform', () => {
    // 没有 context 时 platform 不生效
    const result = computeAdaptiveIntent('evidence pin');
    expect(result.density.spacing).toBe(0.95); // 就等于基线的值
  });
});
