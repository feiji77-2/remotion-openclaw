# 11 Cinematic + 9 Hero Track

20 个主视觉组件共享同一个 `skill-showcase` scene family，并由 `resolveSkillShowcaseRenderPlan()` 二选一。它们不是两条生产链路。

## 全局制作关系图谱

```mermaid
flowchart TD
  A["Idea / 选题<br/>这条视频要讲什么"] --> B["Script / 口播文案<br/>主播真正要说的内容"]
  B --> C["Voiceover / 配音<br/>决定真实声音和总时长"]
  B --> D["Timed Captions / 时间字幕<br/>每句话何时开始和结束"]
  C --> D
  B --> E["Console Pack / 控制台生产包<br/>brief + script + assets"]

  D --> F["Shared Generator / 共享生成器<br/>buildSkillShowcaseProjectFromScript"]
  E --> F
  F --> G["Project JSON / 唯一渲染输入<br/>Scene + Caption + Audio + Assets"]

  G --> H["VideoProjectSchema / 基础合同<br/>字段、类型、路径、规格"]
  H --> I["compileProject / 编译合同<br/>时间、字幕、资产和边界"]
  I --> J["Scene Timeline / 章节时间线"]
  I --> K["Caption + Audio / 字幕和音频时间线"]

  J --> L["resolveSkillShowcaseRenderPlan<br/>唯一主视觉路由"]
  L --> M["Cinematic / 电影化节拍<br/>11 个 shotPreset"]
  L --> N["Hero Track / 章节主视觉<br/>9 个 kind + states"]
  M --> O["SkillShowcase / 场景渲染"]
  N --> O

  O --> P["UltimateVideoV2 / 成片合成<br/>Scene + Caption + Audio"]
  K --> P
  M --> S["RemotionStoryboardLibrary<br/>组件验收 Composition"]
  N --> S

  P --> Q["Still / 关键帧"]
  P --> R["9 Scene Contact Sheet<br/>黄金样片章节总览"]
  P --> U["MP4 / 最终成片"]
  S --> T["20 Component Contact Sheet<br/>11 Cinematic + 9 Hero Track"]

  Q --> V["Visual QA / 直接看画面<br/>空白、裁切、遮挡、重复"]
  R --> V
  T --> V
  U --> W["Verify / 媒体核验<br/>H.264 + AAC + 帧数 + 时长"]

  V --> X["Feedback Loop / 反馈迭代"]
  W --> X
  X --> B
  X --> L
```

完整术语和沟通说明位于仓库 `docs/video-production-relationship-map.zh-CN.md`。

## Cinematic 11

| ID | `shotPreset` | 表达用途 |
|---:|---|---|
| 1 | `kinetic-type` | 动态排版、关键词重音 |
| 2 | `split-wipe` | 前后或左右对比 |
| 3 | `particle-field` | 数量、聚合、扩散信号 |
| 4 | `orbital-map` | 关系与环绕结构 |
| 5 | `ui-scan` | 扫描、审计、定位 |
| 6 | `material-carousel` | 素材与候选方向 |
| 7 | `focus-lock` | 锁定关键实体 |
| 8 | `pipeline-flow` | 输入、流程、输出 |
| 9 | `token-assembly` | 设计 Token 组装 |
| 10 | `surface-morph` | 界面或场景形变 |
| 11 | `system-convergence` | 系统收束与总结 |

## Hero Track 9

| ID | `heroTrack.kind` | 表达用途 |
|---:|---|---|
| 12 | `overview-matrix` | 能力总览矩阵 |
| 13 | `rule-compare` | 规则与反例对比 |
| 14 | `code-render` | 代码到渲染结果 |
| 15 | `slide-editor` | 可编辑幻灯片流程 |
| 16 | `article-map` | 文章、正文、配图链路 |
| 17 | `video-agent` | HTML 到 Agent 视频 |
| 18 | `design-compare` | UI 前后与 Token 对比 |
| 19 | `system-summary` | 多能力系统总结 |
| 20 | `generic-explainer` | 通用输入、规则、结果 |

## 唯一目录与视觉证据

- 目录合同：`remotion-video/src/components/ultimate-kit/families/skill-showcase/storyboardContract.json`
- Cinematic 实现：`PortraitCinematicSkillShowcase.tsx`
- Hero Track 实现：`HeroTrackV2.tsx`
- 路由实现：`skillShowcaseRouting.ts`
- 20 组件接触表：`remotion-video/out/remotion-storyboard-library/contact-all-20.png`

`npm --prefix remotion-video run storyboard:render` 必须报告 20 个唯一 PNG。仅生成文件不算视觉通过，还要直接打开接触表确认没有黑帧、空白、主内容裁切、遮挡或重复画面。

## 20 组件总览

![11 Cinematic 与 9 Hero Track 总览](Assets/remotion-components/contact-all-20.png)

以下图片全部由 `RemotionStoryboardLibrary` 在第 72 帧真实渲染，单图规格为 `1080x1920`。

## Cinematic 渲染图

| 01 `kinetic-type` | 02 `split-wipe` |
|---|---|
| ![kinetic-type](Assets/remotion-components/01-kinetic-type.png) | ![split-wipe](Assets/remotion-components/02-split-wipe.png) |
| 03 `particle-field` | 04 `orbital-map` |
| ![particle-field](Assets/remotion-components/03-particle-field.png) | ![orbital-map](Assets/remotion-components/04-orbital-map.png) |
| 05 `ui-scan` | 06 `material-carousel` |
| ![ui-scan](Assets/remotion-components/05-ui-scan.png) | ![material-carousel](Assets/remotion-components/06-material-carousel.png) |
| 07 `focus-lock` | 08 `pipeline-flow` |
| ![focus-lock](Assets/remotion-components/07-focus-lock.png) | ![pipeline-flow](Assets/remotion-components/08-pipeline-flow.png) |
| 09 `token-assembly` | 10 `surface-morph` |
| ![token-assembly](Assets/remotion-components/09-token-assembly.png) | ![surface-morph](Assets/remotion-components/10-surface-morph.png) |
| 11 `system-convergence` |  |
| ![system-convergence](Assets/remotion-components/11-system-convergence.png) |  |

## Hero Track 渲染图

| 12 `overview-matrix` | 13 `rule-compare` |
|---|---|
| ![overview-matrix](Assets/remotion-components/12-overview-matrix.png) | ![rule-compare](Assets/remotion-components/13-rule-compare.png) |
| 14 `code-render` | 15 `slide-editor` |
| ![code-render](Assets/remotion-components/14-code-render.png) | ![slide-editor](Assets/remotion-components/15-slide-editor.png) |
| 16 `article-map` | 17 `video-agent` |
| ![article-map](Assets/remotion-components/16-article-map.png) | ![video-agent](Assets/remotion-components/17-video-agent.png) |
| 18 `design-compare` | 19 `system-summary` |
| ![design-compare](Assets/remotion-components/18-design-compare.png) | ![system-summary](Assets/remotion-components/19-system-summary.png) |
| 20 `generic-explainer` |  |
| ![generic-explainer](Assets/remotion-components/20-generic-explainer.png) |  |

返回：[知识库首页](<00 首页.md>)。
