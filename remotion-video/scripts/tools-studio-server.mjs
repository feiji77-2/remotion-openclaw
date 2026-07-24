#!/usr/bin/env node

import {spawn} from 'node:child_process';
import {createReadStream, existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildStarterProject,
  buildBrief,
  buildScriptPack,
  buildAssetPack,
} from './lib/starter-project.mjs';
import {
  StudioHttpError,
  assertContractFilePath,
  assertProjectPathContract,
  artifactForCommand,
  artifactSignature,
  assertJobCanStart,
  atomicWriteJson,
  commandStepsFor,
  canPromoteCheckedProject,
  computeFingerprints,
  computeProjectState,
  diagnosticForFailure,
  extractLastJsonObject,
  isPathInside,
  isTerminalJob,
  loadPersistedJobs,
  loadProjectStateRecord,
  loadVideoLibraryRecords,
  markVideoVerification,
  normalizeBoundedString,
  normalizeProjectId,
  normalizeSafeRelPath,
  persistJobs,
  recordRenderedVideo,
  resolveArtifactFile,
  resolveRuntimeRoot,
  saveProjectStateRecord,
} from './lib/studio-backend.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');
const PRODUCTION_COMPONENT_CATALOG_PATH = path.join(PROJECT_ROOT, 'src', 'components', 'ultimate-kit', 'families', 'skill-showcase', 'productionComponentCatalog.json');
const STATIC_ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, 'build', 'tools'),
  path.join(REPO_ROOT, 'build', 'tools'),
];
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');
const RUNTIME_ROOT = resolveRuntimeRoot(PROJECT_ROOT, process.env.VIDEO_FACTORY_RUNTIME_DIR || 'runtime/studio');
const JOBS_FILE = path.join(RUNTIME_ROOT, 'jobs.json');
const VIDEO_LIBRARY_FILE = path.join(RUNTIME_ROOT, 'video-library.json');
const staticRoot = () => STATIC_ROOT_CANDIDATES.find((candidate) => existsSync(path.join(candidate, 'index.html')))
  ?? STATIC_ROOT_CANDIDATES[0];
const HOST = '127.0.0.1';
const PORT = Number(process.env.VIDEO_FACTORY_PORT || 8787);
const restoredJobs = await loadPersistedJobs(JOBS_FILE);
const jobs = new Map(restoredJobs.map((job) => [job.id, job]));
let persistChain = Promise.resolve();
let persistTimer = null;
const editableInputFiles = new Set(['brief.json', 'script-pack.json', 'asset-pack.json']);
const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_UPLOAD_BYTES = 120 * 1024 * 1024;
const audioUploadExtensions = new Set(['.m4a', '.mp3', '.wav', '.aac', '.ogg', '.webm']);
const audioContentTypes = new Map([
  ['.aac', 'audio/aac'],
  ['.m4a', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.webm', 'audio/webm'],
]);

const persistJobState = () => {
  persistChain = persistChain
    .catch(() => undefined)
    .then(() => persistJobs(JOBS_FILE, jobs));
  return persistChain;
};
const libraryLock = {chain: Promise.resolve()};
const withLibraryLock = (operation) => {
  libraryLock.chain = libraryLock.chain.catch(() => undefined).then(operation);
  return libraryLock.chain;
};

const schedulePersistJobState = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistJobState().catch((error) => console.error('[studio] failed to persist jobs:', error));
  }, 120);
};

if (restoredJobs.length > 0) await persistJobState();

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.mp4', 'video/mp4'],
  ['.mov', 'video/quicktime'],
  ['.m4a', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.aac', 'audio/aac'],
  ['.ogg', 'audio/ogg'],
  ['.webm', 'video/webm'],
]);

const sendJson = (res, status, value) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(value, null, 2));
};

