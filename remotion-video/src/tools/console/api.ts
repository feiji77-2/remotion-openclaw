import type {
  CreateProjectDraft, CreateProjectError, CreateProjectResult, JobDiagnostic,
  ProjectOption, ProjectState, RunnerJob, RunnerStatus, SceneStillsManifest, StudioFile,
  VideoLibraryRecord,
} from './types';
import type {ComponentLibraryItem} from './component-library-model';
import {VideoProjectSchema, formatProjectPath} from '../../project/projectSchema';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';

declare global {
  interface Window { __VIDEO_FACTORY_PORT__?: number; }
}

export class StudioApiError extends Error {
  public readonly code: string | null;
  public readonly diagnostics: JobDiagnostic[];

  public constructor(message: string, code: string | null = null, diagnostics: JobDiagnostic[] = []) {
    super(message);
    this.name = 'StudioApiError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export interface ProjectLoadDiagnostic {
  level: 'error';
  code: 'schema_invalid';
  path: string;
  message: string;
}

export interface NormalizedProjectResult {
  ok: boolean;
  project: VideoProject;
  diagnostics: ProjectLoadDiagnostic[];
}

export function normalizeLoadedProject(data: unknown): NormalizedProjectResult {
  const parsed = VideoProjectSchema.safeParse(data);
  if (parsed.success) return {ok: true, project: parsed.data, diagnostics: []};
  return {
    ok: false,
    project: cloneProject(DEFAULT_VIDEO_PROJECT),
    diagnostics: parsed.error.issues.map((issue) => ({
      level: 'error' as const,
      code: 'schema_invalid' as const,
      path: formatProjectPath(issue.path) || '<root>',
      message: issue.message,
    })),
  };
}

export function cloneProject(project: VideoProject): VideoProject {
  return JSON.parse(JSON.stringify(project)) as VideoProject;
}

const runnerBase = () => {
  const port = window.__VIDEO_FACTORY_PORT__;
  if (typeof port === 'number') return window.location.port === String(port)
    ? window.location.origin
    : `http://127.0.0.1:${port}`;
  return 'http://127.0.0.1:8787';
};

const responseError = async (response: Response) => {
  try {
    const body = await response.json();
    throw new StudioApiError(body?.error || `HTTP ${response.status}`, body?.code || null, body?.diagnostics || []);
  } catch (error) {
    if (error instanceof StudioApiError) throw error;
    throw new StudioApiError(`HTTP ${response.status}`);
  }
};

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${runnerBase()}${path}`);
  if (!response.ok) await responseError(response);
  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${runnerBase()}${path}`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data),
  });
  if (!response.ok) await responseError(response);
  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<RunnerStatus> {
  try { await fetchJson('/api/health'); return 'online'; } catch { return 'offline'; }
}

export async function loadProjects(): Promise<ProjectOption[]> {
  try { return (await fetchJson<{projects: ProjectOption[]}>('/api/projects')).projects; } catch { return []; }
}

export async function loadStudioFile(path: string): Promise<StudioFile> {
  try { return (await fetchJson<{file: StudioFile}>(`/api/files?path=${encodeURIComponent(path)}`)).file; }
  catch { return {path, exists: false, data: null, error: 'failed to load'}; }
}

export async function loadProjectState(projectId: string): Promise<ProjectState> {
  return (await fetchJson<{state: ProjectState}>(`/api/projects/${encodeURIComponent(projectId)}/state`)).state;
}

export async function loadJobs(projectId: string): Promise<RunnerJob[]> {
  return (await fetchJson<{jobs: RunnerJob[]}>(`/api/jobs?projectId=${encodeURIComponent(projectId)}&limit=12`)).jobs;
}

export async function loadVideoLibrary(): Promise<VideoLibraryRecord[]> {
  const records = (await fetchJson<{records: VideoLibraryRecord[]}>('/api/video-library')).records;
  return records.map((record) => ({
    ...record,
    playbackUrl: new URL(record.playbackUrl, runnerBase()).toString(),
    downloadUrl: record.downloadUrl ? new URL(record.downloadUrl, runnerBase()).toString() : null,
  }));
}

export interface RemoteComponentLibraryResult {
  available: boolean;
  sourceRoot: string;
  version: number | string | null;
  warning?: string;
  components: ComponentLibraryItem[];
}

export async function loadRemoteComponentLibrary(): Promise<RemoteComponentLibraryResult> {
  const payload = await fetchJson<RemoteComponentLibraryResult & {ok: boolean}>('/api/component-library');
  return {
    available: payload.available,
    sourceRoot: payload.sourceRoot,
    version: payload.version,
    warning: payload.warning,
    components: payload.components.map((component) => ({
      ...component,
      previewUrl: component.previewUrl ? new URL(component.previewUrl, runnerBase()).toString() : null,
    })),
  };
}

export async function loadSceneStillsManifest(path: string | undefined): Promise<SceneStillsManifest | null> {
  if (!path) return null;
  try {
    const manifest = await fetchJson<SceneStillsManifest>(`/api/artifact?path=${encodeURIComponent(path)}`);
    return {
      ...manifest,
      scenes: Array.isArray(manifest.scenes)
        ? manifest.scenes.map((scene) => ({...scene, url: artifactUrl(scene.path)}))
        : [],
    };
  } catch {
    return null;
  }
}

export async function saveFile(path: string, data: unknown): Promise<StudioFile> {
  return (await postJson<{file: StudioFile}>('/api/files', {path, data})).file;
}

export async function startJob(
  commandId: string,
  label: string,
  project: ProjectOption,
  files?: Array<{path: string; data: unknown}>,
): Promise<{job: RunnerJob}> {
  return postJson('/api/jobs', {commandId, label, project, ...(files ? {files} : {})});
}

export async function retryJob(jobId: string): Promise<{job: RunnerJob}> {
  return postJson(`/api/jobs/${encodeURIComponent(jobId)}/retry`, {});
}

export async function pollJob(jobId: string): Promise<RunnerJob> {
  return (await fetchJson<{job: RunnerJob}>(`/api/jobs/${encodeURIComponent(jobId)}`)).job;
}

export function filePathFor(project: ProjectOption, key: 'brief.json' | 'script-pack.json' | 'asset-pack.json' | 'project.json'): string {
  return key === 'project.json' ? project.projectJsonPath : `${project.productionPath}/${key}`;
}

export const artifactUrl = (path: string, version?: string | null) => {
  const url = new URL('/api/artifact', runnerBase());
  url.searchParams.set('path', path);
  if (version) url.searchParams.set('v', version);
  return url.toString();
};
export const runnerBaseUrl = runnerBase;

export async function createProject(draft: CreateProjectDraft): Promise<CreateProjectResult> {
  try { return await postJson<CreateProjectResult>('/api/projects', draft); }
  catch (error) {
    const apiError = error as StudioApiError;
    const result: CreateProjectError = {ok: false, error: apiError.message};
    throw result;
  }
}
