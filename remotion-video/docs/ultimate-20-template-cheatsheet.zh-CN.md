# Ultimate 20 模板速查表

这份文档解决 3 件事：

- 20 个素材模板分别代表什么画面样式
- 每个模板一般在什么内容里命中
- 如果自动命中不稳，应该怎么强制命中

适用范围：

- `UltimateSceneTemplate`
- `UltimateElementsLibrary`
- `project.json -> build-project-package -> ultimate-project-adapter -> render`

真实代码依据：

- 命中与分配逻辑：[ultimate-project-adapter.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js)
- 模板类型定义：[project.ts](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/project.ts)
- 模板组件实现：[UltimateElements.tsx](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/UltimateElements.tsx)

## 先记住这 4 条

1. 第一屏固定 `hero`
2. 最后一屏固定 `cta`
3. 中间镜头不是直接随机选，而是先拿候选模板，再做全局去重分配
4. 同一屏如果同时出现多个强信号，会优先命中更强的模板

中段镜头的大致强信号顺序，按当前脚本真实顺序看是：

`terminal -> data-stream -> benchmark-chart -> timeline -> compare-board -> number-strip -> evidence-wall -> code -> architecture-map -> memory-graph -> pipeline-flow -> step-flow -> glossary-term -> feature-rail -> metrics -> tag-matrix -> quote-highlight -> focus`

白话理解：

- 你想做 `feature-rail`，但文案里如果又有强时间线、强对比、强 benchmark，它大概率会被抢走
- 你想做 `metrics`，但如果已经出现 `benchmark-chart` 或 `data-stream` 的强信号，它通常会后退
- 想 100% 稳，最稳办法永远是直接写 `family`

## 20 模板总表

