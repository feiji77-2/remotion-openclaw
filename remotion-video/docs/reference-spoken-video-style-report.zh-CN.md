# 参考口播视频视觉结构深度拆解

生成时间：2026-05-13

## 分析方法修正

上一版问题是关键帧太少，导致只能看到“暗色背景 + 字卡 + 素材层”的表象。这次改为密集抽帧和运动检测：

- ref1：176.016 秒，抽取 352 帧，采样密度 2fps，即每 0.5 秒 1 帧。
- ref2：160.516 秒，抽取 321 帧，采样密度 2fps，即每 0.5 秒 1 帧。
- 对每相邻 0.5 秒帧做 diff，生成运动峰值时间线和运动区域框。
- 每 3 秒生成布局检测框，辅助判断主视觉模块占位。
- 每 1 秒和每 5 秒生成 contact sheet，人工复核卡片类型和停留节奏。

证据图：

- `docs/reference-spoken-analysis-assets/ref1-contact-5s.png`
- `docs/reference-spoken-analysis-assets/ref2-contact-5s.png`
- `docs/reference-spoken-analysis-assets/ref1-contact-1s-01.png` 到 `ref1-contact-1s-04.png`
- `docs/reference-spoken-analysis-assets/ref2-contact-1s-01.png` 到 `ref2-contact-1s-04.png`
- `docs/reference-spoken-analysis-assets/ref1-layout-boxes-3s.png`
- `docs/reference-spoken-analysis-assets/ref2-layout-boxes-3s.png`
- `docs/reference-spoken-analysis-assets/ref1-motion-peak-boxes.png`
- `docs/reference-spoken-analysis-assets/ref2-motion-peak-boxes.png`
- `docs/reference-spoken-analysis-assets/ref1-motion-timeline.png`
- `docs/reference-spoken-analysis-assets/ref2-motion-timeline.png`
- `docs/reference-spoken-analysis-assets/ref1-summary.json`
- `docs/reference-spoken-analysis-assets/ref2-summary.json`

## 核心结论

参考视频不是“每 3–5 秒切一个 spoken family”，也不是“文字卡 + 装饰素材层”。

它的真实结构是：

```text
固定暗色技术舞台
  + 常驻平台/账号 chrome
  + 口播 beat 驱动的中心 evidence module
  + 模块内部轻运动
  + 底部口播字幕
```

真正的驱动单位不是 scene，而是 visual module：

```text
audio cue
  -> semantic beat
  -> module type
  -> card/evidence payload
  -> fixed stage 内部局部更新
```

因此如果 Remotion 继续用 `spoken-title/spoken-metric/spoken-tags` 这种 family 轮播，画面必然像 PPT 字卡；它不会接近参考视频。

## 全局画面分层

| 层级 | 作用 | 画面特征 | 是否常驻 |
|---|---|---|---|
| 背景层 | 技术氛围 | 极暗蓝黑、弱代码纹理、轻网格、中心暗青光晕 | 是 |
| 平台 chrome | 来源/账号识别 | 左上角抖音 UI/账号，右下角水印 | 是 |
| 主视觉模块 | 每个口播 beat 的证据对象 | 数字、榜单、代码、模型卡、流程、测试卡 | 否，随 beat 替换 |
| 运动强调层 | 引导注意力 | bar 增长、边框亮起、节点点亮、数字递增 | 否，模块内部 |
| 字幕层 | 口播辅助 | 底部白字，少量关键词高亮 | 是 |

关键点：字幕不是主视觉，主视觉必须是一个可识别的 evidence module。

## 卡片与模块 taxonomy

### 1. Hero Number / Hero Date

结构：

- 中央超大数字或日期。
- 下方 1 行短标签。
- 有时叠加小型工具标签或证据截图。

参考位置：

- ref1：0–4s `2023.02.11`、`¥19,112.14`、`¥23,967.24`。
- ref1：59–64s `¥23,967 / 年`。
- ref2：2–6s、137–145s `+10% / -80%`。

运动方式：

- 数字淡入 + 轻 scale。
- 数值从弱亮到强亮，不做大幅飞入。
- 旁边小标签晚 0.2–0.4 秒出现。

### 2. Evidence Screenshot / Receipt Stack

结构：

- 中央或偏左的大型截图堆叠。
- 背后有 2–4 张半透明截图作为深度层。
- 前景数字或结论压在截图上。

参考位置：

- ref1：3–4s 账单/票据堆叠。
- ref1：6–9s 代码/网页截图 + 项目标题。

运动方式：

- 背景截图组轻微缩放或透明度渐显。
- 前景数字/标题不大幅移动。

### 3. Code / Terminal Panel

结构：

