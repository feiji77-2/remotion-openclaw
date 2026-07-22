import {mkdtempSync, rmSync} from 'node:fs';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {
  StudioHttpError,
  assertArtifactPath,
  assertContractFilePath,
  artifactSignature,
  assertProjectPathContract,
  assertJobCanStart,
  commandStepsFor,
  computeFingerprints,
  computeProjectState,
  diagnosticForFailure,
  extractLastJsonObject,
  loadPersistedJobs,
  loadVideoLibraryRecords,
  markVideoVerification,
  normalizeBoundedString,
  normalizeProjectId,
  persistJobs,
  recordRenderedVideo,
  resolveArtifactFile,
  resolveRuntimeRoot,
  restorePersistedJobs,
} from '../studio-backend.mjs';

const temporaryDirectories = [];

const createTemporaryProject = async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'studio-backend-'));
  temporaryDirectories.push(root);
  await fs.mkdir(path.join(root, 'src'), {recursive: true});
  await fs.mkdir(path.join(root, 'projects', 'demo'), {recursive: true});
  await fs.mkdir(path.join(root, 'out'), {recursive: true});
  await fs.writeFile(path.join(root, 'src', 'Root.tsx'), 'export const Root = () => null;\n');
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"fixture"}\n');
  await fs.writeFile(path.join(root, 'projects', 'demo', 'brief.json'), '{"productionId":"demo"}\n');
  await fs.writeFile(path.join(root, 'projects', 'demo', 'script-pack.json'), '{"spokenScript":"a sufficiently long fixture script"}\n');
  await fs.writeFile(path.join(root, 'projects', 'demo', 'asset-pack.json'), '{"assets":[]}\n');
  await fs.writeFile(path.join(root, 'projects', 'demo', 'project.json'), '{"schemaVersion":1,"scenes":[]}\n');
  return {
    root,
    project: {
      id: 'demo',
      title: 'Demo',
      productionPath: 'projects/demo',
      projectJsonPath: 'projects/demo/project.json',
      outputVideoPath: 'out/demo.mp4',
    },
  };
};

afterEach(() => {
  while (temporaryDirectories.length > 0) rmSync(temporaryDirectories.pop(), {recursive: true, force: true});
});

describe('studio workflow commands', () => {
  it('defines ordered build-check and render-verify workflows without a shell command', () => {
    const project = {
      id: 'demo',
      productionPath: 'projects/demo',
      projectJsonPath: 'projects/demo/project.json',
      outputVideoPath: 'out/demo.mp4',
    };
    expect(commandStepsFor('build-check', project).map((step) => step.id)).toEqual(['build', 'check']);
    expect(commandStepsFor('render-verify', project).map((step) => step.id)).toEqual(['render', 'verify']);
    expect(commandStepsFor('project-scene-stills', project).map((step) => step.id)).toEqual(['scene-stills']);
    expect(commandStepsFor('build-check', project).every((step) => Array.isArray(step.command))).toBe(true);
  });

  it('rejects commands outside the backend whitelist', () => {
    expect(() => commandStepsFor('rm-anything', {})).toThrowError(StudioHttpError);
  });
});

