/**
 * shotGrammar.test.ts — 导演层镜头语法系统单元测试
 *
 * 覆盖 resolveShotGrammar 的 6 级优先级推导链路：
 *   0. DirectorBeat → resolveFromDirectorBeat
 *   1. storyboardCueZh → INTENT_CUE_MAP
 *   2. scriptBlockLabel → follow focus
 *   3. level → opening/closing
 *   4. sceneIntent → 语义分析
 *   5. type → 补充映射
 *   6. family → fallback
 */

import {describe, expect, it} from 'vitest';
import {
  resolveShotGrammar,
  resolveFamilyShotContract,
  directorQA,
  resolveFromDirectorBeat,
  CAMERA_INTENT_TO_MOTION,
  SHOT_ARCHETYPE_REGISTRY,
  DATA_EVENT_CONFIGS,
} from '../shotGrammar';

import type {ShotContext, DirectorBeatOutput, ResolvedShotGrammar} from '../shotGrammar';

// ─── 测试 fixture 工厂 ────────────────────────────────────────────────

const defaultCtx = (overrides: Partial<ShotContext> = {}): ShotContext => ({
  family: 'spoken-title',
  shotIndex: 0,
  totalShots: 5,
  ...overrides,
});

const verifyStandardShape = (result: ResolvedShotGrammar) => {
  expect(result).toHaveProperty('archetype');
  expect(result).toHaveProperty('cameraIntent');
  expect(result).toHaveProperty('dataEvent');
  expect(result).toHaveProperty('enterFrames');
  expect(result).toHaveProperty('emphasisFrames');
  expect(result).toHaveProperty('staggerGap');
  expect(result).toHaveProperty('memoryObject');
  expect(result).toHaveProperty('directorNote');
  expect(result.enterFrames).toBeGreaterThanOrEqual(8);
  expect(result.emphasisFrames).toBeGreaterThan(0);
};

// ─── 优先级 0：DirectorBeat ──────────────────────────────────────────

describe('resolveShotGrammar — priority 0: DirectorBeat', () => {
  it('uses DirectorBeat when beatId matches and archetype exists', () => {
    const beat: DirectorBeatOutput = {
      id: 'b1', beatId: 'shot-01',
      subject: '开场', action: 'reveal', tension: '低至高', revelation: '核心概念',
      memoryObject: {type: 'word', role: '关键词', enterFrame: 4, color: '#00d4ff'},
      cameraIntent: 'pin', dataEvent: 'pin', archetype: 'lock-on reveal',
      suggestedEnterFrames: 14, suggestedEmphasisFrames: 50,
    };
    const result = resolveShotGrammar(defaultCtx({
      beatId: 'shot-01',
      directorBeats: [beat],
    }));
    expect(result.archetype).toBe('lock-on reveal');
    expect(result.enterFrames).toBeGreaterThanOrEqual(8);
    expect(result.directorNote).toContain('directorBeat');
    verifyStandardShape(result);
  });

  it('falls through when no beatId match', () => {
    const beat: DirectorBeatOutput = {
      id: 'b2', beatId: 'other-shot',
      subject: '其他', action: 'compare', tension: '对比', revelation: '差距',
      memoryObject: {type: 'block', role: '对比块', enterFrame: 6, color: '#ffd43b'},
      cameraIntent: 'compress', dataEvent: 'delta-hit', archetype: 'compress compare',
      suggestedEnterFrames: 10, suggestedEmphasisFrames: 35,
    };
    // shot-01 在 beats 中不存在，应 fall through 到下一级
    const result = resolveShotGrammar(defaultCtx({
      beatId: 'shot-01',
      directorBeats: [beat],
    }));
    // 无 cue 匹配，应走到 family fallback
    expect(result.archetype).toBeDefined();
  });

  it('uses DirectorBeat dataEvent/cameraIntent hints', () => {
    const beat: DirectorBeatOutput = {
      id: 'b3', beatId: 's2',
      subject: '数据', action: 'count', tension: '紧迫', revelation: '阈值',
      memoryObject: {type: 'block', role: '数字主体', enterFrame: 3, color: '#FF4500'},
      cameraIntent: 'chase', dataEvent: 'count-up', archetype: 'pressure countdown',
      suggestedEnterFrames: 8, suggestedEmphasisFrames: 30,
    };
    const result = resolveShotGrammar(defaultCtx({
      beatId: 's2',
      directorBeats: [beat],
    }));
    expect(result.cameraIntent).toBe('chase');
    expect(result.dataEvent).toBe('count-up');
  });
});

