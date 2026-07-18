/**
 * shotGrammar.ts — 导演级镜头语法系统
 *
 * 核心原则（来自 20 样本扫描的残酷结论）：
 *   "你现在最大的问题不是'不会动'，而是'不会拍'。"
 *   "不是缺 10 个 family，是缺 1 套 shot grammar。"
 *
 * 本文件是"导演意图层"：
 *   1. 定义 ShotArchetype — 镜头原型（高于 family）
 *   2. 定义 DataEventGrammar — 数据事件的戏剧化翻译
 *   3. 定义 DirectorBeat — 段落节拍合同
 *   4. 定义 CameraIntent — 镜头语义（不是装饰参数）
 *   5. 定义 VisualMemoryObject — 每段必须有一个记忆物
 *
 * 调用顺序（从外到内）：
 *   Storyboard → DirectorBeat → ShotArchetype → CameraIntent + DataEvent → Family → Component
 *
 * 参照：
 *   - github-unwrapped FeatureList.tsx — 3个spring对象分工（建立/展开/收束）
 *   - shellbot-product-video — AIDA升级为导演beat sheet
 *   - remotion-animated — 声明式动画抽象
 *   - template-code-hike — 单一视觉母题贯穿一段
 */

import type {CameraMotionPreset} from './registry';

// ─── DirectorBeatOutput — JSON-serializable form for skill output ─────────────

/**
 * JSON-serializable DirectorBeat for skill/Step 4 output.
 * All enum-like values are plain strings (not union literals) for JSON compatibility.
 * Linked to shots via beatId.
 */
export interface DirectorBeatOutput {
  id: string;
  /** beatId links this beat to a shot.id — one beat per shot is typical but not required */
  beatId: string;
  /** Narrative subject: who or what is the focus of this paragraph */
  subject: string;
  /** Action: reveal / compare / overtake / compress / burst / follow / hold */
  action: string;
  /** Conflict/suspense: what tension this beat builds */
  tension: string;
  /** What to reveal at the end of this beat */
  revelation: string;
  memoryObject: {
    type: string;       // MemoryObjectType as plain string: 'line'|'block'|'word'|'node'|'beam'|'card'|'ring'|'axis'
    role: string;       // Role description in the frame
    enterFrame: number;
    color: string;      // hex color
  };
  cameraIntent: string; // CameraIntent as plain string: 'pin'|'compress'|'chase'|'drift'|'confront'|'linger'|'reveal'|'none'
  dataEvent: string;    // DataEventVerb as plain string: 'count-up'|'delta-hit'|'overtake'|'threshold-cross'|'burst-spread'|'trace-flow'|'pin'|'settle'|'flash'|'none'
  archetype: string;    // ShotArchetype as plain string: 'lock-on reveal'|'pressure countdown'|...
  suggestedEnterFrames: number;
  suggestedEmphasisFrames: number;
}

// ─── ShotArchetype：镜头原型 ──────────────────────────────────────────────────

export type ShotArchetype =
  // 锁定揭示型：信息像被钉住一样出现
  | 'lock-on reveal'
  // 压力倒计时型：数字像子弹一样打出来
  | 'pressure countdown'
  // 追及竞速型：两列数据像在赛跑
  | 'overtake race'
  // 证据别针型：事实像别针一样钉入画面
  | 'evidence pin'
  // 阈值突破型：数字穿膜而出
  | 'threshold breach'
  // 余震停留型：高潮后画面凝固在那里
  | 'aftershock hold'
  // 追焦跟随型：镜头跟随最重要的元素
  | 'follow focus'
  // 压缩对比型：把两个东西压在一起比较
  | 'compress compare'
  // 漂移展示型：信息漂移入场，像在水里浮上来
  | 'drift reveal'
  // 子弹列车型：连续多个数据依次高速轰出
  | 'bullet train'
  // 爆发扩散型：一个点爆炸成多个点
  | 'burst spread'
  // 追溯流动型：像追踪一条河流的轨迹
  | 'trace flow';

export type DataEventVerb =
  | 'count-up'      // 数字从零开始数上来
  | 'delta-hit'     // 变化量像拳头一样击出
  | 'overtake'      // 一个指标超过了另一个
  | 'threshold-cross' // 穿过了某个心理阈值线
  | 'burst-spread'  // 从一个点爆发扩散
  | 'trace-flow'    // 追溯一条路径的流动
  | 'pin'           // 证据钉入
  | 'settle'        // 沉淀下来，凝固
  | 'flash'         // 闪一下强调
  | 'none';         // 裸数字，无事件

