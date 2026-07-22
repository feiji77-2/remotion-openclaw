import {describe, expect, it} from 'vitest';
import {buildSkillShowcaseProjectFromScript} from '../script-project-generator.mjs';
import {assertVisualContract} from '../visual-contract.mjs';

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

    expect(() => assertVisualContract(project, {projectRoot: process.cwd()})).not.toThrow();
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

    expect(() => assertVisualContract(project, {projectRoot: process.cwd()})).not.toThrow();
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

    expect(() => assertVisualContract(project, {projectRoot: process.cwd()})).not.toThrow();
    expect(project.scenes).toHaveLength(1);
    const states = project.scenes[0].payload.heroTrack.states;
    expect(states).toHaveLength(captions.length);
    expect(states.map((state) => state.captionStartIndex)).toEqual(captions.map((_, index) => index));
    expect(states.map((state) => state.captionEndIndex)).toEqual(captions.map((_, index) => index));
    expect(states.every((state) => state.lens && state.shot)).toBe(true);
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

    expect(() => assertVisualContract(project, {projectRoot: process.cwd()})).toThrow(
      'payload.heroTrack.states must cover the full hero track caption range',
    );
  });
});
