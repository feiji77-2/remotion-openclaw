# Scene Family 参考

## 核心 Families (20)

注册于 `src/data/registry.ts`，使用 `FAMILY_STAGE_PRESET` 映射舞台预设。

| Family | 用途 | 动效 | 布局 |
|--------|------|------|------|
| hero | 开场标题 | textSlideIn + scaleEmphasis + floatMotion | mediaCard(ambient) + iconOrbit |
| feature-rail | 特性列表 | staggerSlide + floatMotion | mediaCard(ambient) + iconOrbit |
| focus | 关键词聚焦 | textSlideIn + scaleEmphasis | iconOrbit + no mediaCard |
| number-strip | 数字展示 | staggerScale | mediaCard(ambient) + iconOrbit |
| step-flow | 步骤流程 | staggerSlide + scaleEmphasis | no mediaCard + no iconOrbit |
| timeline | 时间线 | staggerSlide + scaleEmphasis | mediaCard(ambient) + iconOrbit |
| compare-board | 对比 | textSlideIn (双方向) | mediaCard(ambient) |
| terminal | 终端 | staggerSlide | no mediaCard + no iconOrbit |
| evidence-wall | 证据墙 | staggerScale + pulseAttention | mediaCard(ambient) |
| architecture-map | 架构图 | staggerScale + floatMotion | mediaCard(ambient) + iconOrbit |
| tag-matrix | 标签矩阵 | staggerScale + floatMotion | no mediaCard + no iconOrbit |
| code | 代码 | staggerSlide | mediaCard(ambient) |
| metrics | 指标 | staggerSlide + scaleEmphasis | mediaCard(frame) + iconOrbit |
| data-stream | 数据流 | staggerSlide + floatMotion | mediaCard(ambient) |
| benchmark-chart | 基准对比 | staggerScale + staggerSlide | mediaCard(ambient) |
| quote-highlight | 引用 | textSlideIn + floatMotion | mediaCard(ambient) + iconOrbit |
| glossary-term | 术语 | textSlideIn + scaleEmphasis | iconOrbit |
| cta | 行动号召 | textSlideIn + pulseAttention | mediaCard(ambient) + iconOrbit |
| memory-graph | 记忆图谱 | → architecture-map 别名 | merged |
| pipeline-flow | 管道流程 | → step-flow 别名 | merged |

## Minimal Families (6)

抖音风格极简家族，纯色背景，无装饰元素。

| Family | 特点 | 动效 |
|--------|------|------|
| minimal-hero | 极简标题，无装饰 | textSlideIn |
| minimal-step-flow | 极简步骤 | staggerSlide |
| minimal-tag-matrix | 极简标签 | staggerScale |
| minimal-number-strip | 极简数字 | scaleEmphasis |
| minimal-timeline | 极简时间线 | staggerSlide |
| minimal-compare-board | 极简对比 | textSlideIn |

## 家族舞台预设

| 舞台预设 | 装饰层 | 媒体卡片 | 图标轨道 | HUD 模式 |
|---------|--------|---------|---------|---------|
| opening | false | false | true | minimal |
| data | true | false | false | terminal |
| evidence | false | true | false | minimal |
| climax | false | false | false | minimal |
| cta | false | false | false | minimal |

## 家族数据规范

### hero
- **required**: `title`
- **optional**: `kicker`, `subtitle`, `visualSummary`, `heroMark`, `topLabel`
- **默认强调色**: cyan
- **典型帧数**: 90 (enter 20 / emphasis 50 / exit 20)
- **相机动效**: push-in

### feature-rail
- **required**: `items`
- **optional**: `heading`, `subtitle`
- **默认强调色**: cyan
- **典型帧数**: 82 (enter 18 / emphasis 48 / exit 16)
- **相机动效**: pan-x

### focus
- **required**: `keyword`, `description`
- **optional**: `eyebrow`, `question`, `diagram`, `kicker`
- **默认强调色**: cyan
- **典型帧数**: 72 (enter 16 / emphasis 40 / exit 16)
- **相机动效**: push-in

