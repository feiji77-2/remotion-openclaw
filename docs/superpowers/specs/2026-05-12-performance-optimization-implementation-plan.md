# Remotion Video Pipeline 全栈性能优化 — 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 将端到端视频制作速度提升 5-10x（渲染）、6x（TTS），消除重复 LLM 调用，修复 GPU 未启用和 Build 未复用问题。

**Architecture:** 5 个独立改动域，各自通过环境变量渐进启用：
- P0: GPU 基线修复 + Build 复用（地基）
- P1: TTS 全并行 + LLM 缓存 + 并发调优（提速主力）
- P2: intentInferrer 批量 + 内存管理 + 队列优化（稳定保障）

**Tech Stack:** Node.js 20, Remotion 4.x, Express, dotenv, ESM/commonjs 混合

---

## 预检：确认改动范围

在开始前，确认以下文件存在且行号/内容与设计文档一致：

```
remotion-video/server/workers/renderWorker.js    # 确认 523 行 REMOTION_GL: 'swiftshader'
remotion-video/server/queue/fileQueue.js          # 确认 MAX_POLL_INTERVAL_MS = 5000
remotion-video/server/workers/memoryLimiter.js    # 确认只有后置杀戮逻辑
remotion-video/server/workflow/intentInferrerPipeline.js  # 确认 for-of await 模式
remotion-video/server/voice/voiceJob.js           # 确认 synthesizeShotAudioSegments 不存在
remotion-video/server/workflow/llmCache.js         # 确认不存在（待新增）
```

如文件已被重构，以实际代码为准。

---

## Task 1: P0 — 删除 swiftshader 硬编码 + 追加 --serve build + --hardware-acceleration

**Objective:** 启用真实 GPU 渲染 + 消除每次 ~1.3GB public 目录复制

**Files:**
- Modify: `remotion-video/server/workers/renderWorker.js:520-524`
- Modify: `remotion-video/.env`
- No new file

**Step 1: 修改 env 覆盖块**

定位第 520-524 行：
```js
env: {
  ...process.env,
  REMOTION_PUBLIC_DIR: path.join(remotionDir, 'public'),
  REMOTION_GL: 'swiftshader',
},
```

替换为：
```js
env: {
  ...process.env,
  REMOTION_PUBLIC_DIR: path.join(remotionDir, 'public'),
  // REMOTION_GL: 'swiftshader', // 已删除 — 允许 Remotion 自动选择 Metal/ANGLE
},
```

**Step 2: 追加 --serve build 到渲染 args**

在 `renderWorker.js` 找到 `const args = [`（约第 486 行），在现有 args 后追加。

在 `--log`, `'info'` 之后追加：
```js
// 仅当 build/index.html 存在时启用 --serve build（复用 bundle，消除每次复制 public 开销）
if (fs.existsSync(path.join(remotionDir, 'build', 'index.html'))) {
  args.push('--serve', 'build');
}
```

**Step 3: 追加 --hardware-acceleration 和 --concurrency**

在 `--serve build` 判断之后、渲染命令发送之前（确保在 args 数组构建阶段），追加 concurrency 计算：

在 stageRemotionRender 函数开头、prepareRenderData 之后，找到或添加：
```js
// 并发数：优先读取 env，否则按 RAM 估算（16GB → 4-5）
const RAM_GB = 16; // 实际可从 os.totalmem() 计算
const concurrencyLevel = process.env.REMOTION_CONCURRENCY
  ? Number(process.env.REMOTION_CONCURRENCY)
  : Math.min(6, Math.max(2, Math.floor(RAM_GB / 3)));
```

在 args 数组里追加（与 --serve build 并列，在 args.push 之后）：
```js
args.push('--concurrency', String(concurrencyLevel));
```

确保 `--hardware-acceleration` 和 `--log` 在追加 --serve 之前已存在（第 492-493 行已有 `--hardware-acceleration, 'if-possible'`）。

**Step 4: 更新 .env**

在 `remotion-video/.env` 末尾追加：
```
REMOTION_BROWSER_EXECUTABLE=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
REMOTION_HARDWARE_ACCELERATION=if-possible
REMOTION_CONCURRENCY=5
```

**Step 5: 验证改动**

运行：
```bash
grep -n "REMOTION_GL" remotion-video/server/workers/renderWorker.js
# 预期：无输出（swiftshader 已删除）

grep -n "\-\-serve" remotion-video/server/workers/renderWorker.js
# 预期：含 --serve build 的条件判断

grep -n "\-\-concurrency" remotion-video/server/workers/renderWorker.js
# 预期：含 --concurrency 的追加
```

