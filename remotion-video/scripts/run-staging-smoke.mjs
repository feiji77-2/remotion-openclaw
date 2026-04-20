import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

dotenv.config({path: path.join(projectRoot, '.env.staging'), override: false});
dotenv.config({path: path.join(projectRoot, '.env'), override: false});

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PIPELINE_API_BASE || `http://127.0.0.1:${process.env.PORT || '3001'}`,
    apiKey: process.env.PIPELINE_API_KEY || '',
    adminKey: process.env.PIPELINE_ADMIN_KEY || process.env.PIPELINE_API_KEY || '',
    timeoutMs: Number.parseInt(process.env.PIPELINE_SMOKE_TIMEOUT_MS || '240000', 10),
    projectId: `staging-smoke-${Date.now()}`,
    skipWorkflow: false,
    skipImages: false,
    skipVoice: false,
    skipRender: false,
    allowFileQueue: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--base-url':
        args.baseUrl = String(argv[index + 1] || args.baseUrl);
        index += 1;
        break;
      case '--api-key':
        args.apiKey = String(argv[index + 1] || args.apiKey);
        index += 1;
        break;
      case '--admin-key':
        args.adminKey = String(argv[index + 1] || args.adminKey);
        index += 1;
        break;
      case '--timeout-ms':
        args.timeoutMs = Number.parseInt(String(argv[index + 1] || args.timeoutMs), 10);
        index += 1;
        break;
      case '--project':
        args.projectId = sanitizeProjectId(String(argv[index + 1] || args.projectId));
        index += 1;
        break;
      case '--skip-workflow':
        args.skipWorkflow = true;
        break;
      case '--skip-images':
        args.skipImages = true;
        break;
      case '--skip-voice':
        args.skipVoice = true;
        break;
      case '--skip-render':
        args.skipRender = true;
        break;
      case '--allow-file-queue':
        args.allowFileQueue = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (token.startsWith('--')) {
          throw new Error(`Unknown argument: ${token}`);
        }
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/run-staging-smoke.mjs [options]

Options:
  --base-url <url>       API base URL, default PIPELINE_API_BASE or http://127.0.0.1:3001
  --api-key <key>        API key for regular routes
  --admin-key <key>      Admin key for management routes
  --project <id>         Project id prefix for smoke artifacts
  --timeout-ms <ms>      Polling timeout, default 240000
  --skip-workflow        Skip workflow generation smoke
  --skip-images          Skip storyboard image smoke
  --skip-voice           Skip voice smoke
  --skip-render          Skip render + download smoke
  --allow-file-queue     Do not fail when /health reports file queue
  --help                 Show this message
`);
}

function sanitizeProjectId(value) {
  return String(value || 'staging-smoke')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'staging-smoke';
}

function assertNonEmpty(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function headers(apiKey, extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? {'X-API-Key': apiKey} : {}),
    ...extraHeaders,
  };
}

async function fetchJson(baseUrl, pathname, {method = 'GET', apiKey = '', body, extraHeaders} = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: headers(apiKey, extraHeaders),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json?.error === 'string' ? json.error : `Request failed: ${response.status}`;
    const error = new Error(`${method} ${pathname}: ${message}`);
    error.status = response.status;
    throw error;
  }
  return json;
}

async function waitForJob(baseUrl, pathname, {apiKey, timeoutMs, label}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const job = await fetchJson(baseUrl, pathname, {method: 'GET', apiKey});
    const status = String(job.status || '');
    if (status === 'done') {
      return job;
    }
    if (status === 'error') {
      throw new Error(`${label} failed: ${job.error || 'unknown error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`${label} timed out after ${timeoutMs}ms`);
}

function logStep(title) {
  console.log(`\n[smoke] ${title}`);
}

function buildSmokeShots() {
  return [
    {
      id: 'shot-01',
      title: '安全加固',
      narration: '我们先检查接口安全和任务边界，避免在 staging 环境里被直接打穿。',
      durationSeconds: 2.4,
    },
    {
      id: 'shot-02',
      title: '异步验证',
      narration: '接着验证工作流异步任务、配音、图片和渲染链路是否还能正常走通。',
      durationSeconds: 2.8,
    },
  ];
}

