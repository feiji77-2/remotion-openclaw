const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const {promisify} = require('util');
const OpenAI = require('openai');
const {WorkflowGenerationError} = require('./errors');

const execFileAsync = promisify(execFile);

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7';
const DEFAULT_MINIMAX_API_HOST = 'https://api.minimaxi.com';
const DEFAULT_OPENAI_TIMEOUT_MS = 45000;
const DEFAULT_MINIMAX_TIMEOUT_MS = 240000;
const DEFAULT_OPENCLAW_TRANSPORT = 'gateway';
const DEFAULT_OPENCLAW_TIMEOUT_MS = 240000;

function readJsonFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(value, defaultHost = '') {
  const normalized = normalizeValue(value || defaultHost).replace(/\/+$/, '');
  if (!normalized) {
    return '';
  }
  return /\/v\d+$/i.test(normalized) ? normalized : `${normalized}/v1`;
}

function clampOpenClawTransport(value) {
  return normalizeValue(value) === 'local' ? 'local' : DEFAULT_OPENCLAW_TRANSPORT;
}

function resolveOpenClawTimeoutMs() {
  const parsed = Number(process.env.OPENCLAW_WORKFLOW_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 30000 ? parsed : DEFAULT_OPENCLAW_TIMEOUT_MS;
}

function resolveTimeoutMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 30000 ? parsed : fallback;
}

function resolveOpenClawConfigPath() {
  return path.join(os.homedir(), '.openclaw', 'openclaw.json');
}

function resolveOpenClawConfig() {
  return readJsonFile(resolveOpenClawConfigPath());
}

