# Ultimate 视频生成工作流

## 系统架构

```
用户输入（主题/脚本）
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Fast Pipeline（3 步）                                │
│  Step 1: LLM 搜索 + 话题分析                          │
│  Step 2: 爆款标题 + 口播稿生成                        │
│  Step 3: 分镜规划 + 视觉提示                          │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  工作流引擎 (workflowGenerator.js)                    │
│  拆分为 4 模块: searchUtils / stepSchema / normalizers │
│  + step123/pipeline（Step 1-3 专用 LLM 管线）          │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  API 服务 (server.js)                                  │
│  ├─ POST /api/render — 提交渲染任务                     │
│  ├─ POST /api/render/:jobId/retry — 重试失败任务        │
│  ├─ GET /api/render/:jobId — 查询渲染状态               │
│  ├─ DELETE /api/render/:jobId — 取消任务                │
│  ├─ POST /api/workflow/generate — 启动工作流生成        │
│  ├─ GET /api/workflow/:jobId — 查询工作流状态           │
│  ├─ POST /api/images/generate — 分镜图生成              │
│  ├─ GET /api/images/:jobId — 分镜图状态                │
│  ├─ POST /api/voice — 语音合成任务                     │
│  ├─ GET /api/voice/:jobId — 语音任务状态               │
│  └─ GET /health — 健康检查                             │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  任务队列 (fileQueue.js + renderQueue.js)              │
│  文件版 (默认) / Redis (BullMQ) 双模式                 │
│                                                        │
│  Worker: renderWorker.js                               │
│    Stage 1: Qwen TTS 配音合成                          │
│    Stage 2: 字幕生成 (Deepgram/Whisper/SRT)            │
│    Stage 3: Remotion 渲染 (spawn child process)        │
│    Stage 4: Webhook 回调                               │
│                                                        │
│  内存限制器: memoryLimiter.js                          │
│  请求取消: requestCancellation.js                       │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Remotion 渲染                                         │
│  20 核心 Scene Families + 6 Minimal 抖音风格            │
│  4 层动效系统 (camera/layout/foreground/micro)         │
│  6 种动画原语 (slideIn/scaleEmphasis/pulseAttention/   │
│    staggerSlide/staggerScale/floatMotion)              │
│  26 种视觉模板                                        │
└──────────────────────────────────────────────────────┘
```

## 项目目录结构

```
remotion-video/
├── server/
│   ├── api/                  # Express API 路由
│   │   ├── server.js         # 主服务入口
│   │   ├── imageJob.js       # 分镜图生成任务管理
│   │   └── requestCancellation.js  # HTTP 请求取消
│   ├── queue/
│   │   ├── fileQueue.js      # 文件版队列（JSON 文件持久化）
│   │   └── renderQueue.js    # Redis/BullMQ 队列
│   ├── workers/
│   │   ├── renderWorker.js   # 4 阶段渲染流水线
│   │   └── memoryLimiter.js  # 进程内存监控与限制
│   ├── workflow/
│   │   ├── workflowGenerator.js  # 工作流生成入口 (Step 1-8)
│   │   ├── stepSchema.js     # Step 上下文构建与 Schema
│   │   ├── searchUtils.js    # DuckDuckGo 搜索
│   │   ├── skillRegistry.js  # 技能注册表
│   │   ├── normalizers.js    # 步骤负载规范化
│   │   ├── phaseRegistry.js  # 阶段定义
│   │   ├── workflowJobStore.js # 工作流任务持久化
│   │   └── step123/          # Step 1-3 LLM 管线
│   │       ├── pipeline.js   # 主管线
│   │       ├── llm.js        # LLM 调用封装
│   │       ├── context.js    # 上下文构建
│   │       ├── normalizers.js # 步骤规范化
│   │       ├── quality.js    # 质量控制
│   │       ├── technicalTopic.js # 技术话题分析
│   │       ├── step3SkillDriver.js # Step 3 技能驱动
│   │       └── errors.js     # 错误类型
│   ├── voice/                # TTS 引擎 (Qwen/Bailing)
│   ├── subtitles/            # 字幕生成 (Deepgram/Whisper)
│   ├── security/             # 鉴权与限流
│   ├── validators/           # 请求校验
│   ├── config/runtimePaths.js # 运行时路径配置
│   └── utils/                # 工具 (logger 等)
├── src/
│   ├── Root.tsx              # Remotion 根注册
│   ├── animations/           # 基础动画函数
│   ├── components/ultimate-kit/
│   │   ├── families/         # 26 个 Scene Family 组件
│   │   ├── motionGrammar.ts  # 4 层动效编排
│   │   └── shotArchetypes.ts # 6 种动画原语 + 镜头原型
│   ├── data/
│   │   ├── registry.ts       # Family 注册表 (规范数据源)
│   │   ├── shotGrammar.ts    # 镜头语法系统
│   │   └── storyboard.ts     # 故事板加载
│   └── compositions/         # Remotion Composition 注册
├── scripts/
│   ├── lib/                  # 构建/渲染工具库
│   ├── run-search-to-ultimate.mjs  # 一键工作流入口
│   ├── fast-pipeline.mjs     # 快速流水线
│   └── *.mjs                 # 各种工具脚本
├── runtime/jobs/             # 文件队列任务数据
└── public/assets/            # 输出产物
```

