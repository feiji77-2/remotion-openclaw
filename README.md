# Remotion Skill Showcase 视频工厂

[English](README.en.md) | 简体中文

本仓库只保留一条真实视频生产链路。所有文档、控制台和脚本都必须迁就这条可运行代码链路，不能从旧文档反推代码。

```text
控制台 / project:from-script
  -> scripts/lib/script-project-generator.mjs
  -> skill-showcase Project JSON
  -> VideoProjectSchema
  -> compileProject
  -> UltimateVideoV2
  -> sceneRegistry.tsx
  -> SkillShowcase
  -> cinematic / hero-track-v2
  -> Still / MP4 / QA / Verify
```

## 当前视频合同

- 画幅固定为 `1080x1920 / 30fps / portrait`。
- Scene family 只允许 `skill-showcase`。
- Remotion 只注册 `UltimateVideoV2` 和 `RemotionStoryboardLibrary`。
- `payload.variant` 只表示内容语义，不是渲染链路。
- 黄金样片的 9 个 scene 是成片结构，不是 9 条生产链路。
- 当前已验收主视觉 catalog 是 `11 Cinematic + 9 Hero Track`，以 `storyboardContract.json` 为准；这是当前生产能力，不是未来扩展上限。

## 当前存活入口

- `README.md`：生产入口、核心链路、最小禁止清单和日常自检。
- `ARCHITECTURE.md`：当前代码架构、扩展边界、渲染职责。
- `docs/README.zh-CN.md`：详细文档入口，只收纳仍被当前代码支持的说明。
- `docs/PRODUCTION-GUARDRAILS.zh-CN.md`：完整禁止清单和扩展准入规则。
- 已删除的 `.agentdesk/`、`kb/`、`remotion-video/docs/` 是旧并行文档系统，不再作为当前真源。

## 最重要守则

- 真源顺序：真实代码 > 根 `README.md` / `ARCHITECTURE.md` / `docs/` > 当前验证输出 > 外部记忆和旧文档。
- `captionIndex` 是驱动单位，顶部 Hero、语义节拍和底部字幕必须跟同一句口播走。
- `shot` 必须带 `lens`，`heroTrack.states[]` 必须覆盖完整 caption 范围，不能让新文案复用旧画面。
- `componentId` 只能是编辑元数据，不能拿来绕开 `captionIndex -> lens -> shot`。
- 新组件只有接入类型、Zod schema、generator、renderer、visual contract、tests，且 catalog 级主视觉也接入 storyboard contract，才算当前生产真源。
- 外部记忆库、Codex memory、旧 Obsidian 副本只能当历史线索，不能覆盖当前仓库的代码合同。

## 代码锚点

| 当前事实 | 真实代码锚点 |
|---|---|
| Project JSON 顶层合同 | `remotion-video/src/project/projectSchema.ts` |
| Project 编译、时长、资产、diagnostics | `remotion-video/src/project/compileProject.ts` |
| `skill-showcase` scene payload、Hero lens/shot 校验 | `remotion-video/src/project/sceneRegistry.tsx` |
| 口播脚本生成 Project JSON | `remotion-video/scripts/lib/script-project-generator.mjs` |
| beat 到 lens/shot 的路由 | `remotion-video/src/components/ultimate-kit/families/skill-showcase/skillShowcaseRouting.ts` |
| `HeroTrackState`、`HeroLens`、`HeroShotKind` 类型 | `remotion-video/src/components/ultimate-kit/families/skill-showcase/types.ts` |
| 顶部 Hero 技术镜头渲染 | `remotion-video/src/components/ultimate-kit/families/skill-showcase/HeroTrackV2.tsx` |
| `11 Cinematic + 9 Hero Track` 验收 catalog | `remotion-video/src/components/ultimate-kit/families/skill-showcase/storyboardContract.json` |
| Storyboard catalog 接触表渲染 | `remotion-video/src/compositions/RemotionStoryboardLibrary.tsx` |
| 视觉合同检查 | `remotion-video/scripts/lib/visual-contract.mjs`、`remotion-video/scripts/check-project-visual-contract.mjs` |
| 可执行命令 | `package.json`、`remotion-video/package.json` |