function resolveOpenClawCliPath() {
  const explicitPath = normalizeValue(process.env.OPENCLAW_CLI_PATH);
  if (explicitPath) {
    return explicitPath;
  }

  const candidates = [
    path.join(os.homedir(), '.openclaw-npm', 'bin', process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw'),
    '/usr/local/bin/openclaw',
    '/opt/homebrew/bin/openclaw',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || 'openclaw';
}

function resolveOpenClawWorkflowModel(config) {
  return normalizeValue(process.env.OPENCLAW_WORKFLOW_MODEL)
    || normalizeValue(config?.agents?.defaults?.model?.primary);
}

// ─────────────────────────────────────────────────────────────────
// Provider 优先级（从高到低）
// 1. WORKFLOW_LLM_PROVIDER 显式指定
// 2. MINIMAX_API_KEY        → minimax-openai-compatible
// 3. OPENAI_API_KEY        → openai / openai-compatible
// 4. ANTHROPIC_API_KEY     → anthropic
// 5. GEMINI_API_KEY         → gemini
// 6. legacy OpenClaw        → 仅 OPENCLAW_LEGACY_FALLBACK=1 时启用
// 7. unavailable           → 给出平台 API 配置提示
// ─────────────────────────────────────────────────────────────────

const PROVIDER_ORDER = [
  'minimax-openai-compatible',
  'openai',
  'openai-compatible',
  'anthropic',
  'gemini',
  'openclaw-legacy',
];

/**
 * 根据 WORKFLOW_LLM_PROVIDER 显式指定或自动探测，返回可用配置。
 * 始终返回稳定结果：available=true 时可立即使用，available=false 时 details 包含诊断信息。
 */
function resolveWorkflowLLMConfig() {
  const explicitProvider = normalizeValue(process.env.WORKFLOW_LLM_PROVIDER);
  const legacyFallbackEnabled = process.env.OPENCLAW_LEGACY_FALLBACK === '1';

  // ── 1. 显式指定优先 ─────────────────────────────────────
  if (explicitProvider) {
    const config = resolveForExplicitProvider(explicitProvider);
    if (config) return config;
    // 显式指定了无效 provider，告知用户可用选项
    return buildUnavailableResult({
      code: 'WORKFLOW_LLM_PROVIDER_INVALID',
      message: `WORKFLOW_LLM_PROVIDER="${explicitProvider}" 不支持。支持的值：auto、minimax、openai、anthropic、gemini、openclaw。`,
    });
  }

  // ── 2. 自动探测（按优先级） ───────────────────────────
  // 2a. MiniMax
  const minimaxKey = normalizeValue(process.env.MINIMAX_API_KEY);
  if (minimaxKey) {
    return {
      available: true,
      provider: 'minimax-openai-compatible',
      transport: 'openai',
      apiKey: minimaxKey,
      baseURL: normalizeBaseUrl(process.env.MINIMAX_API_HOST, DEFAULT_MINIMAX_API_HOST),
      model: normalizeValue(process.env.MINIMAX_WORKFLOW_MODEL || process.env.MINIMAX_MODEL) || DEFAULT_MINIMAX_MODEL,
      authSource: 'env:MINIMAX_API_KEY',
      cliPath: null,
      jsonMode: 'prompt-only',
      extraBody: { reasoning_split: true },
      requestTimeoutMs: resolveTimeoutMs(process.env.MINIMAX_WORKFLOW_TIMEOUT_MS, DEFAULT_MINIMAX_TIMEOUT_MS),
      maxRetries: 0,
    };
  }

  // 2b. OpenAI / OpenAI-compatible
  const openaiKey = normalizeValue(process.env.OPENAI_API_KEY);
  if (openaiKey) {
    const baseURL = normalizeValue(process.env.OPENAI_BASE_URL);
    return {
      available: true,
      provider: baseURL ? 'openai-compatible' : 'openai',
      transport: 'openai',
      apiKey: openaiKey,
      baseURL: baseURL || undefined,
      model: normalizeValue(process.env.OPENAI_WORKFLOW_MODEL || process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      authSource: 'env:OPENAI_API_KEY',
      cliPath: null,
      jsonMode: 'response-format',
      extraBody: null,
      requestTimeoutMs: resolveTimeoutMs(process.env.OPENAI_WORKFLOW_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS),
      maxRetries: 2,
    };
  }

  // 2c. Anthropic
  const anthropicKey = normalizeValue(process.env.ANTHROPIC_API_KEY);
  if (anthropicKey) {
    return {
      available: true,
      provider: 'anthropic',
      transport: 'anthropic',
      apiKey: anthropicKey,
      baseURL: normalizeBaseUrl(process.env.ANTHROPIC_BASE_URL, 'https://api.anthropic.com'),
      model: normalizeValue(process.env.ANTHROPIC_WORKFLOW_MODEL) || 'claude-sonnet-4-20250514',
      authSource: 'env:ANTHROPIC_API_KEY',
      cliPath: null,
      jsonMode: 'prompt-only',       // Anthropic 不支持 response_format，靠 prompt 约束
      extraBody: null,
      requestTimeoutMs: resolveTimeoutMs(process.env.ANTHROPIC_WORKFLOW_TIMEOUT_MS, DEFAULT_MINIMAX_TIMEOUT_MS),
      maxRetries: 2,
    };
  }

  // 2d. Gemini (via Google AI / Vertex AI)
  const geminiKey = normalizeValue(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (geminiKey) {
    const geminiBase = normalizeBaseUrl(process.env.GEMINI_BASE_URL, 'https://generativelanguage.googleapis.com');
    return {
      available: true,
      provider: 'gemini',
      transport: 'openai-compatible',  // Gemini REST API 与 OpenAI 兼容
      apiKey: geminiKey,
      baseURL: geminiBase,
      model: normalizeValue(process.env.GEMINI_WORKFLOW_MODEL) || 'gemini-2.0-flash',
      authSource: 'env:GEMINI_API_KEY (或 GOOGLE_API_KEY)',
      cliPath: null,
      jsonMode: 'response-format',
      extraBody: null,
      requestTimeoutMs: resolveTimeoutMs(process.env.GEMINI_WORKFLOW_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS),
      maxRetries: 2,
    };
  }

  // ── 3. Legacy OpenClaw（仅当显式启用时） ───────────────
  if (legacyFallbackEnabled) {
    const config = tryResolveOpenClawLegacy();
    if (config) return config;
  }

  // ── 4. 没有任何可用 provider ───────────────────────────
  return buildUnavailableResult({
    code: 'WORKFLOW_LLM_UNAVAILABLE',
    message:
      '当前平台没有暴露 LLM API。' +
      '请配置以下任一环境变量：' +
      'MINIMAX_API_KEY（MiniMax）、' +
      'OPENAI_API_KEY（OpenAI/兼容）、' +
      'ANTHROPIC_API_KEY（Claude）、' +
      'GEMINI_API_KEY（Gemini）。',
  });
}

/**
 * 根据显式 WORKFLOW_LLM_PROVIDER 值解析配置
 */
function resolveForExplicitProvider(provider) {
  switch (provider) {
    case 'minimax':
    case 'minimax-openai-compatible':
      if (!normalizeValue(process.env.MINIMAX_API_KEY)) return null;
      return {
        available: true,
        provider: 'minimax-openai-compatible',
        transport: 'openai',
        apiKey: normalizeValue(process.env.MINIMAX_API_KEY),
        baseURL: normalizeBaseUrl(process.env.MINIMAX_API_HOST, DEFAULT_MINIMAX_API_HOST),
        model: normalizeValue(process.env.MINIMAX_WORKFLOW_MODEL || process.env.MINIMAX_MODEL) || DEFAULT_MINIMAX_MODEL,
        authSource: 'env:MINIMAX_API_KEY',
        cliPath: null,
        jsonMode: 'prompt-only',
        extraBody: { reasoning_split: true },
        requestTimeoutMs: resolveTimeoutMs(process.env.MINIMAX_WORKFLOW_TIMEOUT_MS, DEFAULT_MINIMAX_TIMEOUT_MS),
        maxRetries: 0,
      };

    case 'openai':
    case 'openai-compatible':
      if (!normalizeValue(process.env.OPENAI_API_KEY)) return null;
      return {
        available: true,
        provider: provider,
        transport: 'openai',
        apiKey: normalizeValue(process.env.OPENAI_API_KEY),
        baseURL: normalizeValue(process.env.OPENAI_BASE_URL) || undefined,
        model: normalizeValue(process.env.OPENAI_WORKFLOW_MODEL || process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
        authSource: 'env:OPENAI_API_KEY',
        cliPath: null,
        jsonMode: 'response-format',
        extraBody: null,
        requestTimeoutMs: resolveTimeoutMs(process.env.OPENAI_WORKFLOW_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS),
        maxRetries: 2,
      };

    case 'anthropic':
    case 'claude':
      if (!normalizeValue(process.env.ANTHROPIC_API_KEY)) return null;
      return {
        available: true,
        provider: 'anthropic',
        transport: 'anthropic',
        apiKey: normalizeValue(process.env.ANTHROPIC_API_KEY),
        baseURL: normalizeBaseUrl(process.env.ANTHROPIC_BASE_URL, 'https://api.anthropic.com'),
        model: normalizeValue(process.env.ANTHROPIC_WORKFLOW_MODEL) || 'claude-sonnet-4-20250514',
        authSource: 'env:ANTHROPIC_API_KEY',
        cliPath: null,
        jsonMode: 'prompt-only',
        extraBody: null,
        requestTimeoutMs: resolveTimeoutMs(process.env.ANTHROPIC_WORKFLOW_TIMEOUT_MS, DEFAULT_MINIMAX_TIMEOUT_MS),
        maxRetries: 2,
      };

    case 'gemini':
      if (!normalizeValue(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) return null;
      return {
        available: true,
        provider: 'gemini',
        transport: 'openai-compatible',
        apiKey: normalizeValue(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        baseURL: normalizeBaseUrl(process.env.GEMINI_BASE_URL, 'https://generativelanguage.googleapis.com'),
        model: normalizeValue(process.env.GEMINI_WORKFLOW_MODEL) || 'gemini-2.0-flash',
        authSource: 'env:GEMINI_API_KEY',
        cliPath: null,
        jsonMode: 'response-format',
        extraBody: null,
        requestTimeoutMs: resolveTimeoutMs(process.env.GEMINI_WORKFLOW_TIMEOUT_MS, DEFAULT_OPENAI_TIMEOUT_MS),
        maxRetries: 2,
      };

    case 'openclaw':
    case 'openclaw-legacy':
      return tryResolveOpenClawLegacy();

    case 'auto':
      // auto 走自动探测，递归调用时不带 explicit
      return null; // 让自动探测继续

    default:
      return null;
  }
}

/**
 * 仅在 OPENCLAW_LEGACY_FALLBACK=1 时尝试解析 OpenClaw legacy 配置
 */
function tryResolveOpenClawLegacy() {
  const config = resolveOpenClawConfig();
  const cliPath = resolveOpenClawCliPath();
  const model = resolveOpenClawWorkflowModel(config);
  const transport = clampOpenClawTransport(process.env.OPENCLAW_WORKFLOW_TRANSPORT);
  const cliAvailable = cliPath === 'openclaw' || fs.existsSync(cliPath);

  if (config && model && cliAvailable) {
    return {
      available: true,
      provider: 'openclaw-legacy',
      transport,
      apiKey: '',
      baseURL: null,
      model,
      authSource: `config:${resolveOpenClawConfigPath()}`,
      cliPath,
      jsonMode: 'cli-json',
      extraBody: null,
      requestTimeoutMs: resolveOpenClawTimeoutMs(),
      maxRetries: 0,
    };
  }

  return null; // 继续走到 unavailable
}

/**
 * 构建 unavailable 结果（走到底都没有可用 provider 时）
 */
function buildUnavailableResult({ code, message }) {
  return {
    available: false,
    provider: 'none',
    transport: null,
    apiKey: '',
    baseURL: null,
    model: 'unset',
    authSource: null,
    cliPath: null,
    jsonMode: 'cli-json',
    extraBody: null,
    requestTimeoutMs: 0,
    maxRetries: 0,
    _diagnostic: { code, message },
  };
}

function buildWorkflowLLMDetails() {
  const config = resolveWorkflowLLMConfig();
  return {
    provider: config.provider,
    transport: config.transport,
    model: config.model,
    baseURL: config.baseURL,
    authSource: config.authSource,
    cliPath: config.cliPath,
  };
}

const DEFAULT_MODEL = resolveWorkflowLLMConfig().model;

function hasWorkflowLLM() {
  return resolveWorkflowLLMConfig().available;
}

function getWorkflowLLMCapabilities() {
  const config = resolveWorkflowLLMConfig();
  return {
    configured: config.available,
    provider: config.provider,
    transport: config.transport,
    model: config.model,
    mode: config.available ? 'llm' : 'unavailable',
    baseURL: config.baseURL,
    authSource: config.authSource,
  };
}

function createWorkflowClient() {
  const config = resolveWorkflowLLMConfig();
  // openai transport 包括 minimax / openai / openai-compatible / gemini
  if (!config.available || config.transport !== 'openai') {
    return null;
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || undefined,
    timeout: config.requestTimeoutMs || DEFAULT_OPENAI_TIMEOUT_MS,
    maxRetries: Number.isFinite(config.maxRetries) ? config.maxRetries : 2,
  });
}

function safeParseJson(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('LLM returned empty content');
  }

  const trimmed = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\uFEFF/, '')
    .trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const extracted = extractBalancedJsonObject(candidate);
    if (extracted) {
      return JSON.parse(extracted);
    }
    error.input = candidate;
    throw error;
  }
}

function extractBalancedJsonObject(text) {
  const source = typeof text === 'string' ? text : '';
  const start = source.indexOf('{');
  if (start === -1) {
    return '';
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return '';
}

function safeParseCliJson(rawText) {
  try {
    return safeParseJson(rawText);
  } catch (error) {
    const text = typeof rawText === 'string' ? rawText : '';
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    }
    throw error;
  }
}

function buildOpenClawPrompt(messages, {temperature, topP}) {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  return [
    '你正在执行一个 JSON-only 的工作流生成任务。',
    '必须优先遵守 developer 指令，最终只返回合法 JSON，不要 markdown，不要解释。',
    `采样参数参考：temperature=${temperature}; top_p=${topP}.`,
    '',
    ...normalizedMessages.map((message) => {
      const role = String(message?.role || 'user').toUpperCase();
      const content = typeof message?.content === 'string'
        ? message.content.trim()
        : JSON.stringify(message?.content ?? '', null, 2);
      return `[${role}]\n${content}`;
    }),
  ].join('\n\n');
}

function buildJsonOnlyMessages(messages) {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const guardrail = {
    role: 'system',
    content: [
      '你必须只返回一个合法 JSON 对象。',
      '不要输出 markdown，不要输出解释，不要输出额外前后缀。',
      '如果你有思考过程，不要展示出来。',
    ].join(' '),
  };

  if (normalizedMessages[0]?.role === 'system' || normalizedMessages[0]?.role === 'developer') {
    return [
      {
        ...normalizedMessages[0],
        content: `${normalizeValue(normalizedMessages[0]?.content)}\n\n${guardrail.content}`.trim(),
      },
      ...normalizedMessages.slice(1),
    ];
  }

  return [guardrail, ...normalizedMessages];
}

function normalizeOpenAiMessages(messages, config) {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  return normalizedMessages.map((message) => {
    const role = normalizeValue(message?.role) || 'user';
    let nextRole = role;

    if (config?.provider === 'minimax-openai-compatible' && role === 'developer') {
      nextRole = 'system';
    }

    return {
      ...message,
      role: nextRole,
    };
  });
}

async function requestOpenAiContent(client, config, {messages, temperature, topP}) {
  const baseRequestMessages = config.jsonMode === 'response-format'
    ? messages
    : buildJsonOnlyMessages(messages);
  const requestMessages = normalizeOpenAiMessages(baseRequestMessages, config);
  const completion = await client.chat.completions.create({
    model: config.model,
    temperature,
    top_p: topP,
    messages: requestMessages,
    ...(config.jsonMode === 'response-format'
      ? {response_format: {type: 'json_object'}}
      : {}),
    ...(config.extraBody ? {extra_body: config.extraBody} : {}),
  });

  return completion.choices?.[0]?.message?.content;
}

function buildJsonRepairMessages(rawText, parseErrorMessage) {
  return [
    {
      role: 'system',
      content: '你是 JSON 修复器。你只能返回修复后的合法 JSON 对象，不要输出解释，不要输出 markdown。',
    },
    {
      role: 'user',
      content: [
        '下面这段文本本来应该是 JSON，但当前无法被 JSON.parse 解析。',
        `解析报错：${parseErrorMessage}`,
        '请尽量保留原有字段和字段值语义，只修复成合法 JSON。',
        '',
        '原始内容：',
        rawText,
      ].join('\n'),
    },
  ];
}

async function repairJsonViaOpenAi(client, config, rawText, parseErrorMessage) {
  const repairedContent = await requestOpenAiContent(client, config, {
    messages: buildJsonRepairMessages(rawText, parseErrorMessage),
    temperature: 0,
    topP: 1,
  });

  return safeParseJson(repairedContent);
}

function extractOpenClawTextPayload(result) {
  const outputs = Array.isArray(result?.outputs) ? result.outputs : [];
  return outputs
    .map((item) => normalizeValue(item?.text))
    .find(Boolean) || '';
}

function summarizeExecError(error) {
  const candidate = [
    normalizeValue(error?.stderr),
    normalizeValue(error?.stdout),
    normalizeValue(error?.message),
  ].find(Boolean) || 'unknown error';
  return candidate.length > 320 ? `${candidate.slice(0, 319)}…` : candidate;
}

async function runOpenClawInferPrompt(prompt, config) {
  const args = [
    'infer',
    'model',
    'run',
    `--${config.transport}`,
    '--model',
    config.model,
    '--prompt',
    prompt,
    '--json',
  ];

  const {stdout} = await execFileAsync(config.cliPath, args, {
    timeout: resolveOpenClawTimeoutMs(),
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
  const result = safeParseCliJson(stdout);
  const textPayload = extractOpenClawTextPayload(result);
  if (!textPayload) {
    throw new WorkflowGenerationError({
      status: 422,
      code: 'WORKFLOW_LLM_EMPTY_OUTPUT',
      message: 'OpenClaw legacy infer 未返回可解析的文本结果',
      details: buildWorkflowLLMDetails(),
    });
  }
  return textPayload;
}

async function repairJsonViaOpenClaw(rawText, parseErrorMessage, config) {
  const repairPrompt = [
    '你是 JSON 修复器。',
    '下面是一段本该是 JSON 的文本，但当前无法被 JSON.parse 解析。',
    '你只能返回修复后的合法 JSON，不要解释，不要 markdown，不要补充无关字段。',
    '尽可能保留原字段和原值语义。',
    `解析报错：${parseErrorMessage}`,
    '',
    '原始内容：',
    rawText,
  ].join('\n');

  return runOpenClawInferPrompt(repairPrompt, config);
}

async function generateViaOpenClawCapability({messages, temperature, topP}, config) {
  const prompt = buildOpenClawPrompt(messages, {temperature, topP});

  try {
    const textPayload = await runOpenClawInferPrompt(prompt, config);

    try {
      return {
        model: config.model,
        payload: safeParseJson(textPayload),
      };
    } catch (parseError) {
      const repairedPayload = await repairJsonViaOpenClaw(textPayload, parseError.message, config);
      return {
        model: config.model,
        payload: safeParseJson(repairedPayload),
      };
    }
  } catch (error) {
    if (error instanceof WorkflowGenerationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new WorkflowGenerationError({
        status: 422,
        code: 'WORKFLOW_LLM_INVALID_JSON',
        message: 'OpenClaw legacy infer 返回了无法修复的 JSON 结构',
        details: buildWorkflowLLMDetails(),
      });
    }

    throw new WorkflowGenerationError({
      status: 503,
      code: 'WORKFLOW_LLM_REQUEST_FAILED',
      message: `OpenClaw legacy infer 调用失败：${summarizeExecError(error)}`,
      details: buildWorkflowLLMDetails(),
    });
  }
}

async function generateStructuredJson({messages, temperature = 0.65, topP = 1}) {
  const config = resolveWorkflowLLMConfig();
  if (!config.available) {
    const diag = config._diagnostic || {};
    throw new WorkflowGenerationError({
      status: 503,
      code: diag.code || 'WORKFLOW_LLM_UNAVAILABLE',
      message: diag.message ||
        '当前平台没有暴露 LLM API。请配置 MINIMAX_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY 其一。',
      details: buildWorkflowLLMDetails(),
    });
  }

  if (config.transport === 'openai') {
    const client = createWorkflowClient();
    try {
      const content = await requestOpenAiContent(client, config, {messages, temperature, topP});

      return {
        model: config.model,
        payload: safeParseJson(content),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        try {
          return {
            model: config.model,
            payload: await repairJsonViaOpenAi(client, config, error.input || '', error.message),
          };
        } catch (repairError) {
          throw new WorkflowGenerationError({
            status: 422,
            code: 'WORKFLOW_LLM_INVALID_JSON',
            message: '工作流模型返回了无法解析的结构化结果',
            details: buildWorkflowLLMDetails(),
          });
        }
      }

      throw new WorkflowGenerationError({
        status: 503,
        code: 'WORKFLOW_LLM_REQUEST_FAILED',
        message: `工作流模型调用失败：${error.message}`,
        details: buildWorkflowLLMDetails(),
      });
    }
  }

  if (config.transport === 'anthropic') {
    const content = await requestAnthropicContent(config, {messages, temperature, topP});
    return {
      model: config.model,
      payload: safeParseJson(content),
    };
  }

  if (config.transport === 'openclaw-legacy') {
    return generateViaOpenClawCapability({messages, temperature, topP}, config);
  }

  // 兜底（不应该走到这里）
  throw new WorkflowGenerationError({
    status: 500,
    code: 'WORKFLOW_LLM_UNSUPPORTED_TRANSPORT',
    message: `不支持的 LLM transport: ${config.transport}`,
    details: buildWorkflowLLMDetails(),
  });
}

async function requestAnthropicContent(config, {messages, temperature, topP}) {
  const requestMessages = buildJsonOnlyMessages(messages);
  const body = {
    model: config.model,
    messages: requestMessages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: 8192,
    temperature,
  };
  if (topP !== 1) body.top_p = topP;

  const url = `${config.baseURL}/v1/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.requestTimeoutMs || 60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error('Anthropic returned empty content');
  }
  return content;
}

module.exports = {
  DEFAULT_MODEL,
  createWorkflowClient,
  generateStructuredJson,
  getWorkflowLLMCapabilities,
  hasWorkflowLLM,
  resolveWorkflowLLMConfig,
};
