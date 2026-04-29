const test = require('node:test');
const assert = require('node:assert/strict');

const {parseSrtContentToSubtitleData} = require('../workers/renderWorker');

test('parseSrtContentToSubtitleData converts SRT into frame-aligned subtitle cues', () => {
  const subtitleData = parseSrtContentToSubtitleData(
    [
      '1',
      '00:00:00,000 --> 00:00:01,200',
      '你好，GPT-5.5',
      '',
      '2',
      '00:00:01,200 --> 00:00:02,500',
      '现在开始真正的工具调用。',
    ].join('\n'),
    30,
  );

  assert.equal(subtitleData.length, 2);
  assert.deepEqual(subtitleData[0], {
    index: 1,
    startFrame: 0,
    endFrame: 36,
    startMs: 0,
    endMs: 1200,
    text: '你好，GPT-5.5',
    words: null,
  });
  assert.deepEqual(subtitleData[1], {
    index: 2,
    startFrame: 36,
    endFrame: 75,
    startMs: 1200,
    endMs: 2500,
    text: '现在开始真正的工具调用。',
    words: null,
  });
});
