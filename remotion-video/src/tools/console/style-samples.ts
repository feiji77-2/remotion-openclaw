import type {StylePresetId} from '../../styles/video-gen/style-presets';

export interface StyleSample {
  presetId: StylePresetId;
  summary: string;
}

export const STYLE_SAMPLES: StyleSample[] = [
  {presetId: 'cyan-tech', summary: '冷色高对比，适合技术与效率主题'},
  {presetId: 'amber-editorial', summary: '暖色电影感，适合观点与叙事内容'},
  {presetId: 'red-minimal', summary: '黑白红强秩序，适合清单与方法论'},
  {presetId: 'purple-launch', summary: '紫金聚光感，适合产品与发布主题'},
];

export const selectStyleSample = (_currentId: StylePresetId | null, nextId: StylePresetId) => ({
  candidateId: nextId,
});
