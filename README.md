# OpenClaw Remotion Video Pipeline

[English](README.en.md) | 简体中文

面向中文科技 / AI 讲解视频的开源工作流工作台与 Remotion 渲染管线。

当前主线已经统一为：

- Step 1-3：搜索、分析、标题、文案
- Step 4：`video-pipeline-scene-planner` 可变场景编排
- Step 5：`video-pipeline-scene-prompts` 16:9 横版视觉提示词
- Step 6：配音脚本与 TTS
- Step 7：Remotion 项目打包
- Step 8：Ultimate 横版成片渲染

旧的 `video-pipeline-storyboard` 固定 6 镜头链路已经从主运行链路移除。仓库里仍保留部分历史组合代码作为存量资产，但不再作为默认 Skill 真源、默认 build 出口或默认渲染入口。

## 亮点

- 双工程结构：前端工作台 + Remotion / API 运行时
- 主线默认使用 `Ultimate 1920x1080` 横版系统
- Step 4 / 5 已对齐 `20` 个模板 family，而不是固定 6 镜头
- 支持图片、配音、渲染异步任务链路
- 提供统一公开校验入口：`npm run release:check`

## 仓库结构

```text
.
├── .github/
├── ARCHITECTURE.md
├── docs/
├── remotion-video/
└── video-pipeline-view/player-app/
```

## 主模块

- `video-pipeline-view/player-app`
  Step 1-8 可视化工作台、本地状态持久化、任务轮询与结果确认
- `remotion-video/server`
  Express API、Skill Registry、图片 / 配音 / 渲染任务、Worker 集成
- `remotion-video/src`
  Remotion 组合、Ultimate 模板组件、运行时数据合同

## 当前视频主链路

- `20` 指的是 `20` 个 Ultimate 模板 family，不是固定 `20` 个镜头
- Step 4 会把文案拆成 `6-12` 个横版场景，并预分配 `sceneFamily`
- Step 5 会为每个场景生成 `16:9 / 1920x1080` 的视觉提示词
- `hero` 固定首屏，`cta` 固定尾屏
- 中段 family 会尽量避免连续重复

详细结构见：

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [remotion-video/docs/ultimate-20-template-audit.zh-CN.md](remotion-video/docs/ultimate-20-template-audit.zh-CN.md)
- [remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md](remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md)

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
- `npm run build`
  构建前端工作台
- `npm run build:video`
  使用默认 `UltimateSceneTemplate` 执行一次示例渲染
- `npm run typecheck`
  执行前端 TS、Remotion TS 与后端语法检查
- `npm run test`
  执行后端测试
- `npm run release:check`
  执行公开发布前主校验

## 工作流范围

- Step 1：`video-pipeline-analysis`
- Step 2：`video-pipeline-title`
- Step 3：`video-pipeline-content`
- Step 4：`video-pipeline-scene-planner`
- Step 5：`video-pipeline-scene-prompts`
- Step 6：`video-pipeline-audio`
- Step 7：`remotion-video-maker`
- Step 8：`video-pipeline-video`

Step 4 / 5 现在输出的是 Ultimate 场景真源：

- `shots[].sceneFamily`
- `shots[].templateCandidates`
- `scenePlan`
- `prompts.byShotId`
- `prompts.byShotId[].sceneFamily`

## API Surface

- `GET /health`
- `GET /api/skills/catalog`
- `GET /api/skills/:skillId`
- `POST /api/workflow/generate`
- `GET /api/workflow/:jobId`
- `POST /api/images/generate`
- `GET /api/images/:jobId`
- `POST /api/voice`
- `GET /api/voice/:jobId`
- `POST /api/render`
- `GET /api/render/:jobId`
- `GET /api/render/:jobId/download`

## 文档

- [ARCHITECTURE.md](ARCHITECTURE.md)
  当前主链路架构、Step 分工与 API 面
- [remotion-video/docs/ultimate-20-template-audit.zh-CN.md](remotion-video/docs/ultimate-20-template-audit.zh-CN.md)
  当前 20 模板主链路审计结论
- [remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md](remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md)
  20 模板总表与命中方式
- [remotion-video/docs/ultimate-style-hit-guide.zh-CN.md](remotion-video/docs/ultimate-style-hit-guide.zh-CN.md)
  风格命中规律、控制方式与白话说明
- [CONTRIBUTING.md](CONTRIBUTING.md)
  提交流程与校验约束
- [SECURITY.md](SECURITY.md)
  安全问题报告方式

## 发布说明

- 当前默认生产组合：`UltimateSceneTemplate`
- 默认横版参数：`1920x1080 / 30fps`
- 本地生成项目目录 `remotion-video/projects/` 默认不纳入版本控制
- 仓库根 `package.json` 保持 `private: true`

## 许可证

MIT. 详见 [LICENSE](LICENSE)。
