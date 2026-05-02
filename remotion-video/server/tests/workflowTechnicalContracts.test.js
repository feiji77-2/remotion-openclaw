process.env.NODE_ENV = 'development';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStep1Research,
  validateStep3Copy,
} = require('../workflow/step123/quality');
const {
  validateStep3SkillAlignment,
} = require('../workflow/step123/step3SkillDriver');

function buildContext() {
  return {
    topic: {
      query: 'gpt5.5 发布',
    },
    pipeline: {
      selectedTitle: {
        title: 'GPT-5.5 发布后真正该先看的，是 Agent、API 和 benchmark',
      },
      topicResearch: {
        results: [],
      },
    },
    generation: {
      mode: 'generate',
      previousPayload: null,
    },
  };
}

test('step1 research rejects generic AI release facts without hard details', () => {
  assert.throws(
    () => validateStep1Research({
      researchFacts: [
        {
          label: '发布热度',
          fact: 'OpenAI 这次发布再次引发行业关注，大家都在讨论它会不会改变工作流。',
          evidenceAnchor: '行业讨论',
          sourceTitle: '行业讨论',
        },
        {
          label: '能力变化',
          fact: '很多人认为 GPT-5.5 更强了，也更像真正的协作伙伴。',
          evidenceAnchor: '讨论摘要',
          sourceTitle: '讨论摘要',
        },
        {
          label: '影响判断',
          fact: '这次升级会让很多团队重新思考 AI 的定位和效率提升。',
          evidenceAnchor: '观察总结',
          sourceTitle: '观察总结',
        },
      ],
      mainQuestion: '这次为什么被关注？',
      audienceFocus: '想知道影响的人',
      contentAngle: '讲变化和影响',
      whyNow: '热度很高',
    }, buildContext()),
    (error) => /^STEP1_RESEARCH_/.test(String(error?.code || '')),
  );
});

test('step1 research accepts AI release facts with release and operational detail', () => {
  const result = validateStep1Research({
    researchFacts: [
      {
        label: '发布时间',
        fact: 'OpenAI 在 2026-04-24 发布 GPT-5.5，官方说明把它作为新一代旗舰模型更新推出。',
        evidenceAnchor: 'OpenAI release note · 2026-04-24',
        sourceTitle: 'OpenAI release note',
      },
      {
        label: '能力机制',
        fact: '这次重点不是闲聊优化，而是把 Agent、多步骤工具调用、代码任务和上下文窗口一起往生产流程里推。',
        evidenceAnchor: 'Product update',
        sourceTitle: 'Product update',
      },
      {
        label: '工程更新',
        fact: '讨论焦点同时落在 benchmark、API 兼容、rate limit 和开发者接入成本，而不是只看一句“更强了”。',
        evidenceAnchor: 'Developer note',
        sourceTitle: 'Developer note',
      },
    ],
    mainQuestion: '这次升级真正改了什么？',
    audienceFocus: '开发者和技术内容用户',
    contentAngle: '先讲发布细节，再讲工程变化',
    whyNow: '发布刚发生',
  }, buildContext());

  assert.equal(result.researchFacts.length, 3);
});

test('step3 copy rejects generic AI release narration', () => {
  assert.throws(
    () => validateStep3Copy({
      copy: {
        hook: 'GPT-5.5 这次最值得看的，是它会不会重新改掉工作流。',
        body: [
          {
            label: '发布背景',
            text: '很多人都在讨论这次发布，因为它不只是更新，而是定位上的变化。',
            sceneIntent: '发布背景',
            evidenceAnchor: '发布背景',
            transitionToNext: '下一块讲能力',
            keywords: ['GPT-5.5', '发布'],
            dataPoints: ['定位变化'],
          },
          {
            label: '能力变化',
            text: '这次最大的不同，是它从聊天工具变成了更完整的协作伙伴，效率会更高。',
            sceneIntent: '能力变化',
            evidenceAnchor: '能力变化',
            transitionToNext: '下一块讲影响',
            keywords: ['能力变化', '工作流'],
            dataPoints: ['效率提升'],
          },
          {
            label: '影响结果',
            text: '所以很多团队会重新思考 AI 怎么配合自己工作，这才是最关键的地方。',
            sceneIntent: '影响结果',
            evidenceAnchor: '影响结果',
            transitionToNext: '最后收 CTA',
            keywords: ['AI', '影响'],
            dataPoints: ['重新思考'],
          },
        ],
        cta: '评论区告诉我你怎么看 GPT-5.5 这次升级。',
      },
    }, buildContext()),
    (error) => /STEP3_COPY_/.test(String(error?.code || '')),
  );
});

