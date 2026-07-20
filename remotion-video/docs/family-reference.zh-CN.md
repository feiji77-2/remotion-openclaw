# Scene Family 参考入口

> 状态：当前有效
> 定位：帮助选 family，不维护第二份全量注册表。

## 1. 先看真源

family 的真实可用状态以源码为准：

| 真源 | 负责什么 |
|---|---|
| `src/components/ultimate-kit/project.ts` | TypeScript family 类型 |
| `src/data/registry.ts` | 名称、语义标签、节奏、默认过渡、stage 配置 |
| `src/project/sceneRegistry.tsx` | family 到 React 组件的映射和 payload 校验 |
| `examples/*.json` | 可运行样例 |

如果文档和源码冲突，以源码为准。新增 family 只改文档没有意义，必须先让 `project:check` 和 still smoke 通过。

## 2. 当前 family 大类

| 大类 | 适合内容 | 使用建议 |
|---|---|---|
| Ultimate | 技术解释、流程、数据、架构、对比、代码 | 默认结构化视频家族 |
| Minimal | 极简短视频、纯信息块、低装饰表达 | 用于更轻、更快的视觉节奏 |
| Spoken | 口播稿驱动的标题、指标、流程、排序、对比、标签、代码和 takeaway | 适合从文案快速生成样片 |
| Skill Showcase | 长口播、章节化表达、技术讲解 Hero、语义 Beat | 新项目默认用 `tech-explainer` 展示操作证据；旧数据兼容 |
| Swiss | 白底、左对齐、粗网格、低装饰的极简口播方向 | 适合后续产品化模板实验；每个 swiss-* 都要单独 still 验证 |

不要在文档里手动维护 “当前一共有多少个 family”。需要查时直接看：

```bash
rg -n "family: '" src/data/registry.ts
rg -n "'swiss-|spoken-|minimal-|skill-showcase|hero'" src/components/ultimate-kit/project.ts
```

## 3. 选择策略

| 内容意图 | 优先考虑 |
|---|---|
| 开场、标题、观点钩子 | `hero`、`spoken-title`、`minimal-hero`、`swiss-title` |
| 数字、指标、排名 | `number-strip`、`metrics`、`spoken-metric`、`spoken-ranking`、`swiss-number` |
| 步骤、链路、流程 | `step-flow`、`pipeline-flow`、`spoken-process`、`swiss-flow` |
| 左右对比、前后变化 | `compare-board`、`spoken-compare`、`minimal-compare-board`、`swiss-compare` |
| 代码、命令、schema | `code`、`terminal`、`spoken-code` |
| 架构、系统、关系 | `architecture-map`、`memory-graph` |
| 标签、能力矩阵 | `tag-matrix`、`spoken-tags`、`minimal-tag-matrix`、`swiss-grid` |
| 长口播章节和局部语义事件 | `skill-showcase` |

`memory-graph` 和 `pipeline-flow` 是历史别名方向；新增视频优先使用更明确的 `architecture-map` 或 `step-flow`，除非已有样片需要兼容。

## 4. 新增 family 的硬要求

新增或改造 family，至少完成：

1. 类型：`src/components/ultimate-kit/project.ts`。
2. registry：`src/data/registry.ts`。
3. 组件：`src/components/ultimate-kit/families/**` 或 `ultimate-kit` 导出。
4. 映射：`src/project/sceneRegistry.tsx`。
5. payload 校验：严格 schema 或明确 permissive 原因。
6. 示例：`examples/*.json`。
7. 验证：`npm run project:check -- <example>` 和真实 still 输出。

没有组件映射的 family 不能进入 Project JSON。只在 `registry.ts` 里出现不代表可渲染。

## 5. 文档边界

本页只回答“应该选哪类 family”。具体字段、动画、组件 props 和视觉实现不要复制到这里，直接读源码和示例。
