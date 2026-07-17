// src/tools/console/types.ts
import type {VideoProject} from '../../project/projectSchema';

export type RunnerStatus = 'checking' | 'online' | 'offline';
export type JobStatus = 'running' | 'done' | 'failed';
export type ContractKey = 'brief.json' | 'script-pack.json' | 'asset-pack.json' | 'project.json';
export type Tone = 'info' | 'success' | 'warning' | 'danger';

export interface ProjectOption {
  id: string;
  title: string;
  productionPath: string;
  projectJsonPath: string;
  outputVideoPath: string;
}

export interface StudioFile {
  path: string;
  exists: boolean;
  data: unknown | null;
  error?: string;
}

export interface RunnerJob {
  id: string;
  commandId: string;
  label: string;
  command: string;
  status: JobStatus;
  logs: string[];
  exitCode: number | null;
  error: string | null;
  artifact?: {
    kind: 'image' | 'video' | 'json';
    path: string;
    url?: string;
  } | null;
}

export interface ActivityEvent {
  id: string;
  time: string;
  tone: Tone;
  text: string;
}

export interface DraftScript {
  topic: string;
  hook: string;
  viewpoint: string;
  pain: string;
  solution: string;
  selectedTitle: string;
  titles: string[];
  script: string;
  keywords: string;
}

export interface SceneTimeline {
  scene: VideoProject['scenes'][0];
  start: number;
  end: number;
}
