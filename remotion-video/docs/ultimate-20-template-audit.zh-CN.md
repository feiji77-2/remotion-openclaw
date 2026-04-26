# Ultimate 20 模板结构审计

更新日期：2026-04-25

## 一句话结论

主链路已经收口为 `Step 4 场景编排 + Step 5 视觉提示词 + Ultimate 20 模板编译`，不再以 `video-pipeline-storyboard` 固定 6 镜头作为运行真源。

## 当前硬规则

- 第一屏固定 `hero`
- 最后一屏固定 `cta`
- 中段场景默认在 `6-12` 个之间浮动
- 中段 family 需要尽量避免连续重复
- 所有视觉 prompt 默认使用 `16:9 / 1920x1080`

## 20 模板总表

| family | 定位 | 典型命中 |
| --- | --- | --- |
| `hero` | 开场封面 | 第一屏 |
| `feature-rail` | 2x2 四卡拆解 | 场景、团队、能力、案例 |
| `focus` | 单概念聚焦 | 关键词、单点定义 |
| `step-flow` | 步骤流 | 流程、工作流、分步说明 |
| `timeline` | 时间轴 | 版本、发布时间、事件推进 |
| `compare-board` | 左右对照 | A/B、前后差异、方案比较 |
| `number-strip` | 条带式反转卡 | 误区、反直觉、认知反转 |
| `terminal` | 终端日志窗 | 命令、脚本、渲染日志 |
| `evidence-wall` | 证据墙 | 官方来源、GitHub、论文、benchmark |
| `tag-matrix` | 模块 + 标签带 | 关键词归类、能力盘点 |
| `code` | JSON / schema 面板 | 配置、API、英文 JSON 结构 |
| `architecture-map` | 拓扑图 | 架构、Agent、模块关系 |
| `metrics` | 大数字与指标条 | 时间、成本、效率提升 |
| `data-stream` | 实时流面板 | 吞吐、QPS、tokens/s |
| `memory-graph` | 知识图谱 | 上下文、记忆、检索 |
| `pipeline-flow` | 阶段管线 | 编排链路、数据流、阶段推进 |
| `benchmark-chart` | 跑分图 | benchmark、实测性能对打 |
| `quote-highlight` | 大字金句 | 结论句、压轴句 |
| `glossary-term` | 术语解释卡 | 名词定义、白话解释 |
| `cta` | 结束页 | 收尾提问、互动引导 |

## 当前审计要点

- `skillRegistry` 已将 Step 4 / 5 真源替换成 `video-pipeline-scene-planner` 与 `video-pipeline-scene-prompts`
- `run-search-to-ultimate.mjs` 已把 `family / sceneFamily / templateCandidates` 继续传给 Ultimate 编译层
- 图片回退 SVG 与 Step 5 prompt 已切到横版
- 默认 `build/preview/render` 出口已经优先指向 Ultimate

## 物理清仓状态

- `video-pipeline-storyboard + Video1v4` 旧 6 镜头链路已经从活跃源码目录清除
- 旧脚本、旧合同、旧镜头分发器已删除，不再参与任何默认 npm 命令
- 历史资料只保留在 `docs/archive/`，用于回溯，不参与主链路运行

## 配套文档

- 详细命中规律见 `ultimate-20-template-cheatsheet.zh-CN.md`
- 风格命中和控制方式见 `ultimate-style-hit-guide.zh-CN.md`