const readJson = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BODY_BYTES) {
      throw new StudioHttpError(413, 'request_too_large', `JSON body exceeds ${MAX_JSON_BODY_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new StudioHttpError(400, 'malformed_json', 'Request body must be valid JSON');
  }
};

const readBinary = async (req, maxBytes) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new StudioHttpError(413, 'request_too_large', `Upload exceeds ${maxBytes} bytes`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const normalizeProject = (raw) => {
  const project = {
    id: normalizeProjectId(raw?.id),
    title: String(raw?.title || raw?.id || 'Video Project').slice(0, 120),
    productionPath: normalizeSafeRelPath(raw?.productionPath, 'productionPath'),
    projectJsonPath: normalizeSafeRelPath(raw?.projectJsonPath, 'projectJsonPath'),
    outputVideoPath: normalizeSafeRelPath(raw?.outputVideoPath, 'outputVideoPath'),
  };
  assertProjectPathContract(project);
  return project;
};

const titleFromProjectJson = async (projectJsonPath, fallback) => {
  try {
    const data = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, projectJsonPath), 'utf8'));
    return String(data?.title || fallback).slice(0, 120);
  } catch {
    return fallback;
  }
};

const discoverProjects = async () => {
  const options = [];
  const addProject = async (projectJsonPath, productionPath, fallbackTitle, id) => {
    if (!existsSync(path.join(PROJECT_ROOT, projectJsonPath))) return;
    options.push({
      id,
      title: await titleFromProjectJson(projectJsonPath, fallbackTitle),
      productionPath,
      projectJsonPath,
      outputVideoPath: `out/${id}.mp4`,
    });
  };

  await addProject('examples/skill-showcase.json', 'examples', 'Skill Showcase 样片', 'skill-showcase');

  const projectsRoot = path.join(PROJECT_ROOT, 'projects');
  if (existsSync(projectsRoot)) {
    const entries = await fs.readdir(projectsRoot, {withFileTypes: true});
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      let id;
      try { id = normalizeProjectId(entry.name); } catch { continue; }
      const productionPath = `projects/${entry.name}`;
      await addProject(`${productionPath}/project.json`, productionPath, entry.name, id);
    }
  }

  return options;
};

const readStudioFile = async (rel) => {
  const file = path.resolve(PROJECT_ROOT, rel);
  if (!isPathInside(PROJECT_ROOT, file)) throw new Error('file path escaped project root');
  if (!existsSync(file)) return {path: rel, exists: false, data: null};
  try {
    return {
      path: rel,
      exists: true,
      data: JSON.parse(await fs.readFile(file, 'utf8')),
    };
  } catch (error) {
    return {
      path: rel,
      exists: true,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const writeStudioFile = async (rel, data) => {
  const file = path.resolve(PROJECT_ROOT, rel);
  if (!isPathInside(PROJECT_ROOT, file)) throw new Error('file path escaped project root');
  const previous = rel.endsWith('/asset-pack.json') ? await readStudioFile(rel) : null;
  const materialized = data;
  await atomicWriteJson(file, materialized);
  if (previous?.data && rel.endsWith('/asset-pack.json')) {
    const projectId = rel.match(/^projects\/([A-Za-z0-9._-]{1,96})\/asset-pack\.json$/)?.[1];
    const oldAssets = Array.isArray(previous.data.assets) ? previous.data.assets : [];
    const nextAssets = Array.isArray(materialized?.assets) ? materialized.assets : [];
    const retained = new Set(nextAssets.filter((asset) => asset?.kind === 'audio').map((asset) => String(asset.src || '')));
    for (const asset of oldAssets) {
      const src = String(asset?.src || '').replace(/^\/+/, '');
      if (asset?.kind !== 'audio' || !projectId || retained.has(src) || !src.startsWith(`projects/${projectId}/audio/`)) continue;
      const orphan = path.resolve(PUBLIC_ROOT, src);
      if (isPathInside(path.join(PUBLIC_ROOT, 'projects', projectId, 'audio'), orphan)) await fs.rm(orphan, {force: true});
    }
  }
  return readStudioFile(rel);
};

const publicArtifact = (artifact) => {
  if (!artifact) return artifact;
  try {
    const {rel, file} = resolveArtifactFile(PROJECT_ROOT, artifact.path);
    if (!isPathInside(PROJECT_ROOT, file) || !existsSync(file)) return {...artifact, path: rel};
    return {...artifact, path: rel, url: `/api/artifact?path=${encodeURIComponent(rel)}`};
  } catch {
    return {...artifact, url: null};
  }
};

const publicJob = (job) => ({
  id: job.id,
  commandId: job.commandId,
  workflowId: job.workflowId,
  label: job.label,
  command: job.command,
  status: job.status,
  project: job.project,
  projectId: job.project?.id ?? null,
  currentStep: job.currentStep,
  steps: job.steps,
  logs: job.logs.slice(-220),
  exitCode: job.exitCode,
  error: job.error,
  diagnostics: job.diagnostics ?? [],
  retryOf: job.retryOf ?? null,
  artifact: publicArtifact(job.artifact),
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
  updatedAt: job.updatedAt ?? job.finishedAt ?? job.startedAt ?? null,
});

const publicVideoRecord = (record) => ({...record, playbackUrl: record.playbackUrl, downloadUrl: record.downloadAllowed ? `/api/video-library/${encodeURIComponent(record.id)}/download` : null});

const boundedText = (value, fallback = '', max = 220) => String(value ?? fallback).trim().slice(0, max);

const safeAudioUploadName = (value) => {
  const fallback = 'voice.m4a';
  const raw = path.basename(String(value || fallback).trim() || fallback);
  const ext = path.extname(raw).toLowerCase();
  if (!audioUploadExtensions.has(ext)) {
    throw new StudioHttpError(400, 'audio_type_unsupported', '音频只支持 m4a、mp3、wav、aac、ogg、webm');
  }
  const stem = path.basename(raw, ext)
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'voice';
  return {displayName: `${stem}${ext}`, ext};
};

const productionComponentCategory = (value) => {
  const category = boundedText(value, '推荐', 12);
  return ['推荐', '标题', '代码', '流程', '对比', '数据', '界面', '字幕', '转场', '特效'].includes(category)
    ? category
    : '推荐';
};

const loadComponentLibrary = async () => {
  const catalog = JSON.parse(await fs.readFile(PRODUCTION_COMPONENT_CATALOG_PATH, 'utf8'));
  const descriptors = Array.isArray(catalog.components) ? catalog.components : [];
  const components = descriptors
    .filter((descriptor) => descriptor.productionReady === true)
    .map((descriptor) => ({
      compositionId: boundedText(descriptor.componentId, '', 80),
      label: boundedText(descriptor.label, descriptor.componentId, 80),
      description: boundedText(descriptor.description, 'Video Factory production renderer', 220),
      category: productionComponentCategory(descriptor.category),
      orientation: descriptor.orientation === 'landscape' ? 'landscape' : 'portrait',
      size: boundedText(descriptor.size, descriptor.orientation === 'landscape' ? '1920x1080' : '1080x1920', 24),
      compatibleIntents: Array.isArray(descriptor.compatibleIntents) ? descriptor.compatibleIntents.map((item) => boundedText(item, '', 48)).filter(Boolean) : [],
      compatibleShotKinds: Array.isArray(descriptor.compatibleShotKinds) ? descriptor.compatibleShotKinds.map((item) => boundedText(item, '', 48)).filter(Boolean) : [],
      requiredData: Array.isArray(descriptor.requiredData) ? descriptor.requiredData.map((item) => boundedText(item, '', 80)).filter(Boolean) : [],
      motionCapability: Array.isArray(descriptor.motionCapability) ? descriptor.motionCapability.map((item) => boundedText(item, '', 48)).filter(Boolean) : [],
      styleCapability: Array.isArray(descriptor.styleCapability) ? descriptor.styleCapability.map((item) => boundedText(item, '', 48)).filter(Boolean) : [],
      productionReady: descriptor.productionReady === true,
      previewUrl: null,
    }))
    .filter((component) => component.compositionId);
  return {
    ok: true,
    available: components.length > 0,
    sourceRoot: path.relative(PROJECT_ROOT, path.dirname(PRODUCTION_COMPONENT_CATALOG_PATH)).split(path.sep).join('/'),
    version: catalog.version ?? null,
    components,
  };
};

const appendLog = (job, chunk) => {
  const text = chunk.toString('utf8');
  job.updatedAt = new Date().toISOString();
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) job.logs.push(line);
  }
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
  schedulePersistJobState();
};

const normalizeInputFiles = (value, commandId, project) => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > editableInputFiles.size) {
    throw new StudioHttpError(400, 'invalid_input_files', `files must contain at most ${editableInputFiles.size} input contracts`);
  }
  if (value.length > 0 && commandId !== 'build-check' && commandId !== 'build-check-audio') {
    throw new StudioHttpError(400, 'invalid_input_files', 'files can only be saved by the build-check workflows');
  }
  const seen = new Set();
  return value.map((entry) => {
    const rel = assertContractFilePath(entry?.path, {label: 'input file path', writable: true});
    const basename = path.basename(rel);
    const expected = `${project.productionPath}/${basename}`;
    if (!editableInputFiles.has(basename) || rel !== expected) {
      throw new StudioHttpError(400, 'invalid_input_files', `input file path must target ${project.productionPath}/{brief.json,script-pack.json,asset-pack.json}`);
    }
    if (seen.has(rel)) throw new StudioHttpError(400, 'invalid_input_files', `duplicate input file: ${rel}`);
    if (!entry.data || typeof entry.data !== 'object' || Array.isArray(entry.data)) {
      throw new StudioHttpError(400, 'invalid_input_files', `${basename} data must be a JSON object`);
    }
    seen.add(rel);
    return {path: rel, data: entry.data};
  });
};

const writeInputFiles = async (files) => {
  const originals = await Promise.all(files.map(async (entry) => {
    const file = path.join(PROJECT_ROOT, entry.path);
    try {
      return {file, existed: true, content: await fs.readFile(file)};
    } catch (error) {
      if (error?.code === 'ENOENT') return {file, existed: false, content: null};
      throw error;
    }
  }));
  try {
    for (const entry of files) await atomicWriteJson(path.join(PROJECT_ROOT, entry.path), entry.data);
  } catch (error) {
    await Promise.all(originals.map(async (original) => {
      if (original.existed) await fs.writeFile(original.file, original.content);
      else await fs.rm(original.file, {force: true});
    }));
    throw error;
  }
};

const runProcessStep = (job, step) => new Promise((resolve) => {
  const [command, ...args] = step.command;
  let settled = false;
  let spawnError = null;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve(result);
  };
  appendLog(job, `$ ${step.command.join(' ')}`);
  const child = spawn(command, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    shell: false,
  });
  child.stdout.on('data', (chunk) => appendLog(job, chunk));
  child.stderr.on('data', (chunk) => appendLog(job, chunk));
  child.on('error', (error) => {
    spawnError = error;
    appendLog(job, error.message);
    finish({exitCode: null, error});
  });
  child.on('close', (code) => finish({exitCode: code, error: spawnError}));
});

const successMarker = async (job) => {
  const fingerprints = job.inputFingerprints ?? await computeFingerprints(PROJECT_ROOT, job.project);
  const finishedAt = new Date().toISOString();
  const marker = {...fingerprints, jobId: job.id, commandId: job.commandId, workflowId: job.workflowId, finishedAt};
  const current = await loadProjectStateRecord(RUNTIME_ROOT, job.project.id);
  const next = {...current};

  if (job.commandId === 'build-project') {
    next.buildCheck = null;
    next.preview = null;
    next.sceneStills = null;
    next.render = null;
    next.verify = null;
  }
  if (job.commandId === 'project-check') {
    next.projectCheck = marker;
    if (canPromoteCheckedProject(current.buildCheck, fingerprints)) {
      next.buildCheck = {...marker, workflowId: 'build-check'};
    }
  }
  if (job.commandId === 'build-check' || job.commandId === 'build-check-audio') {
    next.buildCheck = marker;
    next.preview = null;
    next.sceneStills = null;
    next.render = null;
    next.verify = null;
  }
  if (job.commandId === 'project-still') {
    next.preview = {
      ...marker,
      artifactSignature: await artifactSignature(path.join(PROJECT_ROOT, `out/${job.project.id}-frame-30.png`)),
    };
  }
  if (job.commandId === 'project-scene-stills') {
    next.sceneStills = {
      ...marker,
      artifactSignature: await artifactSignature(path.join(PROJECT_ROOT, `out/${job.project.id}-scene-stills/manifest.json`)),
    };
  }
  if (job.commandId === 'project-render') {
    next.render = {
      ...marker,
      artifactSignature: await artifactSignature(path.join(PROJECT_ROOT, job.project.outputVideoPath)),
    };
    next.verify = null;
  }
  if (job.commandId === 'project-verify' || job.commandId === 'render-verify') {
    const signature = await artifactSignature(path.join(PROJECT_ROOT, job.project.outputVideoPath));
    const result = extractLastJsonObject(job.logs);
    if (result) {
      await atomicWriteJson(path.join(PROJECT_ROOT, `out/${job.project.id}-verify.json`), {
        ...result,
        projectId: job.project.id,
        videoPath: job.project.outputVideoPath,
        verifiedAt: finishedAt,
        evidence: {
          componentReport: `out/${job.project.id}-component-report.json`,
          qaManifest: `out/${job.project.id}-qa/manifest.json`,
          qaContactSheet: `out/${job.project.id}-qa/contact-sheet.jpg`,
        },
      });
    }
    next.render = {...marker, artifactSignature: signature};
    next.verify = {...marker, artifactSignature: signature, result};
  }
  return saveProjectStateRecord(RUNTIME_ROOT, job.project.id, next);
};

const failJob = async (job, step, {exitCode = null, error = null, diagnostic = null} = {}) => {
  const finishedAt = new Date().toISOString();
  step.status = 'failed';
  step.exitCode = exitCode;
  step.error = error?.message ?? diagnostic?.message ?? `Step ${step.id} failed`;
  step.finishedAt = finishedAt;
  job.status = 'failed';
  job.exitCode = exitCode;
  job.error = step.error;
  job.finishedAt = finishedAt;
  job.updatedAt = finishedAt;
  job.currentStep = step.id;
  job.diagnostics.push(diagnostic ?? diagnosticForFailure({phase: step.id, logs: job.logs, error}));
  if (step.id === 'verify' && job.artifact?.kind === 'video') {
    try {
      await withLibraryLock(() => markVideoVerification({
        file: VIDEO_LIBRARY_FILE,
        sourceJobId: job.id,
        projectId: job.project.id,
        videoPath: job.project.outputVideoPath,
        ok: false,
        failureMessage: step.error,
      }));
    } catch (libraryError) {
      job.diagnostics.push({
        level: 'warning',
        code: 'video_library_update_failed',
        phase: 'video-library',
        path: null,
        message: libraryError instanceof Error ? libraryError.message : String(libraryError),
      });
    }
  }
  appendLog(job, exitCode == null ? `[studio] ${step.id} failed` : `[studio] ${step.id} failed with exit code ${exitCode}`);
  await persistJobState();
};

const executeJob = async (job, inputFiles) => {
  for (const step of job.steps) {
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    job.currentStep = step.id;
    job.updatedAt = step.startedAt;
    await persistJobState();

    if (step.kind === 'save-inputs') {
      try {
        await writeInputFiles(inputFiles);
        step.status = 'done';
        step.exitCode = 0;
        step.finishedAt = new Date().toISOString();
        job.updatedAt = step.finishedAt;
        appendLog(job, `[studio] saved ${inputFiles.length} input contract(s)`);
      } catch (error) {
        await failJob(job, step, {
          error,
          diagnostic: {level: 'error', code: 'input_save_failed', phase: step.id, path: null, message: error instanceof Error ? error.message : String(error)},
        });
        return;
      }
      continue;
    }

    const capturesProjectInput = (
      ['project-still', 'project-scene-stills', 'project-render', 'project-verify', 'render-verify'].includes(job.commandId)
      || (['build-check', 'build-check-audio', 'project-check'].includes(job.commandId) && step.id === 'check')
    );
    if (capturesProjectInput && !job.inputFingerprints) {
      job.inputFingerprints = await computeFingerprints(PROJECT_ROOT, job.project);
    }

    let result;
    try {
      result = await runProcessStep(job, step);
    } catch (error) {
      await failJob(job, step, {error});
      return;
    }
    step.exitCode = result.exitCode;
    step.finishedAt = new Date().toISOString();
    if (result.error || result.exitCode !== 0) {
      await failJob(job, step, result);
      return;
    }
    step.status = 'done';
    job.updatedAt = step.finishedAt;
    appendLog(job, `[studio] ${step.id} completed`);
    if (step.id === 'render' && job.artifact?.kind === 'video') {
      try {
        await withLibraryLock(() => recordRenderedVideo({file: VIDEO_LIBRARY_FILE, projectRoot: PROJECT_ROOT, project: job.project, sourceJobId: job.id, createdAt: job.startedAt}));
      } catch (error) {
        const libraryStep = {id: 'persist-video-library', label: 'Persist Video Library', kind: 'internal', command: null, status: 'running', exitCode: null, error: null, startedAt: new Date().toISOString(), finishedAt: null};
        job.steps.push(libraryStep);
        await failJob(job, libraryStep, {error, diagnostic: {level: 'error', code: 'video_library_persist_failed', phase: 'video-library', path: VIDEO_LIBRARY_FILE, message: error instanceof Error ? error.message : String(error)}});
        return;
      }
    }
    if (step.id === 'verify' && job.artifact?.kind === 'video') {
      try {
        await withLibraryLock(() => markVideoVerification({file: VIDEO_LIBRARY_FILE, sourceJobId: job.id, projectId: job.project.id, videoPath: job.project.outputVideoPath, ok: true}));
      } catch (error) {
        const libraryStep = {id: 'persist-video-library', label: 'Persist Video Library', kind: 'internal', command: null, status: 'running', exitCode: null, error: null, startedAt: new Date().toISOString(), finishedAt: null};
        job.steps.push(libraryStep);
        await failJob(job, libraryStep, {error, diagnostic: {level: 'error', code: 'video_library_persist_failed', phase: 'video-library', path: VIDEO_LIBRARY_FILE, message: error instanceof Error ? error.message : String(error)}});
        return;
      }
    }
  }

  try {
    await successMarker(job);
  } catch (error) {
    const stateStep = {
      id: 'persist-state',
      label: 'Persist Project State',
      kind: 'internal',
      command: null,
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    job.steps.push(stateStep);
    await failJob(job, stateStep, {
      error,
      diagnostic: {level: 'error', code: 'state_persist_failed', phase: 'persist-state', path: null, message: error instanceof Error ? error.message : String(error)},
    });
    return;
  }

  job.status = 'done';
  job.currentStep = null;
  job.exitCode = 0;
  job.finishedAt = new Date().toISOString();
  job.updatedAt = job.finishedAt;
  appendLog(job, '[studio] task completed');
  await persistJobState();
};

const createJob = async (body, {retryOf = null} = {}) => {
  const project = normalizeProject(body.project);
  const commandId = String(body.commandId || '');
  const inputFiles = normalizeInputFiles(body.files, commandId, project);

  assertJobCanStart(jobs, project.id);
  if (commandId === 'render-verify') {
    const record = await loadProjectStateRecord(RUNTIME_ROOT, project.id);
    const state = await computeProjectState(PROJECT_ROOT, project, record);
    if (state.stages.project.status !== 'current') {
      throw new StudioHttpError(409, 'project_not_checked', 'Project must pass build-check before render-verify', [{
        level: 'error',
        code: 'project_not_checked',
        phase: 'preflight',
        path: project.projectJsonPath,
        message: 'Run build-check for the current inputs and renderer before rendering the deliverable MP4.',
      }]);
    }
  }
  assertJobCanStart(jobs, project.id);

  const processSteps = commandStepsFor(commandId, project, process.execPath);
  const steps = inputFiles.length > 0
    ? [{
      id: 'save-inputs',
      label: 'Save Input Contracts',
      kind: 'save-inputs',
      command: null,
      status: 'pending',
      exitCode: null,
      error: null,
      startedAt: null,
      finishedAt: null,
    }, ...processSteps]
    : processSteps;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const command = processSteps.map((step) => step.command.join(' ')).join(' && ');
  const startedAt = new Date().toISOString();
  const job = {
    id,
    commandId,
    workflowId: commandId === 'build-check' || commandId === 'build-check-audio' || commandId === 'render-verify' ? commandId : null,
    label: String(body.label || commandId).slice(0, 160),
    command,
    project,
    status: 'running',
    currentStep: steps[0]?.id ?? null,
    steps,
    logs: [],
    diagnostics: [],
    artifact: artifactForCommand(commandId, project),
    exitCode: null,
    error: null,
    retryOf,
    inputFiles,
    startedAt,
    finishedAt: null,
    updatedAt: startedAt,
  };
  jobs.set(id, job);
  await persistJobState();
  void executeJob(job, inputFiles).catch(async (error) => {
    const step = job.steps.find((candidate) => candidate.status === 'running') ?? {
      id: 'internal', label: 'Internal Job Execution', kind: 'internal', command: null, status: 'running', exitCode: null, error: null, startedAt: new Date().toISOString(), finishedAt: null,
    };
    if (!job.steps.includes(step)) job.steps.push(step);
    try { await failJob(job, step, {error}); }
    catch (persistError) {
      console.error('[studio] failed to settle job:', persistError);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.finishedAt = new Date().toISOString();
      job.updatedAt = job.finishedAt;
    }
  });
  return job;
};

const serveFile = async (req, res, file) => {
  const stats = await fs.stat(file);
  const extension = path.extname(file).toLowerCase();
  const contentType = extension === '.webm' && file.split(path.sep).includes('audio')
    ? 'audio/webm'
    : contentTypes.get(extension) || 'application/octet-stream';
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), stats.size - 1) : stats.size - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= stats.size) {
      res.writeHead(416, {'content-range': `bytes */${stats.size}`});
      res.end();
      return;
    }
    res.writeHead(206, {
      'content-type': contentType,
      'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${stats.size}`,
      'accept-ranges': 'bytes',
      'access-control-allow-origin': '*',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file, {start, end}).pipe(res);
    return;
  }
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': stats.size,
    'accept-ranges': 'bytes',
    'access-control-allow-origin': '*',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
};

