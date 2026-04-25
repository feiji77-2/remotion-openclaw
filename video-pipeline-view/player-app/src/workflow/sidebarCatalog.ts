import type {SkillCatalogEntry} from '../app/pipelineTypes';
import type {WorkflowStepId} from './types';

export const SKILL_LIBRARY_ORDER = [
  'video-pipeline-analysis',
  'video-pipeline-title',
  'video-pipeline-content',
  'video-pipeline-scene-planner',
  'video-pipeline-scene-prompts',
  'video-pipeline-audio',
  'remotion-video-maker',
  'video-pipeline-video',
  'video-pipeline-master',
  'video-pipeline-eval',
] as const;

export const STEP_TO_SKILL_ID: Record<WorkflowStepId, string> = {
  1: 'video-pipeline-analysis',
  2: 'video-pipeline-title',
  3: 'video-pipeline-content',
  4: 'video-pipeline-scene-planner',
  5: 'video-pipeline-scene-prompts',
  6: 'video-pipeline-audio',
  7: 'remotion-video-maker',
  8: 'video-pipeline-video',
};

export function getSkillIdForStep(stepId: WorkflowStepId) {
  return STEP_TO_SKILL_ID[stepId] || null;
}

export function sortSkillCatalog(entries: SkillCatalogEntry[] | null | undefined) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const orderMap = new Map<string, number>(SKILL_LIBRARY_ORDER.map((skillId, index) => [skillId, index]));

  return [...safeEntries].sort((left, right) => {
    const leftOrder = orderMap.get(left.skillId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(right.skillId) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}