// ─── 优先级 1：storyboardCueZh → INTENT_CUE_MAP ────────────────────

describe('resolveShotGrammar — priority 1: storyboardCueZh', () => {
  it('matches "追" → overtake race', () => {
    const result = resolveShotGrammar(defaultCtx({storyboardCueZh: '追及竞速，显示差距'}));
    expect(result.archetype).toBe('overtake race');
    expect(result.dataEvent).toBe('overtake');
    expect(result.directorNote).toContain('[cue命中]');
  });

  it('matches "对比" → compress compare', () => {
    const result = resolveShotGrammar(defaultCtx({storyboardCueZh: '左右对比效果'}));
    expect(result.archetype).toBe('compress compare');
    expect(result.dataEvent).toBe('delta-hit');
  });

  it('matches "停留" → aftershock hold', () => {
    const result = resolveShotGrammar(defaultCtx({storyboardCueZh: '高潮后停留'}));
    expect(result.archetype).toBe('aftershock hold');
    expect(result.dataEvent).toBe('settle');
  });

  it('matches "连续" → bullet train', () => {
    const result = resolveShotGrammar(defaultCtx({storyboardCueZh: '连续多个数据高速轰出'}));
    expect(result.archetype).toBe('bullet train');
    expect(result.dataEvent).toBe('count-up');
  });

  it('no match falls through to lower priority', () => {
    const result = resolveShotGrammar(defaultCtx({storyboardCueZh: '普通介绍'}));
    // "普通介绍" 不匹配任何 cue，应 fall through
    expect(result.archetype).toBeDefined();
  });
});

// ─── 优先级 2：scriptBlockLabel ──────────────────────────────────────

describe('resolveShotGrammar — priority 2: scriptBlockLabel', () => {
  it('step-5 → follow focus', () => {
    const result = resolveShotGrammar(defaultCtx({scriptBlockLabel: 'step-5'}));
    expect(result.archetype).toBe('follow focus');
    expect(result.dataEvent).toBe('count-up');
  });

  it('non-step label falls through', () => {
    const result = resolveShotGrammar(defaultCtx({scriptBlockLabel: 'summary'}));
    expect(result.archetype).not.toBe('follow focus');
  });
});

// ─── 优先级 3：level ─────────────────────────────────────────────────

describe('resolveShotGrammar — priority 3: level', () => {
  it('opening → lock-on reveal', () => {
    const result = resolveShotGrammar(defaultCtx({level: 'opening'}));
    expect(result.archetype).toBe('lock-on reveal');
    expect(result.dataEvent).toBe('pin');
  });

  it('closing → drift reveal', () => {
    const result = resolveShotGrammar(defaultCtx({level: 'closing'}));
    expect(result.archetype).toBe('drift reveal');
    expect(result.dataEvent).toBe('trace-flow');
  });
});

// ─── 优先级 3b：sceneIntent ─────────────────────────────────────────

describe('resolveShotGrammar — priority 3b: sceneIntent', () => {
  it('对比 → compress compare', () => {
    const result = resolveShotGrammar(defaultCtx({sceneIntent: '两方对比展示优劣'}));
    expect(result.archetype).toBe('compress compare');
  });

  it('爆发 → burst spread', () => {
    const result = resolveShotGrammar(defaultCtx({sceneIntent: '一个关键词爆发展开'}));
    expect(result.archetype).toBe('burst spread');
  });

  it('首次 → lock-on reveal', () => {
    const result = resolveShotGrammar(defaultCtx({sceneIntent: '首次揭示核心技术'}));
    expect(result.archetype).toBe('lock-on reveal');
  });

  it('峰值 → pressure countdown', () => {
    const result = resolveShotGrammar(defaultCtx({sceneIntent: '数据达到历史峰值'}));
    expect(result.archetype).toBe('pressure countdown');
  });

  it('no match falls through', () => {
    const result = resolveShotGrammar(defaultCtx({sceneIntent: '其他说明'}));
    expect(result.archetype).toBeDefined();
  });
});