describe('backend path contracts', () => {
  it('returns typed validation errors for project ids and bounded strings', () => {
    expect(normalizeProjectId(' demo-01 ')).toBe('demo-01');
    expect(() => normalizeProjectId('../demo')).toThrowError(StudioHttpError);
    try {
      normalizeProjectId('../demo');
    } catch (error) {
      expect(error).toMatchObject({status: 400, code: 'invalid_project_id'});
    }

    expect(normalizeBoundedString('  hello  ', 'title', 2, 10)).toBe('hello');
    expect(() => normalizeBoundedString('', 'title', 1, 10)).toThrowError(StudioHttpError);
    expect(() => normalizeBoundedString('too long', 'title', 1, 3)).toThrowError(StudioHttpError);
  });

  it('keeps runtime state under remotion-video/runtime', () => {
    const projectRoot = '/workspace/remotion-video';
    expect(resolveRuntimeRoot(projectRoot, 'runtime/studio-test')).toBe('/workspace/remotion-video/runtime/studio-test');
    expect(() => resolveRuntimeRoot(projectRoot, '/tmp/studio-state')).toThrowError(StudioHttpError);
    expect(() => resolveRuntimeRoot(projectRoot, 'projects/demo/runtime')).toThrowError(StudioHttpError);
  });

  it('allows only canonical project command paths', () => {
    expect(assertProjectPathContract({
      id: 'demo',
      productionPath: 'projects/demo',
      projectJsonPath: 'projects/demo/project.json',
      outputVideoPath: 'out/demo.mp4',
    })).toBeTruthy();
    expect(assertProjectPathContract({
      id: 'skill-showcase',
      productionPath: 'examples',
      projectJsonPath: 'examples/skill-showcase.json',
      outputVideoPath: 'out/workbuddy-six-skills-showcase-v3.mp4',
    })).toBeTruthy();
    expect(() => assertProjectPathContract({
      id: 'demo',
      productionPath: 'projects/demo',
      projectJsonPath: 'projects/demo/project.json',
      outputVideoPath: 'package.json',
    })).toThrowError(StudioHttpError);
  });

  it('limits contract file access to production packs and read-only examples', () => {
    expect(assertContractFilePath('projects/demo/project.json')).toBe('projects/demo/project.json');
    expect(assertContractFilePath('projects/demo/copy-draft.json', {writable: true})).toBe('projects/demo/copy-draft.json');
    expect(assertContractFilePath('examples/skill-showcase.json')).toBe('examples/skill-showcase.json');
    expect(() => assertContractFilePath('src/project.json')).toThrowError(StudioHttpError);
    expect(() => assertContractFilePath('examples/skill-showcase.json', {writable: true})).toThrowError(StudioHttpError);
  });

  it('does not expose arbitrary repository files through artifacts', () => {
    expect(assertArtifactPath('out/demo.mp4')).toBe('out/demo.mp4');
    expect(assertArtifactPath('projects/demo/project.json')).toBe('projects/demo/project.json');
    expect(assertArtifactPath('public/projects/demo/audio/voice.m4a')).toBe('public/projects/demo/audio/voice.m4a');
    expect(() => assertArtifactPath('package.json')).toThrowError(StudioHttpError);
    expect(() => assertArtifactPath('.env')).toThrowError(StudioHttpError);
  });

  it('resolves public artifacts to files only after the artifact whitelist passes', () => {
    const resolved = resolveArtifactFile('/workspace/remotion-video', 'out/demo.mp4');
    expect(resolved).toEqual({
      rel: 'out/demo.mp4',
      file: '/workspace/remotion-video/out/demo.mp4',
    });
    expect(() => resolveArtifactFile('/workspace/remotion-video', '../.env')).toThrowError(StudioHttpError);
    expect(() => resolveArtifactFile('/workspace/remotion-video', 'package.json')).toThrowError(StudioHttpError);
  });
});

describe('persistent jobs', () => {
  it('turns a running job into an explicit interrupted failure on restart', () => {
    const restored = restorePersistedJobs([{
      id: 'job-1',
      status: 'running',
      currentStep: 'render',
      diagnostics: [],
      steps: [{id: 'render', status: 'running'}],
    }], '2026-07-21T00:00:00.000Z');
    expect(restored[0]).toMatchObject({status: 'failed', finishedAt: '2026-07-21T00:00:00.000Z'});
    expect(restored[0].steps[0].status).toBe('failed');
    expect(restored[0].diagnostics[0].code).toBe('job_interrupted');
  });

  it('persists completed jobs and loads them again', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'studio-jobs-'));
    temporaryDirectories.push(root);
    const file = path.join(root, 'runtime', 'jobs.json');
    const jobs = new Map([['job-1', {id: 'job-1', status: 'done', startedAt: '2026-07-21T00:00:00.000Z'}]]);
    await persistJobs(file, jobs);
    await expect(loadPersistedJobs(file)).resolves.toEqual([...jobs.values()]);
  });

  it('blocks a second running job for the same project', () => {
    const jobs = new Map([['job-1', {id: 'job-1', status: 'running', project: {id: 'demo'}}]]);
    expect(() => assertJobCanStart(jobs, 'demo')).toThrowError(StudioHttpError);
    try {
      assertJobCanStart(jobs, 'demo');
    } catch (error) {
      expect(error).toMatchObject({status: 409, code: 'project_busy'});
    }
  });
});

