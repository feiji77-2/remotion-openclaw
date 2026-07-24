# Contributing

## 组件模板修改接线

添加或修改一个 production composition template 需要按以下顺序完成所有接线：

### 1. Catalog

- `remotion-video/src/components/ultimate-kit/families/skill-showcase/productionComponentCatalog.json`：添加或修改条目，含 `componentId`、`rendererId`、`label`、`description`、`category`、`compatibleIntents`、`compatibleShotKinds`、`requiredData`、`motionCapability`、`styleCapability`、`productionReady`。

### 2. Schema

- `remotion-video/src/project/visualPlan.ts`：将 `componentId` 加入 `PRODUCTION_COMPONENT_IDS` 常量；必要时添加对应的 `SEMANTIC_INTENT_KEYS` 或 `HERO_SHOT_KINDS`。

### 3. Registry 与 Renderer

- `remotion-video/src/components/ultimate-kit/families/skill-showcase/HeroTrackV2.tsx`：注册 renderer 组件，实现独立空间结构、主焦点和运动机制。需同时更新 `productionRegistry`、`preview` 和 `catalog` 三处。

### 4. Studio DTO

- 如果 `CONTRACT.md` 中 `CompositionTemplateItem` 有变化，同步修改：
  - `remotion-video/scripts/tools-studio-server.mjs`（server serializer）
  - `remotion-video/src/tools/console/types.ts`（frontend DTO）
  - `remotion-video/src/tools/console/api.ts`（frontend client）
  - `remotion-video/src/tools/console/component-library-model.ts`（model mirror）

### 5. 测试

- 每个 template 必须有：catalog ID 存在、renderer 存在、preview 存在、重复或缺 renderer 测试失败。
- 测试文件：`remotion-video/src/tools/console/__tests__/component-library-model.test.ts`

### 6. 视觉回归

- 为 template 生成 preview fixture，验证主焦点位置、stage 分区和 motion signature。
- 同一 template 连续最多 2 个 caption entry。
- 人工比对 Still、QA 接触表和 MP4 中代表性帧。

### 验证命令

```bash
npm run typecheck
npm test
npm --prefix remotion-video exec vitest run src/tools/console
npm --prefix remotion-video run tools:build
npm --prefix remotion-video run project:check -- projects/<id>/project.json
npm --prefix remotion-video run project:visual-check -- projects/<id>/project.json
npm --prefix remotion-video run project:component-report -- --props projects/<id>/project.json
```

### 禁止事项

- 不得新增 `NarrationSemanticSurface` 或 `retargetHeroTrackForComponent` 建立旁路。
- 不得让 fallback、`TrackShell`、`ShotFrame` 或装饰线框成为匹配生产画面的常态。
- 不画私有整屏背景；只使用 `portraitColorTheme.ts` 统一 token。
- 不含开发标签、硬编码客户或旧样片内容。
