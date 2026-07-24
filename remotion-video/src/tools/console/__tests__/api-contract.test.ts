import {afterEach, describe, expect, it, vi} from 'vitest';
import {createProject, loadRemoteComponentLibrary, StudioApiError} from '../api';
import type {CreateProjectDraft} from '../types';

const draft: CreateProjectDraft = {
  projectId: 'video-contract-test',
  title: 'Contract test',
  orientation: 'portrait',
  style: 'cyan-tech',
  spokenScript: '这是一段用于验证项目创建错误响应契约的口播文案。',
  keywords: 'contract,test',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Studio API consumer contract', () => {
  it('preserves structured backend diagnostics when project creation fails', async () => {
    vi.stubGlobal('window', {
      location: {port: '8787', origin: 'http://127.0.0.1:8787'},
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: '项目已存在',
      code: 'project_exists',
      path: 'projects/video-contract-test',
      diagnostics: [{
        level: 'error',
        code: 'project_exists',
        phase: 'create-project',
        path: 'projects/video-contract-test',
        message: '请选择新的项目 ID',
      }],
    }), {
      status: 409,
      headers: {'content-type': 'application/json'},
    })));

    const error = await createProject(draft).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(StudioApiError);
    expect(error).toMatchObject({
      message: '项目已存在',
      code: 'project_exists',
      path: 'projects/video-contract-test',
      diagnostics: [{code: 'project_exists', phase: 'create-project'}],
    });
  });

  it('keeps the documented component-library response metadata and item shape', async () => {
    vi.stubGlobal('window', {
      location: {port: '8787', origin: 'http://127.0.0.1:8787'},
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      available: true,
      sourceRoot: 'src/components/ultimate-kit/families/skill-showcase',
      version: 1,
      components: [{
        compositionId: 'browser-demo',
        label: '浏览器实操',
        description: '生产组件',
        category: '界面',
        orientation: 'portrait',
        size: '1080x1920',
        compatibleIntents: ['browser-interaction'],
        compatibleShotKinds: ['browser-demo'],
        requiredData: ['shot.environment'],
        motionCapability: ['viewport-reveal'],
        styleCapability: ['browser-chrome'],
        productionReady: true,
        previewUrl: null,
      }],
    }), {
      status: 200,
      headers: {'content-type': 'application/json'},
    })));

    const library = await loadRemoteComponentLibrary();

    expect(library).toMatchObject({
      available: true,
      sourceRoot: 'src/components/ultimate-kit/families/skill-showcase',
      version: 1,
      components: [{compositionId: 'browser-demo', productionReady: true, previewUrl: null}],
    });
  });
});