// ─── 优先级 4：type ──────────────────────────────────────────────────

describe('resolveShotGrammar — priority 4: type', () => {
  it('comparison → compress compare', () => {
    const result = resolveShotGrammar(defaultCtx({type: 'comparison'}));
    expect(result.archetype).toBe('compress compare');
  });

  it('timeline → follow focus', () => {
    const result = resolveShotGrammar(defaultCtx({type: 'timeline'}));
    expect(result.archetype).toBe('follow focus');
  });

  it('flow → follow focus', () => {
    const result = resolveShotGrammar(defaultCtx({type: 'flow'}));
    expect(result.archetype).toBe('follow focus');
  });

  it('rule → lock-on reveal', () => {
    const result = resolveShotGrammar(defaultCtx({type: 'rule'}));
    expect(result.archetype).toBe('lock-on reveal');
  });
});

// ─── 优先级 5：family fallback ──────────────────────────────────────

describe('resolveShotGrammar — priority 5: family fallback', () => {
  it('benchmark-chart → overtake race', () => {
    const result = resolveShotGrammar(defaultCtx({family: 'benchmark-chart', numericFields: [{field: 'val', value: 100}]}));
    expect(result.archetype).toBe('overtake race');
    expect(result.dataEvent).toBe('overtake');
  });

  it('metrics → pressure countdown', () => {
    const result = resolveShotGrammar(defaultCtx({family: 'metrics', numericFields: [{field: 'val', value: 50}]}));
    expect(result.archetype).toBe('pressure countdown');
    expect(result.dataEvent).toBe('count-up');
  });

  it('hero → lock-on reveal (no numeric data → pin)', () => {
    const result = resolveShotGrammar(defaultCtx({family: 'hero'}));
    expect(result.archetype).toBe('lock-on reveal');
    expect(result.dataEvent).toBe('pin');
  });

  it('quote-highlight → aftershock hold', () => {
    const result = resolveShotGrammar(defaultCtx({family: 'quote-highlight'}));
    expect(result.archetype).toBe('aftershock hold');
    expect(result.dataEvent).toBe('pin');
  });

  it('unknown family → drift reveal fallback', () => {
    const result = resolveShotGrammar(defaultCtx({family: 'unknown-family'}));
    expect(result.archetype).toBe('drift reveal');
  });
});

// ─── resolveFamilyShotContract ──────────────────────────────────────

describe('resolveFamilyShotContract', () => {
  it('benchmark-chart returns overtake race with count-up', () => {
    const result = resolveFamilyShotContract('benchmark-chart');
    expect(result.archetype).toBe('overtake race');
    expect(result.enterFrames).toBeGreaterThanOrEqual(8);
    verifyStandardShape(result);
  });

  it('hero returns lock-on reveal', () => {
    const result = resolveFamilyShotContract('hero');
    expect(result.archetype).toBe('lock-on reveal');
    verifyStandardShape(result);
  });

  it('does not error on unknown family', () => {
    const result = resolveFamilyShotContract('unknown-family');
    expect(result.archetype).toBeDefined();
  });
});

// ─── resolveFromDirectorBeat ─────────────────────────────────────────

describe('resolveFromDirectorBeat', () => {
  it('parses all key fields from a DirectorBeatOutput', () => {
    const beat: DirectorBeatOutput = {
      id: 'b4', beatId: 's5',
      subject: '性能', action: 'overtake', tension: '竞争', revelation: '领先',
      memoryObject: {type: 'line', role: '追及线', enterFrame: 5, color: '#FF8C00'},
      cameraIntent: 'chase', dataEvent: 'overtake', archetype: 'overtake race',
      suggestedEnterFrames: 16, suggestedEmphasisFrames: 60,
    };
    const result = resolveFromDirectorBeat(beat, defaultCtx({}));
    expect(result.archetype).toBe('overtake race');
    expect(result.cameraIntent).toBe('chase');
    expect(result.dataEvent).toBe('overtake');
    expect(result.enterFrames).toBe(16);
    expect(result.emphasisFrames).toBe(60);
    expect(result.memoryObject.type).toBe('line');
    verifyStandardShape(result);
  });
});

