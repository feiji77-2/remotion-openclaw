# Ultimate 风格命中手册

> 2026-04-25 更新：
> 当前中段镜头已经不是“纯前序贪心抢占”了，而是“候选池 + 全局分配 + 中段尽量去重”。
> 如果你要看最新版本的元素命中总表、页面分组、控制方式和设计说明，请优先看：
> [`docs/ultimate-elements-atlas.zh-CN.md`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/docs/ultimate-elements-atlas.zh-CN.md)

这份文档不是讲“理想上应该怎么设计”，而是讲你现在这套 `Ultimate` 系统在代码里到底怎么分配风格、怎么被抢风格、怎么强制控制，以及怎么用白话写法让它稳定命中。

适用范围：

- `UltimateSceneTemplate`
- `ultimate-config.json`
- `step-04 / config -> render`
- `project.json -> build-project-package -> ultimate-project-adapter -> render`

核心代码入口：

- 自动命中规则：[scripts/lib/ultimate-project-adapter.js](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js)
- Outline 风格别名映射（旧兼容层，非主链）：[scripts/lib/ultimate-outline-compiler.mjs](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs)
- 风格枚举定义：[src/components/ultimate-kit/project.ts](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/project.ts)
- 场景数据类型：[src/components/ultimate-kit/types.ts](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/types.ts)

## 一句话先讲明白

这套系统不是“平均随机分风格”。

它现在的真实逻辑是：

1. 第一个镜头固定 `hero`
2. 最后一个镜头固定 `cta`
3. 中间镜头按一套有优先级的规则抢命中
4. 谁先匹配上，谁就把这个镜头拿走

所以你之前看到“某些动态风格没出来”，很多时候不是风格不存在，而是被前面的规则抢走了。

## 现在一共有哪些主风格

当前真实可用的主风格一共 `14` 个：

1. `hero`
2. `feature-rail`
3. `focus`
4. `number-strip`
5. `step-flow`
6. `timeline`
7. `compare-board`
8. `terminal`
9. `evidence-wall`
10. `architecture-map`
11. `tag-matrix`
12. `code`
13. `metrics`
14. `cta`

定义位置：

