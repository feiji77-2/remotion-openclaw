process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {getVoiceCapabilities} = require('../voice/voiceJob');

test('getVoiceCapabilities exposes xtts local cloning engine', () => {
  const capabilities = getVoiceCapabilities();

  assert.ok(capabilities.engines.xtts);
  assert.equal(capabilities.engines.xtts.name, 'XTTS-v2');
  assert.equal(capabilities.engines.xtts.supportsCloning, true);
  assert.equal(capabilities.engines.xtts.requiresReference, true);
  assert.match(capabilities.engines.xtts.healthUrl, /18083/);
});
