# 文档总入口

本目录只保存当前代码仍支持的说明。公开 API、工作流、技术栈和模块边界以根 [CONTRACT.md](../CONTRACT.md) 为准；历史清理记录不能覆盖当前契约。

## 从哪里开始

| 需求 | 文档 |
|---|---|
| 新开 Codex/Coding Agent 窗口 | [Agent 启动规则](../AGENTS.md) |
| 给 Agent 下发具体开发任务 | [开发 Agent 提示词](../VIDEO_FACTORY_AGENT_PROMPT.md) |
| 修改 API、工作流、栈或所有权边界 | [项目契约](../CONTRACT.md) |
| 安装、运行 Studio、生成视频 | [项目 README](../README.md) |
| 定位模块、数据流、扩展点 | [实现架构](../ARCHITECTURE.md) |
| 理解 caption、beat、lens、shot | [领域概念](INTRO.zh-CN.md) |
| 修改生成或视觉质量规则 | [生产守则](PRODUCTION-GUARDRAILS.zh-CN.md) |
| 准备代码提交与选择验证命令 | [贡献指南](../CONTRIBUTING.md) |
| 处理本地素材、路径和敏感数据 | [安全策略](../SECURITY.md) |
| 查询历史文档清理 | [清理记录](archive/CLEANUP-LOG.md) |

## 权威顺序

```text
用户当前任务
  > CONTRACT.md
  > 可执行测试和当前实现（仅补充契约未定义的细节）
  > README / ARCHITECTURE / docs
  > 外部记忆与历史材料
```

## 内容归属

| 内容 | 唯一归属 |
|---|---|
| Agent 启动、工作区保护 | `AGENTS.md` |
| HTTP DTO、七步门禁、锁定技术栈 | `CONTRACT.md` |
| 安装和日常命令 | `README.md` |
| 模块关系和扩展接线 | `ARCHITECTURE.md` |
| 视频领域术语 | `docs/INTRO.zh-CN.md` |
| 视觉与生成禁止项 | `docs/PRODUCTION-GUARDRAILS.zh-CN.md` |
| 提交前验证流程 | `CONTRIBUTING.md` |
| 本地数据和路径安全 | `SECURITY.md` |

同一规则不要复制到多个文件。其他文档需要提及时，应链接到上述唯一归属。