export type CameraIntent =
  | 'pin'      // 锁定：把注意力钉在某个元素上
  | 'compress' // 压缩：把两个元素压在一起比较
  | 'chase'    // 追焦：跟随最重要的移动元素
  | 'drift'    // 漂移：像在水里浮上来
  | 'confront' // 对峙：两个元素面对面对峙
  | 'linger'   // 停留：在某个元素上多停一会
  | 'reveal'   // 揭示：从无到有慢慢显现
  | 'none';

export type MemoryObjectType =
  | 'line'     // 一条线：时间线、对比线、趋势线
  | 'block'    // 一个块：数据块、面板块
  | 'word'     // 一个词：关键词、高频词
  | 'node'     // 一个节点：图谱节点、流程节点
  | 'beam'     // 一束光：放射光、聚焦光
  | 'card'     // 一张卡：证据卡、特性卡
  | 'ring'     // 一圈圆环：循环、进度环
  | 'axis';    // 一个坐标轴：X轴、Y轴

// ─── VisualMemoryObject：每段必须有一个记忆物 ────────────────────────────────

export interface VisualMemoryObject {
  type: MemoryObjectType;
  /** 描述这个记忆物在画面里的角色 */
  role: string;
  /** 记忆物的进入帧（用于 stagger 编排） */
  enterFrame: number;
  /** 记忆物的主导颜色 */
  color: string;
}

// ─── DirectorBeat：段落节拍 ─────────────────────────────────────────────────

export interface DirectorBeat {
  /** 段落 ID */
  id: string;
  /** 叙事主语：谁或什么是这个段落的焦点 */
  subject: string;
  /** 动作：这段要"做什么"——揭示、比较、追及、压制 */
  action: string;
  /** 冲突/悬念：这个段落建立什么张力 */
  tension: string;
  /** 揭示对象：这段末尾要揭示什么 */
  revelation: string;
  /** 记忆物：这段必须有一个视觉记忆点 */
  memoryObject: VisualMemoryObject;
  /** 镜头意图：camera 做什么语义动作 */
  cameraIntent: CameraIntent;
  /** 数据事件：这个段落里的数字被翻译成什么事件 */
  dataEvent: DataEventVerb;
  /** 推荐 ShotArchetype */
  archetype: ShotArchetype;
  /** 建议的 enterFrames（场景进入动画帧数） */
  suggestedEnterFrames: number;
  /** 建议的 emphasisFrames（场景停留强调帧数） */
  suggestedEmphasisFrames: number;
}

// ─── ShotArchetypeMeta：镜头原型元数据 ─────────────────────────────────────

export interface ShotArchetypeMeta {
  archetype: ShotArchetype;
  description: string;
  /** 典型使用场景 */
  whenToUse: string[];
  /** 推荐的 CameraIntent */
  cameraIntent: CameraIntent;
  /** 推荐的 DataEventVerb */
  dataEvent: DataEventVerb;
  /** 典型 enterFrames 范围 */
  enterFramesRange: [number, number];
  /** 典型 emphasisFrames 范围 */
  emphasisFramesRange: [number, number];
  /** 典型 stagger gap */
  typicalStaggerGap: number;
}

// ─── Archetype 注册表 ────────────────────────────────────────────────────────

