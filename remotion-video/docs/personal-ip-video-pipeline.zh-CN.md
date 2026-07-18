# 个人 IP 技术教程视频工厂

## 定位

这条生产线服务一件事：给一个热点标题或链接，在上午内产出一条 3 分钟以内、横屏 1920x1080、蓝绿 AI 感的技术布道视频。

目标不是复述新闻，而是把工具用法、技术变化和工作流影响讲清楚，让技术小白能复述，AI 从业者、创业者、产品经理和老板/投资人能判断价值。

## 主流程

```text
Topic Brief -> Script Pack -> Asset Pack -> Project JSON -> Render QA
```

- `Topic Brief`：记录选题、链接、观众、平台、资料优先级和观点候选。
- `Script Pack`：记录标题、钩子、核心观点、口播稿、3 步教程、注意事项和结尾金句。
- `Asset Pack`：记录官网截图、产品截图、新闻原文截图、Logo、代码片段和解释型图表。
- `Project JSON`：保持纯净，只包含 Remotion 渲染必需字段。
- `Render QA`：检查 still、MP4、字幕、素材缺口、帧数、fps、分辨率和编码。

Remotion 运行时不能调用搜索、LLM、截图、TTS 或队列服务。所有准备工作都发生在 Project JSON 之前。

## 内容结构

默认脚本结构固定为：

```text
痛点 -> 方案 -> 3 步教程 -> 注意事项 -> 结论
```

每条视频必须先生成 3 个核心观点候选，由用户选择一个后再写完整稿。标题、开头钩子、核心观点和结尾金句是个人 IP 的表达资产，不能跳过确认。

## 资料规则

资料优先级：

```text
官方文档/官网 > GitHub/论文/发布页 > 权威媒体 > 社交平台讨论
```

中文自媒体和社交平台讨论只当线索，不当证据。找不到足够素材时，先用 Logo + 解释型图表降级，并在 `asset-pack.json` 和 `production-log.md` 里提醒补图。

## 生产目录

每条视频一个目录：

```text
projects/<projectId>/
  brief.json
  sources.md
  script-pack.json
  asset-pack.json
  production-log.md
  project.json

public/projects/<projectId>/
  screenshots/
  logos/
  diagrams/
  audio/
```

`project.json` 可以直接交给主链路命令：

```bash
npm run project:check -- projects/<projectId>/project.json
npm run project:still -- projects/<projectId>/project.json --frame 30
npm run project:render -- projects/<projectId>/project.json --out out/<projectId>.mp4
```

## 命令

```bash
npm run production:scaffold -- "选题标题" --link https://example.com
npm run production:check -- projects/<projectId>
npm run production:build-project -- projects/<projectId>
```

`production:build-project` 只把上游生产合同编译为纯净 Project JSON，不做联网搜索、TTS、截图或渲染。

## 验收

第一阶段成功标准：

- 能从标题或链接生成生产目录。
- 能保存 3 个观点候选和用户选择。
- 能保存 1200 字以内口播稿。
- 能列出素材清单和缺口。
- 能编译出 `schemaVersion: 1` 的 Project JSON。
- Project JSON 能通过 `project:check` 和 `project:still`。
