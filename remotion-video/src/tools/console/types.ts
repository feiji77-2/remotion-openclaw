import type {VideoProject} from '../../project/projectSchema';
import type {ComponentLibraryItem} from './component-library-model';

export type RunnerStatus = 'checking' | 'online' | 'offline';
export type JobStatus = 'running' | 'done' | 'failed';
export type StageStatus = 'missing' | 'stale' | 'current';
export type CommandId =
  | 'build-project'
  | 'project-check'
  | 'project-still'
  | 'project-scene-stills'
  | 'project-render'
  | 'project-verify'
  | 'build-check'
  | 'build-check-audio'
  | 'render-verify';
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
  kind: 'process' | 'save-inputs' | 'internal';
  command: string[] | null;
  status: 'pending' | JobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  error: string | null;
}

export interface RunnerJob {
  id: string;
  commandId: CommandId;
  workflowId: string | null;
  label: string;
  project: ProjectOption;
  projectId: string | null;
  command: string;
  status: JobStatus;
  currentStep: string | null;
  steps: JobStep[];
  logs: string[];
  diagnostics: JobDiagnostic[];
  exitCode: number | null;
  error: string | null;
  retryOf: string | null;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string | null;
  artifact: {
    kind: 'image' | 'video' | 'json';
    path: string;
    url?: string | null;
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
  fingerprints: {
    contentHash: string;
    assetHash: string;
    projectHash: string | null;
    rendererHash: string;
  };
  stages: {
    project: ProjectStage;
    preview: ProjectStage;
    sceneStills: ProjectStage;
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
  downloadUrl: string | null;
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

export interface ProjectContractPaths {
  brief: string;
  scriptPack: string;
  assetPack: string;
  projectJson: string;
}

export interface CreateProjectResult {
  ok: true;
  project: ProjectOption;
  files: ProjectContractPaths;
}

export interface UploadedAudioAsset {
  src: string;
  path: string;
  fileName: string;
  size: number;
  contentType: string;
}

export interface ComponentLibraryResponse {
  ok: true;
  available: boolean;
  sourceRoot: string;
  version: number | string | null;
  warning?: string;
  components: ComponentLibraryItem[];
}

export interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
  path?: string;
  diagnostics?: JobDiagnostic[];
}

export interface CreateProjectError extends ErrorResponse {}
