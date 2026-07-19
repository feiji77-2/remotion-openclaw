# Script-to-Video 自助生产平台 — 产品设计与开发文档

> 版本: v1.0 | 日期: 2026-07-19
> 基于: codex-remotion-project v2.0

---

## 目录

1. [产品目标与用户画像](#1-产品目标与用户画像)
2. [当前状态与痛点](#2-当前状态与痛点)
3. [用户工作流](#3-用户工作流)
4. [系统架构总览](#4-系统架构总览)
5. [Pipeline 核心设计](#5-pipeline-核心设计)
6. [后端 API 设计](#6-后端-api-设计)
7. [前端设计](#7-前端设计)
8. [WebSocket 进度协议](#8-websocket-进度协议)
9. [数据模型](#9-数据模型)
10. [HARD_LOCK 与安全边界](#10-hard_lock-与安全边界)
11. [开发路线图](#11-开发路线图)
12. [交付验收标准](#12-交付验收标准)

---

## 1. 产品目标与用户画像

### 一句话描述

> 让不同客户输入不同文案（口播稿），自动生成结构不同、画面不同、品牌不同的竖屏/横屏视频。

### 目标用户

| 角色 | 使用场景 | 核心诉求 |
|------|---------|---------|
| **自媒体创作者** | 想快速把一篇文案变成短视频 | 不想学剪辑，不想配图，不想调字幕 |
| **企业营销人员** | 每周要出 3-5 条产品介绍视频 | 统一品牌以下每期内容视觉不同 |
| **知识付费讲师** | 把播客/录课文稿转为口播视频 | 画面跟内容走，不是套模板 |
| **产品团队** | 快速制作产品发布视频 | 换文案=换全部画面，不残留旧画面 |

### 产品原则

1. **文案为王** — 视觉合同必须从文案语义自动推导，无硬编码默认值
2. **次次不同** — 同文案跑两次，场景结构未必相同（LLM 随机性保证多样性）
3. **一次换稿=一次全新的视觉合同** — 没有"复用旧视图"路径，换稿强制重算
4. **用户可控** — AI 生成的场景列表可手动调整（换 family、换配色、换图标）
5. **进度可见** — Phase 1-4 每一步 WebSocket 推送，前端实时展示

---

## 2. 当前状态与痛点

### 已完成的（当前能力）

| 能力 | 当前实现 |
|------|---------|
| **渲染引擎** | Project JSON → compileProject() → UltimateVideoV2 → MP4 |
| **Zod 合同** | `projectSchema.ts` 定义了完整的输入校验 |
| **46 个 family** | Spoken(9) + Ultimate(18) + Minimal(6) + skill-showcase(1) + 其余 |
| **TTS** | Qwen TTS (阿里云百炼) 通过 `generate-tts-for-project.mjs` |
| **示例** | `skill-showcase.json` (9 scene, 3649帧, 121s) + `design-skills-showcase.json` |
| **守门脚本** | `project-check.mjs`, `check-skill-showcase-production.mjs`, visual contract check |
| **工具 Studio** | `tools-studio-server.mjs` — 玩具级预览服务器（非产品） |

### 当前痛点

| 问题 | 具体表现 |
|------|---------|
| **只有 CLI 入口** | 没有 Web UI，用户无法自助操作 |
| **换稿只换 TTS** | `generate-tts-for-project.mjs` 只生成配音，画面靠手写 project.json 的 scenes[] |
| **画面不从语义推导** | shots[] 是人工编排的，不是 LLM 从文案语义自动生成的 |
| **无产品形态** | 没有"创建项目→预览场景→渲染→下载"的产品闭环 |
| **无进度展示** | 渲染是黑盒，用户只能等命令行结束 |
| **无手动覆盖** | 用户无法在渲染前调整某个 scene 的 family、配色、图标 |

---

## 3. 用户工作流

### 全流程

```text
用户打开 Web 界面
  → 输入文案（textareqa 或上传 .txt）
  → 选择：横屏/竖屏、风格（科技/极简/活力）、时长偏好
  → 点击"生成视频"
  → 看到：场景列表（每段旁白对应什么画面、用什么 family 模板）
  → 可手动调整：某个场景换 family、换配色、换图标
  → 点击"渲染"
  → 等待进度条（文案分析→生成场景→配音中→渲染中(45%)）
  → 下载 .mp4
```

### 三页式交互

```
CreateProject.tsx    →    ProjectDetail.tsx    →    RenderProgress.tsx
文案输入页面               场景预览+手动调整           渲染进度+下载
     |                            |                          |
 输入文案                     检查场景列表               等待进度条
 选 format/style              可换 family               进度完成后下载
 点"生成"                     可调配色/图标
                              确认后点"渲染"
```

---

## 4. 系统架构总览

### 架构蓝图

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Web UI)                           │
│  React + React Router                                              │
│  Pages: CreateProject → ProjectDetail → RenderProgress             │
│  API client: fetch + EventSource/WebSocket                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST API (JSON) + WebSocket
                           │ port 3001
┌──────────────────────────▼──────────────────────────────────────────┐
│                     Backend API (Express)                           │
│                                                                     │
│  POST /api/projects           → 创建项目（Phase 1+2 同步）          │
│  GET  /api/projects/:id       → 项目详情 + 场景列表                 │
│  PUT  /api/projects/:id/scenes/:sid  → 手动调场景（family/payload） │
│  POST /api/projects/:id/render       → 触发完整渲染（Phase 3+4）    │
│  GET  /api/projects/:id/video        → 下载成品 .mp4                │
│  WS   /api/projects/:id/ws           → 进度推送（SSE fallback）     │
│                                                                     │
│  server/                                                             │
│    index.js                  — Express 启动入口                      │
│    api/                                                              │
│      projectsRouter.js       — CRUD /api/projects                   │
│      renderRouter.js         — POST render + GET video               │
│      wsRouter.js             — WebSocket + SSE 双模进度推送          │
│    store/                                                            │
│      projectStore.js         — 内存存储（开发）/ 文件存储（生产）   │
│    lib/                                                              │
│      renderQueue.js          — 串行渲染队列，避免并发冲突            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                     Pipeline 核心 (纯函数)                           │
│                                                                     │
│  pipeline/                                                          │
│    scriptAnalyzer.js           — Phase 1: 文案分段+family 推荐      │
│    visualContractGenerator.js  — Phase 2: narration → scene payload  │
│    ttsGenerator.js             — Phase 3: TTS 生成（调用 Qwen）     │
│    remotionRenderer.js         — Phase 4: Remotion render 封装      │
│    pipelineOrchestrator.js     — 串联 Phase 1→4, 进度事件发射       │
│    lib/                                                              │
│      llmClient.js              — LLM API 封装（OpenAI 兼容）        │
│      familySelector.js         — 语义→family 推荐引擎               │
│      ttsClient.js              — Qwen TTS / MiniMax TTS 封装        │
│      assetDownloader.js        — 远程资产下载到 public/              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Project JSON
┌──────────────────────────▼──────────────────────────────────────────┐
│                   Remotion 渲染引擎 (HARD_LOCK)                      │
│                                                                     │
│  src/project/projectSchema.ts     — Zod 合同                        │
│  src/project/compileProject.ts    — 编译                            │
│  src/project/sceneRegistry.tsx     — 46 family 组件映射              │
│  src/compositions/v2/             — UltimateVideoV2 主 Composition  │
│  src/timeline/*                   — Scene/Caption/Audio 轨道        │
│  src/components/ultimate-kit/*    — 46 个 family 组件                │
│  src/Root.tsx                     — Composition 注册入口             │
└─────────────────────────────────────────────────────────────────────┘
```

### 目录布局

```
remotion-generated-video-project/
├── package.json                   # 根
├── server/                        # [新建] 后端 API
│   ├── index.js                   # Express 启动
│   ├── api/
│   │   ├── projectsRouter.js      # POST/GET/PUT /api/projects
│   │   ├── renderRouter.js        # POST render + GET video
│   │   └── wsRouter.js            # WebSocket 进度
│   ├── store/
│   │   └── projectStore.js        # 项目存储
│   └── lib/
│       └── renderQueue.js         # 渲染队列
├── pipeline/                      # [新建] 管道核心
│   ├── scriptAnalyzer.js          # Phase 1
│   ├── visualContractGenerator.js # Phase 2
│   ├── ttsGenerator.js            # Phase 3
│   ├── remotionRenderer.js        # Phase 4
│   ├── pipelineOrchestrator.js    # 串联器
│   └── lib/
│       ├── llmClient.js           # LLM 调用
│       ├── familySelector.js      # family 推荐
│       ├── ttsClient.js           # TTS 调用
│       └── assetDownloader.js     # 资产下载
├── video-pipeline-view/           # [改造] 前端
│   ├── index.html                 # 入口
│   ├── App.tsx                    # 路由
│   ├── types.ts                   # 前端类型
│   ├── api/
│   │   └── client.ts              # API 封装
│   └── pages/
│       ├── CreateProject.tsx      # 文案输入页
│       ├── ProjectDetail.tsx      # 场景预览页
│       └── RenderProgress.tsx     # 渲染进度页
├── remotion-video/                # 渲染引擎 (HARD_LOCK)
│   ├── src/project/projectSchema.ts
│   ├── src/project/compileProject.ts
│   ├── src/project/sceneRegistry.tsx
│   ├── src/data/registry.ts
│   └── ...
└── docs/
    └── product-architecture.zh-CN.md  # 本文档
```

---

## 5. Pipeline 核心设计

### 5.1 Phase 1: scriptAnalyzer.js

**输入**: `{ scriptText, format, style, durationPref }`
**输出**: `SceneAnalysis[]`

**设计要点**:

```
SceneAnalysis = {
  segmentIndex: number;        // 分段序号
  narration: string;           // 该段口播文字
  estimatedDurationSec: number; // 预估时长（秒）
  segmentType: 'hook' | 'problem' | 'evidence' | 'solution' | 'social-proof' | 'cta';
  familyPreference: string[];  // 推荐的 family 名称（按优先级排序, 3-5 个）
  keywords: string[];          // 该段提取的关键词（3-8 个）
  brandName?: string;          // 如果检测到品牌名
  hasNumbers: boolean;         // 是否含数字/数据
  hasComparison: boolean;      // 是否含对比
  hasProcess: boolean;         // 是否含步骤/流程
}
```

**LLM 提示词结构**:

```
系统: 你是一个视频脚本分析师。将用户的口播文案拆分为 3-9 个视频场景。
     每个场景对应一段完整口播，场景之间在逻辑上有自然分段。
     根据文案内容类型（钩子/故事/数据/对比/流程/解决方案）推荐合适的
     family 模板。输出 JSON 数组。

约束:
- narration 必须是文案的原文子串，不能改写
- familyPreference 从以下列表选择: [46 families 列表]
- segmentType 必须匹配文案的真实语义
```

**核心逻辑**:

```javascript
async function analyzeScript({ scriptText, format, style, durationPref }) {
  // 1. 估算总时长
  const estimatedWords = scriptText.length;
  const speakingSpeed = format === 'portrait' ? 4.0 : 3.5; // 字/秒
  const totalSec = estimatedWords / speakingSpeed;

  // 2. LLM 分段 + family 推荐
  const segments = await callLlmForSegmentation(scriptText, format, style);

  // 3. 时长归一化：LLM 估值 vs 基于字数的估值
  //    如果 durationPref 指定了目标时长，按比例缩放
  return normalizeDurations(segments, totalSec, durationPref);
}
```

### 5.2 Phase 2: visualContractGenerator.js

**输入**: `SceneAnalysis[]`
**输出**: `{ scenes: SceneContract[], captions: CaptionContract[], durationAdjustments }`

**设计要点**:

```
SceneContract = {
  id: string;                    // scene-{index}
  family: string;                // 最终选定的 family
  durationInFrames: number;      // 帧数（= estimatedDurationSec × 30）
  payload: Record<string, any>;  // family 专属 payload
  assetIds: string[];            // 需要的资产 ID
  transition: Transition | false;
}
```

**LLM 提示词**: 为每段 narration 生成对应 family 的完整 payload

```
系统: 你是视频场景设计师。根据文案段落和选定 family 模板，
     生成该场景的完整 payload。

约束:
- payload 必须符合 family 的 Zod schema
- title 从 narration 提取核心论点，不超过 30 字
- items/labels/keywords 从 narration 提取关键信息
- 品牌名只使用 narration 中出现的
- visualProps 中的 accent color 根据内容情感选择
- evidence/dataPoints 必须从 narration 提取，不能编造
- 每个 scene 必须有 3-8 个 Beat（语义节拍点）
```

**Payload 生成适配策略**:

```javascript
// payload 因 family 不同而变
const PAYLOAD_GENERATORS = {
  'spoken-title':     generateTitlePayload,
  'spoken-compare':   generateComparePayload,
  'spoken-metric':    generateMetricPayload,
  'spoken-process':   generateProcessPayload,
  'spoken-ranking':   generateRankingPayload,
  'spoken-tags':      generateTagsPayload,
  'spoken-code':      generateCodePayload,
  'spoken-takeaway':  generateTakeawayPayload,
  'hero-panel':       generateHeroPanelPayload,
  'feature-card-rail': generateFeatureCardRailPayload,
  'number-strip':     generateNumberStripPayload,
  'compare-board':    generateCompareBoardPayload,
  'step-flow':        generateStepFlowPayload,
  'timeline':         generateTimelinePayload,
  'evidence-wall':    generateEvidenceWallPayload,
  'benchmark-chart':  generateBenchmarkChartPayload,
  'metric-bars':      generateMetricBarsPayload,
  'tag-matrix':       generateTagMatrixPayload,
  'terminal-panel':   generateTerminalPanelPayload,
  'quote-highlight':   generateQuoteHighlightPayload,
  'cta-panel':        generateCtaPanelPayload,
  'architecture-map': generateArchitectureMapPayload,
  'data-stream':      generateDataStreamPayload,
  'glossary-term':    generateGlossaryTermPayload,
  'focus-diagram':    generateFocusDiagramPayload,
  // ... minimal 系列同理
  'skill-showcase':   generateSkillShowcasePayload,
};
```

### 5.3 Phase 3: ttsGenerator.js

**封装现有 `generate-tts-for-project.mjs`**:

```javascript
async function generateTts(projectJson, progressCallback) {
  // 1. 拼接所有 narration/captions 文字
  // 2. 调用 Qwen TTS（使用现有 ttsClient）
  // 3. 下载 .m4a 到 public/projects/{projectId}/audio/voice.m4a
  // 4. 更新 projectJson.assets.voiceover.src
  // 5. 调用进度回调
  return updatedProjectJson;
}
```

### 5.4 Phase 4: remotionRenderer.js

**封装 Remotion CLI 调用**:

```javascript
async function renderProject(projectJson, progressCallback) {
  // 1. 写临时 project.json
  // 2. 调用 `npx remotion render ...` (子进程)
  // 3. 解析 stdout 中的帧进度 → progressCallback
  // 4. 输出到 out/{projectId}.mp4
  // 5. 返回 outputPath
}
```

### 5.5 pipelineOrchestrator.js

**串联器**（替代当前手动的 `run-search-to-ultimate.mjs`）:

```javascript
class PipelineOrchestrator extends EventEmitter {
  async run(scriptInput) {
    // Phase 1
    this.emit('progress', { phase: 1, status: 'analyzing-script', percent: 5 });
    const analysis = await scriptAnalyzer.analyzeScript(scriptInput);

    // Phase 2
    this.emit('progress', { phase: 2, status: 'generating-visual-contract', percent: 15 });
    const { scenes, captions } = await visualContractGenerator.generate(analysis);

    // 构建 Project JSON
    const projectJson = buildProjectJson(scenes, captions, scriptInput);

    // Phase 3
    this.emit('progress', { phase: 3, status: 'generating-tts', percent: 35 });
    const projectWithAudio = await ttsGenerator.generateTts(projectJson, (p) => {
      this.emit('progress', { phase: 3, status: 'tts-progress', percent: 35 + p * 10 });
    });

    // Phase 4
    this.emit('progress', { phase: 4, status: 'rendering', percent: 45 });
    const outputPath = await remotionRenderer.renderProject(projectWithAudio, (p) => {
      this.emit('progress', { phase: 4, status: 'render-frames', percent: 45 + p * 50 });
    });

    this.emit('progress', { phase: 4, status: 'done', percent: 100 });
    return { projectJson: projectWithAudio, outputPath };
  }
}
```

---

## 6. 后端 API 设计

### 6.1 路由总览

| 方法 | 路径 | 请求体 | 返回 | 说明 |
|------|------|--------|------|------|
| POST | `/api/projects` | `{script, format, style, durationPref?}` | `{id, scenes, ...}` | 创建项目，同步执行 Phase 1+2 |
| GET | `/api/projects/:id` | — | `{id, scenes, status, ...}` | 项目详情+场景列表 |
| PUT | `/api/projects/:id/scenes/:sid` | `{family?, payload?}` | `{scene}` | 手动调场景 |
| GET | `/api/projects/:id/scenes/:sid/still` | `?frame=30&scale=0.25` | `image/png` | 场景缩略图 |
| POST | `/api/projects/:id/render` | — | `{jobId}` | 触发渲染（Phase 3+4 异步） |
| GET | `/api/projects/:id/video` | — | `video/mp4` | 下载成品 |
| DELETE | `/api/projects/:id` | — | `204` | 删除项目及资产 |
| WS | `/api/projects/:id/ws` | — | WebSocket | 进度推送 |

### 6.2 关键路由实现

**POST /api/projects** — 同步返回：

```javascript
// projectsRouter.js
router.post('/', async (req, res) => {
  const { script, format = 'portrait', style = 'tech', durationPref } = req.body;
  
  // Phase 1: 文案分析
  const analysis = await scriptAnalyzer.analyzeScript({ scriptText: script, format, style, durationPref });
  
  // Phase 2: 视觉合同生成
  const contract = await visualContractGenerator.generate(analysis);
  
  // 持久化项目
  const project = projectStore.create({ script, format, style, analysis, scenes: contract.scenes, captions: contract.captions });
  
  res.json({ id: project.id, scenes: project.scenes, captions: project.captions, analysis: project.analysis });
});
```

**POST /api/projects/:id/render** — 异步执行：

```javascript
// renderRouter.js
router.post('/:id/render', async (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  
  const jobId = renderQueue.enqueue(project.id);
  res.json({ jobId, status: 'queued' });
  
  // 异步执行（不 await）
  renderQueue.process(project.id).catch(err => console.error('Render failed:', err));
});
```

### 6.3 项目存储

```javascript
// projectStore.js — 开发阶段用内存 Map，生产阶段可选文件持久化

const projects = new Map();

module.exports = {
  create(data) {
    const id = crypto.randomUUID().slice(0, 8);
    const project = {
      id,
      status: 'draft',       // draft | rendering | done | error
      script: data.script,
      format: data.format,
      style: data.style,
      analysis: data.analysis,
      scenes: data.scenes,
      captions: data.captions,
      projectJson: null,      // 渲染前的完整 Project JSON
      outputPath: null,       // 成品 .mp4 路径
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects.set(id, project);
    return project;
  },
  get(id) { return projects.get(id) || null; },
  update(id, patch) {
    const p = projects.get(id);
    if (!p) return null;
    Object.assign(p, patch, { updatedAt: Date.now() });
    return p;
  },
  delete(id) { return projects.delete(id); },
  list() { return [...projects.values()]; },
};
```

### 6.4 渲染队列

```javascript
// renderQueue.js — 同一时间只处理一个渲染任务
// 防止多个 render 竞争 Chrome headless 和 GPU 资源

class RenderQueue {
  constructor() {
    this.queue = [];
    this.current = null;
  }

  enqueue(projectId) {
    // ...
  }

  async process(projectId) {
    // 如果当前有渲染任务，等它完成
    if (this.current) {
      return; // 已开始异步，后续在 processLoop 中处理
    }
    return this.processLoop();
  }

  async processLoop() {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      this.current = job.projectId;
      try {
        const orchestrator = new PipelineOrchestrator();
        orchestrator.on('progress', (ev) => wsRouter.broadcast(job.projectId, ev));
        const result = await orchestrator.runFromExistingProject(job.projectId);
        projectStore.update(job.projectId, { status: 'done', outputPath: result.outputPath });
      } catch (err) {
        projectStore.update(job.projectId, { status: 'error', error: err.message });
      }
    }
    this.current = null;
  }
}
```

---

## 7. 前端设计

### 7.1 页面规范

#### CreateProject.tsx — 文案输入页

```
布局:
┌─────────────────────────────────┐
│  [Logo] Script → Video          │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 输入你的文案或口播稿       │   │
│  │                           │   │
│  │  [textarea 占 60vh]       │   │
│  │                           │   │
│  │  或 拖拽 .txt 文件到此处    │   │
│  └──────────────────────────┘   │
│                                 │
│  竖屏 [●]    横屏 [○]           │
│  风格: [科技 ▼] [极简] [活力]  │
│  目标时长: [30s ▼] [60s] [90s] │
│                                 │
│  [ 🔄  生成视频 ]               │
└─────────────────────────────────┘
```

**状态**:
- `idle` — 初始，按钮可用
- `loading` — 点击后，按钮 disable + spinner
- `loaded` — 收到 scenes 列表后跳转 ProjectDetail
- `error` — 显示错误信息

#### ProjectDetail.tsx — 场景预览页

```
布局:
┌─────────────────────────────────┐
│  返回    项目: {title}          │
│                                 │
│  ┌─────────┬──────────────┐     │
│  │ 场景列表  │ 场景详情      │     │
│  │          │              │     │
│  │ scene-0  │  [场景缩略图] │     │
│  │  钩子    │              │     │
│  │  spoken  │  旁白:        │     │
│  │  -title  │  "你有没有..." │     │
│  │          │              │     │
│  │ scene-1  │  Family:     │     │
│  │  问题    │  [spoken-    │     │
│  │  spoken  │  compare ▼]  │     │
│  │  -metric │               │     │
│  │          │  配色: [cyan] │     │
│  │ scene-2  │              │     │
│  │  证据    │  [预览 still] │     │
│  │  spoken  │              │     │
│  │  -rank-  │  [生成 still] │     │
│  │  ing     │              │     │
│  │          │              │     │
│  └─────────┴──────────────┘     │
│                                 │
│  [ 🔄 重新生成场景 ]  [ ▶ 渲染 ]  │
└─────────────────────────────────┘
```

**场景列表侧栏**: 显示所有 scene 的 id、family、narration 摘要
**场景详情**: 显示选中 scene 的完整 payload
**可操作项**:
- 下拉框更换 family（自动适配 payload schema）
- 颜色选择器调 accent
- 显示该 scene 的 still 缩略图（可选）

#### RenderProgress.tsx — 渲染进度页

```
布局:
┌─────────────────────────────────┐
│  [返回]  渲染进度                │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Phase 1  文案分析   ✅    │  │
│  │  Phase 2  生成场景   ✅    │  │
│  │  Phase 3  配音中    🔄    │  │
│  │  Phase 4  渲染中          │  │
│  │           ▓▓▓▓▓░░░░ 45%   │  │
│  └───────────────────────────┘  │
│                                 │
│  [ 📥  下载视频 ] (完成后显示)   │
└─────────────────────────────────┘
```

### 7.2 前端 API Client

```typescript
// api/client.ts
const API_BASE = 'http://localhost:3001';

export const api = {
  createProject(data: CreateProjectInput): Promise<Project> {
    return fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },

  getProject(id: string): Promise<Project> {
    return fetch(`${API_BASE}/api/projects/${id}`).then(r => r.json());
  },

  updateScene(projectId: string, sceneId: string, patch: ScenePatch): Promise<Scene> {
    return fetch(`${API_BASE}/api/projects/${projectId}/scenes/${sceneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.json());
  },

  startRender(projectId: string): Promise<{ jobId: string }> {
    return fetch(`${API_BASE}/api/projects/${projectId}/render`, {
      method: 'POST',
    }).then(r => r.json());
  },

  getVideoUrl(projectId: string): string {
    return `${API_BASE}/api/projects/${projectId}/video`;
  },

  connectProgressWs(projectId: string, onProgress: (ev: ProgressEvent) => void): () => void {
    const ws = new WebSocket(`ws://localhost:3001/api/projects/${projectId}/ws`);
    ws.onmessage = (msg) => onProgress(JSON.parse(msg.data));
    return () => ws.close();
  },
};
```

---

## 8. WebSocket 进度协议

### 事件格式

```typescript
type ProgressEvent = {
  phase: 1 | 2 | 3 | 4;
  status: string;
  percent: number;          // 0-100
  detail?: string;          // 可选详情
  timestamp: number;        // Date.now()
};
```

### 完整事件流

| 事件 | phase | status | percent | 说明 |
|------|-------|--------|---------|------|
| | **POST /api/projects** | | | Phase 1+2 同步执行 |
| 1 | 1 | analyzing-script | 5 | LLM 分析文案并分段 |
| 2 | 2 | generating-visual-contract | 15 | 每段 narration → scene payload |
| | **POST /api/projects/:id/render** | | | Phase 3+4 异步执行 |
| 3 | 3 | generating-tts | 35 | 调用 Qwen TTS 生成配音 |
| 4 | 3 | tts-progress | 35-45 | TTS 分段进度（逐段回调） |
| 5 | 4 | rendering | 45 | 开始 Remotion 渲染 |
| 6 | 4 | render-frames | 45-95 | 帧渲染进度（每 5% 推送） |
| 7 | 4 | muxing | 95 | FFmpeg 合成音画 |
| 8 | 4 | done | 100 | 完成 |
| | 错误 | error | — | error: message |

### 前端适配

```typescript
// 优先 WebSocket，降级到 SSE（EventSource）
function connectProgress(id, onProgress) {
  if (window.WebSocket) {
    const ws = new WebSocket(`ws://localhost:3001/api/projects/${id}/ws`);
    ws.onmessage = (e) => onProgress(JSON.parse(e.data));
    return () => ws.close();
  } else {
    const es = new EventSource(`/api/projects/${id}/sse`);
    es.onmessage = (e) => onProgress(JSON.parse(e.data));
    return () => es.close();
  }
}
```

---

## 9. 数据模型

### 9.1 Project (完整状态)

```typescript
interface Project {
  id: string;                    // UUID 前 8 位
  status: 'draft' | 'rendering' | 'done' | 'error';
  script: {
    text: string;                // 原始文案
    format: 'portrait' | 'landscape';
    style: 'tech' | 'minimal' | 'vibrant';
    durationPref?: number;       // 目标时长（秒）
  };
  scenes: Scene[];               // 场景列表
  captions: Caption[];           // 字幕列表
  analysis: {
    wordCount: number;
    estimatedDurationSec: number;
    segmentCount: number;
    type: string;                // 文案类型
  };
  render: {
    jobId?: string;
    startedAt?: number;
    completedAt?: number;
    percent: number;             // 0-100
    outputPath?: string;         // 成品路径
    error?: string;
  };
  createdAt: number;
  updatedAt: number;
}
```

### 9.2 Scene

```typescript
interface Scene {
  id: string;                    // 'scene-0', 'scene-1', ...
  family: string;                // family 名称
  durationInFrames: number;
  narration: string;             // 对口播原文
  payload: Record<string, unknown>;  // family 专属
  transition: false | { type: 'fade' | 'slide', durationInFrames: number };
  assetIds: string[];
  thumbnails?: {                 // still 缩略图（可选）
    path: string;
    frame: number;
  };
}
```

### 9.3 Caption

```typescript
interface Caption {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
}
```

---

## 10. HARD_LOCK 与安全边界

### 绝对不能碰的文件（渲染引擎）

| 文件 | 原因 |
|------|------|
| `remotion-video/src/project/projectSchema.ts` | Zod 合同，46 family 共用 |
| `remotion-video/src/project/compileProject.ts` | 新管线编译核心 |
| `remotion-video/src/project/sceneRegistry.tsx` | 46 family → 组件 + Zod 映射 |
| `remotion-video/src/compositions/UltimateSceneTemplate.tsx` | 主渲染组件 |
| `remotion-video/src/data/registry.ts` | 46 family 元数据 |
| `remotion-video/src/data/storyboardLoader.ts` | shots→scenes 转换 |
| `remotion-video/src/Root.tsx` | Composition 注册入口 |
| `remotion-video/src/components/ultimate-kit/` | 所有 family 组件（46 个） |

### 安全变更模式

| 操作 | 允许方式 |
|------|---------|
| 新 family | 按 sceneRegistry 规范注册，通过类型检查 + project:check |
| 新 payload 字段 | types.ts → Zod schema → tests → gate |
| 改渲染逻辑 | 只改 pipeline/ 和 server/，通过 project JSON 消费渲染引擎 |
| 手动换 family | wrapper 层重新生成 payload，不碰 family 组件内部 |

### 核心产品约束

1. **视觉合同必须从脚本语义生成** — 输入"这款面霜保湿效果如何"，画面不能出现"WorkBuddy"或"GPT-5.6"
2. **不同脚本 = 不同 scene family 组合** — Phase 1 的 scriptAnalyzer 根据文案语义推荐 family
3. **支持手动覆盖** — 用户可以在场景列表里替换某个 scene 的 family，payload 自动适配新 family schema
4. **没有"复用旧视图"的路径** — 每次脚本变更 → 视觉合同指纹变化 → 强制再生
5. **进度对用户可见** — Phase 1-4 每一步发 WebSocket 事件

---

## 11. 开发路线图

### Phase A — 基础设施（1-2 天）

```
□ pipeline/lib/llmClient.js        — OpenAI 兼容 LLM 客户端
□ pipeline/lib/ttsClient.js        — Qwen TTS 客户端（封装现有逻辑）
□ server/store/projectStore.js     — 内存项目存储
□ server/index.js                  — Express 启动，挂载路由
```

### Phase B — Pipeline 核心（2-3 天）

```
□ pipeline/lib/familySelector.js   — 语义→family 推荐引擎
□ pipeline/lib/assetDownloader.js  — 远程图片/资产下载
□ pipeline/scriptAnalyzer.js       — Phase 1: 文案分段
□ pipeline/visualContractGenerator.js — Phase 2: 视觉合同
□ pipeline/ttsGenerator.js         — Phase 3: TTS
□ pipeline/remotionRenderer.js     — Phase 4: Remotion 渲染
□ pipeline/pipelineOrchestrator.js — 串联器 + 进度事件
```

### Phase C — 后端 API（1-2 天）

```
□ server/api/projectsRouter.js     — CRUD /api/projects
□ server/api/renderRouter.js       — render + video download
□ server/api/wsRouter.js           — WebSocket 进度推送
□ server/lib/renderQueue.js        — 串行渲染队列
```

### Phase D — 前端（2-3 天）

```
□ video-pipeline-view/types.ts      — 前端类型定义
□ video-pipeline-view/api/client.ts — API 封装
□ video-pipeline-view/App.tsx       — 路由
□ video-pipeline-view/pages/CreateProject.tsx
□ video-pipeline-view/pages/ProjectDetail.tsx
□ video-pipeline-view/pages/RenderProgress.tsx
```

### Phase E — 集成与验收（1 天）

```
□ 端到端测试: 输入文案 → 生成场景 → 手动调 → 渲染 → 下载
□ 两个不同文案 → 场景结构和画面不同
□ 错误处理: LLM 超时、TTS 失败、渲染异常
□ 安装文档与 README 更新
```

---

## 12. 交付验收标准

### 功能验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 服务启动 | `node server/index.js` → 监听 3001 |
| 2 | 创建项目 | `curl -X POST localhost:3001/api/projects -d '{"script":"...","format":"portrait"}'` → 返回 projectId, scenes[] |
| 3 | 每个 scene 非空 | scenes[].payload 有 title, items, visualProps 等字段 |
| 4 | 同脚本跑两次 → 场景不同 | 两次返回的 scenes 结构不同（LLM 随机性） |
| 5 | 不同脚本 → 不同 family 组合 | 脚本 A 和脚本 B 的 scenes[].family 排列不同 |
| 6 | 手动调 scene family | PUT 换 family → payload 自动适配新 schema |
| 7 | 触发渲染 | POST render → WebSocket 收到 Phase 1→4 进度事件 |
| 8 | 下载成品 | GET /api/projects/:id/video → 返回可播放 .mp4 |
| 9 | 视频有音频 | MP4 包含 AAC 音频流 |
| 10 | 错误状态 | TTS 失败 / render 异常 → project.status='error', error 字段有消息 |

### 架构验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 11 | HARD_LOCK 文件未修改 | git diff remotion-video/src/project/ — 无变更 |
| 12 | 纯函数管道 | pipeline/ 模块不依赖 Express req/res |
| 13 | 无并发渲染 | renderQueue 保证同时最多 1 个 render 运行 |
| 14 | 换稿强制再生 | 脚本变 → visualContract 指纹变 → 不读缓存 |

### 前端验收

| # | 验收项 |
|---|--------|
| 15 | 文案输入 > 1000 字时 textarea 正常滚动 |
| 16 | 文件上传支持 .txt 拖拽 |
| 17 | 场景列表显示每个 scene id + family + narration 摘要 |
| 18 | 换 family 下拉框包含全部 46 个 family |
| 19 | 进度条从 Phase 1 到 Phase 4 连续推进 |
| 20 | 渲染完成后 "下载视频" 按钮可用 |

---

## 附录 A: 现有脚本映射

| 现有脚本 | 新位置 | 改造方式 |
|---------|--------|---------|
| `generate-tts-for-project.mjs` | `pipeline/ttsGenerator.js` | 封装为 async 纯函数 |
| `project-check.mjs` | `pipeline/lib/projectValidator.js` | 封装为校验函数 |
| `project-render.mjs` | `pipeline/remotionRenderer.js` | 封装为进度回调版 |
| `tools-studio-server.mjs` | 废弃 | 被新 server/ 替代 |
| 无（run-search-to-ultimate.mjs 不存在） | `pipeline/pipelineOrchestrator.js` | 新建 |

## 附录 B: 46 个 family 快速参考

| 类别 | families |
|------|----------|
| **Spoken (9)** | spoken-title, spoken-metric, spoken-process, spoken-ranking, spoken-compare, spoken-tags, spoken-code, spoken-takeaway, spoken-typewriter, SpokenAssetLayer |
| **Ultimate (18)** | hero-panel, feature-card-rail, focus-diagram, number-strip, step-flow, timeline, compare-board, terminal-panel, evidence-wall, architecture-map, tag-matrix, code-panel, metric-bars, data-stream, benchmark-chart, quote-highlight, glossary-term, cta-panel |
| **Minimal (6)** | minimal-hero, minimal-step-flow, minimal-tag-matrix, minimal-number-strip, minimal-timeline, minimal-compare-board |
| **Special (13)** | skill-showcase, (其余来自 registry.ts 的 ALL_FAMILIES 中未列出的) |