describe('video library records', () => {
  it('persists a playable record as soon as render output is complete', async () => {
    const {root, project} = await createTemporaryProject();
    const file = path.join(root, 'runtime', 'studio', 'video-library.json');
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'complete-video');

    const record = await recordRenderedVideo({
      file,
      projectRoot: root,
      project,
      sourceJobId: 'job-render-1',
      createdAt: '2026-07-21T10:00:00.000Z',
    });

    expect(record).toMatchObject({
      id: 'job-render-1',
      projectId: 'demo',
      projectTitle: 'Demo',
      videoPath: 'out/demo.mp4',
      status: 'generated',
      downloadAllowed: false,
      failureMessage: null,
      sourceJobId: 'job-render-1',
    });
    await expect(loadVideoLibraryRecords(file)).resolves.toEqual([record]);
  });

  it('keeps a render-success record playable when verification fails', async () => {
    const {root, project} = await createTemporaryProject();
    const file = path.join(root, 'runtime', 'studio', 'video-library.json');
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'complete-video');
    await recordRenderedVideo({file, projectRoot: root, project, sourceJobId: 'job-render-2'});

    const failed = await markVideoVerification({
      file,
      sourceJobId: 'job-render-2',
      ok: false,
      failureMessage: '文件时长与项目不一致',
    });

    expect(failed).toMatchObject({
      status: 'verification-failed',
      downloadAllowed: false,
      failureMessage: '文件时长与项目不一致',
    });
    expect((await loadVideoLibraryRecords(file))[0].playbackUrl).toContain('/api/artifact?path=');
  });

  it('does not create a record when render output is missing or empty', async () => {
    const {root, project} = await createTemporaryProject();
    const file = path.join(root, 'runtime', 'studio', 'video-library.json');

    await expect(recordRenderedVideo({file, projectRoot: root, project, sourceJobId: 'job-render-3'})).resolves.toBeNull();
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), '');
    await expect(recordRenderedVideo({file, projectRoot: root, project, sourceJobId: 'job-render-3'})).resolves.toBeNull();
    await expect(loadVideoLibraryRecords(file)).resolves.toEqual([]);
  });

  it('opens download only after successful verification and survives a reload', async () => {
    const {root, project} = await createTemporaryProject();
    const file = path.join(root, 'runtime', 'studio', 'video-library.json');
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'complete-video');
    await recordRenderedVideo({file, projectRoot: root, project, sourceJobId: 'job-render-4'});

    await markVideoVerification({file, sourceJobId: 'job-render-4', ok: true});

    await expect(loadVideoLibraryRecords(file)).resolves.toMatchObject([{
      id: 'job-render-4',
      status: 'downloadable',
      downloadAllowed: true,
      failureMessage: null,
    }]);
  });
});