export const SHOT_ARCHETYPE_REGISTRY: Record<ShotArchetype, ShotArchetypeMeta> = {
  'lock-on reveal': {
    archetype: 'lock-on reveal',
    description: '信息像被钉住一样出现。画面先黑/模糊，然后一个元素被"咔"一声锁定。',
    whenToUse: ['强调关键词', '引入核心概念', '切换到最重要信息'],
    cameraIntent: 'pin',
    dataEvent: 'pin',
    enterFramesRange: [12, 24],
    emphasisFramesRange: [40, 80],
    typicalStaggerGap: 0,
  },
  'pressure countdown': {
    archetype: 'pressure countdown',
    description: '数字像子弹一样高速打出来。从大数快速倒数，或从零爆炸性冲到一个大数。',
    whenToUse: ['强调性能差距', '建立紧迫感', '数据对比的戏剧化'],
    cameraIntent: 'pin',
    dataEvent: 'count-up',
    enterFramesRange: [8, 16],
    emphasisFramesRange: [30, 60],
    typicalStaggerGap: 4,
  },
  'overtake race': {
    archetype: 'overtake race',
    description: '两列数据像在赛跑。一个指标慢慢追上并超过另一个，有明显的"超车"瞬间。',
    whenToUse: ['性能对比', '市场份额变化', '进步vs退步'],
    cameraIntent: 'chase',
    dataEvent: 'overtake',
    enterFramesRange: [16, 30],
    emphasisFramesRange: [50, 90],
    typicalStaggerGap: 6,
  },
  'evidence pin': {
    archetype: 'evidence pin',
    description: '证据像别针一样钉入画面。一个事实被固定下来作为论点支撑。',
    whenToUse: ['引用高光', '专家观点', '关键发现揭示'],
    cameraIntent: 'pin',
    dataEvent: 'pin',
    enterFramesRange: [10, 20],
    emphasisFramesRange: [40, 70],
    typicalStaggerGap: 0,
  },
  'threshold breach': {
    archetype: 'threshold breach',
    description: '数字穿膜而出。一个阈值被跨越，画面有明显的"穿过去了"的物理感。',
    whenToUse: ['突破性数据', '历史首次', '超越标杆'],
    cameraIntent: 'reveal',
    dataEvent: 'threshold-cross',
    enterFramesRange: [12, 20],
    emphasisFramesRange: [40, 70],
    typicalStaggerGap: 8,
  },
  'aftershock hold': {
    archetype: 'aftershock hold',
    description: '高潮后画面凝固在那里。像地震后的余震停留，让冲击感沉淀下来。',
    whenToUse: ['数据峰值后', '重大揭示后', '情感高点后的沉默'],
    cameraIntent: 'linger',
    dataEvent: 'settle',
    enterFramesRange: [20, 35],
    emphasisFramesRange: [60, 100],
    typicalStaggerGap: 0,
  },
  'follow focus': {
    archetype: 'follow focus',
    description: '镜头跟随最重要的元素。画面里最重要的东西移动，camera 追着它走。',
    whenToUse: ['时间线推进', '流程步骤', '排行榜滚动'],
    cameraIntent: 'chase',
    dataEvent: 'trace-flow',
    enterFramesRange: [14, 24],
    emphasisFramesRange: [40, 70],
    typicalStaggerGap: 10,
  },
  'compress compare': {
    archetype: 'compress compare',
    description: '把两个东西压在一起比较。左右或上下对比，差异被物理压缩到同一画面。',
    whenToUse: ['新旧对比', '方案A vs 方案B', '前后变化'],
    cameraIntent: 'compress',
    dataEvent: 'delta-hit',
    enterFramesRange: [10, 18],
    emphasisFramesRange: [35, 60],
    typicalStaggerGap: 4,
  },
  'drift reveal': {
    archetype: 'drift reveal',
    description: '信息漂移入场，像在水里浮上来。不急不慢，信息从画面边缘漂进。',
    whenToUse: ['背景介绍', '概念引入', '铺垫性信息'],
    cameraIntent: 'drift',
    dataEvent: 'trace-flow',
    enterFramesRange: [20, 35],
    emphasisFramesRange: [50, 80],
    typicalStaggerGap: 8,
  },
  'bullet train': {
    archetype: 'bullet train',
    description: '连续多个数据依次高速轰出。一个接一个，数据像子弹一样飞入画面。',
    whenToUse: ['多项目排名', '多个特性列表', '连续里程碑'],
    cameraIntent: 'pin',
    dataEvent: 'count-up',
    enterFramesRange: [6, 12],
    emphasisFramesRange: [25, 45],
    typicalStaggerGap: 3,
  },
  'burst spread': {
    archetype: 'burst spread',
    description: '从一个点爆发扩散。一个核心爆发成多个碎片，散开到整个画面。',
    whenToUse: ['特性展开', '优点爆发', '从一到多'],
    cameraIntent: 'reveal',
    dataEvent: 'burst-spread',
    enterFramesRange: [12, 22],
    emphasisFramesRange: [40, 70],
    typicalStaggerGap: 6,
  },
  'trace flow': {
    archetype: 'trace flow',
    description: '像追踪一条河流的轨迹。路径被逐帧绘制，数据沿路径流动。',
    whenToUse: ['流程步骤', '时间线', '依赖链', '架构图'],
    cameraIntent: 'chase',
    dataEvent: 'trace-flow',
    enterFramesRange: [16, 28],
    emphasisFramesRange: [45, 75],
    typicalStaggerGap: 10,
  },
};

// ─── CameraIntent → CameraMotionPreset 映射 ─────────────────────────────────

/**
 * 语义层到实现层的翻译。
 * CameraIntent 是"导演语言"，CameraMotionPreset 是"技术语言"。
 */
export const CAMERA_INTENT_TO_MOTION: Record<CameraIntent, CameraMotionPreset> = {
  pin: 'push-in',        // 锁定 = push-in，把画面推进去
  compress: 'pan-x',      // 压缩 = pan-x，横向挤压
  chase: 'pan-y',        // 追焦 = pan-y，纵向跟随
  drift: 'drift',         // 漂移 = drift，Y轴浮动
  confront: 'push-in',    // 对峙 = push-in，两边往中间推
  linger: 'none',         // 停留 = none，多看一会
  reveal: 'drift',        // 揭示 = drift，缓慢浮现
  none: 'none',
};

