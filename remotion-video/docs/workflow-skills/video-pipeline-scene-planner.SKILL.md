---
name: video-pipeline-scene-planner
description: 将标题与文案编排成 Ultimate 20 模板兼容的横版场景计划。
version: 2026-04-25
---

# Step 4 · 场景编排

目标：

- 把 Step 3 的 Hook / Body / CTA 拆成可变场景数的横版场景计划
- 为每个场景预分配 `sceneFamily`
- 让后续图片生成、Ultimate 编译、Remotion 渲染使用同一份结构真源

必须满足：

- 第一屏固定 `hero`
- 最后一屏固定 `cta`
- 中段场景默认走 `Ultimate 20` 模板系统
- 不能退回固定 6 镜头 old storyboard 合同
- 场景总数优先保持在 `6-12`
- 每个场景都要带 `level`、`type`、`sceneFamily`、`templateCandidates`

输出重点：

- `shots[]`
- `shots[].sceneFamily`
- `shots[].templateCandidates`
- `scenePlan`
- `templateCatalog`

推荐风格：

- 1920x1080
- 16:9 横版
- 科技 / AI 讲解视频
- 信息分层清楚
- 模板 family 尽量多样，不要中段连续重复

避免：

- 固定 6 镜头
- 竖屏语义
- family 缺失
- 只有时长和标题，没有视觉结构字段
- 对比、证据、架构、图表类内容被全部压成同一种模板
