# Remotion 项目代码结构审查报告

> 审查时间：2026-04-26
> 审查范围：skill 开发体系、GitHub DevOps、项目架构

---

## 一、GitHub 相关项目开发 Skill 现状

### 1.1 已配置的 GitHub DevOps 组件

| 组件 | 路径 | 状态 | 说明 |
|------|------|------|------|
| CI 工作流 | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | ✅ 已配置 | Node.js 20 环境，含 release check |
| Issue 模板 | [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) | ✅ 已配置 | bug_report + feature_request |
| PR 模板 | [`.github/pull_request_template.md`](.github/pull_request_template.md) | ✅ 已配置 | 标准化 PR 说明 |
| CODEOWNERS | [`.github/CODEOWNERS`](.github/CODEOWNERS) | ⚠️ 待完善 | 当前为占位模板，未设置真实 owner |

### 1.2 CI/CD 流程分析

```yaml
触发条件：
  - push 到 main 分支
  - PR 合并到 main

环境要求：
  - Node.js 20
  - npm 缓存优化（基于 lock 文件）

执行步骤：
  1. npm run setup       # 安装 remotion-video + player-app 依赖
  2. npm run release:check  # 完整发布校验
```

**发布校验链路** (`npm run release:check`)：

1. `clean` - 清理运行时产物
2. `test` - 运行后端测试 (`node --test server/tests/*.test.js`)
3. `typecheck` - 三重类型检查
   - 前端：`npm --prefix video-pipeline-view/player-app run typecheck`
   - 后端 TypeScript：`npm --prefix remotion-video run typecheck`
   - 后端 JS 语法：`node --check` 检查 4 个核心文件
4. `build` - 前端构建
5. `release:render` - Remotion smoke 渲染
6. `release:verify` - 输出校验（时长、帧数）
7. `clean:runtime` - 运行时目录清洁检查

### 1.3 Skill 版本管理机制

