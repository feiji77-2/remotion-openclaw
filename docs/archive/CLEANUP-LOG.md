# 文档清理记录

本记录说明 2026-07-23 文档收敛清理的删除、合并和禁止事项。当前真源只保留根 `README.md`、根 `ARCHITECTURE.md` 和 `docs/`。

## 合并

- `README.md`：合并唯一生产链路、三层视频合同、`captionIndex -> beat -> lens -> shot`、扩展规则和禁止事项。
- `README.en.md`：同步英文入口，移除旧知识库引用。
- `ARCHITECTURE.md`：合并真实架构、runtime boundary、技术 shot kind、扩展边界和上一轮错误禁止项。
- `docs/README.zh-CN.md`：改为唯一文档索引，不再跳转到 `kb/` 或 `remotion-video/docs/`。
- `docs/INTRO.zh-CN.md`：重写为当前口播驱动介绍，补充 lens/shot 与三层画面职责。

## 删除

- `docs/documentation-status-2026-07-21.zh-CN.md`：一次性状态快照，已被当前 README/ARCHITECTURE 取代。
- `kb/**`：Obsidian 风格并行知识库及其接触表图片资产，存在旧入口和旧同步规则，容易被当成当前真源。
- `remotion-video/docs/**`：第二套中文开发文档，内容已迁移到根文档和 `docs/`。
- `.agentdesk/**.md`：任务卡、报告、测试日志和过程决策，属于历史过程产物，不再作为当前项目逻辑入口。

## 明确禁止的上一轮错误路径

- 不准新增 `NarrationSemanticSurface`。
- 不准新增 `retargetHeroTrackForComponent`。
- 不准向 `HeroTrackV2` 传 `componentId` 作为主视觉驱动。
- 不准把组件库或素材库扩充当成口播不匹配的根修复。
- 不准只让底部字幕或关键词语义驱动，顶部 Hero 和中下方语义节拍必须跟随 `captionIndex`。
- 不准让新文案复用旧 Hero 状态；visual contract 必须卡住完整 caption coverage。
- 不准把 10 种技术 `shot.kind` 写成新的 Storyboard 组件库。

## 扩展边界

- 当前 `11 Cinematic + 9 Hero Track` 是已验收 catalog，不是永久上限。
- 新 Cinematic preset 必须接入类型、schema、renderer、contract 和 tests。
- 新 Hero Track kind 必须接入类型、schema、generator、renderer、visual contract、tests 和 storyboard contract。
- 新技术 Hero shot 必须接入 `HeroShotKind`、schema、generator/fallback、`TechnicalShotHero`、visual contract 和 tests。
- 候选组件可保留，但文档必须标注为未接入生产链路。

## 记忆库审查

- `/Users/macos/dan-koe-brain/remotion-product-image`：不存在，不能再作为同步目标引用。
- `/Users/macos/dan-koe-brain/40-🎬-Remotion视频制作/projects/remotion-product-image/kb/**`：存在旧 `kb` 副本，包含 `.agentdesk` 和 `remotion-video/docs` 旧入口，只能视为历史材料。
- `/Users/macos/.codex/memories/**`：仍残留 `remotion-video/docs/development-code-constraints.zh-CN.md` 是约束真源的旧记忆，已被当前 `README.md`、`ARCHITECTURE.md` 和 `docs/PRODUCTION-GUARDRAILS.zh-CN.md` 覆盖。
