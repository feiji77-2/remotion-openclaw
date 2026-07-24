import {describe, expect, it} from 'vitest';
import {buildSkillShowcaseProjectFromScript} from '../../../scripts/lib/script-project-generator.mjs';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';
import {VisualPlanSchema, visualPlanEntriesForScene} from '../visualPlan';

const generate = (projectId: string, scriptText: string) => VideoProjectSchema.parse(buildSkillShowcaseProjectFromScript({
  projectId,
  title: projectId,
  scriptText,
  projectRoot: process.cwd(),
  maxScenes: 4,
}));

describe('Visual Plan production contract', () => {
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
    entry.componentId = 'production-fallback';
    entry.resolution = 'error';
    entry.diagnostics = [{level: 'error', code: 'visual.component.unmatched', message: 'no renderer'}];
    expect(() => compileProject(project)).toThrow('VISUAL_PLAN_UNRESOLVED');
  });
});
