export type WorkflowStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type JobStatus = 'pending' | 'running' | 'done' | 'error' | 'idle';
export type PreviewRatio = 'landscape' | 'portrait';
export type VoiceEngine = 'qwen-tts';

export interface Shot {
  id: string;
  title: string;
  narration: string;
  durationSeconds: number;
  level?: string;
  type?: string;
  family?: string;
  sceneFamily?: string;
  templateCandidates?: string[];
  dataPoints?: string[];
  keywords?: string[];
  comparisons?: Array<{left?: string; right?: string; [key: string]: any}>;
  visual?: {
    description?: string;
    focus?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ProjectState {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
}

export interface StepMeta {
  id: WorkflowStepId;
  label: string;
  hint: string;
}

export interface AudioSegment {
  src: string;
  startFrame: number;
  durationInFrames: number;
}

export interface VoiceQueueItem {
  id: string;
  shotId: string;
  status: string;
  durationSeconds: number;
  voiceFile: string;
}

export interface VoiceJobResult {
  jobId: string;
  status: JobStatus | string;
  engine?: string;
  engineName?: string;
  voice?: string;
  manifestFile?: string;
  requestSpeed?: number;
  totalClips?: number;
  totalDurationSeconds?: number;
  queue?: VoiceQueueItem[];
}

export interface RenderMeta {
  frameRange?: [number, number] | null;
  durationInFrames?: number | null;
  usedDesignJson?: boolean;
  audioSegmentCount?: number;
  subtitleCueCount?: number;
}

export interface RenderJobResult {
  jobId?: string;
  id?: string;
  status?: JobStatus | string;
  progress?: number;
  progressMsg?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  outputFile?: string | null;
  outputUrl?: string | null;
  downloadUrl?: string | null;
  outputFileName?: string | null;
  outputBytes?: number | null;
  outputSizeLabel?: string | null;
  voiceFile?: string | null;
  voiceUrl?: string | null;
  subtitleFile?: string | null;
  subtitleUrl?: string | null;
  mediaReady?: boolean;
  renderMeta?: RenderMeta | null;
}