- 真实或仿真的编辑器/终端窗口。
- 深色窗口，顶部有 tab 或标题栏。
- 代码行密度高，但只作为证据，不要求用户逐行阅读。

参考位置：

- ref1：6–9s `6 层架构 AI Agent APP` 下方代码窗口。
- ref2：100–103s `代码质量与实现评估` 代码面板。

运动方式：

- 面板 fade in。
- 代码区域可做轻微高亮条移动。
- 不使用复杂转场，窗口本身稳定。

### 4. Benchmark Board

结构：

- 顶部标题。
- 中央横向 bar chart 或排行榜。
- 左侧模型/工具名称，右侧分数。
- 颜色通常为黄、橙、青、绿。

参考位置：

- ref2：30–41s `SWE-BENCH VERIFIED` 排行榜。
- ref2：55–62s 综合竞争条形图。
- ref2：118–125s 测试结果条形图。

运动方式：

- 横条从左向右增长。
- 数字/百分比在条尾出现。
- 排名项可以逐行 fade in，但整个 board 不离开中心舞台。

### 5. Model / Provider Tags

结构：

- 一排或多排 pill 标签。
- 标签包含 OpenAI、Gemini、Anthropic、Claude、Cursor、Grok 等实体。
- 有时上方是大品牌名，下方是 2x2 功能标签。

参考位置：

- ref2：9–14s provider 标签横排。
- ref2：145–151s Anthropic + OpenAI/Gemini/Cursor 标签。
- ref1：116–121s 模型/工具标签矩阵。

运动方式：

- 标签按顺序逐个亮起。
- 当前提到的模型加高亮边框或颜色。
- 标签位置稳定，不做乱飞动效。

### 6. Process / Flow Diagram

结构：

- 一条或多条路径线。
- 节点文字很少，颜色区分正向/负向/风险。
- 线条承担关系解释。

参考位置：

- ref1：16–22s 三条曲线解释 bug/复杂度/流程。
- ref2：24–28s 失败率曲线。
- ref2：72–79s LangGraph 中心六边形 + 左右节点。

运动方式：

- 路径线从起点被“画出来”。
- 节点随后点亮。
- 不是全屏转场，而是同一画布局部绘制。

### 7. Evaluation / Test Cards

结构：

- 3 张横向卡片，通常包含图标、短标题、状态点。
- 卡片有弱边框，当前项有绿色/橙色高亮。
- 属于“评估条件”“Smoke Test”“任务需求测试”类信息。

参考位置：

- ref2：80–87s `评估条件`。
- ref2：88–93s `SMOKE TEST`。
- ref2：94–99s `任务需求测试`。
- ref2：105–111s 评分/警告卡。

运动方式：

- 卡片从弱透明到可见。
- 当前卡片边框 pulse 或 glow。
- 卡片内部状态点逐个亮。

### 8. Compare Metrics Cards

结构：

- 左右两个大卡片。
- 红/橙代表成本或失败，绿/青代表收益或成功。
- 巨大金额/百分比是焦点。

参考位置：

- ref2：126–135s `$200` vs `$100`，`↓83.33%`。

运动方式：

- 左右卡片同步淡入。
- 数字递增或递减。
- 结果数字在最后单独强调。

### 9. Role / Concept Constellation

结构：

- 中心关键词。
- 周围分散小标签。
- 没有实体卡片边框，像知识点星图。

参考位置：

- ref1：24–30s `1 个人` 周围角色标签。
- ref1：127–132s 圆环 + 周边关键词。

运动方式：

- 中心词先出现。
- 周边词从弱到强依次出现。
- 圆环可以轻微旋转或描边。

### 10. Minimal Thesis Text

结构：

- 中央一句结论。
- 上下可能有一条小说明或小标签。
- 用绿色/红色表达判断。

参考位置：

- ref1：32–34s `认知超载`。
- ref1：56–58s `永远也不是科学`。
- ref1：89–93s `不再畏惧任何中大型项目`。
- ref1：141–148s `怎么办？/死局/用科学的方法`。

运动方式：

- 极简 fade in。
- 关键词颜色变化。
- 这类模块不能过多，否则会退化成字幕卡。

## 两个参考视频的差异

| 项 | ref1 | ref2 |
|---|---|---|
| 主风格 | 叙事/观点型 | benchmark/评测型 |
| 主模块 | 日期、数字、概念、关系图、结论句 | 榜单、条形图、测试卡、代码面板、模型标签 |
| 运动密度 | 更低，更多静态文本和关系线 | 更高，bar/chart/card 状态变化多 |
| 证据感来源 | 账单截图、代码截图、时间线、概念图 | benchmark 榜单、测试结果、评分公式、成本卡 |
| 对当前项目启发 | 不能只做文字，要有论点证据 | 必须有 data-driven chart/card module |