**Step 6: 提交**
```bash
git add remotion-video/server/workers/renderWorker.js remotion-video/.env
git commit -m "perf(p0): enable real GPU rendering — remove swiftshader, add --serve build and --concurrency"
```

---

## Task 2: P0 — 实现 Build 复用预热（checkAndWarmBuild + Worker 启动时预热）

**Objective:** Worker 启动时 bundle 好 build/，消除每次渲染 30-60s 的 webpack 编译开销

**Files:**
- Modify: `remotion-video/server/workers/renderWorker.js`

**Step 1: 在 renderWorker.js 顶部添加 checkAndWarmBuild 函数**

在 `trackChildProcess` 定义之后、`stageVoiceSynthesis` 之前添加：

```js
/**
 * 检查 build/index.html 是否存在，不存在则执行 npx remotion bundle
 * @param {string} cwd - Remotion 项目根目录
 * @returns {Promise<boolean>} true=已就绪, false=跳过
 */
async function checkAndWarmBuild(cwd) {
  const buildIndex = path.join(cwd, 'build', 'index.html');
  if (fs.existsSync(buildIndex)) {
    logger.info('build-already-warmed', { buildIndex });
    return true;
  }
  logger.info('build-warming-started', { cwd });
  return new Promise((resolve, reject) => {
    const bundleArgs = [
      'bundle',
      'src/Root.tsx',
      '--out-dir', 'build',
    ];
    const launch = resolveRemotionLaunch(cwd);
    const proc = spawn(launch.command, [...launch.argsPrefix, ...bundleArgs], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('build-warmed-success', { cwd });
        resolve(true);
      } else {
        logger.error('build-warm-failed', { cwd, exitCode: code, stderr: stderr.slice(-300) });
        reject(new Error(`build warm failed: ${stderr.slice(-300)}`));
      }
    });
    proc.on('error', reject);
  });
}
```

**Step 2: 在 stageRemotionRender 开头调用 checkAndWarmBuild**

在 `stageRemotionRender` 函数开头（`update(40, '开始 Remotion 渲染...')` 之前）添加：

```js
// P0: Build 预热 — 确保 build/ 已 bundle，消除 webpack 编译开销
try {
  await checkAndWarmBuild(remotionDir);
} catch (warmErr) {
  logger.warn('build-warm-skipped', { jobId: job.id, error: warmErr.message });
  // 非致命：降级到不带 --serve 的渲染（Remotion 会临时 bundle）
}
```

**Step 3: 验证**

```bash
node -e "
const fs = require('fs');
const path = require('path');
// 检查 checkAndWarmBuild 函数存在
const content = fs.readFileSync('remotion-video/server/workers/renderWorker.js', 'utf8');
console.log('checkAndWarmBuild defined:', content.includes('async function checkAndWarmBuild'));
console.log('Called in stageRemotionRender:', content.includes('checkAndWarmBuild(remotionDir)'));
"
```

**Step 4: 提交**
```bash
git add remotion-video/server/workers/renderWorker.js
git commit -m "perf(p0): add checkAndWarmBuild — pre-bundle Remotion build on worker startup"
```

---

## Task 3: P1 — TTS 全并行合成

**Objective:** 将 TTS 合成从串行改为全并行，6-12 分镜从 ~60s → ~10s

**Files:**
- Modify: `remotion-video/server/workers/renderWorker.js`
- Modify: `remotion-video/.env`

**Note:** `synthesizeShotAudioSegments` 函数在当前代码库中不存在（需确认 voiceJob.js 中实际 TTS 合成逻辑）。先探索 voiceJob.js 中现有的批量合成路径。

**Step 1: 探索 voiceJob.js 批量合成逻辑**

```bash
grep -n "synthesize\|batch\|segment\|shot" remotion-video/server/voice/voiceJob.js | head -40
```

找到现有的 `synthesizeShotAudioSegments` 或等效分镜合成循环，确认其位置和批量大小常量。

**Step 2: 找到 BATCH_SIZE 或等效循环**

若 `synthesizeShotAudioSegments` 不存在，在 `renderWorker.js` 中搜索分镜级别的 TTS 合成调用（`for`/`while` + `synthesize`/`voice` 关键字）。

