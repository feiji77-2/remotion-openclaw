# 变更 Playbook

## 原则

任何改动都必须先回答三个问题：

- 这次改动服务哪一句口播或哪一个重音？
- 它应该落在 Scene、Beat、图标、字幕、音频、主体视觉还是守门脚本？
- 改完以后用哪个命令证明它没有破坏成品？

## 1. 强化特效

第一改动点：

```text
src/components/ultimate-kit/families/skill-showcase/SemanticLayers.tsx
```

允许增强：

- 持续层：扫描线、细线位移、颗粒、景深推进、色差边缘、焦点扫光。
- 商品图标层：出场后做低频漂浮、微旋转和光晕呼吸，但固定盒子尺寸。
- 节拍层：关键词进入、图标接力、局部高亮、证据堆叠、计数、结论爆发。
- 转场层：章节色条横扫、图标接棒、8-12 帧短闪切。

必须保持：

- 全部由 `useCurrentFrame()` 和 `interpolate()` 驱动。
- 不用 CSS animation、timer、随机数。
- 不遮挡底部字幕。
- 与 Beat action 或关键词绑定。

必跑：

```bash
npm run skill:gate
npm run typecheck
```

关键帧：

```bash
npm run project:still -- examples/skill-showcase.json --frame 786 --out out/skill-showcase-v3-qa/frame-786.png --scale=0.5
```

## 2. 新增 Beat Action

第一改动点：

```text
src/components/ultimate-kit/families/skill-showcase/types.ts
src/project/sceneRegistry.tsx
src/components/ultimate-kit/families/skill-showcase/SemanticLayers.tsx
```

同步要求：

- Type union 增加 action。
- Payload schema enum 增加 action。
- Semantic layer 实现视觉。
- Gate 脚本加入覆盖要求。
- 知识库和开发约束同步。

必跑：

```bash
npm test
npm run skill:gate
npm run typecheck
```

## 3. 新增图标或语义包

第一改动点：

```text
public/projects/skill-showcase/icons/
src/components/ultimate-kit/families/skill-showcase/iconRegistry.ts
```

同步要求：

- SVG 本地化。
- 注册 id、文件名、语义包、标签。
- 如果新增语义包，同步 gate 和知识库。
- Project Beat 只能引用注册过的 id。

必跑：

```bash
npm run skill:gate
npm test
```

## 4. 改口播、字幕或节奏

第一改动点：

```text
public/projects/skill-showcase/audio/voice.m4a
examples/skill-showcase.json
```

同步要求：

- 音频时长变化时，重新计算所有 Scene duration。
- 字幕 `startMs/endMs` 必须与语音句子匹配。
- Beat 使用 Scene 局部帧，不使用全片帧。
- 长章节每 2-4 秒至少一个语义事件。

必跑：

```bash
npm run skill:gate
npm run project:check -- examples/skill-showcase.json
npm run skill:render
npm run skill:verify
```

## 5. 新增 Scene Variant

第一改动点：

```text
src/components/ultimate-kit/families/skill-showcase/types.ts
src/project/sceneRegistry.tsx
src/components/ultimate-kit/families/skill-showcase/SkillShowcase.tsx
```

同步要求：

- Variant union 增加新值。
- Payload schema 增加新值。
- `SkillShowcase.tsx` 实现主体视觉。
- `beatRegistry.ts` 增加默认主图标或默认 beats。
- `examples/skill-showcase.json` 增加场景。
- Gate 增加场景数、总帧数和覆盖要求。

必跑：

```bash
npm run project:check -- examples/skill-showcase.json
npm run skill:gate
npm run typecheck
npm test
```

## 6. 改成品验收标准

第一改动点：

```text
scripts/check-skill-showcase-production.mjs
package.json
```

允许改动：

- 场景数、总帧数、字幕数、Beat 数。
- 图标注册数量。
- 必需 action 或语义包。
- 成品文件名。
- ffprobe / ffmpeg 检查项。

要求：

- 失败必须 exit 非 0。
- 错误信息必须能定位到字段。
- 不允许只打印 warning 后继续通过。

## 继续阅读

- 代码地图：[[09 代码文件地图]]
- 命令入口：[[10 命令与脚本入口]]
- 开发约束：[[07 开发代码约束]]
