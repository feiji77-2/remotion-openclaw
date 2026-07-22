import {describe, expect, it} from 'vitest';
import {
  creatorArtifactStatus,
  invalidateProductionArtifacts,
  navigationState,
  requestCopyTransfer,
  usesSceneTimeline,
  usesWideEditor,
  type WorkflowSnapshot,
  type WorkflowStepId,
} from '../workflow-model';

const baseSnapshot: WorkflowSnapshot = {
  hasProject: true,
  scriptReady: false,
  styleReady: false,
  projectStatus: 'missing',
  previewStatus: 'missing',
  renderStatus: 'missing',
  verifyStatus: 'missing',
};

describe('console workflow navigation', () => {
  it('shows the scene timeline only where a scene can be selected for review or output', () => {
    expect(['copy', 'script', 'style', 'preview', 'components'].every((step) => !usesSceneTimeline(step as WorkflowStepId))).toBe(true);
    expect(['storyboard', 'render', 'deliver'].every((step) => usesSceneTimeline(step as WorkflowStepId))).toBe(true);
  });

  it('uses a wide editor without the preview pane for non-render editing steps', () => {
    expect(['copy', 'script', 'style'].every((step) => usesWideEditor(step as WorkflowStepId))).toBe(true);
    expect(['storyboard', 'preview', 'render', 'deliver', 'components'].every((step) => !usesWideEditor(step as WorkflowStepId))).toBe(true);
  });

  it('keeps copy workshop and spoken script open while downstream stages explain why they are locked', () => {
    const state = navigationState(baseSnapshot);
    expect(state.copy).toMatchObject({enabled: true, reason: null});
    expect(state.script).toMatchObject({enabled: true, reason: null});
    expect(state.style).toMatchObject({enabled: false, reason: '等待口播文案'});
    expect(state.storyboard).toMatchObject({enabled: false, reason: '等待应用风格'});
    expect(state.preview).toMatchObject({enabled: false, reason: '已移至渲染'});
    expect(state.render).toMatchObject({enabled: false, reason: '等待应用风格'});
    expect(state.deliver).toMatchObject({enabled: false, reason: '等待生成成片'});
  });

  it('keeps the removed preview step locked while render can refresh a stale storyboard itself', () => {
    const state = navigationState({
      ...baseSnapshot,
      scriptReady: true,
      styleReady: true,
      projectStatus: 'stale',
    });
    expect(state.storyboard).toMatchObject({enabled: true, reason: null});
    expect(state.preview).toMatchObject({enabled: false, reason: '已移至渲染'});
    expect(state.render).toMatchObject({enabled: true, reason: null});
  });

  it('opens each production stage only after its evidence exists', () => {
    const state = navigationState({
      ...baseSnapshot,
      scriptReady: true,
      styleReady: true,
      projectStatus: 'current',
      previewStatus: 'current',
      renderStatus: 'current',
      verifyStatus: 'current',
    });
    expect(Object.entries(state).filter(([step]) => step !== 'preview').every(([, entry]) => entry.enabled)).toBe(true);
    expect(state.preview).toMatchObject({enabled: false, reason: '已移至渲染'});
  });
});

describe('current preview', () => {
  it('invalidates all downstream artifacts immediately after formal production input changes', () => {
    expect(invalidateProductionArtifacts({
      projectStatus: 'current',
      previewStatus: 'current',
      sceneStillsStatus: 'current',
      renderStatus: 'current',
      verifyStatus: 'current',
      deliveryReady: true,
    })).toEqual({
      projectStatus: 'stale',
      previewStatus: 'stale',
      sceneStillsStatus: 'stale',
      renderStatus: 'stale',
      verifyStatus: 'stale',
      deliveryReady: false,
    });
  });
});

describe('copy transfer', () => {
  it('creates a pending transfer without replacing the spoken script immediately', () => {
    expect(requestCopyTransfer({savedText: '已保存的创作草稿', savedAt: '2026-07-21T08:00:00.000Z'})).toEqual({
      text: '已保存的创作草稿',
      requestedAt: '2026-07-21T08:00:00.000Z',
    });
  });

  it('rejects an empty saved draft', () => {
    expect(() => requestCopyTransfer({savedText: '  ', savedAt: null})).toThrow('请先保存草稿');
  });
});

describe('creator artifact status', () => {
  it('maps internal verification state to creator-facing playback and download language', () => {
    expect(creatorArtifactStatus('current', 'missing')).toEqual({label: '已生成，可播放', downloadAllowed: false});
    expect(creatorArtifactStatus('current', 'current')).toEqual({label: '已生成，可下载', downloadAllowed: true});
    expect(creatorArtifactStatus('current', 'stale')).toEqual({label: '视频文件有问题，暂时不能下载', downloadAllowed: false});
    expect(creatorArtifactStatus('missing', 'missing')).toEqual({label: '尚未生成成片', downloadAllowed: false});
  });
});
