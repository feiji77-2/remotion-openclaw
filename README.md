# OpenClaw Remotion Video Pipeline

基于 OpenClaw API 与 9 个真源 `SKILL.md` 的中文短视频工作台与 Remotion 运行时。

这个仓库已经收成独立可公开的 standalone repo，只保留当前主链路需要的代码、脚本和少量归档文档：

- `video-pipeline-view/player-app`：Step 1-8 可视化工作台
- `remotion-video`：Workflow API、Skill Catalog、图片、配音、Remotion 渲染运行时

## 仓库结构

```text
.
├── .github/
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── SECURITY.md
├── docs/archive/
│   ├── README.md
│   └── 10-upgrade-plan-v3.md
├── remotion-video/
└── video-pipeline-view/player-app/
```

## 环境要求

- Node.js `>=20`
- npm `>=10`
- 本机可访问的 OpenClaw 环境
- 可选本地服务：
  - ChatTTS HTTP
  - Melo / OpenVoice
  - Deepgram
  - Redis（仅 BullMQ 模式需要）

## 快速开始

1. 安装两个子项目依赖

```bash
npm run setup
```

2. 复制环境变量

```bash
cp remotion-video/.env.example remotion-video/.env
```

3. 启动 API、Worker、工作台

```bash
npm run dev:api
npm run dev:worker
npm run dev:player
```

4. 打开页面与健康检查

- Player: `http://127.0.0.1:5174`
- API Health: `http://127.0.0.1:3001/health`

## 根目录命令

- `npm run setup`：安装两个子项目依赖
- `npm run clean`：清空本地产物与前端构建目录
- `npm run dev:player`：启动前端工作台
- `npm run dev:api`：启动 Pipeline API
- `npm run dev:worker`：启动渲染 Worker
- `npm run dev:video`：打开 Remotion Studio
- `npm run typecheck`：前端 TS + Remotion TS + 后端语法检查
- `npm run build`：构建前端工作台
- `npm run build:video`：执行一次 Remotion 示例渲染
- `npm run release:check`：提交 GitHub 前唯一主校验入口

## `release:check` 会做什么

```bash
npm run clean
npm run typecheck
npm run build
node remotion-video/scripts/clean-runtime.mjs --check
```

校验目标：

- 公开脚本全部真实可用
- 后端关键文件语法正常
- 前端工作台可构建
- `remotion-video/public/assets`
- `remotion-video/public/jobs`
- `remotion-video/public/voice`

以上三个运行目录在校验结束后只允许保留 `.gitkeep`。

## Skill 真源映射

- Step 1：`~/.openclaw/skills/video-pipeline-analysis/SKILL.md`
- Step 2：`~/.openclaw/skills/video-pipeline-title/SKILL.md`
- Step 3：`~/.openclaw/skills/video-pipeline-content/SKILL.md`
- Step 4 / 5：`~/.openclaw/skills/video-pipeline-storyboard/SKILL.md`
- Step 6：`~/.openclaw/skills/video-pipeline-audio/SKILL.md`
- Step 7：`~/.openclaw/skills/remotion-video-maker/SKILL.md`
- Step 8：`~/.openclaw/skills/video-pipeline-video/SKILL.md`
- 主控：`~/.openclaw/skills/video-pipeline-master/SKILL.md`
- 质检：`~/.openclaw/skills/video-pipeline-eval/SKILL.md`

## 关键接口

- `GET /health`
- `GET /api/skills/catalog`
- `GET /api/skills/:skillId`
- `POST /api/workflow/generate`
- `POST /api/images/generate`
- `GET /api/images/:jobId`
- `POST /api/voice`
- `GET /api/voice/:jobId`
- `POST /api/render`
- `GET /api/render/:jobId`
- `GET /api/render/:jobId/download`

## 文档

- `ARCHITECTURE.md`：当前主链路、Step 分工与 API 面
- `docs/archive/README.md`：归档范围说明
- `docs/archive/10-upgrade-plan-v3.md`：保留的一份历史升级计划

## 社区协作

- `LICENSE`：MIT
- `CONTRIBUTING.md`：提交流程与范围约束
- `SECURITY.md`：安全问题处理方式
- `.github/CODEOWNERS`：代码归属占位说明
- `.github/ISSUE_TEMPLATE/`：Bug 与功能请求模板
- `.github/pull_request_template.md`：PR 提交清单
