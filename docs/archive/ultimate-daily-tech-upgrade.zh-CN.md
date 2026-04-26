# Ultimate 日更科技 AI 视频升级蓝图（归档）

> 归档说明：这份文档写于主链路仍在从固定 6 镜头向可变场景数迁移的阶段，部分“当前状态”判断已经失效。保留它只是为了回看升级思路，不应再作为现行实现依据。

这份文档不是泛泛而谈“以后可以更智能”，而是专门回答一个实际问题：

`怎么把现在这套 Ultimate 风格命中系统，升级成适合每天根据全球搜索信息，自动生产 2-3 分钟技术型科技 AI 讲解视频的版本？`

适用目标：

- 日更
- 2-3 分钟
- 技术型讲解
- 全球 AI / 模型 / Agent / 开源 / Benchmark / 产品发布 / 融资 / 生态更新
- 搜索驱动，而不是人工逐条手写

---

## 1. 先说结论

当前这套系统能做：

- 45-75 秒左右的短讲解
- 6 镜头固定结构
- 基于关键词的 scene family 自动命中
- 适合单题、短节奏、结论先行的短视频

当前这套系统不适合直接拿来做：

- 2-3 分钟技术深度视频
- 每天全球信息搜索驱动的稳定批量生产
- “新闻 + 技术解释 + 数据 + 对比 +影响”的完整节目结构

不是因为 Ultimate 视觉不行，而是因为：

1. 工作流本身还是“短视频 6 镜头范式”
2. 搜索层还是轻量入口，不够像技术新闻编辑台
3. 风格命中还是“单镜头关键词抢占”，还不是“整期节目编排器”

---

## 2. 当前系统的真实瓶颈

### 2.1 分镜结构还写死在 6 镜头

现在 Step 4 会直接拼出固定 6 个分镜：

- 开场钩子
- 核心信息①
- 核心信息②
- 对比拆解
- 案例落地
- 收尾互动

代码位置：

