# Ultimate 元素命中总表

这份文档是给“做片的人”看的，不是给“写组件的人”看的。

目标只有 4 个：

- 一眼看懂现在到底有多少模板
- 一眼看懂中段镜头怎么分配模板
- 一眼看懂怎么强制命中某个模板
- 一眼看懂为什么元素页现在要改成工作台，而不是模板轮播墙

适用范围：

- `UltimateElementsLibrary`
- `UltimateSceneTemplate`
- `project.json -> build-project-package -> ultimate-project-adapter -> render`

核心代码入口：

- 自动命中与全局分配：[ultimate-project-adapter.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js)
- 元素页面：[UltimateElementsLibrary.tsx](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/compositions/UltimateElementsLibrary.tsx)
- 风格类型定义：[project.ts](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/project.ts)

## 一句话讲明白

现在这套系统不是“随机挑模板”，也不是“谁先匹配谁一直霸屏”。

当前真实逻辑是：

1. 第一屏固定 `hero`
2. 最后一屏固定 `cta`
3. 中间镜头先收集候选模板
4. 再做一次整条视频级别的全局分配
5. 短视频里优先让中段镜头尽量不重复

白话理解：

- 以前是“这一屏像什么就直接给什么”
- 现在是“先看看每一屏都能用哪些模板，再从整条片子的角度分”

所以现在的目标不只是“命中”，而是“命中以后还要尽量分散”。

## 当前一共有多少主模板

当前真实可用主模板一共 `20` 个：

1. `hero`
2. `focus`
3. `quote-highlight`
4. `glossary-term`
5. `cta`
6. `feature-rail`
7. `number-strip`
8. `step-flow`
9. `timeline`
10. `compare-board`
11. `terminal`
12. `evidence-wall`
13. `architecture-map`
14. `memory-graph`
15. `pipeline-flow`
16. `tag-matrix`
17. `metrics`
18. `data-stream`
19. `benchmark-chart`
20. `code`

## 新的分配逻辑

### 固定模板

- 第一屏永远 `hero`
- 最后一屏永远 `cta`

### 中段模板

中段镜头分两步：

1. 每个镜头先拿到自己的候选模板列表
2. 全局分配器再尽量让中段镜头彼此不要重复

### 全局分配器现在优先什么

按真实目标排序：

1. 中段镜头优先多样化
2. 尽量减少重复模板数量
3. 尽量避免相邻镜头重复
4. 尽量少偏离每个镜头的首选模板

## 20 个模板现在分成哪 4 个区

### 1. 锚点聚焦区

- `hero`
- `focus`
- `quote-highlight`
- `glossary-term`
- `cta`

用途：

- 开场封面
- 单概念聚焦
- 金句压轴
- 术语解释
- 收尾互动

### 2. 叙事表达区

- `feature-rail`
- `number-strip`
- `step-flow`
- `timeline`
- `compare-board`

用途：

- 案例拆解
- 认知反转
- 步骤推进
- 时间线推进
- 左右对比

### 3. 系统证据区

- `terminal`
- `evidence-wall`
- `architecture-map`
- `memory-graph`
- `pipeline-flow`

用途：

- 终端运行
- 来源证明
- 系统结构
- 记忆网络
- 数据处理链路

### 4. 数据摘要区

- `tag-matrix`
- `metrics`
- `data-stream`
- `benchmark-chart`
- `code`

用途：

- 标签盘点
- 结果指标
- 实时流信号
- 基准图表
- JSON / schema / config

## 中段自动命中的当前优先级

中段镜头当前真实命中顺序，大致是：

1. `terminal`
2. `data-stream`
3. `benchmark-chart`
4. `timeline`
5. `compare-board`
6. `number-strip`
7. `evidence-wall`
8. `code`
9. `memory-graph`
10. `architecture-map`
11. `pipeline-flow`
12. `step-flow`
13. `glossary-term`
14. `feature-rail`
15. `metrics`
16. `tag-matrix`
17. `quote-highlight`
18. `focus`

白话理解：

- 你想做 `feature-rail`，但如果前面命中了更强的结构信号，它就会被抢走
- 你想做 `metrics`，但只要同时带了 benchmark、实时流、时间线、对比这些更强信号，通常也轮不到它
- 新模板里最容易“抢镜头”的是 `data-stream`、`benchmark-chart`、`memory-graph`、`pipeline-flow`

## 命中总表

