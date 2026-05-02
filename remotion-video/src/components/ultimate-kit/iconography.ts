export const ULTIMATE_ICON_URLS = {
  arrowRight: new URL('../../assets/icons/arrow-right.svg', import.meta.url).href,
  box: new URL('../../assets/icons/box.svg', import.meta.url).href,
  checkCircle: new URL('../../assets/icons/check-circle.svg', import.meta.url).href,
  clock: new URL('../../assets/icons/clock.svg', import.meta.url).href,
  code: new URL('../../assets/icons/code.svg', import.meta.url).href,
  cpu: new URL('../../assets/icons/cpu.svg', import.meta.url).href,
  database: new URL('../../assets/icons/database.svg', import.meta.url).href,
  fileText: new URL('../../assets/icons/file-text.svg', import.meta.url).href,
  flame: new URL('../../assets/icons/flame.svg', import.meta.url).href,
  folder: new URL('../../assets/icons/folder.svg', import.meta.url).href,
  gitBranch: new URL('../../assets/icons/git-branch.svg', import.meta.url).href,
  gitMerge: new URL('../../assets/icons/git-merge.svg', import.meta.url).href,
  heart: new URL('../../assets/icons/heart.svg', import.meta.url).href,
  home: new URL('../../assets/icons/home.svg', import.meta.url).href,
  inbox: new URL('../../assets/icons/inbox.svg', import.meta.url).href,
  layers: new URL('../../assets/icons/layers.svg', import.meta.url).href,
  layoutDashboard: new URL('../../assets/icons/layout-dashboard.svg', import.meta.url).href,
  list: new URL('../../assets/icons/list.svg', import.meta.url).href,
  lock: new URL('../../assets/icons/lock.svg', import.meta.url).href,
  messagesSquare: new URL('../../assets/icons/messages-square.svg', import.meta.url).href,
  play: new URL('../../assets/icons/play.svg', import.meta.url).href,
  puzzle: new URL('../../assets/icons/puzzle.svg', import.meta.url).href,
  repeat: new URL('../../assets/icons/repeat.svg', import.meta.url).href,
  save: new URL('../../assets/icons/save.svg', import.meta.url).href,
  server: new URL('../../assets/icons/server.svg', import.meta.url).href,
  settings: new URL('../../assets/icons/settings.svg', import.meta.url).href,
  sparkles: new URL('../../assets/icons/sparkles.svg', import.meta.url).href,
  terminal: new URL('../../assets/icons/terminal.svg', import.meta.url).href,
  toggleRight: new URL('../../assets/icons/toggle-right.svg', import.meta.url).href,
  user: new URL('../../assets/icons/user.svg', import.meta.url).href,
  wrench: new URL('../../assets/icons/wrench.svg', import.meta.url).href,
  zap: new URL('../../assets/icons/zap.svg', import.meta.url).href,
} as const;

export type UltimateIconName = keyof typeof ULTIMATE_ICON_URLS;

type UltimateSceneFamilyKey =
  | 'hero'
  | 'feature-rail'
  | 'focus'
  | 'number-strip'
  | 'step-flow'
  | 'timeline'
  | 'compare-board'
  | 'terminal'
  | 'evidence-wall'
  | 'architecture-map'
  | 'tag-matrix'
  | 'code'
  | 'metrics'
  | 'data-stream'
  | 'memory-graph'
  | 'pipeline-flow'
  | 'benchmark-chart'
  | 'quote-highlight'
  | 'glossary-term'
  | 'cta';

type IconRegistryEntry = {
  label: string;
  generic?: boolean;
  aliases: string[];
  tokens: string[];
  patterns: RegExp[];
  familyBoosts?: Partial<Record<UltimateSceneFamilyKey, number>>;
};

