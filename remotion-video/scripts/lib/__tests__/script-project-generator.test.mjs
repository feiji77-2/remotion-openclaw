import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {buildSkillShowcaseProjectFromScript} from '../script-project-generator.mjs';
import {assertVisualContract} from '../visual-contract.mjs';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = path.resolve(TEST_ROOT, '../../..');
const FIXTURE_ROOT = path.join(TEST_ROOT, 'fixtures');
const VISUAL_DIVERSITY_FIXTURES = [
  'visual-diversity-tech',
  'visual-diversity-product',
  'visual-diversity-knowledge',
];

const maxConsecutiveRun = (values) => {
  let maxRun = 0;
  let currentRun = 0;
  let previous = null;
  for (const value of values) {
    currentRun = value === previous ? currentRun + 1 : 1;
    previous = value;
    maxRun = Math.max(maxRun, currentRun);
  }
  return maxRun;
};

const copyPackFixture = (fixtureName) => {
  const source = path.join(FIXTURE_ROOT, fixtureName);
  const target = fs.mkdtempSync(path.join(os.tmpdir(), `${fixtureName}-`));
  for (const file of ['brief.json', 'script-pack.json', 'asset-pack.json']) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
  return target;
};

const buildProjectFromPackFixture = (fixtureName) => {
  const packDir = copyPackFixture(fixtureName);
  const output = path.join(packDir, 'project.json');
  const result = spawnSync(
    process.execPath,
    [
      path.join(REMOTION_ROOT, 'scripts/build-project-from-production.mjs'),
      packDir,
      '--out',
      'project.json',
    ],
    {cwd: REMOTION_ROOT, encoding: 'utf8'},
  );
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(fs.readFileSync(output, 'utf8'));
};

