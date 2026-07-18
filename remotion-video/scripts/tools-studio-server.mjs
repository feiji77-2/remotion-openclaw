#!/usr/bin/env node

import {spawn} from 'node:child_process';
import {createReadStream, existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');
const STATIC_ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, 'build', 'tools'),
  path.join(REPO_ROOT, 'build', 'tools'),
];
const staticRoot = () => STATIC_ROOT_CANDIDATES.find((candidate) => existsSync(path.join(candidate, 'index.html')))
  ?? STATIC_ROOT_CANDIDATES[0];
const HOST = '127.0.0.1';
const PORT = Number(process.env.VIDEO_FACTORY_PORT || 8787);
const jobs = new Map();
const editableJsonFiles = new Set(['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json']);

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
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
};

const safeRelPath = (value, label) => {
  const text = String(value ?? '').trim();
  if (!text || path.isAbsolute(text) || text.includes('\\') || text.split('/').includes('..')) {
    throw new Error(`${label} must be a safe relative path`);
  }
  if (!/^[A-Za-z0-9._~!$&'()+,;=@%\-/]+$/.test(text) || text.includes('//')) {
    throw new Error(`${label} must be a safe relative path`);
  }
  return text;
};

const safeJsonRelPath = (value, label = 'file path') => {
  const rel = safeRelPath(value, label);
  const basename = path.basename(rel);
  if (!editableJsonFiles.has(basename)) {
    throw new Error(`${label} must target one of: ${[...editableJsonFiles].join(', ')}`);
  }
  return rel;
};

const safeProjectId = (value) => {
  const text = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,96}$/.test(text)) throw new Error('projectId is invalid');
  return text;
};

const normalizeProject = (raw) => ({
  id: safeProjectId(raw?.id),
  title: String(raw?.title || raw?.id || 'Video Project').slice(0, 120),
  productionPath: safeRelPath(raw?.productionPath, 'productionPath'),
  projectJsonPath: safeRelPath(raw?.projectJsonPath, 'projectJsonPath'),
  outputVideoPath: safeRelPath(raw?.outputVideoPath, 'outputVideoPath'),
});

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

  await addProject('examples/project.json', 'examples', '默认 Project JSON 样片', 'examples-project');

  const projectsRoot = path.join(PROJECT_ROOT, 'projects');
  if (existsSync(projectsRoot)) {
    const entries = await fs.readdir(projectsRoot, {withFileTypes: true});
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      let id;
      try { id = safeProjectId(entry.name); } catch { continue; }
      const productionPath = `projects/${entry.name}`;
      await addProject(`${productionPath}/project.json`, productionPath, entry.name, id);
    }
  }

  return options;
};

const readStudioFile = async (rel) => {
  const file = path.join(PROJECT_ROOT, rel);
  if (!file.startsWith(PROJECT_ROOT)) throw new Error('file path escaped project root');
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
  const file = path.join(PROJECT_ROOT, rel);
  if (!file.startsWith(PROJECT_ROOT)) throw new Error('file path escaped project root');
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return readStudioFile(rel);
};

const artifactFor = (commandId, project) => {
  if (commandId === 'project-still') {
    return {kind: 'image', path: `out/${project.id}-frame-30.png`};
  }
  if (commandId === 'project-render') {
    return {kind: 'video', path: project.outputVideoPath};
  }
  if (commandId === 'build-project' || commandId === 'project-check') {
    return {kind: 'json', path: project.projectJsonPath};
  }
  return null;
};

const commandFor = (commandId, project) => {
  switch (commandId) {
    case 'scaffold':
      return ['npm', 'run', 'production:scaffold', '--', project.title, '--link', 'https://example.com', '--id', project.id];
    case 'production-check':
      return ['npm', 'run', 'production:check', '--', project.productionPath];
    case 'build-project':
      return ['npm', 'run', 'production:build-project', '--', project.productionPath];
    case 'project-check':
      return ['npm', 'run', 'project:check', '--', project.projectJsonPath];
    case 'project-still':
      return ['npm', 'run', 'project:still', '--', project.projectJsonPath, '--frame', '30', '--out', `out/${project.id}-frame-30.png`];
    case 'project-render':
      return ['npm', 'run', 'project:render', '--', project.projectJsonPath, '--out', project.outputVideoPath];
    case 'project-verify':
      return [process.execPath, 'scripts/verify-project-render.mjs', '--props', project.projectJsonPath, '--video', project.outputVideoPath];
    default:
      throw new Error(`Unsupported commandId: ${commandId}`);
  }
};

