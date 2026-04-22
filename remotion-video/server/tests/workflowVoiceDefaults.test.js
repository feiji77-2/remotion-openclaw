process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

async function loadWorkflowVoiceDefaultsModule() {
  const modulePath = pathToFileURL(
    path.join(__dirname, '..', '..', 'scripts', 'lib', 'workflow-voice-defaults.mjs'),
  ).href;
  return await import(modulePath);
}

test('resolveWorkflowVoiceDefaults auto-selects xtts when anchor voice exists and no CLI overrides are provided', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'chattts',
      voiceLanguage: '',
      reference: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async (filePath) => filePath.endsWith('/runtime/voices/xtts/anchor.wav'),
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'xtts');
  assert.equal(result.options.speaker, 'anchor');
  assert.equal(result.options.reference, 'runtime/voices/xtts/anchor.wav');
  assert.equal(result.options.voiceLanguage, 'zh-cn');
  assert.equal(result.applied.autoSelectedEngine, true);
});

test('resolveWorkflowVoiceDefaults fills missing xtts defaults when engine is explicit', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'xtts',
      voiceEngineExplicit: true,
      voiceLanguage: '',
      reference: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => true,
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'xtts');
  assert.equal(result.options.speaker, 'anchor');
  assert.equal(result.options.reference, 'runtime/voices/xtts/anchor.wav');
  assert.equal(result.options.voiceLanguage, 'zh-cn');
  assert.equal(result.applied.autoSelectedEngine, false);
});

test('resolveWorkflowVoiceDefaults does not override explicit non-xtts engine', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'chattts',
      voiceEngineExplicit: true,
      voiceLanguage: '',
      reference: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => true,
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'chattts');
  assert.equal(result.options.speaker, undefined);
  assert.equal(result.options.reference, '');
  assert.equal(result.options.voiceLanguage, '');
});