function buildSmokePrompts() {
  return {
    byShotId: {
      'shot-01': {
        prompt: 'cyber security dashboard, alert badges, code window, blue highlights',
        promptZh: '科技安全控制台，告警标记，代码窗口，蓝色高亮',
        shotTitle: '安全加固',
      },
      'shot-02': {
        prompt: 'workflow control room, render queue, progress panels, cinematic software lab',
        promptZh: '工作流控制室，渲染队列，进度面板，软件实验室质感',
        shotTitle: '异步验证',
      },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.baseUrl.replace(/\/+$/, '');
  const apiKey = assertNonEmpty(args.apiKey, 'PIPELINE_API_KEY or --api-key');
  const adminKey = args.adminKey || apiKey;
  const projectId = args.projectId;
  const shots = buildSmokeShots();
  const script = shots.map((item) => item.narration).join(' ');

  logStep(`Checking health at ${baseUrl}`);
  const health = await fetchJson(baseUrl, '/health');
  console.log(`[smoke] health ok, queue mode=${health.mode}`);
  if (health.mode === 'file' && !args.allowFileQueue) {
    throw new Error('Health check reports file queue; staging smoke expects redis unless --allow-file-queue is set');
  }

  logStep('Checking auth-protected skill catalog');
  const skillCatalog = await fetchJson(baseUrl, '/api/skills/catalog', {apiKey});
  console.log(`[smoke] skill catalog entries=${Array.isArray(skillCatalog.skills) ? skillCatalog.skills.length : 0}`);

  if (!args.skipWorkflow) {
    logStep('Submitting workflow smoke job');
    const workflowJob = await fetchJson(baseUrl, '/api/workflow/generate', {
      method: 'POST',
      apiKey,
      body: {
        stepId: 1,
        generationMeta: {
          mode: 'generate',
          trigger: 'smoke',
          attempt: 0,
        },
        projectState: {
          id: projectId,
          name: 'Staging Smoke',
          fps: 30,
          width: 1920,
          height: 1080,
        },
        shotsState: shots,
        pipelineState: {
          inputTopic: 'OpenClaw staging smoke',
          inputTitleKeywords: 'OpenClaw staging smoke',
        },
      },
    });
    const workflowResult = await waitForJob(baseUrl, `/api/workflow/${workflowJob.jobId}`, {
      apiKey,
      timeoutMs: args.timeoutMs,
      label: 'workflow job',
    });
    console.log(`[smoke] workflow done, step=${workflowResult.result?.stepId ?? 'unknown'}`);
  }

  if (!args.skipImages) {
    logStep('Submitting image smoke job');
    const imageJob = await fetchJson(baseUrl, '/api/images/generate', {
      method: 'POST',
      apiKey,
      body: {
        projectId,
        prompts: buildSmokePrompts(),
        shots,
      },
    });
    const imageResult = await waitForJob(baseUrl, `/api/images/${imageJob.jobId}`, {
      apiKey,
      timeoutMs: args.timeoutMs,
      label: 'image job',
    });
    console.log(`[smoke] images done, count=${imageResult.completed || 0}`);
  }

  if (!args.skipVoice) {
    logStep('Submitting voice smoke job');
    const voiceJob = await fetchJson(baseUrl, '/api/voice', {
      method: 'POST',
      apiKey,
      body: {
        projectId,
        shots,
        voiceSettings: {
          engine: 'chattts',
        },
      },
    });
    const voiceResult = await waitForJob(baseUrl, `/api/voice/${voiceJob.jobId}`, {
      apiKey,
      timeoutMs: args.timeoutMs,
      label: 'voice job',
    });
    const queueSize = Array.isArray(voiceResult.result?.queue)
      ? voiceResult.result.queue.length
      : Array.isArray(voiceResult.queue)
        ? voiceResult.queue.length
        : 0;
    console.log(`[smoke] voice done, clips=${queueSize}`);
  }

  if (!args.skipRender) {
    logStep('Submitting render smoke job');
    const renderJob = await fetchJson(baseUrl, '/api/render', {
      method: 'POST',
      apiKey,
      body: {
        projectId,
        script,
        template: 'caption',
        quality: 'high',
        voice: 'chattts',
        shots,
        subtitleText: script,
        durationInFrames: 150,
        renderFps: 30,
        renderWidth: 1920,
        renderHeight: 1080,
        options: {
          smokeTest: true,
          smokeDurationFrames: 90,
        },
      },
    });
    const renderResult = await waitForJob(baseUrl, `/api/render/${renderJob.jobId}`, {
      apiKey,
      timeoutMs: args.timeoutMs,
      label: 'render job',
    });
    console.log(`[smoke] render done, output=${renderResult.outputUrl || renderResult.downloadUrl || 'n/a'}`);
    if (renderResult.downloadUrl) {
      const download = await fetch(`${baseUrl}${renderResult.downloadUrl}`, {
        headers: headers(apiKey),
      });
      if (!download.ok) {
        throw new Error(`Render download failed: HTTP ${download.status}`);
      }
      console.log(`[smoke] download check ok (${download.status})`);
    }
  }

  logStep('Checking admin endpoints');
  const jobs = await fetchJson(baseUrl, '/api/jobs', {apiKey: adminKey});
  console.log(`[smoke] admin jobs visible=${Array.isArray(jobs.jobs) ? jobs.jobs.length : 0}`);
  const assets = await fetchJson(baseUrl, `/api/projects/${projectId}/assets`, {apiKey: adminKey});
  console.log(`[smoke] admin assets visible=${Array.isArray(assets.assets) ? assets.assets.length : 0}`);

  console.log('\n[smoke] staging smoke completed successfully');
}

main().catch((error) => {
  console.error(`\n[smoke] failed: ${error.message || error}`);
  process.exit(1);
});
