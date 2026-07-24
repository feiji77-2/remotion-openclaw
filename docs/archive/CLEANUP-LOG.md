# 文档清理记录

> 历史记录，不是当前工程真源。当前入口见 [docs/README.zh-CN.md](../README.zh-CN.md)。

## 2026-07-23：并行文档系统收敛

本次清理把当前说明收敛到根 README、ARCHITECTURE 和 `docs/`，并停止使用以下并行系统：

- `docs/documentation-status-2026-07-21.zh-CN.md`：一次性状态快照。
- `kb/**`：Obsidian 风格并行知识库及其图片资产。
- `remotion-video/docs/**`：第二套中文开发文档。
- `.agentdesk/**.md`：任务卡、报告和过程决策。

外部 Obsidian 副本和 Codex memory 中仍可能保存旧入口，只能作为历史线索。

## 2026-07-23：契约与启动规则

后续新增：

- 根 `AGENTS.md`：新开发窗口自动启动规则。
- 根 `CONTRACT.md`：公开 API、工作流、技术栈和模块边界。
- 根 `VIDEO_FACTORY_AGENT_PROMPT.md`：可复用开发 Agent 任务模板。

当前文档归属和权威顺序以 [文档总入口](../README.zh-CN.md) 为准。旧记录中的禁止项、扩展边界和验证命令已经迁移到当前契约、架构和生产守则，不应从本历史记录反向恢复。