### number-strip
- **required**: `count`
- **optional**: `items`, `summary`, `heading`
- **默认强调色**: orange
- **典型帧数**: 75 (enter 18 / emphasis 42 / exit 15)
- **相机动效**: zoom-pulse

### step-flow
- **required**: `steps`
- **optional**: `items`, `variant`, `stepVariants`
- **默认强调色**: cyan
- **典型帧数**: 84 (enter 16 / emphasis 52 / exit 16)
- **相机动效**: pan-y

### timeline
- **required**: `items`
- **optional**: `heading`, `subtitle`
- **默认强调色**: orange
- **典型帧数**: 80 (enter 18 / emphasis 46 / exit 16)
- **相机动效**: pan-y

### compare-board
- **required**: `rows`
- **optional**: `leftTitle`, `rightTitle`, `comparisons`, `dataPoints`
- **默认强调色**: cyan
- **典型帧数**: 82 (enter 16 / emphasis 50 / exit 16)
- **相机动效**: pan-x

### terminal
- **required**: `command`
- **optional**: `windowTitle`, `outputs`, `note`, `heading`, `filename`, `language`
- **默认强调色**: cyan
- **典型帧数**: 75 (enter 14 / emphasis 46 / exit 15)
- **相机动效**: none

### evidence-wall
- **required**: `cards`
- **optional**: `comparisons`, `heading`
- **默认强调色**: cyan
- **典型帧数**: 85 (enter 20 / emphasis 48 / exit 17)
- **相机动效**: pan-y

### architecture-map
- **required**: `nodes`, `centerTitle`
- **optional**: `centerDetail`, `layout`, `items`, `heading`
- **默认强调色**: purple
- **典型帧数**: 82 (enter 18 / emphasis 48 / exit 16)
- **相机动效**: drift

### tag-matrix
- **required**: `tabs`
- **optional**: `activeTab`, `items`, `heading`
- **默认强调色**: orange
- **典型帧数**: 70 (enter 14 / emphasis 40 / exit 16)
- **相机动效**: pan-x

### code
- **required**: `lines`
- **optional**: `filename`, `language`, `heading`, `visualProps`
- **默认强调色**: cyan
- **典型帧数**: 78 (enter 14 / emphasis 48 / exit 16)
- **相机动效**: none

### metrics
- **required**: `items`
- **optional**: `dataPoints`, `heading`, `layout`
- **默认强调色**: cyan
- **典型帧数**: 76 (enter 16 / emphasis 44 / exit 16)
- **相机动效**: growth

### data-stream
- **required**: `items`
- **optional**: `summary`, `dataPoints`, `heading`
- **默认强调色**: cyan
- **典型帧数**: 80 (enter 16 / emphasis 48 / exit 16)
- **相机动效**: zoom-pulse

### benchmark-chart
- **required**: `items`
- **optional**: `primaryLabel`, `secondaryLabel`, `dataPoints`, `heading`
- **默认强调色**: orange
- **典型帧数**: 82 (enter 16 / emphasis 50 / exit 16)
- **相机动效**: push-in

### quote-highlight
- **required**: `quote`
- **optional**: `attribution`, `tags`, `heading`, `visualProps`
- **默认强调色**: orange
- **典型帧数**: 70 (enter 16 / emphasis 38 / exit 16)
- **相机动效**: push-in

### glossary-term
- **required**: `term`, `definition`
- **optional**: `heading`, `visualProps`
- **默认强调色**: cyan
- **典型帧数**: 68 (enter 14 / emphasis 38 / exit 16)
- **相机动效**: push-in

### cta
- **required**: `heading`
- **optional**: `subtitle`, `badge`
- **默认强调色**: cyan
- **典型帧数**: 72 (enter 16 / emphasis 40 / exit 16)
- **相机动效**: push-in

