process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRenderRequest,
  normalizeVoiceRequest,
  normalizePublicAssetPath,
} = require('../validators/requestValidators');

test('normalizePublicAssetPath rejects host and absolute filesystem paths', () => {
  assert.throws(() => normalizePublicAssetPath('/etc/passwd'), /Only public \/assets\/\* paths are accepted/);
  assert.throws(() => normalizePublicAssetPath('C:\\secret.txt'), /Only public \/assets\/\* paths are accepted/);
});

test('normalizeRenderRequest accepts public asset references and rejects remote media by default', async () => {
  const normalized = await normalizeRenderRequest({
    projectId: 'Project A',
    script: 'hello world',
    audioSegments: [
      {src: '/assets/voice/demo/clip.wav', startFrame: 0, durationInFrames: 30},
    ],
    subtitleFile: '/assets/subtitles/demo/clip.srt',
  });

  assert.equal(normalized.projectId, 'project-a');
  assert.equal(normalized.audioSegments?.[0]?.src, '/assets/voice/demo/clip.wav');
  assert.equal(normalized.subtitleFile, '/assets/subtitles/demo/clip.srt');

  await assert.rejects(
    () => normalizeRenderRequest({
      projectId: 'demo',
      script: 'hello',
      audioSegments: [{src: 'https://example.com/audio.wav'}],
    }),
    /Remote media URLs are disabled/,
  );
});

test('normalizeVoiceRequest requires at least one shot', () => {
  assert.throws(() => normalizeVoiceRequest({projectId: 'demo', shots: []}), /shots required/);
});