| 模板 | 最适合讲什么 | 典型触发信号 | 最稳控制方式 |
| --- | --- | --- | --- |
| `hero` | 开场、封面、大标题 | 第一屏固定 | 第一屏或手写 `family: "hero"` |
| `focus` | 单概念、一屏一个重点 | `visualFocusZh` 很短且聚焦 | 手写 `family: "focus"` 最稳 |
| `quote-highlight` | 金句、判断、压轴句 | `关键判断/一句话/真正该讲的是` | 手写 `family` 或直接给短句 |
| `glossary-term` | 术语解释、定义 | `是什么/本质上/指的是/术语` | 手写 `family` 或给 term + definition |
| `cta` | 收尾、提问、搜索框 | 最后一屏固定 | 最后一屏或手写 `family: "cta"` |
| `feature-rail` | 场景、案例、痛点卡片 | `团队/开发者/案例/痛点/场景` | 给 3-4 个卡点，避开更强触发词 |
| `number-strip` | 认知反转、要点条带 | `很多人以为/很多人觉得/不是…而是…` | 写成反转句式，或手写 `family` |
| `step-flow` | 步骤、流程、生产链路 | `第一/第二/先/再/最后` | 明确 3 步以上 |
| `timeline` | 发布线、事件推进、版本节点 | `发布/前脚/后脚/release/roadmap/history` | 给 3-4 个节点，或手写 `family` |
| `compare-board` | A/B 对照、旧 vs 新 | `comparisons`、`旧讲法 vs 当前方案` | 直接给 `left/right` |
| `terminal` | 命令、日志、运行状态 | `终端/log/render/bash/cli` | 保留终端词，或手写 `family` |
| `evidence-wall` | 证据、引用、来源板 | `benchmark/docs/GitHub/paper/官方/证据` | 给来源型 dataPoints |
| `architecture-map` | 架构、模块、Agent 拓扑 | `架构/系统/模块/agent/router/memory` | 给 4 个以上节点 |
| `memory-graph` | 上下文、知识图谱、检索链路 | `memory/context/graph/检索/知识库` | 给 3-4 个关系节点 |
| `pipeline-flow` | 数据流、处理链、编译渲染链 | `pipeline/flow/链路/process/dispatch` | 给 3-4 个阶段 |
| `tag-matrix` | 标签盘点、能力矩阵 | `keywords + dataPoints >= 5` | 提供足够多标签项 |
| `metrics` | 数字结果、时间、人效 | 至少 2 个数字 token | 让文案尽量纯指标化 |
| `data-stream` | 实时流、吞吐、信号监控 | `实时/stream/qps/tps/tokens/s/吞吐` | 给 2-3 个实时指标 |
| `benchmark-chart` | 跑分、性能对比、基准图表 | `benchmark/bench/HLE/SWE-Bench/跑分` | 给 2-3 组对照数值 |
| `code` | JSON、schema、参数、配置 | `json/schema/api/code/配置/接口` | 手写 `family: "code"` 最稳 |

## 场景配额怎么分最合理

### 6 到 8 场景视频

典型结构：

- `scene-01 -> hero`
- `scene-02 ~ scene-05/07 -> 中段 4 到 6 个尽量不重复的模板`
- `scene-last -> cta`

推荐目标：

- 中段优先覆盖 `4-6` 个不同模板
- 优先用“最能表达这条内容”的几个，而不是幻想一条视频把 `20` 个模板全用一遍

### 9 到 12 场景视频

推荐目标：

- 中段优先覆盖 `6-8` 个不同模板
- 允许少量重复，但不要连续重复
- 同一条视频里不要 3 次以上出现同一个 family

## 怎么强制命中

最稳的控制方式只有 3 种。

### 1. 直接写 `family`

最强，优先级最高。

适合：

- 你已经知道这屏必须长什么样
- 不想再赌自动命中

### 2. 用结构化数据喂模板

比如：

- `compare-board` 就给 `comparisons`
- `timeline` 就给 3-4 个节点型 dataPoints
- `architecture-map` / `memory-graph` 就给节点关系
- `pipeline-flow` 就给阶段链路
- `benchmark-chart` 就给两组数值
- `metrics` / `data-stream` 就给数字结果

### 3. 用强信号文案引导

比如：

- `很多人觉得...` 引导 `number-strip`
- `旧讲法 vs 当前方案` 引导 `compare-board`
- `前脚/后脚/发布时间` 引导 `timeline`
- `是什么/本质上/指的是` 引导 `glossary-term`
- `benchmark/HLE/SWE-Bench` 引导 `benchmark-chart`
- `实时/吞吐/qps/tokens/s` 引导 `data-stream`

## 新元素页为什么要这样设计

新的元素页不再是“一个个模板轮播目录”，而是工作台逻辑：

1. 先总览现在到底有多少模板
2. 再看按做片逻辑怎么分组
3. 再看中段镜头怎么做全局分配
4. 再看哪些模板是 2-3 分钟科技讲解里的高频主力
5. 最后回到最重要的控制方式

现在元素页最核心的变化有 4 个：

- 一屏先看清 `20` 个模板
- 颜色按模板职责固定，不再满屏随机混色
- 用 `4 x 5` 热力网格替代纯列表
- 把“命中规则”和“控制方式”前置，不再只讲组件名字

## 这次升级后的一个现实结论

模板变多不等于画面就该更满。

做 2 到 3 分钟科技讲解时，真正该追的是：

- 同一条视频模板利用率更高
- 中段镜头不重复
- 每一屏视觉焦点更清楚
- 每个模板更像“一个明确镜头”，而不是“又一张卡片”

如果你的页面看起来还是“框太多、字太密、没留白、层级不清”，问题通常不在模板数量，而在：

- 一屏同时想讲太多点
- 模板内部放了太多框
- 没有把主焦点压到 1 个，辅助焦点控制在 2 个以内
