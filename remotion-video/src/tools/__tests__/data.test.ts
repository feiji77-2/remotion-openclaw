import {describe, expect, it} from 'vitest';
import {SCORE, SEQUENCES, getCuesForAct, getTimelineCues} from '../data';

describe('data layer', () => {
  it('exports the embedded score', () => {
    expect(SCORE.id).toBe('deepseek-v4-hero');
    expect(SCORE.totalFrames).toBe(210);
    expect(SCORE.acts).toHaveLength(4);
  });

  it('compiles to 4 top-level sequences', () => {
    expect(SEQUENCES).toHaveLength(4);
    SEQUENCES.forEach((seq) => {
      expect(seq.from).toBeGreaterThanOrEqual(0);
      expect(seq.durationInFrames).toBeGreaterThan(0);
    });
  });

  it('getCuesForAct returns cues for the given act', () => {
    const cues = getCuesForAct('act-01');
    expect(cues.length).toBeGreaterThan(0);
    cues.forEach((c) => expect(c.actId).toBe('act-01'));
  });

  it('getTimelineCues returns flat timeline items', () => {
    const items = getTimelineCues();
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];
    expect(item).toHaveProperty('elementId');
    expect(item).toHaveProperty('frameRange');
    expect(item).toHaveProperty('color');
  });
});
