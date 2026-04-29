# Remotion Pipeline 开发指南

> **本文档范围**：6 步主链路 + 可选 QA 支线
>
> **真源原则**：代码 > 测试 > 文档。用户目录 Skill 可能过时。

---

## 1. 当前系统总览

### 1.1 6 步主链路 + QA 支线

```
Phase 1  研究选题
  内部 step: 1
  输出: analysis + researchFacts + topicResearch

Phase 2  标题确认
  内部 step: 2
  输出: titles.options[] + selectedId + selectedReason

Phase 3  口播文案
  内部 step: 3
  输出: copy.brief + copy.outline[] + copy.hook/body/cta

Phase 4  分镜与视觉
  内部 step: 4, 5
  输出: shots[] + scenePlan + prompts.byShotId[]

  ── 可选 QA 支线（Phase 4 → Phase 5 之间）──
  QA branch: 生成静态分镜图，写入 qa/storyboard/
  不污染 public/assets/，不更新 project.json
  ─────────────────────────────────────────────

Phase 5  配音与时长
  内部 step: 6
  输出: voice.engine + voice.script[] + totalDuration

Phase 6  出片
  内部 step: 7, 8
  输出: projectBuild + render 参数
```

### 1.2 当前核心约束

- 默认渲染规格是 **`1920x1080 / 30fps`**
- Step 4 / 5 要对齐 `20` 个模板 family
- **语音链路当前只保留 `qwen-tts`**
- 图片生成默认开启（`--no-images` 关闭）

---

## 2. Step 真源链路

### 2.1 Step 1-2：代码主动兼容外部 Skill 合同

**不是"部分漂移"，而是"代码在接管执行 + 兼容对齐 + 二次 enrich"：**

- 代码主导执行流程
- `ensureStepSkillReady(stepId)` 是运行时依赖
- 外部 skill 合同仍在生效，参与 prompt、defaults、evaluation
- 代码会主动补 `searchPhase / multiAngleExploration / keyDataPoints / sources`
- 然后拿这些字段做评估

