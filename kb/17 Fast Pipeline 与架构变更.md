# Fast Pipeline 与架构变更

> 更新日期：2026-05-04
> 对应 Commit: `bfbef88` (head), `6813ef2`

Fast Pipeline 的架构概述已移到 [[03 6步主链路与QA支线#快速管线]]，本篇只记录变更内容。

## 代码审查修复

| 修复项 | 说明 |
|--------|------|
| `server.js` 缩减 425 行 | 抽取 `imageJob.js` |
| `workflowGenerator.js` 拆分 | 1685 → 4 模块（searchUtils, stepSchema, normalizers） |
| 同步 I/O 原子性 | fileQueue.js 不需要文件锁（readFileSync/writeFileSync 不 yield） |
| `SUPPORT_MARKER_RE` 修复 | 前缀匹配替代无锚点 alternation |
| `buildSceneSummary` 修复 | 移除 displayPoints 干扰 summary 选择 |
| 86 项测试全部通过 | 基线验证 |

## 新基础设施

### 内存限制器
`server/workers/memoryLimiter.js` — 跨进程 `ps -o rss=` 监控，超限进程 SIGTERM → SIGKILL 升级。环境变量 `TOTAL_MEMORY_LIMIT_MB`、`CHECK_INTERVAL_MS`、`SIGKILL_GRACE_MS`。

### HTTP 请求取消
`server/api/requestCancellation.js` — AbortController 管理活跃请求，client-disconnect 自动取消，DELETE 端点支持按 jobId 级联取消。

### 6 个动效 Hooks
定义在 `src/components/ultimate-kit/shotArchetypes.ts`，通过 `motionGrammar.ts` 重导出：

| Hook | 效果 | 已应用到 |
|------|------|---------|
| `useTextSlideIn` | 文字滑动入场 | HeroPanel, CtaPanel, MiniHero, MiniCompareBoard... |
| `useScaleEmphasis` | 大小缩放强调 | NumberStrip, MetricBars, MiniNumberStrip... |
| `usePulseAttention` | 呼吸脉动吸引 | CtaPanel, QuoteHighlight... |
| `useStaggerSlide` | 列表错位滑动 | Timeline, StepFlow, CompareBoard, MiniTimeline... |
| `useStaggerScale` | 列表错位缩放 | TagMatrix, EvidenceWall, MiniTagMatrix... |
| `useFloatMotion` | 漂浮微动 | HeroPanel, DataStream... |

全部 **24 个 family 组件**已应用相应的动效 hooks。

### 3 个新视觉原子
定义在 `src/components/visual-atoms/`：

| 组件 | 用途 | 已集成到 |
|------|------|---------|
| `ParticleBackground` | 浮动粒子背景 | HeroPanel, CtaPanel, DataStream |
| `ProgressRing` | SVG 环形进度 | 待集成 |
| `MiniChart` | 迷你柱状图 | 待集成 |

### Lazy Loading
`src/components/ultimate-kit/lazyFamilies.ts` — 26 个 family 组件的 React.lazy() wrappers，已替换 UltimateSceneTemplate.tsx 中的直连导入，减少初始包体积。

## 文档

| 文件 | 内容 |
|------|------|
| `docs/api-reference.zh-CN.md` | API 端点、环境变量、认证 |
| `docs/family-reference.zh-CN.md` | 26 个 family 用途/动画/布局 |
| `docs/architecture.zh-CN.md` | 数据流、设计决策、迁移说明 |

## 文件统计

| 类型 | 数量 |
|------|------|
| 新增文件 | 10 |
| 修改文件 | 24 |
| 删除文件 | 1 (VideoEditor.tsx) |
| 新增行 | 1,549 |
| 删除行 | 4,063 |

## 相关链接

- 项目根：[[01 项目总览]]
- 渲染链路：[[04 渲染链路]]
- 服务端与工作流：[[05 服务端与工作流]]
- 脚本入口与命令：[[07 脚本入口与常用命令]]
