# DirectorScore 预览工具设计

> 设计文档 — 2026-05-04

## 概述

构建一个独立的 React 页面，可视化展示 DirectorScore（导演总谱）的多幕编排数据。内嵌 DeepSeek V4 示例数据，支持帧精确回放。无 Remotion Studio 依赖，但使用 `@remotion/player` 提供动画预览。

## 架构

**数据流：** 内嵌 `DEEPSEEK_V4_DIRECTOR_SCORE` → `scoreToSequences()` → `SequenceConfig[]` → React 组件树渲染（时间线预览）+ `@remotion/player`（动画回放）

Remotion Player 端数据流：`DirectorScore` → `scoreToSequences()` → `SequenceConfig[]` → `<DirectorScoreOrchestrator>` 包装为 Remotion `<Composition>` → `<Player>` 组件播放

**文件结构：**

```
src/tools/DirectorScorePreview.tsx     ← 根组件 + 页面挂载
src/tools/data.ts                       ← 内嵌示例 + scoreToSequences 编译
src/tools/remotion/
├── PreviewComposition.tsx              ← Remotion Composition 包装（接收 SequenceConfig[]）
└── registerPreview.ts                  ← 注册到 Remotion Studio（可选）
src/tools/components/
├── PreviewHeader.tsx                   ← 元数据 + 能量曲线色带
├── TimelinePanel.tsx                   ← 时间线容器（滚动、折叠控制）
├── ActTrack.tsx                        ← 单幕色带 + 可折叠 cue 轨道
├── CueTrack.tsx                        ← 单个 cue 横条（入场/持续/退场）
├── CameraPathChart.tsx                 ← 展开式 zoom/pan 曲线图
├── DetailPanel.tsx                     ← 右侧选中项属性面板
├── PreviewPlayer.tsx                   ← Remotion Player 包装（播放/暂停/进度控制）
└── TimelineFooter.tsx                  ← 缩放控件 + 时间标记列表
```

**技术栈：** React + TypeScript + `@remotion/player`，纯 CSS 样式（无第三方 UI 库），`tsx` CLI 启动。

## 页面布局

### 顶栏 (PreviewHeader)
- 左侧：标题「DirectorScore Preview · {score.id}」
- 右侧：帧数 · fps · 时长
- 能量曲线：4 色能量标签行（explosive=红 / high=橙 / moderate=黄 / calm=蓝）

### 主体 (TimelinePanel + DetailPanel / PreviewPlayer)
- 左侧 70%：时间线 — 每幕为独立色带区块，可折叠
  - 展开时显示该幕下所有 cue 的轨道横条
  - 每个 cue 横条用颜色编码类型（text=蓝 / shape=绿 / path=紫）
  - 退场段用灰色/红色标记
  - hover 显示 tooltip
  - 选中 shot 时，时间线底部展开 CameraPathChart，显示 zoom/pan 随帧变化曲线
- 右侧 30%：双标签面板（tab 切换）
  - **详情标签 (Details)** — 点击 cue 显示完整参数
    - 入场参数（enterAtFrame, enterDuration, animation, easing, spring）
    - 退场参数（exitAtFrame, exitDuration, animation, easing）
    - 循环动画 / 效果预设
    - 摄像机路径关键帧列表（同步于 CameraPathChart）
    - 验证状态
  - **预览标签 (Preview)** — Remotion Player 组件
    - 播放/暂停控制
    - 进度条 + 当前帧显示
    - 帧精确回放 DirectorScore 全片
    - 独立于 Remotion Studio 运行

### 底栏 (TimelineFooter)
- 缩放滑块
- 时间标记列表（timelineMarkers 中的 event/emphasis/transition）

## 颜色编码

| 数据 | 颜色 |
|------|------|
| act energy: explosive | `#ef4444` (红) |
| act energy: high | `#f97316` (橙) |
| act energy: moderate | `#eab308` (黄) |
| act energy: calm | `#3b82f6` (蓝) |
| cue type: text | `#3b82f6` (蓝) |
| cue type: shape | `#10b981` (绿) |
| cue type: path | `#8b5cf6` (紫) |
| cue exit segment | `#6b7280` (灰) |
| loop animation | `#f59e0b` (金) |

## 交互行为

- **点击 cue** → 右侧面板切换至"详情"标签，展示完整属性
- **点击 shot 标题栏** → 展开/收起该 shot 的摄像机路径图表 (CameraPathChart)
- **点击 act 标题栏** → 折叠/展开该幕所有轨道
- **hover cue 横条** → tooltip 显示 elementId + 帧范围
- **点击"预览"标签** → 右侧切换至 Remotion Player，自动加载当前选中的 DirectorScore
- **播放控制** → Player 提供播放/暂停、进度拖动、帧号显示

## 验证展示

详情面板底部显示该 DirectorScore 的验证结果：
- `✅ 验证通过` — 无错误
- `⚠️ {N} 个警告` + 列表 — 非致命问题（如轻微重叠）
- `❌ {N} 个错误` + 列表 — 致命问题（如超出边界）

## 非需求

以下功能被显式排除在 v1 范围外：
- 不接收外部 JSON 输入（仅内嵌示例）
- 不接入 Remotion Studio 或渲染管线
- 无导出/截图功能

## 参考

- `src/data/directorScore.ts` — DirectorScore 类型系统
- `src/data/generated/directorScoreSample.ts` — 内嵌示例数据
- `src/components/ultimate-kit/DirectorScoreOrchestrator.tsx` — Sequence 编排器（Player 内部使用）
- `@remotion/player` — 帧精确回放组件