找到后，将其从：
```js
for (const shot of shots) {
  await synthesizeOneShot(shot); // 串行
}
```
改为：
```js
// 全并行（shots.length 上限保护）
const safeConcurrency = Math.min(
  Number(process.env.TTS_CONCURRENCY) || shots.length,
  shots.length
);
const batches = [];
for (let i = 0; i < shots.length; i += safeConcurrency) {
  batches.push(shots.slice(i, i + safeConcurrency));
}
for (const batch of batches) {
  await Promise.all(batch.map(shot => synthesizeOneShot(shot)));
}
```

**Step 3: 添加 TTS_CONCURRENCY 到 .env**
```
TTS_CONCURRENCY=6
```

**Step 4: 提交**
```bash
git add remotion-video/server/workers/renderWorker.js remotion-video/.env
git commit -m "perf(p1): parallelize TTS synthesis — all shots concurrently instead of serial batches"
```

---

## Task 4: P1 — LLM 响应缓存（新增 llmCache.js）

**Objective:** 同一 topic 二次生成时 Step 1-3 零 LLM 延迟

**Files:**
- Create: `remotion-video/server/workflow/llmCache.js`
- Modify: `remotion-video/server/workflow/workflowGenerator.js`

**Step 1: 创建 llmCache.js**

```js
/**
 * llmCache.js — LLM 响应缓存（runtime/cache/llm/ JSON 文件存储）
 *
 * API:
 *   getCachedLLMResponse(topic, stepId, skill) → payload | null
 *   setCachedLLMResponse(topic, stepId, skill, payload) → void
 *   invalidateCache(topic?, stepId?) → void
 *
 * TTL: 24h（环境变量 LLM_CACHE_TTL_HOURS 可配置）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../runtime/cache/llm');
const TTL_HOURS = Number(process.env.LLM_CACHE_TTL_HOURS || '24');
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function computeCacheKey(topic, stepId, skill) {
  const raw = `${String(topic || '')}|${String(stepId || '')}|${String(skill || '')}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function getCachePath(topic, stepId, skill) {
  const key = computeCacheKey(topic, stepId, skill);
  return path.join(CACHE_DIR, `${key}.json`);
}

/**
 * 读取缓存（若存在且未过期）
 * @returns {object|null} 缓存的 payload 或 null
 */
function getCachedLLMResponse(topic, stepId, skill) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(topic, stepId, skill);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const ageMs = Date.now() - new Date(raw.createdAt).getTime();
    if (ageMs > TTL_MS) {
      fs.unlinkSync(cachePath); // 过期删除
      return null;
    }
    return raw.payload ?? null;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
function setCachedLLMResponse(topic, stepId, skill, payload) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(topic, stepId, skill);
    fs.writeFileSync(cachePath, JSON.stringify({
      topic,
      stepId,
      skill,
      payload,
      createdAt: new Date().toISOString(),
      ttlHours: TTL_HOURS,
    }, null, 2));
  } catch (err) {
    // 缓存写入失败不阻断主流程
    console.warn('[llmCache] set failed:', err.message);
  }
}

/**
 * 选择性失效缓存
 * @param {string} [topic] — 不传则清除所有
 * @param {string} [stepId] — 不传则清除该 topic 下所有
 */
function invalidateCache(topic, stepId) {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      if (topic === undefined) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        continue;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        if (raw.topic !== topic) continue;
        if (stepId !== undefined && raw.stepId !== stepId) continue;
        fs.unlinkSync(path.join(CACHE_DIR, file));
      } catch {
        // 损坏文件直接删
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    }
  } catch {
    // 忽略
  }
}

