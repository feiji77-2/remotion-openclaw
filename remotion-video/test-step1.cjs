const dotenv = require('dotenv');
dotenv.config();

const { buildStep123Context, getInputTopic, searchTopicResearch } = require('./server/workflow/step123/context.js');
const { deriveStep1ResearchFromSearch, deriveStep1AnalysisFromResearch } = require('./server/workflow/step123/pipeline.js');
const { validateAndEnrichFacts } = require('./server/workflow/step123/technicalTopic.js');
const { normalizeStep1Payload } = require('./server/workflow/step123/normalizers.js');
const { hasWorkflowLLM, generateStructuredJson } = require('./server/workflow/step123/llm.js');
const { validateStep1Research, validateStep1Analysis } = require('./server/workflow/step123/quality.js');
const { enrichStepResult } = require('./server/workflow/skillRegistry.js');

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
  try {
    console.log('Step 1 starting...');
    console.log('hasWorkflowLLM:', hasWorkflowLLM());

    const topicQuery = getInputTopic(input);
    console.log('topicQuery:', topicQuery);

    let topicResearch = null;
    try {
      topicResearch = await searchTopicResearch(topicQuery);
      console.log('searchTopicResearch done, result:', topicResearch ? 'has data' : 'null');
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

    // Step 1a: research
    const baseResearch = deriveStep1ResearchFromSearch(context);
    console.log('baseResearch done, facts:', baseResearch.researchFacts?.length);

    // Step 1b: validate and enrich facts (LLM call here)
    let enrichedFacts = baseResearch;
    if (hasWorkflowLLM()) {
      try {
        console.log('Calling validateAndEnrichFacts with LLM...');
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
        console.warn('validateAndEnrichFacts failed:', err.message);
      }
    }

    const researchStage = {
      stepId: 1,
      stageKey: 'research',
      model: 'search-derived',
      payload: validateStep1Research(enrichedFacts, context),
    };
    console.log('researchStage.payload validated');

    // Step 1c: analysis (LLM call)
    let analysisStage;
    if (hasWorkflowLLM()) {
      try {
        console.log('Calling LLM for analysis...');
        const result = await generateStructuredJson({
          messages: [{ role: 'user', content: 'Return JSON with thesis, audience, corePromise for: ' + context.topic.query }],
          temperature: 0.55
        });
        console.log('LLM analysis success:', JSON.stringify(result.payload, null, 2));
      } catch (err) {
        console.warn('LLM analysis failed:', err.message, 'code:', err.code);
      }
    }

    console.log('All steps completed');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('STACK:', err.stack);
  }
}

main().catch(console.error);
