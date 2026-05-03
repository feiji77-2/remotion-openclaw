import {useCallback, useEffect} from 'react';
import type {WorkflowStepId} from '../workflow/types';
import {callJson} from './pipelineApi';
import {usePipelineSessionStore} from './pipelineStore';
import type {SkillCatalogEntry, SkillSpec} from './pipelineTypes';
import {getSkillIdForStep, sortSkillCatalog} from '../workflow/sidebarCatalog';

function normalizeCatalogEntries(entries: unknown): SkillCatalogEntry[] {
  return sortSkillCatalog(Array.isArray(entries) ? entries as SkillCatalogEntry[] : []);
}

/** Resolves skill catalog from backend and caches in pipelineState.skillCatalog. */
export function useSkillCatalogLoader() {
  const apiBase = usePipelineSessionStore((s) => s.apiBase);
  const apiKey = usePipelineSessionStore((s) => s.apiKey);
  const hasHydrated = usePipelineSessionStore((s) => s.hasHydrated);
  const setPipelineState = usePipelineSessionStore((s) => s.setPipelineState);
  const setSkillError = usePipelineSessionStore((s) => s.setSkillError);

  const loadSkillCatalog = useCallback(async () => {
    try {
      const data = await callJson(`${apiBase}/api/skills/catalog`, {method: 'GET'}, apiKey);
      const catalog = normalizeCatalogEntries(data?.skills);
      setPipelineState((prev) => ({
        ...prev,
        skillCatalog: catalog,
      }));
      setSkillError(null);
      return catalog;
    } catch (err) {
      setSkillError('技能目录加载失败: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    }
  }, [apiBase, apiKey, setPipelineState, setSkillError]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadSkillCatalog();
  }, [hasHydrated, loadSkillCatalog]);

  return {loadSkillCatalog};
}

/** Caches individual skill specs by skillId, keyed by stepId. */
export function useSkillSpecLoader(activeStep: WorkflowStepId) {
  const apiBase = usePipelineSessionStore((s) => s.apiBase);
  const apiKey = usePipelineSessionStore((s) => s.apiKey);
  const hasHydrated = usePipelineSessionStore((s) => s.hasHydrated);
  const setPipelineState = usePipelineSessionStore((s) => s.setPipelineState);
  const setSkillError = usePipelineSessionStore((s) => s.setSkillError);

  const loadSkillSpec = useCallback(async (stepId: WorkflowStepId) => {
    const skillId = getSkillIdForStep(stepId);
    if (!skillId) return null;

    const currentState = usePipelineSessionStore.getState().pipelineState;
    const cached = currentState.skillSpecsById?.[skillId];
    if (cached) return cached;

    try {
      const data = await callJson(`${apiBase}/api/skills/${skillId}`, {method: 'GET'}, apiKey);
      const skillSpec = data as SkillSpec;
      setPipelineState((prev) => ({
        ...prev,
        skillSpecsById: {
          ...(prev.skillSpecsById || {}),
          [skillId]: skillSpec,
        },
      }));
      setSkillError(null);
      return skillSpec;
    } catch (err) {
      setSkillError('技能配置加载失败: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    }
  }, [apiBase, apiKey, setPipelineState, setSkillError]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadSkillSpec(activeStep);
  }, [activeStep, hasHydrated, loadSkillSpec]);

  return {loadSkillSpec};
}
