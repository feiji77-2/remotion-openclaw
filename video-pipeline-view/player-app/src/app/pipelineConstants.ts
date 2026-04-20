import type {ProjectState} from '../workflow/types';

export const API_BASE_DEFAULT = import.meta.env.VITE_PIPELINE_API_BASE || 'http://localhost:3001';
export const API_KEY_DEFAULT = import.meta.env.VITE_PIPELINE_API_KEY || '';
export const LOCAL_SAVE_KEY = 'remotion-video-pipeline-autosave';
export const LOCAL_SAVE_TTL_MS = 24 * 60 * 60 * 1000;

export function createInitialProjectState(): ProjectState {
  return {
    id: `project-${Date.now()}`,
    name: '未命名项目',
    fps: 30,
    width: 1920,
    height: 1080,
  };
}
