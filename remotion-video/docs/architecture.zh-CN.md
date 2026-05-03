# 架构概述

## 项目结构

```
remotion-video/
├── server/          # Node.js 后端服务
│   ├── api/         # Express API 路由
│   ├── queue/       # 任务队列 (file/redis 双模式)
│   ├── workers/     # 渲染 Worker + 内存限制器
│   ├── workflow/    # 工作流引擎 (Step 1-8)
│   ├── voice/       # TTS 语音合成 (Qwen/Bailing)
│   ├── subtitles/   # 字幕生成 (Deepgram/Whisper)
│   ├── security/    # 鉴权与限流
│   ├── validators/  # 请求校验
│   ├── config/      # 路径配置
│   └── utils/       # 工具函数
├── src/             # Remotion 前端
│   ├── components/ultimate-kit/  # Scene Family 组件
│   │   ├── families/             # 26 个场景组件
│   │   ├── motionGrammar.ts      # 4 层动效系统
│   │   └── shotArchetypes.ts     # 6 种动画原语
│   ├── data/        # 注册表与数据规范
│   ├── animations/  # 基础动画函数
│   └── compositions/ # Remotion 注册入口
├── scripts/         # CLI 工具
│   ├── lib/         # 构建/渲染库
│   └── *.mjs        # 各种入口脚本
├── runtime/jobs/    # 文件队列任务持久化
└── public/assets/   # 产物存储
```

## 数据流

```
用户输入（主题/脚本）
    │
    ▼
┌──────────────────────┐
│  POST /api/render     │  ← HTTP 入口
│  或 POST /api/workflow│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  任务队列 (fileQueue)  │  ← 持久化到 runtime/jobs/
│  startSimpleWorker()   │  ← 自适应轮询 + fs.watch
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  renderWorker.js      │  ← 4 Stage 流水线
│                       │
│  Stage 1: 配音合成    │  ← Qwen TTS
│  Stage 2: 字幕生成    │  ← Deepgram/Whisper/SRT
│  Stage 3: Remotion    │  ← spawn child process
│  Stage 4: Webhook     │  ← 回调通知
└──────────────────────┘
```

### 工作流数据流 (Step 1-8)

```
Step 1 (逻辑分析)
  ├─ 搜索: DuckDuckGo (searchUtils.js)
  ├─ LLM: 话题分析收敛 (step123/llm.js)
  └─ 产物: analysis, topicResearch, researchFacts

Step 2 (标题生成)
  ├─ LLM: 爆款标题池 (step123/pipeline.js)
  └─ 产物: titles (6-8 个角度)

Step 3 (内容生成)
  ├─ LLM: 口播稿 (step123/step3SkillDriver.js)
  └─ 产物: copy (hook + body + cta)

Step 4 (场景编排)
  ├─ 确定性: 命中 Scene Family (skillRegistry.js)
  └─ 产物: shots (family + duration + narration)

Step 5 (视觉提示词)
  ├─ 确定性: 镜头提示词模板
  └─ 产物: prompts (byShotId)

Step 6 (配音脚本)
  ├─ 确定性: TTS 参数
  └─ 产物: voice (emotion + speed)

Step 7 (Remotion 项目)
  ├─ 确定性: project.json 构建
  └─ 产物: projectBuild

Step 8 (渲染设置)
  ├─ 确定性: 输出参数
  └─ 产物: render (template + codec)
```

## 关键设计决策

### 1. 文件版队列 (默认)

选择文件系统 JSON 持久化而非 Redis：
- 零依赖：无需外部服务即可运行
- 原子性：Node.js 单线程 event loop 下 readFileSync/writeFileSync 天然原子
- 自适应轮询：空闲时退避 (1s → 5s max)，有任务时立即唤醒
- 适合本地开发和单进程部署
- Redis 模式通过 BullMQ 支持生产环境多 Worker

### 2. 隔离的工作流

工作流引擎将 8 个步骤解耦为独立模块：
- Step 1-3 使用专用 LLM 管线 (`server/workflow/step123/`)
- Step 4-8 使用确定性模板 + 回退逻辑
- 每个步骤有独立的 normalizer 和 validator
- 回退机制确保 LLM 不可用时仍可运行

### 3. 内存限制器

memoryLimiter.js 提供进程级 OOM 防护：
- 定期检查 (默认 5s)
- 超限后杀死最耗内存的进程 (先 SIGTERM, 10s 后 SIGKILL)
- 通过 `GET /api/memory-stats` 监控
- 渲染 Worker 启动时自动启用

### 4. HTTP 请求取消

requestCancellation.js 追踪活跃 HTTP 请求：
- AbortController 模式
- 客户端断开时自动取消
- 管理员可强制取消 (`DELETE /api/render/:jobId`)
- 取消时会同时终止关联的渲染子进程

### 5. 4 层动效系统

motionGrammar.ts 将动画分为四层：
- **Camera**: 全局镜头运动 (spring-driven)
- **Layout**: 按 family 入/驻/退
- **Foreground**: 特效层 (暗角/光晕/模糊)
- **Micro**: 微抖动 (jitter)

### 6. 注册表驱动

所有 Scene Family 的元数据集中在 `registry.ts`：
- 单数据源，不再分散在多个组件
- AI 可编辑，版本可追踪
- JSON 副本发布到 `public/r/registry.json` 供 CLI 消费

## 迁移说明

### memory-graph → architecture-map

`memory-graph` 和 `architecture-map` 在 registry 中共享相同的数据结构和渲染组件。`memory-graph` 被标记为 `architecture-map` 的别名，在 storyboard loader 中会自动解析。当 worktree 状态包含 `memory-graph` 但前一场景是 `architecture-map` 时，引擎会智能跳过。

### pipeline-flow → step-flow

`pipeline-flow` 是 `step-flow` 的别名，使用相同的时序配置和组件。所有新的步骤/流程场景应使用 `step-flow`。

## 技能系统 (Skills)

工作流引擎使用技能注册表 (skillRegistry.js) 驱动每个步骤：
- 8 个注册技能对应 Step 1-8
- 技能定义在 `docs/workflow-skills/` 目录
- 每个技能包含 stepId, phase, input/output 规范
- 通过 `GET /api/skills/catalog` 查询可用技能
