---
name: video-pipeline-scene-planner
description: 将 Step 3 结构化口播拆成 Ultimate 20 family 兼容的 16:9 横版场景计划。
version: "2026-05-01.1"
---

# Step 4 · 场景编排新规范

目标：

- 把 `copy.hook / copy.body / copy.cta` 变成可直接进入 Ultimate 渲染的场景计划
- 每个场景都必须绑定到具体口播原句，不允许只围绕标题做空泛镜头
- 把 scene family、节奏、证据、图形表达提前定下来，减少 Step 5 跑偏

项目结构锚点：

- `remotion-video/server/workflow/skillRegistry.js`
  - Step 4 family 命中、director 合同、visual props 归一化
- `remotion-video/server/workflow/workflowGenerator.js`
  - Step 4 payload 对齐和落盘
- `remotion-video/src/data/registry.ts`
  - 20 family 注册表、默认 timing、camera motion 偏好
- `remotion-video/src/data/storyboardLoader.ts`
  - Step 4 `shots[]` -> 可渲染 scene grammar
- `remotion-video/src/compositions/UltimateSceneTemplate.tsx`
  - 最终渲染载体
- `remotion-video/projects/<projectId>/steps/step-04.json`
  - Step 4 落盘结果
- `remotion-video/scripts/snapshots.mts`
  - 20-family 导演夹具 still 回归

输入真源：

- `copy.hook`
- `copy.body[]`
- `copy.body[].sceneIntent`
- `copy.body[].evidenceAnchor`
- `copy.body[].keywords`
- `copy.body[].dataPoints`
- `copy.body[].mechanismDepth.visualHint`
- `copy.cta`
- `analysis.keyDataPoints`
- `analysis.researchFacts`

硬规则：

- 第一屏固定 `hero`
- 最后一屏固定 `cta`
- 中段场景必须使用 `Ultimate 20 family`
- 不允许退回固定 6 镜头 old storyboard
- 场景总数优先保持在 `6-12`
- 每个 shot 都必须保留 `scriptBlockId / scriptBlockLabel / scriptSourceText / scriptExcerpt`
- 每个 shot 都必须有 `sceneFamily` 和 `templateCandidates`
- 每个 shot 都必须有 `storyboardCueZh`，作为后续视觉抓手
- 每个 shot 都必须能补出 `director` 合同，不允许只有 family 没有镜头语义

分镜原则：

- 一段正文如果同时包含机制解释、数据揭晓、对比结论，允许拆成多个 shot
- 中段 shot 不是平均切段，而是按叙事动作拆：
  - 建立问题
  - 解释机制
  - 给出证据
  - 做对比
  - 收束判断
- 每个中段 shot 都要能回答一句话：
  - 这句口播，画面到底在“拍”什么

family 选择规则：

- `hero`：开场判断、单一核心物体、标题冲击
- `benchmark-chart`：基准、胜负、跑分、数字对打
- `pipeline-flow`：链路、阶段、上下游流动
- `step-flow`：步骤、顺序、操作说明
- `architecture-map`：系统、模块、拓扑、工具链
- `memory-graph`：记忆、关系、召回、上下文网络
- `terminal`：命令、日志、CLI、运行结果
- `code`：配置、结构、字段、接口、JSON
- `timeline`：时间推进、版本演进、里程碑
- `data-stream`：实时数据、信号流、吞吐、监控
- `compare-board`：明确左右对照
- `metrics`：大数字、核心指标
- `quote-highlight`：一句结论压屏
- `glossary-term`：术语解释
- `feature-rail`：能力展示，不要默认做成卡片墙
- `evidence-wall`：来源、截图、证据陈列
- `tag-matrix`：标签矩阵、要点聚合
- `number-strip`：反转观点、连续条带强调
- `focus`：单概念聚焦

去重与节奏：

- 避免连续 3 个 shot 使用同一类 family
- `architecture-map` 不要和 `memory-graph` 做成同构画面
- `timeline` 不要和 `step-flow` 做成同一条横线布局
- `terminal` 和 `code` 不要只换字体或背景色
- 如果正文有数据段，至少给一次图形型 family，不要全做文字面板

字段要求：

- `level`：开场 Hook / 中段场景 / 收尾互动
- `type`：开场 / 信息传递 / 对比 / 流程 / 证据 / 案例 / 结尾CTA
- `sceneIntent`：这一镜头让观众理解什么
- `evidenceAnchor`：这镜头落到哪条事实或证据
- `storyboardCueZh`：一句能指导构图和动作的中文分镜抓手
- `templateCandidates`：主命中 family + 备选 family，通常 3-6 个
- `visual.description`：一句 16:9 横版结构描述
- `visual.focus`：这一镜头一眼先看哪里
- `director.cameraMotion`：导演层镜头运动语义，供后续渲染和 QA 复用
- `director.archetype`：导演层镜头原型
- `director.dataEvent`：数据/关系/对比在这镜头里发生什么
- `director.staggerGap`：该镜头内部元素的默认错峰节奏
- `director.revealDirection`：标题/关键词的默认揭示方向
- `director.memoryObject`：这镜头要记住的对象或主语义核
- `visual.props`：family 运行时字段，不要只给一个空 description

当前工程落点：

- Step 4 输出除了 `shots[]`，还要补：
  - `scenePlan`
  - `templateCatalog`
  - `visualSystem`
- `scenePlan.system` 当前应对齐 `ultimate-20-template`
- `visualSystem` 当前应对齐 `ultimate-1080p`

避免：

- 只把标题改写成多个场景名
- 每个 shot 都是“一个框 + 几行字”
- family 有名字，但分镜语义还是同一个画面
- 明明是数据、流程、架构，却全部压成 `feature-rail`
- 只讲信息，不设计镜头主次
