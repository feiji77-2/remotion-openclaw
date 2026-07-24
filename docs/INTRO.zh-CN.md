# Video Factory 领域概念

本页只解释视频生产模型。实现模块见 [ARCHITECTURE.md](../ARCHITECTURE.md)，强制边界见 [CONTRACT.md](../CONTRACT.md)，禁止项见 [PRODUCTION-GUARDRAILS.zh-CN.md](PRODUCTION-GUARDRAILS.zh-CN.md)。

## 一句话

Video Factory 把口播文本和当前音频时间码编译成同一条画面时间线，让顶部操作证据、中下方语义强调和底部字幕跟随同一句口播切换。

## 数据关系

```text
源口播文本 + 当前音频时间码
  -> captions[]
  -> scene.captionRange
  -> beats[]
  -> heroTrack.states[]
     -> lens：这一拍解释什么
     -> shot：顶部 Hero 如何展示证据
  -> UltimateVideoV2
```

源口播文本是语义真源。TTS 或上传音频是时间真源。ASR/Whisper 只提取时间边界，不能用误听文本替换口播内容。

## 三层画面

| 区域 | 职责 | 数据来源 |
|---|---|---|
| 顶部主视觉 | 展示当前口播对应的操作证据和技术过程 | `heroTrack.states[].shot` |
| 中下方语义节拍 | 强调当前结论、数字、关键词或判断 | `beats[]` |
| 底部字幕 | 展示完整口播文本 | `captions[]` |

三层必须由同一个 `captionIndex` 驱动。只更新字幕或关键词，不更新 Hero 与语义节拍，不算口播驱动画面。

## 关键术语

| 名称 | 含义 |
|---|---|
| `captionIndex` | 当前字幕句索引，是画面切换的基本驱动单位 |
| `captionRange` | 一个 scene 覆盖的字幕区间 |
| `beat` | 当前句需要强调的结论或信息节拍 |
| `lens` | 语义合同，描述这一拍要解释什么、执行什么动作 |
| `shot` | 导演镜头，描述顶部 Hero 的环境、目标和证据 |
| `HeroTrackState` | 将 caption、帧范围、lens 和 shot 绑定在一起的状态 |
| `deliveryReady` | 当前项目构建与视频验证都有效时的后端交付状态 |

## 视觉目录

唯一组件目录是 `HeroTrackV2.tsx` 中注册的 29 个 production composition templates，每项有独立的空间结构、主焦点和运动机制：

`browser-demo`、`terminal-execution`、`code-diff`、`config-check`、`interface-audit`、`flow-trace`、`test-report`、`asset-library`、`system-map`、`before-after`、`metric-highlight`、`concept-explainer`、`product-showcase`、`editor-canvas`、`article-illustration`、`timeline-story`、`quote-callout`、`checklist-progress`、`radial-explainer`、`media-compare`、`overview-matrix`、`rule-compare`、`code-render`、`slide-editor`、`article-map`、`video-agent`、`design-compare`、`system-summary`、`evidence-replay`。

`HeroTrackState.shot.kind` 与这 29 个 template ID 一一对应，由同一 catalog 常量派生。`intent`、`lens`、`shot` 是绑定到 `captionIndex` 的生成与匹配数据，不是第二套组件库；`generic-explainer` 与 `concept-explainer` 重复，已被排除在 production 之外。每种镜头都必须通过 production component registry 绑定真实 Remotion renderer，缺 renderer 的 catalog 项会在测试阶段直接失败。

技术镜头是 `hero-track-v2` 内部导演语法，不是额外的 Storyboard 组件。候选组件和控制台预览组件也不自动成为生产能力。

## 新内容如何进入画面

```text
当前字幕句
  -> 识别语义动作和信号
  -> 生成 beat
  -> 生成 lens.objective / lens.actionLabel
  -> 选择 shot.kind
  -> 填充 environment / target / evidence
  -> 当前 Hero 状态接管画面
```

完整覆盖、证据要求和扩展准入见 [生产守则](PRODUCTION-GUARDRAILS.zh-CN.md)。
