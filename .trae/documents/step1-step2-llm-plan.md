# Plan: Step 1/2 分析和标题阶段改用 MiniMax LLM

## Summary

将 Step 1 的分析阶段和 Step 2 的标题阶段从确定性生成改为调用 MiniMax LLM 生成。参考 Step 3 的 `runStage` 模式，保留确定性降级作为容错保护。

## Current State Analysis

### Step 1 当前流程 (pipeline.js:1122-1163)
```
搜索 Bing RSS → deriveStep1ResearchFromSearch → deriveStep1AnalysisFromResearch → 直接返回
                                        ↓
                              不调用 LLM，source: 'deterministic'
```

### Step 2 当前流程 (pipeline.js:1166-1195)
```
deriveStep2StrategyFromAnalysis → deriveStep2TitlesFromStrategy → 直接返回
                                    ↓
                          不调用 LLM，source: 'deterministic'
```

### Step 3 LLM 模式 (pipeline.js:1197-1247)
```
hasWorkflowLLM() 检查
    ↓
runStage(stepId, 'brief', ...) → LLM 生成 brief
    ↓
runStage(stepId, 'copy', ...) → LLM 生成 copy
    ↓
失败则降级到确定性派生函数
    ↓
返回 source: 'skill-llm' 或 'skill-deterministic-fallback'
```

## Proposed Changes

### 1. 修改 Step 1 分析阶段 (pipeline.js:1142-1146)

**原代码**:
```javascript
const analysisStage = {
  stepId,
  stageKey: 'analysis',
  model: 'deterministic-step1',
  payload: validateStep1Analysis(deriveStep1AnalysisFromResearch(context, researchStage.payload)),
};
```

**改为**:
```javascript
let analysisStage;
if (hasWorkflowLLM()) {
  try {
    analysisStage = await runStage(
      1,
      'analysis',
      context,
      (ctx) => buildStep1AnalysisPrompt(ctx, researchStage.payload),
      validateStep1Analysis,
      { temperature: 0.55, regenerateTemperature: 0.85 }
    );
  } catch (error) {
    console.warn(`[Step1] Analysis LLM failed, falling back: ${error.message}`);
    analysisStage = {
      stepId,
      stageKey: 'analysis',
      model: 'step1-llm-fallback',
      payload: validateStep1Analysis(deriveStep1AnalysisFromResearch(context, researchStage.payload)),
    };
  }
} else {
  analysisStage = {
    stepId,
    stageKey: 'analysis',
    model: 'step1-deterministic',
    payload: validateStep1Analysis(deriveStep1AnalysisFromResearch(context, researchStage.payload)),
  };
}
```

### 2. 修改 Step 2 标题阶段 (pipeline.js:1166-1194)

**原代码**:
```javascript
if (stepId === 2) {
  const strategyStage = {
    stepId,
    stageKey: 'strategy',
    model: 'deterministic-step2',
    payload: validateStep2Strategy(deriveStep2StrategyFromAnalysis(context), context),
  };
  const titlesStage = {
    stepId,
    stageKey: 'titles',
    model: 'deterministic-step2',
    payload: validateStep2Titles(deriveStep2TitlesFromStrategy(context, strategyStage.payload), context),
  };
  ...
  return { source: 'deterministic', model: titlesStage.model, ... };
}
```

**改为**:
```javascript
if (stepId === 2) {
  let strategyStage, titlesStage;

  if (hasWorkflowLLM()) {
    try {
      strategyStage = await runStage(
        2,
        'strategy',
        context,
        (ctx) => buildStep2StrategyPrompt(ctx),
        validateStep2Strategy,
        { temperature: 0.52, regenerateTemperature: 0.78 }
      );
      titlesStage = await runStage(
        2,
        'titles',
        context,
        (ctx, prev) => buildStep2TitlesPrompt(ctx, prev),
        validateStep2Titles,
        { previousStage: strategyStage.payload, temperature: 0.58 }
      );
    } catch (error) {
      console.warn(`[Step2] LLM failed, falling back: ${error.message}`);
      strategyStage = {
        stepId,
        stageKey: 'strategy',
        model: 'step2-strategy-llm-fallback',
        payload: validateStep2Strategy(deriveStep2StrategyFromAnalysis(context), context),
      };
      titlesStage = {
        stepId,
        stageKey: 'titles',
        model: 'step2-titles-llm-fallback',
        payload: validateStep2Titles(deriveStep2TitlesFromStrategy(context, strategyStage.payload), context),
      };
    }
  } else {
    strategyStage = {
      stepId,
      stageKey: 'strategy',
      model: 'step2-deterministic',
      payload: validateStep2Strategy(deriveStep2StrategyFromAnalysis(context), context),
    };
    titlesStage = {
      stepId,
      stageKey: 'titles',
      model: 'step2-deterministic',
      payload: validateStep2Titles(deriveStep2TitlesFromStrategy(context, strategyStage.payload), context),
    };
  }

  const enriched = enrichStepResult(
    stepId,
    normalizeStep2Payload(strategyStage.payload, titlesStage.payload, enrichedInput),
    enrichedInput,
    skillSpec,
  );

  return {
    stepId,
    source: titlesStage.model.includes('llm') || titlesStage.model.includes('LLM') ? 'llm' : 'deterministic',
    model: titlesStage.model,
    ...
  };
}
```

### 3. 保留 Step 3 不变
Step 3 已经有正确的 LLM 调用模式，无需修改。

## Files to Modify

| File | Change | Why |
|------|--------|-----|
| `remotion-video/server/workflow/step123/pipeline.js` | 修改 Step 1/2 的生成逻辑，添加 LLM 调用分支 + 降级保护 | 核心改动 |

## Assumptions & Decisions

1. **保留降级保护**：LLM 调用失败时自动降级到确定性生成，确保系统可用性
2. **保持 Step 1/2 分离**：不合并 API 调用，保留中间状态可编辑性
3. **使用现有 Prompt 函数**：`buildStep1AnalysisPrompt`、`buildStep2StrategyPrompt`、`buildStep2TitlesPrompt` 已存在且配置正确
4. **使用现有 Validator**：`validateStep1Analysis`、`validateStep2Strategy`、`validateStep2Titles` 已存在
5. **Temperature 设置参考 Step 3**：Step 1 用 0.55/0.85，Step 2 用 0.52/0.78/0.58

## Verification Steps

1. 重启 API 服务器 (`npm run pipeline:api`)
2. 发送测试请求到 Step 1：
   ```bash
   curl -X POST http://localhost:3001/api/workflow/generate \
     -H "Content-Type: application/json" \
     -d '{"stepId": 1, "pipelineState": {"inputTopic": "gpt5.5"}}'
   ```
3. 检查返回结果的 `source` 字段是否为 `llm`（而非 `deterministic`）
4. 检查日志中是否有 LLM 调用记录
5. 发送测试请求到 Step 2，验证标题阶段是否走 LLM
6. 检查 `npm run test` 是否有失败