module.exports = {
  getCachedLLMResponse,
  setCachedLLMResponse,
  invalidateCache,
};
```

**Step 2: 集成到 workflowGenerator.js**

在 `workflowGenerator.js` 顶部 import 后：

```js
const { getCachedLLMResponse, setCachedLLMResponse } = require('./llmCache');
```

找到 `generateWorkflowStep` 函数中 LLM 调用位置（搜索 `generateWithLLM` 或 `generateStructuredJson`），在调用前插入缓存检查：

```js
// 缓存查找（仅 Step 1-3 和 intentInferrer）
const cacheableSteps = ['1', '2', '3', 'intentInferrer'];
const stepIdStr = String(stepId);
const cacheKey = { topic, stepId: stepIdStr, skill: skillId };
if (cacheableSteps.includes(stepIdStr)) {
  const cached = getCachedLLMResponse(cacheKey.topic, cacheKey.stepId, cacheKey.skill);
  if (cached) {
    logger.info('llm-cache-hit', { stepId: stepIdStr, topic });
    return cached;
  }
}
```

在 LLM 调用成功后（返回 payload 后）追加写缓存：

```js
// 在 return payload 之前追加写缓存
if (cacheableSteps.includes(stepIdStr)) {
  setCachedLLMResponse(cacheKey.topic, cacheKey.stepId, cacheKey.skill, payload);
}
```

**Step 3: 添加 LLM_CACHE_TTL_HOURS 到 .env**
```
LLM_CACHE_TTL_HOURS=24
```

**Step 4: 验证**

```bash
node -e "
const fs = require('fs');
// 检查文件存在
const exists = fs.existsSync('remotion-video/server/workflow/llmCache.js');
console.log('llmCache.js created:', exists);
// 检查 workflowGenerator 导入
const wg = fs.readFileSync('remotion-video/server/workflow/workflowGenerator.js', 'utf8');
console.log('imports llmCache:', wg.includes('llmCache'));
console.log('getCachedLLMResponse used:', wg.includes('getCachedLLMResponse'));
"
```

**Step 5: 提交**
```bash
git add remotion-video/server/workflow/llmCache.js remotion-video/server/workflow/workflowGenerator.js remotion-video/.env
git commit -m "perf(p1): add llmCache — cache LLM responses for Step 1-3, zero LLM cost on repeated topics"
```

---

## Task 5: P1 — Remotion 并发帧数调优

**Objective:** 按硬件 RAM 自动调优并发数，避免 Chrome OOM

**Files:**
- Modify: `remotion-video/server/workers/renderWorker.js`
- Modify: `remotion-video/.env`

**Note:** 此 Task 与 Task 1 的 concurrency 计算逻辑合并执行。若 Task 1 已完成 --concurrency 追加，跳过本 Task 的 renderWorker.js 改动。

**Step 1: 确认 Task 1 已追加 --concurrency**

```bash
grep -n "\-\-concurrency" remotion-video/server/workers/renderWorker.js
```

若已有输出，说明 Task 1 已完成，本 Task 仅验证并提交。

**Step 2: 验证 env**

```bash
grep "REMOTION_CONCURRENCY" remotion-video/.env
```

若已有值，确认值为 5。

**Step 3: 提交（如需）**
```bash
git add remotion-video/.env
git commit -m "perf(p1): set REMOTION_CONCURRENCY=5 — tune frame concurrency to avoid OOM on 16GB RAM"
```

---

## Task 6: P2 — intentInferrer 批量调用优化

**Objective:** 将逐镜头 LLM 调用（6-12 次）合并为 1 次

**Files:**
- Modify: `remotion-video/server/workflow/intentInferrerPipeline.js`

**Step 1: 阅读现有 intentInferrerPipeline.js**

确认当前 for-of await 模式（第 43-69 行）。

**Step 2: 实现批量降级路径**

在 `enrichShotsWithIntent` 函数中，在调用 `inferIntent` 之前先尝试批量模式：

```js
// 批量模式：收集所有 narration，合并为单次 LLM 调用
const allTexts = shots.map(s => `[镜头 ${i}] ${(s.narrration || '').trim()}`).join('\n');

// 构建批量 prompt（注入 shot 索引以便拆分结果）
const batchPrompt = `为以下 ${shots.length} 个镜头依次推断导演意图，按 JSON 数组格式返回：\n${shots.map((s, i) => `[${i}] ${(s.narration || '').trim()}`).join('\n')}\n\n返回格式：[{archetype, dataEvent, cameraIntent, cameraMotion, memoryObject, reasoning, source}, ...]（与输入顺序对应）`;

try {
  // 尝试批量 LLM（structuredJsonFn 是 generateStructuredJson）
  if (structuredJsonFn) {
    const batchResult = await structuredJsonFn(batchPrompt, /* schema */ null, { skill: effectiveFamilyId });
    if (Array.isArray(batchResult)) {
      // 成功，分配到各 shot
      return shots.map((shot, i) => ({
        ...shot,
        directorIntent: {
          archetype: batchResult[i]?.archetype || 'inference-fallback',
          dataEvent: batchResult[i]?.dataEvent || null,
          cameraIntent: batchResult[i]?.cameraIntent || null,
          cameraMotion: batchResult[i]?.cameraMotion || null,
          memoryObject: batchResult[i]?.memoryObject || null,
          reasoning: batchResult[i]?.reasoning || '',
          source: 'batch-llm',
        },
      }));
    }
  }
} catch (batchErr) {
  // 降级到逐镜头
  logger.warn('intent-batch-fallback', { error: batchErr.message, shotCount: shots.length });
}