| # | 模板 | 代表画面样式 | 最适合讲什么 | 自动命中信号 | 最稳命中方式 | 示例图 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `hero` | 大标题封面 / 低密度主视觉 | 开场、封面、章节起势 | 第一屏固定 | 第一屏或手写 `family: "hero"` | [01-hero-intro.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/01-hero-intro.png) |
| 02 | `feature-rail` | `2x2` 四卡拆解面板 | 场景、角色、案例、痛点、维度拆解 | `场景/开发者/团队/问题/痛点/案例` 且可拆出 3+ 卡点 | 给 3-4 个维度卡，必要时手写 `family` | [02-feature-rail.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/02-feature-rail.png) |
| 03 | `focus` | 单概念聚焦 / 一屏一重点 | 核心概念、关键词定义、单点强调 | `visualFocusZh` 很短，且有单一焦点 | 手写 `family: "focus"` 或控制 `visualFocusZh` 很短 | [03-focus-definition.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/03-focus-definition.png) |
| 04 | `step-flow` | `3+2` 步骤流 / 流程卡 | 工作流、操作步骤、生产链路 | `第一/第二/第三/先/再/最后/流程/工作流` 且有 3+ 步 | 给 3-5 步结构，必要时手写 `family` | [04-step-flow.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/04-step-flow.png) |
| 05 | `timeline` | 时间轴 / 节点推进 | 发布时间线、版本演进、事件推进 | `发布时间/前脚/后脚/release/roadmap/launch/history` 或 2+ 日期 token，且有 3+ 节点 | 给 3-4 个时间节点 | [05-timeline-release.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/05-timeline-release.png) |
| 06 | `compare-board` | 左右双栏 `VS` 对照 | 旧 vs 新、A vs B、方案比较 | `对比/vs/差异/旧讲法/当前方案`，且能组成至少 2 行对照 | 直接喂 `comparisons` 或手写 `family` | [06-compare-board.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/06-compare-board.png) |
| 07 | `number-strip` | 条带式观点卡 / 认知反转 | 误区纠正、反直觉结论、要点拆条 | `很多人以为/很多人觉得/不是…而是…/误解/偏见/认知反转` | 直接写反转句式 | [07-number-strip-demo.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/07-number-strip-demo.png) |
| 08 | `terminal` | 终端窗口 / 命令输出 / 日志 | 命令行、运行态、渲染日志、脚本执行 | `命令/终端/日志/运行` 或 `shell/bash/terminal/cli/render` | 保留终端词，或手写 `family: "terminal"` | [08-terminal-demo.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/08-terminal-demo.png) |
| 09 | `evidence-wall` | 证据墙 / 来源卡片堆 | 官方来源、GitHub、论文、实测证据 | `官方/来源/blog/docs/GitHub/paper/benchmark/实测/证据` 且能生成 2+ 来源卡 | 提供来源型 `dataPoints` | [09-evidence-wall.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/09-evidence-wall.png) |
| 10 | `tag-matrix` | `3` 个主模块 + 次级标签带 | 能力盘点、模块总结、关键词归类 | `keywords + dataPoints >= 5` | 给足够多标签和要点 | [10-tag-matrix.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/10-tag-matrix.png) |
| 11 | `code` | JSON / schema / 配置窗 | 参数、接口、JSON、配置结构 | `配置/脚本/函数/接口/参数/json/schema/api/code` | 手写 `family: "code"` 最稳 | [11-code-schema.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/11-code-schema.png) |
| 12 | `architecture-map` | 中心节点 + 模块拓扑图 | 架构、系统、Agent 分层、模块关系 | `架构/系统/模块/分层/拓扑/agent/router/memory/toolchain` 且 4+ 节点 | 给 4-6 个模块节点 | [12-architecture-map.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/12-architecture-map.png) |
| 13 | `metrics` | 大数字 / 条形指标 / 环形进度 | 时间、成本、提效、人效结果 | 文案里至少 2 个数字 token | 把镜头写得更“纯结果”，减少其他强结构信号 | [13-metrics-output.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/13-metrics-output.png) |
| 14 | `data-stream` | 实时流面板 / 信号监控 | 实时吞吐、QPS、TPS、tokens/s、监控流 | `实时/数据流/stream/feed/signal/monitor/qps/tps/throughput/tokens/s/吞吐` 且有 2+ 实时项 | 给 2-3 个实时指标数据 | [14-data-stream-live.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/14-data-stream-live.png) |
| 15 | `memory-graph` | 知识图谱 / 记忆关系网 | 上下文、检索、知识库、召回链路 | `memory/context/上下文/记忆/知识图谱/graph/embedding/召回/检索/知识库` 且 3+ 节点 | 给 3-5 个关系节点 | [15-memory-graph-core.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/15-memory-graph-core.png) |
| 16 | `pipeline-flow` | 阶段管线 / 数据流向图 | 处理链路、编译链、调度链、自动化管线 | `管线/pipeline/flow/链路/ingest/dispatch/compile/render/process/stage` 且 3+ 阶段 | 给清晰阶段序列 | [16-pipeline-flow-auto.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/16-pipeline-flow-auto.png) |
| 17 | `benchmark-chart` | 跑分图表 / 性能对打 | benchmark、跑分、模型对比、性能比较 | `benchmark/bench/exam/跑分/基准/实测/HLE/SWE-Bench` 且有 2+ 对照项 | 直接给成组数值对比 | [17-benchmark-chart-headtohead.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/17-benchmark-chart-headtohead.png) |
| 18 | `quote-highlight` | 大字金句 / 单句压轴 | 核心判断、最狠一句、结论性表达 | 文案有引号、`一句话/关键判断/核心结论/真正该讲的是/最狠的一句`，且很短 | 给一条短句，必要时手写 `family` | [18-quote-highlight-voice.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/18-quote-highlight-voice.png) |
| 19 | `glossary-term` | 术语卡 + 白话解释卡 | 术语定义、概念解释、名词拆解 | `是什么/什么意思/本质上/指的是/可以理解成/术语/定义` 且标题较短 | 直接给 `term + definition` 或手写 `family` | [19-glossary-agent-term.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/19-glossary-agent-term.png) |
| 20 | `cta` | 收尾提问 / 搜索引导 / 结束页 | 最后一屏、互动收束、下一步行动 | 最后一屏固定 | 最后一屏或手写 `family: "cta"` | [20-closing-cta.png](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/20-closing-cta.png) |

## 20 个模板逐个看图

下面这一段更适合“白话查表”。先看名字，再看图片，再看命中方式。

## 01. `hero`

样式：

- 大标题封面
- 中心聚焦
- 信息密度最低

适合讲：

- 视频开场
- 大主题抛出
- 章节切换

如何命中：

- 第一屏固定命中
- 如果中间也想用，直接写 `family: "hero"`

图片：

![hero](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/01-hero-intro.png)

## 02. `feature-rail`

样式：

- `2x2` 四卡拆解
- 一屏讲 4 个维度
- 适合做“主体 / 场景 / 动作 / 环境”这种拆法

适合讲：

- 案例拆解
- 团队能力盘点
- 产品卖点
- 痛点拆分

如何命中：

- 文案里出现 `场景/开发者/团队/问题/痛点/案例`
- 同时能拆出 3 到 4 个卡点
- 如果这屏还带强对比、强时间线、强 benchmark，可能被更高优先级模板抢走

最稳控制：

- 直接给 4 个维度卡
- 或直接写 `family: "feature-rail"`

图片：

![feature-rail](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/02-feature-rail.png)

## 03. `focus`

样式：

- 单概念聚焦
- 一屏一个重点
- 中心主词 + 简短说明

适合讲：

- 核心概念
- 单个关键词
- 一句话解释一个东西

如何命中：

