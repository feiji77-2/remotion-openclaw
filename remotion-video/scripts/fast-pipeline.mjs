#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  buildStep1Prompt, validateStep1Payload,
  buildStep2Prompt, validateStep2Payload,
  buildStep3Prompt, validateStep3Payload,
} from './fast-pipeline-prompt-kit.mjs';

const require = createRequire(import.meta.url);

// Load .env from project root
const dotenv = require('dotenv');
const envPath = path.resolve(fileURLToPath(import.meta.url), '../../.env');
dotenv.config({ path: envPath });

const { generateStructuredJson, hasWorkflowLLM, resolveWorkflowLLMConfig } = require('../server/workflow/step123/llm');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REMOTION_ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(REMOTION_ROOT, 'projects');
const PIPELINE_DIR = (projectId) => path.join(PROJECTS_DIR, projectId, 'fast-pipeline');
const DDG_SCRIPT = path.join(REMOTION_ROOT, 'scripts', 'fetch-ddg-search.py');
const CACHE_VERSION = 1;

function safeString(v) {
  return String(v || '').trim();
}

function hashValue(obj) {
  return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex').slice(0, 12);
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function writeJson(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printTiming(label, ms) {
  const s = (ms / 1000).toFixed(1);
  console.log(`  ⏱  ${label} (${s}s)`);
}

async function searchTopic(topic, timeoutMs = 10000) {
  // Try DuckDuckGo first
  const ddgResults = await searchViaDDG(topic, timeoutMs);
  if (ddgResults.length > 0) return ddgResults;

  // Fallback: try Bing (accessible in China)
  const bingResults = await searchViaBing(topic, timeoutMs);
  if (bingResults.length > 0) return bingResults;

  console.log('  [search] 搜索不可用，使用 LLM 知识库');
  return [];
}

async function searchViaDDG(topic, timeoutMs) {
  try {
    const start = Date.now();
    const { execFileSync } = await import('node:child_process');
    const stdout = execFileSync(
      'python3',
      [DDG_SCRIPT, topic, 'pd'],
      { cwd: REMOTION_ROOT, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 512 * 1024 },
    );
    const parsed = JSON.parse(stdout);
    if (parsed.error || !Array.isArray(parsed.results)) return [];
    console.log(`  [search] DuckDuckGo ${parsed.results.length} 条结果 (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    return parsed.results.slice(0, 5).map(r => ({
      title: safeString(r.title),
      snippet: safeString(r.snippet),
    }));
  } catch (err) {
    if (err instanceof Error && err.message) {
      console.debug(`  [search] DDG 失败: ${err.message.slice(0, 100)}`);
    }
    return [];
  }
}

async function searchViaBing(topic, timeoutMs) {
  const start = Date.now();
  try {
    const url = `https://cn.bing.com/search?q=${encodeURIComponent(topic)}&count=5`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Find the results <ol> and extract within
    const olMatch = html.match(/<ol id="b_results"[\s\S]*?<\/ol>/i);
    if (!olMatch) return [];
    const olHtml = olMatch[0];

    // Extract each b_algo result item (with data-id attribute)
    const results = [];
    const itemRegex = /<li[^>]*class="b_algo"[^>]*data-id[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = itemRegex.exec(olHtml)) !== null && results.length < 5) {
      const item = match[1];
      // Skip items that are just CSS links (no <h2>)
      if (!item.includes('<h2')) continue;
      const titleMatch = item.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = item.match(/<p[^>]*class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (titleMatch) {
        results.push({
          title: titleMatch[2].replace(/<[^>]+>/g, '').trim(),
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
          url: titleMatch[1],
        });
      }
    }
    if (results.length > 0) {
      console.log(`  [search] Bing ${results.length} 条结果 (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    }
    return results;
  } catch (err) {
    if (err instanceof Error && err.message) {
      console.debug(`  [search] Bing 失败: ${err.message.slice(0, 100)}`);
    }
    return [];
  }
}

async function runStep1(topic, searchResults) {
  printSection('Step 1/3: 搜索 + 分析');
  const start = Date.now();
  const prompt = buildStep1Prompt(topic, searchResults);
  const result = await generateStructuredJson({
    temperature: 0.5,
    topP: 1,
    messages: [
      { role: 'developer', content: 'You generate strict JSON for a Chinese short-video workflow. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  });
  const payload = validateStep1Payload(result.payload);
  printTiming('LLM 分析', Date.now() - start);
  console.log(`  命题: ${payload.analysis.thesis}`);
  console.log(`  受众: ${payload.analysis.audience}`);
  console.log(`  事实: ${payload.analysis.searchFacts.length} 条`);
  return payload;
}

async function runStep2(analysis) {
  printSection('Step 2/3: 爆款标题 + 口播稿');
  const start = Date.now();
  const prompt = buildStep2Prompt(analysis);
  const result = await generateStructuredJson({
    temperature: 0.6,
    topP: 1,
    messages: [
      { role: 'developer', content: 'You generate strict JSON for a Chinese short-video workflow. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  });
  const payload = validateStep2Payload(result.payload);
  printTiming('LLM 标题+文案', Date.now() - start);
  console.log(`  标题: ${payload.title}`);
  console.log(`  角度: ${payload.titleAngle}`);
  console.log(`  口播: ${payload.script.hook.slice(0, 30)}... → ${(payload.script.body || []).length} 段 → ${payload.script.cta.slice(0, 20)}...`);
  return payload;
}

async function runStep3(title, script) {
  printSection('Step 3/3: 分镜 + 视觉提示');
  const start = Date.now();
  const prompt = buildStep3Prompt(title, script);
  const result = await generateStructuredJson({
    temperature: 0.55,
    topP: 1,
    messages: [
      { role: 'developer', content: 'You generate strict JSON for a Chinese short-video workflow. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  });
  const payload = validateStep3Payload(result.payload);
  printTiming('LLM 分镜', Date.now() - start);
  console.log(`  场景数: ${payload.scenes.length}`);
  console.log(`  总时长: ${payload.totalDurationSeconds}s`);
  return payload;
}

async function runWithRetry(runner, label, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runner(attempt);
    } catch (err) {
      console.error(`  [error] ${label} 第 ${attempt + 1}/${maxRetries + 1} 次失败: ${err.message}`);
      if (attempt >= maxRetries) throw err;
      console.log(`  [retry] ${label} 重试中...`);
    }
  }
}

async function loadCachedStep(projectDir, stepIndex, inputHash) {
  const stepFile = path.join(projectDir, `step-${stepIndex}.json`);
  if (!await fileExists(stepFile)) return null;
  const cached = await readJson(stepFile);
  if (cached.inputHash === inputHash && cached.cacheVersion === CACHE_VERSION) {
    return cached.payload;
  }
  return null;
}

async function saveStepCache(projectDir, stepIndex, inputHash, payload) {
  await writeJson(path.join(projectDir, `step-${stepIndex}.json`), {
    cacheVersion: CACHE_VERSION,
    inputHash,
    generatedAt: new Date().toISOString(),
    payload,
  });
}

function buildCacheInput(stepIndex, topic, searchResults, previousPayloads) {
  return { stepIndex, topic, searchResults, ...previousPayloads };
}

async function runFastPipeline(topic, options = {}) {
  const { force = false, projectId: explicitProjectId } = options;
  const projectId = explicitProjectId || topic
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  const pipelineDir = PIPELINE_DIR(projectId);
  await fs.mkdir(pipelineDir, { recursive: true });

  const overallStart = Date.now();
  console.log(`主题: ${topic}`);
  console.log(`项目: ${projectId}`);

  // ── Search ──
  const searchResults = await searchTopic(topic);

  // ── Step 1: Analysis ──
  const step1Input = buildCacheInput(1, topic, searchResults, {});
  const step1Hash = hashValue(step1Input);
  let step1Result;
  if (!force) {
    step1Result = await loadCachedStep(pipelineDir, 1, step1Hash);
  }
  if (!step1Result) {
    step1Result = await runWithRetry(
      () => runStep1(topic, searchResults),
      'Step 1',
    );
    await saveStepCache(pipelineDir, 1, step1Hash, step1Result);
  } else {
    console.log('  [cache] Step 1 使用缓存');
  }

  // ── Step 2: Title + Script ──
  const step2Input = buildCacheInput(2, topic, searchResults, { analysis: step1Result.analysis });
  const step2Hash = hashValue(step2Input);
  let step2Result;
  if (!force) {
    step2Result = await loadCachedStep(pipelineDir, 2, step2Hash);
  }
  if (!step2Result) {
    step2Result = await runWithRetry(
      () => runStep2(step1Result.analysis),
      'Step 2',
    );
    await saveStepCache(pipelineDir, 2, step2Hash, step2Result);
  } else {
    console.log('  [cache] Step 2 使用缓存');
  }

  // ── Step 3: Scenes ──
  const step3Input = buildCacheInput(3, topic, searchResults, { title: step2Result.title, script: step2Result.script });
  const step3Hash = hashValue(step3Input);
  let step3Result;
  if (!force) {
    step3Result = await loadCachedStep(pipelineDir, 3, step3Hash);
  }
  if (!step3Result) {
    step3Result = await runWithRetry(
      () => runStep3(step2Result.title, step2Result.script),
      'Step 3',
    );
    await saveStepCache(pipelineDir, 3, step3Hash, step3Result);
  } else {
    console.log('  [cache] Step 3 使用缓存');
  }

  // ── Summary ──
  const totalMs = Date.now() - overallStart;
  printSection('完成');
  console.log(`  总耗时: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  标题: ${step2Result.title}`);
  console.log(`  场景数: ${step3Result.scenes.length}`);
  console.log(`  输出: ${pipelineDir}/`);

  // Write result.json
  const fullResult = {
    generatedAt: new Date().toISOString(),
    topic,
    projectId,
    pipelineVersion: CACHE_VERSION,
    analysis: step1Result.analysis,
    title: step2Result.title,
    titleAngle: step2Result.titleAngle,
    script: step2Result.script,
    scenes: step3Result.scenes,
    totalDurationSeconds: step3Result.totalDurationSeconds,
    timings: { totalMs },
  };
  await writeJson(path.join(pipelineDir, 'result.json'), fullResult);

  return fullResult;
}

function printUsage() {
  console.log(`用法:
  node scripts/fast-pipeline.mjs "你的标题" [options]

选项:
  --force       强制重新生成所有步骤（跳过缓存）
  --project-id  指定项目 ID
  --help        显示帮助
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(args.includes('--help') ? 0 : 1);
  }

  let topic = '';
  const options = { force: false, projectId: null };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--force': options.force = true; break;
      case '--project-id': {
        const next = args[i + 1];
        if (!next || next.startsWith('--')) {
          console.error('错误: --project-id 需要提供一个值');
          process.exit(1);
        }
        options.projectId = args[++i];
        break;
      }
      default:
        if (!topic) topic = args[i];
        break;
    }
  }

  if (!topic) {
    printUsage();
    process.exit(1);
  }

  if (!hasWorkflowLLM()) {
    const config = resolveWorkflowLLMConfig();
    const hasDotEnv = require('fs').existsSync(envPath);
    console.error('错误: 未配置可用的 LLM。');
    console.error(`当前配置: provider=${config.provider}, transport=${config.transport}, model=${config.model || '未设置'}`);
    console.error('');
    console.error('解决方法:');
    console.error('  1. 设置环境变量 MINIMAX_API_KEY（当前推荐方案）');
    console.error('  2. 设置环境变量 OPENAI_API_KEY');
    console.error('  3. 安装并配置 OpenClaw CLI');
    if (!hasDotEnv) {
      console.error('');
      console.error(`  提示: .env 文件不存在于 ${envPath}`);
      console.error('  可创建该文件并写入 MINIMAX_API_KEY=your_key_here');
    }
    process.exit(1);
  }

  try {
    const result = await runFastPipeline(topic, options);
    console.log(`\n${JSON.stringify({ status: 'ok', projectId: result.projectId, title: result.title, sceneCount: result.scenes.length, totalDurationSeconds: result.totalDurationSeconds, timings: result.timings }, null, 2)}`);
  } catch (err) {
    console.error(`\n错误: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
