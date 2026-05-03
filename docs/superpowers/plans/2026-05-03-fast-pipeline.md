# Fast Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-step LLM pipeline that takes a topic/title → searches web → generates viral title + spoken script + storyboard with visual prompts, all in ~1-3 minutes.

**Architecture:** Single ESM script (`fast-pipeline.mjs`) with inline prompts for each of 3 steps, reusing existing `generateStructuredJson` from the server LLM module and the DuckDuckGo search Python script. Cache to disk for resume support.

**Tech Stack:** Node.js 20+, ESM, OpenAI SDK (via existing llm.js), DuckDuckGo HTML search (Python)

---

## File Structure

**Create (2 files):**

| File | Responsibility |
|---|---|
| `remotion-video/scripts/fast-pipeline.mjs` | Main script: CLI args, orchestration, 3 steps' prompts + parsing, cache/resume, output |
| `remotion-video/scripts/fast-pipeline-prompt-kit.mjs` | Prompt templates, schema definitions, DeAI rules, title formulas — shared knowledge extracted from the 3 `docs/workflow-skills/*.SKILL.md` files |

**No existing files modified.** No existing skills deleted (left for backwards compatibility with old pipeline).

---

### Task 1: Create prompt kit module

**File:** `remotion-video/scripts/fast-pipeline-prompt-kit.mjs`

This module contains all the shared knowledge extracted from the 3 `.SKILL.md` files + skillRegistry.js. It provides prompt-building functions and schema validators for all 3 pipeline steps.

- [ ] **Step 1: Create the file with DeAI rules and title formulas**

```mjs
// fast-pipeline-prompt-kit.mjs
// Consolidated knowledge from docs/workflow-skills/*.SKILL.md + server/workflow/skillRegistry.js

export const SCENE_FAMILIES = [
  'hero', 'focus', 'feature-rail', 'step-flow', 'timeline',
  'compare-board', 'number-strip', 'terminal', 'evidence-wall',
  'tag-matrix', 'code', 'architecture-map', 'metrics', 'data-stream',
  'memory-graph', 'pipeline-flow', 'benchmark-chart', 'quote-highlight',
  'glossary-term', 'cta',
];

export const SCENE_FAMILY_RULES = `硬规则：
- 第一屏固定 hero
- 最后一屏固定 cta
- 中段场景优先保持 family 多样性
- 避免连续 3 个 shot 使用同一类 family
- 如果正文有数据段，至少给一次图形型 family（如 benchmark-chart / data-stream / number-strip），不要全做文字面板`;

export const TITLE_TECHNIQUES = `爆款标题手法（至少用一种）：
1. 数字法 — 具体数字制造记忆锚点（如"82.7%编码能力"）
2. 反差法 — 认知/身份反差制造矛盾（如"程序员开始抢产品经理的活"）
3. 悬念法 — 制造信息缺口让人想点开（如"OpenAI没告诉你的三个秘密"）
4. 身份标签法 — 精准人群定位（如"程序员必看"）
5. 疑问法 — 抛出观众最想问的问题（如"GPT-5.5到底强在哪？"）
6. 对话法 — 口语化制造对话感（如"凭什么卖这么贵？看完我沉默了"）

每个标题必须：
- 至少包含一种爆款手法
- 有具体数据或场景（不能泛泛而谈）
- 控制在 25 字以内
- 口语化，符合抖音/视频号传播语气`;

export const DEAI_RULES = `【强制禁止】
1. 禁止以下 AI 词汇黑名单（出现即无效）：
   赋能、迭代、显著提升、全方位、多维度、系统性、值得关注、
   不得不说、不得不承认、本质上、显而易见、毋庸置疑、赋能、
   构建、打通、做深做透、全方位的、多维度的、立体化的

2. 禁止三段式套话（A、B和C结构，如"高效、便捷、安全"），超过 1 处即无效

3. 禁止空洞词：翻倍、碾压、大幅提升、压力变大、效率提升（不说具体数字）

4. 禁止"不只是…更是…"模板句式

5. Hook 不准用"大家好"、"今天我们来"、"如果你"、"可能"

6. CTA 不能是"感谢观看"类型，必须是互动型或关注型`;
```

- [ ] **Step 2: Add Step 1 prompt builder**

```mjs
export function buildStep1Prompt(topic, searchResults) {
  const searchContext = searchResults && searchResults.length > 0
    ? searchResults.map((r, i) => `${i + 1}. ${r.title} | ${r.snippet}`).join('\n')
    : '（搜索无结果，请基于自身知识生成）';

  return [
    '你为短视频工作流生成"逻辑分析"结果。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    '上下文：',
    `主题：${topic}`,
    `搜索结果：\n${searchContext}`,
    '',
    DEAI_RULES,
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      analysis: {
        thesis: '核心命题（一句话概括）',
        audience: '目标观众描述',
        corePromise: '视频核心价值',
        searchFacts: ['3-5 条从搜索结果提炼的关键事实'],
      },
    }, null, 2),
  ].join('\n');
}
```

