# 20 组件关系图

## 生产链路

```text
口播 / 字幕
  -> Skill Showcase Project JSON
  -> resolveSkillShowcaseRenderPlan
     -> CinematicShot
     -> HeroTrackV2
  -> UltimateVideoV2
```

`resolveSkillShowcaseRenderPlan()` 只产生 `cinematic` 或 `hero-track-v2`。它们共享 Project JSON、Schema、时间轴和成片 Composition，是一条链路中的两个渲染模式。

## Cinematic 11

| ID | Preset | 适用表达 |
|---:|---|---|
| 1 | `kinetic-type` | 动态排版和重音 |
| 2 | `split-wipe` | 前后或左右对比 |
| 3 | `particle-field` | 数量和聚合信号 |
| 4 | `orbital-map` | 关系和环绕结构 |
| 5 | `ui-scan` | 扫描、审计和定位 |
| 6 | `material-carousel` | 素材和候选方向 |
| 7 | `focus-lock` | 锁定关键实体 |
| 8 | `pipeline-flow` | 输入、流程和输出 |
| 9 | `token-assembly` | 设计 Token 组装 |
| 10 | `surface-morph` | 界面或场景形变 |
| 11 | `system-convergence` | 系统收束和总结 |

## Hero Track 9

| ID | Kind | 适用表达 |
|---:|---|---|
| 12 | `overview-matrix` | 能力总览矩阵 |
| 13 | `rule-compare` | 规则与反例对比 |
| 14 | `code-render` | 代码到渲染结果 |
| 15 | `slide-editor` | 可编辑幻灯片流程 |
| 16 | `article-map` | 文章、正文和配图链路 |
| 17 | `video-agent` | HTML 到 Agent 视频 |
| 18 | `design-compare` | UI 前后和 Token 对比 |
| 19 | `system-summary` | 多能力系统总结 |
| 20 | `generic-explainer` | 通用输入、规则、结果 |

组件总览由 `npm run storyboard:render` 生成到 `out/remotion-storyboard-library/contact-all-20.png`。任何组件改动都必须重新渲染并直接检查这张图。

## 与 9 场景样片的关系

- `examples/skill-showcase.json` 的 9 个 scene 是黄金样片内容结构。
- `out/skill-showcase-v3-current-midpoints/contact-sheet.png` 是这 9 个 scene 的中点证据。
- Hero Track 9 个 kind 是可复用组件目录。
- `payload.variant` 只帮助选择内容语义和默认 Hero kind，不是额外 renderer。

知识库说明见 [11 Cinematic + 9 Hero Track](<../kb/03 11 Cinematic + 9 Hero Track.md>)。
