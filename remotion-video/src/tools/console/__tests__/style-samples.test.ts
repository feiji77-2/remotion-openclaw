import {describe, expect, it} from 'vitest';
import {STYLE_SAMPLES, selectStyleSample} from '../style-samples';

describe('style samples', () => {
  it('uses four style rule entries without binding to preview footage', () => {
    expect(STYLE_SAMPLES).toHaveLength(4);
    expect(new Set(STYLE_SAMPLES.map((sample) => sample.presetId)).size).toBe(4);
    for (const sample of STYLE_SAMPLES) {
      expect(sample.summary).toBeTruthy();
      expect('videoUrl' in sample).toBe(false);
    }
  });

  it('selects a candidate without starting sample playback', () => {
    expect(selectStyleSample(null, 'cyan-tech')).toEqual({candidateId: 'cyan-tech'});
    expect(selectStyleSample('cyan-tech', 'amber-editorial')).toEqual({candidateId: 'amber-editorial'});
  });
});
