---
name: video-pipeline-content
step: 3
owner: repo
version: 3.2
---

# Step 3 内容生成 Skill（v3.2）

你负责把已确认标题、分析结论和搜索事实，写成可以直接进入 Step 4 的中文口播内容合同。

## 当前工程真源

- Prompt 真源：当前这份 `remotion-video/docs/workflow-skills/video-pipeline-content.SKILL.md`
- 运行时驱动：`remotion-video/server/workflow/step123/step3SkillDriver.js`
- Step 3 对齐与补齐：`remotion-video/server/workflow/skillRegistry.js`
- 落盘位置：`remotion-video/projects/<projectId>/steps/step-03.json`

## 下游硬消费字段

当前工程不是“写完一篇口播稿就结束”，Step 3 的结构会直接喂给 Step 4 / Step 5：

- Step 4 场景编排直接消费：
  - `copy.outline[]`
  - `copy.body[]`
  - `copy.body[].sceneIntent`
  - `copy.body[].evidenceAnchor`
  - `copy.body[].keywords`
  - `copy.body[].dataPoints`
  - `copy.body[].mechanismDepth.visualHint`
- Step 5 视觉提示词会继续回指：
  - `scriptExcerpt`
  - `sceneIntent`
  - `storyboardCueZh`
  - `dataPoints`

所以这里的 `sceneIntent / evidenceAnchor / keywords / dataPoints / mechanismDepth`
都不是装饰字段，而是当前工程的分镜真源。

## 输入规格

**Step 1 和 Step 2 必须同时就绪，才进入 Step 3。两者缺一不可。**

| 字段 | 必填 | 来源 | 说明 |
|------|------|------|------|
| `analysis.thesis` | ✅ | Step 1 | 主命题 |
| `analysis.audience` | ✅ | Step 1 | 目标受众 |
| `analysis.corePromise` | ✅ | Step 1 | 核心承诺 |
| `analysis.keyDataPoints[]` | ✅ | Step 1 | 搜索事实锚点 |
| `analysis.researchFacts[]` | ✅ | Step 1 | 原始事实与证据来源 |
| `title.selectedTitle` | ✅ | Step 2 | 已确认标题 |
| `title.titleKeywords[]` | ✅ | Step 2 | 标题关键词 |
| `title.score` | ✅ | Step 2 | 标题评分 |

---

## 目标时长

约800-1000字（2-4分钟口播稿，按每分钟200字标准语速）

Hook（18-40字）

Body（4-5块，每块3-5句）

---

## 完整输出结构

```json
{
  "copy": {
    "brief": {
      "hookAngle": "Hook角度描述",
      "tone": "口语化短句，像真人拆重点",
      "pacing": "硬事实快速推进，每块要有数据或具体能力点",
      "ctaIntent": "CTA意图描述",
      "techDepth": "shallow | medium | deep（技术讲解深度）"
    },
    "hook": "Hook（18-40字，1-2句）文案",
    "hookMeta": {
      "title": "对应的标题原文",
      "score": 92,
      "keywords": ["标题关键词1", "关键词2"],
      "hookStyle": "Hook风格描述"
    },
    "outline": [
      {
        "id": "copy-outline-N",
        "label": "块标签",
        "type": "fact-hammer | tech-mechanism | capability | comparison | scenario | cta",
        "beat": "节拍描述",
        "goal": "本块要达到的目标",
        "evidenceAnchor": "证据锚点",
        "sceneIntent": "中文场景意图描述（Step 4 消费此字段）",
        "transitionToNext": "承接到下一块的过渡语（建议输出，非必须）",
        "mustInclude": ["必须包含的点1", "点2"],
        "keywords": ["关键词1", "关键词2"]
      }
    ],
    "body": [
      {
        "id": "copy-N",
        "label": "块标签",
        "type": "fact-hammer | tech-mechanism | capability | comparison | scenario | cta",
        "text": "正文（2-4句为一单元）",
        "sceneIntent": "中文场景意图（直接抄自 outline.sceneIntent）",
        "evidenceAnchor": "证据锚点（与 outline 一致）",
        "transitionToNext": "承接到下一块的过渡语（建议输出）",
        "keywords": ["关键词1", "关键词2"],
        "dataPoints": ["具体数字或事实1", "事实2"],
        "mechanismDepth": {
          "level": "shallow | medium | deep",
          "explains": "WHAT | HOW | WHY",
          "technicalTerms": ["术语1", "术语2"],
          "analogy": "生活化类比（可选，用于把复杂技术讲简单）",
          "visualHint": "Step4视觉提示：曲线图/流程图/数据流/对比图"
        }
      }
    ],
    "cta": "CTA文案（互动型或关注型）",
    "ctaMeta": {
      "intent": "CTA意图",
      "style": "互动型 | 关注型 | 情绪引导型"
    },
    "totalChars": 820,
    "readingTime": 245,
    "keywords": ["词1", "词2"],
    "titleAlignment": {
      "selectedTitle": "已确认标题原文",
      "titleKeywords": ["标题拆出的词"],
      "matchedKeywords": ["在正文中出现的词"],
      "missingKeywords": ["在正文中缺失的词"],
      "score": 50
    },
    "storySpine": {
      "openingPromise": "开场承诺句",
      "mainClaim": "核心主张",
      "audience": "受众关心什么",
      "sceneIntents": ["场景意图1", "场景意图2", "场景意图3"],
      "closingMove": "收尾动作"
    },
    "coverage": {
      "bodyBlockCount": 4,
      "evidenceAnchors": ["证据1", "证据2"],
      "keywordCount": 10,
      "matchedKeywordCount": 3,
      "targetDurationSeconds": 240,
      "estimatedSceneCount": 12,
      "hasTechMechanism": true
    }
  }
}
```