const ICON_REGISTRY: Record<UltimateIconName, IconRegistryEntry> = {
  arrowRight: {
    label: 'Arrow Right',
    generic: true,
    aliases: ['arrow-right', 'arrow', 'next', 'continue', 'forward'],
    tokens: ['下一步', '继续', '推进', '进入', '导向', '后续', 'forward', 'next'],
    patterns: [/下一步|继续|推进|进入|导向|后续|flow to|move to|forward/i],
    familyBoosts: {'step-flow': 22, cta: 14},
  },
  box: {
    label: 'Box',
    aliases: ['box', 'package', 'product'],
    tokens: ['产品', '方案', '能力包', '模块包', 'product', 'package'],
    patterns: [/产品|方案|能力包|模块包|package|product/i],
    familyBoosts: {'feature-rail': 14, 'tag-matrix': 8},
  },
  checkCircle: {
    label: 'Check Circle',
    aliases: ['check-circle', 'check', 'pass', 'done', 'verify'],
    tokens: ['通过', '完成', '确认', '达标', '验证', 'done', 'pass', 'verified'],
    patterns: [/通过|完成|确认|达标|验证|ok|done|pass|verified/i],
    familyBoosts: {'cta': 8, 'number-strip': 10},
  },
  clock: {
    label: 'Clock',
    aliases: ['clock', 'time', 'duration'],
    tokens: ['时间', '时长', '小时', '分钟', '秒', '周期', 'deadline', 'latency'],
    patterns: [/时间|时长|小时|分钟|秒|周期|deadline|latency|throughput|发布时/i],
    familyBoosts: {metrics: 28, 'number-strip': 12},
  },
  code: {
    label: 'Code',
    aliases: ['code', 'coding', 'repo', 'sdk'],
    tokens: ['代码', '编码', '编程', '函数', '接口', 'repo', 'sdk', 'swe', 'benchmark'],
    patterns: [/代码|编码|编程|函数|接口|repo|sdk|swe|bench|benchmark|prompt/i],
    familyBoosts: {hero: 16, code: 34, metrics: 18, 'number-strip': 14},
  },
  cpu: {
    label: 'CPU',
    aliases: ['cpu', 'model', 'agent', 'brain'],
    tokens: ['模型', '推理', 'agent', '子agent', '算力', '大模型', '智能体'],
    patterns: [/模型|推理|agent|子agent|算力|智能体|大模型/i],
    familyBoosts: {hero: 10, metrics: 10, cta: 8},
  },
  database: {
    label: 'Database',
    aliases: ['database', 'db', 'memory', 'context'],
    tokens: ['数据', '数据库', '知识库', 'memory', 'context', '检索', '索引'],
    patterns: [/数据|数据库|知识库|memory|context|检索|索引|缓存/i],
    familyBoosts: {'tag-matrix': 10, code: 8},
  },
  fileText: {
    label: 'File Text',
    aliases: ['file-text', 'document', 'copy', 'script'],
    tokens: ['文案', '标题', '文本', '摘要', '脚本', '说明', 'json', 'schema'],
    patterns: [/文案|标题|文本|摘要|脚本|说明|json|schema|spec|brief/i],
    familyBoosts: {code: 14, 'feature-rail': 10, cta: 6},
  },
  flame: {
    label: 'Flame',
    aliases: ['flame', 'fire', 'hot'],
    tokens: ['王炸', '热点', '爆', '炸裂', '上强度', '热度', 'fire', 'hot'],
    patterns: [/王炸|热点|爆|炸裂|上强度|热度|fire|hot/i],
    familyBoosts: {hero: 16, cta: 10},
  },
  folder: {
    label: 'Folder',
    aliases: ['folder', 'files', 'assets'],
    tokens: ['文件', '目录', '素材', '项目', 'asset', 'folder'],
    patterns: [/文件|目录|素材|项目|asset|folder/i],
    familyBoosts: {'feature-rail': 10, terminal: 8},
  },
  gitBranch: {
    label: 'Git Branch',
    aliases: ['git-branch', 'branch', 'version-line', 'roadmap'],
    tokens: ['路线', '分支', '版本', '路线图', 'branch', 'roadmap'],
    patterns: [/路线|分支|版本|路线图|branch|roadmap/i],
    familyBoosts: {hero: 10, code: 12, 'step-flow': 8},
  },
  gitMerge: {
    label: 'Git Merge',
    aliases: ['git-merge', 'merge', 'combine', 'sync'],
    tokens: ['合并', '汇总', '整合', '接回', '对齐', 'merge', 'sync'],
    patterns: [/合并|汇总|整合|接回|对齐|merge|sync/i],
    familyBoosts: {'step-flow': 10, 'feature-rail': 10},
  },
  heart: {
    label: 'Heart',
    aliases: ['heart', 'favorite', 'love'],
    tokens: ['喜欢', '偏好', '热爱', 'favorite', 'love'],
    patterns: [/喜欢|偏好|热爱|favorite|love/i],
    familyBoosts: {cta: 8},
  },
  home: {
    label: 'Home',
    aliases: ['home', 'landing', 'scene'],
    tokens: ['场景', '落地', '生态', 'home', 'landing'],
    patterns: [/场景|落地|生态|home|landing/i],
    familyBoosts: {'feature-rail': 10, focus: 8},
  },
  inbox: {
    label: 'Inbox',
    aliases: ['inbox', 'input', 'entry'],
    tokens: ['输入', '导入', '消息', '收件', 'entry', 'inbox'],
    patterns: [/输入|导入|消息|收件|entry|inbox/i],
    familyBoosts: {'step-flow': 14, cta: 6},
  },
  layers: {
    label: 'Layers',
    generic: true,
    aliases: ['layers', 'structure', 'stack'],
    tokens: ['结构', '分层', '架构', '模块', 'system', 'stack', 'layer'],
    patterns: [/结构|分层|架构|模块|system|stack|layer/i],
    familyBoosts: {'feature-rail': 26, focus: 18, 'tag-matrix': 24, 'step-flow': 16},
  },
  layoutDashboard: {
    label: 'Layout Dashboard',
    aliases: ['layout-dashboard', 'dashboard', 'panel', 'grid'],
    tokens: ['面板', '看板', 'dashboard', 'panel', 'board'],
    patterns: [/面板|看板|dashboard|panel|board/i],
    familyBoosts: {metrics: 14, code: 8},
  },
  list: {
    label: 'List',
    aliases: ['list', 'steps', 'items', 'sequence'],
    tokens: ['步骤', '流程', '清单', '要点', '条目', 'sequence', 'list'],
    patterns: [/步骤|流程|清单|要点|条目|sequence|list/i],
    familyBoosts: {'step-flow': 30, 'number-strip': 16, cta: 6},
  },
  lock: {
    label: 'Lock',
    aliases: ['lock', 'secure', 'stable'],
    tokens: ['稳定', '安全', '锁定', '一致性', 'secure', 'stable'],
    patterns: [/稳定|安全|锁定|一致性|secure|stable/i],
    familyBoosts: {code: 10, metrics: 8},
  },
  messagesSquare: {
    label: 'Messages Square',
    generic: true,
    aliases: ['messages-square', 'comments', 'discussion', 'chat'],
    tokens: ['评论', '互动', '讨论', '反馈', 'chat', 'comment'],
    patterns: [/评论|互动|讨论|反馈|chat|comment|reply/i],
    familyBoosts: {cta: 30, hero: 8},
  },
  play: {
    label: 'Play',
    aliases: ['play', 'video', 'preview'],
    tokens: ['视频', '播放', '出片', '预览', 'render', 'video'],
    patterns: [/视频|播放|出片|预览|render|video/i],
    familyBoosts: {hero: 6, terminal: 12},
  },
  puzzle: {
    label: 'Puzzle',
    aliases: ['puzzle', 'component', 'template'],
    tokens: ['模板', '组件', '拼接', '组合', 'template', 'component'],
    patterns: [/模板|组件|拼接|组合|template|component/i],
    familyBoosts: {'feature-rail': 12, 'tag-matrix': 10},
  },
  repeat: {
    label: 'Repeat',
    aliases: ['repeat', 'retry', 'loop', 'resume'],
    tokens: ['复用', '重试', '闭环', 'resume', 'retry', 'loop'],
    patterns: [/复用|重试|闭环|resume|retry|loop/i],
    familyBoosts: {'step-flow': 10, cta: 8},
  },
  save: {
    label: 'Save',
    aliases: ['save', 'export', 'ship'],
    tokens: ['保存', '导出', '交付', '发布', 'ship', 'export'],
    patterns: [/保存|导出|交付|发布|ship|export/i],
    familyBoosts: {cta: 14, terminal: 8},
  },
  server: {
    label: 'Server',
    aliases: ['server', 'api', 'deploy', 'worker'],
    tokens: ['部署', '服务', 'api', 'worker', 'server', 'render'],
    patterns: [/部署|服务|api|worker|server|render/i],
    familyBoosts: {terminal: 20, code: 12},
  },
  settings: {
    label: 'Settings',
    aliases: ['settings', 'config', 'options'],
    tokens: ['设置', '配置', '参数', '选项', 'config', 'options'],
    patterns: [/设置|配置|参数|选项|config|options/i],
    familyBoosts: {code: 8, metrics: 8},
  },
  sparkles: {
    label: 'Sparkles',
    generic: true,
    aliases: ['sparkles', 'spark', 'launch', 'highlight', 'new'],
    tokens: ['发布', '开源', '亮点', '升级', '首个', '第一次', 'new', 'launch'],
    patterns: [/发布|开源|亮点|升级|首个|第一次|new|launch/i],
    familyBoosts: {hero: 32, focus: 16, cta: 14},
  },
  terminal: {
    label: 'Terminal',
    aliases: ['terminal', 'shell', 'bash', 'cli'],
    tokens: ['终端', '命令', 'shell', 'bash', 'cli', 'stdout'],
    patterns: [/终端|命令|shell|bash|cli|stdout|stderr/i],
    familyBoosts: {terminal: 34, code: 16},
  },
  toggleRight: {
    label: 'Toggle Right',
    aliases: ['toggle-right', 'switch', 'toggle'],
    tokens: ['切换', '开关', '模式', 'switch', 'toggle'],
    patterns: [/切换|开关|模式|switch|toggle/i],
    familyBoosts: {'step-flow': 14, metrics: 6},
  },
  user: {
    label: 'User',
    aliases: ['user', 'developer', 'audience'],
    tokens: ['用户', '开发者', '观众', '团队', 'developer', 'user'],
    patterns: [/用户|开发者|观众|团队|developer|user/i],
    familyBoosts: {'feature-rail': 16, code: 12, cta: 8},
  },
  wrench: {
    label: 'Wrench',
    aliases: ['wrench', 'fix', 'optimize', 'tooling'],
    tokens: ['修复', '优化', '调试', '工具', 'tooling', 'fix'],
    patterns: [/修复|优化|调试|工具|tooling|fix/i],
    familyBoosts: {code: 14, 'feature-rail': 8},
  },
  zap: {
    label: 'Zap',
    generic: true,
    aliases: ['zap', 'pulse', 'speed', 'boost', 'fast'],
    tokens: ['提效', '速度', '更快', '一键', '压缩', 'boost', 'speed'],
    patterns: [/提效|速度|更快|一键|压缩|boost|speed|fast/i],
    familyBoosts: {hero: 12, metrics: 20, cta: 12, 'number-strip': 10},
  },
};

