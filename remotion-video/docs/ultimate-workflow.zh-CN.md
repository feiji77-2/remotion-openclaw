# Ultimate 1920x1080 一次性工作流

这套模板现在不是“先搭素材，再手改一堆配置”的半成品，而是完整的 5 步生产链。你可以直接按下面的框架走。

## 01. 素材库层

可复用场景已经注册到 Remotion：

- `UltimateElementsLibrary`
- `UltimateSceneTemplate`

对应入口：

- [`src/Root.tsx`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/Root.tsx)
- [`src/compositions/UltimateElementsLibrary.tsx`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/compositions/UltimateElementsLibrary.tsx)
- [`src/compositions/UltimateSceneTemplate.tsx`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/src/compositions/UltimateSceneTemplate.tsx)

场景族已经覆盖：

- `hero`
- `feature-rail`
- `focus`
- `number-strip`
- `step-flow`
- `terminal`
- `tag-matrix`
- `code`
- `metrics`
- `cta`

## 02. 输入层

你现在有两种输入方式：

1. 直接写最终场景 JSON  
文件示例：[`examples/ultimate-scene-demo.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-scene-demo.json)

2. 写更轻量的大纲 JSON  
模板：[`examples/ultimate-outline-template.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-outline-template.json)  
示例：[`examples/ultimate-outline-demo.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-outline-demo.json)

推荐你优先用大纲 JSON。你只要写每一屏的目标和文案结构，不用手填所有底层 scene data。

## 03. 编译层

新增了大纲编译器，会把 `kind` 自动映射成真正的 scene family：

- `cover -> hero`
- `cards -> feature-rail`
- `definition -> focus`
- `steps -> step-flow`
- `command -> terminal`
- `tags -> tag-matrix`
- `schema -> code`
- `metrics -> metrics`
- `close -> cta`

核心文件：

- [`scripts/lib/ultimate-outline-compiler.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-outline-compiler.mjs)
- [`scripts/compile-ultimate-outline.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/compile-ultimate-outline.mjs)

它会自动补这些内容：

- scene `id`
- 常用 `accent`
- `step` 编号和图标
- `metrics` 的默认比例
- `code` 高亮行 tone
- 统一平台 overlay 和默认转场

## 04. 检查层

检查命令已经支持两种输入：

```bash
npm run ultimate:check
npm run ultimate:outline:check
```

也支持直接命令行指定：

```bash
node scripts/check-ultimate-scene.mjs --config ./my-video.json
node scripts/check-ultimate-scene.mjs --outline ./my-outline.json
```

检查时会输出：

- scene 数量
- 总时长
- 每个 scene 的 family / 帧数 / 字幕
- 规范化后的 JSON 快照

## 05. 出片层

正式渲染：

```bash
npm run ultimate:render
npm run ultimate:outline:render
```

或者自定义文件：

```bash
node scripts/render-ultimate-scene.mjs --config ./my-video.json --out out/my-video.mp4
node scripts/render-ultimate-scene.mjs --outline ./my-outline.json --out out/my-video.mp4
```

如果你想先只看编译结果，不渲染视频：

```bash
node scripts/compile-ultimate-outline.mjs --outline ./my-outline.json --out out/my-video.compiled.json
```

## 接回原工作流

现在 `Ultimate` 不再只是单独的大纲模板，它已经可以接回原来的搜索驱动流程。

- 原工作流继续负责：`搜索标题/主题 -> 分析 -> 标题 -> 文案 -> 分镜 -> 配音`
- 当 `render.template = "ultimate"` 时，构建和渲染会自动切到 `UltimateSceneTemplate`
- 如果项目输出尺寸是 `1920x1080` 横版，构建脚本也会优先判定为 `Ultimate`
- 原工作流里的 `shots / narration / keywords / dataPoints` 会自动编译成 `Ultimate` scenes
- 配音文件也会直接挂进 `Ultimate` composition，不再丢失音轨

对应入口：

- [`scripts/lib/ultimate-project-adapter.js`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/lib/ultimate-project-adapter.js)
- [`scripts/build-project-package.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/build-project-package.mjs)
- [`scripts/render-project.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/render-project.mjs)
- [`server/workers/renderWorker.js`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workers/renderWorker.js)

## 一条命令跑完整原工作流

现在已经补了真正的一键入口：

- [`scripts/run-search-to-ultimate.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/run-search-to-ultimate.mjs)

