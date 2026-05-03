# Family 视觉语法总表

## 先讲结论

当前项目不是“缺组件名字”，而是容易把 family 当成信息容器，而不是镜头语法。

正确顺序应该是：

`段落意图 -> ShotArchetype -> CameraIntent -> Family -> 字段填充`

真源仍然是：

- family 合同：`remotion-video/src/data/registry.ts`
- 导演层语法：`remotion-video/src/data/shotGrammar.ts`
- 自动命中与全局分配：`remotion-video/scripts/lib/ultimate-project-adapter.js`

下面这份表有两层信息：

- 真源事实：必填字段、默认时序、默认转场、camera motion
- 知识库建议：适合什么段落、不适合什么段落、推荐记忆物

## 查阅路线

- 先在本页选镜头语义
- 再去 [[14 图片图库]] 看真实 still
- 再去 [[Families/00 总览]] 看单个 family 的详细说明
- 如果还想控制为什么命中它，继续看 [[13 命中规则与抢占地图]]
- 如果准备直接写 Step-04，继续看 [[15 字段命中示例库]]
- 如果想反查组件实现，继续看 [[12 模块组件总表#从画面反查组件]]

## 回归状态

- 2026-05-01：导演夹具回归已覆盖全部 `20` 个 family
- [[14 图片图库]] 里的 still 已不是旧 demo 图，而是重新跑出的导演夹具快照
- 当前图库图已实际覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`

## 20 个 family 总览

| Family | 角色 | 必填字段 | Camera | 默认转场 | 推荐镜头原型 | 继续看 |
|---|---|---|---|---|---|---|
| `hero` | 开场钉题 | `title` | `push-in` | `fade 18f` | `lock-on reveal` | [[Families/hero]] / [[14 图片图库#hero]] |
| `feature-rail` | 路径式能力展开 | `items` | `pan-x` | `fade 14f` | `burst spread` | [[Families/feature-rail]] / [[14 图片图库#feature-rail]] |
| `focus` | 单点聚焦 | `keyword` `description` | `push-in` | `fade 14f` | `lock-on reveal` | [[Families/focus]] / [[14 图片图库#focus]] |
| `number-strip` | 主信号核 + 卫星轨道 | `count` | `zoom-pulse` | `fade 14f` | `pressure countdown` | [[Families/number-strip]] / [[14 图片图库#number-strip]] |
| `step-flow` | 步骤推进 | `steps` | `pan-x` | `fade 14f` | `follow focus` | [[Families/step-flow]] / [[14 图片图库#step-flow]] |
| `timeline` | 时间推进 | `items` | `pan-x` | `fade 14f` | `trace flow` | [[Families/timeline]] / [[14 图片图库#timeline]] |
| `compare-board` | 压缩对比 | `rows` | `pan-x` | `lift 12f` | `compress compare` | [[Families/compare-board]] / [[14 图片图库#compare-board]] |
| `terminal` | 命令现场 | `command` | `none` | `fade 12f` | `evidence pin` | [[Families/terminal]] / [[14 图片图库#terminal]] |
| `evidence-wall` | 中心证据核外放 | `cards` | `pan-y` | `fade 14f` | `burst spread` | [[Families/evidence-wall]] / [[14 图片图库#evidence-wall]] |
| `architecture-map` | 架构空间图 | `nodes` `centerTitle` | `drift` | `fade 14f` | `drift reveal` | [[Families/architecture-map]] / [[14 图片图库#architecture-map]] |
| `tag-matrix` | 分类矩阵 | `tabs` | `pan-x` | `fade 14f` | `drift reveal` | [[Families/tag-matrix]] / [[14 图片图库#tag-matrix]] |
| `code` | 代码证据面板 | `lines` | `none` | `fade 14f` | `lock-on reveal` | [[Families/code]] / [[14 图片图库#code]] |
| `metrics` | KPI 条与比例 | `items` | `growth` | `fade 14f` | `threshold breach` | [[Families/metrics]] / [[14 图片图库#metrics]] |
| `data-stream` | 动态数据流 | `items` | `drift` | `fade 14f` | `trace flow` | [[Families/data-stream]] / [[14 图片图库#data-stream]] |
| `memory-graph` | 概念关系网 | `centerTitle` `nodes` | `drift` | `fade 14f` | `drift reveal` | [[Families/memory-graph]] / [[14 图片图库#memory-graph]] |
| `pipeline-flow` | 流程管线 | `stages` | `pan-x` | `fade 14f` | `trace flow` | [[Families/pipeline-flow]] / [[14 图片图库#pipeline-flow]] |
| `benchmark-chart` | 曲线路径对打 | `items` | `growth` | `fade 14f` | `overtake race` | [[Families/benchmark-chart]] / [[14 图片图库#benchmark-chart]] |
| `quote-highlight` | 金句停留 | `quote` | `push-in` | `fade 14f` | `aftershock hold` | [[Families/quote-highlight]] / [[14 图片图库#quote-highlight]] |
| `glossary-term` | 术语解释卡 | `term` `definition` | `push-in` | `fade 14f` | `lock-on reveal` | [[Families/glossary-term]] / [[14 图片图库#glossary-term]] |
| `cta` | 结尾号召 | `heading` | `push-in` | `lift 16f` | `aftershock hold` | [[Families/cta]] / [[14 图片图库#cta]] |

## 你选 family 时最容易错的 5 件事

### 1. 把 `hero` 当通用封面

`hero` 只适合破题、章节起手、发布主题，不适合承载大量信息。

### 2. 把 `feature-rail`、`tag-matrix`、`timeline` 混着用

这三个都像“列表”，但叙事语义完全不同：

- `feature-rail`：沿路径依次抛出能力节点
- `tag-matrix`：给内容分组
- `timeline`：强调先后顺序

### 3. 想做对比，却用了 `metrics`

如果重点是 A/B 对撞，用 `compare-board` 或 `benchmark-chart`。
`metrics` 更适合多项 KPI 条状展示，不适合情绪对峙。

### 4. 想讲系统结构，却用了 `pipeline-flow`

- `pipeline-flow` 讲阶段顺序
- `architecture-map` 讲结构拓扑
- `memory-graph` 讲概念关系

### 5. 结尾还在堆信息，没有收束

最后一段如果还在 `data-stream` 或 `timeline`，通常说明没收。
结尾该优先考虑 `quote-highlight` 或 `cta`。

## Family 选择的导演规则

### 开场

- 首选：`hero`
- 不要：`timeline`、`tag-matrix`

### 解释概念

- 首选：`focus`、`glossary-term`
- 复杂结构用：`memory-graph`、`architecture-map`

### 多点铺陈

- 首选：`feature-rail`、`step-flow`、`tag-matrix`
- 如果是证据，不要用 `feature-rail`，改 `evidence-wall`

### 数据冲击

- 首选：`number-strip`、`metrics`、`benchmark-chart`
- 用法区别：
  - `number-strip` 先钉一个主判断，再带出补充节点
  - `benchmark-chart` 直接把胜负翻译成超车轨迹

### 对撞与反差

- 首选：`compare-board`

### 收尾

- 首选：`quote-highlight`、`cta`

## 当前项目的 upgrade 方向

- 不是继续增加 family 数量，而是让每个 family 更有镜头记忆点
- 每个 family 都应该绑定更明确的：
  - dominant object
  - camera intent
  - data event
  - transition reason

下一层细节请直接看：[[Families/00 总览]]

配图总览请看：[[14 图片图库]]
