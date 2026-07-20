# 文档卫生审计

> 日期：2026-07-19，追加同步：2026-07-20
> 状态：第一批清理已执行，第二批瘦身已执行；Swiss V5 技术镜头文档入口已追加。
> 范围：`README*.md`、`ARCHITECTURE.md`、`docs/`、`kb/`、`remotion-video/docs/`。

## 1. 本次结论

这次清理把文档分成三类：

| 类别 | 处理 |
|---|---|
| 当前真源 | 保留 |
| 操作入口 | 改瘦，只做索引和速查 |
| 历史计划 / 一次性同步 | 删除 |

删除和瘦身的目标是：以后开发先看 `docs/README.zh-CN.md`，不要再从旧计划稿、旧控制台规格或重复 kb 页里猜当前架构。

## 2. 已删除

以下文档已经从当前文档树移除：

```text
docs/superpowers/plans/2026-07-17-video-factory-console-redesign.md
docs/superpowers/specs/2026-07-17-video-factory-console-redesign.md
remotion-video/docs/superpowers/plans/2026-05-04-directorscore-preview-plan.md
remotion-video/docs/superpowers/specs/2026-05-04-directorscore-preview-design.md
kb/13 全量同步清单.md
```

原因：

- 它们是一次性计划、旧规格或历史同步记录。
- 其中一些文件体积很大，会稀释当前主线。
- 关键结论已经被 `docs/product-architecture.zh-CN.md`、`docs/p1-local-content-studio-execution.zh-CN.md`、`src/tools/console/*` 和当前约束文档吸收。

## 3. 已改瘦

| 文档 | 现在用途 |
|---|---|
| `remotion-video/docs/project-development.zh-CN.md` | 内核开发入口，链接 schema、compile、registry、composition 真源 |
| `remotion-video/docs/family-reference.zh-CN.md` | family 选择入口，不维护第二份全量 family 表 |
| `remotion-video/docs/video-factory-console-design.zh-CN.md` | P1 本地内容生产台约束，不再引用旧 `VideoFactoryConsole.tsx` |
| `remotion-video/docs/ultimate-elements-atlas.zh-CN.md` | Ultimate 元素地图，不再描述旧 adapter |
| `kb/07 开发代码约束.md` | kb 速查入口，完整约束只维护一份 |

## 4. 当前主线文档

| 文档 | 用途 |
|---|---|
| `docs/README.zh-CN.md` | 全项目文档入口 |
| `docs/repository-consolidation.zh-CN.md` | A/B 副本裁决 |
| `docs/product-architecture.zh-CN.md` | 产品化总架构 |
| `docs/p1-local-content-studio-execution.zh-CN.md` | P1-1 本地 MVP 执行步骤 |
| `remotion-video/docs/development-code-constraints.zh-CN.md` | 全阶段开发红线 |
| `remotion-video/docs/project-development.zh-CN.md` | Remotion 内核开发手册 |
| `remotion-video/docs/family-reference.zh-CN.md` | family 选择和新增规则 |
| `remotion-video/docs/video-factory-console-design.zh-CN.md` | 本地内容生产台 UI/API 边界 |
| `docs/video-production-relationship-map.zh-CN.md` | 视频流程关系图谱，小白沟通版 |
| `docs/documentation-status-2026-07-20.zh-CN.md` | 当前文档状态清单 |
| `remotion-video/docs/technical-evidence-workbench-v2.zh-CN.md` | Swiss V5 技术镜头、Lens/Shot 合同 |

## 5. 保留的生产参考

| 文档 | 用途 |
|---|---|
| `remotion-video/docs/personal-ip-video-pipeline.zh-CN.md` | Topic Brief 到 Project JSON 的上游生产协议 |
| `remotion-video/docs/skill-showcase-video.zh-CN.md` | skill-showcase 语义 Beat 方法 |
| `remotion-video/docs/reference-spoken-video-style-report.zh-CN.md` | 口播风格分析参考，不参与架构裁决 |
| `remotion-video/examples/production/production-log.example.md` | 生产日志模板 |

## 6. kb 定位

`kb/` 只做操作笔记和速查，不再作为架构真源。

保留：

```text
kb/00 首页.md
kb/01 当前项目总览.md
kb/02 Project JSON 合同.md
kb/03 V2 渲染架构.md
kb/04 口播语义节拍视频方法.md
kb/05 skill-showcase 场景族.md
kb/06 QA 与调试.md
kb/07 开发代码约束.md
kb/08 成品产物与打开地址.md
kb/09 代码文件地图.md
kb/10 命令与脚本入口.md
kb/11 资产与图标注册.md
kb/12 变更 Playbook.md
kb/14 换稿视觉合同防污染.md
kb/15 Swiss V5 技术镜头开发记忆.md
```

注意：`kb/08` 依赖本地 `out/` 产物，长期可能过时。产品化后应改成“如何查 artifact”，而不是长期列旧文件。

## 6.1 2026-07-20 追加同步记录

本次追加同步是为了回应 Swiss V5 技术镜头产品化讨论，重点不是清理旧文档，而是把“下次不要再做成框框文字测试片”的经验固化进项目。

已补齐：

- `docs/video-production-relationship-map.zh-CN.md`：解释 Script、Beat、Lens、Shot、Layout、Motion、Contact Sheet 之间的关系。
- `kb/15 Swiss V5 技术镜头开发记忆.md`：保存本轮开发踩坑和下次避坑清单。
- `docs/documentation-status-2026-07-20.zh-CN.md`：保存当前文档状态快照。
- `kb/06 QA 与调试.md`：补充 V5 技术镜头附加验收。
- `kb/09 代码文件地图.md`：补充 V5 技术镜头源码入口。
- `kb/10 命令与脚本入口.md`：补充 V5 build、qa-sheet、render、verify 入口。

后续如果继续开发 V5，优先更新上述文档，不要重新发明一套散落在聊天里的说明。

### Remotion 组件分镜链路补充

本轮没有新增重复方法文档，而是把“Remotion 编码生图、逐 index Composition、Hero/Semantic/Caption 分层、PNG 唯一性检查”同步进既有真源和 kb 速查页：

- `remotion-video/docs/development-code-constraints.zh-CN.md`
- `.claude/MEMORY.md`
- `kb/06 QA 与调试.md`
- `kb/07 开发代码约束.md`
- `kb/09 代码文件地图.md`
- `kb/10 命令与脚本入口.md`
- `kb/15 Swiss V5 技术镜头开发记忆.md`

共享合同仍以源码 JSON 为准，文档不维护第二份 20 组件全量定义。

## 7. 以后新增文档规则

1. 必须先说明文档属于：架构、执行、约束、操作、参考、历史。
2. 一次性计划完成后删除或归档。
3. 不复制源码 schema 大段内容。
4. 不维护第二份全量 family 列表。
5. 不把未实现 API、DB、Queue、Worker 写成当前事实。
6. 不把本地 `out/` 产物路径当长期产品文档。

一句话：文档要服务开发，不要制造第二个旧副本。
