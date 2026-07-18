export const PRODUCT_ICON_ROOT = 'projects/skill-showcase/product-icons';

export const PRODUCT_ICONS = {
  workbuddy: 'workbuddy.svg',
  coding: 'karpathy-guidelines.svg',
  remotion: 'remotion.svg',
  ppt: 'ppt-master.svg',
  illustration: 'illustration.svg',
  hyperframes: 'hyperframes.svg',
  ui: 'ui-skill.svg',
} as const;

export type ProductIconKey = keyof typeof PRODUCT_ICONS;

export const productIconPath = (key: ProductIconKey): string => `${PRODUCT_ICON_ROOT}/${PRODUCT_ICONS[key]}`;

export const SUMMARY_PRODUCT_ICONS: ProductIconKey[] = [
  'coding',
  'remotion',
  'ppt',
  'illustration',
  'hyperframes',
  'ui',
];
