# Video Factory Console 前端重新设计

## 概述

将现有的 VideoFactoryConsole.tsx（660 行单文件）+ DirectorScorePreview.tsx（87 行）合并为一个统一的专业视频工作室界面。采用 DaVinci Resolve 风格的标签式面板布局，暗色专业影视主题，集成可交互的 DirectorScore 时间线。

## 布局架构

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar: Logo | 项目路径 | Status | 帧信息 | 渲染按钮          │ 44px
├────┬─────────────────────────────────────────────────────────┤
│    │  Left Panel (240px)     │  Center (flex)   │  Right (280px)│
│ I  │  ┌────────────────────┐│  ┌──────────────┐│  ┌──────────┐│
│ c  │  │ 制作流程 7 步      ││  │ Tab: 文案/   ││  │ ▶ 预览   ││
│ o  │  │ ✓ Brief            ││  │ 分镜/配音    ││  │ [Player] ││
│ n  │  │ ✓ 口播             ││  │              ││  │          ││
│    │  │ ● 素材检查 (进行中) ││  │ 主题输入     ││  ├──────────┤│
│ n  │  │ 4 配音/字幕        ││  │ 脚本编辑器   ││  │ Bento QA ││
│ a  │  │ 5 分镜编排         ││  │              ││  │ grid     ││
│ v  │  │ +2 步              ││  │ 操作按钮     ││  ├──────────┤│
│    │  ├────────────────────┤│  │              ││  │ 场景列表 ││
│ 40 │  │ AI 建议条          ││  │              ││  │ mini     ││
│ px │  └────────────────────┘│  └──────────────┘│  └──────────┘│
├────┴─────────────────────────────────────────────────────────┤
│  Timeline: 分镜时间线 (Act/Scene/Cue 三层渐进披露)              │
│  [Ruler 0-240f] [Playhead ▸] [⬤ 爆发 ⬤ 高能 ⬤ 温和 ⬤ 平静]   │
│  ▾ Act 1 开场 (爆发)   [opening] [hook] [icon]               │
│  ▾ Act 2 展开 (高能)   [structure] [compare] [commands]      │
│  ▾ Act 3 收束 (温和)   [tags] [takeaway]                     │
└──────────────────────────────────────────────────────────────┘
```

### 区域说明

| 区域 | 尺寸 | 内容 |
|------|------|------|
| Topbar | 44px | Logo, 项目路径, 执行器状态, 帧信息, 渲染按钮 |
| 图标导航 | 40px | 📝制作 🎬预览 📊分镜 🗂️资产 ⚙️设置 |
| 左栏 | 240px | 7 步制作流程 (步骤编号/状态/进度条), AI 建议条 |
| 中栏 | flex | Tab 切换 (文案/分镜/配音), 主题输入, 脚本编辑器, 操作按钮 |
| 右栏 | 280px | 视频预览, Bento QA 状态 (Check/Still/MP4/DS), 场景迷你列表 |
| 底部时间线 | auto | Act 折叠行, Scene 分段, Cue 详情, 播放头, 缩放控制 |

## 视觉设计

### 配色系统

**深色专业影视主题**（碳纤维质感）

```
背景层级:
  bg-deep     #07080a   最深层，时间线底色
  bg-base     #0b0d11   主背景
  bg-surface  #111318   面板卡片
  bg-elevated #181b22   导航栏/表头
  bg-hover    #1e2130   悬停态

边框:
  border-subtle  #1e2130
  border-default #282c3a
  border-accent  #363b4a

文字:
  text-primary   #e8eaed
  text-secondary #9aa0ab
  text-muted     #5c6270

强调色:
  accent-blue   #3b82f6  主操作
  accent-indigo #6366f1  渐变搭配
  accent-amber  #f59e0b  警告
  accent-green  #22c55e  成功
  accent-red    #ef4444  错误

能量色彩系统:
  explosive  #ef4444  爆发 (Act 1)
  high       #f97316  高能 (Act 2)
  moderate   #eab308  温和 (Act 3)
  calm       #22c55e  平静