// ─── DataEventVerb → 具体实现参数 ───────────────────────────────────────────

export interface DataEventConfig {
  /** 数据动画的基础 stagger gap */
  staggerGap: number;
  /** 是否需要强调色脉冲 */
  pulseOnEnter: boolean;
  /** 数值动画函数名（在 motion.ts 中） */
  motionFunction: 'countUp' | 'settle' | 'burst' | 'trace' | 'none';
  /** 进入帧偏移（基准帧 + offset = 第一个元素进入帧） */
  baseEnterOffset: number;
}

export const DATA_EVENT_CONFIGS: Record<DataEventVerb, DataEventConfig> = {
  'count-up': {staggerGap: 4, pulseOnEnter: true, motionFunction: 'countUp', baseEnterOffset: 6},
  'delta-hit': {staggerGap: 6, pulseOnEnter: true, motionFunction: 'countUp', baseEnterOffset: 8},
  'overtake': {staggerGap: 8, pulseOnEnter: true, motionFunction: 'countUp', baseEnterOffset: 12},
  'threshold-cross': {staggerGap: 10, pulseOnEnter: true, motionFunction: 'burst', baseEnterOffset: 10},
  'burst-spread': {staggerGap: 6, pulseOnEnter: true, motionFunction: 'burst', baseEnterOffset: 8},
  'trace-flow': {staggerGap: 10, pulseOnEnter: false, motionFunction: 'trace', baseEnterOffset: 12},
  'pin': {staggerGap: 0, pulseOnEnter: true, motionFunction: 'settle', baseEnterOffset: 10},
  'settle': {staggerGap: 0, pulseOnEnter: false, motionFunction: 'settle', baseEnterOffset: 20},
  'flash': {staggerGap: 0, pulseOnEnter: true, motionFunction: 'none', baseEnterOffset: 4},
  'none': {staggerGap: 0, pulseOnEnter: false, motionFunction: 'none', baseEnterOffset: 0},
};

// ─── ShotGrammar — 从 Storyboard Shot 推导导演层参数 ─────────────────────────

export interface ShotContext {
  family: string;
  shotIndex: number;
  totalShots: number;
  /** 数字相关的 data 字段 */
  numericFields?: Array<{field: string; value: number | string; label?: string}>;
  /** 场景类型意图：opening / closing / chapter / scene */
  level?: string;
  /** 场景类型：hero / benchmark / feature 等 */
  type?: string;
  /** 场景意图描述（来自 storyboard 的自然语言标注） */
  sceneIntent?: string;
  /** 中文 storyboard cue：来自口播稿的关键动作词 */
  storyboardCueZh?: string;
  /** script block 标签：来自分镜脚本的段落标注 */
  scriptBlockLabel?: string;
  /** This shot's beatId — used to look up the corresponding DirectorBeat in directorBeats */
  beatId?: string;
  /** Top-level DirectorBeat array from Step 4 output — matched by beatId */
  directorBeats?: DirectorBeatOutput[];
}

const NUMERIC_DATA_FAMILIES = new Set([
  'benchmark-chart',
  'compare-board',
  'metrics',
  'data-stream',
  'number-strip',
]);

/**
 * 中文 storyboard cue → archetype 映射表。
 * 每个条目包含触发关键词和对应的镜头原型/数据事件。
 * 在 resolveShotGrammar 的优先级 1 中使用。
 */
const INTENT_CUE_MAP = [
  {keywords: ['追', '超', '赶', '赛', '赢', '领先'], archetype: 'overtake race' as const, dataEvent: 'overtake' as const},
  {keywords: ['爆发', '炸', '爆', '扩散', '展开'], archetype: 'burst spread' as const, dataEvent: 'burst-spread' as const},
  {keywords: ['揭示', '出现', '曝光', '曝光'], archetype: 'lock-on reveal' as const, dataEvent: 'pin' as const},
  {keywords: ['对比', '压缩', '碰撞', '对峙'], archetype: 'compress compare' as const, dataEvent: 'delta-hit' as const},
  {keywords: ['追踪', '追随', '跟随', '流动', '流'], archetype: 'follow focus' as const, dataEvent: 'trace-flow' as const},
  {keywords: ['穿透', '突破', '越线', '穿过'], archetype: 'threshold breach' as const, dataEvent: 'threshold-cross' as const},
  {keywords: ['子弹', '高速', '连续', '轰', '一连串'], archetype: 'bullet train' as const, dataEvent: 'count-up' as const},
  {keywords: ['钉', '定', '按'], archetype: 'evidence pin' as const, dataEvent: 'pin' as const},
  {keywords: ['漂', '浮', '慢慢'], archetype: 'drift reveal' as const, dataEvent: 'trace-flow' as const},
  {keywords: ['停留', '凝固', '定格', '后'], archetype: 'aftershock hold' as const, dataEvent: 'settle' as const},
];