- [server/workflow/skillRegistry.js#L794](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L794)

而且评估层也明确要求：

- `shots.length === 6`

代码位置：

- [server/workflow/skillRegistry.js#L1239](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L1239)

这说明当前系统默认是在做“1 分钟左右短视频”，不是在做“完整 2-3 分钟技术讲解节目”。

### 2.2 口播时长仍然是短视频逻辑

当前 Step 3 的默认时长配置主要是：

- 45 秒
- 55 秒
- 60 秒
- 75 秒

代码位置：

- [server/workflow/step123/pipeline.js#L74](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/step123/pipeline.js#L74)

这说明现在的内容规划器默认还是“短口播压缩信息”，不是“技术节目讲清一个全球 AI 事件”。

### 2.3 搜索层还是轻量模式

当前分析层里，搜索工具记录仍然是：

- `bing-rss`

代码位置：

- [server/workflow/skillRegistry.js#L684](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L684)

这对“日更全球科技 AI 新闻”来说不够。

因为技术型内容日更，不是只要有热度就够，而是要有：

- 官方发布源
- 技术文档
- GitHub / Hugging Face / model card
- benchmark / 论文 / 博客 / release note
- 时间戳和来源可信度

### 2.4 风格命中还是“单镜头关键词抢占”

当前 scene family 的核心判断是：

- `terminal`
- `number-strip`
- `code`
- `step-flow`
- `feature-rail`
- `metrics`
- `tag-matrix`
- `focus`

按优先级依次匹配，谁先命中谁拿走这个镜头。

代码位置：

- [scripts/lib/ultimate-project-adapter.js#L1090](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js#L1090)

这套机制适合短视频，但不适合节目级生产。

原因很简单：

- 它知道“这一镜头像不像 terminal”
- 但它不知道“这一整期节目里 terminal 应该出现几次、在第几段出现、是否已经有足够的 metrics / comparison / concept / workflow”

也就是说：

现在是“镜头自动分配”

你要升级成的是：

`整期节目编排`

---

## 3. 你的目标应该改成什么样

### 目标不是“更会猜 scene family”

而是：

`从搜索结果 -> 节目策划 -> 证据结构化 -> 段落意图 -> 风格分配 -> 视觉生成`

也就是把现在的“命中表”升级成一个：

`节目级 Story Planner`

### 适合 2-3 分钟技术型 AI 视频的标准结构

建议把一条日更技术视频拆成 `10-12` 段，而不是固定 6 段。

推荐节目结构：

1. `hero`
说明今天讲什么，为什么现在值得看

2. `timeline` 或 `metrics`
先给发布日期、版本节点或最硬的一组数字

3. `focus`
把这次事件的核心概念讲清

4. `feature-rail`
拆 3-4 个关键变化点

5. `evidence-wall` 或 `terminal`
上官方来源、benchmark、日志、命令、截图级证据

6. `compare-board` 或 `number-strip`
做结构化新旧方案对比，或者做认知反转式对比

7. `architecture-map` 或 `tag-matrix`
列系统结构、模块关系、生态位、影响范围

8. `step-flow` 或 `feature-rail`
讲真实 workflow 或使用链路

9. `metrics`
回到结果、效率、benchmark、成本、规模

10. `cta`
收口，抛判断或互动

如果是大事件，可以加到 `11-12` 段：

- 增加一个 `focus`
- 增加一个 `code`
- 增加一个 `timeline`
- 增加一个 `evidence-wall`

---

## 4. 命中表应该怎么升级

### 从“关键词命中表”升级成“意图命中表”

你现在的命中依据主要还是：

- 文案里有没有某些词
- 有没有数字
- 有没有 comparisons

升级后应该优先判断：

- 这一段在节目里扮演什么角色
- 需要什么证据形态
- 应该用哪种画面最合适

### 新的节目级段落意图建议

建议新增一层 `sceneIntent`，不要直接从文字跳 `family`。

推荐的节目意图：

1. `hook`
2. `why-now`
3. `core-concept`
4. `key-changes`
5. `hard-evidence`
6. `comparison`
7. `workflow`
8. `ecosystem`
9. `impact`
10. `takeaway`
11. `cta`

然后再从 `sceneIntent -> family` 做映射。

### 推荐的 family 映射升级版

| `sceneIntent` | 首选 family | 备选 family | 说明 |
| --- | --- | --- | --- |
| `hook` | `hero` | `focus` | 开场先抓人 |
| `why-now` | `metrics` | `number-strip` | 先给发布时间、热度、关键数字 |
| `core-concept` | `focus` | `code` | 技术概念、模型结构、名词解释 |
| `key-changes` | `feature-rail` | `tag-matrix` | 拆关键变化点 |
| `hard-evidence` | `terminal` | `code` | 命令、日志、API、配置、真实输出 |
| `comparison` | `number-strip` | `metrics` | 新旧方案、竞品、版本差异 |
| `workflow` | `step-flow` | `feature-rail` | 真实技术链路、Agent 流程 |
| `ecosystem` | `tag-matrix` | `feature-rail` | 模块、平台、生态位 |
| `impact` | `metrics` | `number-strip` | benchmark、规模、成本、效率 |
| `takeaway` | `focus` | `feature-rail` | 收结论 |
| `cta` | `cta` | `hero` | 收尾互动 |

这一步非常关键。

因为从这一刻开始：

- `terminal` 不再只是“文案里出现 render”
- 而是“这一段是硬证据展示段”

---

## 5. 视觉分配也要加“节目配额”

### 当前问题

现在谁先命中谁上。

这会导致：

- `number-strip` 太容易抢戏
- `feature-rail` 和 `focus` 经常出不来
- `metrics` 可能连续出现太多次或太少次

### 升级方案

引入 `family quotas`，也就是节目配额。

例如 `daily-tech-brief` 模式下：

```json
{
  "hero": {"min": 1, "max": 1},
  "metrics": {"min": 2, "max": 3},
  "focus": {"min": 1, "max": 2},
  "feature-rail": {"min": 1, "max": 2},
  "terminal": {"min": 0, "max": 1},
  "code": {"min": 0, "max": 2},
  "number-strip": {"min": 1, "max": 2},
  "step-flow": {"min": 0, "max": 1},
  "tag-matrix": {"min": 0, "max": 1},
  "cta": {"min": 1, "max": 1}
}
```

白话理解：

- 一期节目里必须至少有一次 `metrics`
- 也必须至少有一次 `comparison`
- 不能 4 屏都变成 `number-strip`
- `terminal` 不要泛滥，只在确实有技术证据时出现

这一步可以彻底解决你之前那种：

- 明明想做技术节目
- 结果整期画面都在“卡片 / 对比 / 一种版式”里打转

---

## 6. 搜索层也要升级，不然风格再准也没用

### 你真正要的不是“热搜短视频”

而是：

`全球 AI 技术资讯 -> 转成技术讲解节目`

所以搜索层至少应该分成 4 类来源：

1. 官方源
- OpenAI / Anthropic / Google / Meta / xAI / Moonshot / Mistral / Microsoft / AWS / NVIDIA / Hugging Face 官方博客

2. 开源与代码源
- GitHub release
- GitHub repo update
- model card
- Hugging Face model page

3. 研究与 benchmark 源
- arXiv
- 官方 benchmark 页面
- 论文或技术报告

4. 新闻与行业源
- TechCrunch
- The Verge
- VentureBeat
- 公司公告

### 搜索结果不该只是“标题 + 摘要”

而是要先结构化成 `evidence objects`：

```json
{
  "headline": "Moonshot open-sources Kimi K2.6",
  "sourceType": "official-blog",
  "sourceUrl": "...",
  "publishedAt": "2026-04-21",
  "entity": ["Kimi K2.6", "Moonshot"],
  "evidenceType": "release-note",
  "numbers": ["13 hours", "4000+ lines", "300 agents"],
  "technicalSignals": ["coding", "multi-agent", "benchmark"],
  "comparisonTargets": ["GPT-5.4"],
  "quote": "...",
  "priority": 0.94
}
```

有了这个层，后面风格分配才能真正知道：

- 哪一段该去 `metrics`
- 哪一段该去 `code`
- 哪一段该去 `terminal`

---

## 7. 推荐新增 4 种节目模板

你现在不应该只有一个“通用 Ultimate 命中表”，而应该按节目类型分模板。

### 模板 1：`daily-tech-brief`

适合：

- 每天一条 AI 技术讲解
- 2-3 分钟
- 重点是“今天发生了什么，为什么重要”

推荐 family 节奏：

- `hero -> metrics -> focus -> feature-rail -> terminal/code -> number-strip -> tag-matrix -> metrics -> cta`

### 模板 2：`model-release-breakdown`

适合：

- 新模型发布
- 新版本升级
- 大厂发布会后拆解

推荐 family 节奏：

- `hero -> metrics -> focus -> feature-rail -> code -> number-strip -> workflow -> metrics -> cta`

### 模板 3：`agent-workflow-review`

适合：

- Agent 工作流
- 自动化链路
- 开发效率工具

推荐 family 节奏：

- `hero -> focus -> feature-rail -> step-flow -> terminal -> code -> metrics -> cta`

### 模板 4：`benchmark-comparison`

适合：

- 模型 PK
- Benchmark 评测
- 成本 / 性能 / 速度对比

推荐 family 节奏：

- `hero -> metrics -> number-strip -> focus -> code -> metrics -> takeaway -> cta`

---

## 8. 具体该改哪些文件

### 8.1 第一步：把 6 镜头工作流升级成节目编排器

重点文件：

- [server/workflow/skillRegistry.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js)

现在的 `buildStep4Slots()` 是固定 6 镜头。

你应该把它升级成：

- 根据 `videoMode`
- 根据 `targetDurationSeconds`
- 根据 `storyTemplate`
- 动态生成 `8-12` 个 segments

推荐新增字段：

```json
{
  "videoMode": "daily-tech-brief",
  "storyTemplate": "model-release-breakdown",
  "targetDurationSeconds": 165
}
```

### 8.2 第二步：把 family 推断从“关键词抢占”改成“两阶段”

重点文件：

- [scripts/lib/ultimate-project-adapter.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js)

现在逻辑是：

- 文案 -> 直接猜 `family`

应该升级成：

1. 文案 / evidence -> 先猜 `sceneIntent`
2. 再根据 `sceneIntent + quotas + previous scenes + styleTemplate` 分配 `family`

建议新增函数：

- `inferSceneIntent()`
- `buildEpisodePlan()`
- `assignFamilyWithQuotas()`

### 8.3 第三步：给 outline 和 project schema 加模板层

重点文件：

- [scripts/lib/ultimate-outline-compiler.mjs](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs)
- [scripts/build-project-package.mjs](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/build-project-package.mjs)

建议新增字段：

```json
{
  "videoMode": "daily-tech-brief",
  "storyTemplate": "model-release-breakdown",
  "audience": "tech-aware-general",
  "freshnessWindowHours": 24,
  "familyQuotas": {},
  "mustInclude": ["metrics", "comparison", "hard-evidence"],
  "avoidFamilyRepeats": true
}
```

### 8.4 第四步：给搜索层加“来源分级”和“证据对象”

重点文件：

- [server/workflow/step123/context.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/step123/context.js)
- [server/workflow/step123/pipeline.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/step123/pipeline.js)

升级方向：

- 不只是记录 `searchTools`
- 而是记录 `sourceType / evidenceType / publishedAt / entity / comparisonTargets / numbers`

### 8.5 第五步：给视觉层加“节目包”

重点文件：

- [src/compositions/UltimateSceneTemplate.tsx](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/compositions/UltimateSceneTemplate.tsx)
- [src/components/ultimate-kit/UltimateElements.tsx](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/UltimateElements.tsx)

升级方向：

- 同一个 `daily-tech-brief` 模板里
- 不同节目类型有不同的视觉权重

例如：

- `model-release-breakdown` 偏 `metrics + code + focus`
- `agent-workflow-review` 偏 `step-flow + terminal + feature-rail`
- `benchmark-comparison` 偏 `metrics + number-strip + code`

---

## 9. 你真正需要的不是“更复杂的命中表”

而是 4 层一起升级

### 第 1 层：搜索层

把“搜到什么”结构化成可信证据

### 第 2 层：节目策划层

决定这一期怎么讲，而不是直接猜每个镜头像什么

### 第 3 层：风格分配层

按节目意图和配额分配 family

### 第 4 层：视觉模板层

让不同类型的节目有不同的视觉节奏

---

## 10. 如果现在就开做，建议的升级顺序

### 第 1 阶段：先把“6 镜头短视频限制”拆掉

先做：

1. `shots.length` 从固定 6 改成按目标时长动态生成
2. 支持 `targetDurationSeconds = 120-180`
3. 新增 `videoMode = daily-tech-brief`

这是最先要做的。

因为不把这个拆掉，后面再好的命中表也只能塞在“1 分钟短视频骨架”里。

### 第 2 阶段：加入节目级 `sceneIntent`

再做：

1. `sceneIntent`
2. `family quotas`
3. `storyTemplate`

这是风格命中升级的核心。

### 第 3 阶段：升级搜索和证据模型

再做：

1. 多源搜索
2. evidence objects
3. 来源可信度和时效权重

### 第 4 阶段：做日更自动化

最后再做：

1. 每天定时拉取候选题
2. 自动筛选 3-5 个最值得做的题
3. 自动生成当天节目
4. 自动渲染
5. 自动质检

---

## 11. 最后的白话结论

如果你要的是：

`每天根据全球搜索结果，自动做 2-3 分钟 AI 技术讲解视频`

那你现在要升级的，不是一个“小一点的命中表”。

你要升级的是：

`短视频规则命中器 -> 技术节目编排系统`

一句话拆开就是：

- 先把“搜到的信息”变成技术证据
- 再把证据编成一整期节目
- 再把节目段落映射成 scene family
- 最后才是渲染成 Ultimate 视频

如果只改最后一层 scene family 命中，不改前面的搜索、节目结构和配额控制，最终效果还是会跑偏。

---

## 12. 最建议你先做的两件事

### 先做 1

把固定 6 镜头升级成 `10-12 镜头 + 120-180 秒`

### 先做 2

把 `inferSceneFamily()` 升级成：

`sceneIntent -> family with quotas`

这是最有价值的两步。

只要这两步落了，你这套系统才真正开始从“短视频模板”变成“日更科技 AI 节目系统”。
