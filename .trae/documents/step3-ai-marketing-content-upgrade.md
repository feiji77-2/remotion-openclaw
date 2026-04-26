# Step 3 文案内容升级计划：科技AI营销变现场景

## 1. 目标概述

针对**科技AI营销变现**场景，重新设计 Step 3 文案生成系统，核心优化：

1. **升级爆款公式**：扩展抖音爆款公式库，增加变现导向模式
2. **强化去AI味**：新增多种拟人化表达模式，提升文案自然度
3. **科技AI营销场景适配**：针对AI产品、工具、服务的变现文案优化

## 2. 当前状态分析

### 2.1 现有 SKILL 文件
**文件**: `remotion-video/docs/workflow-skills/video-pipeline-content.SKILL.md`

当前包含：
- 抖音爆款4大底层公式（结论先行、硬事实推进、差异化拆解、强互动收束）
- AI/模型技术选题硬约束
- 内容结构要求（Hook、Body、CTA）
- 去AI味核心原则

### 2.2 现有后端驱动
**文件**: `remotion-video/server/workflow/step123/step3SkillDriver.js`

当前包含：
- `STEP3_ANTI_AI_PROFILES`: 3个去AI等级（natural, strong, max）
- `FALLBACK_PLAYBOOK`: 默认文案模板
- `buildHookText()`, `buildBodyBlocks()`, `buildCtaText()` 等构建函数
- `sanitizeText()` 去AI味处理

## 3. 升级方案

### 3.1 SKILL 文件升级

#### 新增：科技AI营销变现爆款公式

```markdown
## 科技AI营销变现爆款公式

### F1: 恐惧错失型 (FOMO)
- 核心：让人感觉"再不用就落后了"
- 公式：别人已经XXX，你还不知道/还没用/还在犹豫
- 适用：AI工具、效率软件、新技术

### F2: 结果承诺型
- 核心：给出可量化的结果承诺
- 公式：用了XXX，就XXX（具体结果）
- 适用：变现工具、数据产品、服务

### F3: 门槛跨越型
- 核心：降低使用门槛，给出具体路径
- 公式：原来XXX，现在XXX（门槛降低）
- 适用：新产品、新功能、平台迁移

### F4: 身份认同型
- 核心：让用户感觉"用这个的人都是XXX"
- 公式：真正XXX的人，都在用/都知道/都这样做
- 适用：高端工具、专业平台

### F5: 成本对比型
- 核心：强调"值"而非"便宜"
- 公式：花XXX得到XXX（性价比量化）
- 适用：付费工具、企业服务

### F6: 实战验证型
- 核心：给出真实案例和结果
- 公式：实测XXX天，XXX（具体数字变化）
- 适用：需要建立信任的产品
```

#### 新增：科技AI产品变现文案规则

```markdown
## 科技AI产品变现文案规则

### 变现钩子库
1. 效率型：「3分钟完成以前3小时的工作」
2. 收入型：「用这个方法，多赚XXX」
3. 降本型：「省下XXX，用在刀刃上」
4. 门槛型：「普通人也能XXX」
5. 趋势型：「XXX已经开始了」

### 变现CTA类型
1. 「先收藏，用的时候能找到」
2. 「评论区告诉我你最想XXX」
3. 「转给需要的朋友」
4. 「关注我，下期XXX」
5. 「想要XXX的，评论区扣1」
```

### 3.2 后端驱动升级

#### 扩展 `STEP3_ANTI_AI_PROFILES`