**证据：**
- [skillRegistry.js:L783-L810](file:///Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L783) - 主动补字段
- [skillRegistry.js:L2014-L2049](file:///Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L2014) - 用这些字段做评估

### 2.2 Step 3-5：仓库内 Skill 基本对齐

| Skill | 状态 |
|-------|------|
| `video-pipeline-content` | ✅ 基本对齐 |
| `video-pipeline-scene-planner` | ✅ 基本对齐 |
| `video-pipeline-scene-prompts` | ✅ 基本对齐 |

### 2.3 Step 6：唯一有效主链路 qwen-tts

- 外部 audio skill 明显过时（还在写 edge-tts/melo）
- 真源在 `voiceJob.js`

### 2.4 Step 7：语义已被代码收窄

**不是"明确过时 ❌"，而是"语义过宽，已被代码收窄"：**

- 外部 skill 保留了旧时代"生成完整 Remotion 项目并可自动渲染"的宽职责
- 当前代码已把它收窄为项目构建适配摘要层
- 只产出 `projectBuild` 摘要和 `renderCommand`
- deterministic 路径，不走 LLM

**证据：**
- [skillRegistry.js:L1888-L1912](file:///Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/skillRegistry.js#L1888) - 只产出 projectBuild + renderCommand
- [workflowGenerator.js:L1528-L1548](file:///Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/workflowGenerator.js#L1528) - deterministic 路径

### 2.5 Step 8：横版是 Default，竖屏仅作兼容

**横版只是 default，不是唯一模板尺寸：**

- 当前主生产链路默认是 `Ultimate + 1920x1080` 横版
- 非 ultimate 模板仍保留竖屏参数兼容
- 竖屏不再是主生产链路

**证据：**
- [workflowGenerator.js:L986-L999](file:///Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/workflow/workflowGenerator.js#L986) - ultimate 默认 1920x1080
- 非 ultimate 仍有竖屏 fallback

---

## 3. Ultimate 20 模板系统

### 3.1 核心概念

**当前真实逻辑：**
1. 第一屏固定 `hero`
2. 最后一屏固定 `cta`
3. 中间镜头先收集候选模板
4. 再做一次整条视频级别的全局分配
5. 短视频里优先让中段镜头尽量不重复

### 3.2 20 模板 Family

| 模板 | 定位 | 固定规则 |
|------|------|----------|
| `hero` | 开场封面 | 第一屏固定 |
| `cta` | 结束页 | 最后一屏固定 |
| `terminal` | 终端日志窗 | 中段优先 |
| `data-stream` | 实时流面板 | 中段优先 |
| `benchmark-chart` | 跑分图 | 中段 |
| `timeline` | 时间轴 | 中段 |
| `compare-board` | 左右对照 | 中段 |
| `number-strip` | 反转卡 | 中段 |
| `evidence-wall` | 证据墙 | 中段 |
| `code` | JSON/schema 面板 | 中段 |
| `architecture-map` | 拓扑图 | 中段 |
| `memory-graph` | 知识图谱 | 中段 |
| `pipeline-flow` | 阶段管线 | 中段 |
| `step-flow` | 步骤流 | 中段 |
| `feature-rail` | 2x2 四卡拆解 | 中段 |
| `metrics` | 大数字与指标条 | 中段 |
| `tag-matrix` | 模块+标签带 | 中段 |
| `focus` | 单概念聚焦 | 中段 |
| `quote-highlight` | 大字金句 | 中段 |
| `glossary-term` | 术语解释卡 | 中段 |

### 3.3 命中优先级

```
terminal → data-stream → benchmark-chart → timeline → compare-board 
→ number-strip → evidence-wall → code → memory-graph → architecture-map 
→ pipeline-flow → step-flow → glossary-term → feature-rail → metrics 
→ tag-matrix → quote-highlight → focus
```

### 3.4 核心代码入口

| 文件 | 用途 |
|------|------|
| `scripts/lib/ultimate-project-adapter.js` | 自动命中规则 |
| `scripts/lib/ultimate-outline-compiler.mjs` | Outline 编译 |
| `src/components/ultimate-kit/project.ts` | 类型定义 |

---

## 4. 完整目录结构

### 4.1 Server 层

```
remotion-video/server/
├── workflow/                      # Step 1-8 工作流核心
│   ├── skillRegistry.js           # Skill 注册表
│   ├── workflowGenerator.js       # 主入口
│   ├── workflowJobStore.js        # 任务存储
│   └── step123/                  # Step 1-3
│       ├── pipeline.js            # Step 1-3 编排
│       ├── llm.js                # LLM 调用
│       ├── quality.js             # 质量校验
│       ├── step3SkillDriver.js    # Step 3 文案
│       ├── technicalTopic.js      # 技术选题
│       ├── context.js             # 上下文构建
│       ├── normalizers.js         # 数据标准化
│       └── errors.js              # 错误定义
├── voice/                        # qwen-tts 语音引擎
│   ├── voiceJob.js               # 语音任务
│   └── qwenTtsClient.js          # TTS 客户端
├── workers/                      # 渲染 Worker
│   └── renderWorker.js
├── queue/                        # 队列
│   ├── fileQueue.js
│   └── renderQueue.js
├── security/                     # 安全层
│   └── apiSecurity.js            # API 安全验证
├── validators/                    # 验证层
│   └── requestValidators.js       # 请求验证
├── config/                       # 配置层
│   └── runtimePaths.js            # 运行时路径
├── api/                          # API
│   └── server.js
├── utils/                        # 工具层
│   └── logger.js                 # 日志工具
├── subtitles/                     # 字幕
│   └── deepgramSubtitles.js
└── tests/                        # 测试
    ├── workflowContentPipeline.test.js
    ├── workflowScenePlanner.test.js
    ├── workflowTechnicalContracts.test.js
    ├── workflowVoiceDefaults.test.js
    ├── voiceJob.test.js
    ├── qwenTtsClient.test.js
    └── ...
```

### 4.2 渲染层 (src/)

```
remotion-video/src/
├── Root.tsx                              # 根入口
├── OpenClawVideo.tsx                     # 主合成
├── compositions/                         # 合成组件
│   ├── FileBackedUltimateSceneTemplate.tsx  # 文件回放型
│   └── UltimateElementsLibrary.tsx
├── components/
│   └── ultimate-kit/                     # Ultimate 20 模板系统
│       ├── UltimateElements.tsx          # 20 模板实现
│       ├── UltimateSceneTransition.tsx
│       ├── project.ts                    # 类型定义
│       └── types.ts
├── content/                              # 内容到渲染桥接层
│   └── ShotRenderer.tsx                  # ⚠️ 关键桥接
├── render/                               # 渲染注册层
│   └── iconRegistry.tsx                  # 图标注册
└── ...
```

### 4.3 脚本与适配器

```
remotion-video/
├── docs/
│   ├── workflow-skills/                 # 仓库内 Skill
│   │   ├── video-pipeline-content.SKILL.md
│   │   ├── video-pipeline-scene-planner.SKILL.md
│   │   └── video-pipeline-scene-prompts.SKILL.md
│   ├── ultimate-20-template-audit.zh-CN.md       # 20 模板审计
│   ├── ultimate-elements-atlas.zh-CN.md          # 元素命中总表
│   ├── ultimate-style-hit-guide.zh-CN.md        # 风格命中手册
│   ├── ultimate-20-template-cheatsheet.zh-CN.md # ⚠️ 模板速查索引
│   ├── ultimate-workflow.zh-CN.md
│   └── qwen-tts-bailian.zh-CN.md
├── scripts/
│   ├── lib/
│   │   ├── ultimate-project-adapter.js        # 核心适配器
│   │   ├── ultimate-outline-compiler.mjs      # Outline 编译
│   │   ├── ultimate-scene-config.mjs
│   │   └── workflow-voice-defaults.mjs
│   ├── run-search-to-ultimate.mjs             # 主入口脚本
│   └── render-ultimate-scene.mjs
└── public/assets/voice/                       # TTS 输出
```

---

## 5. 真源文件索引

| 主题 | 真源文件 |
|------|----------|
| Step 1-3 编排 | `server/workflow/step123/pipeline.js` |
| LLM provider | `server/workflow/step123/llm.js` |
| Step 3 文案驱动 | `server/workflow/step123/step3SkillDriver.js` |
| Step 1/3 校验 | `server/workflow/step123/quality.js` |
| Skill 注册 | `server/workflow/skillRegistry.js` |
| 渲染 | `server/workflow/workflowGenerator.js` |
| 语音引擎 | `server/voice/voiceJob.js` |
| API 安全 | `server/security/apiSecurity.js` |
| 请求验证 | `server/validators/requestValidators.js` |
| 运行时配置 | `server/config/runtimePaths.js` |
| 日志 | `server/utils/logger.js` |
| 渲染 Worker | `server/workers/renderWorker.js` |
| Ultimate 适配器 | `scripts/lib/ultimate-project-adapter.js` |
| Outline 编译 | `scripts/lib/ultimate-outline-compiler.mjs` |

---

## 6. Skill 状态分类

### 6.1 必须同步重写

| Skill | 问题 |
|-------|------|
| `video-pipeline-master` | 旧时代结构，讲 Step 1-7 编排 |
| `video-pipeline-audio` | edge-tts/melo，已是 qwen-tts |
| `video-pipeline-video` | 竖屏默认，已是 1920x1080 |
| `remotion-video-maker` | 语义过宽，已被代码收窄 |

### 6.2 部分校准即可

| Skill | 漂移点 |
|-------|--------|
| `video-pipeline-analysis` | `multiAngleExploration` 扩展结构 |
| `video-pipeline-title` | `selectedIndex` → `selectedId` |

### 6.3 仓库内（基本对齐）

| Skill | 状态 |
|-------|------|
| `video-pipeline-content` | ✅ |
| `video-pipeline-scene-planner` | ✅ |
| `video-pipeline-scene-prompts` | ✅ |

---

## 7. 最终结论

> **Step 3-5**：仓库内 skill 与当前代码主线基本对齐，Ultimate 20 模板系统是当前渲染核心。
>
> **Step 1-2**：不是纯代码链路，外部 skill 合同仍参与 prompt、defaults、evaluation；代码在主动兼容和收敛它们。
>
> **Step 6**：当前唯一有效语音主链路是 `qwen-tts`，外部 audio skill 已明显过时。
>
> **Step 7**：当前是 deterministic 的项目构建适配摘要层，旧 skill 的"自动建项目并直接渲染"语义已不再是主线。
>
> **Step 8**：当前主生产链路默认是 `Ultimate + 1920x1080` 横版；竖屏参数仅作为兼容分支保留。
>
> **真实结构审查**：必须同时覆盖 workflow、security、validators、queue、worker、adapter、render bridge，不能只看生成逻辑。

---

## 8. 下一步行动

| 优先级 | 行动 |
|--------|------|
| P0 | 重写 video-pipeline-audio/video/maker/master |
| P1 | 部分校准 video-pipeline-analysis/title |
| P1 | 基于代码真源同步更新开发文档 |
| P2 | 建立 Skill 版本校验机制 |
