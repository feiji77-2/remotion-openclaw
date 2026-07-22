# 生产守则与禁止清单

> 当前版本：2026-07-23
> 适用范围：`/Users/macos/OpenClaw/remotion-generated-video-project`

本文件是当前仓库的唯一禁止清单。遇到旧文档、外部记忆库、Codex memory、历史任务卡或素材库说明与本文件冲突时，以当前仓库代码、根 `README.md`、根 `ARCHITECTURE.md` 和本文件为准。

## 1. 真源优先级

1. 真实可运行代码。
2. 根 `README.md`、根 `ARCHITECTURE.md`、`docs/`。
3. 当前验证命令输出。
4. 外部记忆库、Codex memory、旧 Obsidian 页面、历史任务卡。

第 4 类只能当历史线索，不能当当前事实。若记忆里出现 `remotion-video/docs/development-code-constraints.zh-CN.md`、`kb/`、`.agentdesk/`、`remotion-video/docs/` 等旧真源说法，默认过时。

## 2. 记忆库约束

- 禁止把 `/Users/macos/.codex/memories/**` 里的旧结论当当前项目真源。
- 禁止把 `/Users/macos/dan-koe-brain/40-🎬-Remotion视频制作/projects/remotion-product-image/kb/**` 当当前仓库文档入口。
- 禁止恢复旧的 Obsidian 同步规则、哈希同步规则或 `kb/00 首页.md` 入口。
- 禁止因为外部记忆库存在旧 `kb/` 副本，就在当前仓库复活 `kb/`。
- 外部素材库只能提供素材来源或视觉参考，不能覆盖代码合同、渲染链路、schema、测试或安全边界。

## 3. 口播驱动链路

- 禁止从场景模板、组件 ID、素材库标签或历史视频反推当前画面。
- 禁止只更新底部字幕或关键词，顶部 Hero 与中下方语义节拍必须跟随 `captionIndex`。
- 禁止新文案复用旧 `heroTrack.states[]`、旧 Project JSON、旧 Still 或旧 MP4 作为通过证据。
- 禁止让 `heroTrack.states[]` 只覆盖部分 caption；必须覆盖完整 `heroTrack.captionStartIndex..captionEndIndex`。
- 禁止重新引入静默截断，例如只生成前 6 个 Hero state。
- 禁止削弱 `visual-contract.mjs` 来让错误项目通过。

正确链路只能是：

```text
captionIndex
  -> beat
  -> lens
  -> shot
  -> HeroTrackState
  -> HeroTrackV2 / TechnicalShotHero
```

## 4. 三层画面职责

- 顶部主视觉区只展示实操证据和技术过程。
- 中下方语义节拍区负责强调结论、关键词、数字、判断和当前条目。
- 底部字幕区展示完整口播字幕。
- 禁止把顶部 Hero 做成大关键词海报。
- 禁止把语义强调塞到底部字幕后就宣称画面已被口播驱动。
- 禁止让素材库动画替代技术过程解释。

观众必须能看懂：

```text
改了什么 -> 为什么改 -> 系统发生什么变化 -> 用什么证据证明有效
```

## 5. Lens 与 Shot 合同

- 有 `shot` 的 `HeroTrackState` 必须有 `lens`。
- `lens.objective` 必须来自当前字幕句或当前技术目标。
- `shot.environment`、`shot.target`、`shot.evidence` 必须可读。
- `shot.evidence` 不能是空数组、泛泛标签或与口播无关的素材名。
- `asset-library` 只能在口播明确讲素材、组件、资源、模板匹配时出现。
- `system-map` 优先承接 `Prompt`、`Skill`、`Token`、系统图、架构、模块关系，不得误分成普通 Diff。
- `code-diff` 只能承接代码差异、文件变更、PR、patch、增删改。
- `terminal-execution` 必须展示命令或执行结果，不得只是装饰性终端皮肤。
- `test-report` 必须展示断言、通过/失败、复检或 CI 结果。

## 6. 组件库与扩展边界

- 当前 `11 Cinematic + 9 Hero Track` 是已验收 Storyboard catalog，不是永久上限。
- 禁止把当前 20 个 catalog 项写成未来不能扩展。
- 禁止把候选组件写成当前生产能力。
- 禁止因为候选组件未进 catalog 就删除真实源码；应标注为未接入生产。
- 禁止用 `componentId` 作为 `HeroTrackV2` 的主视觉驱动。
- `sceneEditor.componentId`、控制台组件库、预览组件只能是编辑/选择元数据，不能绕开 `captionIndex -> lens -> shot`。
- 新 Cinematic preset 必须接入类型、Zod schema、renderer、visual contract、tests 和文档。
- 新 Hero Track kind 必须接入类型、Zod schema、generator、renderer、visual contract、tests、storyboard contract 和文档。
- 新技术 Hero shot 必须接入 `HeroShotKind`、Zod schema、generator/fallback routing、`TechnicalShotHero`、visual contract、tests 和文档。

## 7. 已明确禁止的错误实现

- 禁止新增 `NarrationSemanticSurface`。
- 禁止新增 `retargetHeroTrackForComponent`。
- 禁止向 `HeroTrackV2` 传 `componentId` 来绕过口播驱动。
- 禁止把“扩充素材库”当成口播不匹配的根修复。
- 禁止只制造“技术皮肤”，比如画一个终端但观众看不懂技术过程。
- 禁止复活旧 renderer、旧 scene family、旧多链路或旧素材库叙事。
- 禁止为了通过测试删除合同、放宽 schema、跳过 visual check 或改低断言。

## 8. 生成与缓存

- 新口播必须重新生成 Project JSON。
- Still、MP4、QA 证据必须来自当前 Project JSON。
- 禁止把 `examples/skill-showcase.json`、黄金样片或旧输出冒充新文案结果。
- 禁止只看脚本退出码就说视觉通过。
- 视觉改动必须至少跑 `project:visual-check`；涉及画面时还要生成 Still 并直接检查。

## 9. 文档边界

- 禁止新建 `docs-v2`、新 `kb`、新 `.agentdesk`、新并行手册目录。
- 禁止恢复 `remotion-video/docs/` 作为当前文档系统。
- 禁止让 README/ARCHITECTURE/CONTRIBUTING 分别保存互相不一致的规则。
- 文档里每条当前事实必须能回到真实代码路径或当前命令。
- 旧清理日志只能解释历史，不能作为当前架构扩展入口。

## 10. 工作区与提交安全

- 禁止回滚用户或其他任务留下的无关改动。
- 禁止用 destructive git 命令清理工作区。
- 禁止误删 `remotion-video/projects/`、`.env*`、真实素材、用户本地生产包。
- 清理文档时只清理文档系统和明确的旧文档资产。
- 结束前必须报告还存在的无关 dirty 文件，不得假装工作区干净。

## 11. 验证门槛

纯文档改动至少执行：

```bash
git diff --check
npm run project:visual-check -- examples/skill-showcase.json
```

涉及 `src/` 或 `scripts/` 的改动必须执行：

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
```

涉及实际画面时还必须生成 Still：

```bash
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
```
