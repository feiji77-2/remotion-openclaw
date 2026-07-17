// src/tools/console/api.ts
import type {ProjectOption, StudioFile, RunnerJob, RunnerStatus} from './types';
import {VideoProjectSchema} from '../../project/projectSchema';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';

const runnerBase = () => (window.location.port === '8787' ? window.location.origin : 'http://127.0.0.1:8787');

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${runnerBase()}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
  const payload = await fetchJson<{file: StudioFile}>(`/api/files?path=${encodeURIComponent(path)}`);
  return payload.file;
}

export async function saveFile(path: string, data: unknown): Promise<boolean> {
  const response = await fetch(`${runnerBase()}/api/files`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({path, data}),
  });
  return response.ok;
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

export function normalizeLoadedProject(data: unknown): VideoProject {
  const parsed = VideoProjectSchema.safeParse(data);
  return parsed.success ? parsed.data : cloneProject(DEFAULT_VIDEO_PROJECT);
}

export function cloneProject(project: VideoProject): VideoProject {
  return JSON.parse(JSON.stringify(project)) as VideoProject;
}

export function filePathFor(project: ProjectOption, key: 'brief.json' | 'script-pack.json' | 'asset-pack.json' | 'project.json'): string {
  return key === 'project.json' ? project.projectJsonPath : `${project.productionPath}/${key}`;
}

export const runnerBaseUrl = runnerBase;