- [project.ts#L15](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/project.ts#L15)

## 自动命中的真实顺序

中间镜头不是平权判断，而是按下面这个顺序依次判断：

1. `terminal`
2. `evidence-wall`
3. `compare-board`
4. `timeline`
5. `number-strip`
6. `code`
7. `architecture-map`
8. `step-flow`
9. `feature-rail`
10. `metrics`
11. `tag-matrix`
12. `focus`
13. 如果前面都没命中，再走兜底轮播

代码位置：

- [ultimate-project-adapter.js#L1090](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js#L1090)

白话解释：

- 你文案里一旦带了“终端、命令、render、bash”这种词，基本就先被 `terminal` 抢走了。
- 你文案里如果带“官方来源 / benchmark / GitHub / docs / paper”，现在会优先被 `evidence-wall` 抢走。
- 你文案里如果真有结构化 `comparisons`，现在会先进 `compare-board`，不再一股脑全塞进 `number-strip`。
- 你文案里如果像发布时间线、版本节点、里程碑推进，现在会优先命中 `timeline`。
- 你文案里写了 `json / schema / api / code`，就很容易进 `code`。
- `feature-rail` 和 `focus` 都偏后排，所以很容易“想要它，结果被前面风格拿走”。

## 固定规则

### 1. 第一个镜头永远是 `hero`

不看内容，直接固定。

代码位置：

- [ultimate-project-adapter.js#L1094](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js#L1094)

### 2. 最后一个镜头永远是 `cta`

不看内容，直接固定。

代码位置：

- [ultimate-project-adapter.js#L1098](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js#L1098)

### 3. 中间镜头才会走自动风格判断

所以你如果有 6 个镜头：

- `shot-01` 固定 `hero`
- `shot-06` 固定 `cta`
- 只有 `shot-02` 到 `shot-05` 参与自动竞争

## 风格命中表

下面这张表是“真实规则表”，不是审美建议表。

| 风格 | 自动命中条件 | 最适合的内容 | 最容易被谁抢走 | 最稳的控制方法 |
| --- | --- | --- | --- | --- |
| `hero` | 第一个镜头固定命中 | 封面、大标题、章节起始 | 不会被抢 | 直接放在第一屏，或手动指定 `family: "hero"` |
| `cta` | 最后一个镜头固定命中 | 结尾提问、搜索框、下集预告、召回 | 不会被抢 | 直接放在最后一屏，或手动指定 `family: "cta"` |
| `terminal` | 含 `命令/终端/日志/运行`，或含 `shell/bash/terminal/cli/render` | 命令行、日志流、运行状态、伪终端 | 它本身优先级很高，反而会抢别人 | 手动指定 `family: "terminal"`，或保留终端信号词 |
| `evidence-wall` | 含 `官方/来源/benchmark/bench/paper/docs/github/实测/证据` 且能拆出 2 张以上证据卡 | 官方来源、基准、引用、证明链 | 会抢走 `number-strip`、`feature-rail` | 手动指定 `family: "evidence-wall"`，并提供来源型 dataPoints |
| `compare-board` | 有结构化 `comparisons`，或明确是双栏 A/B 对照 | 左右双栏对比、模型对模型、旧方案 vs 新方案 | 会抢走原本属于 `number-strip` 的对比场景 | 手动指定 `family: "compare-board"`，并给出 `left/right` |
| `timeline` | 含 `发布时间线/roadmap/里程碑/版本/升级/更新/开源/release/history` 且能拆出 3 个以上节点 | 发布时间、版本推进、里程碑、事件演化 | 会抢走 `metrics` 或 `step-flow` 的时间类内容 | 手动指定 `family: "timeline"`，并给出 3-4 个节点 |
| `number-strip` | 文案含 `不是…而是…/认知反转/旧认知/新事实` | 认知反转、要点拆分、非结构化对比 | 常抢走 `feature-rail`、`metrics` | 手动指定 `family: "number-strip"`，或明确写成反转句式 |
| `code` | 含 `配置/脚本/函数/接口/参数`，或含 `schema/json/api/code` | JSON、配置、代码快照、接口说明 | 会被 `terminal`、`timeline`、`number-strip` 抢先 | 手动指定 `family: "code"`，或保留 `json/schema/api` 词 |
| `architecture-map` | 含 `架构/系统/模块/分层/拓扑/agent/router/memory/tool/stack` 且能拆出 4 个以上节点 | 系统结构、模块关系、Agent 拓扑、生产链路拓扑图 | 会和 `step-flow`、`tag-matrix` 竞争 | 手动指定 `family: "architecture-map"`，并提供模块节点 |
| `step-flow` | 含 `步骤/流程/工作流/依次/第一/第二/第三/先/再/最后/pipeline/process` 且能拆成至少 3 步 | 管线、操作流程、方法论、生产链路 | 会被 `terminal`、`code`、`architecture-map` 抢走 | 手动指定 `family: "step-flow"`，并提供 3 步以上内容 |
| `feature-rail` | 含 `场景/开发者/团队/问题/痛点/案例/想象一下` 且能拆出至少 3 张卡 | 四维拆解、人物/场景/动作/要素卡、问题维度盘点 | 很容易被 `number-strip`、`code`、`step-flow` 抢走 | 手动指定 `family: "feature-rail"`，并避免前序信号词 |
| `metrics` | 能抽到至少 2 个数字 token | 数据、收益、时长、数量、结果条 | 很容易被前面所有高优先级风格抢走 | 手动指定 `family: "metrics"`，或让文案几乎只有指标结果 |
| `tag-matrix` | `keywords + dataPoints >= 5` | 标签盘点、能力矩阵、模块列表 | 容易被 `metrics` 或更前面的风格抢走 | 手动指定 `family: "tag-matrix"`，并提供足够多标签项 |
| `focus` | `visualFocusZh` 长度在 `1-24` 之间 | 单概念解释、一屏一个重点、大关键词定义页 | 几乎所有前面的风格都能把它挤掉 | 手动指定 `family: "focus"` 是最稳的 |

## 每种风格的白话命中规律

### `hero`

白话规则：

- 你不用想怎么命中。
- 只要它是第一屏，它就是 `hero`。

适合塞什么：

- 视频标题
- 大结论
- 开场一句话

不适合干什么：

- 不适合塞太多细节
- 不适合做对比
- 不适合堆数据

### `terminal`

白话规则：

- 只要你写得像在“跑命令”或“看日志”，它就很容易命中。
- 关键词非常敏感，`render` 这种英文词都会触发。

会触发的典型写法：

- `在终端里运行`
- `执行 render 命令`
- `日志显示`
- `shell`
- `cli`
- `bash`

适合讲什么：

- 命令行流程
- 渲染过程
- Worker 日志
- 系统运行状态

最常见误伤：

- 你本来想做 `code`，但文案里写了 `render`，结果被判成 `terminal`

### `number-strip`

白话规则：

- 只要文案里有明显的“旧认知 vs 新事实”，它就特别容易命中。
- `不是……而是……` 是非常强的触发器。

会触发的典型写法：

- `很多人以为 A，其实是 B`
- `不是参数强，而是解决问题强`
- `A 对比 B`
- `vs`

适合讲什么：

- 认知反转
- 旧方案 vs 新方案
- 观点拆分
- 结论分层

最常见误伤：

- 你本来想做 `feature-rail` 拆四个点，但文案有一句“不是 A 而是 B”，就先被抢走了

### `code`

白话规则：

- 你文案里只要明显有 `json / schema / api / 参数 / 配置` 这些词，它就会觉得你想展示代码窗。

会触发的典型写法：

- `JSON 驱动`
- `配置参数`
- `API 接口`
- `schema`
- `code`

适合讲什么：

- 结构化事实
- 代码片段
- 配置快照
- JSON 证据面板

最常见误伤：

- 你本来只是说“代码能力强”，但同时又写了 `code/schema/json`，它会真给你上代码窗

### `step-flow`

白话规则：

- 你得写出“这是一个流程”，而且最好能拆出 3 步以上。
- 只写一句“这是工作流”还不够，最好有“先、再、最后”这类顺序词。

会触发的典型写法：

- `第一步`
- `第二步`
- `先做 A，再做 B`
- `pipeline`
- `process`

适合讲什么：

- 生产链路
- 操作步骤
- 内容生产流程
- 自动化管线

最常见误伤：

- 你写“工作流”，但同时又写了 `json` 和 `api`，最后被 `code` 抢走

### `feature-rail`

白话规则：

- 它适合“横向拆概念、拆维度、拆主体”。
- 但因为它排位比较靠后，所以最容易出现“本来想要，结果没命中”。

会触发的典型写法：

- `开发者有哪几个痛点`
- `这个场景里有四个关键元素`
- `案例里最重要的三个维度`
- `想象一下你是一个……`

适合讲什么：

- 四维要素拆解
- S/F/A/C 结构
- 角色、动作、场景、语境拆分
- 痛点分类

最常见误伤：

- 文案里带了“对比”后被 `number-strip` 抢走
- 文案里带了“json / code”后被 `code` 抢走
- 文案里像步骤说明后被 `step-flow` 抢走

### `metrics`

白话规则：

- 只要数字够多，它就能命中。
- 但它优先级低，所以数字多不代表一定轮到它。

会触发的典型数字：

- `13小时`
- `4000+行`
- `300个 Agent`
- `4月21日`

适合讲什么：

- 跑分
- 时长
- 数量
- 效率收益
- 结果条

最常见误伤：

- 你写的是“指标”，但同时文案有强对比词，就进 `number-strip`
- 你写的是“指标”，但又在讲开发者案例，就进 `feature-rail`

### `tag-matrix`

白话规则：

- 它更像“很多标签一起摆出来”。
- 如果 `keywords + dataPoints` 不够多，它通常不会出现。

适合讲什么：

- 能力清单
- 功能模块
- 选项矩阵
- 分类标签云

最常见误伤：

- 前面只要已经匹配到别的风格，它基本就没机会

### `focus`

白话规则：

- 它是一个“最后才轮到”的风格。
- 适合一屏只讲一个关键词或一个问题。

适合讲什么：

- 一个术语
- 一个定义
- 一个核心概念
- 一个单点问题

最常见误伤：

- 基本所有更强规则都能先把它挤掉

结论：

- 如果你真想用 `focus`，最稳的方法不是优化文案，而是手动指定

## 子变体怎么控制

### `focus` 有 3 个图示变体

可用值：

- `framing`
- `rings`
- `scale`

类型位置：

- [types.ts#L39](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/types.ts#L39)

运行时默认值：

- [UltimateElements.tsx#L1101](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/UltimateElements.tsx#L1101)

自动命中现状：

- 现在自动分配里只会自动给出 `framing` 或 `rings`
- `scale` 目前更适合你手动指定

Outline 里可以手动写：

```json
{
  "kind": "focus",
  "title": "核心概念",
  "diagram": "scale"
}
```

对应编译器位置：

- [ultimate-outline-compiler.mjs#L333](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs#L333)

### `metrics` 有 2 个布局变体

可用值：

- `bars`
- `cards`

类型位置：

- [types.ts#L120](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/types.ts#L120)

运行时默认值：

- [UltimateElements.tsx#L1962](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/components/ultimate-kit/UltimateElements.tsx#L1962)

现在的实际情况：

- `bars` 已经恢复
- `cards` 也还在
- 原工作流当前默认写的是 `bars`

限制说明：

- 现在 `outline compiler` 还没有把 `metrics.layout` 暴露出来
- 也就是说：
  - 直接写 `ultimate-config.json` 可以控制
  - 原工作流 adapter 产物可以控制
  - 但写 `outline.json` 目前还不能稳定指定 `bars/cards`

## 三种最常用的控制方式

### 方式 1：最稳，直接写 `ultimate-config.json`

这是控制力最强的方式。

你可以直接把每个 scene 的 `family` 写死。

示例：

```json
{
  "id": "shot-03",
  "family": "feature-rail",
  "data": {
    "heading": "四个关键元素",
    "items": [
      {"title": "主体", "icon": "S", "accent": "green"},
      {"title": "景别", "icon": "F", "accent": "cyan"},
      {"title": "动作", "icon": "A", "accent": "yellow"},
      {"title": "场景", "icon": "C", "accent": "red"}
    ]
  }
}
```

适合谁：

- 你已经知道这一屏要长什么样
- 你不想再让自动系统猜
- 你想锁死最终成片视觉

### 方式 2：写 `outline.json`，用 `kind/family` 强制指定

这是第二稳的方式。

你不用写完整 scene data，但可以直接告诉编译器“我要什么风格”。

别名映射位置：

- [ultimate-outline-compiler.mjs#L5](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs#L5)

常用写法：

```json
{
  "sections": [
    {"kind": "cover", "title": "开场"},
    {"kind": "cards", "title": "四个关键元素", "items": ["主体", "景别", "动作", "场景"]},
    {"kind": "command", "title": "运行日志", "command": "pnpm render", "outputs": ["> loading", "> done"]},
    {"kind": "metrics", "title": "结果收益", "items": [{"label": "效率", "value": "3x", "ratio": 0.9}]},
    {"kind": "close", "title": "你最看重哪个"}
  ]
}
```

这时：

- `cover -> hero`
- `cards -> feature-rail`
- `command -> terminal`
- `metrics -> metrics`
- `close -> cta`

### 方式 3：完全走原工作流，让系统自动猜

这也是最容易跑偏的方式。

链路是：

`title / narration / visualSummaryZh / visualFocusZh / type / level / keywords / dataPoints`

一起送进自动判断器，再决定 scene family。

判断器位置：

- [ultimate-project-adapter.js#L1090](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js#L1090)

适合谁：

- 你在批量生成
- 你先要速度，不要求每屏强控

不适合谁：

- 你已经明确知道某一屏必须是 `terminal`
- 你要求某一屏一定是 `feature-rail`
- 你要求 `metrics` 一定用横向 bars

## 怎么避免“想要 A，结果命中 B”

### 想要 `feature-rail`

尽量避免这些词：

- `对比`
- `vs`
- `不是……而是……`
- `json`
- `schema`
- `api`
- `流程`
- `第一步`

尽量多写这些信号：

- `场景`
- `案例`
- `问题`
- `痛点`
- `维度`
- `开发者`
- `团队`

最稳办法：

- 手动指定 `family: "feature-rail"`

### 想要 `terminal`

尽量保留这些词：

- `终端`
- `日志`
- `运行`
- `shell`
- `cli`
- `render`

不要同时大篇幅写：

- `json`
- `schema`
- `不是……而是……`

否则可能被 `code` 或 `number-strip` 抢走。

### 想要 `code`

尽量保留这些词：

- `json`
- `schema`
- `api`
- `配置`
- `参数`
- `接口`

尽量别把整段写成“命令执行过程”，不然容易进 `terminal`。

### 想要 `metrics`

尽量让这屏：

- 以数字、结果、指标为主
- 少写对比判断句
- 少写角色案例
- 少写流程词

最稳办法：

- 直接指定 `family: "metrics"`
- 如果要横向条，直接在 config 里写 `"layout": "bars"`

### 想要 `focus`

最重要的结论：

- 不要指望纯自动命中
- 直接手动指定最省心

## 可复制的控制模板

### 模板 1：强制命中 `feature-rail`

```json
{
  "id": "shot-feature",
  "family": "feature-rail",
  "subtitle": "四个关键维度",
  "data": {
    "heading": "这件事要看四个点",
    "items": [
      {"title": "主体", "caption": "是谁在做", "icon": "S", "accent": "green"},
      {"title": "景别", "caption": "看到什么范围", "icon": "F", "accent": "cyan"},
      {"title": "动作", "caption": "正在发生什么", "icon": "A", "accent": "yellow"},
      {"title": "场景", "caption": "发生在什么语境", "icon": "C", "accent": "red"}
    ]
  }
}
```

### 模板 2：强制命中 `terminal`

```json
{
  "id": "shot-terminal",
  "family": "terminal",
  "data": {
    "heading": "运行日志",
    "windowTitle": "render-runtime",
    "command": "pnpm render:scene-kit --profile ultimate",
    "outputs": [
      "> loading config",
      "> binding assets",
      "> rendering frames",
      "> export ready"
    ],
    "note": "用来讲命令、日志、运行过程",
    "accent": "green"
  }
}
```

### 模板 3：强制命中 `metrics` 横向 bars

```json
{
  "id": "shot-metrics",
  "family": "metrics",
  "data": {
    "heading": "结果收益",
    "summary": "这一屏只讲结果",
    "layout": "bars",
    "items": [
      {"label": "连续编码", "value": "13小时", "ratio": 0.82, "accent": "yellow"},
      {"label": "改码规模", "value": "4000+行", "ratio": 0.7, "accent": "orange"},
      {"label": "并行调度", "value": "300个", "ratio": 0.58, "accent": "yellow"}
    ]
  }
}
```

### 模板 4：在 outline 里直接指定风格

```json
{
  "sections": [
    {
      "kind": "cover",
      "title": "国产 AI 开源王炸"
    },
    {
      "kind": "cards",
      "title": "这次最值得看四个点",
      "items": [
        {"title": "发布", "icon": "P"},
        {"title": "模型", "icon": "M"},
        {"title": "能力", "icon": "A"},
        {"title": "影响", "icon": "I"}
      ]
    },
    {
      "kind": "command",
      "title": "运行时日志",
      "command": "pnpm render:ultimate",
      "outputs": [
        "> loading project",
        "> mapping scenes",
        "> export ready"
      ]
    },
    {
      "kind": "close",
      "title": "你最看重哪个"
    }
  ]
}
```

## 真实限制，别误判

### 限制 1：`metrics.layout` 还没有完全接进 outline compiler

这意味着：

- 你用最终 `ultimate-config.json` 可以稳定控制
- 你走原工作流 adapter 产物可以稳定控制
- 你只写 outline 时，当前不适合指望它自动切 `bars/cards`

对应位置：

- [ultimate-outline-compiler.mjs#L427](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs#L427)

### 限制 2：`focus.scale` 不是自动主流分支

这意味着：

- `scale` 可以用
- 但更适合你手动指定

### 限制 3：完全自动命中永远不是 100% 可控

因为它本质上还是一套“基于文案信号词和数据结构的规则分配器”。

结论：

- 要稳定，就手动指定 `family`
- 要省事，就接受自动命中偶尔跑偏

## 最后的实战建议

如果你在做正式生产，不要把所有镜头都交给自动命中。

最推荐的做法是：

1. 开头和结尾继续走固定 `hero + cta`
2. 中间最关键的两三屏手动指定 `family`
3. 只有过渡内容才交给自动判断

这样你既保留效率，也不会老是出现“明明想做卡片轨道，结果跳成别的风格”的问题。

如果你只记住一句话，就记这个：

`自动命中适合批量生成，手动指定适合稳定出片。`
