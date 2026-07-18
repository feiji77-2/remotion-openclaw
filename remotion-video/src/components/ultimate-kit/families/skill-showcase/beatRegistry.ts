import type {SkillIconKey, SkillShowcaseBeat, SkillShowcaseVariant} from './types';

export const VARIANT_ICON: Record<SkillShowcaseVariant, SkillIconKey> = {
  intro: 'blocks',
  overview: 'grid-3x3',
  coding: 'code',
  remotion: 'film',
  ppt: 'presentation',
  illustration: 'pen-tool',
  hyperframes: 'clapperboard',
  ui: 'layout-template',
  outro: 'circle-check-big',
};

export const SUMMARY_ICONS: SkillIconKey[] = [
  'code',
  'film',
  'presentation',
  'pen-tool',
  'clapperboard',
  'layout-template',
];

export const DEFAULT_SKILL_BEATS: Partial<Record<SkillShowcaseVariant, SkillShowcaseBeat[]>> = {
  intro: [
    {startFrame: 0, endFrame: 42, keyword: '只会聊天', icon: 'message-circle', action: 'compare', evidence: ['聊天', '帮手']},
    {startFrame: 42, endFrame: 86, keyword: '装上 Skill', icon: 'plug-zap', action: 'spotlight'},
    {startFrame: 86, endFrame: 120, keyword: '真正帮手', icon: 'bot', action: 'focus'},
    {startFrame: 120, endFrame: 148, keyword: '能力开场', icon: 'rocket', action: 'burst'},
  ],
  overview: [
    {startFrame: 0, endFrame: 38, keyword: '几个 Skill', icon: 'grid-3x3', action: 'counter', value: '6'},
    {startFrame: 38, endFrame: 76, keyword: '写代码', icon: 'code', action: 'trace'},
    {startFrame: 76, endFrame: 112, keyword: '做视频', icon: 'film', action: 'trace'},
    {startFrame: 112, endFrame: 148, keyword: '生成 PPT', icon: 'presentation', action: 'trace'},
    {startFrame: 148, endFrame: 184, keyword: '正文配图', icon: 'image-plus', action: 'focus'},
    {startFrame: 184, endFrame: 218, keyword: 'UI Skill', icon: 'layout-template', action: 'stack', evidence: ['排版', '留白', '配色']},
    {startFrame: 218, endFrame: 248, keyword: '能力组合', icon: 'blocks', action: 'burst'},
  ],
  coding: [
    {startFrame: 0, endFrame: 107, keyword: '编码原则', icon: 'code', action: 'stamp', evidence: ['先约束', '再动手']},
    {startFrame: 107, endFrame: 226, keyword: '最大毛病', icon: 'bug', action: 'focus', evidence: ['乱猜需求', '瞎加抽象']},
    {startFrame: 226, endFrame: 292, keyword: '无关改动', icon: 'shield-alert', action: 'compare', evidence: ['没让它动', '顺手全改']},
    {startFrame: 292, endFrame: 371, keyword: '讲清假设', icon: 'file-search', action: 'stack', evidence: ['目标', '范围', '验收']},
    {startFrame: 371, endFrame: 405, keyword: '最小改动', icon: 'git-compare-arrows', action: 'trace', value: '3 files'},
    {startFrame: 405, endFrame: 450, keyword: '自己验证', icon: 'test-tube', action: 'counter', value: '14/14'},
    {startFrame: 450, endFrame: 529, keyword: '更靠谱', icon: 'badge-check', action: 'burst'},
  ],
  remotion: [
    {startFrame: 0, endFrame: 55, keyword: 'Remotion', icon: 'film', action: 'stamp'},
    {startFrame: 55, endFrame: 120, keyword: '网页方式', icon: 'panel-top', action: 'spotlight'},
    {startFrame: 120, endFrame: 160, keyword: 'React 代码', icon: 'braces', action: 'trace'},
    {startFrame: 160, endFrame: 198, keyword: '一帧画面', icon: 'panels-top-left', action: 'focus'},
    {startFrame: 198, endFrame: 235, keyword: 'AI 读得懂', icon: 'brain-circuit', action: 'stack', evidence: ['DOM', 'Props', 'Frames']},
    {startFrame: 235, endFrame: 292, keyword: '渲染成片', icon: 'play', action: 'burst', value: 'MP4'},
    {startFrame: 292, endFrame: 388, keyword: '底层都是它', icon: 'blocks', action: 'spotlight'},
  ],
  ppt: [
    {startFrame: 0, endFrame: 54, keyword: 'PPT Master', icon: 'presentation', action: 'stamp'},
    {startFrame: 54, endFrame: 173, keyword: '一张图片', icon: 'image', action: 'compare', evidence: ['只能看', '不能改']},
    {startFrame: 173, endFrame: 311, keyword: '原生对象', icon: 'shapes', action: 'focus'},
    {startFrame: 311, endFrame: 360, keyword: '形状图表连线', icon: 'chart-pie', action: 'stack', evidence: ['形状', '图表', '连接线']},
    {startFrame: 360, endFrame: 404, keyword: '全都能编辑', icon: 'mouse-pointer-2', action: 'trace'},
    {startFrame: 404, endFrame: 500, keyword: '能改的 PPT', icon: 'badge-check', action: 'burst'},
  ],
  illustration: [
    {startFrame: 0, endFrame: 78, keyword: '正文配图', icon: 'pen-tool', action: 'stamp'},
    {startFrame: 78, endFrame: 172, keyword: '图文对不上', icon: 'unlink-2', action: 'compare', evidence: ['正文判断', '随机配图']},
    {startFrame: 172, endFrame: 238, keyword: '一个判断', icon: 'file-text', action: 'focus'},
    {startFrame: 238, endFrame: 268, keyword: '一个比喻', icon: 'quote', action: 'spotlight'},
    {startFrame: 268, endFrame: 386, keyword: '纯白手绘', icon: 'image-plus', action: 'stack', evidence: ['判断', '比喻', '图解']},
    {startFrame: 386, endFrame: 529, keyword: '两个断点', icon: 'workflow', action: 'compare', evidence: ['素材孤岛', '结论没承接']},
    {startFrame: 529, endFrame: 560, keyword: '一看就懂', icon: 'circle-check-big', action: 'burst'},
  ],
  hyperframes: [
    {startFrame: 0, endFrame: 49, keyword: 'HyperFrames', icon: 'clapperboard', action: 'stamp'},
    {startFrame: 49, endFrame: 85, keyword: '同样做视频', icon: 'film', action: 'spotlight'},
    {startFrame: 85, endFrame: 147, keyword: '专为 Agent', icon: 'bot', action: 'focus'},
    {startFrame: 147, endFrame: 200, keyword: 'HTML', icon: 'code-xml', action: 'trace'},
    {startFrame: 200, endFrame: 253, keyword: 'AI 变视频', icon: 'wand-sparkles', action: 'burst'},
    {startFrame: 253, endFrame: 310, keyword: '20+ Skills', icon: 'blocks', action: 'counter', value: '20+'},
    {startFrame: 310, endFrame: 372, keyword: '直接用', icon: 'plug-zap', action: 'spotlight'},
  ],
  ui: [
    {startFrame: 0, endFrame: 99, keyword: 'UI Skill', icon: 'layout-template', action: 'stamp'},
    {startFrame: 99, endFrame: 145, keyword: '不是模板', icon: 'component', action: 'compare', evidence: ['模板', '设计系统']},
    {startFrame: 145, endFrame: 190, keyword: '设计立场', icon: 'palette', action: 'focus'},
    {startFrame: 190, endFrame: 262, keyword: '排版·留白·配色', icon: 'swatch-book', action: 'stack', evidence: ['排版', '留白', '配色']},
    {startFrame: 262, endFrame: 315, keyword: '页面实证', icon: 'image', action: 'spotlight'},
    {startFrame: 315, endFrame: 425, keyword: 'AI 塑料味', icon: 'shield-alert', action: 'compare', evidence: ['装之前', '装之后']},
    {startFrame: 425, endFrame: 497, keyword: '能用的设计', icon: 'badge-check', action: 'burst'},
  ],
  outro: [
    {startFrame: 0, endFrame: 78, keyword: '6 种能力', icon: 'blocks', action: 'stack', evidence: ['代码', '视频', 'PPT']},
    {startFrame: 78, endFrame: 160, keyword: '进 WorkBuddy', icon: 'bot', action: 'focus'},
    {startFrame: 160, endFrame: 242, keyword: '不只聊天', icon: 'message-circle', action: 'compare', evidence: ['聊天', '交付']},
    {startFrame: 242, endFrame: 322, keyword: '真正帮手', icon: 'circle-check-big', action: 'spotlight'},
    {startFrame: 322, endFrame: 407, keyword: '评论区 Skill', icon: 'send', action: 'burst'},
  ],
};

export const resolveSkillBeats = (
  variant: SkillShowcaseVariant,
  beats?: SkillShowcaseBeat[],
): SkillShowcaseBeat[] => beats?.length ? beats : (DEFAULT_SKILL_BEATS[variant] ?? []);