- [ ] **Step 3: Add Step 2 prompt builder**

```mjs
export function buildStep2Prompt(analysis) {
  return [
    '你为短视频工作流生成"爆款标题 + 口播稿"。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    TITLE_TECHNIQUES,
    '',
    '上下文：',
    `核心命题：${analysis.thesis}`,
    `目标受众：${analysis.audience}`,
    `核心价值：${analysis.corePromise}`,
    `搜索事实：${(analysis.searchFacts || []).join('；')}`,
    '',
    DEAI_RULES,
    '',
    '口播稿要求：',
    '- 总字数 600-900 字',
    '- 像真人当面讲重点，短句+硬信息',
    '- 每段先给判断→再补事实→推进下一段',
    '- 技术类主题必须有机制解释（HOW型），不能只说"很强"',
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      title: '爆款标题（25字以内）',
      titleAngle: '标题角度：结论先行/问题追问/反差拆解/解释型',
      script: {
        hook: '开场句（1-2句，抓注意力，18-40字）',
        body: [
          { label: '段落1名称', text: '段落文案' },
          { label: '段落2名称', text: '段落文案' },
          { label: '段落3名称', text: '段落文案' },
        ],
        cta: '结尾号召/互动',
      },
    }, null, 2),
  ].join('\n');
}
```

- [ ] **Step 4: Add Step 3 prompt builder**

```mjs
export function buildStep3Prompt(title, script) {
  const bodyTextSummary = (script.body || [])
    .map(b => `${b.label}：${b.text}`)
    .join('\n');

  return [
    '你为短视频生成"分镜 + 视觉提示词"。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    SCENE_FAMILY_RULES,
    '',
    '上下文：',
    `标题：${title}`,
    `口播稿：\nHook: ${script.hook}\n${bodyTextSummary}\nCTA: ${script.cta}`,
    '',
    '分镜原则：',
    '- 将口播稿按叙事动作拆成 6-10 个场景',
    '- 每个场景绑定到具体口播原句',
    '- 一段正文如果同时包含机制、数据、对比，可拆成多个场景',
    '- 每个场景的 visualPrompt 必须是16:9横版，适合 AI 绘图',
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      scenes: [
        {
          id: 'scene-01',
          narration: '本镜头对应的口播文本',
          visualDescription: '画面描述（中文，给导演看）',
          visualPrompt: '视觉提示词（英文，16:9 横版，给 AI 绘图用）',
          sceneFamily: 'hero|focus|compare-board|data-stream|code|cta',
          durationSeconds: 8,
        },
      ],
      totalDurationSeconds: 60,
    }, null, 2),
  ].join('\n');
}
```

- [ ] **Step 5: Add schema validators**

```mjs
export function validateStep1Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 1: payload is not an object');
  if (!payload.analysis) throw new Error('Step 1: missing analysis');
  if (!payload.analysis.thesis) throw new Error('Step 1: missing analysis.thesis');
  return {
    analysis: {
      thesis: String(payload.analysis.thesis || '').trim(),
      audience: String(payload.analysis.audience || '').trim(),
      corePromise: String(payload.analysis.corePromise || '').trim(),
      searchFacts: Array.isArray(payload.analysis.searchFacts)
        ? payload.analysis.searchFacts.map(f => String(f || '').trim()).filter(Boolean).slice(0, 5)
        : [],
    },
  };
}

export function validateStep2Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 2: payload is not an object');
  if (!payload.title) throw new Error('Step 2: missing title');
  if (!payload.script) throw new Error('Step 2: missing script');
  if (!payload.script.hook) throw new Error('Step 2: missing script.hook');
  return {
    title: String(payload.title || '').trim(),
    titleAngle: String(payload.titleAngle || '').trim(),
    script: {
      hook: String(payload.script.hook || '').trim(),
      body: Array.isArray(payload.script.body)
        ? payload.script.body.map(b => ({
            label: String(b.label || '').trim(),
            text: String(b.text || '').trim(),
          })).filter(b => b.label && b.text)
        : [],
      cta: String(payload.script.cta || '').trim(),
    },
  };
}

export function validateStep3Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 3: payload is not an object');
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  if (scenes.length === 0) throw new Error('Step 3: no scenes');
  return {
    scenes: scenes.map((s, i) => ({
      id: String(s.id || `scene-${String(i + 1).padStart(2, '0')}`).trim(),
      narration: String(s.narration || '').trim(),
      visualDescription: String(s.visualDescription || '').trim(),
      visualPrompt: String(s.visualPrompt || '').trim(),
      sceneFamily: String(s.sceneFamily || 'focus').trim(),
      durationSeconds: Math.max(1.8, Number(s.durationSeconds) || 6),
    })),
    totalDurationSeconds: Math.max(1, Number(payload.totalDurationSeconds) || scenes.reduce((s, sc) => s + (Number(sc.durationSeconds) || 6), 0)),
  };
}
```

