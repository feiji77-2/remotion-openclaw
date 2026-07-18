import {describe, expect, it} from 'vitest';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fixture from '../../../examples/project.json';
import skillShowcaseFixture from '../../../examples/skill-showcase.json';
import {ICON_PACKS, SKILL_ICON_KEYS} from '../../components/ultimate-kit/families/skill-showcase/iconRegistry';
import {compileProject} from '../compileProject';
import {VideoProjectSchema} from '../projectSchema';

const project = () => VideoProjectSchema.parse(structuredClone(fixture));

describe('compact video project', () => {
  it('compiles deterministically from scene durations', () => {
    const first = compileProject(project());
    const second = compileProject(project());
    expect(first).toEqual(second);
    // 基于当前示例 fixture 的值（4 scenes, 1137 frames total, 7 captions）
    expect(first.durationInFrames).toBe(1137);
    expect(first.scenes).toHaveLength(4);
    expect(first.captions).toHaveLength(7);
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
    // scene[0] transition 不能长于 scene[1]（381 帧）
    value.scenes[0].transition = {type: 'fade', durationInFrames: 400};
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