- `visualFocusZh` 很短
- 整屏只有 1 个强视觉中心

最稳控制：

- 手写 `family: "focus"`
- 控制 `visualFocusZh` 在短句范围内

图片：

![focus](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/03-focus-definition.png)

## 04. `step-flow`

样式：

- `3+2` 步骤流
- 上三步，下两步
- 阅读路径更强

适合讲：

- 生产链路
- 使用流程
- 操作步骤
- 自动化流程

如何命中：

- 文案里出现 `第一/第二/第三/先/再/最后/步骤/流程/工作流`
- 能拆出至少 3 步

最稳控制：

- 给清晰的步骤列表
- 直接写 `family: "step-flow"`

图片：

![step-flow](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/04-step-flow.png)

## 05. `timeline`

样式：

- 时间轴
- 节点推进
- 适合讲“什么时候发生了什么”

适合讲：

- 版本演进
- 开源发布时间线
- 事件先后顺序

如何命中：

- 有 `发布时间/前脚/后脚/release/launch/roadmap/history`
- 或正文里有多个日期 token
- 同时要能拆出至少 3 个时间节点

最稳控制：

- 提供 3 到 4 个时间节点
- 文案里保留明显的时间推进词

图片：

![timeline](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/05-timeline-release.png)

## 06. `compare-board`

样式：

- 左右双栏对照
- 中间 `VS`
- 强调差异而不是流程

适合讲：

- 旧方案 vs 新方案
- A 模型 vs B 模型
- 传统方式 vs 新工作流

如何命中：

- 文案里有 `对比/vs/差异/versus/旧讲法/当前方案`
- 并且能拆出至少 2 行对照项

最稳控制：

- 直接喂 `comparisons`
- 或手写 `family: "compare-board"`

图片：

![compare-board](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/06-compare-board.png)

## 07. `number-strip`

样式：

- 条带式观点卡
- 强反转
- 更像“认知拨正”而不是“列卡片”

适合讲：

- 误区纠正
- 反常识
- 认知反转

如何命中：

- 文案带 `很多人以为/很多人觉得/不是…而是…/误解/偏见/认知反转`

最稳控制：

- 直接写成反转句式
- 一屏只讲一个反转主旨

图片：

![number-strip](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/07-number-strip-demo.png)

## 08. `terminal`

样式：

- 终端窗口
- 命令输入 + 输出日志
- 工程感很强

适合讲：

- 脚本执行
- 渲染输出
- 命令行工作流

如何命中：

- 文案带 `命令/终端/日志/运行`
- 或显式出现 `shell/bash/terminal/cli/render`

最稳控制：

- 保留这些终端词
- 最稳还是手写 `family: "terminal"`

图片：

![terminal](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/08-terminal-demo.png)

## 09. `evidence-wall`

样式：

- 证据墙
- 来源卡
- 多张来源证明卡片并列

适合讲：

- 官方来源
- 博客、文档、GitHub、论文
- “不是我说的，是来源这么写的”

如何命中：

- 文案含 `官方/来源/blog/docs/GitHub/paper/benchmark/实测/证据`
- 并且能构造成 2 张以上证据卡

最稳控制：

- 提供来源型 `dataPoints`
- 不要把这屏写成纯观点屏

图片：

![evidence-wall](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/09-evidence-wall.png)

## 10. `tag-matrix`

样式：

- `3` 个主模块
- 下方次级标签带
- 看起来像“归类总表”

适合讲：

- 模块拆解
- 能力矩阵
- 关键词盘点

如何命中：

- `keywords + dataPoints >= 5`
- 内容更偏归纳总结，而不是强流程或强对比

最稳控制：

- 给足够多标签
- 让文案更像“盘点”，而不是“叙事”

图片：

![tag-matrix](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/10-tag-matrix.png)

## 11. `code`

样式：

- JSON 代码窗
- schema / 配置 / 参数视图
- 适合做“结构可视化”

适合讲：

- JSON
- API 参数
- schema
- 配置对象

如何命中：

- 文案带 `配置/脚本/函数/接口/参数`
- 或出现 `json/schema/api/code`

最稳控制：

- 直接手写 `family: "code"`
- 给结构化代码内容

图片：

![code](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/11-code-schema.png)

## 12. `architecture-map`

样式：

- 中心节点 + 外围模块
- 系统拓扑图
- 像一张工作台架构图

适合讲：

- Agent 架构
- 系统分层
- 模块关系

如何命中：

- 文案带 `架构/系统/模块/分层/拓扑/agent/router/memory/toolchain`
- 并且能拆出至少 4 个模块节点

最稳控制：

- 给 4 到 6 个模块
- 节点之间尽量是明确关系，不要全是大段句子

图片：

![architecture-map](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/12-architecture-map.png)

## 13. `metrics`

样式：

