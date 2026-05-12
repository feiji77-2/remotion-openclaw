# Remotion Video Pipeline 全栈性能优化设计

> 日期: 2026-05-12
> 项目: OpenClaw Remotion Video Pipeline
> 硬件: macOS / AMD RX 5500 XT (8GB VRAM, Metal 3) / 16GB RAM / Chrome

## 背景

当前端到端制作速度慢（Workflow → TTS → Remotion 渲染），2-3 分钟视频（~3000 帧）从输入到出片耗时偏长。诊断发现核心瓶颈在于 GPU 未启用、构建未缓存、串行化执行。

## 设计 1：GPU + Build 基线修复（地基）

### 当前问题
- `renderWorker.js:523` 硬编码 `REMOTION_GL: 'swiftshader'`，强制 CPU 软件渲染，AMD GPU 完全闲置
- 无 `--serve build` 复用，每次渲染重做 bundle + 复制约 1.3GB public 目录
- 无显式 Chrome 路径，靠自动探测 BFS 扫描文件系统

### 改动

**`server/workers/renderWorker.js`**
- 删除第 523 行 `REMOTION_GL: 'swiftshader'`，移除整个 env 覆盖块
- 渲染 args 追加 `'--serve', 'build'`（仅当 build/index.html 存在时）
- 渲染 args 追加 `'--hardware-acceleration', 'if-possible'`（与 CLI 版一致）

**`.env`**
- 新增 `REMOTION_BROWSER_EXECUTABLE=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- 新增 `REMOTION_HARDWARE_ACCELERATION=if-possible`
- 可选（由 remotion 自动检测）：`REMOTION_GL=angle`

**`remotion.config.ts`**
- 确认 `setVideoImageFormat('jpeg')` 已存在，无需改动

### 预期效果
- GPU 利用率从 0% → 满载
- GPU 渲染 3000 帧：~40-90s（vs 软件渲染 ~5-8min）
- 消除每次 ~1.3GB public 目录复制开销
- 消除 bundle 时间（首次除外）

### 风险
- angle 在个别 Mac GPU 不兼容，可回退到 swiftshader（当前已知 RX 5500 XT + Metal 3 无问题）

## 设计 2：Build 复用 & Bundle 预热

### 当前问题
- Worker 每次渲染都从零 bundle（Webpack 编译 + 复制 public 目录）
- CLI 版 `render-ultimate-scene.mjs` 已有 `--serve build` 复用，Worker 版没有

### 改动

**`server/workers/renderWorker.js` `stageRemotionRender()`**
- 在构建渲染命令前执行 `checkAndWarmBuild(cwd)`:
  - 检查 `build/index.html` 是否存在
  - 不存在 → 执行 `npx remotion bundle src/Root.tsx` 生成 build 目录
  - 存在 → 跳过（直接用）
- 渲染 args 追加 `'--serve', 'build'`

**Worker 启动时自动预热：**
- `startFileBasedWorker()` 和 `startRedisWorker()` 中加 `warmBuildBundle()` 调用
- 确保 worker 就绪时 build 已 ready

**可选的远程触发重建：**
- `POST /api/reload-build` → 删除 build/ → 重新 bundle

### 预期效果
- 消除每次渲染 30-60s 的 bundle 时间
- 后续渲染 bundle 成本从 45s → 0s

### 边界
- `src/` 代码变更后 build 过期，需重启 worker 或触发重建
- public 目录新增资源自动被 Remotion 4.x 检测

## 设计 3：Remotion 并发帧数调优

### 当前问题
- Remotion 内部渲染并发数为默认值（CPU 核心数），可能超出 16GB RAM 承受力
- 无环境变量控制，无法按硬件调优

### 改动

**`server/workers/renderWorker.js`**
- 渲染 args 追加 `'--concurrency', String(concurrencyLevel)`
- concurrencyLevel 计算逻辑：
  - 优先读取 `process.env.REMOTION_CONCURRENCY`（用户显式配置）
  - 否则按经验值：min(6, max(2, floor(RAM_GB / 3)))
  - 16GB → 默认 4-5

**`.env`**
- 新增 `REMOTION_CONCURRENCY=5`（默认值）

**`server/workers/memoryLimiter.js`**（配合设计 5）
- 运行中根据 RSS 动态调整并发（仅做监控和自动降级，不硬改 Remotion 参数）

### 预期效果
- 单次渲染提速 20-30%
- 避免 RAM 过载导致 Chrome OOM

## 设计 4：TTS + LLM 工作流并行化

### 当前问题
- TTS 分 6 片批量串行合成，Qwen TTS API 支持并发但未利用
- Steps 1-3 LLM 调用无缓存，同一 topic 二次生成全量重跑
- intentInferrer 逐镜头调 LLM，6-12 次调用可合并为 1 次

### 改动

**A. TTS 全并行合成**

**`server/workers/renderWorker.js` `synthesizeShotAudioSegments()`**
- `BATCH_SIZE = 6` → `BATCH_SIZE = Math.max(6, shots.length)`（全并行）
- 保留 shots.length 保护：如果 0 个 shot 跳过
- 新增 env `TTS_CONCURRENCY` 作为可选上限

**B. LLM 响应缓存**

**新增 `server/workflow/llmCache.js`**
```js
// API:
//   getCachedLLMResponse(topic, stepId, skill) → payload | null
//   setCachedLLMResponse(topic, stepId, skill, payload)
//   invalidateCache(topic?, stepId?)

