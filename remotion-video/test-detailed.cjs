const dotenv = require('dotenv');
dotenv.config();

const { buildStep123Context, getInputTopic, searchTopicResearch } = require('./server/workflow/step123/context.js');
const { hasWorkflowLLM, generateStructuredJson } = require('./server/workflow/step123/llm.js');
const { validateAndEnrichFacts } = require('./server/workflow/step123/technicalTopic.js');
const { validateStep1Research, validateStep1Analysis } = require('./server/workflow/step123/quality.js');
const { normalizeStep1Payload } = require('./server/workflow/step123/normalizers.js');
const { enrichStepResult } = require('./server/workflow/skillRegistry.js');
const { ensureStepSkillReady } = require('./server/workflow/skillRegistry.js');
const { STEP1_FACT_LABELS } = require('./server/workflow/step123/pipeline.js');

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deriveStep1ResearchFromSearch(context) {
  const topicQuery = String(
    context?.topic?.query
    || context?.topic?.inputTitleKeywords
    || context?.topic?.inputTopic
    || '当前主题',
  ).trim();
  const searchResults = Array.isArray(context?.pipeline?.topicResearch?.results)
    ? context.pipeline.topicResearch.results
    : [];

  const facts = uniqueBy(
    searchResults.map((item, index) => {
      const title = String(item?.title || '').trim();
      const snippet = String(item?.snippet || '').trim();
      const publishedAt = String(item?.publishedAt || '').trim();
      const evidenceBase = title || `${topicQuery} 相关结果 ${index + 1}`;
      const evidenceAnchor = publishedAt ? `${evidenceBase} · ${publishedAt}` : evidenceBase;
      const fact = snippet || title;

      if (!fact) {
        return null;
      }

      return {
        label: STEP1_FACT_LABELS[index] || `事实 ${index + 1}`,
        fact,
        evidenceAnchor,
        sourceTitle: title,
      };
    }).filter(Boolean),
    (item) => `${item.fact}::${item.evidenceAnchor}`,
  );

  const fallbackFacts = [
    {
      label: '主题入口',
      fact: `围绕"${topicQuery}"已经存在可整理的公开线索，适合先回答"这是什么、为什么被关注"。`,
      evidenceAnchor: searchResults[0]?.title || topicQuery,
      sourceTitle: String(searchResults[0]?.title || '').trim(),
    },
    {
      label: '关注重点',
      fact: `当前更值得展开的是这个主题的核心问题、实际影响和用户最在意的结果，而不是只复述名词定义。`,
      evidenceAnchor: searchResults[1]?.title || topicQuery,
      sourceTitle: String(searchResults[1]?.title || '').trim(),
    },
    {
      label: '内容价值',
      fact: `这个主题适合做短视频拆解，因为可以把零散线索压缩成事实、判断和执行路径三层信息。`,
      evidenceAnchor: searchResults[2]?.title || topicQuery,
      sourceTitle: String(searchResults[2]?.title || '').trim(),
    },
  ];

  const mergedFacts = [...facts];
  for (const fact of fallbackFacts) {
    if (mergedFacts.length >= 3) {
      break;
    }
    if (!mergedFacts.some(m => m.label === fact.label)) {
      mergedFacts.push(fact);
    }
  }

  return { researchFacts: mergedFacts };
}

async function main() {
  console.log('Starting detailed test...');
  
  const topicQuery = getInputTopic(input);
  console.log('topicQuery:', topicQuery);

  let topicResearch = null;
  try {
    topicResearch = await searchTopicResearch(topicQuery);
    console.log('searchTopicResearch result:', topicResearch ? 'has data' : 'null');
  } catch (err) {
    console.warn('searchTopicResearch failed:', err.message);
  }

  const enrichedInput = {
    ...input,
    pipelineState: {
      ...input.pipelineState,
      ...(topicResearch ? { topicResearch } : {})
    }
  };

  const context = buildStep123Context(1, enrichedInput);
  console.log('context built');

  // Step 1a: derive research
  console.log('Calling deriveStep1ResearchFromSearch...');
  const baseResearch = deriveStep1ResearchFromSearch(context);
  console.log('baseResearch done, facts:', baseResearch.researchFacts?.length);

  // Step 1b: validate and enrich facts
  console.log('hasWorkflowLLM:', hasWorkflowLLM());
  let enrichedFacts = baseResearch;
  
  if (hasWorkflowLLM()) {
    try {
      console.log('Calling validateAndEnrichFacts...');
      const enrichedResearch = await validateAndEnrichFacts(
        baseResearch.researchFacts,
        context,
        generateStructuredJson
      );
      console.log('validateAndEnrichFacts done, enriched:', enrichedResearch.enriched);
      if (enrichedResearch.enriched) {
        enrichedFacts = { ...enrichedFacts, researchFacts: enrichedResearch.facts };
      }
    } catch (err) {
      console.error('validateAndEnrichFacts FAILED:', err.message);
      console.error('Error:', err);
      throw err;
    }
  }

  // Step 1c: validate research stage payload
  console.log('Calling validateStep1Research...');
  let researchStage;
  try {
    const validatedPayload = validateStep1Research(enrichedFacts, context);
    console.log('validateStep1Research done');
    researchStage = {
      stepId: 1,
      stageKey: 'research',
      model: 'search-derived',
      payload: validatedPayload,
    };
    console.log('researchStage.payload verified');
  } catch (err) {
    console.error('validateStep1Research FAILED:', err.message);
    throw err;
  }

  // Step 1d: LLM analysis stage
  console.log('Testing LLM analysis call...');
  try {
    const result = await generateStructuredJson({
      messages: [{ role: 'user', content: 'Return JSON with thesis (string), audience (string), corePromise (string) for topic: ' + topicQuery }],
      temperature: 0.55
    });
    console.log('LLM analysis result:', JSON.stringify(result.payload, null, 2));
  } catch (err) {
    console.error('LLM analysis FAILED:', err.message);
    throw err;
  }

  console.log('All steps completed successfully!');
}

main().catch(err => {
  console.error('FINAL ERROR:', err.message);
  console.error(err.stack);
});