- 大数字
- 条形结果
- 环形进度或结果指标

适合讲：

- 效率提升
- 时延、成本、数量
- 结果汇总

如何命中：

- 文案里至少有 2 个数字 token
- 但如果同时有强 benchmark、强实时流、强时间线，可能被更高优先级模板抢走

最稳控制：

- 让这屏内容尽量纯数字化
- 降低其他结构信号

图片：

![metrics](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/13-metrics-output.png)

## 14. `data-stream`

样式：

- 实时信号流
- QPS / TPS / tokens/s 监控面板
- 像监控工作台

适合讲：

- 实时吞吐
- 数据流
- 信号监控

如何命中：

- 文案带 `实时/数据流/stream/feed/signal/monitor/qps/tps/throughput/tokens/s/吞吐`
- 并且能生成至少 2 个实时指标

最稳控制：

- 明确写实时指标
- 让这屏更像“监控”，而不是“结论页”

图片：

![data-stream](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/14-data-stream-live.png)

## 15. `memory-graph`

样式：

- 知识图谱
- 中心概念 + 关系节点
- 更强调“记忆和连接”

适合讲：

- 上下文管理
- 记忆系统
- 检索增强
- 知识库关系

如何命中：

- 文案带 `memory/context/上下文/记忆/知识图谱/graph/embedding/召回/检索/知识库`
- 并且至少能拆出 3 个关联节点

最稳控制：

- 给中心概念 + 3 到 5 个关系节点
- 不要把它写成一般的架构说明

图片：

![memory-graph](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/15-memory-graph-core.png)

## 16. `pipeline-flow`

样式：

- 阶段管线
- 从左到右或分段推进
- 强调“从输入到输出的链路”

适合讲：

- 自动化生产链
- 编译渲染链
- 数据处理流程

如何命中：

- 文案带 `管线/pipeline/flow/链路/ingest/dispatch/compile/render/process/stage`
- 并且能拆出至少 3 个阶段

最稳控制：

- 给清晰阶段名
- 每个阶段一句话，不要太长

图片：

![pipeline-flow](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/16-pipeline-flow-auto.png)

## 17. `benchmark-chart`

样式：

- 跑分图表
- 多组数值对打
- 一眼看输赢

适合讲：

- 模型对比
- 基准分数
- 性能成绩

如何命中：

- 文案带 `benchmark/bench/exam/跑分/基准/实测/HLE/SWE-Bench`
- 并且能给出至少 2 组对照数值

最稳控制：

- 提供成组 benchmark 数据
- 明确比较对象

图片：

![benchmark-chart](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/17-benchmark-chart-headtohead.png)

## 18. `quote-highlight`

样式：

- 大字句子
- 单句压轴
- 情绪和判断最强

适合讲：

- 核心判断
- 观点收束
- 一句最狠的话

如何命中：

- 文案里有引号
- 或出现 `一句话/关键判断/核心结论/真正该讲的是/最狠的一句`
- 同时句子不能太长

最稳控制：

- 给一句短句
- 手写 `family: "quote-highlight"` 最稳

图片：

![quote-highlight](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/18-quote-highlight-voice.png)

## 19. `glossary-term`

样式：

- 左侧术语卡
- 右侧白话定义卡
- 强调“把术语讲成人话”

适合讲：

- 名词解释
- 术语定义
- 概念拆解

如何命中：

- 文案里有 `是什么/什么意思/本质上/指的是/可以理解成/术语/定义`
- 并且标题不要太长

最稳控制：

- 直接给 `term + definition`
- 或手写 `family: "glossary-term"`

图片：

![glossary-term](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/19-glossary-agent-term.png)

## 20. `cta`

样式：

- 收尾页
- 提问、引导搜索、引导下一步
- 信息量低，动作性强

适合讲：

- 片尾收束
- 引导互动
- 让用户继续搜或继续看

如何命中：

- 最后一屏固定命中
- 如果中间也想用，直接手写 `family: "cta"`

图片：

![cta](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/out/ultimate-storyboard-stills/20-closing-cta.png)

## 最后给你一个最实用的白话结论

如果你是按“标题 -> 搜索 -> 生成文案 -> 分镜 -> 视频”的链路去做内容，选模板时最容易犯的错是：

- 想讲案例，却写成了强对比，结果被命中成 `compare-board`
- 想讲结果，却写成了 benchmark，结果被命中成 `benchmark-chart`
- 想讲流程，却写得太像架构图，结果被命中成 `architecture-map`
- 想做单概念聚焦，但文本太长，结果 `focus` 命不中

最稳的经验法则：

1. 开场就用 `hero`
2. 收尾就用 `cta`
3. 中段一屏只表达一个结构意图
4. 想稳就直接手写 `family`
5. 想靠自动命中，就别把多种强信号揉在一屏里
