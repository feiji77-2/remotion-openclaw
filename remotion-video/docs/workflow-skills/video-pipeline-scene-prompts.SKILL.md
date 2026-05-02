---
name: video-pipeline-scene-prompts
description: 为 Ultimate 16:9 横版场景计划生成与口播严格对齐的视觉提示词和图片任务字段。
version: "2026-05-01.1"
---

# Step 5 · 视觉提示词新规范

目标：

- 基于 Step 4 的 `shots[]` 输出可直接用于图片生成和 Ultimate 复用的视觉提示词
- 每条 prompt 都必须解释对应口播，而不是只生成一个“看起来高级”的海报
- 让 `sceneFamily`、构图、主体、数据层、留白区保持一致

项目结构锚点：

- `remotion-video/server/workflow/workflowGenerator.js`
  - Step 5 `prompts.byShotId` 对齐和补齐
- `remotion-video/server/workflow/skillRegistry.js`
  - Step 5 quality rules / eval / template catalog
- `remotion-video/scripts/generate-shot-images.mjs`
  - 图片任务落地与 QA 产物
- `remotion-video/projects/<projectId>/steps/step-05.json`
  - Step 5 落盘结果
- `remotion-video/public/assets/<projectId>/images/`
  - 主链路图片资产
- `remotion-video/projects/<projectId>/qa/storyboard/images/`
  - QA 图片落点
- `remotion-video/src/compositions/UltimateSceneTemplate.tsx`
  - 复用这些 prompt 对应的 scene family

输入真源：

- `shots[].sceneFamily`
- `shots[].sceneIntent`
- `shots[].evidenceAnchor`
- `shots[].scriptSourceText`
- `shots[].scriptExcerpt`
- `shots[].storyboardCueZh`
- `shots[].dataPoints`
- `shots[].keywords`
- `shots[].templateCandidates`
- `shots[].scriptBlockId`
- `shots[].scriptBlockLabel`
- `shots[].visual.description`
- `shots[].visual.focus`

硬规则：

- `prompts.byShotId` 数量必须和 `shots[]` 一致
- 每条 prompt 都必须保留 `sceneFamily`
- 默认输出 `16:9 / 1920x1080`
- 每条 prompt 都必须出现“服务口播原句”的语义
- 不能退回旧 `9:16 竖屏` 词表
- 每条 prompt 都必须保留 `scriptExcerpt / scriptSourceText / storyboardCueZh`
- 每条 prompt 都必须补 `promptZh / negativePromptZh / visualSummaryZh / visualFocusZh`
- 每条 prompt 都必须补 `canvasRatio / canvasWidth / canvasHeight`

每条 prompt 至少要说明：

- 主体是谁或是什么
- 画面主动作是什么
- 信息层怎么排
- 哪一块保留标题留白
- 哪些元素必须避免

family 对齐要求：

- `hero`：单主角、强聚焦、标题出血感，不要塞满信息
- `benchmark-chart`：图形对打、数值标签、胜负关系清晰
- `pipeline-flow`：箭头流、阶段推进、连线运动
- `step-flow`：步骤阅读路径，强调顺序，不做时间轴
- `architecture-map`：中心节点 + 外围模块，不做记忆网络
- `memory-graph`：关系节点 + 连线生长，不做系统拓扑板
- `terminal`：日志高亮、命令结果、操作反馈
- `code`：结构块、字段高亮、开发者视角
- `timeline`：时间推进、里程碑密度、先后顺序
- `data-stream`：实时信号、滚动数据、脉冲感

提示词写法：

- `promptZh` 负责中文创作约束
- `prompt` 负责图片任务落地语义
- `visualSummaryZh` 用一句话概括镜头
- `visualFocusZh` 只保留一个主焦点
- `imagePrompt` 应与 `prompt` 对齐，便于 `generate-shot-images.mjs` 直接消费
- `negativePromptZh` 明确排除：
  - 标题海报化
  - 竖屏构图
  - 主体缺失
  - 信息层混乱
  - 全是框的通用面板

避免：

- 只写“未来感、科技感、蓝色光效”
- 只写氛围，不写主体和构图
- `sceneFamily` 是图表，但 prompt 还在描述人物海报
- `architecture-map` 和 `memory-graph` 用同一套节点画面
- `timeline` 和 `step-flow` 只是换个名字，画面没差异
- `terminal` / `code` / `step-flow` / `timeline` / `architecture-map` / `memory-graph` 写成同构画面
