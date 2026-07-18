/**
 * motion-blueprints.ts — 动效蓝图目录
 *
 * 从 HyperFrames motion 技能移植的蓝图集合。
 * 每个蓝图定义了动效结构、适用场景和时长提示。
 */

// ===== 类型定义 =====

export interface MotionBlueprint {
  id: string;
  name: string;
  description: string;
  durationHint: string;
  suitableFor: string[];
  structure: string;
}

// ===== 蓝图列表 =====

/**
 * Brand Reveal · Assemble & Zoom
 * "上下文 → 焦点 → 静止"情感弧线。搭配文字打出，英雄元素弹出，镜头推近。
 * 适用：品牌/产品展示、标志聚焦、宽景到特写的渐进式收窄。
 */
export const BRAND_REVEAL_ASSEMBLE_ZOOM: MotionBlueprint = {
  id: 'brand-reveal-assemble-zoom',
  name: 'Brand Reveal · Assemble & Zoom',
  description:
    'A "context → focus → idle" emotional arc: companion text types out, hero pops in, companion exits, camera zooms into hero, settling into a subtle breathing motion.',
  durationHint: '4–6s',
  suitableFor: [
    'Brand / logo / product reveal needing context-then-focus flow',
    'Wide-shot → close-up cinematic narrowing',
    'Two-element screen where one dominates the final frame',
  ],
  structure:
    '5 phases — companion typing → hero pop → companion exit + layout recenter → zoom into hero → hero breathing idle. Single paused GSAP timeline, no hard cuts.',
};

/**
 * Comparison · Split Cards
 * "概念 → 双重证明"情感弧线。标题登场，两张卡片从两侧飞入，徽章附着。
 * 适用：对比展示、A/B对照、配对概念。
 */
export const COMPARISON_SPLIT_CARDS: MotionBlueprint = {
  id: 'comparison-split-cards',
  name: 'Comparison · Split Cards',
  description:
    'A "concept → dual proof" emotional arc: the title states the idea, two cards arrive from opposite wings with mirrored 3D tilts, and pill badges punctuate each card.',
  durationHint: '4–6s',
  suitableFor: [
    'Two complementary features shown side-by-side',
    'Comparison or A/B presentation of related capabilities',
    'Paired concepts of equal weight needing visual balance',
  ],
  structure:
    '3 phases — title slide-down → split cards entry (mirrored 3D tilt) → badges attach. Shared scene-ticker for all idle motion.',
};

/**
 * Concept-Demo · Decode & Pan
 * "挑逗 → 揭示 → 展示"情感弧线。关键词解码效果，摄像机平移到第二场景。
 * 适用：先展示概念再演示产品，解码文字效果。
 */
export const CONCEPT_DEMO_DECODE_PAN: MotionBlueprint = {
  id: 'concept-demo-decode-pan',
  name: 'Concept-Demo · Decode & Pan',
  description:
    'A "tease → reveal → demonstrate" emotional arc: an accent word decrypts via 3D flip, the camera pans into a second shot where the product itself starts typing.',
  durationHint: '6–10s',
  suitableFor: [
    'Two visually distinct shots connected by a cinematic transition',
    'First shot reveals text dramatically (decode / decrypt)',
    'Second shot demonstrates product interaction (typing, input)',
  ],
  structure:
    '4 phases — Shot 1 entry → accent word decode (hacker-flip 3D) → horizontal pan + parallax + Shot 2 entry → cursor-tracked typing. Shot strip architecture.',
};

/**
 * CTA · Morph & Press
    * "存在 → 行动"情感弧线。英雄元素变形为CTA，光标飞入点击。
 * 适用：品牌到行动的转换，模拟用户交互。
 */
export const CTA_MORPH_PRESS: MotionBlueprint = {
  id: 'cta-morph-press',
  name: 'CTA · Morph & Press',
  description:
    'A "presence → action" arc: the hero establishes the brand, then morphs into a CTA at the same screen center; a cursor arrives and lands a physical click.',
  durationHint: '4–6s',
  suitableFor: [
    'Scene transitioning from brand presence to a call-to-action',
    'Two elements occupying the same position sequentially (morph illusion)',
    'Simulated user interaction (cursor click) on the final element',
  ],
  structure:
    '4 phases — hero entrance + breath → morph swap (scale-swap transition) → cursor approach → press + release with physical feedback.',
};

/**
 * CTA · Orbit Collapse
 * "范围 → 选择 → 结果 → 产品"情感弧线。图标环绕，点击后向心塌缩。
 * 适用：多功能产品展示，多分类到单一结果的叙事压缩。
 */
export const CTA_ORBIT_COLLAPSE: MotionBlueprint = {
  id: 'cta-orbit-collapse',
  name: 'CTA · Orbit Collapse',
  description:
    'A "scope → choice → consequence → product" emotional arc: icons orbit a CTA, a cursor clicks, the orbit implodes toward the click point, and a demo springs out.',
  durationHint: '5–8s',
  suitableFor: [
    'Showing product versatility across multiple categories',
    'User-click metaphor triggering transformation from categories → result',
    '"Many options → one action → one result" narrative compression',
  ],
  structure:
    '5 phases — orbit entry → cursor click with ripple → collapse (center-outward reversed) → demo entry → demo floats. One master onUpdate for orbit + collapse.',
};

/**
 * Hook · Counter Burst
 * "稀缺 → 冲击"情感弧线。开场统计数字暴烈展开。
 * 适用：开场钩子、戏剧性数字、关注度抓取。
 */
