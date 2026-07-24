import {describe, expect, it} from 'vitest';
import {buildSkillShowcaseProjectFromScript} from '../../../scripts/lib/script-project-generator.mjs';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';
import {VisualDirectorSchema, VisualPlanSchema, VisualSystemSchema, visualPlanEntriesForScene} from '../visualPlan';

const generate = (projectId: string, scriptText: string) => VideoProjectSchema.parse(buildSkillShowcaseProjectFromScript({
  projectId,
  title: projectId,
  scriptText,
  projectRoot: process.cwd(),
  maxScenes: 4,
}));

describe('Visual Plan production contract', () => {
  it('accepts only the productized visual system and director grammar enums', () => {
    expect(VisualSystemSchema.parse({
      variant: 'cinematic-tech',
      pacing: 'balanced',
      platform: 'portrait',
    })).toEqual({
      variant: 'cinematic-tech',
      pacing: 'balanced',
      platform: 'portrait',
    });
    expect(VisualDirectorSchema.parse({
      scenePrimitive: 'process-map',
      layoutSignature: 'portrait:hero-track-v2:focus-diagram',
      motionPreset: 'path-draw',
      transitionPreset: 'focus-handoff',
      density: 'high',
    })).toMatchObject({scenePrimitive: 'process-map', motionPreset: 'path-draw'});
    expect(VisualSystemSchema.safeParse({
      variant: 'copied-reference',
      pacing: 'balanced',
      platform: 'portrait',
    }).success).toBe(false);
    expect(VisualDirectorSchema.safeParse({
      scenePrimitive: 'process-map',
      layoutSignature: 'portrait:hero-track-v2:focus-diagram',
      motionPreset: 'copied-zoom',
      transitionPreset: 'focus-handoff',
      density: 'high',
    }).success).toBe(false);
  });

  it('uses the exact same plan entries for storyboard inspection and compiled rendering', () => {
    const project = generate('visual-plan-shared', '浏览器打开页面检查 DOM。然后终端执行 npm run build。最后测试 12 条断言全部通过。');
    const plan = VisualPlanSchema.parse(project.visualPlan);
    const compiled = compileProject(project);

    for (const scene of project.scenes) {
      const storyboardEntries = visualPlanEntriesForScene(plan, scene.id);
      const renderScene = compiled.scenes.find((candidate) => candidate.id === scene.id);
      expect(renderScene?.payload.visualPlanEntries).toEqual(storyboardEntries);
      expect((renderScene?.payload.heroTrack as {states: Array<{componentId: string}>}).states.map((state) => state.componentId))
        .toEqual(storyboardEntries.map((entry) => entry.componentId));
      expect((renderScene?.payload.heroTrack as {states: Array<{director: unknown}>}).states.map((state) => state.director))
        .toEqual(storyboardEntries.map((entry) => entry.director));
      expect(renderScene?.payload.visualSystem).toEqual(project.visualSystem);
    }
  });

  it('selects different production components for different spoken scripts', () => {
    const codeProject = generate('visual-plan-code', '终端运行 npm test。git diff 展示新增代码行。测试报告全部通过。');
    const designProject = generate('visual-plan-design', '浏览器打开页面。Inspector 审计按钮问题。旧界面不是新界面。');
    const codeComponents = codeProject.visualPlan?.entries.map((entry) => entry.componentId);
    const designComponents = designProject.visualPlan?.entries.map((entry) => entry.componentId);
    expect(codeComponents).not.toEqual(designComponents);
    expect(new Set(codeComponents)).toEqual(new Set(['terminal-execution', 'test-report', 'code-diff']));
    expect(new Set(designComponents)).toEqual(new Set(['browser-demo', 'interface-audit', 'before-after']));
  });

  it('rejects an unresolved fallback before final rendering', () => {
    const project = generate('visual-plan-fallback', '这是一句稳定的概念解释。');
    const entry = project.visualPlan?.entries[0];
    if (!entry) throw new Error('fixture has no Visual Plan entry');
    const invalidComponentProject = structuredClone(project);
    if (!invalidComponentProject.visualPlan?.entries[0]) throw new Error('fixture has no Visual Plan entry');
    (invalidComponentProject.visualPlan.entries[0] as unknown as {componentId: string}).componentId = 'production-fallback';
    expect(VideoProjectSchema.safeParse(invalidComponentProject).success).toBe(false);
    entry.resolution = 'error';
    entry.diagnostics = [{level: 'error', code: 'visual.component.unmatched', message: 'no renderer'}];
    expect(() => compileProject(project)).toThrow('VISUAL_PLAN_UNRESOLVED');
  });
});
