# Swiss Skill Spoken V4（9:16）

V4 是 `swiss-skill-spoken` 系列的默认竖屏成片。它保留 V3 的文案、字幕时间轴、章节和音轨，仅替换视觉系统。

## 规格

- 1080 × 1920，30fps，约 60.1 秒
- `captionStyle: editorial`
- 22 个字幕绑定节拍，10 套 `heroPreset`
- 主视觉区：Y 220–1236，统一缩放至 80%
- 语义节拍区：Y 1260–1530
- 字幕安全区：Y 1600–1810

## 构建与渲染

```bash
npm run swiss:build
npm run swiss:render -- --codec=h264 --crf=18 --concurrency=4 --log=error
npm run swiss:v4:verify
```

默认输出：`out/swiss-skill-spoken-v4-portrait.mp4`。

## 可复用产品合同

Skill Showcase 的竖屏表达分为三个互不重复的职责：

- Hero：展示操作、界面和证据，回答“它是怎么发生的”。
- Semantic Beat：保留口播关键词的语义击打，回答“这一拍要记住什么”。
- Caption：完整承载叙述，回答“主播具体说了什么”。

新脚本通过 `project:from-script` 生成时，场景默认写入 `heroStyle: "tech-explainer"`，每个 beat 自动选择 `heroPreset`。支持 `browser-demo`、`terminal-run`、`code-diff`、`config-inspector`、`ui-audit`、`workflow-trace`、`test-report`、`asset-gallery`、`system-map` 和 `before-after`。渲染器只读取通用 beat 数据，不包含 Swiss 专用文案或分支。

## 兼容边界

- `heroStyle: "tech-explainer"` 的竖屏项目使用分层技术讲解舞台。
- `layoutSignature` 以 `portrait:cinematic-v4:` 开头的旧 V4 数据仍可进入同一竖屏舞台。
- 其他竖屏 Skill Showcase 继续使用既有竖屏组件。
- 16:9 项目继续使用 `LandscapeSkillShowcase`；V3 构建、渲染命令和输出路径不变。
- `heroStyle` 与 `heroPreset` 均为可选字段；旧项目不填写时保持原行为。
- 旧的 `shotPreset` 继续保留，供电影化抽象 Hero 使用。

## 视觉验收

全片接触表应交替出现浏览器操作、终端执行、代码差异、配置检查、界面审计、工作流追踪、测试报告、素材库、系统图和前后对照。Hero 不得再次用大字复述 beat 关键词；关键词只在下方 `SemanticBeatAnimation` 中击打。技术讲解模式下每个 beat 必须提供 `heroPreset`，且不得连续三拍复用同一预设。字幕不得进入主视觉区或语义节拍区。