核心注册表：[`remotion-video/server/workflow/skillRegistry.js`](remotion-video/server/workflow/skillRegistry.js#L26-L395)

```javascript
SKILL_DEFINITIONS = [
  { skillId, category, stepId, stepLabel, name, sourcePath, displaySummary,
    inputs, outputs, defaults, constraints, qualityRules, uiHints, evalRules }
]
```

**10 个 Skill 分类**：

| 分类 | Skill | 来源 | 状态 |
|------|-------|------|------|
| Step 1 | `video-pipeline-analysis` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Step 2 | `video-pipeline-title` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Step 3 | `video-pipeline-content` | 仓库内 `docs/workflow-skills/*.SKILL.md` | ✅ 统一管理 |
| Step 4 | `video-pipeline-scene-planner` | 仓库内 `docs/workflow-skills/*.SKILL.md` | ✅ 统一管理 |
| Step 5 | `video-pipeline-scene-prompts` | 仓库内 `docs/workflow-skills/*.SKILL.md` | ✅ 统一管理 |
| Step 6 | `video-pipeline-audio` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Step 7 | `remotion-video-maker` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Step 8 | `video-pipeline-video` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Meta | `video-pipeline-master` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |
| Meta | `video-pipeline-eval` | 用户目录 `~/.openclaw/skills/` | ⚠️ 需同步 |

> **⚠️ 关键区分**：Step 1/2 指向用户目录 skill，但执行链路为**代码驱动**（deterministic），skill 规范作为**有效合同**参与 prompt 构建和输出评估（见 [pipeline.js#L714](remotion-video/server/workflow/step123/pipeline.js#L714)、[pipeline.js#L783](remotion-video/server/workflow/step123/pipeline.js#L783)、[skillRegistry.js#L2009](remotion-video/server/workflow/skillRegistry.js#L2009)）。不是"skill 只是参考"，而是"代码驱动执行，但 skill 约束仍是有效合同"。

---

## 二、Skill 真源体系架构

### 2.1 核心设计模式

**双重来源策略**：

```javascript
// 策略 A：仓库内 Skill（Step 3/4/5）
sourcePath: path.join(WORKFLOW_SKILLS_DIR, 
  'video-pipeline-content.SKILL.md')

// 策略 B：用户目录 Skill（其他 Step）
sourcePath: path.join(HOME_DIR, '.openclaw', 'skills', 
  'video-pipeline-audio', 'SKILL.md')
```

**优势**：
- Step 3/4/5 与代码主线同步演进，避免漂移
- 其他 Step 保持灵活性，可本地定制

**风险**：
- 用户目录 Skill 可能与仓库代码脱节
- 缺少版本锁定和校验机制

### 2.2 Skill 生命周期

```javascript
// 加载流程
loadSkillSource(skillId)
  → 检查文件存在性
  → 检查 mtime 缓存
  → 读取内容并缓存

// 构建流程
buildSkillSpec(skillId)
  → 合并 frontmatter 元数据
  → 合并 defaults/constraints/qualityRules
  → 返回统一 SkillSpec

// 评估流程
enrichStepResult(stepId, payload, input)
  → normalizeStepXPayload()  // 数据归一化
  → evaluateStepX()          // 质量评估
  → 返回对齐结果 + 评估报告
```

### 2.3 Skill 评估体系

**6 维度评分**（Step 1-8 各有侧重）：

| 维度 | 说明 | 权重 |
|------|------|------|
| `relevance` | 相关性 | 高 |
| `clarity` | 清晰度 | 高 |
| `completeness` | 完整性 | 高 |
| `density` | 信息密度 | 中 |
| `compliance` | 合规性 | 中 |
| `diversity` | 多样性 | 中 |

**评分阈值**：

| 分数区间 | 状态 | 动作 |
|----------|------|------|
| ≥ 88 | PASS | 可进入下一阶段 |
| 74-87 | PASS_WARN | 提示警告，继续 |
| 56-73 | RETRY | 建议重试 |
| < 56 | FAIL | 硬阻断 |

---

## 三、GitHub 项目开发 Skill 改进建议

### 3.1 CODEOWNERS 完善

**当前问题**：`CODEOWNERS` 为占位模板，未设置真实代码所有者。

**建议方案**：

```bash
# .github/CODEOWNERS
# 默认 owner
* @your-github-id

# 按模块划分
/remotion-video/server/ @team/backend
/remotion-video/src/ @team/video-engineering
/video-pipeline-view/player-app/ @team/frontend
/.github/workflows/ @team/devops
/docs/ @tech-writers
```

### 3.2 GitHub Actions 增强

**当前缺失**：

| 能力 | 现状 | 建议 |
|------|------|------|
| 代码质量检查 | ❌ | 添加 ESLint/Prettier |
| 安全扫描 | ❌ | 添加 CodeQL |
| 依赖审计 | ❌ | 添加 npm audit |
| 自动生成 Release Note | ❌ | 配置 conventional commits |
| 预览环境部署 | ❌ | 添加 preview workflow |

**建议 CI 增强**：

```yaml
# .github/workflows/ci.yml 新增 job
lint:
  name: Lint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npm run lint
    - run: npm audit --audit-level=high

security:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: github/codeql-action/init@latest
      with: { languages: javascript-typescript }
```

### 3.3 Skill 版本管理

**问题**：用户目录 Skill 缺乏版本校验。

**建议方案**：

```javascript
// skillRegistry.js 新增
const SKILL_VERSION_MAP = {
  'video-pipeline-audio': { version: '2.1.0', required: true },
  'remotion-video-maker': { version: '1.5.0', required: true },
  // ...
};

function validateSkillVersion(skillId, sourceRaw) {
  const frontmatter = parseFrontmatter(sourceRaw);
  const expected = SKILL_VERSION_MAP[skillId];
  
  if (expected && semver.lt(frontmatter.version || '0.0.0', expected.version)) {
    return {
      valid: false,
      message: `Skill ${skillId} 需要 v${expected.version}，当前 v${frontmatter.version}`
    };
  }
  return { valid: true };
}
```

### 3.4 发布流程标准化

**当前流程**：`release:check` 触发 smoke test，但不自动发布。

**建议**：采用语义化版本和自动发布：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm run release:check
      - run: npm publish --dry-run
        env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
```

---

## 四、项目架构审查

### 4.1 分层架构

```
┌─────────────────────────────────────────────────────┐
│  前端工作台 (video-pipeline-view/player-app)        │
│  - React 19 + Zustand 状态管理                      │
│  - Tailwind CSS（未确认 shadcn/ui 组件体系）         │
│  - Step 1-8 UI + localStorage 持久化                 │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP API
┌───────────────────────▼─────────────────────────────┐
│  API / Worker (remotion-video/server)               │
│  - Express 5 REST API                              │
│  - Workflow Generator (Step 1-8 编排)               │
│  - Skill Registry (10 个 Skill 统一管理)            │
│  - Queue (BullMQ / FileQueue)                      │
│  - Worker (Render Worker)                          │
└───────────────────────┬─────────────────────────────┘
                        │ Remotion Runtime
┌───────────────────────▼─────────────────────────────┐
│  Remotion 运行时 (remotion-video/src)               │
│  - UltimateSceneTemplate (主 Composition)           │
│  - OpenClawVideo (辅助 Composition)                 │
│  - 20 模板系统 (hero/feature-rail/focus/...)        │
│  - 动画效果 (video-effects.tsx)                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 关键文件清单

| 文件 | 行数 | 职责 | 风险 |
|------|------|------|------|
| [`skillRegistry.js`](remotion-video/server/workflow/skillRegistry.js) | 2286 | Skill 注册、加载、评估 | ⚠️ 文件过大，建议拆分 |
| [`workflowGenerator.js`](remotion-video/server/workflow/workflowGenerator.js) | - | Step 1-8 编排生成器 | ✅ 职责清晰 |
| [`UltimateSceneTemplate.tsx`](remotion-video/src/compositions/UltimateSceneTemplate.tsx) | - | 20 模板场景渲染 | ✅ 核心渲染 |
| [`requestValidators.js`](remotion-video/server/validators/requestValidators.js) | - | API 请求验证 | ✅ 安全加固 |

### 4.3 Skill Registry 重构建议

**当前问题**：2286 行单文件，职责过重。

**Step 7 当前实现**：已收窄为 deterministic 的项目构建摘要层，核心产物是 `projectBuild`（含 projectPath、compositionId、buildStatus、renderCommand），不再是"自动生成 Remotion 项目"（见 [workflowGenerator.js#L1528](remotion-video/server/workflow/workflowGenerator.js#L1528)、[skillRegistry.js#L1888](remotion-video/server/workflow/skillRegistry.js#L1888)）。

**Step 8 当前实现**：主链路默认 `Ultimate + 1920x1080` 横版，但非 ultimate fallback 仍保留 9:16 竖屏预设（caption/split/fullscreen），不能写成"系统只剩横版"（见 [workflowGenerator.js#L981](remotion-video/server/workflow/workflowGenerator.js#L981)、[workflowGenerator.js#L1402](remotion-video/server/workflow/workflowGenerator.js#L1402)）。

**Step 6 当前实现**：运行时已硬锁到 `qwen-tts`（见 [voiceJob.js#L17](remotion-video/server/voice/voiceJob.js#L17)），`resolveEngine()` 无论输入什么都返回 `ACTIVE_ENGINE`，其他语音链路不应再被写成可选主线。

**建议拆分方案**：

```
server/workflow/
├── skillRegistry.js          # 导出接口，聚合导出
├── skills/
│   ├── definitions.js        # SKILL_DEFINITIONS 常量
│   ├── loader.js             # loadSkillSource()
│   ├── normalizers.js        # normalizeStep1-8Payload()
│   ├── evaluators.js         # evaluateStep1-8()
│   └── templates.js          # ULTIMATE_TEMPLATE_CATALOG
└── utils/
    ├── frontmatter.js        # parseFrontmatter()
    └── text.js               # safeString/compactText/tokenizeKeywords
```

---

## 五、行动清单

### 5.1 P0 - 必须完成

- [ ] 完善 `CODEOWNERS`，设置真实代码 owner
- [ ] 将用户目录 Skill（Step 1/2/6/7/8）迁移到仓库内 `docs/workflow-skills/`
  - **注意**：Step 1/2 为代码驱动执行，skill 作为有效合同参与 prompt 构建
  - **注意**：Step 7 已收窄为 deterministic 项目构建摘要，不是完整生成器
  - **注意**：Step 6 已硬锁到 qwen-tts，其他语音链路不再可选
- [ ] 添加 Skill 版本校验机制

### 5.2 P1 - 强烈建议

- [ ] CI 添加 ESLint/Prettier 检查
- [ ] CI 添加 npm audit 安全审计
- [ ] 添加 conventional commits 配置
- [ ] 重构 `skillRegistry.js`，拆分为多文件模块

### 5.3 P2 - 建议优化

- [ ] 配置 CodeQL 安全扫描
- [ ] 添加自动 Release Note 生成
- [ ] 添加 preview 环境部署 workflow
- [ ] 完善单元测试覆盖率

---

## 六、准确性问题修正记录

| # | 问题位置 | 原始描述 | 修正后 | 依据 |
|---|----------|----------|--------|------|
| 1 | 1.3 节 Skill 分类表 | "Step 1-5 仓库内统一管理" | "Step 1/2 仍指向用户目录，只有 Step 3/4/5 在仓库内" | [skillRegistry.js#L33](remotion-video/server/workflow/skillRegistry.js#L33)、[skillRegistry.js#L72](remotion-video/server/workflow/skillRegistry.js#L72) |
| 2 | 1.3 节描述 | "Step 1/2 基本靠代码，skill 只是参考" | "Step 1/2 为代码驱动执行，但 skill 约束仍是有效合同" | [pipeline.js#L714](remotion-video/server/workflow/step123/pipeline.js#L714)、[pipeline.js#L783](remotion-video/server/workflow/step123/pipeline.js#L783)、[skillRegistry.js#L2009](remotion-video/server/workflow/skillRegistry.js#L2009) |
| 3 | 4.3 节 Skill Registry 重构建议 | 未说明 Step 7 现状 | "Step 7 已收窄为 deterministic 项目构建摘要层" | [workflowGenerator.js#L1528](remotion-video/server/workflow/workflowGenerator.js#L1528)、[skillRegistry.js#L1888](remotion-video/server/workflow/skillRegistry.js#L1888) |
| 4 | 4.3 节 Skill Registry 重构建议 | 未说明 Step 8 现状 | "Step 8 默认横版，兼容保留竖屏 fallback" | [workflowGenerator.js#L981](remotion-video/server/workflow/workflowGenerator.js#L981)、[workflowGenerator.js#L1402](remotion-video/server/workflow/workflowGenerator.js#L1402) |
| 5 | 4.1 节分层架构 | "Tailwind CSS + shadcn/ui 组件" | "Tailwind CSS（未确认 shadcn/ui 组件体系）" | [player-app/package.json](video-pipeline-view/player-app/package.json) grep 无 shadcn |
| 6 | P1 行动清单 | "音频 skill 需要同步" | "Step 6 已硬锁到 qwen-tts，其他语音链路不再可选" | [voiceJob.js#L17](remotion-video/server/voice/voiceJob.js#L17) |

---

## 七、参考资源

- [Remotion Pipeline 开发指南](remotion-video/docs/remotion-pipeline-dev-guide.zh-CN.md)
- [Ultimate 20 模板审计](remotion-video/docs/ultimate-20-template-audit.zh-CN.md)
- [Architecture 文档](ARCHITECTURE.md)
- [Remotion 官方文档](https://www.remotion.dev/docs)

---

## 八、文档状态

> **修订状态**：v2（基于用户二审反馈修正关键描述错误）
>
> **可信度**：经代码真源验证，可作为团队开发基线参考
>
> **仍需持续验证项**：
> - Step 1/2 skill 与代码驱动链路的实际对齐度（需抽样跑测）
> - Step 7/8 非 ultimate fallback 的实际使用频率（建议从日志数据确认）
> - 前端 shadcn/ui 组件体系（建议实地检查 player-app 源码目录结构）
