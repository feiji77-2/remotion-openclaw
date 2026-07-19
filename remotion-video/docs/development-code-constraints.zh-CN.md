# 开发代码约束

本文档是当前 Remotion 视频项目的开发规约。它围绕已经跑通的 `skill-showcase` 成品管线制定，不是通用代码风格建议。

当前成品基线：

```text
examples/skill-showcase.json
out/workbuddy-six-skills-showcase-v3.mp4
```

当前生产路径：

```text
新口播/字幕 -> project:from-script -> Project JSON -> visual contract -> compileProject -> UltimateVideoV2 -> SceneTimeline -> skill-showcase -> Caption/Audio -> MP4 -> Verify
```

所有后续开发都必须保护这条路径。视觉可以继续变强，特效可以继续变丰富，但不能把项目带回“预览像样、成片不稳、音画不同步、改完没人敢渲”的状态。

## 基准来源

本规约吸收三类约束：

1. Karpathy coding 原则：先讲清假设、最小改动、只碰必要文件、改完自己验证。
2. Remotion 官方工程原则：动画由 `useCurrentFrame()` 驱动，资产用 `staticFile()`，Composition 负责画幅、帧率、时长和 props。
3. 当前样片实战结论：长口播不能只靠 Scene 入场动画，必须拆成语义 Beat，并把主视觉、图标、字幕和特效绑定到同一帧时间轴。

## 项目不可变目标

当前项目不是一个聊天式视频生成器，也不是一个通用页面模板库。它现在的主目标是：

```text
把结构化 Project JSON 稳定渲染成完整可播放的竖屏口播视频。
```

必须长期保持：

- 输入可校验。
- 场景时长可计算。
- 字幕、语音和帧时间轴一致。
- family payload 在渲染前失败，而不是渲染中黑屏。
- 关键帧和完整 MP4 使用同一套代码。
- 最终视频能通过机器检查和人工视觉检查。

## 最高红线

以下事项没有例外：

- 禁止绕过 `VideoProjectSchema`。
- 禁止在 Remotion render 期间访问 LLM、TTS、搜索、截图服务或不稳定远程 API。
- 禁止在组件里动态读取本地文件补数据。
- 禁止在主动画里使用 `Math.random()`、`Date.now()`、`setTimeout()`、`setInterval()`。
- 禁止 CSS `animation`、CSS `transition` 或 Tailwind animation class 驱动关键动效。
- 禁止把绝对文件路径写进 `assets.src`。
- 禁止让字幕、标题、关键词重复同一整句。
- 禁止只更新 `captions` 或配音音频，却不更新 `scenes[].payload`。
- 禁止新项目继续依赖旧样片的 intro、overview、outro 默认品牌、图标和结尾文案。
- 禁止在长章节里只有一次入场动画。
- 禁止新稿连续三个 `skill-showcase` Scene 复用同一 `layoutSignature`。
- 禁止忽略口播结构信号；第一/第二/第三、但是/然而/不过、此外/另外、因为/所以/因此、数字范围词都必须进入 Scene 和 Beat 合同。
- 禁止把图标当装饰随机配。
- 禁止顺手删除、重命名或重构无关文件。

## 开发前必须写清的三件事

任何代码改动开始前，都要明确：

| 判断 | 必须回答 |
|---|---|
| 需求类型 | 修 bug、加视觉效果、扩展 Project 合同、加图标、调字幕、改脚本、整理文档 |
| 改动边界 | 会改哪些文件，不改哪些文件 |
| 验收标准 | 跑哪些命令，看哪些关键帧，是否需要完整 MP4 |

如果需求没有明确到文件级边界，默认按最小风险路径处理：

1. 先改 `examples/skill-showcase.json` 的 payload。
2. 不够再改 `skill-showcase` family。
3. 再不够才改 `sceneRegistry.tsx` schema。
4. 只有确实跨 family 复用时，才改共享编译器、时间线或抽象。

## 文件所有权

