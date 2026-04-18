# OpenClaw Remotion Video Pipeline

[English](README.en.md) | 简体中文

面向中文短视频生产的开源工作流工作台与 Remotion 渲染管线。

这个仓库把可视化 Step 1-8 工作台、Workflow API、配音/图片/渲染任务链路，以及 `Video1v4` 生产组合收在同一个公开仓库里，适合作为：

- 短视频工作流产品原型
- Remotion 驱动的视频生成项目模板
- 配音、图片、渲染异步任务编排示例
- 中文内容生产链路的二次开发基础

## 亮点

- 双工程结构：前端工作台 + Remotion / API 运行时
- 主线发布面已收口，历史脚本统一归档到 `docs/archive/`
- 支持 OpenAI 兼容模型或本地 OpenClaw CLI 工作流生成
- 支持图片、配音、渲染的异步任务链路
- 提供统一公开校验入口：`npm run release:check`

## 仓库结构

```text
.
├── .github/
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── docs/
│   ├── archive/
│   └── release-metadata.md
├── remotion-video/
└── video-pipeline-view/player-app/
```

## 主模块

- `video-pipeline-view/player-app`
  Step 1-8 可视化工作台、本地状态持久化、任务轮询与结果确认
- `remotion-video/server`
  Express API、Skill Registry、图片/配音/渲染任务、Worker 集成
- `remotion-video/src`
  Remotion 组合、镜头渲染层、视觉组件、运行时合同数据

## 环境要求

- Node.js `>=20`
- npm `>=10`
- 可选本地服务：
  - ChatTTS HTTP
  - Melo / OpenVoice
  - Deepgram
  - Redis（BullMQ 模式时需要）
- 可选工作流提供方：
  - OpenClaw CLI
  - OpenAI 兼容 API

## 快速开始

1. 安装两个子项目依赖

```bash
npm run setup
```

2. 复制环境变量文件

```bash
cp remotion-video/.env.example remotion-video/.env
```

3. 启动 API、Worker、工作台

```bash
npm run dev:api
npm run dev:worker
npm run dev:player
```

4. 打开本地服务

- Player: `http://127.0.0.1:5174`
- API Health: `http://127.0.0.1:3001/health`

## 常用命令

- `npm run setup`
  安装前端工作台和 Remotion 运行时依赖
- `npm run clean`
  清理本地构建产物和运行时目录
- `npm run dev:player`
  启动工作台前端
- `npm run dev:api`
  启动 Pipeline API
- `npm run dev:worker`
  启动渲染 Worker
- `npm run dev:video`
  打开 Remotion Studio
- `npm run typecheck`
  执行前端 TS、Remotion TS 与后端语法检查
- `npm run build`
  构建前端工作台
- `npm run build:video`
  执行一次默认生产组合渲染
- `npm run release:check`
  执行公开发布前的主校验

## 发布校验

`npm run release:check` 会执行以下检查：

```bash
npm run clean
npm run typecheck
npm run build
node remotion-video/scripts/clean-runtime.mjs --check
```

校验目标：

- 主线公开脚本都可解析
- 后端关键文件语法正常
- 前端工作台可成功构建
- 运行时目录在校验结束后保持干净

## 工作流范围

当前主线按 Step 1-8 组织：

- Step 1-3：分析、标题、文案生成
- Step 4-5：分镜结构与图片提示词
- Step 6：旁白与 TTS 准备
- Step 7：Remotion 项目/构建摘要
- Step 8：最终渲染参数、预览与导出

更完整的模块边界、API 面与职责划分见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## API Surface

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

## 环境变量

完整变量列表见 [remotion-video/.env.example](remotion-video/.env.example)。

常用变量：

- `PIPELINE_QUEUE_MODE`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_WORKFLOW_MODEL`
- `OPENCLAW_CLI_PATH`
- `CHATTTS_HTTP_HEALTH_URL`
- `CHATTTS_HTTP_SYNTH_URL`
- `MELO_HTTP_HEALTH_URL`
- `MELO_HTTP_SYNTH_URL`
- `REDIS_URL`

## 文档

- [ARCHITECTURE.md](ARCHITECTURE.md)
  当前主链路架构、Step 分工与 API 面
- [CONTRIBUTING.md](CONTRIBUTING.md)
  提交流程与校验约束
- [SECURITY.md](SECURITY.md)
  安全问题报告方式
- [docs/release-metadata.md](docs/release-metadata.md)
  GitHub / Gitee 仓库简介、标签与 Release 文案模板
- [docs/archive/README.md](docs/archive/README.md)
  归档策略说明

## 发布说明

- 当前生产主组合：`Video1v4`
- 历史辅助脚本仅保留在 `docs/archive/`
- 本地生成项目目录 `remotion-video/projects/` 默认不纳入版本控制
- 仓库根 `package.json` 保持 `private: true`，默认不作为 npm 包发布

## 许可证

MIT，详见 [LICENSE](LICENSE)。