---

## Body 块类型（5种，必须用 4-5 种）

| 块 | type | 核心要求 |
|----|------|---------|
| 块1 | `fact-hammer` | 结论先行，抛出数字锚点 |
| 块2 | `tech-mechanism` | **技术原理解析（新增，必须有）** |
| 块3 | `capability` | 硬事实+能力，不能只写"很强" |
| 块4 | `comparison` | benchmark分数，明确vs旧版/竞品差异 |
| 块5（可选） | `scenario` | 具体人群+具体场景+具体影响 |

**技术类内容（AI/模型/代码类）必须包含 `tech-mechanism` 块，不得用 capability 块替代。**

---

## tech-mechanism 块写作规范

这是技术类内容的核心层。位置在 fact-hammer 之后、capability 之前。

### 技术讲解 Prompt 模板

```
"你刚才说了"62%"，那这个62%到底是怎么测出来的？
SWE-bench 考的不是你背答案，是你能不能把一个真实issue关掉。
AI要过这关，得先读懂代码库——这就是为什么200K上下文是关键。"
```

### 写作要求

每个 tech-mechanism 块必须满足以下之一：

- **HOW型**：XXX是怎么实现的（不能只说"很强"）
- **WHY型**：为什么XX%能代表真实能力（解释benchmark机制）
- **MECHANISM型**：关键部件是怎么工作的（类比要生活化）

### 结构模板（3句展开）

```
第1句：抛出技术术语或数字（锚点）
第2句：解释机制/原理（核心，2-3种选择之一）
  - "这个数字是怎么测出来的？"
  - "它是怎么做到的？"
  - "为什么这个能力是突破？"
第3句：类比（把复杂技术用生活化例子讲清楚）
```

### mechanismDepth 字段说明

| level | 含义 |
|-------|------|
| `shallow` | 只说WHAT，不解释原理（不推荐） |
| `medium` | 说了HOW，用了类比 |
| `deep` | 说了HOW+WHY，有benchmark机制解析 |

Step 4 visualHint 映射：

- HOW型 → `data-stream` / `architecture-map`
- WHY型 → `benchmark-chart` / `terminal`
- MECHANISM型 → `flow-chart` / `pipeline-flow`

## 项目结构约束

- 当前 Step 4 已切到 `Ultimate 20 family`，不是旧 `固定 6 镜头 storyboard`
- 不要输出“像海报一样的标题总结文”，要输出能被分镜继续拆开的口播块
- 如果一个正文块没有事实、机制、关键词或数据点，后续 `storyboardLoader` 和 `UltimateSceneTemplate` 会变虚
- 这份文案最终要服务：
  - `remotion-video/src/data/storyboardLoader.ts`
  - `remotion-video/src/data/registry.ts`
  - `remotion-video/src/compositions/UltimateSceneTemplate.tsx`

### 类比库（可直接用）

| 技术点 | 类比 |
|--------|------|
| 200K上下文 | "相当于把整个图书馆的书一次读完再写摘要" |
| AI agent | "不是帮你订外卖，是直接帮你吃完" |
| SWE-bench | "相当于AI去真实公司实习，通过了才能毕业" |
| benchmark | "不是考试，是真刀真枪上项目" |
| 上下文窗口 | "短上下文是看照片写影评，长上下文是看电影写剧本" |

---

## sceneIntent 字段说明（重要）

**Step 4 实际消费的是中文描述，不是视觉类型枚举。**

sceneIntent 格式：「让观众理解XXX」「让程序员知道YYY」
示例：「让程序员理解这从问答工具升级为任务执行者」

不要写：`fullscreen | split-screen | hud-overlay | timeline`

这些视觉类型由 Step 4 根据 body 块的 dataPoints / comparisons / keywords 自行判断。

---

## CTA 类型（必须用一种）

**互动型（优先）：**
- "评论区告诉我你最想拆哪一层"
- "你更关心 benchmark 还是工程落地？"