describe('buildSkillShowcaseProjectFromScript', () => {
  it('does not pass Whisper avg_logprob through as a Project confidence value', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'whisper-confidence',
      title: '转写测试',
      projectRoot: process.cwd(),
      captions: [
        {text: '第一句。', startMs: 0, endMs: 1000, confidence: -0.18},
        {text: '第二句。', startMs: 1000, endMs: 2000, confidence: 0.82},
        {text: '第三句。', startMs: 2000, endMs: 3000, confidence: 1.2},
      ],
    });

    expect(project.captions.map((caption) => caption.confidence)).toEqual([null, 0.82, null]);
  });

  it('keeps generic spoken scenes from producing three repeated body layouts', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'generic-layout-rotation',
      title: '通用讲解布局测试',
      projectRoot: process.cwd(),
      scriptText: [
        '今天讲一个新的团队协作方法，先把问题说清楚。',
        '这套方法会让需求、判断、执行和复盘都进入同一张工作台。',
        '团队每天只需要围绕当前目标更新材料。',
        '负责人根据材料判断下一步动作。',
        '执行者看到的是明确的结果要求。',
        '最后把过程沉淀成可以复用的项目记录。',
      ].join(''),
      maxScenes: 6,
    });

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    const layouts = project.scenes.map((scene) => String(scene.payload.layoutSignature));
    for (let index = 2; index < layouts.length; index += 1) {
      expect([layouts[index - 2], layouts[index - 1], layouts[index]]).not.toEqual([
        layouts[index],
        layouts[index],
        layouts[index],
      ]);
    }
  });

  it('assigns technical Hero shots from spoken operation signals', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'technical-shot-routing',
      title: '技术口播镜头测试',
      projectRoot: process.cwd(),
      scriptText: [
        '浏览器打开页面，DevTools 里 DOM 状态变成 ready。',
        '终端输入 npm run build，CI 输出通过。',
        '打开文件看 Diff，删除旧逻辑，新增缓存版本参数。',
        '检查配置 JSON，规则开关保持启用。',
        '界面审计定位按钮没有响应，组件状态被标红。',
        '流程从输入口播到生成分镜再输出视频。',
        '测试报告显示 37 条断言全部通过。',
        '素材库只选匹配的动画，不再乱塞模板。',
        '系统图展示 Prompt、Skill 闸门和渲染器重新加载。',
        '前后对照里旧视频变暗，新视频立即接管。',
      ].join(''),
      maxScenes: 10,
    });

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    const states = project.scenes.flatMap((scene) => scene.payload.heroTrack.states);
    const shotKinds = states.map((state) => state.shot?.kind);

    expect(new Set(shotKinds)).toEqual(new Set([
      'browser-demo',
      'terminal-execution',
      'code-diff',
      'config-check',
      'interface-audit',
      'flow-trace',
      'test-report',
      'asset-library',
      'system-map',
      'before-after',
    ]));
    expect(states.every((state) => state.captionStartIndex === state.captionEndIndex)).toBe(true);
    expect(states.every((state) => state.lens?.objective && state.lens?.actionLabel)).toBe(true);
    expect(states.every((state) => Array.isArray(state.shot?.evidence) && state.shot.evidence.length > 0)).toBe(true);
  });

  it('keeps every merged caption bound to a technical Hero state', () => {
    const captions = Array.from({length: 9}, (_, index) => ({
      text: [
        '浏览器打开页面，DevTools 里 DOM 状态变成 ready。',
        '终端输入 npm run build，CI 输出通过。',
        '打开文件看 Diff，删除旧逻辑，新增缓存版本参数。',
        '检查配置 JSON，规则开关保持启用。',
        '界面审计定位按钮没有响应，组件状态被标红。',
        '流程从输入口播到生成分镜再输出视频。',
        '测试报告显示 37 条断言全部通过。',
        '素材库只选匹配的动画，不再乱塞模板。',
        '系统图展示 Prompt、Skill 闸门和渲染器重新加载。',
      ][index],
      startMs: index * 1000,
      endMs: (index + 1) * 1000,
    }));
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'merged-caption-hero-binding',
      title: '合并场景节拍绑定测试',
      projectRoot: process.cwd(),
      captions,
      maxScenes: 1,
    });

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    expect(project.scenes).toHaveLength(1);
    const states = project.scenes[0].payload.heroTrack.states;
    expect(states).toHaveLength(captions.length);
    expect(states.map((state) => state.captionStartIndex)).toEqual(captions.map((_, index) => index));
    expect(states.map((state) => state.captionEndIndex)).toEqual(captions.map((_, index) => index));
    expect(states.every((state) => state.lens && state.shot)).toBe(true);
  });

  it('keeps beat frames locked to captions even when aligned audio contains a short pause', () => {
    const captions = [
      {text: '第一句先建立画面。', startMs: 0, endMs: 1000},
      {text: '第二句中间有一点真实停顿。', startMs: 1300, endMs: 2100},
      {text: '第三句继续说明操作结果。', startMs: 2100, endMs: 3000},
    ];
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'caption-gap-beat-binding',
      title: '字幕停顿绑定测试',
      projectRoot: process.cwd(),
      captions,
      maxScenes: 1,
    });

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    const beats = project.scenes[0].payload.beats;
    expect(beats[1]).toMatchObject({
      captionStartIndex: 1,
      captionEndIndex: 1,
      startFrame: 39,
      endFrame: 63,
    });
  });

  it('merges punctuation-only aligned captions before generating visual beats', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'punctuation-caption-binding',
      title: '纯标点字幕测试',
      projectRoot: process.cwd(),
      scriptText: '第一句建立主题。第二句解释原因。第三句给出结论。',
      captions: [
        {text: '。', startMs: 0, endMs: 120},
        {text: '第一句建立主题', startMs: 120, endMs: 1000},
        {text: '。', startMs: 1000, endMs: 1150},
        {text: '第二句解释原因', startMs: 1150, endMs: 2000},
        {text: '。', startMs: 2000, endMs: 2140},
        {text: '第三句给出结论', startMs: 2140, endMs: 3000},
        {text: '。', startMs: 3000, endMs: 3180},
      ],
      maxScenes: 1,
    });

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    expect(project.captions).toEqual([
      expect.objectContaining({text: '。第一句建立主题。', startMs: 0, endMs: 1150}),
      expect.objectContaining({text: '第二句解释原因。', startMs: 1150, endMs: 2140}),
      expect.objectContaining({text: '第三句给出结论。', startMs: 2140, endMs: 3180}),
    ]);
    const beats = project.scenes.flatMap((scene) => scene.payload.beats);
    expect(beats.every((beat) => !/^要点\s+\d+$/.test(beat.keyword))).toBe(true);
  });

  it('rejects Hero tracks that leave generated captions without a visual state', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'hero-caption-coverage-contract',
      title: '主视觉覆盖契约测试',
      projectRoot: process.cwd(),
      captions: [
        {text: '浏览器打开页面，DevTools 里 DOM 状态变成 ready。', startMs: 0, endMs: 1000},
        {text: '终端输入 npm run build，CI 输出通过。', startMs: 1000, endMs: 2000},
        {text: '测试报告显示 37 条断言全部通过。', startMs: 2000, endMs: 3000},
      ],
      maxScenes: 1,
    });
    project.scenes[0].payload.heroTrack.states.pop();

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).toThrow(
      'payload.heroTrack.states must cover the full hero track caption range',
    );
  });

  it('excludes editor provenance from stale rendered-copy checks', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'component-provenance-contract',
      title: '组件来源元数据测试',
      projectRoot: process.cwd(),
      scriptText: '这段口播只讲组件来源元数据不应进入画面文案检查。',
      maxScenes: 1,
    });
    project.scenes[0].payload.sceneEditor = {
      componentId: 'hf:metric-pulse',
      source: 'hyperframes',
      sourceComponentId: 'metric-pulse',
      rendererComponentId: 'data-proof',
      componentLabel: 'HyperFrames Metric Pulse',
    };

    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
    project.scenes[0].payload.title = 'HyperFrames Metric Pulse';
    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).toThrow(
      'stale golden-sample term not present in narration: HyperFrames',
    );
  });

  it('ignores internal icon identifiers when auditing stale golden sample copy', () => {
    const project = buildSkillShowcaseProjectFromScript({
      projectId: 'icon-metadata-contract',
      title: 'Mo 图标元数据测试',
      projectRoot: process.cwd(),
      scriptText: '第二个Mo，它让你用写网页的方式写视频，一段react代码就是一帧画面。',
      maxScenes: 1,
    });

    expect(project.scenes[0].payload.productIcon).toBe('remotion');
    expect(project.scenes[0].payload.brandIcon).toBe('remotion');
    expect(project.scenes[0].payload.productIcons).toContain('remotion');
    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();

    project.scenes[0].payload.headline = 'Remotion';
    expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).toThrow(
      'stale golden-sample term not present in narration: Remotion',
    );
  });

  it('keeps from-pack multi-domain fixtures matched and visually diverse', () => {
    const projects = VISUAL_DIVERSITY_FIXTURES.map(buildProjectFromPackFixture);
    const allComponents = [];
    const allLayouts = [];
    const allVariants = [];
    const allScenePrimitives = [];
    const allMotionPresets = [];
    const allTransitionPresets = [];

    for (const project of projects) {
      expect(() => assertVisualContract(project, {projectRoot: REMOTION_ROOT})).not.toThrow();
      const entries = project.visualPlan?.entries ?? [];
      expect(entries.length).toBeGreaterThan(0);
      const components = entries.map((entry) => entry.componentId);
      const resolutions = entries.map((entry) => entry.resolution);
      const diagnostics = entries.flatMap((entry) => entry.diagnostics ?? []);
      const layouts = project.scenes.map((scene) => String(scene.payload.layoutSignature));
      const heroTrackKinds = project.scenes.map((scene) => String(scene.payload.heroTrack.kind));
      const directors = entries.map((entry) => entry.director);

      expect(project.visualSystem).toMatchObject({
        variant: expect.stringMatching(/^(cinematic-tech|editorial-lightcut|product-console)$/),
        pacing: expect.stringMatching(/^(fast|balanced|explainer)$/),
        platform: 'portrait',
      });
      expect(project.scenes.every((scene) => JSON.stringify(scene.payload.visualSystem) === JSON.stringify(project.visualSystem))).toBe(true);
      expect(components).not.toContain('generic-explainer');
      expect(heroTrackKinds).not.toContain('generic-explainer');
      expect(resolutions.every((resolution) => resolution === 'matched')).toBe(true);
      expect(diagnostics.some((diagnostic) => diagnostic.level === 'error')).toBe(false);
      expect(maxConsecutiveRun(components)).toBeLessThanOrEqual(2);
      expect(layouts.every((layout) => layout.startsWith('portrait:hero-track-v2:'))).toBe(true);
      expect(directors.every((director) => director?.layoutSignature?.startsWith('portrait:hero-track-v2:'))).toBe(true);
      expect(directors.every((director) => ['low', 'medium', 'high'].includes(director?.density))).toBe(true);
      expect(new Set(components).size).toBeGreaterThanOrEqual(10);
      expect(new Set(layouts).size).toBeGreaterThanOrEqual(6);
      expect(new Set(directors.map((director) => director?.scenePrimitive)).size).toBeGreaterThanOrEqual(4);
      expect(new Set(directors.map((director) => director?.motionPreset)).size).toBeGreaterThanOrEqual(4);
      expect(new Set(directors.map((director) => director?.transitionPreset)).size).toBeGreaterThanOrEqual(2);

      allComponents.push(...components);
      allLayouts.push(...layouts);
      allVariants.push(project.visualSystem.variant);
      allScenePrimitives.push(...directors.map((director) => director.scenePrimitive));
      allMotionPresets.push(...directors.map((director) => director.motionPreset));
      allTransitionPresets.push(...directors.map((director) => director.transitionPreset));
    }

    expect(new Set(allVariants)).toEqual(new Set(['cinematic-tech', 'product-console', 'editorial-lightcut']));
    expect(new Set(allComponents).size).toBeGreaterThanOrEqual(18);
    expect(new Set(allLayouts).size).toBeGreaterThanOrEqual(6);
    expect(new Set(allScenePrimitives).size).toBeGreaterThanOrEqual(6);
    expect(new Set(allMotionPresets).size).toBeGreaterThanOrEqual(6);
    expect(new Set(allTransitionPresets).size).toBeGreaterThanOrEqual(4);
  });
});
