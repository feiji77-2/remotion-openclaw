# Video Factory

[English](README.en.md) | 简体中文

Video Factory 使用一份 Project JSON 驱动 Remotion 竖屏视频生产。公开 HTTP API、七步 Studio 工作流、锁定技术栈和模块边界以 [CONTRACT.md](CONTRACT.md) 为准。

## 当前生产链路

```text
brief.json + script-pack.json + asset-pack.json
  -> project:from-pack / Studio build-check
  -> TTS 合成或上传音频
  -> audio:align-captions
  -> 使用源口播文本和当前音频时间码重建 Project JSON
  -> project:check + project:visual-check
  -> project:scene-stills / project:render / project:verify
```

源口播文本决定画面语义，当前音频决定时间。ASR/Whisper 只提供时间边界，不替换源口播文本。

当前交付生产 composition 是 `UltimateVideoV2`，生产 scene family 是 `skill-showcase`，输出为 `1080x1920 / 30fps / portrait`。29 个 production composition template 是唯一生产组件目录，见 [ARCHITECTURE.md](ARCHITECTURE.md#component-catalog)。

仓库还保留一个非公开的 v2 product-spec QA 链路，用于验证数据驱动 schema、motion preset、变体和非渲染报告：

```text
video-product.json
  -> product:metrics
  -> product:report
  -> VideoProductSystemDemo（Remotion Studio 内可查看）
```

该链路不改变 Studio HTTP API 或七步交付工作流。

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm run setup
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
```

从 production pack 生成 Project JSON：

```bash
npm --prefix remotion-video run project:from-pack -- examples --out project.json --ignore-captions
```

从直接口播生成 Project JSON：

```bash
npm run project:from-script -- --id demo --title "演示视频" --script-file ./script.txt --out projects/demo/project.json
```

检查、出图、渲染和验证：

```bash
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
npm --prefix remotion-video run project:verify -- --props examples/skill-showcase.json --video out/skill-showcase.mp4
```

v2 product-spec 非渲染检查：

```bash
npm run product:from-script -- remotion-video/scripts/lib/__tests__/fixtures/visual-diversity-product --out /tmp/video-product.json --strict
npm run product:metrics -- scripts/lib/__tests__/fixtures/video-product-product/video-product.json --strict
npm run product:report -- scripts/lib/__tests__/fixtures/video-product-product/video-product.json --variant editorial --strict
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

## 输入输出

| 文件 | 作用 |
|---|---|
| `remotion-video/examples/brief.json` | 项目元信息、平台、视觉风格和受众 |
| `remotion-video/examples/script-pack.json` | 口播文本和关键词，语义真源 |
| `remotion-video/examples/asset-pack.json` | 登记本地或远程素材，音频/image/video/font/json 都从这里进入 |
| `remotion-video/examples/skill-showcase.json` | 可直接用于 `UltimateVideoV2` 的 schema v1 示例 Project JSON |
| `remotion-video/examples/video-product-system.json` | v2 product-spec 示例，不进入公开 Studio API |
| `remotion-video/out/*.png|*.mp4|*.json` | 本地 still、MP4、QA 或报告输出 |

当前示例 `asset-pack.json` 没有登记图片、截图或视频素材；`skill-showcase` 示例靠文字、图标和程序化界面表达证据。最近一次非渲染素材审计显示：

- `examples` 临时重建 Project JSON 中 2 个 media/evidence visual-plan entry 没有可用 image/video 素材。
- `video-product-system.json` 的 1 个 proof scene 没有可用 image/video 素材。
- v2 tech fixture 的 6 个 media/evidence scene、product fixture 的 8 个 media/evidence scene 均没有可用 image/video 素材。
- v2 knowledge fixture 没有要求 image/video 的 evidence scene。

这不是功能缺失修复范围；给真实项目交付时，应在 `asset-pack.json` 或 v2 `assets` 中登记可解析的 `image` / `video` 素材，并让 evidence scene 引用它们。

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
