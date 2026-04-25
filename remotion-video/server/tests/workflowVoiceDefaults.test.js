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

test('resolveWorkflowVoiceDefaults auto-selects xtts when daman-business-001 voice exists and no CLI overrides are provided', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'chattts',
      voiceLanguage: '',
      reference: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async (filePath) => filePath.endsWith('/runtime/voices/xtts/daman-business-001.wav'),
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'xtts');
  assert.equal(result.options.speaker, 'daman-business-001');
  assert.equal(result.options.reference, 'runtime/voices/xtts/daman-business-001.wav');
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
  assert.equal(result.options.speaker, 'daman-business-001');
  assert.equal(result.options.reference, 'runtime/voices/xtts/daman-business-001.wav');
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

test('resolveWorkflowVoiceDefaults can auto-select cosyvoice when env requests it', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'chattts',
      voiceLanguage: '',
      reference: '',
      voiceInstruction: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => false,
      env: {
        WORKFLOW_DEFAULT_VOICE_ENGINE: 'cosyvoice',
        WORKFLOW_DEFAULT_VOICE_SPEED: '1.1',
        COSYVOICE_DEFAULT_VOICE: 'cosyvoice-v3.5-plus-bailian-demo',
        COSYVOICE_DEFAULT_LANGUAGE: 'zh-cn',
        COSYVOICE_DEFAULT_INSTRUCTION: '性格直率，情绪易激动且外露',
      },
    },
  );

  assert.equal(result.options.voiceEngine, 'cosyvoice');
  assert.equal(result.options.voiceSpeed, '1.1');
  assert.equal(result.options.speaker, 'cosyvoice-v3.5-plus-bailian-demo');
  assert.equal(result.options.voiceLanguage, 'zh-cn');
  assert.equal(result.options.voiceInstruction, '性格直率，情绪易激动且外露');
  assert.equal(result.applied.autoSelectedCosyVoice, true);
});
