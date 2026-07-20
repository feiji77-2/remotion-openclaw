import {describe, expect, it} from 'vitest';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fixture from '../../../examples/project.json';
import designShowcaseFixture from '../../../examples/design-skills-showcase.json';
import skillShowcaseFixture from '../../../examples/skill-showcase.json';
import workbenchFixture from '../../../examples/swiss-skill-spoken-v5-workbench.json';
import {ICON_PACKS, SKILL_ICON_KEYS} from '../../components/ultimate-kit/families/skill-showcase/iconRegistry';
import {PRODUCT_ICONS} from '../../components/ultimate-kit/families/skill-showcase/productIcons';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';

const project = () => VideoProjectSchema.parse(structuredClone(fixture));

describe('compact video project', () => {
  it('compiles deterministically from scene durations', () => {
    const first = compileProject(project());
    const second = compileProject(project());
    expect(first).toEqual(second);
    // 基于当前示例 fixture 的值（7 scenes, 4497 frames total, 11 captions）
    expect(first.durationInFrames).toBe(4497);
    expect(first.scenes).toHaveLength(7);
    expect(first.captions).toHaveLength(11);
  });

  it('turns an unavailable optional scene asset into a fallback', () => {
    const value = project();
    // assetId 引用了一个不存在的资产 → compileProject 产生 asset.missing diagnostic
    value.scenes[0].assetIds = ['non-existent-asset'];
    const compiled = compileProject(value);
    // 编译时 asset.missing 产生 warning，asset 被设为 available:false 的 fallback
    const fallback = compiled.scenes[0].assets[0];
    expect(fallback).toMatchObject({id: 'non-existent-asset', available: false});
    expect(compiled.diagnostics.map((diag) => diag.code)).toContain('asset.missing');
  });

  it('rejects an unknown family before rendering', () => {
    const value = project();
    value.scenes[0].family = 'unknown-family';
    expect(() => compileProject(value)).toThrow('FAMILY_UNREGISTERED');
  });

  it('rejects unsafe asset paths before rendering', () => {
    const value = project();
    // 为测试添加一个资产并设置不安全路径
    value.assets = {
      'test-asset': {kind: 'image', src: '../secret.png', required: true},
    };
    value.scenes[0].assetIds = ['test-asset'];
    expect(() => compileProject(value)).toThrow('ASSET_INVALID');
  });

  it('rejects invalid project ids and duplicate scene ids', () => {
    const invalidId = structuredClone(fixture) as Record<string, unknown>;
    invalidId.projectId = '../bad';
    expect(VideoProjectSchema.safeParse(invalidId).success).toBe(false);

    const duplicate = structuredClone(fixture) as {scenes: Array<{id: string}>};
    duplicate.scenes[1].id = duplicate.scenes[0].id;
    const parsed = VideoProjectSchema.safeParse(duplicate);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].path).toEqual(['scenes', 1, 'id']);
  });

  it('rejects transitions longer than the next scene', () => {
    const value = project();
    // scene[0] transition 不能长于 scene[1]（833 帧）
    value.scenes[0].transition = {type: 'fade', durationInFrames: 900};
    expect(() => compileProject(value)).toThrow('TRANSITION_INVALID');
  });

  it('compiles the full portrait skill showcase with editorial captions and voiceover', () => {
    const value = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    const compiled = compileProject(value);
    expect(compiled.durationInFrames).toBe(3649);
    expect(compiled.scenes).toHaveLength(9);
    expect(compiled.scenes.every((scene) => scene.family === 'skill-showcase')).toBe(true);
    expect(compiled.captionStyle).toBe('editorial');
    expect(compiled.showProjectLabel).toBe(false);
    expect(compiled.audioTracks[0]).toMatchObject({kind: 'voice'});
    const beats = compiled.scenes.flatMap((scene) => (
      Array.isArray(scene.payload.beats) ? scene.payload.beats : []
    ));
    expect(beats).toHaveLength(57);
    expect(compiled.scenes.every((scene) => {
      const sceneBeats = Array.isArray(scene.payload.beats) ? scene.payload.beats : [];
      return sceneBeats.length > 0 && sceneBeats[0].startFrame === 0;
    })).toBe(true);
    expect(compiled.scenes[2].payload.beats).toEqual(expect.arrayContaining([
      expect.objectContaining({keyword: '讲清假设', icon: 'file-search', action: 'stack', evidence: ['目标', '范围', '验收']}),
      expect.objectContaining({keyword: '最小改动', icon: 'git-compare-arrows', value: '3 files'}),
      expect.objectContaining({keyword: '自己验证', icon: 'test-tube', action: 'counter', value: '14/14'}),
    ]));
    const actions = new Set(compiled.scenes.flatMap((scene) => (
      Array.isArray(scene.payload.beats)
        ? scene.payload.beats.map((beat) => (beat as {action: string}).action)
        : []
    )));
    expect(actions).toEqual(new Set(['spotlight', 'stamp', 'trace', 'compare', 'counter', 'stack', 'focus', 'burst']));
  });

  it('compiles a changed-script design showcase without falling back to golden sample visuals', () => {
    const value = VideoProjectSchema.parse(structuredClone(designShowcaseFixture));
    const compiled = compileProject(value);
    expect(compiled.projectId).toBe('design-skills-showcase');
    expect(compiled.durationInFrames).toBe(5218);
    expect(compiled.scenes).toHaveLength(6);
    expect(compiled.scenes.every((scene) => scene.family === 'skill-showcase')).toBe(true);
    expect(compiled.scenes.map((scene) => scene.payload.variant)).toEqual([
      'intro',
      'impeccable',
      'frontend-design',
      'ux-pro',
      'cloud-design',
      'outro',
    ]);
    expect(compiled.scenes[0].payload).toMatchObject({
      brandName: 'Design Skill',
      brandIcon: 'impeccable',
      headline: 'AI 设计一眼就露馅',
      productIcons: ['impeccable', 'frontend-design', 'ux-pro', 'cloud-design'],
    });
    expect(compiled.scenes[1].payload.productIcon).toBe('impeccable');
    expect(compiled.scenes[2].payload.productIcon).toBe('frontend-design');
    expect(compiled.scenes[3].payload.productIcon).toBe('ux-pro');
    expect(compiled.scenes[4].payload.productIcon).toBe('cloud-design');
    expect(compiled.scenes[5].captionRange).toEqual({startIndex: 41, endIndex: 42});
    expect(compiled.scenes[5].durationInFrames).toBe(318);
    expect(compiled.scenes.every((scene) => {
      const range = scene.captionRange;
      const payload = scene.payload as {captionStartIndex?: number; captionEndIndex?: number; beats?: Array<Record<string, unknown>>};
      const beats = Array.isArray(payload.beats) ? payload.beats : [];
      return range
        && payload.captionStartIndex === range.startIndex
        && payload.captionEndIndex === range.endIndex
        && beats.every((beat) => (
          Number.isInteger(beat.captionStartIndex)
          && Number.isInteger(beat.captionEndIndex)
          && typeof beat.visualState === 'string'
          && typeof beat.motionPreset === 'string'
          && typeof beat.placement === 'string'
        ));
    })).toBe(true);
    const designIconFiles = (['impeccable', 'frontend-design', 'ux-pro', 'cloud-design'] as const)
      .map((key) => PRODUCT_ICONS[key]);
    expect(new Set(designIconFiles).size).toBe(4);
    expect(JSON.stringify(compiled.scenes.map((scene) => scene.payload))).not.toContain('WorkBuddy');
  });

  it('rejects ranged scenes whose duration no longer matches captions', () => {
    const value = VideoProjectSchema.parse(structuredClone(designShowcaseFixture));
    value.scenes[1].durationInFrames += 8;
    expect(() => compileProject(value)).toThrow('CAPTION_RANGE_MISMATCH');
  });

  it('builds a fresh skill-showcase project from a new voice script instead of reusing golden visuals', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'script-project-test-')), 'project.json');
    const script = [
      '今天先在终端执行知识库安装命令。',
      '接着修改 JSON 配置和代码参数。',
      '扫描界面并标注出无障碍问题。',
      '把默认版本和新版本做前后对比。',
      '运行测试验证字幕绑定和覆盖率。',
      '再展开品牌风格、图标和配色素材。',
      '让输入经过规则管线形成可追踪输出。',
      '最后，把节点汇聚成可复用的知识库系统。',
    ].join('');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/build-skill-showcase-from-script.mjs'),
      '--id', 'knowledge-workflow-script',
      '--title', '知识库工作流',
      '--script', script,
      '--out', output,
    ], {encoding: 'utf8'});
    expect(result.status, result.stderr).toBe(0);
    const generated = VideoProjectSchema.parse(JSON.parse(fs.readFileSync(output, 'utf8')));
    const compiled = compileProject(generated);
    expect(compiled.projectId).toBe('knowledge-workflow-script');
    expect(compiled.scenes.every((scene) => scene.family === 'skill-showcase')).toBe(true);
    expect(compiled.scenes.some((scene) => scene.payload.variant === 'generic')).toBe(true);
    expect(JSON.stringify(compiled.scenes.map((scene) => scene.payload))).not.toContain('WorkBuddy');
    expect(compiled.scenes.every((scene) => typeof scene.payload.sourceText === 'string')).toBe(true);
    expect(compiled.scenes.every((scene) => scene.payload.heroStyle === 'hero-track-v2')).toBe(true);
    expect(compiled.scenes.every((scene) => {
      const sceneBeats = Array.isArray(scene.payload.beats) ? scene.payload.beats : [];
      const lastBeat = sceneBeats[sceneBeats.length - 1];
      return sceneBeats.length > 0 && sceneBeats[0].startFrame === 0 && lastBeat?.endFrame === scene.durationInFrames;
    })).toBe(true);
    expect(compiled.scenes.every((scene) => scene.captionRange)).toBe(true);
    expect(compiled.scenes.every((scene) => {
      const track = scene.payload.heroTrack as {
        captionStartIndex?: number;
        captionEndIndex?: number;
        states?: Array<{startFrame?: number; endFrame?: number; captionStartIndex?: number; captionEndIndex?: number; evidence?: string[]; entityTarget?: string; cinematicPreset?: string}>;
      } | undefined;
      const range = scene.captionRange;
      const states = track?.states ?? [];
      return range
        && track?.captionStartIndex === range.startIndex
        && track?.captionEndIndex === range.endIndex
        && states.length >= Math.min(3, range.endIndex - range.startIndex + 1)
        && states.length <= 6
        && states[0]?.startFrame === 0
        && states[states.length - 1]?.endFrame === scene.durationInFrames
        && states.every((state) => Array.isArray(state.evidence) && state.evidence.length > 0 && typeof state.entityTarget === 'string' && state.entityTarget.length > 0 && typeof state.cinematicPreset === 'string' && state.cinematicPreset.length > 0)
        && states.every((state, index) => index === 0 || state.cinematicPreset !== states[index - 1]?.cinematicPreset);
    })).toBe(true);
    const generatedHeroKinds = compiled.scenes.map((scene) => (scene.payload.heroTrack as {kind?: string})?.kind);
    expect(new Set(generatedHeroKinds).size).toBeGreaterThanOrEqual(3);
    const generatedLayouts = compiled.scenes.map((scene) => String(scene.payload.layoutSignature));
    expect(generatedLayouts.every((layout) => layout.startsWith('portrait:hero-track-v2:'))).toBe(true);
  });

  it('does not merge generated scenes across numbered hard boundaries', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hard-boundary-test-')), 'project.json');
    const script = [
      '第一个，先讲反模式检测。它会把紫色渐变和居中堆叠标出来。',
      '第二个，讲审美方向。Swiss、Baltic、Nordic 和 Neo 要逐个出现。',
      '第三个，讲设计系统。颜色、字体、间距和 WCAG 要一起输出。',
      '最后，总结成可复用系统。',
    ].join('');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/build-skill-showcase-from-script.mjs'),
      '--id', 'hard-boundary-script',
      '--title', '硬边界测试',
      '--script', script,
      '--max-scenes', '2',
      '--out', output,
    ], {encoding: 'utf8'});
    expect(result.status, result.stderr).toBe(0);
    const generated = VideoProjectSchema.parse(JSON.parse(fs.readFileSync(output, 'utf8')));
    expect(generated.scenes.length).toBeGreaterThan(2);
    const sceneTexts = generated.scenes.map((scene) => String(scene.payload.sourceText ?? ''));
    expect(sceneTexts.some((text) => text.includes('第一个') && text.includes('第二个'))).toBe(false);
    expect(sceneTexts.some((text) => text.includes('第二个') && text.includes('第三个'))).toBe(false);
  });

  it('maps spoken narrative signals into scene layouts for regenerated scripts', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'narrative-signal-test-')), 'project.json');
    const script = [
      '今天讲一个全新的设计流程。',
      '第一步，把需求排成编号路径。',
      '但是旧方案和新方案要明确对比。',
      '另外把规则、颜色、字体等等展开成标签。',
      '因为输入输出要形成链路。',
      '最后，总结成项目合同。',
    ].join('');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/build-skill-showcase-from-script.mjs'),
      '--id', 'narrative-signal-script',
      '--title', '叙事信号测试',
      '--script', script,
      '--max-scenes', '8',
      '--out', output,
    ], {encoding: 'utf8'});
    expect(result.status, result.stderr).toBe(0);
    const generated = VideoProjectSchema.parse(JSON.parse(fs.readFileSync(output, 'utf8')));
    const compiled = compileProject(generated);
    const payloads = compiled.scenes.map((scene) => scene.payload as {
      narrativeSignal?: {key?: string};
      layoutSignature?: string;
      visualMode?: string;
    });
    expect(payloads.map((payload) => payload.narrativeSignal?.key).filter(Boolean)).toEqual(expect.arrayContaining([
      'spoken-ranking',
      'spoken-compare',
      'spoken-tags',
      'spoken-process',
    ]));
    expect(payloads.map((payload) => payload.layoutSignature).every((layout) => (
      typeof layout === 'string' && layout.startsWith('portrait:hero-track-v2:')
    ))).toBe(true);
    expect(new Set(payloads.map((payload) => payload.visualMode).filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it('rejects three consecutive repeated skill-showcase body layouts', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'layout-regression-test-')), 'project.json');
    const repeated = VideoProjectSchema.parse(structuredClone(designShowcaseFixture));
    repeated.scenes.slice(1, 4).forEach((scene) => {
      scene.payload.variant = 'generic';
      scene.payload.visualMode = 'grid';
      scene.payload.layoutSignature = 'tag-matrix';
    });
    fs.writeFileSync(output, `${JSON.stringify(repeated, null, 2)}\n`, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      output,
    ], {encoding: 'utf8'});
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('three consecutive skill-showcase scenes reuse the same body layout');
  });

  it('enforces technical hero presets only when the reusable tech-explainer mode is enabled', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tech-hero-contract-test-'));
    const missingPath = path.join(directory, 'missing.json');
    const repeatedPath = path.join(directory, 'repeated.json');
    const technical = structuredClone(designShowcaseFixture) as typeof designShowcaseFixture;
    const presetRotation = ['browser-demo', 'terminal-run', 'ui-audit', 'workflow-trace'];
    technical.scenes.forEach((scene) => {
      (scene.payload as Record<string, unknown>).heroStyle = 'tech-explainer';
      const beats = scene.payload.beats as Array<Record<string, unknown>>;
      beats.forEach((beat, index) => { beat.heroPreset = presetRotation[index % presetRotation.length]; });
    });

    const missing = structuredClone(technical);
    delete (missing.scenes[0].payload.beats as Array<Record<string, unknown>>)[0].heroPreset;
    fs.writeFileSync(missingPath, `${JSON.stringify(missing, null, 2)}\n`, 'utf8');
    const missingResult = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      missingPath,
    ], {encoding: 'utf8'});
    expect(missingResult.status).toBe(1);
    expect(missingResult.stdout).toContain('heroPreset must be a valid technical-explainer preset');

    const repeated = structuredClone(technical);
    const repeatedBeats = repeated.scenes.find((scene) => scene.payload.beats.length >= 3)?.payload.beats as Array<Record<string, unknown>>;
    repeatedBeats.slice(0, 3).forEach((beat) => { beat.heroPreset = 'browser-demo'; });
    fs.writeFileSync(repeatedPath, `${JSON.stringify(repeated, null, 2)}\n`, 'utf8');
    const repeatedResult = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      repeatedPath,
    ], {encoding: 'utf8'});
    expect(repeatedResult.status).toBe(1);
    expect(repeatedResult.stdout).toContain('three consecutive beats reuse the same technical hero preset');
  });

  it('rejects a V2 workbench that leaves a semantic beat without an evidence step', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-coverage-test-')), 'project.json');
    const changed = structuredClone(workbenchFixture);
    changed.scenes[0].payload.workbench.steps.splice(1, 1);
    fs.writeFileSync(output, `${JSON.stringify(changed, null, 2)}\n`, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      output,
    ], {encoding: 'utf8'});
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('must bind to a technical workbench step');
  });

  it('rejects a V2 workbench step without a beat-level lens', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-lens-test-')), 'project.json');
    const changed = structuredClone(workbenchFixture);
    delete (changed.scenes[0].payload.workbench.steps[0] as {lens?: string}).lens;
    fs.writeFileSync(output, `${JSON.stringify(changed, null, 2)}\n`, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      output,
    ], {encoding: 'utf8'});
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('lens must be a valid technical workbench lens');
  });

  it('rejects changed captions that keep the golden sample project id and old visuals', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'visual-contract-test-')), 'project.json');
    const changed = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    changed.captions = [
      {text: '今天讲一个完全不同的知识库工作流。', startMs: 0, endMs: 2000, timestampMs: 0, confidence: 1},
      {text: '这条新稿不应该继续出现旧样片画面。', startMs: 2000, endMs: 4000, timestampMs: 2000, confidence: 1},
    ];
    fs.writeFileSync(output, `${JSON.stringify(changed, null, 2)}\n`, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/check-project-visual-contract.mjs'),
      output,
    ], {encoding: 'utf8'});
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('reserved for the WorkBuddy golden sample');
  });

  it('keeps the 12 semantic icon packs backed by pinned local SVG assets', () => {
    expect(Object.keys(ICON_PACKS)).toHaveLength(12);
    expect(new Set(SKILL_ICON_KEYS).size).toBe(SKILL_ICON_KEYS.length);
    const mappedIcons = Object.values(ICON_PACKS).flat();
    expect(mappedIcons).toHaveLength(SKILL_ICON_KEYS.length);
    expect(new Set(mappedIcons)).toEqual(new Set(SKILL_ICON_KEYS));
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const missing = SKILL_ICON_KEYS.filter((icon) => !fs.existsSync(path.join(
      root,
      'public/projects/skill-showcase/icons',
      `${icon}.svg`,
    )));
    expect(missing).toEqual([]);
  });

  it('rejects unsupported skill showcase variants before rendering', () => {
    const value = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    value.scenes[0].payload.variant = 'unsupported';
    expect(() => compileProject(value)).toThrow('SCENE_PAYLOAD_INVALID');
  });

  it('rejects invalid or out-of-scene semantic beats before rendering', () => {
    const inverted = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    const invertedBeats = inverted.scenes[2].payload.beats as Array<Record<string, unknown>>;
    invertedBeats[0].endFrame = invertedBeats[0].startFrame;
    expect(() => compileProject(inverted)).toThrow('SCENE_PAYLOAD_INVALID');

    const outside = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    const outsideBeats = outside.scenes[2].payload.beats as Array<Record<string, unknown>>;
    outsideBeats[0].endFrame = 600;
    expect(() => compileProject(outside)).toThrow('beat must end within the scene duration');

    const excessiveEvidence = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    const evidenceBeats = excessiveEvidence.scenes[2].payload.beats as Array<Record<string, unknown>>;
    evidenceBeats[0].evidence = ['one', 'two', 'three', 'four', 'five'];
    expect(() => compileProject(excessiveEvidence)).toThrow('SCENE_PAYLOAD_INVALID');

    const unsupportedIcon = VideoProjectSchema.parse(structuredClone(skillShowcaseFixture));
    const iconBeats = unsupportedIcon.scenes[2].payload.beats as Array<Record<string, unknown>>;
    iconBeats[0].icon = 'made-up-icon';
    expect(() => compileProject(unsupportedIcon)).toThrow('SCENE_PAYLOAD_INVALID');
  });

  it('imports a legacy V2 fixture into the compact project contract', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'project-import-test-')), 'project.json');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts/import-legacy-project.mjs'),
      path.join(root, 'examples/v2-smoke.json'),
      '--out', output,
    ], {encoding: 'utf8'});
    expect(result.status, result.stderr).toBe(0);
    const imported = VideoProjectSchema.parse(JSON.parse(fs.readFileSync(output, 'utf8')));
    const report = JSON.parse(fs.readFileSync(`${output}.import-report.json`, 'utf8'));
    expect(compileProject(imported).durationInFrames).toBe(120);
    expect(report.missingAssets).toEqual([]);
  });
});
