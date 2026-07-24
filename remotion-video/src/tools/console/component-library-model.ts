import componentCatalog from '../../components/ultimate-kit/families/skill-showcase/productionComponentCatalog.json';
import {ProductionComponentCatalogSchema} from '../../project/visualPlan';

export type ComponentOrientation = 'portrait' | 'landscape';
export type ComponentCategory = '推荐' | '标题' | '代码' | '流程' | '对比' | '数据' | '界面' | '总览' | '字幕' | '转场' | '特效';

export interface CompositionTemplateItem {
  compositionId: string;
  label: string;
  description: string;
  category: string;
  orientation: ComponentOrientation;
  size: string;
  compatibleIntents: string[];
  compatibleShotKinds: string[];
  requiredData: string[];
  motionCapability: string[];
  styleCapability: string[];
  productionReady: boolean;
  previewUrl: string | null;
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = ['推荐', '标题', '代码', '流程', '对比', '数据', '界面', '总览', '字幕', '转场', '特效'];
export const COMPONENT_ORIENTATIONS: ComponentOrientation[] = ['portrait', 'landscape'];

export const orientationLabel = (orientation: ComponentOrientation) => orientation === 'portrait' ? '竖屏' : '横屏';

const categoryFor = (category: string): ComponentCategory => COMPONENT_CATEGORIES.includes(category as ComponentCategory)
  ? category as ComponentCategory
  : '推荐';

const productionCatalog = ProductionComponentCatalogSchema.parse(componentCatalog);

export const LOCAL_SCENE_COMPONENTS: CompositionTemplateItem[] = productionCatalog.components
  .filter((descriptor) => descriptor.productionReady)
  .map((descriptor) => ({
    compositionId: descriptor.componentId,
    label: descriptor.label,
    description: descriptor.description,
    category: categoryFor(descriptor.category),
    orientation: descriptor.orientation as ComponentOrientation,
    size: descriptor.size,
    compatibleIntents: descriptor.compatibleIntents,
    compatibleShotKinds: descriptor.compatibleShotKinds,
    requiredData: descriptor.requiredData,
    motionCapability: descriptor.motionCapability,
    styleCapability: descriptor.styleCapability,
    productionReady: descriptor.productionReady,
    previewUrl: null,
  }));

export const resolveLocalSceneComponent = (compositionId: string | undefined | null) =>
  LOCAL_SCENE_COMPONENTS.find((item) => item.compositionId === compositionId) ?? null;

export const inferRecommendedComponentIds = (orientation: ComponentOrientation) =>
  orientation === 'portrait'
    ? ['product-showcase', 'editor-canvas', 'timeline-story', 'before-after', 'flow-trace', 'quote-callout', 'code-diff', 'metric-highlight', 'code-render', 'evidence-replay', 'overview-matrix']
    : [];
