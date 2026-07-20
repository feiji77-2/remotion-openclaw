import {describe, expect, it} from 'vitest';
import {buildSkillShowcaseProjectFromScript} from '../script-project-generator.mjs';

describe('buildSkillShowcaseProjectFromScript', () => {
  it('does not pass Whisper avg_logprob through as a Project confidence value', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'whisper-confidence',
      title: '转写测试',
      projectRoot: process.cwd(),
      captions: [
        {text: '第一句。', startMs: 0, endMs: 1000, confidence: -0.18},
        {text: '第二句。', startMs: 1000, endMs: 2000, confidence: 0.82},
        {text: '第三句。', startMs: 2000, endMs: 3000, confidence: 1.2},
      ],
    });

    expect(project.captions.map((caption) => caption.confidence)).toEqual([null, 0.82, null]);
  });
});
