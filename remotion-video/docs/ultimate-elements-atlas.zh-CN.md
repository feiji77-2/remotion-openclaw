# Ultimate 元素地图

> 状态：当前有效
> 定位：给“选组件和查入口”的人看，不维护旧自动命中算法。

## 1. 当前事实

旧文档中的 `scripts/lib/ultimate-project-adapter.js` 已不再是当前主链路入口。现在的真实链路是：

```text
Project JSON -> VideoProjectSchema -> compileProject() -> sceneRegistry.tsx -> UltimateVideoV2
```

因此，本页只保留元素地图和使用边界，不再描述旧 adapter 的全局分配逻辑。

## 2. 核心入口

| 主题 | 文件 |
|---|---|
| Project family 类型 | `src/components/ultimate-kit/project.ts` |
| family 元数据 | `src/data/registry.ts` |
| family 到组件映射 | `src/project/sceneRegistry.tsx` |
| Ultimate 组件导出 | `src/components/ultimate-kit/index.ts` |
| family 组件目录 | `src/components/ultimate-kit/families/` |
| 主 Composition | `src/compositions/v2/UltimateVideoV2.tsx` |

## 3. 元素分层

| 层 | 作用 | 例子 |
|---|---|---|
| Stage | 画面外壳、背景、HUD、装饰层 | `UltimateStage`、`UltimateBackdrop` |
| Family Component | 一屏的主视觉结构 | `UltimateHeroPanel`、`UltimateStepFlow`、`SkillShowcase`、`Swiss*` |
| Semantic Layer | 口播内的局部 Beat、关键词、图标、证明点 | `skill-showcase/SemanticLayers.tsx` |
| Timeline | 场景、字幕、音频对齐 | `src/timeline/*` |
| Asset Layer | 图片、音频、图标和 fallback | `assetResolver.ts`、family 内资产层 |

## 4. 使用规则

- 先选 family，再写 payload，不要先堆视觉装饰。
- 一条视频不需要命中所有 family，优先让每一屏服务文案语义。
- `skill-showcase` 用于长口播章节和 Beat，不要拿它当通用模板。
- `spoken-*` 适合从脚本快速生成结构化样片。
- `swiss-*` 适合白底左对齐极简方向，新增时必须真实 still 验证。
- `memory-graph`、`pipeline-flow` 属于兼容别名方向，新稿优先使用更明确的 family。

## 5. 查找方式

```bash
rg -n "export const .* =" src/components/ultimate-kit
rg -n "family: '" src/data/registry.ts
rg -n "FAMILY_COMPONENT_REGISTRY" src/project/sceneRegistry.tsx
find src/components/ultimate-kit/families -maxdepth 2 -type f | sort
```

## 6. 验收

修改元素或 family 后至少跑：

```bash
npm run typecheck
npm test
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30 --out out/project-f30.png --scale 0.25
```

新增专属 family 时，还要补一个能覆盖该 family 的示例 Project JSON 和 still smoke。
