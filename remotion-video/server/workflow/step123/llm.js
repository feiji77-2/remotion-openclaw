const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const {promisify} = require('util');
const OpenAI = require('openai');
const {WorkflowGenerationError} = require('./errors');

const execFileAsync = promisify(execFile);

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
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

function clampOpenClawTransport(value) {
  return normalizeValue(value) === 'local' ? 'local' : DEFAULT_OPENCLAW_TRANSPORT;
}

function resolveOpenClawTimeoutMs() {
  const parsed = Number(process.env.OPENCLAW_WORKFLOW_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 30000 ? parsed : DEFAULT_OPENCLAW_TIMEOUT_MS;
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

function resolveWorkflowLLMConfig() {
  const explicitApiKey = normalizeValue(process.env.OPENAI_API_KEY);
  const explicitBaseURL = normalizeValue(process.env.OPENAI_BASE_URL);
  const explicitOpenAIModel = normalizeValue(process.env.OPENAI_WORKFLOW_MODEL || process.env.OPENAI_MODEL);

  if (explicitApiKey) {
    return {
      available: true,
      provider: explicitBaseURL ? 'openai-compatible' : 'openai',
      transport: 'openai',
      apiKey: explicitApiKey,
      baseURL: explicitBaseURL || undefined,
      model: explicitOpenAIModel || DEFAULT_OPENAI_MODEL,
      authSource: 'env:OPENAI_API_KEY',
      cliPath: null,
    };
  }

  const openClawConfig = resolveOpenClawConfig();
  const openClawCliPath = resolveOpenClawCliPath();
  const openClawModel = resolveOpenClawWorkflowModel(openClawConfig);
  const openClawTransport = clampOpenClawTransport(process.env.OPENCLAW_WORKFLOW_TRANSPORT);
  const openClawConfigPath = resolveOpenClawConfigPath();
  const cliAvailable = openClawCliPath === 'openclaw' || fs.existsSync(openClawCliPath);

  if (openClawConfig && openClawModel && cliAvailable) {
    return {
      available: true,
      provider: 'openclaw-capability',
      transport: openClawTransport,
      apiKey: '',
      baseURL: null,
      model: openClawModel,
      authSource: `config:${openClawConfigPath}`,
      cliPath: openClawCliPath,
    };
  }

  return {
    available: false,
    provider: 'openclaw-capability',
    transport: openClawTransport,
    apiKey: '',
    baseURL: null,
    model: openClawModel || 'unset',
    authSource: openClawConfig ? `config:${openClawConfigPath}` : null,
    cliPath: cliAvailable ? openClawCliPath : null,
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
  if (!config.available || config.transport !== 'openai') {
    return null;
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || undefined,
    timeout: 45000,
    maxRetries: 2,
  });
}

function safeParseJson(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('LLM returned empty content');
  }

  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const objectMatch = candidate.match(/\{[\s\S]*\}$/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw error;
  }
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
      message: 'OpenClaw infer 未返回可解析的文本结果',
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
        message: 'OpenClaw infer 返回了无法修复的 JSON 结构',
        details: buildWorkflowLLMDetails(),
      });
    }

    throw new WorkflowGenerationError({
      status: 503,
      code: 'WORKFLOW_LLM_REQUEST_FAILED',
      message: `OpenClaw infer 调用失败：${summarizeExecError(error)}`,
      details: buildWorkflowLLMDetails(),
    });
  }
}

async function generateStructuredJson({messages, temperature = 0.65, topP = 1}) {
  const config = resolveWorkflowLLMConfig();
  if (!config.available) {
    throw new WorkflowGenerationError({
      status: 503,
      code: 'WORKFLOW_LLM_UNAVAILABLE',
      message: '工作流模型不可用；当前默认走 OpenClaw infer 网关链路，请确认本机已安装 OpenClaw、存在可用配置，并且已配置默认模型',
      details: buildWorkflowLLMDetails(),
    });
  }

  if (config.transport === 'openai') {
    const client = createWorkflowClient();
    try {
      const completion = await client.chat.completions.create({
        model: config.model,
        response_format: {type: 'json_object'},
        temperature,
        top_p: topP,
        messages,
      });
      const content = completion.choices?.[0]?.message?.content;
      return {
        model: config.model,
        payload: safeParseJson(content),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new WorkflowGenerationError({
          status: 422,
          code: 'WORKFLOW_LLM_INVALID_JSON',
          message: '工作流模型返回了无法解析的结构化结果',
          details: buildWorkflowLLMDetails(),
        });
      }

      throw new WorkflowGenerationError({
        status: 503,
        code: 'WORKFLOW_LLM_REQUEST_FAILED',
        message: `工作流模型调用失败：${error.message}`,
        details: buildWorkflowLLMDetails(),
      });
    }
  }

  return generateViaOpenClawCapability({messages, temperature, topP}, config);
}

module.exports = {
  DEFAULT_MODEL,
  createWorkflowClient,
  generateStructuredJson,
  getWorkflowLLMCapabilities,
  hasWorkflowLLM,
  resolveWorkflowLLMConfig,
};
