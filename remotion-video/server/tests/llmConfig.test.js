process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {resolveWorkflowLLMConfig} = require('../workflow/step123/llm');

const ENV_KEYS = [
  'MINIMAX_API_KEY',
  'MINIMAX_API_HOST',
  'MINIMAX_WORKFLOW_MODEL',
  'MINIMAX_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_WORKFLOW_MODEL',
  'OPENAI_MODEL',
  'OPENCLAW_CLI_PATH',
];

function withEnv(overrides, run) {
  const snapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      process.env[key] = overrides[key];
    } else {
      delete process.env[key];
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('resolveWorkflowLLMConfig prefers MiniMax envs and normalizes host to /v1', () => {
  withEnv({
    MINIMAX_API_KEY: 'minimax-test-key',
    MINIMAX_API_HOST: 'https://api.minimaxi.com',
    MINIMAX_WORKFLOW_MODEL: 'MiniMax-M2.7',
    OPENAI_API_KEY: 'openai-test-key',
    OPENAI_BASE_URL: 'https://example.com/v1',
    OPENCLAW_CLI_PATH: '/__missing_openclaw_cli__',
  }, () => {
    const config = resolveWorkflowLLMConfig();

    assert.equal(config.available, true);
    assert.equal(config.provider, 'minimax-openai-compatible');
    assert.equal(config.transport, 'openai');
    assert.equal(config.baseURL, 'https://api.minimaxi.com/v1');
    assert.equal(config.model, 'MiniMax-M2.7');
    assert.equal(config.authSource, 'env:MINIMAX_API_KEY');
    assert.equal(config.jsonMode, 'prompt-only');
    assert.deepEqual(config.extraBody, {reasoning_split: true});
  });
});

test('resolveWorkflowLLMConfig keeps MiniMax host when /v1 is already present', () => {
  withEnv({
    MINIMAX_API_KEY: 'minimax-test-key',
    MINIMAX_API_HOST: 'https://api.minimaxi.com/v1/',
    MINIMAX_MODEL: 'MiniMax-M2.7-highspeed',
    OPENCLAW_CLI_PATH: '/__missing_openclaw_cli__',
  }, () => {
    const config = resolveWorkflowLLMConfig();

    assert.equal(config.baseURL, 'https://api.minimaxi.com/v1');
    assert.equal(config.model, 'MiniMax-M2.7-highspeed');
  });
});
