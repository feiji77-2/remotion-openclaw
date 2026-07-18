# Remotion Project 开发手册

## 当前主线

当前视频主线只有一个公开输入和一个主 Composition：

```text
Project JSON -> compileProject() -> UltimateVideoV2 -> PNG / MP4
```

- 输入合同：`src/project/projectSchema.ts`
- 编译器：`src/project/compileProject.ts`
- 场景注册表：`src/project/sceneRegistry.tsx`
- 示例：`examples/project.json`
- Composition：`UltimateVideoV2`

`examples/project.json` 是 8 段、240 帧的完整主链路样片，覆盖标题、流程、对比、指标、标签、代码、排序和结论。OpenClaw Step 1-8、API、Worker、旧 Skill 编排和 `UltimateSceneTemplate` 不再作为新项目运行时入口；如需迁移旧项目，只通过只读导入器生成新的 Project JSON。

## Codex 工作方式

1. 根据 `examples/project.json` 创建或修改 Project JSON。
2. 修改 Remotion 代码时使用 `remotion:remotion-best-practices`。
3. 运行合同和资产检查。
4. 先输出 still；确认内容后再渲染 MP4。
5. 视频质感、BGM、SFX、4K 和音频 ducking 后置，不阻塞主链路出图。

```bash
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30
npm run project:render -- examples/project.json --out out/project.mp4
```

这些命令不会调用搜索、LLM、图片生成、TTS、API、Worker 或 OpenClaw Skill。内容和资产由 Codex 或外部工具准备后写入 Project JSON。

个人 IP 技术教程的上游生产协议见 `docs/personal-ip-video-pipeline.zh-CN.md`。它负责选题、文案、素材、截图、TTS 和 `PRODUCTION_LOG`，最终只把纯净 `project.json` 交给这里的 Remotion 主链路。

日常验收节奏固定为：

1. `project:check` 锁结构。
2. `project:still` 锁关键帧画面。
3. `project:render` 输出 MP4。

## Project JSON

固定参数为 `1920x1080 / 30fps`。`scenes[]` 是唯一时长来源，总帧数等于所有 `durationInFrames` 之和。第一版完整效果优先保证 1080p 出图和可解码 MP4，不直接进入 4K 或长片精修。

场景字段：

- `id`：项目内唯一。
- `family`：注册过的 spoken family。
- `durationInFrames`：场景内容时长。
- `payload`：对应 family 的数据。
- `assetIds`：可选视觉资产 ID。
- `transition`：`false`、`fade` 或 `slide`。

当前支持：

- `spoken-title`
- `spoken-metric`
- `spoken-process`
- `spoken-ranking`
- `spoken-compare`
- `spoken-tags`
- `spoken-code`
- `spoken-takeaway`

默认样片使用这 8 个 family 各一次。新增 family 必须先注册到 `SceneRegistry`，再补 payload 校验和示例；未知 family 必须失败，不能静默替换。

字幕必须使用 `@remotion/captions` 的 JSON 字段：`text`、`startMs`、`endMs`、`timestampMs` 和 `confidence`。

本地资产路径相对于 `public/`，不得包含 `public/` 前缀、绝对路径或 `..`。远程资产只允许 HTTPS。缺失必需资产会失败；缺失可选视觉资产会使用 fallback。

## 旧项目导入

导入器只读取旧数据并生成新 Project JSON，不修改旧项目，也不提供反向转换：

```bash
npm run project:import -- projects/example/render-props.json --out examples/imported-project.json
```

同时生成 `imported-project.json.import-report.json`，记录 family 映射、缺失资产和无法迁移的字段。分段音频不会自动合并，报告会要求重新提供单一 voice 资产。

## 验收

```bash
npm run typecheck
npx vitest run src
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30 --scale 0.25
npm run project:render -- examples/project.json --out out/project-smoke.mp4 --frames 0-119
npm run project:verify
```

still 必须非黑屏。视频必须为 H.264、1920x1080、30fps，并与场景总帧数一致。当前默认样片的 Composition metadata 应为 240 帧。