| 路径 | 所有权 | 可以做 | 禁止做 |
|---|---|---|---|
| `examples/skill-showcase.json` | 成品样片 Project 真源 | 调 Scene、caption、beat、payload | 写绝对资产路径，绕过 schema |
| `src/project/projectSchema.ts` | 顶层 Project 合同 | 加通用字段、收紧基础规则 | 放入 family 专属细节 |
| `src/project/sceneRegistry.tsx` | family 映射和 payload schema | 注册 family、校验 payload | 让未校验 payload 进入严格 family |
| `src/project/compileProject.ts` | 编译 Project 到运行时结构 | 计算时长、解析资产、产出 diagnostics | 做视觉布局、做远程请求 |
| `src/timeline/SceneTimeline.tsx` | Scene 串联 | 保持时间线顺序 | 写 family 业务逻辑 |
| `src/timeline/CaptionTrack.tsx` | 字幕渲染 | 调字幕样式和安全区 | 合并长中文字幕成整屏文字 |
| `src/timeline/AudioTrack.tsx` | 语音和音乐轨 | 加音量、延迟、loop 规则 | 动态生成音频 |
| `src/components/ultimate-kit/families/skill-showcase/` | 当前成品 family | 加视觉、特效、图标、变体 | 引入远程依赖、写通用业务框架 |
| `public/projects/skill-showcase/` | 样片本地资产 | 放语音、图标、图片、许可证 | 放临时下载、缓存、绝对路径引用 |
| `scripts/check-skill-showcase-production.mjs` | 成品守门 | 增加可机器验证的约束 | 只打印 warning 不失败 |
| `scripts/lib/visual-contract.mjs` | 换稿防污染守门 | 检查 scene payload、Beat 覆盖、产品图标和旧样片词污染 | 允许只换字幕/音频后直接渲染 |
| `docs/` | 长文档和方法文档 | 写完整规约和流程 | 记录过时命令不标注 |
| `kb/` | 知识库入口 | 保留当前有效知识 | 恢复旧 Workflow 和无关图库 |
| `out/` | 产物输出 | 放关键帧、联系表、MP4 | 作为运行时输入真源 |

## 分层架构约束

项目按以下层级流动：

```text
VideoProjectSchema
  -> compileProject()
    -> UltimateVideoV2
      -> SceneTimeline
        -> ProjectSceneRegistry
          -> SkillShowcase
            -> SemanticLayers
      -> AudioTrack
      -> CaptionTrack
      -> GlobalOverlays
```

每层只做自己的事：

| 层 | 负责 | 不负责 |
|---|---|---|
| Schema | 数据形状和基础合法性 | 视觉细节 |
| compileProject | duration、asset、diagnostics | React 布局 |
| SceneTimeline | 帧级 scene 串联 | payload 解释 |
| Family | 视觉证明和具体动效 | 读取外部服务 |
| CaptionTrack | 字幕安全区和逐句显示 | 关键词强调层 |
| AudioTrack | 已有音频播放 | TTS 生成 |
| Scripts | 校验、渲染、验证 | 改 Project 数据 |

如果某段代码同时做两层职责，要拆开。

## Project JSON 合同

`Project JSON` 是运行时唯一输入。当前样片真源是：

```text
examples/skill-showcase.json
```

必须保持：

- `schemaVersion` 为 `1`。
- `projectId` 为稳定字符串，不包含路径符号。
- `render.fps` 固定为 `30`。
- 竖屏样片为 `1080x1920`，`orientation: "portrait"`。
- 长口播样片为 `captionStyle: "editorial"`。
- `showProjectLabel` 为 `false`。
- `scene.id` 全局唯一。
- 旧项目允许手写 `durationInFrames`；新口播项目必须声明 `captionRange`，并让 `durationInFrames` 与该字幕区间换算结果相差不超过 1 帧。
- 新项目 `captionRange` 必须连续且不能跨越“第一个、第二个、第三个、第四个、最后”等硬边界。
- `transition.durationInFrames` 小于下一个 scene 时长。
- `captions[].endMs > captions[].startMs`。
- `audio.voiceAssetId` 指向必需音频资产。
- `assets.*.src` 是相对 `public/` 的安全路径。

禁止：

- 组件内部根据音频时长反推 scene 时长。
- 新口播项目按 Scene 长度平均分配 beat。
- 组件内部补齐缺失 captions。
- 只换新口播 captions/audio，不重写 `scene.payload.title/subtitle/labels/beats/productIcon`。
- 新口播项目缺少 `scene.payload.sourceText`。
- 用可选资产承载必需语音。
- 把 `public/` 前缀写进 `assets.src`。
- 用 `../`、绝对路径或 URL scheme 写本地资产。

## skill-showcase 合同

当前 family 的类型真源：

```text
src/components/ultimate-kit/families/skill-showcase/types.ts
```

变体必须属于：

```ts
type SkillShowcaseVariant =
  | 'intro'
  | 'overview'
  | 'coding'
  | 'remotion'
  | 'ppt'
  | 'illustration'
  | 'hyperframes'
  | 'ui'
  | 'outro'
  | 'impeccable'
  | 'frontend-design'
  | 'ux-pro'
  | 'cloud-design'
  | 'generic';
```

`generic` 是换稿生产专用的可复用变体，必须显式声明：

