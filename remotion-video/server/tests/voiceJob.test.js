process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getVoiceCapabilities,
  normalizeSpeechTextForTts,
  resolveTtsLanguageForText,
} = require('../voice/voiceJob');

test('getVoiceCapabilities exposes xtts local cloning engine', () => {
  const capabilities = getVoiceCapabilities();

  assert.ok(capabilities.engines.xtts);
  assert.equal(capabilities.engines.xtts.name, 'XTTS-v2');
  assert.equal(capabilities.engines.xtts.supportsCloning, true);
  assert.equal(capabilities.engines.xtts.requiresReference, true);
  assert.match(capabilities.engines.xtts.healthUrl, /18083/);
  assert.ok(capabilities.engines['qwen-tts']);
  assert.equal(capabilities.engines['qwen-tts'].supportsCloning, true);
  assert.ok(capabilities.engines.cosyvoice);
  assert.equal(capabilities.engines.cosyvoice.supportsInstruction, true);
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

test('resolveTtsLanguageForText switches English-dominant xtts text to en', () => {
  const language = resolveTtsLanguageForText(
    'OpenAI released GPT-5.5 with stronger coding, agent workflows, and enterprise tool use.',
    {language: 'zh-cn'},
    'xtts',
  );

  assert.equal(language, 'en');
});

test('resolveTtsLanguageForText keeps mixed Chinese tech narration on zh-cn', () => {
  const language = resolveTtsLanguageForText(
    '今天我们聊 GPT-5.5 发布后，AI 编程岗位到底会不会被替代。',
    {language: 'zh-cn'},
    'xtts',
  );

  assert.equal(language, 'zh-cn');
});

test('resolveTtsLanguageForText respects explicit xtts language override', () => {
  const language = resolveTtsLanguageForText(
    'OpenAI released GPT-5.5 with stronger coding, agent workflows, and enterprise tool use.',
    {language: 'zh-cn', languageExplicit: true},
    'xtts',
  );

  assert.equal(language, 'zh-cn');
});