test('step3 copy accepts AI release narration with hard technical detail', () => {
  const result = validateStep3Copy({
    copy: {
      hook: '先看硬信息，GPT-5.5 在 2026-04-24 发布后，真正该拆的是 Agent、API 和 benchmark。',
      body: [
        {
          label: '发布细节',
          text: '先把发布动作讲清，OpenAI 在 2026-04-24 发布 GPT-5.5，这不是例行热更新，而是把新版本正式推到主线产品里。',
          sceneIntent: '发布细节',
          evidenceAnchor: 'OpenAI release note · 2026-04-24',
          transitionToNext: '下一块讲能力机制',
          keywords: ['GPT-5.5', '发布', '2026-04-24'],
          dataPoints: ['2026-04-24 发布', 'GPT-5.5 主线版本'],
        },
        {
          label: '能力机制',
          text: '能力层最硬的是 Agent、多步骤 tool calling、代码任务和上下文窗口一起升级，重点已经不是聊天顺不顺，而是能不能把任务链跑完。',
          sceneIntent: '能力机制',
          evidenceAnchor: 'Product update',
          transitionToNext: '下一块讲评测和工程差异',
          keywords: ['Agent', 'tool calling', '上下文窗口'],
          dataPoints: ['多步骤 tool calling', '代码任务', '上下文窗口'],
        },
        {
          label: '评测与工程',
          text: '真正拉开差异的，不是口号，而是 benchmark、API 兼容和 rate limit 这些工程指标已经被拿出来和旧模型对比，这才叫实打实的升级。',
          sceneIntent: '评测与工程',
          evidenceAnchor: 'Developer note',
          transitionToNext: '最后收 CTA',
          keywords: ['benchmark', 'API', 'rate limit'],
          dataPoints: ['benchmark 对比', 'API 兼容', 'rate limit'],
        },
      ],
      cta: '你更想继续拆 benchmark、API 还是 Agent 工作流，评论区留一句，我下一条接着讲。',
    },
  }, buildContext());

  assert.equal(result.copy.body.length, 3);
});

test('step3 skill alignment rejects short generic copy without mechanism depth', () => {
  const payload = {
    copy: {
      hook: '我试了下 deepseek v4，感觉它确实更会干活了。',
      body: [
        {
          label: 'fact-hammer',
          type: 'fact-hammer',
          text: '我给了它一个需求，它很快就回了我一个结果，所以这次升级值得看。',
          sceneIntent: '让用户知道它升级了',
          evidenceAnchor: '需求到结果',
          transitionToNext: '下一块讲原因',
          keywords: ['deepseek v4', '升级'],
          dataPoints: ['很快'],
        },
        {
          label: 'tech-mechanism',
          type: 'tech-mechanism',
          text: '它用了更强的技术，所以现在更会做事，整体表现和以前不同。',
          sceneIntent: '让程序员理解技术变化',
          evidenceAnchor: '技术变化',
          transitionToNext: '下一块讲能力',
          keywords: ['技术', '能力'],
          dataPoints: ['更强'],
          mechanismDepth: {
            level: 'shallow',
            explains: 'WHAT',
            technicalTerms: [],
            analogy: '',
            visualHint: '',
          },
        },
        {
          label: 'capability',
          type: 'capability',
          text: '代码能力更强，处理任务也更稳，很多人都能直接拿来用。',
          sceneIntent: '让用户知道它能做什么',
          evidenceAnchor: '代码能力',
          transitionToNext: '下一块讲对比',
          keywords: ['代码能力', '任务'],
          dataPoints: ['更稳'],
        },
        {
          label: 'comparison',
          type: 'comparison',
          text: '跟别的模型比，它整体更有性价比，也更适合放进工作流。',
          sceneIntent: '让用户做选择',
          evidenceAnchor: '性价比',
          transitionToNext: '',
          keywords: ['对比', '性价比'],
          dataPoints: ['更适合'],
        },
      ],
      cta: '评论区告诉我你怎么看。',
    },
  };

  const alignment = validateStep3SkillAlignment(buildContext(), payload, {
    sourcePath: '/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/docs/workflow-skills/video-pipeline-content.SKILL.md',
  });

  assert.equal(alignment.ok, false);
  assert.match(alignment.reasons.join(' | '), /偏短|机制|套话|场景|硬信息密度/);
});
