# Swiss V5 技术镜头开发记忆

> 更新时间：2026-07-20
> 用途：记录这几轮 Swiss Skill Spoken V4/V5 开发中踩过的坑，后续继续做口播技术视频时必须先读。
> 适用对象：Codex、后续开发者、视频产品化负责人。

## 1. 这轮真正暴露的问题

用户的核心反馈不是“某个元素位置不对”，而是：

```text
画面不像真实技术博主讲解。
太多框框、文字、数字。
同一种风格连续出现。
看起来像测试稿，不像成片。
```

这说明问题不只是样式，而是镜头系统不够产品化。

## 2. 必须记住的用户偏好

- 用户要做的是可复用产品，不是只为某条视频做一次性修补。
- 默认方向：Swiss Skill Spoken 系列优先 9:16 竖屏。
- 16:9 可以保留，但不要在本轮强行同步开发。
- 语义节拍动效放在字幕上方、屏幕中下部，可以小一些。
- 主视觉 Hero Visual 不能和下方语义节拍动效重复。
- 用户喜欢参考片里的 `Semantic Beat Animation / 语义节拍动效`：小图标、关键词、锁定框、横向标签、证据击打。
- 但主视觉不能全是这种小卡片；主视觉应该偏真实技术博主讲解，比如终端、代码、GitHub 信号、界面检查器、系统图、设计系统。
- 用户不熟悉英文术语；沟通时必须用“英文 + 中文 + 大白话解释”。

## 3. 已经踩过的坑

| 问题 | 当时表现 | 后续避免方式 |
|---|---|---|
| 画幅方向没收口 | 用户明确要 9:16，但前期还在讨论 16:9 | Swiss 系列默认竖屏，横屏单独立项 |
| 只加局部效果 | 加了语义节拍，但主视觉仍单调 | 主视觉和节拍层要分工，不要互相复读 |
| Hero 全是框框 | 中间全是文字、数字、面板 | Hero 必须有真实技术对象：代码、终端、界面、图、数据流 |
| 外壳重复 | 22 个 lens 仍被同一个浏览器/工作台壳统一化 | 需要 `editor / blueprint / hud / surface` 等不同外壳 |
| Pipeline 镜头重复 | 22K、Swiss、主动锚定、源头规避都像三个小盒子 | 相近语义也要拆成独立 Shot，不要只用 variant |
| 过早交付 | 渲染成功后没有先看接触表就准备交付 | 必须先看 22 Beat 接触表，再给用户 |
| 只做单片修补 | 用户提醒“我要开发可复用产品” | 改合同、生成器、校验、测试，不只改 JSON |
| 术语太多 | Lens、Shot、Payload、Chrome 用户难懂 | 每个英文必须配中文和例子 |

## 4. 下一次继续开发前的硬检查

开工前先问自己：

1. 这是改一条视频，还是改可复用产品能力？
2. 有没有保护 V3/V4/16:9，不误覆盖旧成片？
3. 是否先看参考片，再抽取镜头语言？
4. 是否把每句话映射到明确 Lens？
5. 是否每个 Lens 都有真实 Shot 表达，而不是泛用框框？
6. 相邻 3 个镜头是否肉眼看起来不同？
7. 主视觉和语义节拍是否职责分离？
8. 字幕安全区有没有被压？
9. 渲染后是否生成接触表？
10. 是否跑过项目合同、类型检查、单测、视频解码和规格验证？

## 5. 后续必须坚持的产品化方向

当前状态：

```text
22 个 Lens 语义
  + TechnicalEvidenceWorkbench 渲染器
  + V5 样片
  + visual contract 校验
  + 单元测试
```

下一步应该升级为：

```text
22 个独立 Shot 文件
  + 每个 Shot 的数据要求
  + 每个 Shot 的构图规则
  + 每个 Shot 的动效阶段
  + 每个 Shot 的 fallback
  + 自动接触表审查
```

不要再让多个不同语义长期复用同一个大组件变体，否则缩略图上还是会像“同一个模板换字”。

## 6. 用户沟通模板

后续和用户讨论画面时，优先用这个格式：

```text
这句话：
“……”

我判断它的语义是：
数字证明 / 开源背书 / 前后对比 / 流程拦截 / 系统收束

建议 Lens：
英文名 / 中文名

建议 Shot：
画面像什么，元素怎么摆，重点怎么动

需要你确认的不是代码，而是：
这个画面是不是符合你想象里的技术博主表达？
```

## 7. 当前 V5 关键产物

```text
Project:
remotion-video/examples/swiss-skill-spoken-v5-workbench.json

成片:
remotion-video/out/swiss-skill-spoken-v5-workbench.mp4

22 Beat 接触表:
remotion-video/out/swiss-v5-workbench/all-22-midpoints-large.jpg

核心渲染器:
remotion-video/src/components/ultimate-kit/families/skill-showcase/TechnicalEvidenceWorkbench.tsx

Lens 类型:
remotion-video/src/components/ultimate-kit/families/skill-showcase/types.ts

视觉合同:
remotion-video/scripts/lib/visual-contract.mjs
```

## 8. 一句话记忆

不要把“技术讲解视频”做成“黑底框框 PPT”。
每一句话都要先判断语义，再选择 Lens，再落到真实 Shot，并用接触表检查重复感。

## 9. Remotion 分镜目录链路纠错

“生成分镜图”在本项目里默认指 Remotion `renderStill`，不是 AI 生图。正确路径：

```text
storyboardContract.json
  -> storyboard:check
  -> 每张 selectComposition(inputProps.index)
  -> renderStill
  -> 1080×1920 尺寸检查
  -> 20 张哈希唯一性检查
  -> 11 Motion / 9 Hero / 全库接触表
  -> 人工视觉审查
```

本轮还确认：系统汇聚类 Hero 的核心节点附近不能再叠一条完整结论。Hero 只画系统实体；语义节拍显示短结论；正式字幕显示完整口播。

固定入口：

```bash
cd remotion-video
npm run storyboard:check
npm run storyboard:render
node scripts/check-remotion-storyboard-contract.mjs --artifacts
```