export const HOOK_COUNTER_BURST: MotionBlueprint = {
  id: 'hook-counter-burst',
  name: 'Hook · Counter Burst',
  description:
    'A "scarcity → impact" emotional arc: the frame opens dark and empty, icons puncture in clustered tightly, then the number explodes upward while icons fling outward.',
  durationHint: '3–5s',
  suitableFor: [
    'Opening hook needing a single dramatic statistic',
    'Statistic reinforced by 3-5 thematic icons',
    'Scene must feel kinetic from frame 1',
  ],
  structure:
    '4 overlapping phases — cold open → icon entries (staggered) → count + expansion chord (shared duration + ease) → multi-phase camera push.',
};

/**
 * Messaging · Multi-Phrase
 * "陈述，再陈述，再陈述"弧线。多段文字依次打出，硬切切换。
 * 适用：纯文字信息传递、多段标语轮播。
 */
export const MESSAGING_MULTI_PHRASE: MotionBlueprint = {
  id: 'messaging-multi-phrase',
  name: 'Messaging · Multi-Phrase',
  description:
    'A "statement, then statement, then statement" arc: each phrase types itself out with neutral lead-in and colored emphasis, then hard-cuts to the next.',
  durationHint: '7–8s',
  suitableFor: [
    'Multiple text phrases displayed sequentially with typing rhythm',
    'Each phrase having a dual-tone structure (neutral lead-in + colored emphasis)',
    'Text-driven scenes with no visual hero',
  ],
  structure:
    '3+ phases — phrase types (neutral → accent) → hold → hard-cut to next. Single onUpdate drives all content, cursor color and blink.',
};

/**
 * Metric · Video Text Pivot
 * "展示 → 让位 → 转向 → 盖章"情感弧线。视频滑开，统计数字登场。
 * 适用：先展示功能再陈述影响的场景，大数字强调。
 */
export const METRIC_VIDEO_TEXT_PIVOT: MotionBlueprint = {
  id: 'metric-video-text-pivot',
  name: 'Metric · Video Text Pivot',
  description:
    'A "show → yield → pivot → stamp" emotional arc: product video breathes centered, slides aside as a stat enters, kinetic text types in, and a pill snaps shut.',
  durationHint: '5–8s',
  suitableFor: [
    'Scene transitioning from showing a feature to stating its impact',
    'Metric needing dramatic typographic treatment',
    'Pivot from visual demonstration to textual impact statement',
  ],
  structure:
    '4 phases — video enters + floats → video slide + stat reveal → pivot (both exit + typing enters) → pill stamp. Three nested wrappers per element.',
};

/**
 * Proof · Logo Chain
 * "解码 → 声明 → 社区 → 认可"情感弧线。品牌标志贯穿始终。
 * 适用：权威性建立、多重证明点堆叠。
 */
export const PROOF_LOGO_CHAIN: MotionBlueprint = {
  id: 'proof-logo-chain',
  name: 'Proof · Logo Chain',
  description:
    'A "decode → claim → community → endorsement" arc: brand name decrypts, a claim slot-machines in, logo glides to center, avatars orbit, partner logos scroll.',
  durationHint: '6–10s',
  suitableFor: [
    'Brand authority via multiple progressive proof points',
    'Logo threading multiple shots as the visual link',
    '3-4 distinct claims packed into one continuous sequence',
  ],
  structure:
    '5 phases — brand decode (hacker-flip 3D) → claim swap (vertical-spring ticker) → logo recenters (translate-only zoom) → avatar cloud → brand endorsement strip.',
};

/**
 * Workflow · Approve & Press
 * "代理 → 确认"情感弧线。步骤指示器推进，按钮按下确认。
 * 适用：工作流展示、用户确认操作。
 */
export const WORKFLOW_APPROVE_PRESS: MotionBlueprint = {
  id: 'workflow-approve-press',
  name: 'Workflow · Approve & Press',
  description:
    'An "agency → confirmation" arc: headline announces the verb, steps tick through states, and a right-flank button takes a press, flipping green with a checkmark stamp.',
  durationHint: '4–6s',
  suitableFor: [
    'Scene emphasizing user control over an automated process',
    'Multi-step workflow needing visualization (generate → review → approve)',
    'Button press as the narrative climax (user confirms / approves)',
  ],
  structure:
    '4 phases — headline drop → center demo scale-in → step indicators (snap state machine) → button press climax (press-release-spring with approve variation).',
};

// ===== 蓝图注册表 =====

export const MOTION_BLUEPRINTS: Record<string, MotionBlueprint> = {
  'brand-reveal-assemble-zoom': BRAND_REVEAL_ASSEMBLE_ZOOM,
  'comparison-split-cards': COMPARISON_SPLIT_CARDS,
  'concept-demo-decode-pan': CONCEPT_DEMO_DECODE_PAN,
  'cta-morph-press': CTA_MORPH_PRESS,
  'cta-orbit-collapse': CTA_ORBIT_COLLAPSE,
  'hook-counter-burst': HOOK_COUNTER_BURST,
  'messaging-multi-phrase': MESSAGING_MULTI_PHRASE,
  'metric-video-text-pivot': METRIC_VIDEO_TEXT_PIVOT,
  'proof-logo-chain': PROOF_LOGO_CHAIN,
  'workflow-approve-press': WORKFLOW_APPROVE_PRESS,
};

export type BlueprintId = keyof typeof MOTION_BLUEPRINTS;

// ===== 辅助函数 =====

/**
 * 按 ID 获取蓝图，不存在时返回 null
 */
export const getBlueprint = (id: string): MotionBlueprint | undefined =>
  MOTION_BLUEPRINTS[id];

/**
 * 获取所有蓝图 ID 列表
 */
export const getBlueprintIds = (): BlueprintId[] =>
  Object.keys(MOTION_BLUEPRINTS) as BlueprintId[];