## 运动规律

从 motion peak 图和 1 秒 contact sheet 复核，参考视频的运动不是“场景切换”，而是模块内部的微运动：

| 运动类型 | 用途 | 持续时长 | 对应模块 |
|---|---|---:|---|
| Fade/scale in | 模块入场 | 8–18 帧 | hero number、headline、card group |
| Sequential reveal | 建立层级 | 0.2–0.5 秒间隔 | tag rail、test cards、provider cards |
| Bar growth | 表达排行/数据 | 20–45 帧 | benchmark board、result chart |
| Border glow/pulse | 指示当前项 | 持续或一次 pulse | evaluation/test cards |
| Line draw | 表达因果/流程 | 30–60 帧 | flow diagram、failure curve |
| Number count | 强调数据结论 | 20–50 帧 | cost/metric/hero cards |
| Subtle shimmer | 背景氛围 | 常驻低幅 | dark stage texture |

不应该使用：

- 大幅镜头飞入飞出。
- 每个 beat 全屏换背景。
- 复杂毛玻璃/大阴影/高饱和渐变堆叠。
- 多个模块同时抢主焦点。

## 画面结构比例

从 3 秒布局框可以看到，主视觉大多占据中心区域：

- ref1 多数是中心 sparse module，占画面宽度约 60%–75%，高度约 40%–55%。
- ref2 多数是 large-stage module，占画面宽度约 75%–85%，高度约 60%–75%。
- 字幕区独立位于底部，不应侵入主模块。
- 水印/账号 chrome 常驻但不参与叙事。

这意味着 Remotion renderer 应该有固定舞台坐标，而不是每个 family 自己决定布局。

## 对当前实现的直接判定

当前“spoken scene family + decorative asset layer”的方向仍然不对标，原因如下：

1. family 轮播会产生“每个 beat 一个 PPT 页面”的观感。
2. decorative asset layer 没有证据语义，只是装饰。
3. spoken scene 的 `title/subtitle/items` 不能表达 benchmark、测试、代码、成本、流程这些 evidence module。
4. 真正需要的是 module payload，而不是更多 card CSS。
5. 背景应该尽量保留，但主视觉必须从“字卡”升级为“证据模块”。

## 正确工程合同

下一步数据合同应从：

```text
timelinePlan.beats[] -> spoken scenes[] -> spoken family component
```

改为：

```text
timelinePlan.beats[]
  -> visualModules[]
  -> ProjectSceneRegistry
  -> module renderer
```

建议字段：

```json
{
  "beatId": "beat-012",
  "startFrame": 360,
  "endFrame": 480,
  "module": "benchmark-board",
  "headline": "SWE-Bench Verified",
  "subtitle": "AI 编码能力的真实评测",
  "evidence": {
    "kind": "bar-chart",
    "items": [
      {"label": "Claude", "value": 76.7, "tone": "yellow"},
      {"label": "Cursor", "value": 69.4, "tone": "cyan"}
    ]
  },
  "motion": {
    "enter": "fade-scale",
    "emphasis": "bar-growth",
    "sequence": "top-to-bottom"
  }
}
```

## Remotion 渲染器应实现的模块

优先级按参考视频出现频率和质感贡献排序：

1. `benchmark-board`：排行榜/条形图，必须支持动态 bar growth。
2. `evaluation-cards`：三卡状态评估，支持逐卡点亮。
3. `code-terminal`：代码/终端证据面板，支持行高亮。
4. `hero-metric`：大数字/百分比/日期，支持 count/fade。
5. `model-tag-rail`：模型/工具标签，支持逐个高亮。
6. `process-flow`：曲线/节点/六边形流程图，支持 line draw。
7. `compare-cost`：左右对比卡，支持数字递减和结果强调。
8. `evidence-stack`：截图/票据/文档堆叠，支持轻 scale/fade。
9. `thesis-text`：极简结论句，只用于过渡和总结，不能成为主模块。

## 验收标准

新实现不能再以“能渲染、TypeScript 过”为视觉验收。必须满足：

1. 随机抽 24 帧，至少 70% 有明确 visual module，不是单纯字幕或标题字卡。
2. 每个 visual module 与口播语义匹配：数字用 hero/compare，评测用 benchmark/test，工具名用 tag rail，代码内容用 terminal panel。
3. 同一时刻只有一个主视觉焦点。
4. 背景与字幕稳定，变化集中在中心 module。
5. 1 秒 contact sheet 能看出模块内部运动，而不是硬切 family。
6. 与参考一样保留暗色技术舞台，不要换成亮色 PPT 风。
