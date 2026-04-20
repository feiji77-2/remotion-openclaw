# Staging Smoke Flow

这份流程用于在 `staging` 环境里做一轮标准化冒烟，而不是继续靠手工点点点。

## 目标

- 确认 API/Worker 已按 `redis` 模式启动
- 确认 `PIPELINE_API_KEY` / `PIPELINE_ADMIN_KEY` 生效
- 确认工作流异步任务链路可用
- 确认图片、配音、渲染、下载链路至少能跑通一轮
- 确认管理接口仍可用，但已与普通 API 权限分离

## 前置条件

1. 准备 staging 环境变量

```bash
cp remotion-video/.env.staging.example remotion-video/.env.staging
```

2. 至少补齐这些值

- `PIPELINE_API_BASE`
- `PIPELINE_API_KEY`
- `PIPELINE_ADMIN_KEY`
- `PIPELINE_QUEUE_MODE=redis`
- `REDIS_URL`
- `PIPELINE_ALLOWED_ORIGINS`
- `CHATTTS_HTTP_*` 或可用的语音回退链路

3. 启动 API 和 Worker

```bash
npm run dev:api
npm run dev:worker
```

如果是 staging 机器上的常驻服务，则确认 `/health` 正常。

## 执行命令

在 `remotion-video/` 目录下执行：

```bash
node scripts/run-staging-smoke.mjs
```

可选参数：

```bash
node scripts/run-staging-smoke.mjs \
  --base-url http://127.0.0.1:3001 \
  --project staging-smoke \
  --timeout-ms 300000
```

如果你只想先验证 API/工作流，而不是全量渲染：

```bash
node scripts/run-staging-smoke.mjs --skip-render
```

## 检查点

脚本会依次验证：

1. `/health`
2. `/api/skills/catalog`
3. `POST /api/workflow/generate` + `GET /api/workflow/:jobId`
4. `POST /api/images/generate` + `GET /api/images/:jobId`
5. `POST /api/voice` + `GET /api/voice/:jobId`
6. `POST /api/render` + `GET /api/render/:jobId`
7. `GET /api/render/:jobId/download`
8. `GET /api/jobs`
9. `GET /api/projects/:project/assets`

## 失败时优先看什么

- `/health` 返回的 `mode` 是否仍是 `file`
- `PIPELINE_API_KEY` / `PIPELINE_ADMIN_KEY` 是否和服务端一致
- Redis 是否可连
- TTS 服务是否可用
- Worker 日志里是否出现素材路径被拒绝、Webhook 被拒绝、下载失败或渲染超时

## 建议节奏

- 每次部署到 staging 后先跑一次
- 合并安全或队列相关改动后必须跑
- 准备发布前至少跑一次全量（不要 `--skip-render`）