```javascript
// 新增变现模式 profiles
const STEP3_ANTI_AI_PROFILES = {
  // ... 现有 profiles ...

  // 新增：科技AI营销变现专用
  ai_marketing: {
    label: '科技变现口播',
    openingPhrases: [
      '先把这话撂这',
      '这事值钱的地方在这',
      '先说个判断',
      '这事先别绕',
    ],
    bridgePhrases: [
      '更值钱的在后面',
      '说白了就是',
      '关键点在这',
      '最实在的是',
    ],
    closingPhrases: [
      '最后落这一句',
      '结论就这一个',
      '记住这三点',
    ],
  },

  // 强拟人+变现
  ai_marketing_strong: {
    label: '强拟人科技变现',
    openingPhrases: [
      '我先讲透',
      '这事值钱',
      '直接说',
      '结论在这',
    ],
    bridgePhrases: [
      '但这不够',
      '更实在的是',
      '说穿了',
      '关键在这',
    ],
    closingPhrases: [
      '就这一下',
      '结论就是',
      '别搞复杂',
    ],
  },
};
```

#### 新增变现导向文案模板

```javascript
// 新增变现公式构建函数
function buildFomoHook(context, playbook, controls, mainClaim, focusLine) {
  // 恐惧错失型 Hook
  const templates = [
    `别人已经${focusLine}了，你还在${context?.topic?.query || '看热闹'}？`,
    `${focusLine || mainClaim}这事，知道的人已经开始用了`,
    `等${focusLine || mainClaim}这事扩散开再学，就晚了`,
    `真正在用的人，不会告诉你${focusLine || mainClaim}有多值钱`,
  ];
  return compressTextToBudget(templates[controls.variant % templates.length], playbook.hook.maxChars);
}

function buildResultPromiseBlock(context, controls, playbook, mainClaim, facts) {
  // 结果承诺型 Body
  return joinSentences([
    `${controls.profile.openingPhrases[controls.variant % controls.profile.openingPhrases.length]}，先把这个讲透：`,
    `${mainClaim}。`,
    `不是讲概念，是直接落到${focusLine || '具体结果'}。`,
    `用了的和没用的，差别就在这一下。`,
  ]);
}

function buildMonetizationCta(context, playbook, controls, mainClaim) {
  // 变现导向 CTA
  const patterns = [
    `想继续拆「${mainClaim}」怎么落到实际用的，评论区告诉我。`,
    `这条如果对你有用，转给也在找${focusLine || '这类工具'}的人。`,
    `关注我，下一条直接讲怎么用「${mainClaim}」这事变现。`,
  ];
  return patterns[controls.variant % patterns.length];
}
```

### 3.3 新增营销变现检测

```javascript
// technicalTopic.js 新增
const MONETIZATION_PATTERN = /(变现|赚钱|收入|利润|增长|转化|变现|流量|获客|私域|变现)/i;
const AI_TOOL_PATTERN = /(ai工具|效率工具|chatgpt|claude|copilot|产品|服务|平台|软件)/i;

function detectMonetizationContext(input) {
  const corpus = buildCorpus(input);
  const isMonetization = MONETIZATION_PATTERN.test(corpus);
  const isAiProduct = AI_TOOL_PATTERN.test(corpus);

  return {
    isMonetization,
    isAiProduct,
    isAiMonetization: isMonetization && isAiProduct,
    formulaRecommendation: isMonetization
      ? ['fomo', 'result_promise', 'threshold_crossing']
      : isAiProduct
        ? ['fomo', 'identity', 'cost_comparison']
        : ['conclusion_first', 'hard_facts', 'differentiation'],
  };
}
```

## 4. 修改文件清单

| 文件 | 改动内容 |
|------|----------|
| `docs/workflow-skills/video-pipeline-content.SKILL.md` | 新增变现公式、去AI味规则、变现CTA库 |
| `server/workflow/step123/step3SkillDriver.js` | 新增变现profiles、新模板函数、新检测逻辑 |
| `server/workflow/step123/technicalTopic.js` | 新增营销变现检测函数 |

## 5. 验证步骤

1. **TypeScript 检查**: `npm run typecheck`
2. **单元测试**: 运行 Step 3 相关测试
3. **手动测试**:
   - 用科技AI营销变现主题测试文案生成
   - 验证去AI味效果
   - 检查变现公式是否正确应用
