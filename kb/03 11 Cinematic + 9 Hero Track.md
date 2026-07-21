# 11 Cinematic + 9 Hero Track

20 个主视觉组件共享同一个 `skill-showcase` scene family，并由 `resolveSkillShowcaseRenderPlan()` 二选一。它们不是两条生产链路。

## 使用指南图谱

```mermaid
flowchart TB
  A[口播语义事件] --> B{作用范围}
  B -->|章节主体持续表达| H{Hero Track 内容结构}
  B -->|Beat 局部强调或转场| C{Cinematic 强调意图}

  C -->|文字重音| C01[01 kinetic-type]
  C -->|前后或左右对比| C02[02 split-wipe]
  C -->|数量聚合或扩散| C03[03 particle-field]
  C -->|关系与环绕结构| C04[04 orbital-map]
  C -->|扫描审计或定位| C05[05 ui-scan]
  C -->|素材与候选方向| C06[06 material-carousel]
  C -->|锁定关键实体| C07[07 focus-lock]
  C -->|输入流程与输出| C08[08 pipeline-flow]
  C -->|Token 或模块组装| C09[09 token-assembly]
  C -->|界面或场景形变| C10[10 surface-morph]
  C -->|系统收束与结论| C11[11 system-convergence]

  H -->|多能力总览| H12[12 overview-matrix]
  H -->|规则与反例| H13[13 rule-compare]
  H -->|代码到渲染结果| H14[14 code-render]
  H -->|可编辑幻灯片| H15[15 slide-editor]
  H -->|文章正文与配图| H16[16 article-map]
  H -->|HTML 到 Agent 视频| H17[17 video-agent]
  H -->|UI 前后与 Token| H18[18 design-compare]
  H -->|多能力系统总结| H19[19 system-summary]
  H -->|通用输入规则结果| H20[20 generic-explainer]
```

- Cinematic：设置 `payload.heroStyle = "cinematic"`，并在 `beats[].shotPreset` 选择 01-11。
- Hero Track：设置 `payload.heroStyle = "hero-track-v2"`，并在 `heroTrack.kind` 选择 12-20。
- `payload.heroTrack` 存在时路由优先进入 Hero Track；不要同时把两套模式当作并行主画面。

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