const GLOBAL_FALLBACK_ORDER: UltimateIconName[] = [
  'sparkles',
  'code',
  'layers',
  'messagesSquare',
  'zap',
  'clock',
  'gitBranch',
  'fileText',
  'settings',
  'arrowRight',
];

const FAMILY_FALLBACK_ORDER: Record<UltimateSceneFamilyKey, UltimateIconName[]> = {
  hero: ['sparkles', 'code', 'flame', 'zap', 'gitBranch', 'cpu'],
  'feature-rail': ['layers', 'box', 'user', 'wrench', 'puzzle', 'fileText'],
  focus: ['layers', 'sparkles', 'home', 'arrowRight', 'lock', 'cpu'],
  'number-strip': ['list', 'clock', 'zap', 'code', 'flame', 'checkCircle'],
  'step-flow': ['list', 'toggleRight', 'inbox', 'arrowRight', 'repeat', 'gitMerge'],
  timeline: ['clock', 'gitBranch', 'repeat', 'arrowRight', 'sparkles', 'layers'],
  'compare-board': ['layoutDashboard', 'checkCircle', 'code', 'zap', 'cpu', 'messagesSquare'],
  terminal: ['terminal', 'server', 'code', 'play', 'repeat', 'settings'],
  'evidence-wall': ['fileText', 'checkCircle', 'messagesSquare', 'sparkles', 'database', 'code'],
  'architecture-map': ['layers', 'cpu', 'database', 'server', 'gitBranch', 'puzzle'],
  'tag-matrix': ['layers', 'database', 'list', 'box', 'puzzle', 'folder'],
  code: ['code', 'terminal', 'gitBranch', 'wrench', 'fileText', 'server'],
  metrics: ['clock', 'zap', 'layoutDashboard', 'code', 'checkCircle', 'cpu'],
  'data-stream': ['zap', 'layoutDashboard', 'database', 'repeat', 'server', 'arrowRight'],
  'memory-graph': ['database', 'layers', 'cpu', 'gitBranch', 'sparkles', 'server'],
  'pipeline-flow': ['arrowRight', 'gitMerge', 'repeat', 'list', 'toggleRight', 'settings'],
  'benchmark-chart': ['layoutDashboard', 'clock', 'checkCircle', 'zap', 'code', 'fileText'],
  'quote-highlight': ['messagesSquare', 'sparkles', 'fileText', 'heart', 'checkCircle', 'flame'],
  'glossary-term': ['fileText', 'layers', 'sparkles', 'puzzle', 'database', 'messagesSquare'],
  cta: ['messagesSquare', 'sparkles', 'save', 'arrowRight', 'heart', 'checkCircle'],
};

