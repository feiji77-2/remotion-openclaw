# Remotion OpenClaw 文档总入口

> 日期：2026-07-20
> 目标：把 `docs/`、`kb/`、`remotion-video/docs/` 收敛成一张可执行地图。

## 1. 先读结论

当前项目只有一个开发真源：

```text
/Users/macos/OpenClaw/remotion-generated-video-project
```

当前 Remotion 内核位于：

```text
remotion-video/
```

当前主链路：

```text
Project JSON -> VideoProjectSchema -> compileProject() -> UltimateVideoV2 -> Still / MP4 -> QA
```

任何文档、代码审查、修复和产品化开发，都必须先确认自己面对的是这条链路。

## 2. 必读顺序

| 顺序 | 文档 | 解决的问题 |
|---|---|---|
| 1 | `docs/repository-consolidation.zh-CN.md` | A/B 副本怎么裁决，哪个仓库是唯一真源 |
| 2 | `docs/product-architecture.zh-CN.md` | 当前内核和未来产品层如何分层 |
| 3 | `remotion-video/docs/development-code-constraints.zh-CN.md` | 全阶段开发红线，不能做什么 |
| 4 | `docs/p1-local-content-studio-execution.zh-CN.md` | P1-1 本地内容生产台第一步怎么做 |
| 5 | `remotion-video/docs/project-development.zh-CN.md` | Project JSON 到 Remotion 渲染怎么开发 |
| 6 | `docs/documentation-hygiene-audit.zh-CN.md` | 哪些文档已删除、已瘦身、继续保留 |
| 7 | `docs/video-production-relationship-map.zh-CN.md` | 小白如何理解文案、Beat、Lens、Shot、构图、动效 |
| 8 | `remotion-video/docs/technical-evidence-workbench-v2.zh-CN.md` | Swiss V5 技术镜头合同、22 个 Lens、后续 Shot 产品化方向 |
| 9 | `docs/documentation-status-2026-07-20.zh-CN.md` | 当前各文档状态、入口和注意事项 |
| 10 | `kb/00 首页.md` | 操作笔记、样片、命令和产物入口 |

## 3. 文档分层

### 产品与架构层

| 文档 | 状态 | 说明 |
|---|---|---|
| `docs/product-architecture.zh-CN.md` | 当前有效 | Remotion 产品化总架构 |
| `docs/repository-consolidation.zh-CN.md` | 当前有效 | 仓库副本和文档整合策略 |
| `docs/p1-local-content-studio-execution.zh-CN.md` | 当前有效 | P1-1 本地 MVP 执行步骤 |
| `docs/documentation-hygiene-audit.zh-CN.md` | 当前有效 | 文档清理记录和后续规则 |
| `docs/video-production-relationship-map.zh-CN.md` | 当前有效 | 视频制作流程关系图谱，小白沟通版 |
| `docs/documentation-status-2026-07-20.zh-CN.md` | 当前有效 | 当前文档状态快照 |
| `ARCHITECTURE.md` | 当前有效 | 最小内核架构边界 |
| `README.md` | 当前有效 | 快速开始 |

### Remotion 内核开发层

| 文档 | 状态 | 说明 |
|---|---|---|
| `remotion-video/docs/development-code-constraints.zh-CN.md` | 当前有效 | B 真源、P0-P3、确定性渲染、资产和 QA 红线 |
| `remotion-video/docs/project-development.zh-CN.md` | 当前有效 | 内核开发入口 |
| `remotion-video/docs/family-reference.zh-CN.md` | 当前有效 | family 选择和新增规则 |
| `remotion-video/docs/ultimate-elements-atlas.zh-CN.md` | 当前有效 | Ultimate 元素地图 |
| `remotion-video/docs/video-factory-console-design.zh-CN.md` | 当前有效 | 本地内容生产台设计约束 |
| `remotion-video/docs/technical-evidence-workbench-v2.zh-CN.md` | 当前有效 | 技术证据工作台、Lens 合同和 Shot 产品化方向 |

