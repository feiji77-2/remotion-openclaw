# Remotion Skill Showcase 视频工厂

[English](README.en.md) | 简体中文

Video Factory 使用一份 Project JSON 驱动 Remotion 竖屏视频生产。公开 API、七步工作流、技术栈和模块边界以 [CONTRACT.md](CONTRACT.md) 为准。

## 生产链路

```text
口播稿
  -> 首次生成 Project JSON（忽略旧字幕）
  -> TTS 合成或上传音频
  -> 从当前音频提取字幕时间码
  -> 使用源口播文本和真实时间码重建 Project JSON
  -> Project / Visual Check
  -> 关键帧 / MP4 / Verify
```

源口播文本决定画面语义，当前音频决定时间。ASR/Whisper 只提供时间边界，不替换源口播文本。

当前生产视频固定为 `1080x1920 / 30fps / portrait`，生产 scene family 为 `skill-showcase`。Remotion 注册 `UltimateVideoV2` 和 `RemotionStoryboardLibrary`。

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm run setup
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
```

从口播生成 Project JSON：

```bash
npm run project:from-script -- \
  --id demo \
  --title "演示视频" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

生成 Still 或 MP4：

```bash
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

## Studio

```bash
cd remotion-video
npm run tools:studio
```

打开 [http://127.0.0.1:8787/](http://127.0.0.1:8787/)。创作流程固定为：

```text
文案制作 -> 口播文案 -> 语音 -> 风格 -> 分镜 -> 渲染 -> 交付
```

视频库是独立页面，组件库是辅助工作区，不属于七步生产门禁。

## 文档导航

| 文档 | 什么时候读 |
|---|---|
| [AGENTS.md](AGENTS.md) | 新开开发窗口或使用 Coding Agent |
| [CONTRACT.md](CONTRACT.md) | 修改 API、工作流、技术栈或模块边界 |
| [VIDEO_FACTORY_AGENT_PROMPT.md](VIDEO_FACTORY_AGENT_PROMPT.md) | 给新 Agent 下发开发任务 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 定位实现模块、数据流和扩展点 |
| [docs/INTRO.zh-CN.md](docs/INTRO.zh-CN.md) | 理解 caption、beat、lens、shot 和三层画面 |
| [docs/PRODUCTION-GUARDRAILS.zh-CN.md](docs/PRODUCTION-GUARDRAILS.zh-CN.md) | 修改生成、视觉或生产质量规则 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 提交代码和选择验证命令 |
| [SECURITY.md](SECURITY.md) | 处理本地素材、路径和敏感数据 |

详细中文文档入口见 [docs/README.zh-CN.md](docs/README.zh-CN.md)。历史清理记录不作为当前工程真源。
