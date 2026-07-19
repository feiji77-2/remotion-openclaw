export const PRODUCT_ICON_ROOT = 'projects/skill-showcase/product-icons';

export const PRODUCT_ICON_KEYS = [
  'workbuddy',
  'coding',
  'remotion',
  'ppt',
  'illustration',
  'hyperframes',
  'ui',
  'impeccable',
  'frontend-design',
  'ux-pro',
  'cloud-design',
  'generic-ai',
  'workflow-tool',
  'design-system',
  'creative-kit',
  'coding-agent',
  'video-engine',
] as const;

export type ProductIconKey = (typeof PRODUCT_ICON_KEYS)[number];

export const PRODUCT_ICONS: Record<ProductIconKey, string> = {
  workbuddy: 'workbuddy.svg',
  coding: 'karpathy-guidelines.svg',
  remotion: 'remotion.svg',
  ppt: 'ppt-master.svg',
  illustration: 'illustration.svg',
  hyperframes: 'hyperframes.svg',
  ui: 'ui-skill.svg',
  impeccable: 'impeccable.svg',
  'frontend-design': 'frontend-design.svg',
  'ux-pro': 'ux-pro.svg',
  'cloud-design': 'cloud-design.svg',
  'generic-ai': 'generic-ai.svg',
  'workflow-tool': 'workflow-tool.svg',
  'design-system': 'design-system.svg',
  'creative-kit': 'creative-kit.svg',
  'coding-agent': 'coding-agent.svg',
  'video-engine': 'video-engine.svg',
} as const;

export const productIconPath = (key: ProductIconKey): string => `${PRODUCT_ICON_ROOT}/${PRODUCT_ICONS[key]}`;

export const SUMMARY_PRODUCT_ICONS: ProductIconKey[] = [
  'coding',
  'remotion',
  'ppt',
  'illustration',
  'hyperframes',
  'ui',
  'impeccable',
  'frontend-design',
  'ux-pro',
  'cloud-design',
  'generic-ai',
  'workflow-tool',
  'design-system',
  'creative-kit',
  'coding-agent',
  'video-engine',
];