```ts
type SkillShowcaseVisualMode =
  | 'hero'
  | 'grid'
  | 'compare'
  | 'process'
  | 'metrics'
  | 'quote';
```

新口播 Project 还必须声明叙事信号和主体构图签名：

```ts
type SkillShowcaseNarrativeSignal = {
  key: string;
  family: string;
};

type SkillShowcaseProps = {
  narrativeSignal?: SkillShowcaseNarrativeSignal;
  layoutSignature?: string;
};
```

默认映射：

| 文案信号 | 视觉家族 | 主体构图 |
|---|---|---|
| 第一/第二/第三/首先/最后 | `spoken-ranking / step-flow` | `vertical-step-flow` |
| 左右/大约/接近/数字 | `spoken-takeaway / number-strip` | `metric-strip` |
| 等等/此外/另外/包括/清单 | `spoken-tags / tag-matrix` | `tag-matrix` |
| 但是/然而/不过/不是/而是 | `spoken-compare / compare-board` | `compare-board` |
| 因为/所以/因此/输入/输出/链路 | `spoken-process / focus-diagram` | `focus-diagram` |

`第一/第二/第三/最后` 是硬边界，生成器禁止跨边界合并。`但是/另外/因为` 是软边界，用来让换稿视频产生新的中部构图，而不是一直复用卡片墙。

Beat action 必须属于：

```ts
type SkillBeatAction =
  | 'spotlight'
  | 'stamp'
  | 'trace'
  | 'compare'
  | 'counter'
  | 'stack'
  | 'focus'
  | 'burst';
```

每个 Beat 必须回答五个问题：

| 字段 | 问题 |
|---|---|
| `startFrame` | 从本 scene 第几帧开始 |
| `endFrame` | 到本 scene 第几帧结束 |
| `captionStartIndex` | 绑定哪条字幕开始 |
| `captionEndIndex` | 绑定哪条字幕结束 |
| `keyword` | 此刻观众该记住什么词 |
| `icon` | 这个词对应哪个固定图标 |
| `action` | 此刻用什么视觉动作强调 |
| `visualState` | 主体组件应该进入哪个阶段 |
| `motionPreset` | 节拍层使用哪套入场/强调/退场节奏 |
| `placement` | Beat 出现在 bottom、body 还是 highlight 区域 |

`detail`、`evidence`、`value` 只能补充语义，不能变成小作文。

`startFrame/endFrame` 由绑定字幕换算而来：

```text
sceneStartFrame = round(captions[scene.captionRange.startIndex].startMs / 1000 * 30)
beatStartFrame  = round(captions[beat.captionStartIndex].startMs / 1000 * 30) - sceneStartFrame
beatEndFrame    = round(captions[beat.captionEndIndex].endMs / 1000 * 30) - sceneStartFrame
```

新项目中手填帧只作为可读冗余，`compileProject()` 会校验并归一化。误差超过 1 帧必须失败。

## 换稿生成约束

新口播不能从旧样片上“替换 captions/audio”。必须重新生成 Project：

```bash
npm run project:from-script -- --id new-topic --title "新标题" --script-file /absolute/path/script.txt --out examples/new-topic.json
```

如果已有句级字幕：

```bash
npm run project:from-script -- --id new-topic --title "新标题" --captions-file /absolute/path/captions.json --voice-src projects/new-topic/audio/voice.m4a --out examples/new-topic.json
```

生产目录可以走：

```bash
npm run production:build-project -- projects/new-topic --family skill-showcase
```

生成器必须同步写入：

- `scenes[].durationInFrames`
- `scenes[].captionRange`
- `scenes[].payload.title/subtitle/headline/body`
- `scenes[].payload.visualMode`
- `scenes[].payload.labels/labelIcons/productIcons`
- `scenes[].payload.productIcon`
- `scenes[].payload.progressIndex/progressTotal`
- `scenes[].payload.sourceText`
- `scenes[].payload.beats[].captionStartIndex/captionEndIndex`
- `scenes[].payload.beats[].visualState/motionPreset/placement`
- `captions[]`
- `audio.voiceAssetId` 和 `assets.voiceover`，如果已有正式配音

`sourceText` 是防污染锚点：每个新稿 scene 的 `sourceText` 必须来自当前 captions/口播。只要 captions 改了而 scene payload 没改，`project:visual-check`、`project:still`、`project:render` 都必须失败。

## Beat 时间约束

Beat 使用 Scene 局部帧，不使用全片帧。

正确换算：

```text
globalFrame = round(timestampMs / 1000 * fps)
localFrame  = globalFrame - sceneStartFrame
```