**关注型：**
- "关注我，下一条继续往实战里拆"
- "觉得这期有用的，转给你也在盯这件事的朋友"

**情绪引导型：**
- "看完我沉默了，你呢？"
- "扎心了吗？点赞告诉我"

**禁止：** 感谢观看型（"感谢观看"等）

---

## P0 DeAI 量化检测（硬拦截）

### AI词汇黑名单（出现即 FAIL）

```
赋能、迭代、显著提升、全方位、多维度、系统性、值得关注、
不得不说、不得不承认、本质上、显而易见、毋庸置疑、赋能、
构建、打通、做深做透、全方位的、多维度的、立体化的
```

### 三段式识别（≥1处即 FAIL）

检测 `A、B和C` 结构，如"高效、便捷、安全"
允许出现 1 处，多于 1 处 FAIL

### 空洞词（出现即 FAIL）

```
翻倍、碾压、大幅提升、压力变大、效率提升（不说具体数字）
```

### 自检清单（全部通过才可输出）

```
[ ] Hook ≤ 2句，18-40字
[ ] AI词汇黑名单 0处
[ ] 三段式套话 ≤ 1处
[ ] 空洞词 0处
[ ] 无"不只是…更是…"空模板
[ ] 无"不得不说/不得不承认"
[ ] CTA 是互动型或关注型（不是感谢型）
[ ] 总字数 600-900字
[ ] tech-mechanism 块有类比（第3句）
[ ] tech-mechanism 块的 mechanismDepth.level 不是 shallow
[ ] body 每块有具体数字或硬事实（技术类必须有）
[ ] titleAlignment.score ≥ 60
```

---

## 技术选题硬约束（AI/模型/代码类主题）

技术类选题必须同时满足以下所有条件，否则 FAIL：

```
【必须满足】（三选一，每块至少一项）
A. 机制解释：XXX是怎么实现的（不能只说"很强"）
B. benchmark来源：XX%是怎么测出来的（不能只说"行业最高"）
C. 对比原理：为什么A比B好（不能只说"差距大"）

【禁止】
- 禁止用"很强""很厉害""很先进""突破性进展"代替具体机制描述
- 禁止只列功能清单而不解释背后的工作原理
- 禁止空泛的"重新定义"而不解释重新定义了什么
```

---

## Hook 要求（直接决定留存）

- 第一秒承接标题主判断
- 不准用"大家好"、"今天我们来"、"如果你"、"可能"
- 段落 ≤ 2句
- Hook Meta 的 score 来自 Step 2 标题评分，低于 70 须重写

---

## 去AI味核心原则

- 像真人在当面讲重点，不是在背报告
- 短句+硬信息，能删的形容词删掉
- 每段：先给判断→再补事实→推进下一段
- 禁止废话开场、感谢观看、纯营销腔

---

## 输出顺序要求

1. 先输出 brief + outline（策略层，含 type 标注）
2. 再输出 hook + hookMeta
3. 再输出 body[]（每块对齐 outline，tech-mechanism 块优先排第2位）
4. 最后输出 cta + ctaMeta + totalChars + readingTime + keywords
5. 最后做 titleAlignment + storySpine + coverage
6. **所有步骤完成后，才做 DeAI 自检**
7. **DeAI 通过后才算完成，未通过则重写对应块**

---

## Step 4 消费字段说明

Step 4 分镜系统消费以下字段构建镜头：

| Step 3 字段 | Step 4 用途 |
|------------|------------|
| `body[].text` | narration（口播原文） |
| `body[].sceneIntent` | storyboardCueZh（分镜意图描述） |
| `body[].dataPoints` | dataPoints（画面数字标注） |
| `body[].keywords` | keywords（画面元素关键词） |
| `body[].comparisons` | comparisons（split 镜头对比） |
| `body[].evidenceAnchor` | evidenceAnchor（证据标注） |
| `body[].mechanismDepth.visualHint` | 视觉类型推荐（参考，不是强制） |

`sceneIntent` 是 Step 4 最重要的分镜决策依据，必须是**可读的中文描述**，不是枚举值。

`transitionToNext` 不被 Step 4 消费，仅作文案连贯性参考，保留但不强制。

---

## 质量评估维度

| 维度 | 说明 |
|------|------|
| density | 信息密度（每块是否有硬事实） |
| spoken | 口语化程度（是否像真人说话） |
| pacing | 节奏（句长变化、块间推进） |
| cta | CTA 力度（是否用互动型） |
| alignment | 标题对齐度（titleAlignment.score） |
| evidence | 证据锚点覆盖率 |
| compliance | DeAI 合规（禁词/空洞词/三段式） |
| techDepth | 技术讲解深度（是否有HOW/WHY/mechanism解析） |

总评分 = 各维度加权，低于 70 分须重写。
