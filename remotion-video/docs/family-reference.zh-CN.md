# Scene Family 参考

当前只有一个 family：`skill-showcase`。

| 模式 | 数量 | 选择字段 | 渲染实现 |
|---|---:|---|---|
| Cinematic | 11 | `payload.heroStyle = "cinematic"` + `beats[].shotPreset` | `PortraitCinematicSkillShowcase.tsx` |
| Hero Track | 9 | `payload.heroStyle = "hero-track-v2"` + `heroTrack.kind` | `HeroTrackV2.tsx` |

`skillShowcaseRouting.ts` 是唯一模式路由。`sceneRegistry.tsx` 拒绝任何其他 family 或 hero style。

## `variant` 不是 renderer

`payload.variant` 表达章节内容语义，并为缺省 Hero Track 提供映射提示。例如 `overview -> overview-matrix`、`remotion -> code-render`、`ppt -> slide-editor`、`ui -> design-compare`。多个 variant 可以映射到同一个 Hero kind。

因此当前不存在由 9 个 variant 构成的额外主链路。黄金样片 9 个 scene 是内容段落；可复用主视觉仍然只有 11 Cinematic + 9 Hero Track。

完整组件表见 [20 组件关系图](../../docs/video-production-relationship-map.zh-CN.md)。
