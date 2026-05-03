# Fast Pipeline — 标题/口播/分镜 快速生成管线

> 设计日期：2026-05-03
> 状态：设计稿

## 1. 目标

将 OpenClaw Remotion Video Pipeline 从当前 8-step 串行 LLM 架构（耗时数十分钟）重构为 3-step 精简架构，实现：

- **输入标题 → 全网搜索 → 爆款标题 → 口播稿文案 → 分镜文案**
- 单次运行耗时控制在 **1-3 分钟**
- 不破坏现有 `run-search-to-ultimate.mjs` 管线

## 2. 工程位置

新建独立脚本：

```
remotion-video/scripts/fast-pipeline.mjs
```

不修改现有 `pipeline.js`、`workflowGenerator.js`、`run-search-to-ultimate.mjs`。

输出目录：

```
projects/<projectId>/fast-pipeline/
├── step-1.json
├── step-2.json
├── step-3.json
└── result.json
```

## 3. 管线总览

```
输入标题
    ↓
Step 1: 搜索 + 分析          ← 1 次 LLM 调用
    ↓
Step 2: 爆款标题 + 口播稿     ← 1 次 LLM 调用
    ↓
Step 3: 分镜 + 视觉提示       ← 1 次 LLM 调用
    ↓
输出: result.json
```

总共 **3 次 LLM 调用**（原 6+ 次）。

## 4. 搜索机制

- 复用 `scripts/fetch-ddg-search.py`（DuckDuckGo HTML 爬虫）
- 只发 **1 次搜索请求**（原 4 次 query 去重合并）
- timeout 从 20s 降到 **10s**
- 失败时跳过搜索，LLM 靠知识库生成，标注 `search: "unavailable"`

## 5. 各 Step Schema

### Step 1 — 搜索 + 分析

```json
{
  "analysis": {
    "thesis": "核心命题（一句话）",
    "audience": "目标观众",
    "corePromise": "视频核心价值",
    "searchFacts": ["3-5 条搜索提炼的事实"]
  }
}
```

### Step 2 — 爆款标题 + 口播稿

```json
{
  "title": "最终选定的爆款标题",
  "titleAngle": "标题角度（结论先行/问题追问/反差拆解/解释型）",
  "script": {
    "hook": "开场句（1-2 句，抓注意力）",
    "body": [
      { "label": "段落 1 名称", "text": "段落文案" },
      { "label": "段落 2 名称", "text": "段落文案" },
      { "label": "段落 3 名称", "text": "段落文案" }
    ],
    "cta": "结尾号召/互动"
  }
}
```

### Step 3 — 分镜 + 视觉提示

```json
{
  "scenes": [
    {
      "id": "scene-01",
      "narration": "本镜头对应的口播文本",
      "visualDescription": "画面描述（中文，给导演看）",
      "visualPrompt": "视觉提示词（英文，给 AI 绘图用，16:9横版）",
      "sceneFamily": "hero|focus|compare-board|data-stream|cta",
      "durationSeconds": 8
    }
  ],
  "totalDurationSeconds": 60
}
```

## 6. LLM 调用细节

### 通用配置

| 参数 | Step 1 | Step 2 | Step 3 |
|------|--------|--------|--------|
| temperature | 0.5 | 0.6 | 0.55 |
| timeout | 60s | 90s | 90s |
| 重试次数 | 1 | 1 | 1 |

### Prompt 策略

- 首次生成：temperature 适中，强调稳定输出
- 重试时：temperature +0.2，强调"必须与上次不同"

每个 Step 的 prompt 只包含其自身需要的上下文，不携带其他步骤的完整 payload：

- Step 1: 搜索标题 + 搜索结果 → 分析
- Step 2: 分析结果 → 标题 + 口播稿
- Step 3: 标题 + 口播稿 → 分镜

去除现有架构中 Step 4 的无关字段（director/cameraMotion/enterFrames/comparisons 等）。

### LLM 后端选择

优先复用现有 `server/workflow/step123/llm.js` 的 `generateStructuredJson`，支持：
- OpenAI 兼容 API（`OPENAI_API_KEY` / `OPENAI_BASE_URL`）
- MiniMax（`MINIMAX_API_KEY`）
- OpenClaw 网关（默认 fallback）

## 7. 缓存与 Resume