### 生产方法层

| 文档 | 状态 | 说明 |
|---|---|---|
| `remotion-video/docs/personal-ip-video-pipeline.zh-CN.md` | 当前有效 | Topic Brief 到 Project JSON 的上游生产协议 |
| `remotion-video/docs/skill-showcase-video.zh-CN.md` | 当前有效 | skill-showcase 语义 Beat 视频方法 |
| `remotion-video/docs/reference-spoken-video-style-report.zh-CN.md` | 参考有效 | 口播风格分析，不参与架构裁决 |
| `remotion-video/docs/swiss-skill-spoken-v3.zh-CN.md` | 样片有效 | Swiss Skill Spoken V3 样片记录 |
| `remotion-video/docs/swiss-skill-spoken-v4-portrait.zh-CN.md` | 样片有效 | Swiss Skill Spoken V4 竖屏重构记录 |
| `remotion-video/examples/production/production-log.example.md` | 当前有效 | 生产日志模板 |

### 操作知识库层

`kb/` 只做操作速查，不做架构裁决。当前保留：

```text
kb/00 首页.md
kb/01 当前项目总览.md
kb/02 Project JSON 合同.md
kb/03 V2 渲染架构.md
kb/04 口播语义节拍视频方法.md
kb/05 skill-showcase 场景族.md
kb/06 QA 与调试.md
kb/07 开发代码约束.md
kb/08 成品产物与打开地址.md
kb/09 代码文件地图.md
kb/10 命令与脚本入口.md
kb/11 资产与图标注册.md
kb/12 变更 Playbook.md
kb/14 换稿视觉合同防污染.md
kb/15 Swiss V5 技术镜头开发记忆.md
```

## 4.1 Swiss V5 与技术镜头阅读入口

如果目标是继续打磨 Swiss Skill Spoken V5，按这个顺序读：

| 顺序 | 文档 | 用途 |
|---|---|---|
| 1 | `docs/video-production-relationship-map.zh-CN.md` | 先统一“Beat / Lens / Shot / Layout / Motion”这些沟通词 |
| 2 | `kb/15 Swiss V5 技术镜头开发记忆.md` | 先看本轮踩坑，避免再次做成测试感框框视频 |
| 3 | `remotion-video/docs/technical-evidence-workbench-v2.zh-CN.md` | 再看当前 Lens 合同和 22 个技术镜头 |
| 4 | `kb/08 成品产物与打开地址.md` | 最后打开 V5 成片和 22 Beat 接触表 |

## 4. 冲突裁决

如果文档互相矛盾，按这个顺序：

```text
源码真源
  > docs/README.zh-CN.md
  > docs/product-architecture.zh-CN.md
  > remotion-video/docs/*
  > kb/*
  > 历史文档
```

源码真源包括：

| 主题 | 文件 |
|---|---|
| schema | `remotion-video/src/project/projectSchema.ts` |
| compile | `remotion-video/src/project/compileProject.ts` |
| family registry | `remotion-video/src/project/sceneRegistry.tsx`、`remotion-video/src/data/registry.ts` |
| composition | `remotion-video/src/Root.tsx`、`remotion-video/src/compositions/v2/*` |
| console | `remotion-video/src/tools/console/*`、`remotion-video/scripts/tools-studio-server.mjs` |
| scripts | `remotion-video/scripts/project-*.mjs` |

## 5. 开发前检查

每次开工先确认：

```bash
pwd
git status --short
cd remotion-video
npm run project:check -- examples/project.json
```

期望工作目录：

```text
/Users/macos/OpenClaw/remotion-generated-video-project
```

如果路径落在 `/Users/macos/remotion/remotion-video`，说明回到了旧副本，必须停下。

## 6. 一句话

文档以后不再靠记忆找入口。先看这里，再进架构、约束、内核、P1 执行文档或 kb 操作笔记。