// 降级：逐镜头调用（原有逻辑）
const enrichedShots = [];
for (const shot of shots) {
  // ...原有逐镜头逻辑...
}
return enrichedShots;
```

**Step 3: 验证**

```bash
grep -n "batchPrompt\|batchResult\|batch-llm" remotion-video/server/workflow/intentInferrerPipeline.js
# 预期：含批量 prompt 构建和结果分配逻辑
```

**Step 4: 提交**
```bash
git add remotion-video/server/workflow/intentInferrerPipeline.js
git commit -m "perf(p2): batch intentInferrer LLM calls — single call instead of per-shot calls"
```

---

## Task 7: P2 — 内存管理 + Worker 循环优化

**Objective:** 内存管理从事后杀戮改为事前限流 + 队列轮询加速

**Files:**
- Modify: `remotion-video/server/workers/memoryLimiter.js`
- Modify: `remotion-video/server/queue/fileQueue.js`
- Modify: `remotion-video/.env`
- Create: `remotion-video/server/utils/macosMemory.ts`（或 .js）

**Step 7A: memoryLimiter.js — 新增前置限流 API**

在 `memoryLimiter.js` 导出前添加：

```js
/**
 * 前置限流：检查是否能接受新的渲染任务
 * @returns {{ accept: boolean, reason?: string }}
 */
function canAcceptRender() {
  if (isShuttingDown) {
    return { accept: false, reason: 'worker-shutting-down' };
  }
  updateMemoryStats();
  const totalMb = getTotalRssMb();
  const highWaterMark = Number(process.env.PIPELINE_MEMORY_HIGH_WATER || '0.85');
  const limitMb = TOTAL_MEMORY_LIMIT_MB * highWaterMark;
  if (totalMb >= limitMb) {
    return {
      accept: false,
      reason: `memory-pressure ${totalMb}MB > ${Math.round(limitMb)}MB (${highWaterMark * 100}% high water)`,
    };
  }
  return { accept: true };
}

/**
 * 根据当前内存状态推荐并发数
 * @param {number} maxConcurrency - 配置的最大并发数
 * @returns {number}
 */
function getRecommendedConcurrency(maxConcurrency) {
  updateMemoryStats();
  const totalMb = getTotalRssMb();
  const usedPct = totalMb / TOTAL_MEMORY_LIMIT_MB;
  if (usedPct < 0.5) return maxConcurrency;
  if (usedPct < 0.7) return Math.max(1, Math.floor(maxConcurrency * 0.8));
  if (usedPct < 0.85) return Math.max(1, Math.floor(maxConcurrency * 0.5));
  return 1; // 串行安全模式
}

/**
 * 等待内存就绪
 * @param {number} intervalMs
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} true=就绪, false=超时
 */
async function waitForMemory(intervalMs = 3000, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (canAcceptRender().accept) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}
```

更新 `module.exports`：
```js
module.exports = {
  trackProcess, startMonitoring, stopMonitoring,
  getMemoryStats, shutdownAll, enforceMemoryLimit,
  canAcceptRender, getRecommendedConcurrency, waitForMemory,
  TOTAL_MEMORY_LIMIT_MB, PER_PROCESS_MEMORY_LIMIT_MB,
};
```

**Step 7B: renderWorker.js — 调用前置限流**

在 `stageRemotionRender` 函数开头（在 `checkAndWarmBuild` 之后）添加：

```js
// P2: 前置内存检查 — 不满足则等待，最长 120s 后拒绝
const memoryCheck = canAcceptRender();
if (!memoryCheck.accept) {
  logger.warn('memory-throttle', { jobId: job.id, reason: memoryCheck.reason });
  update(40, '等待内存就绪...');
  const ready = await waitForMemory(3000, 120000);
  if (!ready) {
    throw new Error(`memory-pressure-timeout — cannot accept render: ${memoryCheck.reason}`);
  }
}
```

**Step 7C: fileQueue.js — 轮询加速 + wake() 显式调用**

找到 `MAX_POLL_INTERVAL_MS = 5000`（第 18 行），改为：
```js
const MAX_POLL_INTERVAL_MS = 3000;
```

在 `startSimpleWorker` 的 `completeJob` 后台调用处（`.then(result => completeJob(job.id, result))`），
在 `completeJob` 之后添加 `wake()` 调用：

```js
.then(result => completeJob(job.id, result).then(() => wake()))
```

或者更安全的做法是在 finally 块处理（已在 `.finally` 里有 `schedule(0)` 唤醒，等效于 wake()）。

确认 `wake()` 方法已暴露：它是在 `startSimpleWorker` 闭包内部定义的方法，worker 返回对象里有 `getState()` 但没有 `wake`。需要暴露 wake 方法：

在 `startSimpleWorker` 返回的对象中添加：
```js
return {
  getState() { ... },
  wake,  // 显式唤醒，跳过退避窗
  stop(...) { ... },
};
```

**Step 7D: macOS 内存工具（新增）**

```js
// remotion-video/server/utils/macosMemory.js
const { execSync } = require('child_process');