- 每个 Step 完成后写 `projects/<projectId>/fast-pipeline/step-<N>.json`
- 相同 topic 再次运行时自动跳过已完成的步骤
- 通过 `--force` 参数强制重新生成某一步
- 缓存 key = hash(stepId + topic + 之前步骤 payload 摘要)

## 8. 错误处理

| 场景 | 行为 |
|---|---|
| 搜索超时/失败 | 跳过搜索，LLM 用知识库生成，标注 `searchStatus: "unavailable"` |
| Step 1 LLM 失败 | 重试 1 次；仍失败则报错退出 |
| Step 2 LLM 失败 | 重试 1 次；仍失败则报错退出，前一步结果保留 |
| Step 3 LLM 失败 | 重试 1 次；仍失败则报错退出，前两步结果保留 |
| Resume hash 不匹配 | 仅重新生成该步骤，不丢失其他步骤结果 |

## 9. 输出

### 控制台输出

每个步骤完成时打印结构化摘要：

```
=== Fast Pipeline ===
[Step 1/3] 搜索 + 分析  ... done (12.3s)
  命题: 核心命题一句话
  受众: 目标观众描述
[Step 2/3] 标题 + 口播稿 ... done (18.7s)
  标题: 爆款标题文字
  口播: hook → 3 段 → cta
[Step 3/3] 分镜 + 视觉   ... done (22.1s)
  场景数: 8
  总时长: 64s
=== 完成 (53.1s) ===
```

### 文件输出

`result.json` 包含完整的 3 步结果，可直接被下游 Remotion 渲染管线消费。

## 10. 和现有系统的关系

- **不修改现有代码**
- `result.json` 可被现有 `build-project-package.mjs` 和渲染管线消费
- 现有 `run-search-to-ultimate.mjs` 保持不变
- 新的 fast-pipeline 输出与 `project.json` 结构兼容

## 11. Skill 合并与整理

当前工程有 **3 个 .SKILL.md 文件** 和 **1 个 skillRegistry.js**，每个包含大量重复/过度的字段定义：

| 文件 | 现状 | 处理 |
|---|---|---|
| `docs/workflow-skills/video-pipeline-content.SKILL.md`（391 行） | Step 3 内容 skill，含 `mechanismDepth`、`directorBeats`、`storySpine` 等过度字段 | **废弃** — 其知识合并为 fast-pipeline Step 2 的内联 prompt |
| `docs/workflow-skills/video-pipeline-scene-planner.SKILL.md`（226 行） | Step 4 场景 skill，含 `directorBeats`、`templateCandidates`、`visual.props` | **废弃** — 其知识合并为 fast-pipeline Step 3 的内联 prompt |
| `docs/workflow-skills/video-pipeline-scene-prompts.SKILL.md`（102 行） | Step 5 视觉提示 skill，含过多 fields 对应关系 | **废弃** — 其知识合并为 fast-pipeline Step 3 的内联 prompt |
| `server/workflow/skillRegistry.js`（~400 行） | 8 个步骤的 Registry，含 `VIRAL_TITLE_*` 等模板 | 新管线 **不使用**，保留不动 |

### 合并方式

3 个 `.SKILL.md` 的核心知识（去 AI 味规则、爆款标题公式、sceneFamily 选择规则）直接写入 `fast-pipeline.mjs` 的 3 个 LLM prompt 中，不再作为独立文件维护。这样：

- 减少 3 个文件、~700 行碎片化内容
- prompt 和它所服务的 step 在一起，不会"定义在一边、执行在另一边"
- 去掉 `directorBeats`、`mechanismDepth`、`storySpine`、`templateCandidates` 等对"出文案和分镜"无用的字段

## 12. 去掉了什么（对比现有 Step 4 schema）

| 去掉的字段 | 原因 |
|---|---|
| `director.archetype` | 对文案/分镜无实际帮助 |
| `director.cameraIntent/Motion/enterFrames...` | 过度设计，实际渲染不用 |
| `comparisons` | 分镜阶段不需要 |
| `templateCandidates` | 固定用 Ultimate 模板 |
| `keywords` | 对下一步无影响 |
| `scriptBlockId/Label/SourceText` | 分镜阶段不需要精确行号 |
| `canvasRatio/Width/Height` | 固定 16:9 1920x1080 |
| `evidenceAnchor` | 分镜不需要引源 |
| `visualFocusZh/SummaryZh...` | 合并到 visualDescription 一个字段 |
