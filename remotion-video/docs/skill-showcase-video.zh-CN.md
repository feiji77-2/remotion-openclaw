# 口播驱动的语义节拍视频方法

## 一句话定义

这套方法不从“挑哪个动画模板”开始，而从真实口播时间轴开始：

```text
口播 -> 句级时间戳 -> 章节 -> 语义 Beat -> 视觉证明 -> 确定性帧动画
```

`skill-showcase` 是这套方法的第一条完整样片。它复刻参考片的叙事结构和节奏机制，不嵌入参考视频，也不逐帧临摹像素。

## 为什么旧方法不够

旧方法的核心是 `scene.data -> 通用 family -> motionGrammar`。它适合数字、对比、架构、金句等数据叙事，但在长口播里容易出现四个问题：

1. 一章只有一次入场动画，后面十几秒基本静止。
2. 标题、正文和字幕重复同一句话，没有信息分层。
3. 图标是装饰，不与当前口播语义绑定。
4. 场景秒数与口播、标注分别手工估算，容易漂移。

新方法把 Scene 继续拆成语义 Beat。每个 Beat 明确“何时、强调什么、配什么图标、触发什么动作”。

## 参考片复刻流程

### 1. 锁定音频时间轴

样片使用 30fps，原声音频时长约 121.63 秒，总时长为 3649 帧。先根据真实音频切出章节，再把章节时长换成整数帧。

### 2. 提取视觉语法

参考片每章都保持三层信息：

```text
顶部：章节编号 + Skill 名称 + 进度色条
中部：与当前 Skill 对应的视觉证明
底部：当前正在说的一句字幕
```

中部不是解释卡片，而是“证据画面”：代码 Diff、React 时间线、PowerPoint 选择框、白底手绘图、HTML 预览、UI 前后对比。

### 3. 建立专用场景族

`skill-showcase` 支持 9 个变体：

- `intro`
- `overview`
- `coding`
- `remotion`
- `ppt`
- `illustration`
- `hyperframes`
- `ui`
- `outro`

专用 family 的目的不是只服务一条视频，而是固化“工具/能力展示型口播”的视觉语法。

### 4. 句级字幕

字幕继续使用 Remotion `Caption` JSON。`editorial` 模式逐条读取 `startMs/endMs`，不使用会把连续中文句子合并成整页的通用分页策略。

### 5. 关键帧优先验收

每章至少检查三个时刻：

- 章节刚进入
- 主要视觉证明出现
- 关键词或结论强调

只有关键帧通过后，才渲染完整 MP4。

## 增强版数据合同

场景基础字段：

```ts
type SkillShowcasePayload = {
  variant: SkillShowcaseVariant;
  title: string;
  subtitle?: string;
  index?: string;
  accent?: string;
  secondaryAccent?: string;
  bullets?: string[];
  labels?: string[];
  beats?: SkillShowcaseBeat[];
};
```

语义 Beat：

```ts
type SkillShowcaseBeat = {
  startFrame: number;
  endFrame: number;
  keyword: string;
  icon: SkillIconKey;
  action: 'spotlight' | 'stamp' | 'trace' | 'compare' | 'counter' | 'stack' | 'focus' | 'burst';
  detail?: string;
  evidence?: string[];
  value?: string;
};
```

`startFrame/endFrame` 是场景内帧。组件只读取 `useCurrentFrame()`，不使用 CSS animation、`setTimeout()` 或运行时随机数。

Beat 局部帧由真实字幕时间戳换算：`round(timestampMs / 1000 * fps) - sceneStartFrame`。当前 57 个 Beat 已按句级边界和章节边界重新对齐；同一句内的快速列举由主画面在该 Beat 内继续分相，避免浮层每 0.8 秒频繁重排。

项目级硬规则：

- `skill-showcase` 的每个 Scene 都必须有语义 Beat，`intro`、`overview`、`outro` 也不能空。
- 全片第一个 Beat 必须从第 0 帧开始。
- 每个 Scene 的第一个 Beat 必须在局部 1 秒内出现。
- 每个 Scene 的最后一个 Beat 必须贴到 scene 结尾。
- 相邻 Beat 之间不能出现肉眼可见的长空窗。

## 图标语义

语义线框图标固定来自 `lucide-static@0.468.0`，保存在 `public/projects/skill-showcase/icons/`，渲染时不访问网络。许可证随资产保存在 `LUCIDE_LICENSE.txt`。`iconRegistry.ts` 是图标 key 和分组的唯一真源，Zod Schema 直接读取同一份注册表。

商品和 Skill 彩色图标保存在 `public/projects/skill-showcase/product-icons/`，由 `productIcons.ts` 注册。它们用于 WorkBuddy 标识、总览 Skill 卡片和章节标题，解决纯线框图标导致的商品感不足和页面色调单一问题。

彩色图标出场后必须保留低频漂浮：固定尺寸盒子不动，图标本体用帧驱动做 2-4px 慢漂、约 1-2 度微旋转和轻微光晕呼吸。漂浮只能增强商品感，不能抢 Beat 关键词和字幕。