const publicJob = (job) => ({
  id: job.id,
  commandId: job.commandId,
  label: job.label,
  command: job.command,
  status: job.status,
  logs: job.logs.slice(-220),
  exitCode: job.exitCode,
  error: job.error,
  artifact: job.artifact && existsSync(path.join(PROJECT_ROOT, job.artifact.path))
    ? {...job.artifact, url: `/api/artifact?path=${encodeURIComponent(job.artifact.path)}`}
    : job.artifact,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
});

const appendLog = (job, chunk) => {
  const text = chunk.toString('utf8');
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) job.logs.push(line);
  }
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
};

const createJob = (body) => {
  const project = normalizeProject(body.project);
  const commandId = String(body.commandId || '');
  const label = String(body.label || commandId);
  const cmdArray = commandFor(commandId, project);
  const command = cmdArray[0];
  const args = cmdArray.slice(1);
  const artifact = artifactFor(commandId, project);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id,
    commandId,
    label,
    command: [command, ...args].join(' '),
    status: 'running',
    logs: [],
    artifact,
    exitCode: null,
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  jobs.set(id, job);

  const child = spawn(command, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    shell: false,
  });
  appendLog(job, `$ ${job.command}`);
  child.stdout.on('data', (chunk) => appendLog(job, chunk));
  child.stderr.on('data', (chunk) => appendLog(job, chunk));
  child.on('error', (error) => {
    job.status = 'failed';
    job.error = error.message;
    job.finishedAt = new Date().toISOString();
    appendLog(job, error.message);
  });
  child.on('close', (code) => {
    job.exitCode = code;
    job.status = code === 0 ? 'done' : 'failed';
    job.finishedAt = new Date().toISOString();
    appendLog(job, code === 0 ? '[studio] task completed' : `[studio] task failed with exit code ${code}`);
  });
  return job;
};

const serveArtifact = async (req, res, url) => {
  const rel = safeRelPath(url.searchParams.get('path'), 'artifact path');
  const file = path.join(PROJECT_ROOT, rel);
  if (!file.startsWith(PROJECT_ROOT) || !existsSync(file)) {
    sendJson(res, 404, {ok: false, error: 'artifact not found'});
    return;
  }
  res.writeHead(200, {
    'content-type': contentTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    'access-control-allow-origin': '*',
  });
  createReadStream(file).pipe(res);
};

const serveStatic = async (req, res, url) => {
  const STATIC_ROOT = staticRoot();
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const requested = path.normalize(path.join(STATIC_ROOT, pathname));
  const fallback = path.join(STATIC_ROOT, 'index.html');
  const file = requested.startsWith(STATIC_ROOT) && existsSync(requested) ? requested : fallback;
  if (!existsSync(file)) {
    sendJson(res, 404, {
      ok: false,
      error: 'tools build not found',
      next: 'Run npm run tools:build before starting tools:studio.',
    });
    return;
  }
  res.writeHead(200, {'content-type': contentTypes.get(path.extname(file).toLowerCase()) || 'text/plain; charset=utf-8'});
  createReadStream(file).pipe(res);
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
      sendJson(res, 200, {ok: true, cwd: PROJECT_ROOT, jobs: jobs.size});
      return;
    }
    if (url.pathname === '/api/projects' && req.method === 'GET') {
      sendJson(res, 200, {ok: true, projects: await discoverProjects()});
      return;
    }
    if (url.pathname === '/api/files' && req.method === 'GET') {
      const rel = safeJsonRelPath(url.searchParams.get('path'));
      sendJson(res, 200, {ok: true, file: await readStudioFile(rel)});
      return;
    }
    if (url.pathname === '/api/files' && req.method === 'POST') {
      const body = await readJson(req);
      const rel = safeJsonRelPath(body.path);
      sendJson(res, 200, {ok: true, file: await writeStudioFile(rel, body.data)});
      return;
    }
    if (url.pathname === '/api/jobs' && req.method === 'POST') {
      const job = createJob(await readJson(req));
      sendJson(res, 202, {ok: true, job: publicJob(job)});
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
    sendJson(res, 400, {ok: false, error: error instanceof Error ? error.message : String(error)});
  }
});

await fs.mkdir(path.join(PROJECT_ROOT, 'out'), {recursive: true});
server.listen(PORT, HOST, () => {
  console.log(`Video Factory Studio: http://${HOST}:${PORT}/`);
});
