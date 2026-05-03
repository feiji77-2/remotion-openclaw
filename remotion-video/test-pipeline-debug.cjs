const dotenv = require('dotenv');
dotenv.config();

const { buildStep123Context, getInputTopic, searchTopicResearch } = require('./server/workflow/step123/context.js');
const { hasWorkflowLLM, generateStructuredJson } = require('./server/workflow/step123/llm.js');
const { validateStep1Analysis } = require('./server/workflow/step123/quality.js');

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
  console.log('Step 1 debug starting...');
  
  try {
    const topicQuery = getInputTopic(input);
    console.log('topicQuery:', topicQuery);

    let topicResearch = null;
    try {
      topicResearch = await searchTopicResearch(topicQuery);
      console.log('searchTopicResearch done');
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
    console.log('context built, topicQuery:', context.topic?.query);

    // Now test the LLM call
    console.log('hasWorkflowLLM:', hasWorkflowLLM());
    
    if (hasWorkflowLLM()) {
      console.log('Testing LLM call...');
      try {
        const result = await generateStructuredJson({
          messages: [{ role: 'user', content: 'Return JSON with topic (string) and analysis (object with thesis string) for: ' + topicQuery }],
          temperature: 0.55
        });
        console.log('LLM SUCCESS');
        console.log('Result:', JSON.stringify(result.payload, null, 2));
      } catch (err) {
        console.error('LLM call FAILED');
        console.error('Error:', err.message);
        console.error('Code:', err.code);
        console.error('Status:', err.status);
        throw err;
      }
    } else {
      console.log('hasWorkflowLLM is false - LLM not available');
    }
  } catch (err) {
    console.error('ERROR in main:', err.message);
    console.error('Full error:', err);
  }
}

main().catch(console.error);
