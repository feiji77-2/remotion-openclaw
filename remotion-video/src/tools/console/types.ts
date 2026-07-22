import type {VideoProject} from '../../project/projectSchema';

export type RunnerStatus = 'checking' | 'online' | 'offline';
export type JobStatus = 'running' | 'done' | 'failed';
export type StageStatus = 'missing' | 'stale' | 'current';
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

export interface JobDiagnostic {
  level: 'error' | 'warning' | 'info';
  code: string;
  phase: string;
  path: string | null;
  message: string;
}

export interface JobStep {
  id: string;
  label: string;
  status: 'pending' | JobStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  error: string | null;
}

export interface RunnerJob {
  id: string;
  commandId: string;
  workflowId?: string | null;
  label: string;
  project: ProjectOption;
  command: string;
  status: JobStatus;
  currentStep?: string | null;
  steps: JobStep[];
  logs: string[];
  diagnostics: JobDiagnostic[];
  exitCode: number | null;
  error: string | null;
  startedAt?: string;
  finishedAt?: string | null;
  updatedAt?: string | null;
  artifact?: {
    kind: 'image' | 'video' | 'json';
    path: string;
    url?: string;
  } | null;
}

export interface ProjectStage {
  status: StageStatus;
  path?: string;
  checkedAt?: string | null;
  finishedAt?: string | null;
  result?: Record<string, unknown> | null;
}

export interface ProjectState {
  projectId: string;
  stages: {
    project: ProjectStage;
    preview: ProjectStage;
    sceneStills?: ProjectStage;
    render: ProjectStage;
    verify: ProjectStage;
  };
  deliveryReady: boolean;
  updatedAt: string | null;
  activeJob: RunnerJob | null;
}

export type VideoLibraryStatus = 'generated' | 'downloadable' | 'verification-failed';

export interface VideoLibraryRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  videoPath: string;
  createdAt: string;
  status: VideoLibraryStatus;
  playbackUrl: string;
  downloadUrl?: string | null;
  downloadAllowed: boolean;
  failureMessage: string | null;
  sourceJobId: string;
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

export interface CopyDraft {
  text: string;
  savedAt: string | null;
}

export interface SceneTimeline {
  scene: VideoProject['scenes'][0];
  start: number;
  end: number;
}

export interface SceneStill {
  index: number;
  sceneId: string;
  title: string;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
  frame: number;
  path: string;
  url: string;
}

export interface SceneStillsManifest {
  projectId: string;
  generatedAt: string;
  count: number;
  fps: number;
  width: number;
  height: number;
  scenes: SceneStill[];
}

export interface NewProjectInput {
  title: string;
  spokenScript: string;
}

export interface CreateProjectDraft {
  projectId: string;
  title: string;
  orientation: 'portrait';
  style: 'cyan-tech' | 'amber-editorial' | 'red-minimal' | 'purple-launch';
  spokenScript: string;
  keywords: string;
}

export interface CreateProjectResult {
  ok: true;
  project: ProjectOption;
  files: {
    brief: string;
    scriptPack: string;
    assetPack: string;
    projectJson: string;
  };
}

export interface CreateProjectError {
  ok: false;
  error: string;
  path?: string;
}
