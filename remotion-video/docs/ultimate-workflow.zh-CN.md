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