// ─── DirectorQA ─────────────────────────────────────────────────────

describe('directorQA', () => {
  it('passes when no failures', () => {
    const scenes = [
      {grammar: resolveShotGrammar(defaultCtx({family: 'hero'})), family: 'hero'},
    ];
    const result = directorQA(scenes);
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails multi-nucleus family with wrong archetype', () => {
    // feature-rail 应使用 burst spread，但我们给个 lock-on reveal
    const ctx = defaultCtx({family: 'feature-rail'});
    const grammar = resolveShotGrammar(defaultCtx({
      family: 'feature-rail',
      type: 'comparison',
    }));
    const result = directorQA([{grammar, family: 'feature-rail'}]);
    // 如果 archetype 不是 burst/compress，应该报告失败
    if (grammar.archetype !== 'burst spread' && grammar.archetype !== 'compress compare') {
      expect(result.failures.length).toBeGreaterThan(0);
    }
  });

  it('fails when enterFrames < 8', () => {
    const grammar = resolveShotGrammar(defaultCtx({family: 'hero'}));
    const fastGrammar = {...grammar, enterFrames: 4};
    const result = directorQA([{grammar: fastGrammar, family: 'hero'}]);
    expect(result.failures.some((f) => f.includes('enterFrames'))).toBe(true);
  });
});

// ─── 映射常量 ────────────────────────────────────────────────────────

describe('CAMERA_INTENT_TO_MOTION', () => {
  it('maps all 8 CameraIntents to motion presets', () => {
    const intents = ['pin', 'compress', 'chase', 'drift', 'confront', 'linger', 'reveal', 'none'];
    for (const intent of intents) {
      expect(CAMERA_INTENT_TO_MOTION).toHaveProperty(intent);
      expect(typeof CAMERA_INTENT_TO_MOTION[intent as keyof typeof CAMERA_INTENT_TO_MOTION]).toBe('string');
    }
  });

  it('pin → push-in', () => {
    expect(CAMERA_INTENT_TO_MOTION.pin).toBe('push-in');
  });
});

describe('SHOT_ARCHETYPE_REGISTRY', () => {
  it('contains all 12 archetypes', () => {
    const expected = [
      'lock-on reveal', 'pressure countdown', 'overtake race', 'evidence pin',
      'threshold breach', 'aftershock hold', 'follow focus', 'compress compare',
      'drift reveal', 'bullet train', 'burst spread', 'trace flow',
    ];
    for (const archetype of expected) {
      expect(SHOT_ARCHETYPE_REGISTRY).toHaveProperty(archetype);
      expect(SHOT_ARCHETYPE_REGISTRY[archetype as keyof typeof SHOT_ARCHETYPE_REGISTRY].archetype).toBe(archetype);
    }
  });

  it('each archetype has an enter/emphasis range', () => {
    for (const [key, meta] of Object.entries(SHOT_ARCHETYPE_REGISTRY)) {
      expect(meta.enterFramesRange).toHaveLength(2);
      expect(meta.emphasisFramesRange).toHaveLength(2);
      expect(meta.enterFramesRange[0]).toBeLessThanOrEqual(meta.enterFramesRange[1]);
    }
  });
});

describe('DATA_EVENT_CONFIGS', () => {
  it('contains all 10 data events', () => {
    const events = ['count-up', 'delta-hit', 'overtake', 'threshold-cross',
      'burst-spread', 'trace-flow', 'pin', 'settle', 'flash', 'none'];
    for (const event of events) {
      expect(DATA_EVENT_CONFIGS).toHaveProperty(event);
    }
  });

  it('each config has required fields', () => {
    for (const [key, config] of Object.entries(DATA_EVENT_CONFIGS)) {
      expect(config).toHaveProperty('staggerGap');
      expect(config).toHaveProperty('motionFunction');
      expect(config).toHaveProperty('baseEnterOffset');
      expect(typeof config.staggerGap).toBe('number');
    }
  });
});
