const dotenv = require('dotenv');
dotenv.config();

const { buildStep123Context, getInputTopic } = require('./server/workflow/step123/context.js');
const { hasWorkflowLLM, generateStructuredJson } = require('./server/workflow/step123/llm.js');
const { validateStep1Research, validateStep1Analysis } = require('./server/workflow/step123/quality.js');
const { normalizeStep1Payload } = require('./server/workflow/step123/normalizers.js');
const { enrichStepResult } = require('./server/workflow/skillRegistry.js');
const { ensureStepSkillReady } = require('./server/workflow/skillRegistry.js');

const input = {
  stepId: 1,
  projectState: { name: "xiaomi-mimo2.5" },
  pipelineState: {
    inputTitleKeywords: "xiaomi mimo2.5",
    inputTopic: "xiaomi mimo2.5"
  },
  generationMeta: {
    topic: "xiaomi mimo2.5",
    platform: "抖音/视频号",
    tone: "专业科技",
    targetDuration: 120,
    audienceHint: "科技爱好者/数码用户",
    searchScope: "normal"
  }
};

async function main() {
  console.log('Starting Step 1 with LLM only...');
  console.log('hasWorkflowLLM:', hasWorkflowLLM());
  
  const topicQuery = getInputTopic(input);
  console.log('topicQuery:', topicQuery);

  // Build context without search results (simulating what happens when search returns null)
  const context = buildStep123Context(1, input);
  console.log('context built, topic:', context.topic?.query);
  
  // Derive fallback research facts (since search returned null)
  const fallbackFacts = [
    {
      id: 'research-fact-1',
      label: '主题入口',
      fact: '围绕"xiaomi mimo2.5"已经存在可整理的公开线索，适合先回答"这是什么、为什么被关注"。',
      evidenceAnchor: 'xiaomi mimo2.5',
      sourceTitle: '待核实',
    },
    {
      id: 'research-fact-2',
      label: '关注重点',
      fact: '当前更值得展开的是这个主题的核心问题、实际影响和用户最在意的结果，而不是只复述名词定义。',
      evidenceAnchor: 'xiaomi mimo2.5',
      sourceTitle: '待核实',
    },
    {
      id: 'research-fact-3',
      label: '内容价值',
      fact: '这个主题适合做短视频拆解，因为可以把零散线索压缩成事实、判断和执行路径三层信息。',
      evidenceAnchor: 'xiaomi mimo2.5',
      sourceTitle: '待核实',
    },
  ];
  
  const baseResearch = { researchFacts: fallbackFacts };
  console.log('Created fallback facts:', fallbackFacts.length);
  
  // Validate research
  console.log('Validating research...');
  let researchStage;
  try {
    const validatedPayload = validateStep1Research(baseResearch, context);
    console.log('validateStep1Research done');
    researchStage = {
      stepId: 1,
      stageKey: 'research',
      model: 'search-derived',
      payload: validatedPayload,
    };
    console.log('researchStage.payload created');
  } catch (err) {
    console.error('validateStep1Research FAILED:', err.message);
    throw err;
  }
  
  // Now run LLM for analysis
  console.log('Running LLM analysis...');
  let analysisStage;
  if (hasWorkflowLLM()) {
    try {
      const result = await generateStructuredJson({
        messages: [{
          role: 'user',
          content: `你是AI视频流水线 Step 1 分析专家。主题: xiaomi mimo2.5

当前已有研究事实:
1. "xiaomi mimo2.5" 是一个科技主题
2. 需要围绕这个主题生成逻辑分析

请生成 JSON:
{
  "thesis": "核心判断语句",
  "audience": "目标受众",
  "corePromise": "核心承诺",
  "analysisBrief": {
    "mainQuestion": "主要问题",
    "audienceFocus": "受众关注点", 
    "narrativeApproach": "叙事路径",
    "whyNow": "时效说明"
  },
  "layers": [{"label": "层名", "insight": "洞察", "evidence": "证据"}],
  "process": [{"label": "步骤名", "detail": "详情"}]
}`
        }],
        temperature: 0.55
      });
      console.log('LLM analysis result received');
      const analysisPayload = validateStep1Analysis(result.payload, context);
      console.log('validateStep1Analysis done');
      analysisStage = {
        stepId: 1,
        stageKey: 'analysis',
        model: result.model || 'MiniMax-M2.7',
        payload: analysisPayload,
      };
    } catch (err) {
      console.error('LLM analysis FAILED:', err.message);
      throw err;
    }
  }
  
  console.log('Both stages completed!');
  console.log('researchStage.payload.mainQuestion:', researchStage.payload.mainQuestion);
  console.log('analysisStage.payload.analysis?.thesis:', analysisStage.payload?.analysis?.thesis);
  
  // Now normalize
  const enrichedInput = { ...input };
  const enriched = enrichStepResult(
    1,
    normalizeStep1Payload(researchStage.payload, analysisStage.payload, enrichedInput),
    enrichedInput,
    ensureStepSkillReady(1)
  );
  
  console.log('Final enriched payload keys:', Object.keys(enriched.payload));
  console.log('Final payload.analysis.thesis:', enriched.payload?.analysis?.thesis);
  
  return {
    stepId: 1,
    source: 'llm',
    model: analysisStage?.model || 'MiniMax-M2.7',
    generatedAt: new Date().toISOString(),
    payload: enriched.payload,
    resolvedSkill: enriched.resolvedSkill,
    evaluation: enriched.evaluation,
  };
}

main().catch(err => {
  console.error('FINAL ERROR:', err.message);
  console.error(err.stack);
});
