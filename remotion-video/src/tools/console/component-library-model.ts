export type ComponentSource = 'project' | 'hyperframes';
export type ComponentOrientation = 'portrait' | 'landscape';
export type ComponentCategory = '推荐' | '标题' | '代码' | '流程' | '对比' | '数据' | '界面' | '字幕' | '转场' | '特效';
export type ComponentVisualMode = 'hero' | 'grid' | 'compare' | 'process' | 'metrics' | 'quote';
export type ComponentVariant = 'intro' | 'overview' | 'coding' | 'remotion' | 'ppt' | 'illustration' | 'hyperframes' | 'ui' | 'outro' | 'impeccable' | 'frontend-design' | 'ux-pro' | 'cloud-design' | 'generic';

export interface ComponentRendererMapping {
  componentId: string;
  variant: ComponentVariant;
  visualMode: ComponentVisualMode;
  heroStyle: 'cinematic' | 'hero-track-v2';
}

export interface ComponentVariableOption {
  value: string;
  label: string;
}

export interface ComponentVariable {
  id: string;
  type: 'string' | 'number' | 'color' | 'enum' | 'boolean';
  label: string;
  default?: string | number | boolean;
  hidden?: boolean;
  options?: ComponentVariableOption[];
}

export interface ComponentLibraryItem {
  id: string;
  sourceId: string;
  source: ComponentSource;
  label: string;
  description: string;
  category: ComponentCategory;
  orientation: ComponentOrientation;
  size: string;
  duration: number | null;
  tags: string[];
  formats: string[];
  previewUrl: string | null;
  previewKind: 'video' | 'mock';
  status: 'ready' | 'draft';
  renderer: ComponentRendererMapping;
  schema: ComponentVariable[];
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = ['推荐', '标题', '代码', '流程', '对比', '数据', '界面', '字幕', '转场', '特效'];
export const COMPONENT_ORIENTATIONS: ComponentOrientation[] = ['portrait', 'landscape'];

export const orientationLabel = (orientation: ComponentOrientation) => orientation === 'portrait' ? '竖屏' : '横屏';

export const LOCAL_SCENE_COMPONENTS: ComponentLibraryItem[] = [
  {
    id: 'hero-title',
    sourceId: 'hero-title',
    source: 'project',
    label: '结论标题页',
    description: '适合开场、结论和强观点表达。',
    category: '标题',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['开场', '结论', '强观点'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'hero-title', variant: 'intro', visualMode: 'hero', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '核心观点'},
      {id: 'subtitle', type: 'string', label: '说明', default: '一句话建立观看理由'},
      {id: 'accent', type: 'color', label: '主色', default: '#d9642a'},
    ],
  },
  {
    id: 'code-panel',
    sourceId: 'code-panel',
    source: 'project',
    label: '代码演示面板',
    description: '突出命令、日志和生成过程。',
    category: '代码',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['代码', '终端', '过程'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'code-panel', variant: 'remotion', visualMode: 'process', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '代码变成画面'},
      {id: 'primary', type: 'string', label: '代码行', default: 'npm run render'},
      {id: 'accent', type: 'color', label: '主色', default: '#2e6b63'},
    ],
  },
  {
    id: 'process-steps',
    sourceId: 'process-steps',
    source: 'project',
    label: '三步流程',
    description: '把操作路径拆成连续步骤。',
    category: '流程',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['流程', '步骤', '教学'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'process-steps', variant: 'generic', visualMode: 'process', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '三步完成'},
      {id: 'steps', type: 'string', label: '步骤', default: '输入 / 生成 / 检查'},
      {id: 'accent', type: 'color', label: '主色', default: '#d9642a'},
    ],
  },
  {
    id: 'keyword-matrix',
    sourceId: 'keyword-matrix',
    source: 'project',
    label: '关键词矩阵',
    description: '展示一组能力点或标签。',
    category: '推荐',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['标签', '矩阵', '能力点'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'keyword-matrix', variant: 'overview', visualMode: 'grid', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '能力总览'},
      {id: 'labels', type: 'string', label: '标签', default: '写代码 / 做视频 / 生成 PPT'},
      {id: 'accent', type: 'color', label: '主色', default: '#d9642a'},
    ],
  },
  {
    id: 'compare-split',
    sourceId: 'compare-split',
    source: 'project',
    label: '前后对比',
    description: '适合展示旧状态和新状态差异。',
    category: '对比',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['对比', '前后', '改版'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'compare-split', variant: 'frontend-design', visualMode: 'compare', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '改造前后'},
      {id: 'left', type: 'string', label: '左侧', default: '旧状态'},
      {id: 'right', type: 'string', label: '右侧', default: '新状态'},
    ],
  },
  {
    id: 'product-surface',
    sourceId: 'product-surface',
    source: 'project',
    label: '产品界面展示',
    description: '强调 UI、工具或产品画面。',
    category: '界面',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['界面', '产品', '工具'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'product-surface', variant: 'ui', visualMode: 'hero', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '产品界面'},
      {id: 'subtitle', type: 'string', label: '说明', default: '把功能直接展示出来'},
      {id: 'accent', type: 'color', label: '主色', default: '#2e6b63'},
    ],
  },
  {
    id: 'data-proof',
    sourceId: 'data-proof',
    source: 'project',
    label: '数据证明页',
    description: '用于数字、结果和验证状态。',
    category: '数据',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['数据', '结果', '证明'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'data-proof', variant: 'generic', visualMode: 'metrics', heroStyle: 'hero-track-v2'},
    schema: [
      {id: 'title', type: 'string', label: '标题', default: '数据证明'},
      {id: 'value', type: 'string', label: '数字', default: '3.2x'},
      {id: 'caption', type: 'string', label: '说明', default: '效率明显提升'},
    ],
  },
  {
    id: 'quote-focus',
    sourceId: 'quote-focus',
    source: 'project',
    label: '重点引用',
    description: '把一句口播变成主视觉。',
    category: '标题',
    orientation: 'portrait',
    size: '1080×1920',
    duration: null,
    tags: ['引用', '重点', '字幕'],
    formats: ['remotion'],
    previewUrl: null,
    previewKind: 'mock',
    status: 'ready',
    renderer: {componentId: 'quote-focus', variant: 'generic', visualMode: 'quote', heroStyle: 'cinematic'},
    schema: [
      {id: 'quote', type: 'string', label: '引用', default: '这句话要被记住'},
      {id: 'caption', type: 'string', label: '补充', default: '保留口播节奏'},
      {id: 'accent', type: 'color', label: '主色', default: '#d9642a'},
    ],
  },
];

