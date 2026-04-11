// Voice script data for OpenClaw 小龙虾爆火背后4层逻辑
// Generated from Step 5

export type VoiceSegment = {
  shotId: string;
  text: string;
  durationSec: number;
};

export const VOICE_SCRIPT: VoiceSegment[] = [
  {
    shotId: 'shot-01',
    text: '很多人看到 OpenClaw 小龙虾火了，第一反应都是：哦，一个 AI 项目做了个有梗形象，所以出圈了。但如果你真这么看，那你只看到了表皮。因为真正值得研究的，不是「小龙虾为什么有记忆点」，而是：为什么一个技术项目，能靠一个角色打开传播入口之后，后面还有一整套技术结构把热度接住。',
    durationSec: 18,
  },
  {
    shotId: 'shot-02',
    text: '这一条，我们从四个层面，把这件事讲清楚。',
    durationSec: 10,
  },
  {
    shotId: 'shot-03',
    text: '先说上手路径。OpenClaw 的标准安装路径，就四步：install，onboard，gateway，dashboard。不长。',
    durationSec: 12,
  },
  {
    shotId: 'shot-04',
    text: '一个用户第一次接触 OpenClaw，不需要先去研究它的底层架构。装好 Node，跑一个安装脚本，执行 onboarding，再打开 dashboard，就已经能跑第一轮真实的 AI 交互了。这意味着什么？意味着当一个项目被讨论起来的时候，它不是停在「听说过」这一层，而是可以快速把热度转化为真实的试用体验。能接住传播热度的项目，往往不是靠功能多，而是靠上手距离足够短。',
    durationSec: 20,
  },
  {
    shotId: 'shot-5a',
    text: '第二层，我们说 workspace。很多人接触 OpenClaw，最容易搞混的不是模型配置，而是 workspace 到底是什么。它看起来像一个普通目录，但实际上，它承担了三件事：默认工作目录，长期记忆的组织中心，以及人格和规则的定义空间。换句话说，workspace 不是文件夹，是 Agent 的 home。',
    durationSec: 15,
  },
  {
    shotId: 'shot-5b',
    text: 'OpenClaw 把 Agent 的能力，收束到了 workspace 的文件体系里。具体是哪些文件？AGENTS.md，定义它怎么工作、优先处理什么。SOUL.md，定义它的人格和边界。USER.md，定义你的偏好。TOOLS.md，定义它怎么理解这台机器上的工具。还有 memory/，放你的记忆日志，以及 skills/，放它能调用的技能模块。这些文件共同构成的，就是 Agent 的工作模型。',
    durationSec: 22,
  },
  {
    shotId: 'shot-5c',
    text: '所以真正有价值的地方在哪？你不需要写代码，不需要改配置，只需要把规则写进这些文件里，Agent 的长期行为就会跟着变。把「代码排查优先、中文回答」写进 AGENTS.md，把「务实、不讨好」写进 SOUL.md，Agent 就会按这个方式运行。把规则写进文件，把行为写进模型。',
    durationSec: 15,
  },
  {
    shotId: 'shot-6a',
    text: '第三层，我们说 agent loop。很多人以为 OpenClaw 只是一个「会聊天的界面」。但如果你去读它的 agent loop 文档，你会发现它把整个运行链路拆得很清楚：接收输入，组装上下文，模型推理，执行工具，流式回复，持久化。六步，完整跑完。这不是壳，是一套能稳定跑任务的执行系统。',
    durationSec: 14,
  },
  {
    shotId: 'shot-6b',
    text: '那具体是怎么保证稳定的？核心在于 session lane 和 queueing 机制。如果你在一次运行中连续发了两条消息，系统不会把它们搅在一起处理，而是每个 session 同时只走一条 lane，串行执行。中间有 lifecycle 事件追踪状态，有 agent.wait 等待结果。换句话说，连续多轮消息不会乱上下文，不会重复调用工具，不会把执行顺序打乱。这不是一个「看起来聪明」的系统，是一个「能稳定干活」的系统。技术用户会认真讨论它，原因就在这里。',
    durationSec: 18,
  },
  {
    shotId: 'shot-7a',
    text: '最后一层，平台扩展能力。OpenClaw 不是一个单点工具，它在往平台型架构走。一个 gateway 下，可以跑多个 Agent，每个 Agent 有自己独立的 workspace、独立的人格、独立的权限。消息进来之后，通过 routing 分配到不同的 Agent。这不是一个 AI 在回消息，是一整套有结构、有边界、可扩展的系统。',
    durationSec: 14,
  },
  {
    shotId: 'shot-7b',
    text: '具体是怎么扩展的？靠 plugin tools 和 optional tools。Plugin tools 是插件机制，注册之后就能被 Agent 调用。Optional tools 是可选工具，需要主动在 allowlist 里配置才会开启。哪些工具对哪个 Agent 开放，完全可配置。一个用户可以给主 Agent 只开放某几个工具，另一个 Agent 绑定不同的 workspace 和不同的账号，再通过 routing 把不同渠道的消息分配给不同的 Agent。这是平台型能力，不是单点功能。',
    durationSec: 18,
  },
  {
    shotId: 'shot-08',
    text: '所以回到最开始的问题。OpenClaw 小龙虾真正火起来，并不是因为一个梗突然出圈。真正让它留下来的，是这个梗后面，站着一套能被上手、被理解、被验证、被继续扩展的技术系统。上手路径短。workspace 设计清晰。agent loop 完整。平台扩展机制强。真正撑住热度的，不是梗，是这套技术结构。',
    durationSec: 18,
  },
  {
    shotId: 'shot-09',
    text: '如果你觉得这条有帮助，下一条，我们可以继续拆：OpenClaw 最值得借鉴的几条技术设计，以及为什么它比大多数 AI 项目更值得研究。',
    durationSec: 14,
  },
];
