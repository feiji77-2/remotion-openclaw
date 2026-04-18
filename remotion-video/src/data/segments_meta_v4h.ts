/**
 * segments_meta_v4h.ts — WhisperX 实测版渲染合同
 *
 * ⚠️ 此文件由 from-harness.js 自动生成，禁止手动修改
 * 源: audio-tmp/segments_meta_v4h.json
 * 用途: Video1v4.tsx 的 SEGMENTS 和 Root.tsx 的 durationInFrames
 *
 * 格式: 每个 segment = WhisperX 实测时长 + 原始文本
 * 转场: 每镜头头尾各 20 帧淡入淡出（TRANSITION_FRAMES=20）
 */

import type { SegmentMeta } from '../types';

export const TRANSITION_FRAMES = 20;
export const FPS = 30;

export const SEGMENTS: SegmentMeta[] = [
  { id: 'shot-01', start: 0,     frames: 314, dur: 10.480, shotType: 'opening',    text: '4.7万星，GitHub 全球热榜第一。它不是功能最多的那个，但它解决了一个 OpenClaw 始终没解决的问题。' },
  { id: 'shot-02', start: 314,   frames: 255, dur: 8.488,  shotType: 'concept',     text: '花了两天把 AI 助手调教好了，结果一重启，全没了。Hermes 解决的就是这个。' },
  { id: 'shot-03', start: 569,   frames: 261, dur: 8.704,  shotType: 'comparison',  text: 'OpenClaw 今年2月上线，火起来靠两件事。第一件事，接入了你能想到的所有消息平台。' },
  { id: 'shot-04', start: 830,   frames: 160, dur: 5.344,  shotType: 'bullets',     text: 'Telegram、Discord、Slack、WhatsApp，装完就能用。' },
  { id: 'shot-05', start: 990,   frames: 322, dur: 10.744, shotType: 'concept',     text: '第二件事，插件生态。ClawHub 上有一堆工具，文件读写、浏览器控制、Shell操作，基本上能装的都装上了。' },
  { id: 'shot-06', start: 1312,  frames: 227, dur: 7.576,  shotType: 'bullets',     text: '说白了就是个连接器，把 AI 和你日常用的工具连起来。接进来快，稳。' },
  { id: 'shot-07', start: 1539,  frames: 422, dur: 14.056, shotType: 'comparison',  text: '但用长了，三个问题就冒出来了。第一，上下文膨胀。每次对话它把完整历史塞进去，用得越多 token 消耗越多，推理越慢，成本越高。' },
  { id: 'shot-08', start: 1961,  frames: 236, dur: 7.864,  shotType: 'comparison',  text: '第二，无状态。它不记得你上次怎么做，用三个月和用三天，没有区别。' },
  { id: 'shot-09', start: 2197,  frames: 253, dur: 8.440,  shotType: 'comparison',  text: '第三，半自动。复杂任务来了它能做，但得你一步一步指挥，你不说它就停在那。' },
  { id: 'shot-10', start: 2450,  frames: 526, dur: 17.536, shotType: 'tech',       text: '这三个问题，说白了都是设计问题，不是打个补丁能搞定的。这里有个技术问题要说清楚。Transformers 的注意力复杂度是 O(n²)，上下文越长推理成本不是线性增长，是平方增长。' },
  { id: 'shot-11', start: 2976,  frames: 345, dur: 11.488, shotType: 'tech',       text: 'OpenClaw 靠堆上下文解决记忆问题，堆得越多越慢。Hermes 用技能系统替代全量历史，不堆，用提取代替堆积。' },
  { id: 'shot-12', start: 3321,  frames: 479, dur: 15.952, shotType: 'info',       text: 'Hermes 呢，今年2月25日由 Nous Research 开源。不到两个月，GitHub 4.7万星，冲到全球热榜第一了。同时 v0.8.0 也出来了，3536次提交。' },
  { id: 'shot-13', start: 3800,  frames: 423, dur: 14.104, shotType: 'info',       text: '但 Hermes 做了一个不一样的选择——自我进化。它有个内置学习循环，每次帮你搞定任务，它会自己琢磨：这次是怎么做的？有没有可以复用的步骤？' },
  { id: 'shot-14', start: 4223,  frames: 314, dur: 10.480, shotType: 'flowchart',  text: '下次遇到类似的，能不能直接调？任务执行成功，它就记下来，变成技能。用得越久，它会的越多。' },
  { id: 'shot-15', start: 4537,  frames: 449, dur: 14.968, shotType: 'flowchart',  text: '这套架构，叫闭环学习。OpenClaw 是开环执行器：你给指令，它执行，结束。Hermes 是闭环系统：执行、分析、提取、存储、下次调用。' },
  { id: 'shot-16', start: 4986,  frames: 391, dur: 13.048, shotType: 'flowchart',  text: '开环系统用久了，上下文越来越长。闭环系统用久了，技能越来越多。结果就是，任务完成时间随使用次数递减，而不是递增。' },
  { id: 'shot-17', start: 5377,  frames: 425, dur: 14.152, shotType: 'case',       text: '我看过几个从 OpenClaw 迁过去的案例。Reddit 上有人说：丝滑换壳，没翻车，体验直线飙升。每月5美元，能跑一个跟着你成长的 AI 打工人。' },
  { id: 'shot-18', start: 5802,  frames: 285, dur: 9.496,  shotType: 'case',       text: '支持本地部署，接 Ollama，数据不离自己的机器。注意，这是用户真实反馈，不是官方宣传。' },
  { id: 'shot-19', start: 6087,  frames: 557, dur: 18.568, shotType: 'concept',    text: '所以问题变了。不是谁先上线谁赢了。是谁的设计哲学笑到最后。OpenClaw 是你来教它。Hermes 是它自己学会。前者上限是你的水平，后者上限是 AI 自己的进化能力。' },
  { id: 'shot-20', start: 6644,  frames: 505, dur: 16.840, shotType: 'cta',        text: '你现在用哪个？用 OpenClaw 的，说说最受不了的地方。用 Hermes 的，说说最香的功能。觉得有收获的，转给身边搞 AI 的朋友。关注我，下期出 Hermes 5分钟快速上手。' },
];

// 总帧数（含尾部淡出：6644+505+20=7169）
export const TOTAL_FRAMES = 7169;
