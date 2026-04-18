/**
 * mainContent.ts — 视频文案内容（唯一真相源）
 * 主题: Hermes vs OpenClaw — 为什么 Hermes 能压过 OpenClaw
 * 流程: content → ContentAnalyzer → ShotPlan[] + 口播稿
 *       口播稿 → TTS → 音频 → 合并视频
 */

import { ContentSection } from './contentSchema';

/**
 * 视频文案 — 8镜头口播稿
 * 每个章节 = 一个镜头 + 对应口播
 */
export const MAIN_CONTENT: ContentSection[] = [
  {
    title: '开场钩子',
    narration: '4.7万星，GitHub 全球热榜第一。它不是功能最多的那个，但它解决了一个 OpenClaw 始终没解决的问题。有过这种经历吗？花了两天把 AI 助手调教好了，结果一重启，全没了。Hermes 解决的就是这个。',
    shotType: 'title',
    note: 'B+E 组合钩子：悬念数据 + 场景还原 + 悬念闭合',
  },
  {
    title: 'OpenClaw靠什么站稳',
    narration: '先说事实。OpenClaw 今年2月上线，火起来靠两件事。一件事，接入了你能想到的所有消息平台。Telegram、Discord、Slack、WhatsApp，装完就能用。另一件事，插件生态。ClawHub 上有一堆工具，文件读写、浏览器控制、Shell操作，基本上能装的都装上了。说白了就是个连接器，把 AI 和你日常用的工具连起来。接进来快，稳。',
    shotType: 'scenegrid',
    note: '介绍 OpenClaw 的核心优势：多平台接入 + 插件生态',
  },
  {
    title: '三个天花板',
    narration: '但用长了，三个问题就冒出来了。第一，上下文膨胀。每次对话它把完整历史塞进去，用得越多 token 消耗越多，推理越慢，成本越高。第二，无状态。它不记得你上次怎么做，用三个月和用三天，没有区别。第三，半自动。复杂任务来了它能做，但得你一步一步指挥，你不说它就停在那。这三个问题，说白了都是设计问题，不是打个补丁能搞定的。',
    shotType: 'dialog',
    note: '三个痛点：上下文膨胀/无状态/半自动',
  },
  {
    title: '技术理论1：O(n)膨胀根因',
    narration: '这里有个技术问题要说清楚。Transformers 的注意力复杂度是 O(n)，上下文越长推理成本不是线性增长，是平方增长。OpenClaw 靠堆上下文解决记忆问题，堆得越多越慢。Hermes 用技能系统替代全量历史，不堆，用提取代替堆积。',
    shotType: 'stats',
    note: '技术理论层1：O(n) 上下文膨胀的根因',
  },
  {
    title: 'Hermes怎么破局',
    narration: 'Hermes 呢，今年2月25日由 Nous Research 开源。不到两个月，GitHub 4.7万星，冲到全球热榜第一了。同时 v0.8.0 也出来了，3536次提交。注意一下，OpenClaw 也是今年2月同期发布的，两个产品起步时间差不多。但 Hermes 做了一个不一样的选择——自我进化。它有个内置学习循环，每次帮你搞定任务，它会自己琢磨：这次是怎么做的？有没有可以复用的步骤？下次遇到类似的，能不能直接调？任务执行成功，它就记下来，变成技能。用得越久，它会的越多。',
    shotType: 'scenegrid',
    note: 'Hermes 破局方案：自我进化 + 技能系统',
  },
  {
    title: '技术理论2：闭环学习架构',
    narration: '这套架构，叫闭环学习。OpenClaw 是开环执行器：你给指令，它执行，结束。Hermes 是闭环系统：执行 → 分析 → 提取 → 存储 → 下次调用。开环系统用久了，上下文越来越长。闭环系统用久了，技能越来越多。结果就是，任务完成时间随使用次数递减，而不是递增。',
    shotType: 'flowchart',
    note: '技术理论层2：闭环 vs 开环的本质区别',
  },
  {
    title: '真实反馈',
    narration: '我看过几个从 OpenClaw 迁过去的案例。Reddit 上有人说：丝滑换壳，没翻车，体验直线飙升。每月5美元，能跑一个跟着你成长的 AI 打工人。支持本地部署，接 Ollama，数据不离自己的机器。注意，这是用户真实反馈，不是官方宣传。',
    shotType: 'stats',
    note: '真实案例：Reddit 用户迁移反馈',
  },
  {
    title: '总结+CTA',
    narration: '所以问题变了。不是谁先上线谁赢了。是谁的设计哲学笑到最后。OpenClaw 是你来教它。Hermes 是它自己学会。前者上限是你的水平，后者上限是 AI 自己的进化能力。你现在用哪个？用 OpenClaw 的，说说最受不了的地方。用 Hermes 的，说说最香的功能。觉得有收获的，转给身边搞 AI 的朋友。关注我，下期出 Hermes 5分钟快速上手。',
    shotType: 'title',
    note: '哲学总结 + 互动 CTA',
  },
];

/**
 * 元数据
 */
export const CONTENT_META = {
  title: 'OpenClaw 24万开发者，为啥被一个 Hermes 超越了？',
  estimatedDuration: 204, // 8镜头之和
  hook: 'B+E 组合：悬念数据 + 场景还原 + 悬念闭合',
  corePainPoint: 'OpenClaw 无状态导致每次重启全忘了，Hermes 技能系统能记住',
  targetAudience: '用过或考虑用 AI Agent 的开发者、技术人',
  theories: [
    { tag: 'O(n)上下文膨胀', explanation: 'Transformers 注意力复杂度 O(n)，上下文越长推理成本平方增长' },
    { tag: '闭环学习架构', explanation: '开环：指令→执行→结束；闭环：执行→分析→提取→存储→调用' },
  ],
};
