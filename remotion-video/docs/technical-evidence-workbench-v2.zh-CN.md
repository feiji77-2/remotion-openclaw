# Technical Evidence Workbench V2

V2 将 Skill Showcase 的主视觉从“按外观选择 Hero 模板”升级为场景级技术证据工作台。

## 小白版解释

以前的问题是：主视觉容易变成“黑底 + 框框 + 文字 + 数字”，看起来像测试稿。

V2 的目标是让每一句口播都先回答三个问题：

```text
这一句想证明什么？
适合哪类镜头语义？
真实画面应该像什么技术讲解场景？
```

也就是：

```text
Beat / 语音节拍
  -> Lens / 镜头语义合同
  -> Shot / 真实镜头
  -> Layout / 构图
  -> Motion / 动效
  -> Evidence / 证据
```

相关小白沟通指南见：`docs/video-production-relationship-map.zh-CN.md`。

## 三层职责

- Workbench：展示上下文、操作、系统反应和可观察证据。
- Semantic Beat：在字幕上方击打当前口播结论。
- Caption：承载完整旁白，不参与工作台内容复述。

## 数据合同

`heroStyle: "technical-workbench-v2"` 时，每个场景必须提供 `workbench`。工作台包含持续环境和多个 `steps`；每个 Beat 必须通过 `captionIndex` 绑定且只绑定一个 Step。

每个 Step 至少包含：

- `objective`：本拍要证明的事情。
- `actionLabel`：实际执行的动作。
- `lens`：本拍使用哪种镜头语义。旧 JSON 可兼容缺省，但 V2 新项目必须显式提供。
- `command`、`before/after` 或 `logs` 中至少一种可观察操作数据。
- `evidence`：结论证据，并标记 `script`、`derived` 或 `demo` 来源。

## Lens 与 Shot

### Lens / 镜头语义合同

`Lens` 只回答“这一拍应该用哪一类视觉表达”。

例如：

| 文案 | 语义判断 | Lens |
|---|---|---|
| `22000 star，是 AI 辅助设计必要的第一个。` | 开源可信度、数字背书 | `repo-signal` |
| `Impeccable 把这些 AI 审美问题归纳成 37 条规则。` | 规则数量、体系化 | `rule-counter` |
| `让 AI 从源头规避这些默认设计。` | 输入经过 Skill 闸门，坏模板被拦截 | `skill-gate` |

### Shot / 真实镜头

`Shot` 回答“这个镜头具体长什么样、怎么动、怎么排版”。

当前实现仍是一批复用组件承载多个 Lens。下一步产品化方向是拆成 22 个独立 Shot 文件：

```text
SourceDiffShot
TerminalRunShot
ManifestResolveShot
DesignInspectorShot
RuleCounterShot
CategoryIndexShot
LiveScanShot
SnapshotCompareShot
RepoSignalShot
DirectionPickerShot
StyleLockShot
AnchorMapShot
DenyListShot
SkillGateShot
KnowledgeVaultShot
CatalogMetricsShot
TokenAssemblyShot
ScenarioSwitchShot
BlankAuditShot
BrandPackShot
BrandStyleMapShot
SystemGraphShot
```

独立 Shot 的意义：

- 每个镜头有自己的构图，不再都像同一种框框。
- 每个镜头有自己的动效语法，不再只淡入淡出。
- 每个镜头有自己的数据要求，生成器知道该填什么。
- 接触表上可以一眼看出 22 个节拍是否重复。

## 22 个 Lens 语义

