# API 参考

## 渲染 API

### POST /api/render

提交渲染任务。

**请求体：**

```json
{
  "projectId": "string",
  "template": "ultimate",
  "visualSystem": "ultimate-1080p",
  "shots": [
    {
      "id": "shot-01",
      "title": "开场",
      "narration": "口播文本",
      "durationSeconds": 6,
      "family": "hero",
      "visualProps": {}
    }
  ],
  "voiceSettings": {
    "engine": "qwen-tts",
    "voice": "zh-cn-female",
    "speed": 1.0
  },
  "script": "完整口播稿",
  "webhook": "https://example.com/callback",
  "designJson": {},
  "subtitleData": [],
  "options": {
    "frameRange": [0, 180],
    "smokeTest": true
  }
}
```

**响应：**

```json
{
  "jobId": "render_1714800000_abc12345",
  "status": "pending",
  "message": "渲染任务已提交，请使用 GET /api/render/:jobId 查询进度",
  "docs": {
    "status": "GET /api/render/render_1714800000_abc12345",
    "cancel": "DELETE /api/render/render_1714800000_abc12345"
  }
}
```

### GET /api/render/:jobId

查询渲染任务状态。

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| jobId | string | 任务 ID |
| status | string | pending / running / done / error |
| progress | number | 0-100 进度百分比 |
| progressMsg | string | 当前阶段描述 |
| createdAt | string | ISO 时间戳 |
| startedAt | string | ISO 时间戳 |
| completedAt | string | ISO 时间戳 |
| error | string | 错误信息 (仅 error 状态) |
| outputFile | string | 产物本地路径 |
| outputUrl | string | 产物公网 URL |
| downloadUrl | string | 下载端点 |
| outputBytes | number | 文件大小 (bytes) |
| outputSizeLabel | string | 格式化文件大小 |
| voiceUrl | string | 配音文件 URL |
| subtitleUrl | string | 字幕文件 URL |

### DELETE /api/render/:jobId

取消渲染任务。需要 Admin 权限。

同时会取消关联的 HTTP 请求（通过 requestCancellation.js）。

### POST /api/render/:jobId/retry

重试失败任务（最多 3 次）。需要 Admin 权限。

### GET /api/render

列出所有渲染任务（分页）。需要 Admin 权限。

**查询参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| status | — | 按状态过滤 |
| limit | 20 | 每页数量 |
| offset | 0 | 偏移量 |

### GET /api/render/:jobId/download

下载渲染产物。自动检测 mp4/webm/gif 扩展名。

## 图片生成 API

### POST /api/images/generate

生成分镜图。接收 `{ projectId, prompts, shots }`。

### GET /api/images/:jobId

查询分镜图生成状态。返回中会包含每张图的 URL。

## 工作流 API

### POST /api/workflow/generate

启动工作流生成。接收任意步骤的输入：

```json
{
  "stepId": 1,
  "topic": "Claude Code vs Codex",
  "pipelineState": {},
  "generation": { "mode": "normal" }
}
```

**响应 (202 Accepted)：**

```json
{
  "jobId": "wf_xxx",
  "status": "running",
  "progress": 0,
  "progressMsg": "初始化",
  "docs": {
    "status": "GET /api/workflow/wf_xxx"
  }
}
```

### GET /api/workflow/:jobId

查询工作流生成任务状态。

### GET /api/skills/catalog

获取可用技能目录。返回所有已注册的 workflow skills 列表。

示例响应：

```json
{
  "skills": [
    { "skillId": "video-pipeline-analysis", "stepId": 1, "phaseLabel": "研究选题" },
    { "skillId": "video-pipeline-title", "stepId": 2, "phaseLabel": "爆款标题" }
  ],
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/skills/:skillId

获取单个技能的详细规格。

## 语音 API

### POST /api/voice

提交语音合成任务。

### GET /api/voice/:jobId

查询语音合成任务状态。

### POST /api/voice/:jobId/retry

重试失败的语音任务。需要 Admin 权限。

## 项目 API

### GET /api/projects

列出所有项目。需要 Admin 权限。

### GET /api/projects/:project/assets

列出指定项目的资产文件。需要 Admin 权限。

## 任务 API

### GET /api/jobs

列出所有任务类型（渲染 + 语音）。需要 Admin 权限。

## 监控 API

### GET /api/memory-stats

查看当前进程内存使用情况。需要 Admin 权限。

响应示例：

```json
{
  "totalRssMb": 1234,
  "limitMb": 4096,
  "perProcessLimitMb": 2048,
  "trackedCount": 2,
  "processes": [
    { "pid": 12345, "label": "render-xxx", "rssMb": 800, "killed": false }
  ]
}
```

### GET /api/requests

查看当前活跃 HTTP 请求。需要 Admin 权限。

## 健康检查

### GET /health

服务健康检查。返回队列模式、启动时间、能力清单。

```json
{
  "status": "ok",
  "mode": "file",
  "uptime": 12345,
  "capabilities": {
    "workflow": { "available": true },
    "voice": { "engines": ["qwen-tts"] },
    "skills": { "total": 8 }
  }
}
```

## 根端点

### GET /

返回 API 概览，包含所有可用端点列表。

## 认证

所有 API 端点（除 `/health` 和 `/`）需要通过 `Authorization` 头或 `Authorization` 查询参数认证：

```
Authorization: Bearer <PIPELINE_API_KEY>
```

带 🔒 标记的端点需要 Admin 权限：

```
Authorization: Bearer <PIPELINE_ADMIN_KEY>
```

## 速率限制

- **读取端点**（GET 请求）：独立限流器
- **写入端点**（POST/DELETE 请求）：独立限流器
- **Admin 端点**：独立的 Admin 读写限流器
- 限流参数通过 `PIPELINE_RATE_LIMIT_*` 环境变量配置

## 错误响应格式

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": null
}
```

常见 HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 202 | 已接受（异步任务） |
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 403 | 权限不足（需 Admin） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3001 | 服务端口 |
| PIPELINE_QUEUE_MODE | file | 队列模式 (file/redis) |
| PIPELINE_LOG_LEVEL | info | 日志级别 (PIPELINE_LOG_LEVEL 或 LOG_LEVEL) |
| PIPELINE_API_KEY | — | API 认证密钥 |
| PIPELINE_ADMIN_KEY | — | Admin 认证密钥 |
| PIPELINE_MEMORY_LIMIT_MB | 4096 | 总内存上限 |
| PIPELINE_PROCESS_MEMORY_MB | 2048 | 单进程内存上限 |
| PIPELINE_MEMORY_CHECK_MS | 5000 | 内存检查间隔 (ms) |
| PIPELINE_MEMORY_KILL_GRACE_MS | 10000 | 内存超限后 SIGKILL 等待 (ms) |
| MINIMAX_API_KEY | — | MiniMax LLM API 密钥 |
| OPENAI_API_KEY | — | OpenAI API 密钥 |
| DASHSCOPE_API_KEY | — | 阿里千问 TTS API 密钥 |
| DEEPGRAM_API_KEY | — | Deepgram 字幕 API 密钥 |
| WORKER_DURATION_LIMIT | 1200000 | 渲染超时 (ms) |
| WORKER_CONCURRENCY | 2 | Redis 模式 Worker 并发数 |
| WORKER_SHUTDOWN_TIMEOUT_MS | 30000 | Worker 关闭超时 |
| DISABLE_EXTERNAL_SEARCH | 0 | 禁用外部搜索 |
| REDIS_URL | redis://localhost:6379 | Redis 连接地址 |