你在仓库根目录直接运行：

```bash
npm run workflow:ultimate -- "Claude Code 和 Codex 区别"
```

如果你在 `remotion-video` 目录里运行：

```bash
npm run workflow:ultimate -- "Claude Code 和 Codex 区别"
```

这条命令会一次性完成：

- `Step 1-8 workflow`
- 自动锁定 `Ultimate + 1920x1080`
- 生成 `projects/<projectId>/project.json`
- 生成 `projects/<projectId>/workflow-state.json`
- 自动调用 `build-project-package.mjs`
- 默认尝试生成分镜配音
- 默认直接调用 `render-project.mjs` 出最终 mp4

默认语音规则现在是：

- 如果存在 `runtime/voices/xtts/anchor.wav`，最简命令会默认启用 `xtts + anchor + zh-cn`
- 如果这个默认真人样本不存在，才会继续走原来的默认语音引擎
- 你一旦显式传了 `--voice-engine` / `--speaker` / `--reference` / `--voice-language`，就以你的参数为准

常用变体：

```bash
# 只生成 workflow / project / render props，不立刻渲染
npm run workflow:ultimate -- "AI agent 工作流" --no-render

# 跳过配音，只先看视觉工程产物
npm run workflow:ultimate -- "Remotion 自动视频" --no-voice --no-render

# 指定输出文件
npm run workflow:ultimate -- "OpenAI 最新 Agent 能力" --output out/openai-agent.mp4

# 使用 XTTS 真人克隆语音
npm run workflow:ultimate -- "AI 行业日报" --voice-engine xtts --reference runtime/voices/xtts/anchor.wav --speaker anchor --voice-language zh-cn
```

说明：

- 如果本地 `XTTS` 服务还没启动，`workflow:ultimate` 现在会先自动拉起，再继续配音
- 首次模型加载会慢一些，脚本会等待 `/health` 真正就绪后再进入语音步骤
- 如果你已经手动启动了 `XTTS`，脚本不会重复拉起

主要产物路径：

- `remotion-video/projects/<projectId>/project.json`
- `remotion-video/projects/<projectId>/workflow-state.json`
- `remotion-video/projects/<projectId>/render-props.json`
- `remotion-video/projects/<projectId>/ultimate-config.json`
- `remotion-video/public/assets/outputs/<projectId>/<projectId>.mp4`

这意味着你原来那条“根据搜索标题/主题生成内容，再制作视频和音频”的链路，现在已经不是概念说明，而是可直接执行的命令入口。

## 风格命中手册

如果你现在最关心的是：

- 为什么某个风格没有出来
- 为什么 `feature-rail` 被别的风格抢走
- 怎么强制命中 `terminal / metrics / code / focus`
- `metrics bars` 和 `focus diagram` 这些子变体怎么控

直接看这份文档：

- [`docs/ultimate-style-hit-guide.zh-CN.md`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/docs/ultimate-style-hit-guide.zh-CN.md)

如果你更关心的是：

- 怎么把这套命中系统升级成 2-3 分钟技术型节目
- 怎么支持“每天根据全球搜索信息自动出片”
- 怎么从短视频规则命中升级成节目编排系统

直接看这份升级蓝图：

- [`docs/ultimate-daily-tech-upgrade.zh-CN.md`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/docs/ultimate-daily-tech-upgrade.zh-CN.md)

如果你现在要处理的是：

- 本地真人语音克隆怎么接
- XTTS 服务怎么启动
- 参考音频放哪里
- 怎么直接在工作流里使用 `--voice-engine xtts`

直接看这份文档：

- [`docs/local-xtts-voice-clone.zh-CN.md`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/docs/local-xtts-voice-clone.zh-CN.md)

## 推荐实战顺序

1. 复制 [`examples/ultimate-outline-template.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-outline-template.json)
2. 把你的标题、结构、要点、命令、指标替换进去
3. 运行 `npm run ultimate:outline:check`
4. 如果要看底层 scene config，运行 `npm run ultimate:outline:compile`
5. 运行 `npm run ultimate:outline:render`

## 现在这套东西解决了什么

- 你不需要重新做镜头语言
- 你不需要重新排 1920×1080 安全区
- 你不需要手动计算每屏时长
- 你不需要每次都从零拼视觉元素
- 你可以先写自己的文案，再让模板复用这两个参考视频的视觉节奏和模块结构
