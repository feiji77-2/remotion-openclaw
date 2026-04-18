# Release Metadata

这份文档用于 GitHub / Gitee 仓库设置页、首个 Release、以及对外介绍文案的快速复制。

## 仓库简介

中文简介：

> 面向中文短视频生产的开源工作流工作台与 Remotion 渲染管线，包含 Step 1-8 可视化编排、配音/图片/渲染任务链路，以及 `Video1v4` 生产组合。

English description:

> Open-source workflow studio and Remotion render pipeline for Chinese short-form video production, including a Step 1-8 visual workflow, async voice/image/render jobs, and the `Video1v4` production composition.

## 推荐 Topics

建议从下面挑 8-10 个：

- `remotion`
- `video-pipeline`
- `video-workflow`
- `short-video`
- `content-automation`
- `tts`
- `react`
- `typescript`
- `express`
- `workflow-ui`
- `video-generation`
- `openclaw`

## GitHub About 示例

标题下方简介：

> Open-source workflow studio and Remotion render pipeline for Chinese short-form video production.

Website：

- 如果后续有演示站，再填入
- 没有就先留空

## Gitee 项目简介示例

> 开源短视频工作流工作台与 Remotion 渲染管线，支持 Step 1-8 可视化编排、配音/图片/渲染任务链路，以及 `Video1v4` 生产组合。

## 首个 Release 标题建议

- `v1.0.0 - Public Release of Video1v4 Pipeline`
- `v1.0.0 - OpenClaw Remotion Video Pipeline Public Release`

## 首个 Release 描述模板

```md
## Overview

First public release of the OpenClaw Remotion Video Pipeline.

## Included

- Step 1-8 workflow player app
- Workflow API and render worker
- Voice / image / render job flow
- `Video1v4` production composition
- Public-release cleanup and archived legacy scripts

## Validation

- frontend TypeScript check
- Remotion TypeScript check
- backend syntax check
- player production build
- runtime directory cleanliness check

## Notes

- Legacy helper scripts are preserved under `docs/archive/`
- Local generated project packages are ignored by default
```

## 推荐首屏展示素材

如果后续补展示图，建议统一放到 `docs/assets/`：

- `docs/assets/cover.png`
  仓库首页封面图
- `docs/assets/player-overview.png`
  Step 1-8 工作台截图
- `docs/assets/video1v4-preview.gif`
  `Video1v4` 动态预览

## 建议仓库置顶信息

- License：MIT
- Default branch：`main`
- README：中英双语互链
- Actions / CI：保留 `release:check`
- Releases：从 `v1.0.0` 开始对外维护
