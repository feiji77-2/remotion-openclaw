import {describe, expect, it} from 'vitest';
import fixture from '../../../examples/swiss-skill-spoken-v5-workbench.json';
import legacyFixture from '../../../examples/swiss-skill-spoken-v4-portrait.json';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';

describe('technical evidence workbench v2', () => {
  it('binds all 22 evidence-first steps to real caption beats', () => {
    const compiled = compileProject(VideoProjectSchema.parse(structuredClone(fixture)));
    const workbenchScenes = compiled.scenes.filter((scene) => scene.payload.heroStyle === 'technical-workbench-v2');
    const sessions = workbenchScenes.map((scene) => scene.payload.workbench as {
      kind: string;
      steps: Array<{captionIndex: number; lens: string; evidence: Array<{source: string}>}>;
    });
    const steps = sessions.flatMap((session) => session.steps);
    expect(workbenchScenes).toHaveLength(6);
    expect(steps).toHaveLength(22);
    expect(new Set(sessions.map((session) => session.kind))).toEqual(new Set([
      'ide-terminal',
      'audit-trace',
      'prompt-pipeline',
      'design-system-lab',
      'architecture-workspace',
    ]));
    expect(steps.map((step) => step.captionIndex)).toEqual(Array.from({length: 22}, (_, index) => index));
    expect(steps.map((step) => step.lens)).toEqual([
      'source-diff',
      'terminal-run',
      'manifest-resolve',
      'design-inspector',
      'rule-counter',
      'category-index',
      'live-scan',
      'snapshot-compare',
      'repo-signal',
      'direction-picker',
      'style-lock',
      'anchor-map',
      'deny-list',
      'skill-gate',
      'knowledge-vault',
      'catalog-metrics',
      'token-assembly',
      'scenario-switch',
      'blank-audit',
      'brand-pack',
      'brand-style-map',
      'system-graph',
    ]);
    expect(new Set(steps.map((step) => step.lens)).size).toBe(22);
    expect(steps.every((step) => step.evidence.length >= 3)).toBe(true);
    expect(new Set(steps.flatMap((step) => step.evidence.map((item) => item.source)))).toEqual(new Set(['script', 'derived', 'demo']));
  });

  it('keeps the v4 technical hero contract unchanged', () => {
    const compiled = compileProject(VideoProjectSchema.parse(structuredClone(legacyFixture)));
    expect(compiled.scenes.every((scene) => scene.payload.heroStyle === 'tech-explainer')).toBe(true);
    expect(compiled.scenes.every((scene) => scene.payload.workbench === undefined)).toBe(true);
  });
});