export interface ResolvedShotGrammar {
  /** 推导出的 ShotArchetype */
  archetype: ShotArchetype;
  /** 推导出的 CameraIntent */
  cameraIntent: CameraIntent;
  /** 推导出的 DataEventVerb */
  dataEvent: DataEventVerb;
  /** 推导出的 enterFrames */
  enterFrames: number;
  /** 推导出的 emphasisFrames */
  emphasisFrames: number;
  /** 推导出的 stagger gap */
  staggerGap: number;
  /** 推导出的 VisualMemoryObject */
  memoryObject: VisualMemoryObject;
  /** 导演层注释（给 QA 看的） */
  directorNote: string;
}

/**
 * 从 ShotContext 推导导演层参数。
 * Ultimate 组件视觉工具使用的 motion grammar 定义。
 *
 * 规则（v2 — 语义优先于 family）：
 * 0. DirectorBeat：若 ctx.directorBeats 中有匹配 beatId 的 beat，直接使用
 * 1. storyboardCueZh / sceneIntent 优先：动作词直接决定 archetype/dataEvent
 * 2. level 其次：opening/closing 有专属 archetype
 * 3. type 辅助：补充 family 无法覆盖的细粒度
 * 4. family 兜底：没有任何语义输入时的 fallback
 * 5. ShotArchetypeMeta 决定 enterFrames / emphasisFrames / staggerGap
 */
export function resolveShotGrammar(ctx: ShotContext): ResolvedShotGrammar {
  // ── 优先级 0：DirectorBeat lookup via beatId（最高优先级）─────────────
  if (ctx.directorBeats && ctx.directorBeats.length > 0 && ctx.beatId) {
    const beat = ctx.directorBeats.find((b) => b.beatId === ctx.beatId);
    if (beat?.archetype) {
      return resolveFromDirectorBeat(beat, ctx);
    }
  }

  const multiNucleusFamilyArchetype = resolveMultiNucleusFamilyArchetype(ctx.family);
  if (multiNucleusFamilyArchetype) {
    return buildFromArchetype(
      multiNucleusFamilyArchetype,
      ctx,
      multiNucleusFamilyArchetype === 'compress compare' ? 'delta-hit' : 'burst-spread',
    );
  }

  // ── 优先级 1：中文 storyboard cue → 直接映射到 archetype ──────────────
  for (const entry of INTENT_CUE_MAP) {
    const cueText = ctx.storyboardCueZh || '';
    if (cueText && entry.keywords.some((kw) => cueText.includes(kw))) {
      const meta = SHOT_ARCHETYPE_REGISTRY[entry.archetype];
      const memoryObject = deriveMemoryObject(entry.archetype, ctx.shotIndex, entry.dataEvent);
      const enterFrames = normalizeEnterFrames(meta.enterFramesRange[0]);
      const emphasisFrames = meta.emphasisFramesRange[0];
      return {
        archetype: entry.archetype,
        cameraIntent: meta.cameraIntent,
        dataEvent: entry.dataEvent,
        enterFrames,
        emphasisFrames,
        staggerGap: meta.typicalStaggerGap,
        memoryObject,
        directorNote: `[cue命中] ${cueText} → ${entry.archetype} | ${entry.dataEvent} | mem:${memoryObject.type}`,
      };
    }
  }

  // ── 优先级 2（与 level 同级）：scriptBlockLabel / type 直接覆盖 ──────────
  if (ctx.scriptBlockLabel && /^step-\d+$/.test(ctx.scriptBlockLabel)) {
    const meta = SHOT_ARCHETYPE_REGISTRY['follow focus'];
    return {
      archetype: 'follow focus',
      cameraIntent: meta.cameraIntent,
      dataEvent: 'count-up',
      enterFrames: normalizeEnterFrames(meta.enterFramesRange[0]),
      emphasisFrames: meta.emphasisFramesRange[0],
      staggerGap: meta.typicalStaggerGap,
      memoryObject: deriveMemoryObject('follow focus', ctx.shotIndex, 'count-up'),
      directorNote: `[scriptBlockLabel命中] ${ctx.scriptBlockLabel} → follow focus | count-up`,
    };
  }
  if (ctx.type === 'rule') {
    const meta = SHOT_ARCHETYPE_REGISTRY['lock-on reveal'];
    return {
      archetype: 'lock-on reveal',
      cameraIntent: meta.cameraIntent,
      dataEvent: 'pin',
      enterFrames: normalizeEnterFrames(meta.enterFramesRange[0]),
      emphasisFrames: meta.emphasisFramesRange[0],
      staggerGap: meta.typicalStaggerGap,
      memoryObject: deriveMemoryObject('lock-on reveal', ctx.shotIndex, 'pin'),
      directorNote: `[type=rule命中] → lock-on reveal | pin`,
    };
  }

  // ── 优先级 3：level 专属映射 ─────────────────────────────────────────
  if (ctx.level === 'opening') {
    const meta = SHOT_ARCHETYPE_REGISTRY['lock-on reveal'];
    const memoryObject = deriveMemoryObject('lock-on reveal', ctx.shotIndex, 'pin');
    return {
      archetype: 'lock-on reveal',
      cameraIntent: meta.cameraIntent,
      dataEvent: 'pin',
      enterFrames: normalizeEnterFrames(meta.enterFramesRange[0]),
      emphasisFrames: meta.emphasisFramesRange[0],
      staggerGap: meta.typicalStaggerGap,
      memoryObject,
      directorNote: '[level=opening] → lock-on reveal | pin',
    };
  }
  if (ctx.level === 'closing') {
    const meta = SHOT_ARCHETYPE_REGISTRY['drift reveal'];
    const memoryObject = deriveMemoryObject('drift reveal', ctx.shotIndex, 'trace-flow');
    return {
      archetype: 'drift reveal',
      cameraIntent: meta.cameraIntent,
      dataEvent: 'trace-flow',
      enterFrames: normalizeEnterFrames(meta.enterFramesRange[1]),
      emphasisFrames: meta.emphasisFramesRange[1],
      staggerGap: meta.typicalStaggerGap,
      memoryObject,
      directorNote: '[level=closing] → drift reveal | trace-flow',
    };
  }

  // ── 优先级 3：sceneIntent 语义分析 ───────────────────────────────────
  const intent = ctx.sceneIntent ?? '';
  if (intent.includes('对比') || intent.includes('比较')) {
    return buildFromArchetype('compress compare', ctx, 'delta-hit');
  }
  if (intent.includes('爆发') || intent.includes('扩展') || intent.includes('展开')) {
    return buildFromArchetype('burst spread', ctx, 'burst-spread');
  }
  if (intent.includes('揭示') || intent.includes('首次')) {
    return buildFromArchetype('lock-on reveal', ctx, 'pin');
  }
  if (intent.includes('高潮') || intent.includes('峰值') || intent.includes('冲')) {
    return buildFromArchetype('pressure countdown', ctx, 'count-up');
  }

  // ── 优先级 4：type 补充映射 ──────────────────────────────────────────
  const type = ctx.type ?? '';
  if (type === 'comparison' || type === 'compare') {
    return buildFromArchetype('compress compare', ctx, 'delta-hit');
  }
  if (type === 'timeline' || type === 'flow') {
    return buildFromArchetype('follow focus', ctx, 'trace-flow');
  }

  // ── 兜底：family 默认映射 ────────────────────────────────────────────
  return resolveFromFamilyFallback(ctx);
}