function checkMemoryPressure() {
  try {
    // memory_pressure 输出格式：...gen 0/f 0/f ...wired 1234/f ...
    const out = execSync('memory_pressure 2>/dev/null || echo "unavailable"', {
      encoding: 'utf8', timeout: 3000,
    });
    if (out.includes('unavailable')) return 'unknown';
    if (out.includes('normal') || out.includes('良性')) return 'normal';
    if (out.includes('warn') || out.includes('警告')) return 'warning';
    if (out.includes('critical') || out.includes('紧急')) return 'critical';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function purgeDiskCache() {
  try {
    // purge 命令需要 root 权限，仅在长时间渲染后选择性调用
    execSync('purge 2>/dev/null || true', { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { checkMemoryPressure, purgeDiskCache };
```

**Step 7E: 更新 .env**
```
PIPELINE_MEMORY_HIGH_WATER=0.85
```

**Step 7F: 验证**

```bash
grep -n "canAcceptRender\|waitForMemory\|MAX_POLL_INTERVAL_MS" \
  remotion-video/server/workers/memoryLimiter.js \
  remotion-video/server/queue/fileQueue.js
```

**Step 7G: 提交**
```bash
git add \
  remotion-video/server/workers/memoryLimiter.js \
  remotion-video/server/workers/renderWorker.js \
  remotion-video/server/queue/fileQueue.js \
  remotion-video/server/utils/macosMemory.js \
  remotion-video/.env
git commit -m "perf(p2): proactive memory throttling + queue polling optimization"
```

---

## Task 8: 全局验证 — typecheck + smoke test

**Step 1: 运行 typecheck**

```bash
cd /Users/macos/OpenClaw/remotion-generated-video-project
npm run typecheck 2>&1 | head -30
```

预期：无新增语法错误

**Step 2: 运行现有测试**

```bash
npm run test 2>&1 | tail -20
```

预期：全部 PASS

**Step 3: 提交所有剩余改动**

```bash
git status --short
git add -A
git commit -m "perf: apply all performance optimizations — GPU, build cache, TTS parallel, LLM cache, concurrency, memory throttle"
```

---

## 改动总览（按文件）

| 文件 | 改动类型 | Task |
|------|----------|------|
| `remotion-video/server/workers/renderWorker.js` | 修改 + 新增函数 | 1, 2, 5, 7B |
| `remotion-video/server/workers/memoryLimiter.js` | 新增 3 个导出函数 | 7A |
| `remotion-video/server/queue/fileQueue.js` | 修改常量 + 暴露 wake | 7C |
| `remotion-video/server/workflow/llmCache.js` | 新增 | 4 |
| `remotion-video/server/workflow/workflowGenerator.js` | 集成缓存调用 | 4 |
| `remotion-video/server/workflow/intentInferrerPipeline.js` | 批量降级逻辑 | 6 |
| `remotion-video/server/utils/macosMemory.js` | 新增 | 7D |
| `remotion-video/.env` | 追加 7 个新变量 | 1, 3, 4, 5, 7E |

## 预期提速效果

| 环节 | 改动前 | 改动后 | 提速比 |
|------|--------|--------|--------|
| 渲染（GPU） | 5-8 min（CPU） | 40-90s | **5-10x** |
| Build bundle | 45s（每次） | 0s（复用） | **∞** |
| TTS 合成 | ~60s（6 片串行） | ~10s（全并行） | **6x** |
| Step 1-3（同 topic 重跑） | 全量 LLM | 零 LLM | **缓存命中** |
| intentInferrer | 6-12 次调用 | 1 次调用 | **6-12x** |
