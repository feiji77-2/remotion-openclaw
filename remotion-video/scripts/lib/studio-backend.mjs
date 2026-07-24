import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export const MAX_PERSISTED_JOBS = 200;

const HASHABLE_SOURCE_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.json',
  '.mjs',
  '.ts',
  '.tsx',
]);
const RENDERER_EXCLUDED_DIRECTORIES = new Set(['__tests__', 'tools']);

const terminalStatuses = new Set(['done', 'failed']);
const projectIdPattern = /^[A-Za-z0-9._-]{1,96}$/;
const editableProjectContractFiles = new Set(['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json', 'copy-draft.json']);
const readableExampleContractFiles = new Set([
  'examples/brief.json',
  'examples/script-pack.json',
  'examples/asset-pack.json',
  'examples/skill-showcase.json',
]);
const publicArtifactExtensions = new Set(['.json', '.aac', '.m4a', '.mp3', '.mp4', '.ogg', '.png', '.jpg', '.jpeg', '.svg', '.wav', '.webm']);

export class StudioHttpError extends Error {
  constructor(status, code, message, diagnostics = []) {
    super(message);
    this.name = 'StudioHttpError';
    this.status = status;
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const normalizeProjectId = (value, label = 'projectId') => {
  const text = String(value ?? '').trim();
  if (!projectIdPattern.test(text)) {
    throw new StudioHttpError(
      400,
      'invalid_project_id',
      `${label} must be 1-96 characters and contain only letters, numbers, dot, underscore, or dash`,
    );
  }
  return text;
};

export const normalizeBoundedString = (value, label, minLen = 1, maxLen = 200) => {
  const text = String(value ?? '').trim();
  if (text.length < minLen) {
    throw new StudioHttpError(400, 'invalid_field', `${label} is required (min ${minLen} chars)`);
  }
  if (text.length > maxLen) {
    throw new StudioHttpError(400, 'invalid_field', `${label} is too long (max ${maxLen} chars)`);
  }
  return text;
};

export const atomicWriteJson = async (file, value) => {
  await fs.mkdir(path.dirname(file), {recursive: true});
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
};

export const isPathInside = (root, target) => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
};

export const normalizeSafeRelPath = (value, label = 'path') => {
  const text = String(value ?? '').trim();
  if (!text || path.isAbsolute(text) || text.includes('\\') || text.split('/').includes('..')) {
    throw new StudioHttpError(400, 'invalid_path', `${label} must be a safe relative path`);
  }
  if (!/^[A-Za-z0-9._~!$&'()+,;=@%\-/]+$/.test(text) || text.includes('//')) {
    throw new StudioHttpError(400, 'invalid_path', `${label} must be a safe relative path`);
  }
  return text;
};

export const resolveRuntimeRoot = (projectRoot, value = 'runtime/studio') => {
  const runtimeRoot = path.resolve(projectRoot, value || 'runtime/studio');
  const runtimeBase = path.resolve(projectRoot, 'runtime');
  if (!isPathInside(runtimeBase, runtimeRoot) || runtimeRoot === runtimeBase) {
    throw new StudioHttpError(
      400,
      'invalid_runtime_dir',
      'VIDEO_FACTORY_RUNTIME_DIR must resolve under remotion-video/runtime/',
    );
  }
  return runtimeRoot;
};

export const classifyContractFilePath = (value, label = 'file path') => {
  const rel = normalizeSafeRelPath(value, label);
  if (readableExampleContractFiles.has(rel)) {
    return {
      rel,
      scope: 'example',
      projectId: 'skill-showcase',
      fileName: path.basename(rel),
      writable: false,
    };
  }

  const match = rel.match(/^projects\/([A-Za-z0-9._-]{1,96})\/([^/]+)$/);
  if (match && projectIdPattern.test(match[1]) && editableProjectContractFiles.has(match[2])) {
    return {
      rel,
      scope: 'project',
      projectId: match[1],
      fileName: match[2],
      writable: true,
    };
  }

  throw new StudioHttpError(
    403,
    'contract_file_forbidden',
    `${label} must target examples contracts or projects/<id>/{brief.json,script-pack.json,asset-pack.json,project.json,copy-draft.json}`,
  );
};

export const assertContractFilePath = (value, options = {}) => {
  const info = classifyContractFilePath(value, options.label ?? 'file path');
  if (options.writable && !info.writable) {
    throw new StudioHttpError(403, 'readonly_contract_file', `${info.rel} is read-only`);
  }
  return info.rel;
};

const isExampleProject = (project) => project?.id === 'skill-showcase'
  && project.productionPath === 'examples'
  && project.projectJsonPath === 'examples/skill-showcase.json';

export const assertProjectPathContract = (project) => {
  const id = normalizeProjectId(project?.id, 'project.id');

  if (isExampleProject(project)) {
    const outputPath = normalizeSafeRelPath(project.outputVideoPath, 'outputVideoPath');
    if (!outputPath.startsWith('out/') || path.extname(outputPath).toLowerCase() !== '.mp4') {
      throw new StudioHttpError(400, 'invalid_project_paths', 'example outputVideoPath must be an MP4 under out/');
    }
    return project;
  }

  const expected = {
    productionPath: `projects/${id}`,
    projectJsonPath: `projects/${id}/project.json`,
    outputVideoPath: `out/${id}.mp4`,
  };
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => project?.[key] !== value)
    .map(([key, value]) => `${key}=${value}`);
  if (mismatches.length > 0) {
    throw new StudioHttpError(
      400,
      'invalid_project_paths',
      `project paths must match canonical local project paths: ${mismatches.join(', ')}`,
    );
  }
  return project;
};

export const assertArtifactPath = (value) => {
  const rel = normalizeSafeRelPath(value, 'artifact path');
  const ext = path.extname(rel).toLowerCase();
  const isOutArtifact = rel.startsWith('out/') && publicArtifactExtensions.has(ext);
  const isPublicProjectArtifact = rel.startsWith('public/projects/') && publicArtifactExtensions.has(ext);
  const isContractArtifact = (() => {
    try {
      classifyContractFilePath(rel, 'artifact path');
      return true;
    } catch {
      return false;
    }
  })();

  if (isOutArtifact || isPublicProjectArtifact || isContractArtifact) return rel;
  throw new StudioHttpError(
    403,
    'artifact_forbidden',
    'artifact path must target out/**, public/projects/**, or a project contract JSON file',
  );
};

export const resolveArtifactFile = (projectRoot, value) => {
  const rel = assertArtifactPath(value);
  const file = path.resolve(projectRoot, rel);
  if (!isPathInside(projectRoot, file)) {
    throw new StudioHttpError(403, 'artifact_forbidden', 'artifact path escaped project root');
  }
  return {rel, file};
};

const hashPathEntries = (entries) => {
  const hash = createHash('sha256');
  for (const entry of entries) {
    hash.update(entry.path);
    hash.update('\0');
    hash.update(entry.content);
    hash.update('\0');
  }
  return hash.digest('hex');
};

const readHashEntry = async (root, file) => {
  const relative = path.relative(root, file).split(path.sep).join('/');
  try {
    return {path: relative, content: await fs.readFile(file)};
  } catch (error) {
    if (error?.code === 'ENOENT') return {path: relative, content: Buffer.from('<missing>')};
    throw error;
  }
};

const walkHashableFiles = async (root, current = root, files = []) => {
  if (!existsSync(current)) return files;
  const entries = await fs.readdir(current, {withFileTypes: true});
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory() && !RENDERER_EXCLUDED_DIRECTORIES.has(entry.name)) await walkHashableFiles(root, absolute, files);
    else if (entry.isFile() && HASHABLE_SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
};

export const hashFiles = async (root, files) => {
  const unique = [...new Set(files.map((file) => path.resolve(file)))].sort();
  const entries = await Promise.all(unique.map((file) => readHashEntry(root, file)));
  return hashPathEntries(entries);
};

export const hashRendererSource = async (projectRoot) => {
  const sourceRoot = path.join(projectRoot, 'src');
  const files = await walkHashableFiles(sourceRoot);
  const packageFiles = ['package.json', 'package-lock.json']
    .map((name) => path.join(projectRoot, name))
    .filter((file) => existsSync(file));
  return hashFiles(projectRoot, [...files, ...packageFiles]);
};

const safeAssetSource = (publicRoot, source) => {
  if (typeof source !== 'string' || !source.trim() || /^https?:\/\//i.test(source) || /^data:/i.test(source)) return null;
  const normalized = source.trim().replace(/^\/+/, '');
  const absolute = path.resolve(publicRoot, normalized);
  return absolute.startsWith(`${publicRoot}${path.sep}`) ? absolute : null;
};

const declaredAssetFiles = async (assetPackFile, publicRoot) => {
  try {
    const pack = JSON.parse(await fs.readFile(assetPackFile, 'utf8'));
    if (!Array.isArray(pack?.assets)) return [];
    return pack.assets
      .map((asset) => safeAssetSource(publicRoot, asset?.src))
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const artifactSignature = async (file) => {
  try {
    const stats = await fs.stat(file);
    if (!stats.isFile()) return null;
    return {size: stats.size, mtimeMs: Math.trunc(stats.mtimeMs)};
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

export const sameSignature = (left, right) => Boolean(
  left
  && right
  && Number(left.size) === Number(right.size)
  && Number(left.mtimeMs) === Number(right.mtimeMs),
);

export const computeFingerprints = async (projectRoot, project) => {
  const productionRoot = path.join(projectRoot, project.productionPath);
  const briefFile = path.join(productionRoot, 'brief.json');
  const scriptFile = path.join(productionRoot, 'script-pack.json');
  const captionsFile = path.join(productionRoot, 'captions.json');
  const assetPackFile = path.join(productionRoot, 'asset-pack.json');
  const projectFile = path.join(projectRoot, project.projectJsonPath);
  const publicRoot = path.join(projectRoot, 'public');
  const assetFiles = await declaredAssetFiles(assetPackFile, publicRoot);

  return {
    contentHash: await hashFiles(projectRoot, [briefFile, scriptFile, captionsFile]),
    assetHash: await hashFiles(projectRoot, [assetPackFile, ...assetFiles]),
    projectHash: existsSync(projectFile) ? await hashFiles(projectRoot, [projectFile]) : null,
    rendererHash: await hashRendererSource(projectRoot),
  };
};

const coreMatches = (marker, fingerprints) => Boolean(
  marker
  && fingerprints.projectHash
  && marker.contentHash === fingerprints.contentHash
  && marker.assetHash === fingerprints.assetHash
  && marker.projectHash === fingerprints.projectHash
  && marker.rendererHash === fingerprints.rendererHash,
);

const buildCheckMatches = (marker, fingerprints) => Boolean(
  coreMatches(marker, fingerprints)
  && (
    ['build-check', 'build-check-audio'].includes(marker.commandId)
    || ['build-check', 'build-check-audio'].includes(marker.workflowId)
  ),
);

const artifactState = ({marker, fingerprints, signature}) => {
  if (!signature) return 'missing';
  if (coreMatches(marker, fingerprints) && sameSignature(marker.artifactSignature, signature)) return 'current';
  return 'stale';
};

export const computeProjectState = async (projectRoot, project, record = {}) => {
  const fingerprints = await computeFingerprints(projectRoot, project);
  const stillPath = `out/${project.id}-frame-30.png`;
  const sceneStillsPath = `out/${project.id}-scene-stills/manifest.json`;
  const videoPath = project.outputVideoPath;
  const stillSignature = await artifactSignature(path.join(projectRoot, stillPath));
  const sceneStillsSignature = await artifactSignature(path.join(projectRoot, sceneStillsPath));
  const videoSignature = await artifactSignature(path.join(projectRoot, videoPath));
  const projectExists = Boolean(fingerprints.projectHash);
  const projectStatus = !projectExists ? 'missing' : buildCheckMatches(record.buildCheck, fingerprints) ? 'current' : 'stale';
  const previewStatus = artifactState({marker: record.preview, fingerprints, signature: stillSignature});
  const sceneStillsStatus = artifactState({marker: record.sceneStills, fingerprints, signature: sceneStillsSignature});
  const renderStatus = artifactState({marker: record.render, fingerprints, signature: videoSignature});
  const verifyStatus = artifactState({marker: record.verify, fingerprints, signature: videoSignature});

  return {
    projectId: project.id,
    fingerprints,
    stages: {
      project: {status: projectStatus, checkedAt: record.buildCheck?.finishedAt ?? null},
      preview: {status: previewStatus, path: stillPath, finishedAt: record.preview?.finishedAt ?? null},
      sceneStills: {status: sceneStillsStatus, path: sceneStillsPath, finishedAt: record.sceneStills?.finishedAt ?? null},
      render: {status: renderStatus, path: videoPath, finishedAt: record.render?.finishedAt ?? null},
      verify: {status: verifyStatus, result: verifyStatus === 'current' ? record.verify?.result ?? null : null, finishedAt: record.verify?.finishedAt ?? null},
    },
    deliveryReady: projectStatus === 'current' && verifyStatus === 'current',
    updatedAt: record.updatedAt ?? null,
  };
};

export const canPromoteCheckedProject = (previousBuildCheck, checkedFingerprints) => Boolean(
  previousBuildCheck
  && previousBuildCheck.contentHash === checkedFingerprints.contentHash
  && previousBuildCheck.assetHash === checkedFingerprints.assetHash
  && previousBuildCheck.rendererHash === checkedFingerprints.rendererHash,
);

export const projectStateFile = (runtimeRoot, projectId) => path.join(runtimeRoot, 'project-states', `${projectId}.json`);

export const loadProjectStateRecord = async (runtimeRoot, projectId) => {
  try {
    return JSON.parse(await fs.readFile(projectStateFile(runtimeRoot, projectId), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
};

export const saveProjectStateRecord = async (runtimeRoot, projectId, record) => {
  const next = {...record, projectId, updatedAt: new Date().toISOString()};
  await atomicWriteJson(projectStateFile(runtimeRoot, projectId), next);
  return next;
};

export const commandStepsFor = (commandId, project, execPath = process.execPath) => {
  const specs = {
    'build-project': [
      ['build', 'Build Project', ['npm', 'run', 'project:from-pack', '--', project.productionPath]],
    ],
    'project-check': [
      ['check', 'Check Project', ['npm', 'run', 'project:check', '--', project.projectJsonPath]],
    ],
    'project-still': [
      ['still', 'Render Still', ['npm', 'run', 'project:still', '--', project.projectJsonPath, '--frame', '30', '--out', `out/${project.id}-frame-30.png`]],
    ],
    'project-scene-stills': [
      ['scene-stills', 'Render Scene Stills', ['npm', 'run', 'project:scene-stills', '--', project.projectJsonPath, '--out-dir', `out/${project.id}-scene-stills`]],
    ],
    'project-render': [
      ['render', 'Render MP4', ['npm', 'run', 'project:render', '--', project.projectJsonPath, '--out', project.outputVideoPath]],
    ],
    'project-verify': [
      ['verify', 'Verify MP4', [execPath, 'scripts/verify-project-render.mjs', '--props', project.projectJsonPath, '--video', project.outputVideoPath]],
    ],
    'build-check': [
      ['build', 'Build Project', ['npm', 'run', 'project:from-pack', '--', project.productionPath, '--ignore-captions']],
      ['tts', 'Synthesize Voiceover', ['npm', 'run', 'tts:project', '--', project.projectJsonPath, '--asset-pack', `${project.productionPath}/asset-pack.json`]],
      ['align-captions', 'Align Captions To Voiceover', ['npm', 'run', 'audio:align-captions', '--', '--project', project.projectJsonPath, '--asset-pack', `${project.productionPath}/asset-pack.json`, '--captions-out', `${project.productionPath}/captions.json`, '--asr-out', `${project.productionPath}/asr.json`]],
      ['rebuild', 'Rebuild Project With Voiceover', ['npm', 'run', 'project:from-pack', '--', project.productionPath, '--captions', 'captions.json']],
      ['check', 'Check Project', ['npm', 'run', 'project:check', '--', project.projectJsonPath]],
    ],
    'build-check-audio': [
      ['build', 'Build Project', ['npm', 'run', 'project:from-pack', '--', project.productionPath, '--ignore-captions']],
      ['align-captions', 'Align Captions To Uploaded Audio', ['npm', 'run', 'audio:align-captions', '--', '--project', project.projectJsonPath, '--asset-pack', `${project.productionPath}/asset-pack.json`, '--captions-out', `${project.productionPath}/captions.json`, '--asr-out', `${project.productionPath}/asr.json`]],
      ['rebuild', 'Rebuild Project With Voiceover', ['npm', 'run', 'project:from-pack', '--', project.productionPath, '--captions', 'captions.json']],
      ['check', 'Check Project', ['npm', 'run', 'project:check', '--', project.projectJsonPath]],
    ],
    'render-verify': [
      ['render', 'Render MP4', ['npm', 'run', 'project:render', '--', project.projectJsonPath, '--out', project.outputVideoPath]],
      ['verify', 'Verify MP4', [execPath, 'scripts/verify-project-render.mjs', '--props', project.projectJsonPath, '--video', project.outputVideoPath]],
    ],
  };
  const selected = specs[commandId];
  if (!selected) throw new StudioHttpError(400, 'unsupported_command', `Unsupported commandId: ${commandId}`);
  return selected.map(([id, label, command]) => ({
    id,
    label,
    kind: 'process',
    command,
    status: 'pending',
    exitCode: null,
    error: null,
    startedAt: null,
    finishedAt: null,
  }));
};

export const artifactForCommand = (commandId, project) => {
  if (commandId === 'project-still') return {kind: 'image', path: `out/${project.id}-frame-30.png`};
  if (commandId === 'project-scene-stills') return {kind: 'json', path: `out/${project.id}-scene-stills/manifest.json`};
  if (commandId === 'project-render' || commandId === 'project-verify' || commandId === 'render-verify') {
    return {kind: 'video', path: project.outputVideoPath};
  }
  if (commandId === 'build-project' || commandId === 'project-check' || commandId === 'build-check' || commandId === 'build-check-audio') {
    return {kind: 'json', path: project.projectJsonPath};
  }
  return null;
};

const lastUsefulLog = (logs) => [...logs]
  .reverse()
  .find((line) => line && !line.startsWith('[studio]') && !line.startsWith('$ '));

export const diagnosticForFailure = ({phase, logs = [], error = null, interrupted = false}) => {
  if (interrupted) {
    return {level: 'error', code: 'job_interrupted', phase, path: null, message: 'Runner restarted while this job was running.'};
  }
  const combined = logs.join('\n');
  const message = String(error || lastUsefulLog(logs) || `${phase} failed`).trim();
  const scriptTooShort = combined.match(/\[SCRIPT_TOO_SHORT\]\s+(\S+)\s+([^\n]+)/);
  if (scriptTooShort) {
    return {level: 'error', code: 'script_too_short', phase, path: scriptTooShort[1], message: scriptTooShort[2].trim()};
  }
  const tagged = combined.match(/\[([A-Z_]+)\]\s+([^:\n]+):\s*([^\n]+)/);
  if (tagged) {
    return {
      level: 'error',
      code: tagged[1].toLowerCase(),
      phase,
      path: tagged[2].trim(),
      message: tagged[3].trim(),
    };
  }
  const verifyFailure = combined.match(/Project render verification failed:[^\n]*/i)?.[0];
  if (verifyFailure) {
    return {level: 'error', code: 'verify_failed', phase, path: null, message: verifyFailure};
  }
  if (/No video stream found/i.test(combined)) {
    return {level: 'error', code: 'verify_no_video_stream', phase, path: null, message: 'No video stream found'};
  }
  if (/schemaVersion/i.test(combined)) {
    return {level: 'error', code: 'schema_invalid', phase, path: 'schemaVersion', message};
  }
  const missingPath = combined.match(/ENOENT[^']*'([^']+)'/i)?.[1] ?? null;
  if (missingPath) {
    return {level: 'error', code: 'file_missing', phase, path: missingPath, message};
  }
  return {level: 'error', code: error ? 'spawn_error' : 'command_failed', phase, path: null, message};
};

export const extractLastJsonObject = (logs) => {
  const text = logs.join('\n');
  const starts = [];
  for (let index = 0; index < text.length; index += 1) if (text[index] === '{') starts.push(index);
  for (const start of starts.reverse()) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
};

export const restorePersistedJobs = (value, now = new Date().toISOString()) => {
  const input = Array.isArray(value) ? value : [];
  return input.slice(-MAX_PERSISTED_JOBS).map((stored) => {
    const job = structuredClone(stored);
    if (job.status !== 'running') return job;
    job.status = 'failed';
    job.exitCode = null;
    job.error = 'Runner restarted while this job was running.';
    job.finishedAt = now;
    job.diagnostics = [...(job.diagnostics ?? []), diagnosticForFailure({phase: job.currentStep ?? 'job', interrupted: true})];
    job.steps = (job.steps ?? []).map((step) => step.status === 'running'
      ? {...step, status: 'failed', error: job.error, finishedAt: now}
      : step);
    return job;
  });
};

export const loadPersistedJobs = async (file) => {
  try {
    return restorePersistedJobs(JSON.parse(await fs.readFile(file, 'utf8')));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

export const persistJobs = async (file, jobs) => {
  const values = [...jobs.values()]
    .sort((left, right) => String(left.startedAt).localeCompare(String(right.startedAt)))
    .slice(-MAX_PERSISTED_JOBS);
  await atomicWriteJson(file, values);
};

export const loadVideoLibraryRecords = async (file) => {
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

const persistVideoLibraryRecords = async (file, records) => {
  const values = [...records]
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, MAX_PERSISTED_JOBS);
  await atomicWriteJson(file, values);
  return values;
};

export const recordRenderedVideo = async ({
  file,
  projectRoot,
  project,
  sourceJobId,
  createdAt = new Date().toISOString(),
}) => {
  const videoPath = assertArtifactPath(project.outputVideoPath);
  const signature = await artifactSignature(path.join(projectRoot, videoPath));
  if (!signature || signature.size <= 0) return null;
  const record = {
    id: String(sourceJobId),
    projectId: String(project.id),
    projectTitle: String(project.title || project.id),
    videoPath,
    createdAt,
    status: 'generated',
    playbackUrl: `/api/artifact?path=${encodeURIComponent(videoPath)}`,
    downloadAllowed: false,
    failureMessage: null,
    sourceJobId: String(sourceJobId),
  };
  const records = await loadVideoLibraryRecords(file);
  await persistVideoLibraryRecords(file, [record, ...records.filter((item) => (
    item.sourceJobId !== record.sourceJobId
    && !(item.projectId === record.projectId && item.videoPath === record.videoPath)
  ))]);
  return record;
};

export const markVideoVerification = async ({file, sourceJobId, projectId = null, videoPath = null, ok, failureMessage = null}) => {
  const records = await loadVideoLibraryRecords(file);
  const index = records.findIndex((record) => record.sourceJobId === sourceJobId);
  const fallbackIndex = index >= 0 ? index : records.findIndex((record) => (
    projectId
    && videoPath
    && record.projectId === projectId
    && record.videoPath === videoPath
  ));
  if (fallbackIndex < 0) return null;
  const current = records[fallbackIndex];
  const next = {
    ...current,
    status: ok ? 'downloadable' : 'verification-failed',
    downloadAllowed: Boolean(ok),
    failureMessage: ok ? null : String(failureMessage || '视频文件检查未通过'),
  };
  records[fallbackIndex] = next;
  await persistVideoLibraryRecords(file, records);
  return next;
};

export const assertJobCanStart = (jobs, projectId) => {
  const running = [...jobs.values()].find((job) => job.project?.id === projectId && job.status === 'running');
  if (!running) return;
  throw new StudioHttpError(409, 'project_busy', `Project ${projectId} already has a running job`, [{
    level: 'error',
    code: 'project_busy',
    phase: 'queue',
    path: null,
    message: `Wait for job ${running.id} to finish before starting another mutating job.`,
  }]);
};

export const isTerminalJob = (job) => terminalStatuses.has(job?.status);