export function resolveFamilyShotContract(
  family: string,
  options: {shotIndex?: number; totalShots?: number; numericFields?: ShotContext['numericFields']} = {},
): ResolvedShotGrammar {
  return resolveFromFamilyFallback({
    family,
    shotIndex: options.shotIndex ?? 0,
    totalShots: options.totalShots ?? 1,
    numericFields:
      options.numericFields
      ?? (NUMERIC_DATA_FAMILIES.has(family) ? [{field: 'sample', value: 1, label: 'sample'}] : []),
  });
}

function resolveMultiNucleusFamilyArchetype(family?: string): ShotArchetype | null {
  switch (family) {
    case 'feature-rail':
    case 'evidence-wall':
      return 'burst spread';
    case 'compare-board':
      return 'compress compare';
    default:
      return null;
  }
}

// 辅助函数：从 archetype 构建 ResolvedShotGrammar
function buildFromArchetype(
  archetype: ShotArchetype,
  ctx: ShotContext,
  dataEvent: DataEventVerb,
): ResolvedShotGrammar {
  const meta = SHOT_ARCHETYPE_REGISTRY[archetype];
  const memoryObject = deriveMemoryObject(archetype, ctx.shotIndex, dataEvent);
  const [enterMin, enterMax] = meta.enterFramesRange;
  const [emphMin, emphMax] = meta.emphasisFramesRange;
  const enterFrames = normalizeEnterFrames(
    Math.round(enterMin + ((enterMax - enterMin) * (ctx.shotIndex % 3)) / 3),
  );
  const emphasisFrames = Math.round(emphMin + ((emphMax - emphMin) * (ctx.shotIndex % 2)) / 2);
  // 回查 archetype 默认 dataEvent（当调用方未指定时）
  const resolvedDataEvent = dataEvent === 'none' ? (meta.dataEvent ?? 'none') : dataEvent;
  return {
    archetype,
    cameraIntent: meta.cameraIntent,
    dataEvent: resolvedDataEvent,
    enterFrames,
    emphasisFrames,
    staggerGap: meta.typicalStaggerGap,
    memoryObject: deriveMemoryObject(archetype, ctx.shotIndex, resolvedDataEvent),
    directorNote: `[archetype命中] ${archetype} | ${resolvedDataEvent} | mem:${deriveMemoryObject(archetype, ctx.shotIndex, resolvedDataEvent).type}`,
  };
}