| 语义包 | 主要内容 | 示例 |
|---|---|---|
| `coding` | 编码和验证 | `code`、`terminal`、`bug`、`test-tube` |
| `video` | React 视频 | `film`、`braces`、`panels-top-left`、`play` |
| `slides` | 可编辑 PPT | `presentation`、`shapes`、`chart-pie`、`mouse-pointer-2` |
| `content` | 正文和插画 | `pen-tool`、`file-text`、`image-plus`、`workflow` |
| `agent` | Agent 和技能加载 | `bot`、`code-xml`、`blocks`、`plug-zap` |
| `ui` | 设计系统 | `type`、`ruler`、`swatch-book`、`component` |
| `data` | 数据和指标 | `database`、`chart-line`、`gauge`、`sigma` |
| `research` | 检索和来源 | `search`、`file-search`、`bookmark`、`external-link` |
| `narration` | 口播和字幕 | `mic-vocal`、`audio-lines`、`speech`、`captions` |
| `qa` | 检查和风险 | `badge-check`、`shield-alert`、`list-checks`、`scan-search` |
| `motion` | 推进和聚焦 | `scan-line`、`move-right`、`focus`、`maximize-2` |
| `publish` | 分享和 CTA | `send`、`share-2`、`download`、`message-circle` |

当前注册 76 个语义 SVG，7 个商品/Skill 彩色 SVG，57 个口播 Beat 使用 39 个不同图标。章节主图标保持身份，Beat 图标严格跟随当前语义。

## 特效分层

1. 持续层：五组细线位移、扫描线、确定性颗粒、景深框推进、焦点扫光、色差边缘和彩色图标慢漂，让长镜头持续有微运动。
2. 节拍层：八种构图动作、前后图标接力、局部框选、数值计数和证据堆叠，每 2-4 秒出现一次有意义的变化。
3. 转场层：三段章节色条横扫、12 帧短闪切和图标接棒，与 `TransitionSeries` 的 Scene 转场叠加。

主视觉与 Beat 使用同一个 `useCurrentFrame()`：代码行、Remotion 阶段、PPT 对象、插画断点、HyperFrames 技能格和 UI Token 会跟着当前口播重音变化。

禁止用随机粒子、无意义光球或每句话重复压屏来制造“热闹”。特效必须能回答：它正在强调口播里的哪个判断？

## 文本分层

- 章节标题：回答“现在讲哪个能力”。
- 关键词：回答“这一秒最重要的词是什么”。
- 解释标签：贴着视觉证据，回答“观众应该看哪里”。
- 字幕：完整承接口播，不承担版式标题职责。

四层文字不能重复同一整句。

## 成品流程约束

这条样片现在以 `workbuddy-six-skills-showcase-v3.mp4` 作为成品基线。后续打磨特效、文字或图标时，必须先通过成品守门线，再考虑完整重渲染。

硬约束：

- 只使用 `examples/skill-showcase.json` 作为样片 Project 真源。
- 主 Composition 仍为 `UltimateVideoV2`，竖屏 `1080x1920`，`30fps`，`cinematic`。
- 样片保持 9 个 `skill-showcase` Scene，总长 3649 帧。
- 字幕使用 57 条句级 Caption，`captionStyle` 必须是 `editorial`。
- 音频使用必需资产 `voiceover`，路径为 `public/projects/skill-showcase/audio/voice.m4a`。
- 9 个 Scene 必须全部包含语义 Beat，合计 57 个 Beat，覆盖 8 种 action。
- 全片首个 Beat 必须从第 0 帧开始，防止开场 0-16 秒没有节拍层。
- 语义图标从 `iconRegistry.ts` 读取，12 个语义包、76 个本地 SVG 和 `LUCIDE_LICENSE.txt` 缺一不可。
- 商品和 Skill 彩色图标从 `productIcons.ts` 读取，7 个本地 SVG 缺一不可。
- 完整 MP4 必须有 H.264 视频流、AAC 音频流，视频时长与 3649 帧一致，并能被 FFmpeg 完整解码。

## 运行与验收

```bash
npm run skill:gate
npm run project:check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 656 --out out/skill-showcase-coding.png
npm run typecheck
npm test
```

完整视频只在关键帧通过后执行：

```bash
npm run skill:render
npm run skill:verify
```

不要用 `npm run build:verify -- --props ...` 验证这条片子；`build:verify` 自带 `examples/project.json` 默认参数，会把样片视频和旧示例项目混在一起比较。需要验证 `skill-showcase` 时，使用 `npm run skill:verify` 或底层命令：

```bash
node scripts/verify-project-render.mjs --props examples/skill-showcase.json --video out/workbuddy-six-skills-showcase-v3.mp4
```

当前成品：

- MP4：`out/workbuddy-six-skills-showcase-v3.mp4`
- 预览帧：`out/workbuddy-six-skills-showcase-v3-preview.jpg`
- 关键帧联系表：`out/skill-showcase-v3-qa/contact-sheet.jpg`

## 真源

- 项目合同：`examples/skill-showcase.json`
- Family 组件：`src/components/ultimate-kit/families/skill-showcase/`
- Family 注册：`src/project/sceneRegistry.tsx`
- 时间线编译：`src/project/compileProject.ts`
- 字幕：`src/timeline/CaptionTrack.tsx`
- Family 元数据：`src/data/registry.ts`

知识库入口：`kb/04 口播语义节拍视频方法.md`。
