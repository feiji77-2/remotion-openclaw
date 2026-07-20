# 开发代码约束

## 不可变边界

```text
Project JSON
  -> VideoProjectSchema
  -> compileProject
  -> UltimateVideoV2
  -> SkillShowcase
  -> CinematicShot / HeroTrackV2
```

1. Scene family 只能是 `skill-showcase`。
2. `heroStyle` 只能是 `cinematic` 或 `hero-track-v2`。
3. 只能注册 `UltimateVideoV2` 和 `RemotionStoryboardLibrary`。
4. 生产规格固定 `1080x1920 / 30fps`。
5. 新口播必须重新生成 captions、scene ranges、beats 和 Hero states。
6. 不得复制黄金样片 payload 再只替换字幕。
7. 不得新增第二套 renderer、重复 Composition 或旁路 Schema。
8. `payload.variant` 只能作为内容语义和默认映射提示，不得发展为第三套渲染分支。

## 组件边界

- `PortraitCinematicSkillShowcase.tsx`：11 个 Cinematic preset。
- `HeroTrackV2.tsx`：9 个 Hero Track kind。
- `skillShowcaseRouting.ts`：两种模式的唯一选择点。
- `SkillShowcase.tsx`：消费路由计划并渲染。
- `SemanticLayers.tsx`：字幕绑定的通用语义层，不创建第三种主视觉。
- `storyboardContract.json`：20 个可验收 ID 的唯一目录。

黄金样片的 9 个 scene 和 9 场景中点接触表是具体成片证据；它们不定义组件目录。组件总数和名称只以 `storyboardContract.json` 为准。

## 时间合同

- `scenes[].durationInFrames` 是渲染时长源。
- 带 `captionRange` 的所有 scene 必须连续、不重叠、不越界。
- Beat 必须从 scene 内有效帧开始并在 scene 末帧前结束。
- Hero Track states 必须覆盖整个 scene，不得出现空洞或倒序。
- 配音时长改变时必须重新对齐字幕和 scene，不能只替换音频文件。

## 资产合同

- 本地资产必须位于 `public/` 并使用相对路径。
- 远程资产只允许 HTTPS。
- 必需资产缺失时失败；可选资产可显示明确 fallback。
- 图标来自 `public/projects/skill-showcase/icons/` 和 `product-icons/`。

## 验收门槛

```bash
npm run typecheck
npm test
npm run tools:build
npm run project:check -- examples/skill-showcase.json
npm run skill:gate
npm run storyboard:render
```

最后必须直接打开 Still、9 场景中点接触表和 20 组件接触表。黑帧、空白、遮挡、裁切或重复画面都不能仅凭退出码判定通过。

当前代码所有权和发布检查见 [知识库代码地图](<../../kb/06 当前代码地图.md>) 与 [变更发布手册](<../../kb/07 变更与发布 Playbook.md>)。