| # | Lens | 中文名 | 适合文案 | 画面表达 |
|---:|---|---|---|---|
| 1 | `source-diff` | 源码差异 | 改前改后、默认和优化 | 代码 Diff |
| 2 | `terminal-run` | 终端运行 | 执行、验证、跑命令 | 终端 + 日志 |
| 3 | `manifest-resolve` | 配置解析 | 装 Skill、加载规则、读取配置 | 文件节点连到中心合同 |
| 4 | `design-inspector` | 设计检查器 | 检查界面问题 | 真实界面 + Inspector 标注 |
| 5 | `rule-counter` | 规则计数 | 37 条规则、数量证明 | 大数字 + 环形刻度 |
| 6 | `category-index` | 类别索引 | 八类规则、分类体系 | 节点星图 |
| 7 | `live-scan` | 实时扫描 | 实时检测、自动标注 | 扫描光束扫过界面 |
| 8 | `snapshot-compare` | 前后对照 | 完全不同结果、左右对比 | 同一界面擦除对比 |
| 9 | `repo-signal` | 开源信号 | star、GitHub、开源背书 | 大数字 + 星粒子 + repo 证据 |
| 10 | `direction-picker` | 方向选择 | 审美方向、风格选择 | 多张风格卡展开 |
| 11 | `style-lock` | 风格锁定 | 锁定 Swiss、固定风格 | 候选模式切换后锁定 |
| 12 | `anchor-map` | 主动锚定 | 记住方向、对齐风格 | 坐标网格 + 准星 |
| 13 | `deny-list` | 反模式清单 | 禁用默认词、避免 AI 味 | 坏词被划掉/击落 |
| 14 | `skill-gate` | Skill 闸门 | 从源头规避、拦截模板 | 输入穿过闸门，坏结果被挡 |
| 15 | `knowledge-vault` | 内置知识库 | 全部内置、资料库 | 环形资料库核心 |
| 16 | `catalog-metrics` | 数据目录 | 161/67/57/99 等数字 | 四组数据聚合 |
| 17 | `token-assembly` | Token 组装 | 设计系统、颜色字体间距 | Token 流入移动端界面 |
| 18 | `scenario-switch` | 场景切换 | 每个场景、官网工具后台 | 多种产品界面切换 |
| 19 | `blank-audit` | 空白审计 | 从零定义、没有默认系统 | 空白画布 + 缺失提示 |
| 20 | `brand-pack` | 品牌包 | 68 个品牌、品牌资料 | brand-pack 文件索引 |
| 21 | `brand-style-map` | 品牌风格地图 | Stripe、Linear、Vercel 等 | 多品牌风格列对照 |
| 22 | `system-graph` | 系统图 | 可复用系统、最终收束 | 多个 Skill 节点汇聚 |

## 工作环境

- `ide-terminal`：文件、配置 Diff、命令和执行日志。
- `audit-trace`：界面扫描、源码定位、诊断和复检。
- `prompt-pipeline`：输入、Skill 闸门、约束和输出规范。
- `design-system-lab`：Token、组件绑定、预览和系统检查。
- `architecture-workspace`：节点、依赖、数据流和系统收束。

## 自动生成

`npm run project:from-script` 生成的新 Skill Showcase 项目默认启用 V2。生成器按场景语义选择持续工作环境，并为每个 Beat 生成完整 Step；旧的 `tech-explainer + heroPreset` 继续作为兼容合同保留。

## 验证

视觉合同拒绝以下项目：缺少工作台、Step 未绑定 Beat、重复绑定、没有可观察动作数据、没有证据。Swiss V5 全片提供 22 个 Beat / 22 个 Step，V3 与 V4 不迁移。

Swiss V5 还需要额外检查：

- 22 个 Step 必须全部提供有效 `lens`。
- 相邻 Step 不允许复用同一个 `lens`。
- 渲染后必须生成 22 Beat 接触表。
- 接触表上不得出现连续 3 个镜头肉眼几乎相同。
- 主视觉 Hero 不得和字幕上方的 Semantic Beat Animation 重复表达。
- 不得把所有镜头都套同一个浏览器/工作台外壳。

## 当前 V5 产物

```text
Project:
examples/swiss-skill-spoken-v5-workbench.json

成片:
out/swiss-skill-spoken-v5-workbench.mp4

22 Beat 接触表:
out/swiss-v5-workbench/all-22-midpoints-large.jpg
```
