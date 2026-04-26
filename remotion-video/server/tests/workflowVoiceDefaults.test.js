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

test('resolveWorkflowVoiceDefaults defaults to qwen-tts and fills speaker/language', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: '',
      voiceLanguage: '',
      speaker: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => false,
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'qwen-tts');
  assert.equal(result.options.speaker, 'Cherry');
  assert.equal(result.options.voiceLanguage, 'zh-cn');
  assert.equal(result.profile.engine, 'qwen-tts');
});

test('resolveWorkflowVoiceDefaults coerces legacy engines to qwen-tts', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: 'legacy-local-tts',
      voiceEngineExplicit: true,
      voiceLanguage: '',
      speaker: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => false,
      env: {},
    },
  );

  assert.equal(result.options.voiceEngine, 'qwen-tts');
  assert.equal(result.options.speaker, 'Cherry');
  assert.equal(result.options.voiceLanguage, 'zh-cn');
});

test('resolveWorkflowVoiceDefaults applies qwen env defaults', async () => {
  const {resolveWorkflowVoiceDefaults} = await loadWorkflowVoiceDefaultsModule();

  const result = await resolveWorkflowVoiceDefaults(
    {
      voiceEngine: '',
      voiceLanguage: '',
      speaker: '',
      voiceModel: '',
    },
    {
      cwd: '/tmp/remotion-video',
      fileExistsImpl: async () => false,
      env: {
        WORKFLOW_DEFAULT_VOICE_ENGINE: 'qwen-tts',
        WORKFLOW_DEFAULT_VOICE_SPEED: '1.1',
        WORKFLOW_DEFAULT_QWEN_LANGUAGE: 'en',
        QWEN_TTS_DEFAULT_VOICE: 'daman-qwen',
        QWEN_TTS_SYSTEM_MODEL: 'qwen3-tts-flash',
      },
    },
  );

  assert.equal(result.options.voiceEngine, 'qwen-tts');
  assert.equal(result.options.voiceSpeed, '1.1');
  assert.equal(result.options.speaker, 'daman-qwen');
  assert.equal(result.options.voiceLanguage, 'en');
  assert.equal(result.options.voiceModel, 'qwen3-tts-flash');
});