约束：

- Beat 必须按 `startFrame` 升序排列。
- `endFrame` 必须大于 `startFrame`。
- `endFrame` 不得超过 scene `durationInFrames`。
- 每个 `skill-showcase` scene 都必须有 Beat，`intro`、`overview`、`outro` 也不能空。
- 全片第一个 Beat 必须从第 0 帧开始。
- 每个 scene 的第一个 Beat 必须在局部 1 秒内出现。
- 每个 scene 最后一个 Beat 必须到达 scene 结尾。
- 相邻 Beat 可以轻微留白，但不能出现肉眼可见的长空窗。
- 快速列举优先在主视觉内部做分相，不要把浮层拆成每 0.5 秒重排一次。

反例：

```json
{"startFrame": 925, "endFrame": 980, "keyword": "React 代码"}
```

这是错的，因为 `925` 是全片帧，不是 Remotion 章节的局部帧。

正确：

```json
{"startFrame": 120, "endFrame": 160, "keyword": "React 代码", "icon": "braces", "action": "trace"}
```

## 字幕约束

长中文口播必须使用 `editorial` 字幕策略。

必须保持：

- 一条 Caption 对应一段可读句子。
- `startMs/endMs` 跟语音一致。
- 字幕在底部安全区。
- 字幕承接完整口播。
- 关键词浮层不重复整句字幕。

禁止：

- 把多个连续中文句子合并成一屏。
- 让字幕和 Beat 同时显示同一整句。
- 让 Beat 浮层下移遮挡字幕。
- 用英文分页算法处理整段中文口播。

## 音频约束

当前样片语音资产：

```text
public/projects/skill-showcase/audio/voice.m4a
```

Project 中必须声明：

```json
"audio": {"voiceAssetId": "voiceover"},
"assets": {
  "voiceover": {
    "kind": "audio",
    "src": "projects/skill-showcase/audio/voice.m4a",
    "required": true
  }
}
```

约束：

- 音频必须是渲染前已经存在的文件。
- Remotion 只播放音频，不生成音频。
- 修改语音后必须重新计算 captions 和 scene/beat 时间。
- 完整成片必须有 AAC 音频流。

生成入口：

```bash
npm run tts:project -- examples/skill-showcase.json --out tmp/tts-chain-smoke.m4a
```

该入口只属于渲染前准备阶段：读取 `captions`、调用 Qwen TTS、下载临时 WAV，并用 FFmpeg 合并成 M4A。输出在 `tmp/` 下只能做 smoke；正式替换生产音频时必须写到 `public/` 下，并保持 Project JSON 的 `assets.voiceover.src` 为相对 `public/` 的路径。

当前实测从 captions 直接生成的 Qwen 配音约 `149.920s`，当前样片时间线约 `121.633s`。这说明 TTS 生成链路可用，但不能直接覆盖生产音频；重配音必须同步重算字幕和 Beat 时间，或采用明确的时长适配策略。

## 图标约束

图标注册真源：

```text
src/components/ultimate-kit/families/skill-showcase/iconRegistry.ts
```

资产目录：

```text
public/projects/skill-showcase/icons/
```

当前硬规格：

- 76 个 SVG。
- 12 个语义包。
- `LUCIDE_LICENSE.txt` 必须存在。
- Zod schema 直接读取 `SKILL_ICON_KEYS`。
- Beat 使用的 icon 必须存在于 registry。

新增图标必须同步四处：

1. `SKILL_ICON_KEYS`
2. `ICON_PACKS`
3. 本地 SVG 文件
4. 测试或 `skill:gate`

禁止：

- 在线加载图标。
- 在组件里手写临时 SVG 替代 registry。
- 在 Project JSON 里写 registry 不认识的 key。
- 只加 SVG，不加 pack 映射。
- pack 之间重复登记同一个 icon。

## 资产约束

Remotion 本地资产统一走 `public/`。

正确：

```tsx
import {Img, staticFile} from 'remotion';

<Img src={staticFile('projects/skill-showcase/icons/play.svg')} />;
```

错误：

```tsx
<img src="/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/public/projects/skill-showcase/icons/play.svg" />
```

约束：

- 图片用 `Img`。
- 音频和视频用 `@remotion/media` 组件。
- 本地路径用 `staticFile()`。
- Project 资产路径不带 `public/` 前缀。
- 许可证文件跟随第三方资产目录。

## Remotion 动画约束

所有动画必须由帧驱动。

允许：

- `useCurrentFrame()`
- `useVideoConfig()`
- `interpolate()`
- `Easing.bezier()`
- `spring()`
- `Sequence`
- 基于 frame 的纯函数