const MANUAL_TEXT_GLYPH_RE = /^(?:text:|glyph:)?[A-Za-z0-9#+*?]{1,3}$/;

const FAMILY_SEQUENCE_BOOST = 6;
const GENERIC_ICON_PENALTY = 4;

const toKebabCase = (value: string) => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

const normalizeIconToken = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
};

const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[“”"'‘’]/g, ' ')
    .replace(/[()（）【】[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const DIRECT_ICON_ALIASES = Object.entries(ICON_REGISTRY).reduce<Record<string, UltimateIconName>>((acc, [icon, meta]) => {
  const normalizedIcon = icon as UltimateIconName;
  acc[normalizeIconToken(icon)] = normalizedIcon;
  acc[normalizeIconToken(toKebabCase(icon))] = normalizedIcon;
  for (const alias of meta.aliases) {
    acc[normalizeIconToken(alias)] = normalizedIcon;
  }
  return acc;
}, {});

const rotateList = <T,>(items: T[], offset: number) => {
  if (items.length === 0) {
    return items;
  }
  const index = ((offset % items.length) + items.length) % items.length;
  return items.slice(index).concat(items.slice(0, index));
};

const resolveDirectIcon = (value?: string | null): UltimateIconName | null => {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  const normalized = normalizeIconToken(text);
  return DIRECT_ICON_ALIASES[normalized] || null;
};

const collectHintTexts = (values: Array<string | null | undefined>) => {
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
};

const scoreIconAgainstHints = (
  icon: UltimateIconName,
  hints: string[],
  family?: string,
) => {
  const meta = ICON_REGISTRY[icon];
  let score = meta.generic ? -GENERIC_ICON_PENALTY : 0;

  const familyBoost = meta.familyBoosts?.[family as UltimateSceneFamilyKey] ?? 0;
  score += familyBoost;

  const familyFallbackIndex = FAMILY_FALLBACK_ORDER[family as UltimateSceneFamilyKey]?.indexOf(icon) ?? -1;
  if (familyFallbackIndex >= 0) {
    score += Math.max(0, 18 - familyFallbackIndex * FAMILY_SEQUENCE_BOOST);
  }

  for (const hint of hints) {
    const normalizedHint = normalizeText(hint);
    if (!normalizedHint) {
      continue;
    }

    const directMatch = meta.aliases.some((alias) => normalizedHint.includes(normalizeText(alias)))
      || normalizedHint.includes(normalizeText(meta.label));
    if (directMatch) {
      score += 90;
    }

    for (const token of meta.tokens) {
      if (normalizedHint.includes(normalizeText(token))) {
        score += 20;
      }
    }

    for (const pattern of meta.patterns) {
      if (pattern.test(hint)) {
        score += 42;
      }
    }
  }

  return score;
};

export const isUltimateIconName = (value: string): value is UltimateIconName => {
  return Object.prototype.hasOwnProperty.call(ULTIMATE_ICON_URLS, value);
};

export const isUltimateManualGlyph = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  return !!text && !resolveDirectIcon(text) && MANUAL_TEXT_GLYPH_RE.test(text);
};

export const getUltimateManualGlyph = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!isUltimateManualGlyph(text)) {
    return '';
  }
  return text.replace(/^(?:text:|glyph:)/i, '').trim();
};

export const normalizeUltimateIconRequests = (values: Array<string | null | undefined>) => {
  return values
    .map((value) => resolveDirectIcon(value))
    .filter(Boolean) as UltimateIconName[];
};

export const resolveUltimateIconPack = ({
  hints = [],
  requested = [],
  count = 3,
  family,
  seed = 0,
  exclude = [],
}: {
  hints?: Array<string | null | undefined>;
  requested?: Array<string | null | undefined>;
  count?: number;
  family?: string;
  seed?: number;
  exclude?: Array<string | null | undefined>;
}): UltimateIconName[] => {
  const output: UltimateIconName[] = [];
  const seen = new Set<UltimateIconName>(normalizeUltimateIconRequests(exclude));
  const add = (icon?: UltimateIconName | null) => {
    if (!icon || seen.has(icon)) {
      return;
    }
    seen.add(icon);
    output.push(icon);
  };

  for (const icon of normalizeUltimateIconRequests(requested)) {
    add(icon);
    if (output.length >= count) {
      return output;
    }
  }

  const hintTexts = collectHintTexts(hints);
  const scoredIcons = (Object.keys(ICON_REGISTRY) as UltimateIconName[])
    .filter((icon) => !seen.has(icon))
    .map((icon) => ({
      icon,
      score: scoreIconAgainstHints(icon, hintTexts, family),
      familyFallbackIndex: FAMILY_FALLBACK_ORDER[family as UltimateSceneFamilyKey]?.indexOf(icon) ?? Number.POSITIVE_INFINITY,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || left.familyFallbackIndex - right.familyFallbackIndex
      || left.icon.localeCompare(right.icon)
    ));

  for (const entry of scoredIcons) {
    add(entry.icon);
    if (output.length >= count) {
      return output;
    }
  }

  for (const icon of rotateList(FAMILY_FALLBACK_ORDER[family as UltimateSceneFamilyKey] || [], seed)) {
    add(icon);
    if (output.length >= count) {
      return output;
    }
  }

  for (const icon of rotateList(GLOBAL_FALLBACK_ORDER, seed)) {
    add(icon);
    if (output.length >= count) {
      return output;
    }
  }

  return output;
};

export const inferUltimateIcon = (
  value?: string | null,
  fallback: UltimateIconName = 'sparkles',
) => {
  return resolveUltimateIconPack({
    hints: [value],
    requested: [value],
    count: 1,
  })[0] || fallback;
};

export const inferUltimateIconSequence = (
  values: Array<string | null | undefined>,
  count = 3,
  family?: string,
  options?: {
    requested?: Array<string | null | undefined>;
    seed?: number;
    exclude?: Array<string | null | undefined>;
  },
) => {
  return resolveUltimateIconPack({
    hints: values,
    requested: options?.requested,
    count,
    family,
    seed: options?.seed ?? 0,
    exclude: options?.exclude,
  });
};

export const ULTIMATE_ICON_LIBRARY = Object.keys(ICON_REGISTRY) as UltimateIconName[];