## 口播驱动链路

`hero-track-v2` 的现行链路按字幕句驱动画面：

```text
captionIndex
  -> beat        语义节拍，中下方强调结论
  -> lens        语义合同：这一拍讲什么
  -> shot        导演镜头：顶部 Hero 怎么展示操作证据
  -> HeroTrackV2 / TechnicalShotHero
```

成片必须保持三层职责：

- 顶部主视觉区：展示浏览器、终端、Diff、配置、检查器、流程图、测试报告等实操证据。
- 中下方语义节拍区：跟随当前口播强调关键词、结论、数量或判断。
- 底部字幕区：展示完整口播字幕。

10 种技术 Hero 镜头只是 `HeroTrackState.shot.kind` 的导演镜头语法，不是新组件库，也不进入 Storyboard catalog：`browser-demo`、`terminal-execution`、`code-diff`、`config-check`、`interface-audit`、`flow-trace`、`test-report`、`asset-library`、`system-map`、`before-after`。

## 扩组件准入

- 20 个 catalog 项只是当前已验收生产能力，外部还有组件可以继续接入。
- 候选组件、控制台预览组件、素材库素材不等于生产链路；它们不能直接驱动画面。
- 新 Cinematic preset 必须接入类型、Zod schema、renderer、visual contract、tests、文档，并进入 `storyboardContract.json` 后才算生产能力。
- 新 Hero Track kind 必须接入类型、Zod schema、generator、renderer、visual contract、tests、文档，并进入 `storyboardContract.json` 后才算生产能力。
- 新技术 Hero shot 必须接入 `HeroShotKind`、Zod schema、generator/fallback routing、`TechnicalShotHero`、visual contract、tests、文档；它仍然属于 `hero-track-v2` 内部导演镜头语法。

## 新文案防旧视频自检

- 生成前确认输入脚本、project id、输出路径都是本轮任务，不复用旧 Project JSON、旧 Still 或旧 MP4。
- 生成后检查每个 `heroTrack.states[]` 的 `captionStartIndex` / `captionEndIndex` 覆盖当前 scene 的 caption 范围。
- 每个有 `shot` 的 state 必须有同一拍的 `lens.objective`、`actionLabel` 和可读 `evidence`。
- 口播进入下一句时，顶部 Hero、语义节拍、底部字幕必须一起切换；只更新底部关键词就是失败。
- 如果顶部主视觉仍是旧视频，根因优先查 `captionIndex -> beat -> lens -> shot -> HeroTrackV2` 链路，不用“扩素材库”掩盖。

## 快速开始

```bash
npm run setup
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

从新口播生成 Project JSON：

```bash
npm run project:from-script -- \
  --id demo \
  --title "演示视频" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

启动本地生产控制台：

```bash
cd remotion-video
npm run tools:studio
```

打开 `http://127.0.0.1:8787/`。

## 禁止事项

- 禁止从旧文档、外部记忆库或 Codex memory 反推代码；文档与源码冲突时，默认二手材料错。
- 禁止复活已退役的多链路、旧 renderer、旧 family、旧素材库叙事。
- 禁止把 `payload.variant`、黄金样片 9 个 scene、或 20 个当前 catalog 项写成额外生产链路。
- 禁止把 10 种 `shot.kind` 写成组件库扩充；它们是 `hero-track-v2` 内部导演镜头语法。
- 禁止新增 `NarrationSemanticSurface`、`retargetHeroTrackForComponent`，禁止向 `HeroTrackV2` 传 `componentId` 来绕开口播驱动链路。
- 禁止为了“扩充素材库”生成与口播无关的伪素材动画；顶部 Hero 必须展示当前字幕句对应的操作证据。
- 禁止只让底部关键词/字幕更新，而顶部 Hero 和中下方语义节拍停留在旧视频状态。
- 禁止把候选组件写成当前生产能力。新组件只有接入类型、Zod schema、generator、renderer、visual contract、tests，且 catalog 级主视觉还接入 storyboard contract 后，才算当前生产真源。
