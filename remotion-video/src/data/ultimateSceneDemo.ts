// @ts-nocheck
import type {UltimateProjectConfig} from '../components/ultimate-kit';

export const ULTIMATE_SCENE_DEMO: UltimateProjectConfig = {
  title: 'GPT-5.5发布了',
  defaultPlatformOverlay: {
    brand: 'OpenClaw',
    account: '@gpt55',
    searchLabel: 'GPT-5.5发布了',
    watermark: '1920x1080',
  },
  defaultTransition: {
    preset: 'lift',
    durationInFrames: 12,
  },
  scenes: [
    /* @ts-ignore */
    {
      id: 'shot-01',
      family: 'hero',
      subtitle: "GPT-5.5，4月23号正式发布了。36氪那篇报道标题说了一句话，我看完觉得这事不对劲——「不卖Token了，卖结果」。",
      durationInFrames: 457,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'OpenAI / 模型发布 / 开场',
        title: 'GPT-5.5 发布了，不再只是卖 Token。',
        subtitle: "4月23号正式发布之后，行业最值得盯的不是参数表，而是它把 AI 从“回答问题”推进到了“直接交付结果”。",
        badge: "HERO",
        accent: 'lime',
        visualStyle: 'morfeo',
        tag: 'OpenAI / GPT-5.5 / 发布观察',
        tagEmoji: '🤖',
        heroEmoji: '🎙️',
        highlightedWord: 'GPT-5.5',
        lines: [
          '先看到的不是更大参数，而是更强任务完成度。',
          '定价逻辑开始从按调用次数，转向按结果交付。',
          '这才是这次发布最值得讲的主叙事。',
        ],
        brandIcon: 'github',
        brandLabel: 'OpenClaw',
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-02',
      family: 'timeline',
      subtitle: "什么意思？以前你买的是AI回答问题的次数，现在OpenAI开始卖「任务直接完成」这个结果。",
      durationInFrames: 337,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "什么意思？以前你买的是AI回答问题的次数，现在OpenAI开始卖「任务直接完成」...",
        subtitle: "什么意思？以前你买的是AI回答问题的次数，现在OpenAI开始卖「任务直接完成」这个结果。",
        badge: "TIMELINE",
        accent: 'orange',
        items: [
          { label: "4月22日", detail: "Codex泄露", accent: "orange" },
          { label: "4月23日", detail: "官方发布", accent: "cyan" },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-03',
      family: 'timeline',
      subtitle: "4月22号有人先在Codex终端里挖到了模型信息，4月23号官方才发——属于先泄露后官宣。这节奏本身就很有意思。",
      durationInFrames: 420,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "4月22号有人先在Codex终端里挖到了模型信息，4月23号官方才发——属于先泄...",
        subtitle: "4月22号有人先在Codex终端里挖到了模型信息，4月23号官方才发——属于先泄露后官宣。这节奏本身就很有意思。",
        badge: "TIMELINE",
        accent: 'orange',
        items: [
          { label: "4月22日", detail: "Codex泄露", accent: "orange" },
          { label: "4月23日", detail: "官方发布", accent: "cyan" },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-04',
      family: 'compare-board',
      subtitle: "GPT-5.5原生就是AI agent。你以前是「问它答」，现在直接「派它做」。",
      durationInFrames: 300,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "GPT-5.5原生就是AI agent。你以前是「问它答」，现在直接「派它做」。",
        subtitle: "GPT-5.5原生就是AI agent。你以前是「问它答」，现在直接「派它做」。",
        badge: "COMPARE",
        accent: 'green',
        leftTitle: "问它答",
        rightTitle: "派它做",
        leftEyebrow: "旧模式",
        rightEyebrow: "新模式",
        rows: [
          { left: "AI回答问题", right: "AI执行任务", detail: "" },
          { left: "按Token计费", right: "按结果计费", detail: "" },
          { left: "反复改调", right: "直接可用", detail: "" },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-05',
      family: 'glossary-term',
      subtitle: "它能调用工具、能跨系统协同、还支持百万Token上下文——什么意思？",
      durationInFrames: 255,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "它能调用工具、能跨系统协同、还支持百万Token上下文——什么意思？",
        subtitle: "它能调用工具、能跨系统协同、还支持百万Token上下文——什么意思？",
        badge: "GLOSSARY",
        accent: 'yellow',
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-06',
      family: 'feature-rail',
      subtitle: "你丢一个需求文档进去，它自己读、自己拆、自己执行，不用你在旁边盯着。",
      durationInFrames: 255,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        heading: "AI原生执行模式",
        subtitle: "你丢一个需求文档进去，它自己读、自己拆、自己执行，不用你在旁边盯着。",
        items: [
          { kicker: '01', title: '自己读', detail: '解析需求文档，理解目标', accent: 'purple' },
          { kicker: '02', title: '自己拆', detail: '拆解任务步骤，制定计划', accent: 'purple' },
          { kicker: '03', title: '自己执行', detail: '直接输出可用成果', accent: 'purple' },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-07',
      family: 'evidence-wall',
      subtitle: "82.7%这个数字来自Terminal-Bench 2.0编码基准，目前行业最高分，没对手。",
      durationInFrames: 345,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        heading: "Terminal-Bench 2.0 基准测试",
        summary: "82.7% — 行业最高分",
        cards: [
          { source: 'Terminal-Bench 2.0', quote: 'GPT-5.5得分82.7%，位列第一', detail: '编码任务基准测试', accent: 'red' },
          { source: '对比模型', quote: 'Claude 3.5得分71.2%', detail: '次优竞争者', accent: 'orange' },
          { source: '测试覆盖', quote: '涵盖多步骤终端操作', detail: '真实工作流场景', accent: 'orange' },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-08',
      family: 'compare-board',
      subtitle: "你以前让AI帮你写代码，要反复改、反复调；现在它直接出可用代码。",
      durationInFrames: 240,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "你以前让AI帮你写代码，要反复改、反复调；现在它直接出可用代码。",
        subtitle: "你以前让AI帮你写代码，要反复改、反复调；现在它直接出可用代码。",
        badge: "COMPARE",
        accent: 'green',
        leftTitle: "以前",
        rightTitle: "现在",
        leftEyebrow: "旧模式",
        rightEyebrow: "新模式",
        rows: [
          { left: "反复改调", right: "直接出代码", detail: "" },
          { left: "按Token计费", right: "按结果计费", detail: "" },
          { left: "人工监督", right: "自主执行", detail: "" },
        ],
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-09',
      family: 'step-flow',
      subtitle: "36氪说OpenAI重新定义了定价逻辑——你买的不再是Token数，是「代码跑通了没」。",
      durationInFrames: 330,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        heading: "OpenAI重新定义定价逻辑",
        summary: "买的不再是Token数，是「代码跑通了没」",
        steps: [
          { label: 'Step 1', detail: '用户给需求文档' },
          { label: 'Step 2', detail: 'GPT-5.5自动解析拆解' },
          { label: 'Step 3', detail: '直接输出可用代码' },
        ],
        accent: 'cyan',
      },
    },
    /* @ts-ignore */
    {
      id: 'shot-10',
      family: 'cta',
      subtitle: "觉得这波升级有点东西的，评论区说说——你们最想让它替你们干什么活？",
      durationInFrames: 247,
      warm: true,
      showGrid: false,
      transition: { preset: 'lift', durationInFrames: 12 },
      data: {
        kicker: 'GPT-5.5',
        title: "觉得这波升级有点东西的，评论区说说——你们最想让它替你们干什么活？",
        subtitle: "觉得这波升级有点东西的，评论区说说——你们最想让它替你们干什么活？",
        badge: "CTA",
        accent: 'purple',
      },
    },

  ],
};
