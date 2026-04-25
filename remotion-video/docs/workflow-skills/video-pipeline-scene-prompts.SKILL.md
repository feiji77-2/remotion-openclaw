---
name: video-pipeline-scene-prompts
description: 为 Ultimate 横版场景计划生成 16:9 视觉提示词与图片任务字段。
version: 2026-04-25
---

# Step 5 · 视觉提示词

目标：

- 基于 Step 4 的场景计划生成图片和视觉摘要
- 每个场景都必须继承对应的 `sceneFamily`
- 默认输出 `16:9 / 1920x1080` 语义

必须满足：

- `prompts.byShotId` 数量与场景数量一致
- 每个 prompt 都要带 `sceneFamily`
- 每个 prompt 都要能直接服务图片生成和 Ultimate 场景复用
- 不再使用 `9:16 竖屏` 的旧 prompt 语义

输出重点：

- `prompts.byShotId[].prompt`
- `prompts.byShotId[].promptZh`
- `prompts.byShotId[].visualSummaryZh`
- `prompts.byShotId[].visualFocusZh`
- `prompts.byShotId[].negativePromptZh`
- `prompts.byShotId[].sceneFamily`
- `prompts.byShotId[].templateCandidates`

推荐风格：

- 横版科技信息视频
- 主体明确
- 标题留白
- 结构清楚
- 与 20 模板 family 对齐

避免：

- 竖屏构图
- 空泛海报词
- 只写氛围，不写主体与信息层
- family 和 prompt 内容错位
