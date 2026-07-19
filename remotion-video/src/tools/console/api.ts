// src/tools/console/api.ts
import type {ProjectOption, StudioFile, RunnerJob, RunnerStatus} from './types';
import type {CreateProjectDraft, CreateProjectResult, CreateProjectError} from './types';
import {VideoProjectSchema, formatProjectPath} from '../../project/projectSchema';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';

/**
 * 加载已保存 Project JSON 的结果。
 *
 * 不再静默把校验失败的项目替换成默认空项目——那会让用户误以为草稿"凭空消失"且无法定位错误。
 * 失败时 `ok=false`，`project` 仍回退为默认项目以保证 UI 可用，但 `diagnostics`
 * 携带可读的 schema 校验错误（路径 + 消息），调用方必须据此向用户解释，而非默默继续。
 */
export interface NormalizedProjectResult {
  ok: boolean;
  project: VideoProject;
  diagnostics: ProjectLoadDiagnostic[];
}

export interface ProjectLoadDiagnostic {
  level: 'error';
  code: 'schema_invalid';
  /** 可读的属性路径，例如 project.scenes.3.id */
  path: string;
  message: string;
}

export function normalizeLoadedProject(data: unknown): NormalizedProjectResult {
  const parsed = VideoProjectSchema.safeParse(data);
  if (parsed.success) {
    return {ok: true, project: parsed.data, diagnostics: []};
  }

  const diagnostics: ProjectLoadDiagnostic[] = parsed.error.issues.map((issue) => ({
    level: 'error',
    code: 'schema_invalid',
    path: formatProjectPath(issue.path) || '<root>',
    message: issue.message,
  }));

  return {ok: false, project: cloneProject(DEFAULT_VIDEO_PROJECT), diagnostics};
}

export function cloneProject(project: VideoProject): VideoProject {
  return JSON.parse(JSON.stringify(project)) as VideoProject;
}

const runnerBase = () => {
  // tools:studio mode: server injects __VIDEO_FACTORY_PORT__ into HTML
  // The current origin IS the runner (server serves both HTML and API)
  const injectedPort = window.__VIDEO_FACTORY_PORT__;
  if (typeof injectedPort === 'number') {
    // Same origin if current port matches injected port (tools:studio mode)
    if (window.location.port === String(injectedPort)) return window.location.origin;
    // Vite dev mode: frontend on different port, call the runner directly
    return `http://127.0.0.1:${injectedPort}`;
  }
  // Fallback: assume tools:studio on default port
  return `http://127.0.0.1:8787`;
};

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${runnerBase()}${path}`);
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try { const body = await response.json(); if (body?.error) detail = body.error; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<RunnerStatus> {
  try {
    await fetchJson('/api/health');
    return 'online';
  } catch {
    return 'offline';
  }
}

export async function loadProjects(): Promise<ProjectOption[]> {
  try {
    const payload = await fetchJson<{projects: ProjectOption[]}>('/api/projects');
    return payload.projects;
  } catch {
    return [];
  }
}

export async function loadStudioFile(path: string): Promise<StudioFile> {
  try {
    const payload = await fetchJson<{file: StudioFile}>(`/api/files?path=${encodeURIComponent(path)}`);
    return payload.file;
  } catch {
    return {path, exists: false, data: null, error: 'failed to load'};
  }
}

export async function saveFile(path: string, data: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${runnerBase()}/api/files`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({path, data}),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function startJob(
  commandId: string,
  label: string,
  project: ProjectOption,
): Promise<{job: RunnerJob} | null> {
  const response = await fetch(`${runnerBase()}/api/jobs`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({commandId, label, project}),
  });
  if (!response.ok) return null;
  return response.json() as Promise<{job: RunnerJob}>;
}

export async function pollJob(jobId: string): Promise<RunnerJob> {
  const payload = await fetchJson<{job: RunnerJob}>(`/api/jobs/${jobId}`);
  return payload.job;
}

export function filePathFor(project: ProjectOption, key: 'brief.json' | 'script-pack.json' | 'asset-pack.json' | 'project.json'): string {
  return key === 'project.json' ? project.projectJsonPath : `${project.productionPath}/${key}`;
}

export const runnerBaseUrl = runnerBase;

// ── P1: 本地内容生产台 API ──

export async function createProject(draft: CreateProjectDraft): Promise<CreateProjectResult> {
  const response = await fetch(`${runnerBase()}/api/projects`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(draft),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const err: CreateProjectError = {ok: false, error: payload?.error ?? `HTTP ${response.status}`, path: payload?.path};
    throw err;
  }
  return payload as CreateProjectResult;
}