## 工作流步骤 (Step 1-8)

| Step | 阶段 | 说明 | 产物 |
|------|------|------|------|
| 1 | 逻辑分析 | 话题搜索 + 命题收敛 | analysis, topicResearch |
| 2 | 标题生成 | 爆款标题池 + 角度策略 | titles, selectedTitle |
| 3 | 内容生成 | 口播稿 + Hook/Body/CTA | copy |
| 4 | 场景编排 | 分镜规划 + Family 命中 | shots |
| 5 | 视觉提示词 | 分镜图 Prompt 生成 | prompts |
| 6 | 配音脚本 | TTS 参数 + 情感标注 | voice |
| 7 | Remotion 项目 | 构建脚本/项目文件 | projectBuild |
| 8 | 渲染设置 | 视频输出参数 | render |

## 队列系统

支持两种模式（通过 `PIPELINE_QUEUE_MODE` 环境变量切换）：

### 文件版 (默认, `file`)
- 任务以 JSON 文件持久化到 `runtime/jobs/`
- Worker 使用自适应轮询 + fs.watch 监听
- 空闲时退避轮询 (1s → 5s max)
- 支持优雅关闭 (max 30s)
- 适合本地开发与单进程部署

### Redis 版 (`redis`)
- 基于 BullMQ + ioredis
- 支持并发 Worker (`WORKER_CONCURRENCY`)
- 自动重试 (指数退避, max 3 次)
- 适合生产环境多 Worker 部署

## 渲染流水线 (4 Stage)

renderWorker.js 将渲染分为 4 个阶段：

1. **Stage 1: 配音合成** — Qwen TTS 逐分镜合成，分批 (batch=3) 并行
2. **Stage 2: 字幕生成** — Deepgram/Whisper 转写，降级为 SRT 对齐
3. **Stage 3: Remotion 渲染** — spawn child process 执行 `npx remotion render`
4. **Stage 4: Webhook 回调** — 结果通知 (可选)

## 内存管理

memoryLimiter.js 提供进程级内存监控：
- 默认总上限 4096 MB (`PIPELINE_MEMORY_LIMIT_MB`)
- 单进程上限 2048 MB (`PIPELINE_PROCESS_MEMORY_MB`)
- 每 5s 检查一次 (`PIPELINE_MEMORY_CHECK_MS`)
- 超限后先 SIGTERM，10s 后 SIGKILL
- 通过 `GET /api/memory-stats` 查看进程内存

## 请求取消

requestCancellation.js 追踪所有活跃 HTTP 请求：
- 请求关闭时自动取消关联的渲染任务
- 管理员可手动取消 (`DELETE /api/render/:jobId`)
- 通过 `GET /api/requests` 查看活跃请求

## 安全机制

- API Key 认证 (`PIPELINE_API_KEY`)
- Admin Key 认证 (`PIPELINE_ADMIN_KEY`)
- 读写分离限流 (非 Admin 或 Admin 分别配置)
- CORS 配置
- 队列模式校验 (可限制仅允许 file/redis)

## 一键运行

```bash
# 完整工作流（搜索 → 渲染）
npm run workflow:ultimate -- "你的主题"

# 仅工作流，不渲染
npm run workflow:ultimate -- "主题" --no-render

# 跳过配音
npm run workflow:ultimate -- "主题" --no-voice --no-render

# 指定输出文件
npm run workflow:ultimate -- "主题" --output out/video.mp4
```

## 主要产物路径

- `projects/<projectId>/project.json` — 项目配置
- `projects/<projectId>/workflow-state.json` — 工作流状态
- `projects/<projectId>/render-props.json` — 渲染属性
- `projects/<projectId>/ultimate-config.json` — Ultimate 配置
- `public/assets/outputs/<projectId>/<jobId>.mp4` — 最终视频

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3001 | 服务端口 |
| PIPELINE_QUEUE_MODE | file | 队列模式 (file/redis) |
| PIPELINE_LOG_LEVEL | info | 日志级别 |
| PIPELINE_API_KEY | — | API 认证密钥 |
| PIPELINE_ADMIN_KEY | — | Admin 认证密钥 |
| PIPELINE_MEMORY_LIMIT_MB | 4096 | 总内存上限 |
| PIPELINE_PROCESS_MEMORY_MB | 2048 | 单进程内存上限 |
| MINIMAX_API_KEY | — | MiniMax LLM API 密钥 |
| OPENAI_API_KEY | — | OpenAI API 密钥 |
| DASHSCOPE_API_KEY | — | 阿里千问 TTS API 密钥 |
| DEEPGRAM_API_KEY | — | Deepgram 字幕 API 密钥 |
