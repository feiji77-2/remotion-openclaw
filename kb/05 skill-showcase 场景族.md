# skill-showcase 场景族

![[Assets/skill-showcase-v3-effects.jpg|820]]

## 用途

`skill-showcase` 用于工具推荐、能力盘点、产品能力拆解和长口播竖屏视频。

它不是通用信息卡片，而是“章节标题 + 视觉证明 + 语义 Beat”的编辑型场景族。

## 变体

| Variant | 用途 |
|---|---|
| `intro` | 品牌和开场钩子 |
| `overview` | 能力总览 |
| `coding` | 编码原则、Diff 和测试 |
| `remotion` | React、Frames、MP4 时间线 |
| `ppt` | 原生对象和编辑控制点 |
| `illustration` | 正文判断到白底图解 |
| `hyperframes` | HTML 到视频与 Skill 网格 |
| `ui` | UI 前后对比 |
| `outro` | 能力总结和 CTA |

## 文件结构

```text
skill-showcase/
  SkillShowcase.tsx    场景布局和九种视觉变体
  SemanticLayers.tsx   八种 Beat、持续运动层、章节转场层
  iconRegistry.ts      76 个图标与 12 类固定语义映射
  beatRegistry.ts      九种变体的默认 Beat 和章节主图标
  types.ts             Variant、Beat、Props 合同
```

## Payload

```json
{
  "variant": "coding",
  "index": "01",
  "title": "编码原则",
  "subtitle": "Karpathy Guidelines",
  "accent": "#45e28d",
  "secondaryAccent": "#20d9e8",
  "bullets": ["先讲清假设", "只做最小改动"],
  "beats": []
}
```

## Beat Actions

| Action | 视觉含义 |
|---|---|
| `spotlight` | 正向结论或关键能力 |
| `stamp` | 章节名、警告或强判断 |
| `trace` | 路径、过程或从 A 到 B |
| `compare` | 前后、断点或左右对比 |
| `counter` | 数值结果、测试通过率或数量 |
| `stack` | 多条证据或组成项堆叠 |
| `focus` | 对主画面局部对象精准框选 |
| `burst` | 章节结论、完成态或能力释放 |

## 图标资产

- 来源：`lucide-static@0.468.0`
- 路径：`public/projects/skill-showcase/icons/`
- 注册表：`iconRegistry.ts`
- 规模：76 个 SVG，固定为 12 类语义包
- Remotion 加载：`Img + staticFile()`
- 许可证：`LUCIDE_LICENSE.txt`

图标固定在项目内，渲染时不访问网络。

## 视觉约束

- 顶部章节头位置稳定。
- 中部必须是视觉证明，不是解释卡片堆叠。
- 每个变体都必须有默认 Beat，`intro`、`overview`、`outro` 不能空。
- 同一时刻只有一个主 Beat。
- 主画面与 Beat 读取同一个局部帧和关键词，不允许各播各的。
- Beat 位于字幕安全区上方。
- 文本和图标不能改变固定布局尺寸。

## 真源

- `remotion-video/examples/skill-showcase.json`
- `remotion-video/src/project/sceneRegistry.tsx`
- `remotion-video/src/components/ultimate-kit/families/skill-showcase/`

## 继续阅读

- 方法：[[04 口播语义节拍视频方法]]
- QA：[[06 QA 与调试]]
