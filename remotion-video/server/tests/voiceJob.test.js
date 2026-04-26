process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getVoiceCapabilities,
  normalizeSpeechTextForTts,
  resolveTtsLanguageForText,
} = require('../voice/voiceJob');

test('getVoiceCapabilities exposes qwen-tts as the only active engine', () => {
  const capabilities = getVoiceCapabilities();

  assert.deepEqual(Object.keys(capabilities.engines), ['qwen-tts']);
  assert.equal(capabilities.engines['qwen-tts'].name, 'Qwen TTS (DashScope)');
  assert.equal(capabilities.engines['qwen-tts'].supportsCloning, true);
  assert.equal(capabilities.defaultEngine, 'qwen-tts');
});

test('normalizeSpeechTextForTts improves mixed zh-cn tech narration pronunciation', () => {
  const normalized = normalizeSpeechTextForTts(
    'GPT-5.5发布，AI岗位会变吗？OpenAI API 成本也降了。',
    {language: 'zh-cn'},
  );

  assert.match(normalized, /G P T/);
  assert.match(normalized, /五点五/);
  assert.match(normalized, /A I/);
  assert.match(normalized, /A P I/);
});

test('normalizeSpeechTextForTts improves English model/version pronunciation', () => {
  const normalized = normalizeSpeechTextForTts(
    'OpenAI released GPT-5.5 and K2.6 for enterprise workflows.',
    {language: 'en'},
  );

  assert.match(normalized, /G P T 5 point 5/);
  assert.match(normalized, /K 2 point 6/);
});

test('resolveTtsLanguageForText switches English-dominant text to en', () => {
  const language = resolveTtsLanguageForText(
    'OpenAI released GPT-5.5 with stronger coding, agent workflows, and enterprise tool use.',
    {language: 'zh-cn'},
  );

  assert.equal(language, 'en');
});

test('resolveTtsLanguageForText keeps mixed Chinese tech narration on zh-cn', () => {
  const language = resolveTtsLanguageForText(
    '今天我们聊 GPT-5.5 发布后，AI 编程岗位到底会不会被替代。',
    {language: 'zh-cn'},
  );

  assert.equal(language, 'zh-cn');
});

test('resolveTtsLanguageForText respects explicit language override', () => {
  const language = resolveTtsLanguageForText(
    'OpenAI released GPT-5.5 with stronger coding, agent workflows, and enterprise tool use.',
    {language: 'zh-cn', languageExplicit: true},
  );

  assert.equal(language, 'zh-cn');
});
