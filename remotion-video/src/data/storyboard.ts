// Storyboard data for OpenClaw 小龙虾爆火背后4层逻辑
// Generated from Step 4

export type Shot = {
  id: string;
  shotType: 'hook' | 'context' | 'content' | 'summary' | 'cta';
  purpose: string;
  durationSec: number;
  visualGoal: string;
  imagePrompt: string;
  onScreenText: {
    title: string;
    subtitle: string;
    tag?: string;
  };
  transition: string;
  notes: string;
  icons?: string[];
};

export const STORYBOARD: Shot[] = [
  {
    id: 'shot-01',
    shotType: 'hook',
    purpose: '开场抓眼，打掉表面理解',
    durationSec: 18,
    visualGoal: '用反差视觉快速抓住注意力，立刻反转“只是玩梗”的表面理解。',
    imagePrompt: '黑色深色科技背景，中央一个巨大的卡通小龙虾吉祥物形象，表情夸张有记忆点，背景用金色扫光和紫色粒子漂浮营造高端科技感，吉祥物旁边打一行小字：“你以为这就完了？”，整体风格像高端 AI 工具教程封面，克制但抓眼。',
    onScreenText: {
      title: '你以为这就完了？',
      subtitle: 'OpenClaw 小龙虾背后，真正撑住它的不是名字',
      tag: 'EP.4 · 技术解读',
    },
    transition: 'fade',
    notes: '开场，情绪从好奇转到反转，节奏要快。吉祥物和文字的比例控制好，不要让吉祥物太抢后面内容的风头。',
  },
  {
    id: 'shot-02',
    shotType: 'context',
    purpose: '给出主论点，让观众知道这条视频要讲什么',
    durationSec: 10,
    visualGoal: '在 Hook 之后立刻给出核心论点，让观众有预期。',
    imagePrompt: '深色科技背景，中央一行金色高亮主论点文字，字体大而清晰，下方有淡紫色微光背景，底部无标签，风格克制、干净，像高端发布会金句页。',
    onScreenText: {
      title: '为什么一个技术项目，能靠一个角色打开传播入口之后，后面还有一整套技术结构把热度接住？',
      subtitle: '',
    },
    transition: 'fade',
    notes: '这个镜头是过渡，给主论点留够时间，不要一闪而过。',
  },
  {
    id: 'shot-03',
    shotType: 'content',
    purpose: 'Part 1 第一段：上手路径概览',
    durationSec: 12,
    visualGoal: '让观众先看到整体上手链路，建立“上手很短”的第一印象。',
    imagePrompt: '深色科技背景，中央一条横向时间线，四个节点依次排列：① install ② onboard ③ gateway ④ dashboard，每个节点用紫色光晕标记，节点之间有金色连接线，背景有轻微粒子漂浮，风格干净高端。',
    onScreenText: {
      title: '从讨论到试用，只需要四步',
      subtitle: 'install → onboard → gateway → dashboard',
    },
    transition: 'slide-in',
    notes: '四个节点要依次出现，靠动效制造节奏感。',
    icons: ['terminal', 'play', 'server', 'layout-dashboard'],
  },
  {
    id: 'shot-04',
    shotType: 'content',
    purpose: 'Part 1 第二段：用户实际体验案例',
    durationSec: 20,
    visualGoal: '用具体用户路径案例，让“上手短”这件事落地。',
    imagePrompt: '深色科技背景，左侧展示一个用户的电脑屏幕截图序列：打开终端 → 输入安装命令 → 执行 onboarding → 打开 dashboard，右侧叠加一个箭头流程，每个步骤旁边有紫色光圈标注时间成本，底部加一行金色文字：“第一次体验的用户，不需要研究底层架构”，整体风格像操作演示但更简洁。',
    onScreenText: {
      title: '不需要研究底层架构',
      subtitle: 'Node + 安装脚本 + onboarding + dashboard = 第一轮真实交互',
    },
    transition: 'fade-in',
    notes: '这是案例落地镜头，不要只讲概念，要让观众看到具体操作路径。',
    icons: ['terminal', 'file-text', 'user', 'clock'],
  },
  {
    id: 'shot-5a',
    shotType: 'content',
    purpose: 'Part 2 第一段：workspace 是什么',
    durationSec: 15,
    visualGoal: '先给出 workspace 的定义和核心定位，让观众知道这是什么。',
    imagePrompt: '深色科技背景，中央一个简洁的 workspace 概念图：一个文件夹图标代表 workspace，里面有四个文件图标围绕，文件夹周围有紫色光晕包裹，下方一行定义文字：“workspace 是 Agent 的 home，也是它的默认工作目录”，风格像技术概念解释图，干净克制。',
    onScreenText: {
      title: 'workspace 不是目录，是 Agent 的 home',
      subtitle: '',
    },
    transition: 'fade',
    notes: '这个镜头是定义，先说清楚 workspace 是什么，再展开文件体系。',
    icons: ['folder', 'home', 'box'],
  },
  {
    id: 'shot-5b',
    shotType: 'content',
    purpose: 'Part 2 第二段：workspace 文件体系',
    durationSec: 22,
    visualGoal: '展示 workspace 里的核心文件，让技术观众感受到“这不是一个黑箱”。',
    imagePrompt: '深色科技背景，展示一个文件夹目录树示意图，根目录显示 workspace，六个核心文件依次排列并有紫色辉光标注：AGENTS.md（操作说明）、SOUL.md（人格边界）、USER.md（用户偏好）、TOOLS.md（工具规则）、memory/（记忆日志）、skills/（技能模块），每个文件旁边有简短图标，目录树周围有淡紫色光晕，风格像技术文档图但更精致，强调“这些文件共同构成了 Agent 的工作模型”。',
    onScreenText: {
      title: '这些文件共同构成了 Agent 的工作模型',
      subtitle: 'AGENTS · SOUL · USER · TOOLS · memory · skills',
    },
    transition: 'fade-in',
    notes: '六个文件要依次出现，不要一次性全部堆上去，靠节奏强化记忆。',
    icons: ['file-text', 'heart', 'user', 'wrench', 'database', 'layers'],
  },
  {
    id: 'shot-5c',
    shotType: 'content',
    purpose: 'Part 2 第三段：用户自定义案例',
    durationSec: 15,
    visualGoal: '用具体用户行为案例，说明 workspace 是怎么让 Agent 行为变得可理解的。',
    imagePrompt: '深色科技背景，展示两个代码/文本编辑窗口并行：左侧窗口内容是 AGENTS.md 的规则片段（中文回答、少废话、以结果优先），右侧窗口内容是 SOUL.md 的人格片段（务实、不讨好、有判断），两个窗口之间有箭头指向中间一个紫色光晕的 Agent 图标，底部加一行文字：“把规则写进文件，把行为写进模型”，整体风格干净，有工程感。',
    onScreenText: {
      title: '把规则写进文件，把行为写进模型',
      subtitle: 'AGENTS.md · SOUL.md · USER.md · TOOLS.md',
    },
    transition: 'fade',
    notes: '这是案例落地镜头，展示真实文件内容如何对应到 Agent 行为。',
    icons: ['code', 'file-text', 'arrow-right'],
  },
  {
    id: 'shot-6a',
    shotType: 'content',
    purpose: 'Part 3 第一段：agent loop 全链路概览',
    durationSec: 14,
    visualGoal: '先让观众看到完整 agent loop 的六个节点，建立全局认知。',
    imagePrompt: '深色科技背景，中央一个横向循环流程图，六个节点依次排列：接收输入 → 组装上下文 → 模型推理 → 执行工具 → 流式回复 → 持久化，节点之间有金色箭头连接，整个环路有紫色呼吸光效，风格像高端系统架构图但更简洁有力。',
    onScreenText: {
      title: '这不是壳，是能稳定跑的系统',
      subtitle: 'intake → context → inference → tools → streaming → persistence',
    },
    transition: 'loop-in',
    notes: '六个节点要依次出现，靠节奏强化记忆，不要一次性全显示。',
    icons: ['inbox', 'layers', 'cpu', 'wrench', 'zap', 'save'],
  },
  {
    id: 'shot-6b',
    shotType: 'content',
    purpose: 'Part 3 第二段：session 和 queueing 机制',
    durationSec: 18,
    visualGoal: '拆开讲 session lane 和 queueing，让技术观众感受到“这不是表面，是底层机制”。',
    imagePrompt: '深色科技背景，展示两个并行消息时间线：上方时间线是用户连续发送的两条消息，下方时间线是系统如何串行处理这两条消息（session lane 1 → 处理中 → session lane 1 → 完成），中间有紫色虚线标注 queueing 和 lifecycle 节点，底部加一行金色文字：“每个 session 同时只走一条 lane，不会乱”，整体风格像技术架构剖面图。',
    onScreenText: {
      title: '连续消息不会乱：session lane + queueing',
      subtitle: 'session lane · lifecycle · agent.wait',
    },
    transition: 'slide-in',
    notes: '这个镜头是技术细节落地，要让观众理解“它怎么处理并发”，而不是只讲概念。',
    icons: ['messages-square', 'clock', 'lock', 'repeat'],
  },
  {
    id: 'shot-7a',
    shotType: 'content',
    purpose: 'Part 4 第一段：平台型架构概览',
    durationSec: 14,
    visualGoal: '让观众先理解“它不是单点工具，是在往平台型结构走”。',
    imagePrompt: '深色科技背景，展示一个平台型架构示意图：底层是 gateway，中间层是主 agent，上层有多个独立 agent 节点环绕，每个 agent 有不同 workspace 图标，主 agent 和各节点之间有 routing 连线，底部标注 plugin tools、optional tools、allowlist 等模块，整体风格有层次，像真实系统架构图。',
    onScreenText: {
      title: '不是单点工具，是可扩展平台',
      subtitle: 'gateway · multi-agent · routing',
    },
    transition: 'expand-in',
    notes: '主 agent 和多 agent 节点之间的 routing 连线要有方向感，让观众理解“消息是怎么流过去的”。',
    icons: ['server', 'users', 'git-merge'],
  },
  {
    id: 'shot-7b',
    shotType: 'content',
    purpose: 'Part 4 第二段：plugin tools 和 optional tools 案例',
    durationSec: 18,
    visualGoal: '用具体案例说明 plugin tools / optional tools / allowlist 怎么工作。',
    imagePrompt: '深色科技背景，左侧展示一个 JSON 配置文件片段（tools.allow 部分），右侧展示对应的 plugin tools 和 optional tools 列表，每个工具有紫色勾选标记，部分工具有“optional”金色标签，配置和工具之间有箭头连接，底部加一行金色文字：“哪些工具对哪个 agent 开放，完全可配置”，整体风格像代码+架构对照图。',
    onScreenText: {
      title: '哪些工具对哪个 agent 开放，完全可配置',
      subtitle: 'plugin tools · optional tools · allowlist',
    },
    transition: 'fade-in',
    notes: '这个镜头是案例落地，要展示真实配置片段，让技术观众有代入感。',
    icons: ['puzzle', 'settings', 'toggle-right', 'list'],
  },
  {
    id: 'shot-08',
    shotType: 'summary',
    purpose: '收束四层逻辑，回扣开头',
    durationSec: 18,
    visualGoal: '把四层逻辑浓缩到一个视觉里，完成首尾呼应。',
    imagePrompt: '深色科技背景，中央一个简洁的四层金字塔或四象限图，每层依次标注：上手路径 / workspace 设计 / agent loop / 插件扩展，四层整体有紫色辉光，顶部放一个小龙虾吉祥物图标但比开头小很多，底部加一行金色总结句：“真正撑住热度的，是这套技术结构”，整体风格克制、收束感强。',
    onScreenText: {
      title: '真正撑住热度的，不是梗，是这套技术结构',
      subtitle: '',
    },
    transition: 'fade',
    notes: '总结镜头，视觉上要明显比前面几个内容镜头更简洁，不要再加新的技术信息。',
    icons: ['git-branch', 'flame', 'check-circle'],
  },
  {
    id: 'shot-09',
    shotType: 'cta',
    purpose: '给观众下一步动作',
    durationSec: 14,
    visualGoal: '用干净的结尾页给 CTA，留钩子。',
    imagePrompt: '深色背景，只保留简洁的 logo 级小龙虾图标和一行 CTA 文字，背景有轻微紫色粒子漂浮和金色扫光，风格干净克制，底部居中显示 CTA 文案，整体像高端技术产品发布页结尾。',
    onScreenText: {
      title: '如果你愿意，下一条我们可以继续拆：OpenClaw 最值得抄的几条技术设计',
      subtitle: '',
    },
    transition: 'fade',
    notes: 'CTA 镜头要干净，不要加太多元素，只保留钩子文案和最轻量的视觉元素。',
    icons: ['sparkles', 'arrow-right'],
  },
];

export const TOTAL_DURATION_SEC = STORYBOARD.reduce((sum, s) => sum + s.durationSec, 0);
export const FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const BG_COLOR = '#09070d';
export const ACCENT_PURPLE = '#8b5cf6';
export const ACCENT_GOLD = '#f59e0b';
