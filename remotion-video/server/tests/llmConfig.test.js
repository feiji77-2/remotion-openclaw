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
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_WORKFLOW_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_BASE_URL',
  'GEMINI_WORKFLOW_MODEL',
  'GOOGLE_API_KEY',
  'WORKFLOW_LLM_PROVIDER',
  'OPENCLAW_LEGACY_FALLBACK',
  'OPENCLAW_CLI_PATH',
  'OPENCLAW_WORKFLOW_TRANSPORT',
  'OPENCLAW_WORKFLOW_MODEL',
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

// ── WORKFLOW_LLM_PROVIDER 显式指定 ──────────────────────────────────────────

test('WORKFLOW_LLM_PROVIDER=auto falls through to auto-detection (MiniMax)', () => {
  withEnv({
    WORKFLOW_LLM_PROVIDER: 'auto',
    MINIMAX_API_KEY: 'minimax-test-key',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'minimax-openai-compatible');
    assert.equal(config.transport, 'openai');
  });
});

test('WORKFLOW_LLM_PROVIDER=openai uses OpenAI even when MiniMax key present', () => {
  withEnv({
    WORKFLOW_LLM_PROVIDER: 'openai',
    MINIMAX_API_KEY: 'minimax-test-key',
    OPENAI_API_KEY: 'sk-openai-test',
    OPENAI_WORKFLOW_MODEL: 'gpt-4o',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'openai');
    assert.equal(config.transport, 'openai');
    assert.equal(config.model, 'gpt-4o');
  });
});

test('WORKFLOW_LLM_PROVIDER=anthropic selects anthropic transport', () => {
  withEnv({
    WORKFLOW_LLM_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    ANTHROPIC_WORKFLOW_MODEL: 'claude-sonnet-4-20250514',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'anthropic');
    assert.equal(config.transport, 'anthropic');
    assert.equal(config.model, 'claude-sonnet-4-20250514');
    assert.equal(config.jsonMode, 'prompt-only'); // Anthropic 无 response_format
  });
});

test('WORKFLOW_LLM_PROVIDER=gemini selects gemini provider with correct baseURL', () => {
  withEnv({
    WORKFLOW_LLM_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'gemini-test-key',
    GEMINI_WORKFLOW_MODEL: 'gemini-2.0-flash',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'gemini');
    assert.equal(config.transport, 'openai'); // Gemini 走 openai transport
    assert.ok(config.baseURL.includes('generativelanguage.googleapis.com'));
    assert.equal(config.model, 'gemini-2.0-flash');
  });
});

test('WORKFLOW_LLM_PROVIDER=invalid reports INVALID error', () => {
  withEnv({
    WORKFLOW_LLM_PROVIDER: 'foobar',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, false);
    assert.equal(config._diagnostic.code, 'WORKFLOW_LLM_PROVIDER_INVALID');
    assert.ok(config._diagnostic.message.includes('foobar'));
  });
});

// ── 自动探测优先级 ──────────────────────────────────────────────────────────────

test('ANTHROPIC_API_KEY detected in auto mode (priority below MiniMax/OpenAI)', () => {
  withEnv({
    ANTHROPIC_API_KEY: 'sk-ant-test',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'anthropic');
    assert.equal(config.transport, 'anthropic');
    assert.equal(config.baseURL, 'https://api.anthropic.com/v1');
  });
});

test('GEMINI_API_KEY detected in auto mode', () => {
  withEnv({
    GEMINI_API_KEY: 'gemini-test-key',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'gemini');
    assert.equal(config.transport, 'openai');
    // 默认 baseURL: .../v1beta/openai/v1
    assert.ok(config.baseURL.includes('v1beta/openai/v1'));
  });
});

test('GOOGLE_API_KEY also triggers Gemini provider', () => {
  withEnv({
    GOOGLE_API_KEY: 'google-test-key',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, true);
    assert.equal(config.provider, 'gemini');
    assert.equal(config.authSource, 'env:GEMINI_API_KEY (或 GOOGLE_API_KEY)');
  });
});

test('no API keys → unavailable with platform API hint (not OpenClaw)', () => {
  withEnv({}, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, false);
    assert.equal(config.provider, 'none');
    assert.ok(config._diagnostic.message.includes('MINIMAX_API_KEY'));
    assert.ok(config._diagnostic.message.includes('OPENAI_API_KEY'));
    assert.ok(config._diagnostic.message.includes('ANTHROPIC_API_KEY'));
    assert.ok(config._diagnostic.message.includes('GEMINI_API_KEY'));
    // 错误信息不应提及 OpenClaw
    assert.ok(!config._diagnostic.message.includes('OpenClaw'));
  });
});

// ── OpenClaw Legacy Fallback ───────────────────────────────────────────────────

test('OPENCLAW_LEGACY_FALLBACK=1 with missing CLI → unavailable (not silently skipped)', () => {
  withEnv({
    OPENCLAW_LEGACY_FALLBACK: '1',
    OPENCLAW_CLI_PATH: '/__no_such_openclaw__',
  }, () => {
    const config = resolveWorkflowLLMConfig();
    assert.equal(config.available, false);
    assert.equal(config.provider, 'none');
  });
});