export const resolveLocalSceneComponent = (id: string | undefined | null) =>
  LOCAL_SCENE_COMPONENTS.find((item) => item.id === id || item.renderer.componentId === id) ?? null;

const normalizeLabelKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/^remotion\s+/, '')
    .replace(/visual atoms?/g, '')
    .replace(/\b(hf|html|video|flow|layer|background|backgrounds)\b/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const isComponentPlayable = (component: ComponentLibraryItem) =>
  component.source === 'project' || Boolean(component.previewUrl);

export const componentPreviewLabel = (component: ComponentLibraryItem) => {
  if (component.previewUrl) return '视频样片';
  if (component.source === 'project') return '结构预览';
  return '结构草图';
};

export const dedupeComponentLibrary = (components: ComponentLibraryItem[]) => {
  const seen = new Map<string, ComponentLibraryItem>();
  for (const component of components) {
    const key = `${component.orientation}:${normalizeLabelKey(component.label)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, component);
      continue;
    }
    const score = Number(isComponentPlayable(component)) + Number(component.previewKind === 'video') + Number(component.source === 'project');
    const existingScore = Number(isComponentPlayable(existing)) + Number(existing.previewKind === 'video') + Number(existing.source === 'project');
    if (score > existingScore || (score === existingScore && component.tags.length > existing.tags.length)) {
      seen.set(key, component);
    }
  }
  return [...seen.values()];
};

export const inferRecommendedComponentIds = (orientation: ComponentOrientation) =>
  orientation === 'portrait'
    ? ['keyword-matrix', 'code-panel', 'process-steps', 'compare-split', 'product-surface', 'data-proof']
    : ['hf:big-number-card', 'hf:three-step-flow', 'hf:timeline-scan', 'hf:remotion-ultimate-code-panel', 'hf:remotion-ultimate-terminal-panel', 'hf:before-after-stat'];
