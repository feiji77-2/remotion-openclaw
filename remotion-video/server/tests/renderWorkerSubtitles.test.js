const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildShotTimelineFrames,
  buildSubtitleDataFromShotRuntime,
  generateFallbackSRT,
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

test('generateFallbackSRT produces valid SRT for short text', () => {
  const srt = generateFallbackSRT('Hello world');

  assert.ok(srt.startsWith('1\n'));
  assert.ok(srt.includes(' --> '));
  assert.ok(srt.includes('Hello world'));
  assert.match(srt, /\d{2}:\d{2}:\d{2},\d{3}/);
});

test('generateFallbackSRT produces multi-cue SRT for long text', () => {
  // Text with enough clauses to exceed the 24-char chunk limit
  const longText = '第一句。第二句。第三句。第四句。第五句。第六句。第七句。第八句。第九句。';

  const srt = generateFallbackSRT(longText);

  // Should produce multiple SRT cue blocks separated by blank line
  const blocks = srt.trim().split(/\n\n+/);
  assert.ok(blocks.length >= 2, `expected >=2 cues, got ${blocks.length}`);

  // Each block should be a valid SRT cue
  for (const block of blocks) {
    const lines = block.split('\n');
    assert.ok(lines.length >= 3);
    assert.ok(/^\d+$/.test(lines[0]));
    assert.ok(lines[1].includes(' --> '));
    assert.match(lines[1], /\d{2}:\d{2}:\d{2},\d{3}/);
    assert.ok(lines[lines.length - 1].length > 0);
  }

  // Final chunk should contain the last clause
  assert.ok(blocks[blocks.length - 1].includes('第九句'));
});

test('generateFallbackSRT falls back to placeholder for empty text', () => {
  const srt = generateFallbackSRT('');

  assert.ok(srt.includes('视频旁白'));
  assert.ok(srt.startsWith('1\n'));
  assert.ok(srt.includes(' --> '));
});

test('generateFallbackSRT falls back to placeholder for null text', () => {
  const srt = generateFallbackSRT(null);

  assert.ok(srt.includes('视频旁白'));
  assert.ok(srt.startsWith('1\n'));
});

test('parseSrtContentToSubtitleData returns empty array for empty content', () => {
  const result = parseSrtContentToSubtitleData('', 30);
  assert.deepEqual(result, []);
});

test('parseSrtContentToSubtitleData returns empty array for malformed blocks', () => {
  const result = parseSrtContentToSubtitleData('just some random text without SRT format', 30);
  assert.deepEqual(result, []);
});

test('parseSrtContentToSubtitleData skips blocks with missing timestamps', () => {
  const input = [
    '1',
    'missing timestamp line',
    'some text',
  ].join('\n');

  const result = parseSrtContentToSubtitleData(input, 30);
  assert.deepEqual(result, []);
});

test('splitSubtitleTokens returns empty array for empty string', () => {
  assert.deepEqual(splitSubtitleTokens(''), []);
});

test('splitSubtitleTokens handles alphanumeric text without Chinese chars', () => {
  const tokens = splitSubtitleTokens('Hello world, this is a test.');
  assert.ok(tokens.length > 1);
  assert.ok(tokens.some((token) => token.includes('Hello')));
});

test('buildShotTimelineFrames returns empty array for empty shots', () => {
  const timeline = buildShotTimelineFrames([], 30);
  assert.deepEqual(timeline, []);
});

test('buildShotTimelineFrames handles single shot', () => {
  const shots = [
    {
      id: 'shot-01',
      frames: 60,
      audioDurationInFrames: 48,
      audioDurationSeconds: 1.6,
    },
  ];

  const timeline = buildShotTimelineFrames(shots, 30);

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].id, 'shot-01');
  assert.equal(timeline[0].audioStartFrame, 0);
  assert.equal(timeline[0].visualStartFrame, 0);
  assert.equal(timeline[0].overlap, 0);
});

test('buildSubtitleDataFromShotRuntime returns empty array for empty runtime', () => {
  const result = buildSubtitleDataFromShotRuntime([], [], 30);
  assert.deepEqual(result, []);
});
