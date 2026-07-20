# Remotion Project 开发手册

> 状态：当前有效
> 定位：给开发者看的内核入口，不维护第二份全量 schema 或 family 表。

## 1. 当前主线

当前运行时只有一条主链路：

```text
Project JSON -> VideoProjectSchema -> compileProject() -> UltimateVideoV2 -> Still / MP4 -> QA
```

关键真源：

| 主题 | 文件 |
|---|---|
| 输入合同 | `src/project/projectSchema.ts` |
| 编译入口 | `src/project/compileProject.ts` |
| family 名称和节奏元数据 | `src/data/registry.ts` |
| family 组件和 payload 校验 | `src/project/sceneRegistry.tsx` |
| Composition | `src/compositions/v2/UltimateVideoV2.tsx` |
| 默认样片 | `examples/project.json` |

渲染期禁止访问 LLM、TTS、搜索、截图、数据库、队列或不稳定远程服务。上游可以生成内容，但交给 Remotion 的必须是纯净、可复现的 Project JSON。

## 2. Project JSON 最小合同

固定事实：

- `schemaVersion` 目前为 `1`。
- `render.fps` 必须是 `30`。
- `render.width/height` 默认 `1920x1080`，可用 `orientation` 表达横屏或竖屏语义。
- `scenes[]` 是唯一时长来源，总帧数等于所有 `durationInFrames` 之和。
- `scenes[].id` 在项目内必须唯一。
- `captions[]` 使用 `@remotion/captions` 兼容字段：`text`、`startMs`、`endMs`、`timestampMs`、`confidence`。
- 本地 asset 路径相对于 `public/`，禁止绝对路径、`public/` 前缀和 `..`。
- 远程 asset 只允许 HTTPS。

场景字段只保留这些运行时概念：

```text
id
family
durationInFrames
captionRange?
payload
assetIds[]
transition
```

不要在 Project JSON 里塞产品层状态，例如 user、job、queue、progress、billing、storage URL 或后台任务 ID。

## 3. Family 规则

family 不再写死在文档里。真实状态按这个顺序裁决：

```text
src/components/ultimate-kit/project.ts
  -> src/data/registry.ts
  -> src/project/sceneRegistry.tsx
  -> examples/*.json
```

当前大类：

| 大类 | 用途 |
|---|---|
| Ultimate | 通用横屏/技术解释/结构化表达 |
| Minimal | 抖音风格极简表达 |
| Spoken | 口播驱动的 spoken-* family |
| Skill Showcase | 带技术讲解 Hero、语义 Beat 和章节节奏的成品 family；新脚本默认 `heroStyle: tech-explainer` |
| Swiss | Swiss 极简口播方向；新增或调整时必须同时完成注册、组件映射、示例和 still 验证 |

新增 family 必须完成：

1. `UltimateSceneFamily` 类型声明。
2. `src/data/registry.ts` 元数据。
3. `src/project/sceneRegistry.tsx` 组件映射。
4. payload schema 或明确的 permissive 策略。
5. `examples/*.json` 示例和 still smoke。

未知 family 必须失败，不能静默替换成默认组件。

## 4. 上游生产边界

内容生产可以包含选题、文案、截图、TTS、素材整理和 QA 日志，但这些都发生在 Remotion 内核外。

推荐上游合同：

```text
brief.json -> script-pack.json -> asset-pack.json -> project.json
```

对应说明见：

- `docs/p1-local-content-studio-execution.zh-CN.md`
- `docs/product-architecture.zh-CN.md`
- `remotion-video/docs/personal-ip-video-pipeline.zh-CN.md`

## 5. 常用命令

在 `remotion-video/` 下执行：

```bash
npm run typecheck
npm test
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30 --out out/project-f30.png --scale 0.25
npm run project:render -- examples/project.json --out out/project-smoke.mp4 --frames 0-119
npm run project:verify
npm run storyboard:check
npm run storyboard:render
```

`storyboard:render` 是组件库的 Remotion 编码静帧链路，只输出 20 张 PNG 和接触表。它不调用 AI 生图，也不输出 MP4。共享规格与 11+9 清单位于 `src/components/ultimate-kit/families/skill-showcase/storyboardContract.json`。

真实 still smoke 必须带 Project JSON 参数；只打印 usage 的命令不算验收通过。

## 6. 修改验收

| 改动范围 | 必跑 |
|---|---|
| `src/project/*` | `npm test`、`project:check` |
| family 类型或 registry | `npm test`、对应示例 still |
| Composition / timeline | `typecheck`、still、render smoke |
| asset resolver | 本地/远程/缺失资产用例 |
| console/API 错误处理 | `npm test` 中的 tools/project 用例 |

全阶段红线见：

```text
remotion-video/docs/development-code-constraints.zh-CN.md
```