```

### 字体

- system-ui 系统堆栈
- 大小层级: 6px(时间线标签) / 8px(辅助) / 10px(正文) / 12px(标题) / 14px(品牌)

### 圆角

- 按钮/输入: 6px
- 面板卡片: 8px
- 时间线分段: 3px
- 大容器: 10px

## 组件树

```
App
├── Topbar
│   ├── Logo
│   ├── Breadcrumb (Projects / deepseek-v4)
│   ├── StatusIndicators (Executor, FrameInfo)
│   └── RenderButton
├── IconNav (📝🎬📊🗂️⚙️)
├── MainContent (flex row)
│   ├── LeftPanel
│   │   ├── FlowSteps (7 steps, numbered/checked/active/pending)
│   │   ├── StepProgressBar (current step progress)
│   │   └── AiSuggestionBar
│   ├── CenterPanel
│   │   ├── SubTabBar (文案/分镜/配音)
│   │   ├── ScriptEditor
│   │   │   ├── ThemeInput
│   │   │   ├── TextArea
│   │   │   └── ActionButtons (优化/朗读/生成分镜)
│   │   └── SceneMetadataPanel (conditional)
│   └── RightPanel
│       ├── PreviewArea
│       │   ├── RemotionPlayer
│       │   ├── FrameCounter
│       │   └── FullscreenToggle
│       ├── QaBentoGrid
│       │   ├── CheckCard
│       │   ├── StillCard
│       │   ├── Mp4Card
│       │   └── DirectorScoreCard
│       └── SceneMiniList
└── TimelineDock
    ├── TimelineHeader
    │   ├── Title/FrameInfo
    │   ├── EnergyLegend
    │   └── Controls (Expand/Zoom/Snap)
    ├── TimelineRuler
    │   ├── TickMarks (every 30f)
    │   └── Playhead
    ├── ActTrack (×3, collapsible)
    │   ├── ActHeader (name/energy/label/duration)
    │   └── SceneSegments (clickable bars)
    │       └── CueDetail (expandable on click)
    └── CueLayerRow (element-level tracks)
```

## 时间线交互

### 数据模型

```typescript
interface DirectorScore {
  acts: Act[]
  totalFrames: number
  fps: number
}

interface Act {
  id: string
  name: string
  energy: 'explosive' | 'high' | 'moderate' | 'calm'
  startFrame: number
  duration: number
  scenes: Scene[]
}

interface Scene {
  id: string
  name: string
  family: string
  startFrame: number
  duration: number
  cues: Cue[]
}

interface Cue {
  id: string
  name: string
  type: 'text' | 'shape' | 'icon' | 'container'
  startFrame: number
  duration: number
  easing: string
  effects: string[]
  payload?: Record<string, unknown>
}
```

### 交互状态

| 操作 | 效果 |
|------|------|
| 点击 Topbar 渲染按钮 | 触发渲染流程 |
| 点击图标导航标签 | 切换工作区 (制作/预览/分镜/资产/设置) |
| 点击流程步骤 | 跳转到对应步骤界面 |
| 点击 AI 建议条 | 展开 AI 建议面板 |
| 点击场景分段 | 高亮该分段，显示 Cue Detail |
| 展开/折叠 Act | 切换 Act 行内容显示 |
| 点击"预览此段" | 跳转预览到该帧范围 |
| 拖动播放头 | 实时更新预览帧 |
| 缩放 +/- | 时间线缩放 |

### 空状态

- 无项目时: 引导创建项目
- 场景列表为空: "暂无场景，请先生成文案"
- QA 待处理: "等待处理完成"
- 时间线无数据: "暂无分镜数据"

### 加载状态

- 骨架屏: 面板加载时显示灰色骨架
- 时间线加载: 脉冲动画占位
- 预览加载: spinner + "渲染中..."

### 错误状态

- 执行器离线: Topbar 状态变红
- 渲染失败: Toast 通知 + QA 卡片变红
- 素材缺失: 步骤标记警告，显示缺失列表

## 实现计划

### 阶段 1：基础结构

1. 创建新的目录结构 `src/tools/console/`，拆分如下组件
2. 从零实现设计系统 tokens（CSS 自定义属性）
3. 实现 Topbar + IconNav + 三栏布局框架

### 阶段 2：面板内容

4. FlowSteps 组件（7 步流程，状态机）
5. ScriptEditor（Tab 切换 + 编辑区域）
6. PreviewArea + QaBentoGrid

### 阶段 3：时间线

7. DirectorScore 数据模型迁移
8. TimelineDock（Ruler + ActTrack + SceneSegments）
9. 交互集成（点击高亮 + Preview联动 + 播放头）

### 阶段 4：集成

10. 合并现有 VideoFactoryConsole 数据流和 API 调用
11. 移除旧 CSS 和 DirectorScorePreview 独立页面
12. 端到端测试

### 非目标

- 拖拽面板（方案 B 的特性，留给后续迭代）
- 多用户协作
- 移动端适配（仅桌面 1280px+）

## 参考

- 当前实现: `src/tools/VideoFactoryConsole.tsx`
- 当前时间线: `src/tools/DirectorScorePreview.tsx`
- 当前样式: `src/tools/global.css`
- 当前组件: `src/tools/components/` (ActTrack, CueTrack, TimelinePanel 等)
- 设计 tokens: `src/styles/design-tokens/`