function resolveFromFamilyFallback(ctx: ShotContext): ResolvedShotGrammar {
  const FAMILY_ARCHETYPE_MAP: Record<string, ShotArchetype> = {
    'benchmark-chart': 'overtake race',
    'compare-board': 'compress compare',
    'evidence-wall': 'burst spread',
    'architecture-map': 'trace flow',
    'pipeline-flow': 'trace flow',
    'memory-graph': 'trace flow',
    'feature-rail': 'burst spread',
    'number-strip': 'bullet train',
    'step-flow': 'follow focus',
    timeline: 'follow focus',
    metrics: 'pressure countdown',
    'data-stream': 'trace flow',
    hero: 'lock-on reveal',
    focus: 'lock-on reveal',
    code: 'trace flow',
    terminal: 'trace flow',
    'tag-matrix': 'burst spread',
    'quote-highlight': 'aftershock hold',
    'glossary-term': 'lock-on reveal',
    cta: 'threshold breach',
  };

  const hasNumericData = ctx.numericFields && ctx.numericFields.length > 0;
  let dataEvent: DataEventVerb = 'none';

  // 优先：无数据但有语义 family，直接给 dataEvent
  if (!hasNumericData) {
    if (ctx.family === 'quote-highlight' || ctx.family === 'glossary-term') {
      dataEvent = 'pin';
    } else if (ctx.family === 'hero' || ctx.family === 'focus') {
      dataEvent = 'pin';
    }
  }

  // 有数据时的 dataEvent 推导
  if (hasNumericData) {
    if (ctx.family === 'benchmark-chart' || ctx.family === 'compare-board') {
      dataEvent = 'overtake';
    } else if (ctx.family === 'metrics' || ctx.family === 'data-stream' || ctx.family === 'number-strip') {
      dataEvent = 'count-up';
    } else if (dataEvent === 'none') {
      // 有数据但不在上方的 family
      dataEvent = 'pin';
    }
  }

  const archetype = FAMILY_ARCHETYPE_MAP[ctx.family] ?? 'drift reveal';
  return buildFromArchetype(archetype, ctx, dataEvent);
}

export function resolveFromDirectorBeat(
  beat: DirectorBeatOutput,
  _ctx: ShotContext,
): ResolvedShotGrammar {
  const archetype = beat.archetype as ShotArchetype;
  const cameraIntent = (beat.cameraIntent || 'none') as CameraIntent;
  const dataEvent = (beat.dataEvent || 'none') as DataEventVerb;

  const meta = SHOT_ARCHETYPE_REGISTRY[archetype];
  const suggestedEnter = beat.suggestedEnterFrames ?? meta?.enterFramesRange[0] ?? 16;
  const suggestedEmphasis = beat.suggestedEmphasisFrames ?? meta?.emphasisFramesRange[0] ?? 48;
  const staggerGap = meta?.typicalStaggerGap ?? 0;

  return {
    archetype,
    cameraIntent,
    dataEvent,
    enterFrames: normalizeEnterFrames(suggestedEnter),
    emphasisFrames: suggestedEmphasis,
    staggerGap,
    memoryObject: {
      type: (beat.memoryObject?.type as MemoryObjectType) ?? 'word',
      role: beat.memoryObject?.role ?? '导演指定记忆物',
      enterFrame: beat.memoryObject?.enterFrame ?? 12,
      color: beat.memoryObject?.color ?? '#00d4ff',
    },
    directorNote: `[directorBeat] ${beat.action} | ${beat.subject} | ${beat.tension} → ${archetype}`,
  };
}