## 动效系统

### 4 层动效架构 (motionGrammar.ts)

```
Layer 1: camera     — 全局镜头推拉/平移/缩放
Layer 2: layout     — 按 family 类型决定入场/驻留/退场动画
Layer 3: foreground — 前景特效（blur/glow/distortion/fog）
Layer 4: micro      — 微抖动（jitter）
```

### 6 种动画原语 (shotArchetypes.ts)

1. **useTextSlideIn** — 文字从指定方向滑入 (left/right/up/down)
   - Spring 弹性 (damping=200, stiffness=280)
   - 透明度渐显 (0→0.8→1)
   - 距离: 30px

2. **useScaleEmphasis** — 元素缩放弹入（带 overshoot）
   - 缩放: fromScale(0.8) → overshoot(1.06) → 0.97 → 1.0
   - Spring (damping=150, stiffness=260)

3. **usePulseAttention** — 持续脉冲缩放
   - 正弦波缩放: 1 ± amplitude(0.04)
   - 周期: 60 帧 (2s @ 30fps)

4. **useStaggerSlide** — 列表错峰滑入
   - 基于 useTextSlideIn，延迟 = index * staggerDelay
   - 默认 6 帧间隔

5. **useStaggerScale** — 列表错峰缩放
   - 基于 useScaleEmphasis，延迟 = index * staggerDelay
   - 默认 6 帧间隔

6. **useFloatMotion** — 持续浮动效果
   - 正弦波 Y 轴浮动: ±6px
   - 周期: 90 帧 (3s @ 30fps)

### 相机动效预设 (registry.ts)

| 预设 | 轴向 | 典型用途 |
|------|------|----------|
| drift | Y ±30px | 背景/装饰元素微微浮动 |
| push-in | scale 1→1.08 | 强调/聚焦/进入感 |
| pan-x | X -50→0px | 横向扫描 (rail/compare/timeline) |
| pan-y | Y ±60px | 纵向滚动 (list/evidence-wall) |
| zoom-pulse | scale 循环 | 数据强调/数字跳动 |
| growth | scale Y | 柱状图/流程节点/benchmark bar |
| none | — | 纯静态，无 camera motion |

### 前景特效

| 特效 | 适用家族 | 效果 |
|------|---------|------|
| vignette | evidence-wall, memory-graph | 暗角 |
| blur-edge | architecture-map, pipeline-flow | 边缘模糊 |
| glow | quote-highlight | 光晕 |

### 8 种过渡手法

| 手法 | 适用场景 |
|------|---------|
| fade | 情感柔和过渡 |
| lift | 新元素从下方滑入 |
| flash | 强调、节奏感强 |
| zoom-through | 镜头推入元素内部穿出 |
| clip | 圆形/多边形生长揭示 |
| flip | 3D 翻转 |
| wipe | 有色形状横扫揭示 |
| dissolve | 场景叠化 |

## 镜头语法系统 (shotGrammar.ts)

### 镜头原型 (ShotArchetype)

| 原型 | 说明 |
|------|------|
| lock-on reveal | 信息像被钉住一样出现 |
| pressure countdown | 数字像子弹一样打出来 |
| overtake race | 两列数据像在赛跑 |
| evidence pin | 事实像别针一样钉入画面 |
| threshold breach | 数字穿膜而出 |
| aftershock hold | 高潮后画面凝固在那里 |
| follow focus | 镜头跟随最重要的元素 |
| compress compare | 把两个东西压在一起比较 |
| drift reveal | 信息漂移入场 |
| bullet train | 连续多个数据依次高速轰出 |
| burst spread | 单点数据爆发成多个子数据 |
| trace flow | 数据流动画 |

## 别名与迁移

| 旧名称 | 新名称 | 说明 |
|--------|--------|------|
| memory-graph | architecture-map | 注册表别名，渲染时自动映射 |
| pipeline-flow | step-flow | 注册表别名，渲染时自动映射 |