describe('project freshness', () => {
  it('only reports delivery ready for current checked and verified artifacts', async () => {
    const {root, project} = await createTemporaryProject();
    await fs.writeFile(path.join(root, 'out', 'demo-frame-30.png'), 'png');
    await fs.mkdir(path.join(root, 'out', 'demo-scene-stills'), {recursive: true});
    await fs.writeFile(path.join(root, 'out', 'demo-scene-stills', 'manifest.json'), '{"scenes":[]}\n');
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'video');
    const fingerprints = await computeFingerprints(root, project);
    const stillSignature = await artifactSignature(path.join(root, 'out', 'demo-frame-30.png'));
    const sceneStillsSignature = await artifactSignature(path.join(root, 'out', 'demo-scene-stills', 'manifest.json'));
    const videoSignature = await artifactSignature(path.join(root, 'out', 'demo.mp4'));
    const marker = {...fingerprints, commandId: 'build-check', workflowId: 'build-check', finishedAt: '2026-07-21T00:00:00.000Z'};
    const state = await computeProjectState(root, project, {
      buildCheck: marker,
      preview: {...marker, artifactSignature: stillSignature},
      sceneStills: {...marker, artifactSignature: sceneStillsSignature},
      render: {...marker, artifactSignature: videoSignature},
      verify: {...marker, artifactSignature: videoSignature, result: {ok: true}},
    });
    expect(state.stages).toMatchObject({
      project: {status: 'current'},
      preview: {status: 'current'},
      sceneStills: {status: 'current'},
      render: {status: 'current'},
      verify: {status: 'current'},
    });
    expect(state.deliveryReady).toBe(true);
  });

  it('invalidates Project, preview, render and delivery when inputs change', async () => {
    const {root, project} = await createTemporaryProject();
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'video');
    const fingerprints = await computeFingerprints(root, project);
    const videoSignature = await artifactSignature(path.join(root, 'out', 'demo.mp4'));
    const marker = {...fingerprints, commandId: 'build-check', workflowId: 'build-check', artifactSignature: videoSignature};
    await fs.writeFile(path.join(root, 'projects', 'demo', 'script-pack.json'), '{"spokenScript":"changed content invalidates downstream artifacts"}\n');
    const state = await computeProjectState(root, project, {
      buildCheck: marker,
      render: marker,
      verify: marker,
    });
    expect(state.stages.project.status).toBe('stale');
    expect(state.stages.render.status).toBe('stale');
    expect(state.stages.verify.status).toBe('stale');
    expect(state.deliveryReady).toBe(false);
  });

  it('does not allow verification alone to bypass the current Project check', async () => {
    const {root, project} = await createTemporaryProject();
    await fs.writeFile(path.join(root, 'out', 'demo.mp4'), 'video');
    const fingerprints = await computeFingerprints(root, project);
    const videoSignature = await artifactSignature(path.join(root, 'out', 'demo.mp4'));
    const marker = {...fingerprints, artifactSignature: videoSignature};
    const state = await computeProjectState(root, project, {verify: marker});
    expect(state.stages.verify.status).toBe('current');
    expect(state.stages.project.status).toBe('stale');
    expect(state.deliveryReady).toBe(false);
  });

  it('does not treat a standalone project-check marker as production-current', async () => {
    const {root, project} = await createTemporaryProject();
    const fingerprints = await computeFingerprints(root, project);
    const state = await computeProjectState(root, project, {
      buildCheck: {...fingerprints, commandId: 'project-check', workflowId: null},
    });
    expect(state.stages.project.status).toBe('stale');
    expect(state.deliveryReady).toBe(false);
  });
});

describe('structured diagnostics', () => {
  it('classifies verify and missing-file failures', () => {
    expect(diagnosticForFailure({
      phase: 'verify',
      logs: ['Project render verification failed: frames expected=60 actual=30'],
    }).code).toBe('verify_failed');
    expect(diagnosticForFailure({
      phase: 'build',
      logs: ["Error: ENOENT: no such file or directory, open '/tmp/brief.json'"],
    })).toMatchObject({code: 'file_missing', path: '/tmp/brief.json'});
    expect(diagnosticForFailure({
      phase: 'check',
      logs: ['Error: [ASSET_MISSING] assets.hero.src: required file not found'],
    })).toMatchObject({code: 'asset_missing', path: 'assets.hero.src'});
  });

  it('extracts the final structured command result from mixed logs', () => {
    expect(extractLastJsonObject([
      '> npm run command',
      '{',
      '  "ok": true,',
      '  "frames": 90',
      '}',
      '[studio] verify completed',
    ])).toEqual({ok: true, frames: 90});
  });
});
