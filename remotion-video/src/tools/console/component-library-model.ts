import componentCatalog from '../../components/ultimate-kit/families/skill-showcase/productionComponentCatalog.json';
import {ProductionComponentCatalogSchema} from '../../project/visualPlan';

export type ComponentSource = 'project' | 'hyperframes';
export type ComponentOrientation = 'portrait' | 'landscape';
export type ComponentCategory = '推荐' | '标题' | '代码' | '流程' | '对比' | '数据' | '界面' | '字幕' | '转场' | '特效';
export type ComponentVisualMode = 'hero' | 'grid' | 'compare' | 'process' | 'metrics' | 'quote';
export type ComponentVariant = 'intro' | 'overview' | 'coding' | 'remotion' | 'ppt' | 'illustration' | 'hyperframes' | 'ui' | 'outro' | 'impeccable' | 'frontend-design' | 'ux-pro' | 'cloud-design' | 'generic';

export interface ComponentRendererMapping {
  componentId: string;
  rendererId: string;
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
  previewKind: 'video' | 'remotion' | 'mock';
  status: 'ready' | 'draft';
  productionReady: boolean;
  compatibleIntents: string[];
  compatibleShotKinds: string[];
  requiredData: string[];
  motionCapability: string[];
  styleCapability: string[];
  renderer: ComponentRendererMapping | null;
  schema: ComponentVariable[];
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = ['推荐', '标题', '代码', '流程', '对比', '数据', '界面', '字幕', '转场', '特效'];
export const COMPONENT_ORIENTATIONS: ComponentOrientation[] = ['portrait', 'landscape'];

export const orientationLabel = (orientation: ComponentOrientation) => orientation === 'portrait' ? '竖屏' : '横屏';

const categoryFor = (category: string): ComponentCategory => COMPONENT_CATEGORIES.includes(category as ComponentCategory)
  ? category as ComponentCategory
  : '推荐';

const productionCatalog = ProductionComponentCatalogSchema.parse(componentCatalog);

export const LOCAL_SCENE_COMPONENTS: ComponentLibraryItem[] = productionCatalog.components.map((descriptor) => ({
  id: descriptor.componentId,
  sourceId: descriptor.componentId,
  source: 'project',
  label: descriptor.label,
  description: descriptor.description,
  category: categoryFor(descriptor.category),
  orientation: descriptor.orientation as ComponentOrientation,
  size: descriptor.size,
  duration: null,
  tags: [...descriptor.compatibleIntents, ...descriptor.styleCapability].slice(0, 6),
  formats: ['remotion'],
  previewUrl: null,
  previewKind: 'remotion',
  status: 'ready',
  productionReady: descriptor.productionReady,
  compatibleIntents: descriptor.compatibleIntents,
  compatibleShotKinds: descriptor.compatibleShotKinds,
  requiredData: descriptor.requiredData,
  motionCapability: descriptor.motionCapability,
  styleCapability: descriptor.styleCapability,
  renderer: {componentId: descriptor.componentId, rendererId: descriptor.rendererId},
  schema: [],
}));

export const resolveLocalSceneComponent = (id: string | undefined | null) =>
  LOCAL_SCENE_COMPONENTS.find((item) => item.id === id || item.renderer?.componentId === id) ?? null;

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
  component.productionReady && component.renderer !== null;

export const componentPreviewLabel = (component: ComponentLibraryItem) => {
  if (component.productionReady) return '生产渲染器';
  if (component.previewUrl) return '候选样片';
  return '候选素材';
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
    const score = Number(isComponentPlayable(component)) * 4 + Number(component.previewKind === 'video') + Number(component.source === 'project');
    const existingScore = Number(isComponentPlayable(existing)) * 4 + Number(existing.previewKind === 'video') + Number(existing.source === 'project');
    if (score > existingScore || (score === existingScore && component.tags.length > existing.tags.length)) {
      seen.set(key, component);
    }
  }
  return [...seen.values()];
};

export const inferRecommendedComponentIds = (orientation: ComponentOrientation) =>
  orientation === 'portrait'
    ? ['concept-explainer', 'flow-trace', 'before-after', 'metric-highlight', 'browser-demo', 'terminal-execution']
    : [];