---

### Task 2: Implement main fast-pipeline.mjs — Step 1 (search + analysis)

**File:** `remotion-video/scripts/fast-pipeline.mjs`

- [ ] **Step 1: Add imports and search function**

```mjs
#!/usr/bin/env node
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
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
  try {
    const start = Date.now();
    const stdout = execSync(
      `python3 "${DDG_SCRIPT}" "${topic.replace(/"/g, '\\"')}" pd`,
      { cwd: REMOTION_ROOT, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 512 * 1024 },
    );
    const parsed = JSON.parse(stdout);
    if (parsed.error || !Array.isArray(parsed.results)) return [];
    console.log(`  [search] ${parsed.results.length} results in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return parsed.results.slice(0, 5).map(r => ({
      title: safeString(r.title),
      snippet: safeString(r.snippet),
    }));
  } catch {
    console.log('  [search] unavailable, using LLM knowledge base');
    return [];
  }
}
```

- [ ] **Step 2: Add Step 1 runner**

```mjs
async function runStep1(topic, searchResults, llmConfig) {
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
```

- [ ] **Step 3: Add Step 2 runner**

```mjs
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
```

- [ ] **Step 4: Add Step 3 runner**

```mjs
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
```

- [ ] **Step 5: Add retry wrapper**

```mjs
async function runWithRetry(runner, label, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runner(attempt);
    } catch (err) {
      console.error(`  [error] ${label} attempt ${attempt + 1}/${maxRetries + 1}: ${err.message}`);
      if (attempt >= maxRetries) throw err;
      console.log(`  [retry] ${label} 重试中...`);
    }
  }
}
```

---

### Task 3: Implement main orchestration + CLI

**File:** `remotion-video/scripts/fast-pipeline.mjs` (append to Task 2 file)

- [ ] **Step 1: Add cache/resume logic**

```mjs
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
```

- [ ] **Step 2: Add main pipeline function**

```mjs
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
    console.log('  [cache] Step 1 reused');
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
    console.log('  [cache] Step 2 reused');
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
    console.log('  [cache] Step 3 reused');
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
```

- [ ] **Step 3: Add CLI entrypoint**

```mjs
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
      case '--project-id': options.projectId = args[++i] || null; break;
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
    console.error('错误: 未配置 LLM。请设置 OPENAI_API_KEY 或安装 OpenClaw。');
    console.error(`当前配置: provider=${config.provider}, transport=${config.transport}, model=${config.model || 'unset'}`);
    process.exit(1);
  }

  try {
    const result = await runFastPipeline(topic, options);
    // Print result summary as JSON for programmatic consumption
    console.log(`\n${JSON.stringify({ status: 'ok', projectId: result.projectId, title: result.title, sceneCount: result.scenes.length, totalDurationSeconds: result.totalDurationSeconds, timings: result.timings }, null, 2)}`);
  } catch (err) {
    console.error(`\n错误: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
```

---

### Task 4: Verify it works

- [ ] **Step 1: Run against a test topic**

```bash
cd /Users/macos/openclaw/remotion-generated-video-project/remotion-video && node scripts/fast-pipeline.mjs "Claude Code 和 Cursor 区别" --force
```

Expected: Script completes in < 3 minutes, showing:
- Search results found
- Step 1 analysis with thesis + audience + facts
- Step 2 with a title + hook + body + cta
- Step 3 with 6-10 scenes
- Output written to `projects/<slug>/fast-pipeline/result.json`

- [ ] **Step 2: Test cache resume**

```bash
cd /Users/macos/openclaw/remotion-generated-video-project/remotion-video && node scripts/fast-pipeline.mjs "Claude Code 和 Cursor 区别"
```

Expected: All 3 steps show `[cache] reused`, completes instantly (< 1s).

- [ ] **Step 3: Test --force re-generates**

```bash
cd /Users/macos/openclaw/remotion-generated-video-project/remotion-video && node scripts/fast-pipeline.mjs "Claude Code 和 Cursor 区别" --force
```

Expected: All 3 steps re-generate, completes in < 3 minutes.