function deriveMemoryObject(
  archetype: ShotArchetype,
  shotIndex: number,
  _dataEvent: DataEventVerb,
): VisualMemoryObject {
  const MEMORY_OBJECTS: Record<ShotArchetype, Omit<VisualMemoryObject, 'enterFrame' | 'color'>> = {
    'lock-on reveal': {type: 'word', role: '画面里最重的一个词，被钉在中心'},
    'pressure countdown': {type: 'block', role: '数字的主体块，高速冲入'},
    'overtake race': {type: 'line', role: '追及线，两个数据的差距线'},
    'evidence pin': {type: 'card', role: '一张证据卡，别针钉入画面'},
    'threshold breach': {type: 'axis', role: '阈值线，被穿过的那个边界'},
    'aftershock hold': {type: 'ring', role: '一个圆环，高潮后凝固在那里'},
    'follow focus': {type: 'node', role: '当前跟随的节点，沿路径移动'},
    'compress compare': {type: 'block', role: '两个被压缩在一起的对比块'},
    'drift reveal': {type: 'beam', role: '一束漂移的光，把信息从边缘带进来'},
    'bullet train': {type: 'line', role: '一条水平线，数据沿线高速轰出'},
    'burst spread': {type: 'node', role: '爆发中心点，从这里扩散出去'},
    'trace flow': {type: 'axis', role: '追踪的路径本身，河流一样的轨迹'},
  };

  const base = MEMORY_OBJECTS[archetype] ?? {type: 'block', role: '画面主体'};

  // 每个 shot 的 enterFrame 都不同，用 shotIndex 错开
  const enterFrame = 8 + shotIndex * 3;

  // 颜色按 shot 循环
  const COLORS = ['orange', 'cyan', 'green', 'yellow', 'purple'];
  const color = COLORS[shotIndex % COLORS.length];

  return {
    ...base,
    enterFrame,
    color,
  };
}

function normalizeEnterFrames(value: number): number {
  return Math.max(8, value);
}

function buildDirectorNote(
  archetype: ShotArchetype,
  cameraIntent: CameraIntent,
  dataEvent: DataEventVerb,
  memoryObject: VisualMemoryObject,
): string {
  const meta = SHOT_ARCHETYPE_REGISTRY[archetype];
  return [
    `Archetype: ${meta.description}`,
    `Camera: ${cameraIntent} → ${CAMERA_INTENT_TO_MOTION[cameraIntent]}`,
    `DataEvent: ${dataEvent}`,
    `Memory: ${memoryObject.type}（${memoryObject.role}）`,
  ].join(' | ');
}

// ─── Motion 函数名 → 实际动画实现 ──────────────────────────────────────────

export type MotionGrammarFunction = 'countUp' | 'settle' | 'burst' | 'trace' | 'none';

export function getMotionFunctionName(verb: DataEventVerb): MotionGrammarFunction {
  return DATA_EVENT_CONFIGS[verb].motionFunction;
}

// ─── QA 失败条件（导演级） ──────────────────────────────────────────────────

export interface DirectorQAResult {
  pass: boolean;
  failures: string[];
}

/**
 * 导演级 QA 检查。
 * 在 render QA 之外，增加叙事质量门禁。
 *
 * 5 个失败条件：
 * 1. 单屏超过 1 个主信息核
 * 2. 没有 hero object
 * 3. 没有 dominant motion axis
 * 4. 数据无事件动词
 * 5. 静音看不懂主变化
 */
export function directorQA(scenes: Array<{grammar: ResolvedShotGrammar; family: string}>): DirectorQAResult {
  const failures: string[] = [];

  for (const {grammar, family} of scenes) {
    // 条件1：family 是"多核型"吗？
    const MULTI_NUCLEUS_FAMILIES = ['evidence-wall', 'feature-rail', 'compare-board'];
    if (MULTI_NUCLEUS_FAMILIES.includes(family) && grammar.archetype !== 'burst spread' && grammar.archetype !== 'compress compare') {
      failures.push(`[${family}] 多核 family 但 archetype 不是 burst/compress，信息会平掉`);
    }

    // 条件2：没有 memory object
    if (!grammar.memoryObject) {
      failures.push(`[${family}] 没有记忆物，这段判失败`);
    }

    // 条件3：没有 camera motion
    if (grammar.cameraIntent === 'none' && grammar.archetype !== 'aftershock hold') {
      failures.push(`[${family}] 没有 dominant motion axis，静止感太强`);
    }

    // 条件4：数据 family 但没有 dataEvent
    const DATA_FAMILIES = ['benchmark-chart', 'metrics', 'number-strip', 'data-stream'];
    if (DATA_FAMILIES.includes(family) && grammar.dataEvent === 'none') {
      failures.push(`[${family}] 数据类 family 但 dataEvent 是 none`);
    }

    // 条件5：enterFrames 太快（小于 8 帧）会导致静音看不清
    if (grammar.enterFrames < 8) {
      failures.push(`[${family}] enterFrames ${grammar.enterFrames} 太快，静音看不清`);
    }
  }

  return {
    pass: failures.length === 0,
    failures,
  };
}
