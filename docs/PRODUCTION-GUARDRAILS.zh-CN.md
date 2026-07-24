# 生产守则

> 当前版本：2026-07-24

本文件只负责生成正确性、视觉质量和生产证据。Agent 启动与工作区保护见 [AGENTS.md](../AGENTS.md)；API、工作流、技术栈和模块边界见 [CONTRACT.md](../CONTRACT.md)。

## 1. 口播与时间

- 源口播文本决定画面语义，当前 TTS 或上传音频决定时间。
- ASR/Whisper 只能提供时间边界，不能替换源口播文本。
- 新口播必须重新生成当前音频、`captions.json`、Project JSON 和下游产物。
- 首次 build 必须忽略旧 captions；音频对齐后必须使用当前 `captions.json` 二次 rebuild。
- 禁止只读取音频总时长后平均拉伸字幕，并宣称已按真实节奏驱动。
- 禁止复用旧 Project JSON、Hero 状态、Still 或 MP4 证明新文案有效。

正确生产顺序：

```text
script-pack.spokenScript
  -> project:from-pack --ignore-captions
  -> tts:project 或上传音频
  -> audio:align-captions
  -> project:from-pack --captions captions.json
  -> project:check
```

## 2. 时间线覆盖

- `heroTrack.captionStartIndex` 和 `captionEndIndex` 必须匹配 scene 的 `captionRange`。
- `heroTrack.states[]` 必须覆盖完整 caption 范围和完整 scene duration。
- 禁止静默截断状态，例如只生成前若干个 Hero state。
- 修改正式生产输入后，project、preview、scene still、render、verify 必须立即变为 stale，`deliveryReady` 必须为 false。
- 禁止削弱 schema、visual contract 或测试断言来让错误项目通过。

## 3. 三层画面

- 顶部 Hero 只承接操作证据和技术过程，不做大关键词海报。
- 中下方语义节拍负责结论、数字、关键词和判断。
- 底部字幕负责完整口播文本。
- 三层必须跟随同一个 `captionIndex`。
- 禁止只更新字幕或关键词，而顶部 Hero 和语义节拍停留在旧状态。
- 观众必须能看懂：改了什么、为什么改、系统发生了什么、证据是什么。

## 4. Lens 与 Shot

- 有 `shot` 的 `HeroTrackState` 必须有 `lens`。
- `lens.objective` 和 `actionLabel` 必须来自当前字幕句或当前技术目标。
- `shot.environment`、`target`、`evidence` 必须可读，`evidence` 不能为空或只含泛化标签。
- `asset-library` 只用于口播明确讨论素材、组件、资源或模板匹配时。
- `system-map` 承接 Prompt、Skill、Token、架构和模块关系。
- `code-diff` 承接文件差异、PR、patch 和增删改。
- `terminal-execution` 必须展示命令或执行结果。
- `test-report` 必须展示断言、通过/失败或复检结果。
- 禁止用装饰性“技术皮肤”代替可理解的技术过程。

## 5. 组件与扩展

- 当前 `11 Cinematic + 9 Hero Track` 是已验收目录，不是永久上限。
- 12 种生产 `shot.kind` 必须经 production component registry 解析到真实 Remotion renderer。
- 组件可达不等于视觉质量通过；同一 generic shell、同一卡片骨架或同一种运动语言重复出现，仍然是失败。
- `browser-demo`、`terminal-execution`、`code-diff`、`config-check`、`flow-trace`、`system-map`、`asset-library`、`metric-highlight`、`concept-explainer`、`before-after` 等语义必须有不同构图和运动语言。
- 候选组件、素材和控制台预览不等于生产能力。
- `visualPlan.entries[].componentId` 必须由 `caption -> intent -> beat/lens/shot -> resolver` 生成；`sceneEditor.componentId` 只能作为编辑来源元数据，不能改变生产计划。
- 禁止新增 `NarrationSemanticSurface` 或 `retargetHeroTrackForComponent` 来建立旁路。
- 允许保留红色诊断 fallback；禁止让低质 fallback、通用 `TrackShell`、通用 `ShotFrame` 或装饰线框成为匹配生产画面的常态。
- 具体扩展接线要求以 [ARCHITECTURE.md](../ARCHITECTURE.md#extension-points) 为准。

## 6. 产物证据

- Still、Storyboard 接触表、MP4 和 QA 证据必须来自当前 Project JSON。
- 禁止把样例、黄金视频或旧输出冒充本轮结果。
- 自动化退出码只能证明合同可执行，不能代替视觉检查。
- 视觉改动至少运行 visual check，并直接查看当前 Still、QA 接触表和 MP4 中的代表性帧。
- 修改生产 renderer 时，应保留同一 Project JSON 的 baseline 与 after 产物路径，确认使用的 `componentId`、连续重复段和主要视觉问题。
- 如果接触表或 MP4 仍出现大量线框、不可读信息、低对比文字或同质化技术面板，即使测试通过也不能验收。

## 7. 文档与工作区

- 禁止新建 `docs-v2`、`kb`、`.agentdesk` 或其他并行手册系统。
- README、ARCHITECTURE、CONTRACT 和本文件不得复制保存同一规则；需要引用时使用链接。
- 历史清理记录只能解释过去，不能作为当前架构或生产规则。
- 禁止回滚无关用户改动，禁止误删项目、素材、`.env*` 或本地生产包。

## 8. 视觉验证

纯文档改动至少执行：

```bash
git diff --check
npm run project:visual-check -- examples/skill-showcase.json
```

生成或视觉实现改动除 [CONTRACT.md](../CONTRACT.md#8-required-verification) 的基础矩阵外，还要执行相关的 Project check、Visual check、component report、Still/QA sheet、render 和 verify，并直接检查输出。
