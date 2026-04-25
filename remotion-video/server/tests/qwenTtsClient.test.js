process.env.NODE_ENV = 'development';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ensureQwenCloneVoice,
  getQwenTtsHealth,
  resolveQwenCloneModel,
  resolveQwenOutputSpeed,
  resolveQwenSynthesisModel,
  resolveQwenTtsLanguageType,
  sanitizeVoiceName,
} = require('../voice/qwenTtsClient');

test('resolveQwenTtsLanguageType maps common language codes', () => {
  assert.equal(resolveQwenTtsLanguageType('zh-cn'), 'Chinese');
  assert.equal(resolveQwenTtsLanguageType('en'), 'English');
  assert.equal(resolveQwenTtsLanguageType('auto'), 'Auto');
  assert.equal(resolveQwenTtsLanguageType('unknown'), 'Auto');
});

test('getQwenTtsHealth reports missing api key clearly', () => {
  const health = getQwenTtsHealth({});
  assert.equal(health.status, 'error');
  assert.match(health.message, /DASHSCOPE_API_KEY/);
});

test('resolveQwenSynthesisModel defaults to system model without clone context', () => {
  const model = resolveQwenSynthesisModel({env: {}});
  assert.equal(model, 'qwen3-tts-flash');
});

test('resolveQwenCloneModel defaults to vc model', () => {
  const model = resolveQwenCloneModel({}, {});
  assert.equal(model, 'qwen3-tts-vc-2026-01-22');
});

test('resolveQwenOutputSpeed clamps to supported range', () => {
  assert.equal(resolveQwenOutputSpeed('1.1'), 1.1);
  assert.equal(resolveQwenOutputSpeed('9'), 2.0);
  assert.equal(resolveQwenOutputSpeed('bad'), 1.0);
});

test('sanitizeVoiceName strips unsupported characters for Qwen clone names', () => {
  assert.equal(sanitizeVoiceName('daman-qwen-001'), 'damanqwen');
});

test('ensureQwenCloneVoice reuses cached registry entry before remote calls', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-tts-test-'));
  const registryPath = path.join(tmpDir, 'voice-registry.json');
  const referenceFile = path.join(tmpDir, 'demo.wav');
  const audioBuffer = Buffer.from('fake-audio');
  const referenceFingerprint = crypto.createHash('sha1').update(audioBuffer).digest('hex');

  fs.writeFileSync(referenceFile, audioBuffer);
  fs.writeFileSync(registryPath, JSON.stringify({
    voices: [
      {
        voice: 'cached-demo',
        preferredName: 'demovoice',
        targetModel: 'qwen3-tts-vc-2026-01-22',
        referenceFingerprint,
      },
    ],
  }, null, 2));

  let fetchCalled = false;
  const result = await ensureQwenCloneVoice({
    referenceUrl: referenceFile,
    preferredName: 'demo-voice',
    targetModel: 'qwen3-tts-vc-2026-01-22',
    registryPath,
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    },
  });

  assert.equal(result.voice, 'cached-demo');
  assert.equal(result.source, 'registry');
  assert.equal(fetchCalled, false);
});
