# 文档总入口

这是仓库唯一的详细文档入口。根 [README.md](../README.md) 说明使用方式，根 [ARCHITECTURE.md](../ARCHITECTURE.md) 说明真实架构，本目录只保留当前代码仍然支持的项目逻辑。

已删除的 `.agentdesk/`、`kb/`、`remotion-video/docs/` 是历史并行文档系统，不再作为当前真源。需要追溯本次清理，见 [archive/CLEANUP-LOG.md](archive/CLEANUP-LOG.md)。

## 当前权威文档

| 文档 | 内容 |
|---|---|
| [介绍](INTRO.zh-CN.md) | 口播、caption、beat、lens、shot、Hero、字幕、QA 的基本关系 |
| [生产守则与禁止清单](PRODUCTION-GUARDRAILS.zh-CN.md) | 当前唯一禁止清单、扩展准入、记忆库冲突处理 |
| [清理记录](archive/CLEANUP-LOG.md) | 本次删除、合并和禁止事项记录 |

## 当前事实源

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

## 当前口播驱动合同

```text
captionIndex
  -> beat
  -> lens
  -> shot
  -> HeroTrackV2 / TechnicalShotHero
```

- 顶部主视觉区展示实操证据。
- 中下方语义节拍区强调当前结论。
- 底部字幕区展示完整口播。

`11 Cinematic + 9 Hero Track` 是当前已验收主视觉 catalog，不是未来扩展上限。10 种 `HeroTrackState.shot.kind` 是 `hero-track-v2` 内部导演镜头语法，不是新增组件库。

## 标准验证

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
```

自动化成功不代表视觉审核通过。最终仍要直接查看真实 Still、Storyboard 接触表或 MP4。
