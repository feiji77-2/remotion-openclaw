const dotenv = require('dotenv');
dotenv.config();

const { buildStep123Context, getInputTopic, searchTopicResearch } = require('./server/workflow/step123/context.js');
const { hasWorkflowLLM } = require('./server/workflow/step123/llm.js');

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
  const topicQuery = getInputTopic(input);
  console.log('topicQuery:', topicQuery);

  try {
    const topicResearch = await searchTopicResearch(topicQuery);
    console.log('searchTopicResearch SUCCESS, results:', topicResearch?.length);
  } catch (err) {
    console.error('searchTopicResearch ERROR:', err.message);
  }

  const context = buildStep123Context(1, input);
  console.log('context built, topicQuery:', context.topicQuery);
  console.log('hasWorkflowLLM:', hasWorkflowLLM());
}

main().catch(console.error);