// 存储: runtime/cache/llm/ 目录下的 JSON 文件
// 文件名: hash(topic + stepId + skill).json
// 内容: { topic, stepId, skill, payload, createdAt, ttl }
// TTL: 24 小时（硬编码，可通过 LLM_CACHE_TTL_HOURS 环境变量配置）
```

**改动 `server/workflow/workflowGenerator.js` `generateWorkflowStep()`**
- 在 `generateWithLLM()` 调用前检查缓存
- 命中 → 直接返回缓存 payload，跳过 LLM
- 未命中 → 调 LLM → 写入缓存
- 仅缓存 Step 1-3 和 intentInferrer（Step 4-5 内容相关性强，不缓存）

**C. intentInferrer 批量调用**

**`server/workflow/intentInferrerPipeline.js` `enrichShotsWithIntent()`**
- 当前：`for (const shot of shots) { await inferIntent(shot) }`
- 改为：收集所有 shots 文本 → 合并成单条 prompt → 一次 LLM 调用 → 拆分结果到各 shot
- 保留逐镜头路径作为降级（LLM 返回格式错误时）

### 预期效果
- TTS：6-12 分镜从串行 ~60s → 全并行 ~10s
- 同 topic 二次生成：Step 1-3 零 LLM 延迟
- intentInferrer：从 6-12 次 → 1 次 LLM 调用

## 设计 5：内存管理 + Worker 循环优化

### 当前问题
- `memoryLimiter.js` 是后置杀戮式：内存超限 → 杀进程，不预防
- 文件队列空闲轮询最⾼ 5s，恢复缓慢
- macOS 渲染后磁盘缓存膨胀但未清理

### 改动

**A. 前置限流内存控制**

**`server/workers/memoryLimiter.js`**
- 新增 `canAcceptRender()`:
  ```js
  // 返回 { accept: boolean, reason?: string }
  // 检查:
  //   1. 已用内存 < HIGH_WATER_MARK%? (默认 85%)
  //   2. 无卡住进程
  //   3. VRAM 有足够余量（粗略推断：disk 无严重 swap）
  ```
- 新增 `getRecommendedConcurrency()`:
  ```js
  // RSS < 50% → 返回配置的最大并发
  // RSS 50-70% → 返回 max * 0.8
  // RSS 70-85% → 返回 max * 0.5
  // RSS > 85% → 返回 1（串行安全模式）
  ```

**改动 `server/workers/renderWorker.js`**
- `stageRemotionRender()` 开始时调 `canAcceptRender()`
- 不满足 → `waitForMemory(interval=3s, timeout=120s)` → 循环检测
- 超时仍未满足 → 拒绝任务（返回明确错误）

**`.env`**
- 新增 `PIPELINE_MEMORY_HIGH_WATER=0.85`

**B. 文件队列轮询加速**

**`server/queue/fileQueue.js`**
- `MAX_POLL_INTERVAL_MS = 5000` → `3000`
- 任务完成后显式调 `wake()`，跳过退避窗立即开始下一个

**C. macOS 特定优化**

**新增 `server/utils/macosMemory.ts`**
- `checkMemoryPressure()`: 执行 `memory_pressure` 命令检测状态
- `purgeDiskCache()`: 渲染完成后通过 `purge` 命令清理磁盘缓存
- 只在长时间渲染后执行，非每次

## 实施优先级

| 优先级 | 设计 | 预期提速 | 工作量 |
|--------|------|----------|--------|
| P0 | 设计 1 - GPU + Build 基线 | 5-10x (渲染) | 2 文件, 5 分钟 |
| P0 | 设计 2 - Build 复用预热 | 消除 45s bundle | 1 文件, 30 分钟 |
| P1 | 设计 4A - TTS 全并行 | 6x (TTS) | 1 文件, 10 分钟 |
| P1 | 设计 4B - LLM 缓存 | Step 1-3 零延迟 | 新文件 + 改 1 文件, 1h |
| P1 | 设计 3 - 并发调优 | 20-30% (渲染) | 1 文件, 10 分钟 |
| P2 | 设计 4C - intentInferrer 批量 | 6-12x (该环节) | 1 文件, 30 分钟 |
| P2 | 设计 5 - 内存管理 + 队列 | 稳定保障 | 2-3 文件, 1h |

## 兼容性
- 所有改动向下兼容，无 break change
- 新增功能默认关闭（通过 env 或缓存初始化）
- 无新增 npm 依赖
- 文件队列模式不改动 Redis 路径
