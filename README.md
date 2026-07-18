# Codex Remotion Project

[English](README.en.md) | 简体中文

这是一个由单一 Project JSON 驱动的 Remotion 图片与视频渲染器。Codex 负责创建内容和资产引用，仓库只负责校验、编译和渲染。

```text
Codex 创建 Project JSON
        ↓
project:check 校验合同与资产
        ↓
project:still / project:render
```

## 快速开始

```bash
npm run setup
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30
npm run project:render -- examples/project.json --out out/project.mp4
```

Project JSON 示例位于 `remotion-video/examples/project.json`。默认输出规格为 `1920x1080 / 30fps`，主 Composition 是 `UltimateVideoV2`。

## 目录

```text
remotion-video/
├── examples/project.json
├── src/project/          # Schema、Compiler、Scene Registry
├── src/compositions/v2/ # 主 Composition
├── src/timeline/        # Scene、Caption、Audio 轨道
├── scripts/project-*    # check、still、render CLI
└── docs/project-development.zh-CN.md
```

## 核心约束

- `scenes[]` 是唯一时长来源。
- 图片使用 Remotion `<Img>`，音频使用 `@remotion/media`。
- 本地资产路径相对于 `public/`，远程资产只允许 HTTPS。
- 缺失必需资产直接失败；缺失可选视觉资产显示 fallback。
- 搜索、LLM、TTS 和图片生成不在渲染运行时内。
- 不依赖 OpenClaw Skill、API、Worker 或 Step 1-8 workflow。

完整合同与 Codex 工作方式见 [开发手册](remotion-video/docs/project-development.zh-CN.md)。

## 验证

```bash
npm test
npm run typecheck
npm run release:check
```

## License

MIT