禁止：

- CSS animation
- CSS transition
- Tailwind animation class
- DOM timer
- 非确定性随机数
- 依赖真实时间
- render 期间读写文件
- render 期间访问网络

标准写法：

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const enter = interpolate(frame, [0, 0.6 * fps], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

如果多个属性共享同一时机，先算 `progress`，再派生属性：

```tsx
const progress = interpolate(frame, [start, start + 18], [0, 1], clamp);
const opacity = progress;
const y = interpolate(progress, [0, 1], [28, 0]);
const scale = interpolate(progress, [0, 1], [0.96, 1]);
```

禁止重复写三段相同 `interpolate(frame, ...)` 让后续调节困难。

## 确定性随机约束

需要颗粒、线条错位、图标散布时，只能使用确定性 seed。

推荐：

```ts
const seeded = (index: number) => ((index * 9301 + 49297) % 233280) / 233280;
```

允许：

- 由 `index`、`scene.id` 的稳定 hash、固定 seed 派生数值。
- 由 `frame % cycle` 产生循环 motion。

禁止：

- `Math.random()`
- `crypto.randomUUID()`
- `Date.now()`
- 依赖 render 执行顺序的 mutable counter。

## 视觉布局约束

竖屏成片的优先级是：

```text
读得清 -> 跟得准 -> 有冲击 -> 再炫
```

必须保持：

- 顶部章节头稳定。
- 中部是视觉证明，不是装饰卡片。
- Beat 层位于字幕安全区上方。
- 字幕底部位置稳定。
- 文字容器有明确宽度、高度或 max-width。
- 图标容器尺寸固定。
- 长中文词必须检查换行和溢出。
- 视觉重点每 2-4 秒变化一次。

禁止：

- 卡片套卡片。
- 一屏出现三处完整口播句子。
- 紧凑面板使用 hero 级字号。
- 用视口宽度线性缩放字体。
- 为了填空加无语义装饰。
- 让 hover、动态文本、icon load 改变布局尺寸。

## 文本分层约束

同一帧文字分四层：

| 层级 | 职责 | 例子 |
|---|---|---|
| 章节标题 | 现在讲哪个能力 | `Remotion` |
| 关键词 | 当前重音 | `React 代码` |
| 解释标签 | 看哪里 | `Frames`、`MP4` |
| 字幕 | 完整口播 | `一段 React 代码，就是一帧画面` |

禁止把四层写成同一句。否则观众会觉得“画面在复读”，而不是在证明口播。

## 特效分层约束

特效必须分层写，不要散落在各个 div 上。

| 层 | 文件位置 | 作用 | 节奏 |
|---|---|---|---|
| 持续层 | `DeterministicMotionField` | 扫描线、细线位移、景深推进、色差边缘 | 全程慢变 |
| 节拍层 | `SemanticBeatOverlay` | 关键词、图标接力、局部高亮、证据堆叠 | 2-4 秒一次 |
| 转场层 | `ChapterTransitionOverlay` | 色条横扫、图标接棒、短闪切 | 章节边界 |
| 主视觉层 | `SkillShowcase.tsx` 各 variant | 代码、PPT、HTML、UI 等视觉证明 | 跟 Beat 同步 |

新增特效必须回答：

- 绑定哪个 Beat？
- 强调哪个口播判断？
- 是否遮挡字幕？
- 是否遮挡主视觉？
- 是否影响渲染性能？
- 能否通过关键帧或联系表检查？

禁止：

- 每个章节复制一套不同实现但效果相同的闪光。
- 没有语义的随机粒子。
- 把持续层写进某个具体 variant，导致别的章节没有基础运动。
- 把转场写死在某个 scene 内，绕开 `transition` 合同。

## 组件代码约束

`SkillShowcase.tsx` 负责九种视觉证明，`SemanticLayers.tsx` 负责通用语义层。不要互相污染。

`SkillShowcase.tsx` 可以：

- 根据 `variant` 切换主视觉。
- 根据 active Beat 高亮主视觉局部。
- 使用本 family 内的小型局部组件。
- 定义与画面强相关的布局常量。

`SkillShowcase.tsx` 不可以：

- 解析 Project 全局结构。
- 读取音频、字幕文件。
- 调用脚本或网络。
- 注册新 family。
- 写跨项目工具框架。

`SemanticLayers.tsx` 可以：

- 渲染 `SemanticIcon`。
- 渲染八种 Beat action。
- 渲染 icon relay。
- 渲染持续层和转场层。

`SemanticLayers.tsx` 不可以：

- 知道某个 variant 的业务布局。
- 根据 `title` 猜动作。
- 修改 captions。
- 依赖 DOM measurement 才能正确布局。

## Schema 和 Type 约束

同一个字段必须在三处一致：

1. TypeScript 类型：`types.ts`
2. Zod schema：`sceneRegistry.tsx`
3. Gate 或测试：`check-skill-showcase-production.mjs` / `project.test.ts`

新增字段流程：

1. 先说明字段服务哪个视觉能力。
2. 加到 `types.ts`。
3. 加到 Zod schema，设置合理 min/max。
4. 在组件里以可选字段读取。
5. 在示例 Project 中使用。
6. 在测试或 gate 中覆盖。
7. 更新 docs 和 kb。

禁止：

- 只改 TypeScript，不改 Zod。
- 只改 JSON，不改类型。
- 用 `as any` 压过 schema。
- 用 `Record<string, unknown>` 把严格 family 重新变松。

## 脚本约束

固定入口：

```bash
npm run skill:gate
npm run skill:render
npm run skill:verify
```

含义：

| 命令 | 作用 | 是否需要 MP4 |
|---|---|---|
| `skill:gate` | 检查 Project、字幕、音频、Beat、图标、资产 | 否 |
| `skill:render` | 渲染当前成品基线 | 否 |
| `skill:verify` | 检查成品 gate、视频流、音频流、帧数、解码 | 是 |

脚本失败必须：

- 直接 exit 非 0。
- 明确写出失败约束。
- 写出当前值和期望值。
- 写出涉及的 Project 或视频路径。

禁止：

- 失败只打印 warning。
- 成品约束散落在 README 手工检查。
- 把 `build:verify` 当作 `skill-showcase` 验证入口。

## Gate 硬规格

当前 `skill:gate` 必须保护：

- `projectId = workbuddy-six-skills-showcase`
- 9 个 scene
- scene variant 顺序固定
- 3649 帧
- 57 条句级字幕
- 必需 voiceover
- 9 个 scene 全部有 Beat
- 57 个 Beat
- 8 种 action 全覆盖
- 至少 39 个实际使用图标
- 76 个注册图标
- 12 个 icon pack
- 每个注册图标都有本地 SVG
- `LUCIDE_LICENSE.txt` 存在

如果成品基线升级，例如 V4，要么更新 gate 和文档，要么不要改文件名和硬规格。

## 性能约束

完整 MP4 渲染当前较慢，后续加特效必须控制成本。

高风险操作：

- 大量 box-shadow 叠加。
- 每帧创建过多 SVG path。
- 大面积 blur、filter、backdrop-filter。
- 上百个绝对定位节点同时动画。
- 大图未压缩直接进入 Remotion。
- 每帧复杂字符串或数组重建。

建议：

- 静态数组放组件外。
- 重复样式抽成常量或小函数。
- 持续层使用少量 deterministic 元素。
- 粒子数量有上限。
- 关键帧先用 `--scale=0.35` 检查。
- 完整渲染前先跑 `skill:gate`。

性能不是让画面变弱的理由，但要知道每个效果的成本。

## 变更 Playbook

### 调整某个关键词时间

改动范围：

- `examples/skill-showcase.json`

步骤：

1. 找到对应 scene。
2. 用字幕 `timestampMs` 换算局部帧。
3. 修改 Beat `startFrame/endFrame`。
4. 确认相邻 Beat 不重叠。
5. 跑 `npm run skill:gate`。
6. 抽该时间点 still。

禁止直接凭秒感手填。

### 新增 Beat action

改动范围：

- `types.ts`
- `sceneRegistry.tsx`
- `SemanticLayers.tsx`
- `examples/skill-showcase.json`
- `project.test.ts`
- `check-skill-showcase-production.mjs`
- docs 和 kb

步骤：

1. 定义 action 的语义，不先写动画。
2. 增加类型和 Zod enum。
3. 在 `ActionFrame` 增加分支。
4. 给样片至少一个 Beat 使用。
5. 测试 action 全覆盖。
6. 跑 `npm test`、`skill:gate`。

禁止只在组件里兼容一个字符串，却不进 schema。

### 新增图标

改动范围：

- `iconRegistry.ts`
- `public/projects/skill-showcase/icons/*.svg`
- 测试或 gate

步骤：

1. 放入本地 SVG。
2. 加入 `SKILL_ICON_KEYS`。
3. 加入唯一一个 `ICON_PACKS`。
4. 确认 pack 覆盖所有 key。
5. 跑 `npm test` 和 `npm run skill:gate`。

禁止从 CDN 引入。

### 新增 scene variant

改动范围：

- `types.ts`
- `sceneRegistry.tsx`
- `SkillShowcase.tsx`
- `beatRegistry.ts`
- `examples/skill-showcase.json`
- `check-skill-showcase-production.mjs`
- docs 和 kb

步骤：

1. 说明这个 variant 对应哪种视觉证明。
2. 加类型和 schema。
3. 加主视觉渲染分支。
4. 加章节图标。
5. 加 Beat 或说明为何不需要。
6. 更新 gate 的 scene 顺序或放宽策略。
7. 抽至少三帧 still。

禁止新增一个只显示标题和卡片的 variant。

### 强化特效

改动范围优先：

- `SemanticLayers.tsx`
- 必要时 `SkillShowcase.tsx`

步骤：

1. 判断属于持续层、节拍层还是转场层。
2. 写 frame-driven 纯动画。
3. 绑定 Beat 或 scene transition。
4. 检查字幕安全区。
5. 抽前、中、后关键帧。
6. 跑 `typecheck`。

禁止把特效散落到每个 variant 里重复实现。

### 修改语音或字幕

改动范围：

- `public/projects/skill-showcase/audio/voice.m4a`
- `examples/skill-showcase.json`

步骤：

1. 替换音频。
2. 重新生成或校正 captions。
3. 重新计算 scene duration。
4. 重新计算 Beat 局部帧。
5. 更新 gate 中帧数、字幕数、时长约束。
6. 跑 `skill:gate`。
7. 渲染完整 MP4 后跑 `skill:verify`。

禁止只换音频，不动字幕和 Beat。

### 修改成品文件名

改动范围：

- `package.json`
- `check-skill-showcase-production.mjs`
- docs 和 kb

步骤：

1. 改 `skill:render` 输出路径。
2. 改 `skill:verify` 输入路径。
3. 改 gate 默认视频路径。
4. 改知识库当前样片。
5. 跑 `skill:verify`。

禁止只改渲染命令，不改 verify。

## 验收矩阵

| 改动类型 | 必跑 | 可选 |
|---|---|---|
| 只改文档 | `rg` 检查旧状态、`git diff --check` | markdown 链接检查 |
| 改 Project JSON | `skill:gate`、`project:check` | 关键帧 still |
| 改 captions | `skill:gate`、关键帧 still | 完整 MP4 |
| 改 audio | `skill:gate`、`skill:render`、`skill:verify` | 音频听感检查 |
| 改 family 视觉 | `skill:gate`、`typecheck`、关键帧 still | 联系表 |
| 改 SemanticLayers | `skill:gate`、`typecheck`、关键帧 still | 完整 MP4 |
| 改 schema | `typecheck`、`npm test`、`project:check` | `skill:gate` |
| 改 compileProject | `npm test`、`project:check`、`skill:gate` | 完整 MP4 |
| 改 icon registry | `npm test`、`skill:gate` | still |
| 改 render script | `skill:gate`、`skill:verify` | 完整重渲染 |
| 改成品输出 | `skill:render`、`skill:verify` | 抽帧预览 |

成品级完整验收：

```bash
cd remotion-video
npm run skill:gate
npm run project:check -- examples/skill-showcase.json
npm run typecheck
npm test
npm run skill:render
npm run skill:verify
```

完整 MP4 慢，视觉开发不要每改一次都全片渲染。先关键帧，后联系表，再全片。

## 关键帧验收

关键帧至少覆盖：

- 开场钩子。
- overview 能力总览。
- 每个 scene 的第一个 Beat。
- 每个核心章节的最强视觉证明。
- 每个 action 至少一个画面。
- UI 章节的前后对比。
- outro 总结和 CTA。

检查项：

- 是否黑屏。
- 字体是否加载。
- 中文是否清晰。
- 字幕是否遮挡。
- Beat 是否跟口播一致。
- 图标是否正确。
- 主视觉是否表达了口播判断。
- 转场是否突然跳错颜色或图标。

## 代码反例

错误：CSS animation。

```tsx
<div style={{animation: 'pulse 1s infinite'}} />
```

正确：frame 驱动。

```tsx
const pulse = interpolate(frame % 30, [0, 15, 30], [0.7, 1, 0.7]);
<div style={{opacity: pulse}} />;
```

错误：render 期间随机。

```tsx
const x = Math.random() * 1000;
```

正确：确定性 seed。

```tsx
const x = seeded(index) * 1000;
```

错误：组件偷偷读外部文件。

```tsx
const data = JSON.parse(readFileSync('beats.json', 'utf8'));
```

正确：Project JSON 传入 payload，schema 先校验。

错误：图标直接引用 URL。

```tsx
<img src="https://cdn.example.com/play.svg" />
```

正确：本地资产。

```tsx
<Img src={staticFile('projects/skill-showcase/icons/play.svg')} />
```

错误：新增字段不进 schema。

```tsx
const intensity = props.intensity as number;
```

正确：先在 `types.ts` 和 Zod schema 中声明，再读取。

## 常见失败和处理

| 现象 | 常见原因 | 处理 |
|---|---|---|
| Beat 不出现 | 用了全片帧 | 换算成 scene 局部帧 |
| 字幕和关键词重复 | 关键词写成整句字幕 | 关键词压缩成判断词 |
| 开场 0-16 秒没有 Beat | intro / overview 没写 beats，或默认 Beat 注册缺失 | 给 `beatRegistry.ts` 和 Project JSON 同步补 Beat，并跑 `skill:gate` |
| 长章节后半段死掉 | 没有 Beat 或主视觉分相 | 增加语义 Beat 或内部 phase |
| 图标空白 | SVG 不存在或 key 未注册 | 检查 registry 和 public SVG |
| 中文字体变方块 | 字体栈不适配 headless Chrome | 使用现有中文字体栈并抽帧 |
| 渲染很慢 | 特效节点过多或 filter 太重 | 限制节点和 blur/filter |
| `build:verify` 报帧数错 | 用旧项目默认参数验证样片 | 改用 `npm run skill:verify` |
| MP4 没声音 | voice asset 缺失或未编译进 audioTrack | 跑 `skill:gate` 和 ffprobe |
| Scene 转场错位 | transition 时长或 scene duration 改了 | 跑 `project:check` |

## 文档同步约束

以下变化必须同步：

- Project JSON 合同变化。
- 新增或删除 scene variant。
- 新增 Beat action。
- 图标 registry 或资产目录变化。
- 字幕策略变化。
- 音频路径变化。
- 渲染命令变化。
- 成品基线变化。
- gate 规则变化。

同步目标：

- `docs/skill-showcase-video.zh-CN.md`
- `docs/development-code-constraints.zh-CN.md`
- `kb/00 首页.md`
- `kb/01 当前项目总览.md`
- `kb/04 口播语义节拍视频方法.md`
- `kb/05 skill-showcase 场景族.md`
- `kb/06 QA 与调试.md`
- `kb/07 开发代码约束.md`

知识库只保留当前有效流程，不恢复旧 Workflow、Fast Pipeline、20-family 截图册或无关历史材料。

## 提交前评审清单

逐项确认：

- 这次改动是否直接服务当前需求？
- 是否没有触碰无关目录？
- 是否没有删除用户已有改动？
- 新字段是否进入 TypeScript 类型？
- 新字段是否进入 Zod schema？
- 新字段是否有默认值或可选读取策略？
- 新资产是否在 `public/` 下？
- 资产路径是否不含绝对路径和 `public/` 前缀？
- 新图标是否进入 `SKILL_ICON_KEYS`？
- 新图标是否进入唯一一个 `ICON_PACKS`？
- SVG 是否存在？
- 第三方资产许可证是否存在？
- 动画是否完全由 frame 驱动？
- 是否没有 CSS animation 或 timer？
- 是否没有运行时随机数？
- 字幕安全区是否没被遮挡？
- 关键词是否不是整句字幕？
- Beat 是否使用 scene 局部帧？
- 核心章节是否每 2-4 秒有语义变化？
- `npm run skill:gate` 是否通过？
- 需要完整成片时，`npm run skill:verify` 是否通过？

## 当前真源

| 职责 | 文件 |
|---|---|
| 样片 Project | `examples/skill-showcase.json` |
| 成品 gate | `scripts/check-skill-showcase-production.mjs` |
| 成品 MP4 | `out/workbuddy-six-skills-showcase-v3.mp4` |
| 方法文档 | `docs/skill-showcase-video.zh-CN.md` |
| 开发约束 | `docs/development-code-constraints.zh-CN.md` |
| Family | `src/components/ultimate-kit/families/skill-showcase/` |
| Family 类型 | `src/components/ultimate-kit/families/skill-showcase/types.ts` |
| 语义层 | `src/components/ultimate-kit/families/skill-showcase/SemanticLayers.tsx` |
| 图标注册 | `src/components/ultimate-kit/families/skill-showcase/iconRegistry.ts` |
| Schema | `src/project/sceneRegistry.tsx` |
| 编译器 | `src/project/compileProject.ts` |
| 字幕 | `src/timeline/CaptionTrack.tsx` |
| 音频 | `src/timeline/AudioTrack.tsx` |
