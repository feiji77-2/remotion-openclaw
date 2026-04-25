process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inferCosyVoiceModelFromVoiceId,
  resolveCosyVoiceInstruction,
  resolveCosyVoiceModel,
  resolveCosyVoiceRate,
  resolveCosyVoiceVoiceId,
} = require('../voice/cosyvoiceBailianClient');

test('inferCosyVoiceModelFromVoiceId resolves model prefix from cloned voice id', () => {
  assert.equal(
    inferCosyVoiceModelFromVoiceId('cosyvoice-v3.5-plus-bailian-d19f0b62caf84817b957a729fc93a0b4'),
    'cosyvoice-v3.5-plus',
  );
});

test('resolveCosyVoiceModel falls back to inferred voice id model', () => {
  assert.equal(
    resolveCosyVoiceModel({voice: 'cosyvoice-v3.5-plus-bailian-d19f0b62caf84817b957a729fc93a0b4'}, {}),
    'cosyvoice-v3.5-plus',
  );
});

test('resolveCosyVoiceRate clamps to supported range', () => {
  assert.equal(resolveCosyVoiceRate('1.1'), 1.1);
  assert.equal(resolveCosyVoiceRate('9'), 2.0);
  assert.equal(resolveCosyVoiceRate('bad'), 1.0);
});

test('resolveCosyVoiceVoiceId and instruction read defaults from env', () => {
  const env = {
    COSYVOICE_DEFAULT_VOICE: 'cosyvoice-v3.5-plus-bailian-demo',
    COSYVOICE_DEFAULT_INSTRUCTION: '性格直率，情绪易激动且外露',
  };
  assert.equal(resolveCosyVoiceVoiceId({}, env), 'cosyvoice-v3.5-plus-bailian-demo');
  assert.equal(resolveCosyVoiceInstruction({}, env), '性格直率，情绪易激动且外露');
});