const serveArtifact = async (req, res, url) => {
  const {file} = resolveArtifactFile(PROJECT_ROOT, url.searchParams.get('path'));
  if (!existsSync(file)) {
    sendJson(res, 404, {ok: false, error: 'artifact not found'});
    return;
  }
  res.setHeader('cache-control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('pragma', 'no-cache');
  await serveFile(req, res, file);
};

const serveStatic = async (req, res, url) => {
  const STATIC_ROOT = staticRoot();
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const publicFile = path.resolve(PUBLIC_ROOT, `.${pathname}`);
  if (isPathInside(PUBLIC_ROOT, publicFile) && publicFile !== PUBLIC_ROOT && existsSync(publicFile)) {
    await serveFile(req, res, publicFile);
    return;
  }
  const requested = path.normalize(path.join(STATIC_ROOT, pathname));
  const fallback = path.join(STATIC_ROOT, 'index.html');
  const isHtml = pathname === '/index.html' || (requested !== fallback && path.extname(requested).toLowerCase() === '.html');
  const file = isPathInside(STATIC_ROOT, requested) && existsSync(requested) ? requested : fallback;
  if (!existsSync(file)) {
    sendJson(res, 404, {
      ok: false,
      error: 'tools build not found',
      next: 'Run npm run tools:build before starting tools:studio.',
    });
    return;
  }
  const contentType = contentTypes.get(path.extname(file).toLowerCase()) || 'text/plain; charset=utf-8';
  // Inject VIDEO_FACTORY_PORT into HTML so the frontend knows the runner origin
  if (isHtml && contentType.includes('text/html')) {
    let html = await fs.readFile(file, 'utf8');
    html = html.replace('</head>', `<script>window.__VIDEO_FACTORY_PORT__=${PORT};</script></head>`);
    res.writeHead(200, {'content-type': contentType});
    res.end(html);
    return;
  }
  await serveFile(req, res, file);
};

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        cwd: PROJECT_ROOT,
        jobs: jobs.size,
        runningJobs: [...jobs.values()].filter((job) => job.status === 'running').length,
        persistence: path.relative(PROJECT_ROOT, JOBS_FILE),
      });
      return;
    }
    if (url.pathname === '/api/projects' && req.method === 'GET') {
      sendJson(res, 200, {ok: true, projects: await discoverProjects()});
      return;
    }
    const projectStateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/state$/);
    if (projectStateMatch && req.method === 'GET') {
      const projectId = normalizeProjectId(decodeURIComponent(projectStateMatch[1]));
      const project = (await discoverProjects()).find((candidate) => candidate.id === projectId);
      if (!project) {
        sendJson(res, 404, {ok: false, code: 'project_not_found', error: `Project ${projectId} not found`});
        return;
      }
      const record = await loadProjectStateRecord(RUNTIME_ROOT, projectId);
      const state = await computeProjectState(PROJECT_ROOT, project, record);
      const activeJob = [...jobs.values()].find((job) => job.project?.id === projectId && job.status === 'running');
      sendJson(res, 200, {ok: true, state: {...state, activeJob: activeJob ? publicJob(activeJob) : null}});
      return;
    }
    if (url.pathname === '/api/projects' && req.method === 'POST') {
      const body = await readJson(req);
      const projectId = normalizeProjectId(body.projectId);
      const title = normalizeBoundedString(body.title, 'title');
      if (body.orientation !== 'portrait') throw new StudioHttpError(400, 'invalid_field', 'orientation must be portrait');
      const orientation = body.orientation;
      const spokenScript = normalizeBoundedString(body.spokenScript ?? body.script ?? '', 'spokenScript', 20, 8000);
      const productionPath = `projects/${projectId}`;
      const outputVideoPath = `out/${projectId}.mp4`;

      const projectDir = path.join(PROJECT_ROOT, productionPath);
      const styles = [
        'cyan-tech',
        'amber-editorial',
        'red-minimal',
        'purple-launch',
      ];
      if (!styles.includes(body.style)) throw new StudioHttpError(400, 'invalid_field', `unsupported style: ${String(body.style)}`);
      const style = body.style;
      const keywords = String(body.keywords ?? '').trim();
      const brief = buildBrief(projectId, title, orientation, style);
      const scriptPack = buildScriptPack(projectId, title, spokenScript, keywords);
      const assetPack = buildAssetPack(projectId);
      const starterProject = buildStarterProject(projectId, title, spokenScript, orientation, style, keywords);
      const publicProjectDir = path.join(PROJECT_ROOT, 'public', 'projects', projectId);
      await fs.mkdir(path.dirname(projectDir), {recursive: true});
      try {
        await fs.mkdir(projectDir);
      } catch (error) {
        if (error?.code === 'EEXIST') {
          sendJson(res, 409, {ok: false, error: `项目 ${projectId} 已存在`, path: productionPath});
          return;
        }
        throw error;
      }
      try {
        await fs.mkdir(path.join(publicProjectDir, 'assets'), {recursive: true});
        await fs.mkdir(path.join(publicProjectDir, 'audio'), {recursive: true});
        const files = [
          [`${productionPath}/brief.json`, brief],
          [`${productionPath}/script-pack.json`, scriptPack],
          [`${productionPath}/asset-pack.json`, assetPack],
          [`${productionPath}/project.json`, starterProject],
        ];
        await Promise.all(files.map(([rel, data]) => writeStudioFile(rel, data)));
      } catch (error) {
        await Promise.all([
          fs.rm(projectDir, {recursive: true, force: true}),
          fs.rm(publicProjectDir, {recursive: true, force: true}),
        ]);
        throw error;
      }

      const projectOption = {
        id: projectId,
        title: await titleFromProjectJson(`${productionPath}/project.json`, title),
        productionPath,
        projectJsonPath: `${productionPath}/project.json`,
        outputVideoPath,
      };
      sendJson(res, 201, {
        ok: true,
        project: projectOption,
        files: {
          brief: `${productionPath}/brief.json`,
          scriptPack: `${productionPath}/script-pack.json`,
          assetPack: `${productionPath}/asset-pack.json`,
          projectJson: `${productionPath}/project.json`,
        },
      });
      return;
    }
    const audioUploadMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/audio$/);
    if (audioUploadMatch && req.method === 'POST') {
      const projectId = normalizeProjectId(decodeURIComponent(audioUploadMatch[1]));
      const project = (await discoverProjects()).find((candidate) => candidate.id === projectId);
      if (!project) {
        sendJson(res, 404, {ok: false, code: 'project_not_found', error: `Project ${projectId} not found`});
        return;
      }
      if (!project.productionPath.startsWith(`projects/${projectId}`)) {
        throw new StudioHttpError(403, 'readonly_project_audio', '样例项目不可上传音频');
      }
      const requestContentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (requestContentType !== 'application/octet-stream' && !requestContentType.startsWith('audio/')) {
        throw new StudioHttpError(415, 'audio_content_type_unsupported', 'Content-Type 必须是 audio/* 或 application/octet-stream');
      }
      const {displayName, ext} = safeAudioUploadName(url.searchParams.get('filename'));
      const bytes = await readBinary(req, MAX_AUDIO_UPLOAD_BYTES);
      if (bytes.length === 0) {
        throw new StudioHttpError(400, 'audio_empty', '上传音频不能为空');
      }
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const rel = `projects/${projectId}/audio/upload-${uploadId}${ext}`;
      const file = path.join(PUBLIC_ROOT, rel);
      await fs.mkdir(path.dirname(file), {recursive: true});
      await fs.writeFile(file, bytes);
      sendJson(res, 201, {
        ok: true,
        audio: {
          src: rel,
          path: `public/${rel}`,
          fileName: displayName,
          size: bytes.length,
          contentType: audioContentTypes.get(ext) || requestContentType || 'application/octet-stream',
        },
      });
      return;
    }
    if (url.pathname === '/api/files' && req.method === 'GET') {
      const rel = assertContractFilePath(url.searchParams.get('path'));
      sendJson(res, 200, {ok: true, file: await readStudioFile(rel)});
      return;
    }
    if (url.pathname === '/api/files' && req.method === 'POST') {
      const body = await readJson(req);
      const rel = assertContractFilePath(body.path, {writable: true});
      sendJson(res, 200, {ok: true, file: await writeStudioFile(rel, body.data)});
      return;
    }
    if (url.pathname === '/api/jobs' && req.method === 'GET') {
      const projectId = url.searchParams.get('projectId');
      if (projectId) normalizeProjectId(projectId);
      const requestedLimit = Number(url.searchParams.get('limit') || 50);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
      const matching = [...jobs.values()]
        .filter((job) => !projectId || job.project?.id === projectId)
        .sort((left, right) => String(right.startedAt).localeCompare(String(left.startedAt)))
        .slice(0, limit)
        .map(publicJob);
      sendJson(res, 200, {ok: true, jobs: matching});
      return;
    }
    if (url.pathname === '/api/video-library' && req.method === 'GET') {
      const records = await withLibraryLock(() => loadVideoLibraryRecords(VIDEO_LIBRARY_FILE));
      const available = records.filter((record) => {
        try {
          return existsSync(resolveArtifactFile(PROJECT_ROOT, record.videoPath).file);
        } catch {
          return false;
        }
      });
      sendJson(res, 200, {ok: true, records: available.map(publicVideoRecord)});
      return;
    }
    if (url.pathname === '/api/component-library' && req.method === 'GET') {
      sendJson(res, 200, await loadComponentLibrary());
      return;
    }
    if (url.pathname === '/api/component-library/asset' && (req.method === 'GET' || req.method === 'HEAD')) {
      await serveArtifact(req, res, url);
      return;
    }
    const videoDownloadMatch = url.pathname.match(/^\/api\/video-library\/([^/]+)\/download$/);
    if (videoDownloadMatch && req.method === 'GET') {
      const recordId = decodeURIComponent(videoDownloadMatch[1]);
      const records = await withLibraryLock(() => loadVideoLibraryRecords(VIDEO_LIBRARY_FILE));
      const record = records.find((item) => item.id === recordId);
      if (!record) { sendJson(res, 404, {ok: false, code: 'video_not_found', error: '视频记录不存在'}); return; }
      if (!record.downloadAllowed || record.status !== 'downloadable') { sendJson(res, 403, {ok: false, code: 'download_not_ready', error: record.failureMessage || '视频尚未通过文件检查'}); return; }
      const project = (await discoverProjects()).find((item) => item.id === record.projectId);
      if (!project) { sendJson(res, 404, {ok: false, code: 'project_not_found', error: '项目不存在'}); return; }
      const state = await computeProjectState(PROJECT_ROOT, project, await loadProjectStateRecord(RUNTIME_ROOT, record.projectId));
      if (!state.deliveryReady) { sendJson(res, 403, {ok: false, code: 'delivery_not_ready', error: '当前项目尚未满足交付条件'}); return; }
      await serveFile(req, res, resolveArtifactFile(PROJECT_ROOT, record.videoPath).file);
      return;
    }
    if (url.pathname === '/api/jobs' && req.method === 'POST') {
      const job = await createJob(await readJson(req));
      sendJson(res, 202, {ok: true, job: publicJob(job)});
      return;
    }
    const retryMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/retry$/);
    if (retryMatch && req.method === 'POST') {
      const original = jobs.get(retryMatch[1]);
      if (!original) {
        sendJson(res, 404, {ok: false, code: 'job_not_found', error: 'job not found'});
        return;
      }
      if (!isTerminalJob(original)) {
        throw new StudioHttpError(409, 'job_not_terminal', `Job ${original.id} is still running`);
      }
      const retried = await createJob({
        commandId: original.commandId,
        label: `${original.label} (retry)`,
        project: original.project,
        files: original.inputFiles,
      }, {retryOf: original.id});
      sendJson(res, 202, {ok: true, job: publicJob(retried)});
      return;
    }
    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (jobMatch && req.method === 'GET') {
      const job = jobs.get(jobMatch[1]);
      sendJson(res, job ? 200 : 404, job ? {ok: true, job: publicJob(job)} : {ok: false, error: 'job not found'});
      return;
    }
    if (url.pathname === '/api/artifact') {
      await serveArtifact(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    const status = error instanceof StudioHttpError ? error.status : 500;
    if (!(error instanceof StudioHttpError)) console.error('[studio] request failed:', error);
    sendJson(res, status, {
      ok: false,
      code: error instanceof StudioHttpError ? error.code : 'internal_error',
      error: error instanceof StudioHttpError ? error.message : 'Internal server error',
      diagnostics: error instanceof StudioHttpError ? error.diagnostics : [],
    });
  }
});

await fs.mkdir(path.join(PROJECT_ROOT, 'out'), {recursive: true});
server.listen(PORT, HOST, () => {
  console.log(`Video Factory Studio: http://${HOST}:${PORT}/`);
});
