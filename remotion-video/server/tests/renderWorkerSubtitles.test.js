const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildShotTimelineFrames,
  buildSubtitleDataFromShotRuntime,
  parseSrtContentToSubtitleData,
  splitSubtitleTokens,
} = require('../workers/renderWorker');

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

test('splitSubtitleTokens preserves chinese rhythm chunks', () => {
  assert.deepEqual(
    splitSubtitleTokens('现在开始真正的工具调用。'),
    ['现在开始', '真正的工', '具调用', '。'],
  );
});

test('segment runtime builds sequential audio subtitle timeline', () => {
  const shots = [
    {
      id: 'shot-01',
      title: '开场',
      narration: '第一句来了',
      frames: 54,
      audioDurationInFrames: 48,
      audioDurationSeconds: 1.6,
    },
    {
      id: 'shot-02',
      title: '第二段',
      narration: '第二句跟上',
      frames: 66,
      audioDurationInFrames: 60,
      audioDurationSeconds: 2,
    },
  ];
  const runtime = [
    {
      shot: shots[0],
      speech: {rawText: '第一句来了'},
      durationInFrames: 48,
    },
    {
      shot: shots[1],
      speech: {rawText: '第二句跟上'},
      durationInFrames: 60,
    },
  ];

  const timeline = buildShotTimelineFrames(shots, 30);
  assert.equal(timeline[0].audioStartFrame, 0);
  assert.equal(timeline[1].audioStartFrame, 48);
  assert.ok(timeline[1].visualStartFrame < shots[0].frames + shots[1].frames);

  const subtitleData = buildSubtitleDataFromShotRuntime(runtime, timeline, 30);
  assert.equal(subtitleData.length, 2);
  assert.equal(subtitleData[0].startFrame, 0);
  assert.equal(subtitleData[0].endFrame, 48);
  assert.equal(subtitleData[1].startFrame, 48);
  assert.equal(subtitleData[1].endFrame, 108);
  assert.ok(Array.isArray(subtitleData[0].words));
});
