import type {JobStatus, PreviewRatio, ProjectState, RenderJobResult, Shot, VoiceJobResult, VoiceQueueItem, WorkflowStepId} from '../workflow/types';

export type SkillDrivenStepId = 1 | 2 | 3 | 4 | 5;
export type Step3AntiAiLevel = 'natural' | 'strong' | 'max';
export type SkillCategory = 'step' | 'meta';
export type SkillCatalogStepId = WorkflowStepId | null;

export interface StepSkillConfig {
  presetId?: string;
  presetLabel?: string;
  goal?: string;
  style?: string;
  emphasis?: string;
  avoid?: string;
  notes?: string;
  targetDurationSeconds?: number | null;
  targetWordCount?: number | null;
  antiAiLevel?: Step3AntiAiLevel | string;
  spokenPersona?: string;
}

export type PipelineStepSkills = Partial<Record<SkillDrivenStepId, StepSkillConfig>>;

export interface SkillCatalogEntry {
  skillId: string;
  category?: SkillCategory;
  stepId?: SkillCatalogStepId;
  stepLabel?: string;
  name?: string;
  description?: string;
  displaySummary?: string;
  status?: string;
  statusMessage?: string;
  sourcePath?: string;
}

export interface SkillSpec extends SkillCatalogEntry {
  version?: string;
  inputs?: string[];
  outputs?: string[];
  defaults?: Record<string, any> | null;
  constraints?: string[];
  qualityRules?: string[];
  uiHints?: string[];
  evalRules?: string[];
}

export interface StepEvaluation {
  stepId: WorkflowStepId;
  skillId?: string;
  score?: number;
  status?: string;
  issues?: string[];
  suggestions?: string[];
  dimensions?: Record<string, number>;
  forbiddenWords?: Record<string, string[]>;
  evaluatedAt?: string;
}

export interface ProjectBuildState {
  projectPath?: string;
  compositionId?: string;
  stylePreset?: string;
  buildStatus?: 'ready' | 'missing' | 'error' | 'draft' | string;
  files?: string[];
  summary?: string;
  notes?: string;
  renderCommand?: string;
  eval?: StepEvaluation | null;
  [key: string]: any;
}

export interface PipelineResearchFact {
  id?: string;
  label?: string;
  fact?: string;
  evidenceAnchor?: string;
  sourceTitle?: string;
}

export interface PipelineAnalysisBrief {
  mainQuestion?: string;
  audienceFocus?: string;
  narrativeApproach?: string;
  whyNow?: string;
}

export interface PipelineAnalysisLayer {
  id?: string;
  label?: string;
  insight?: string;
  evidence?: string;
}

export interface PipelineAnalysisProcessItem {
  id?: string;
  label?: string;
  detail?: string;
}

export interface PipelineAnalysisState {
  thesis?: string;
  audience?: string;
  corePromise?: string;
  analysisBrief?: PipelineAnalysisBrief | null;
  researchFacts?: PipelineResearchFact[];
  layers?: PipelineAnalysisLayer[];
  process?: PipelineAnalysisProcessItem[];
  [key: string]: any;
}

export interface PipelineTitleStrategy {
  id?: string;
  angle?: string;
  audienceTrigger?: string;
  evidenceAnchor?: string;
  hookStyle?: string;
  rationale?: string;
}

export interface PipelineTitleOption {
  id?: string | null;
  title?: string;
  angle?: string;
  score?: number;
  rationale?: string;
  evidenceAnchor?: string;
  hookStyle?: string;
  [key: string]: any;
}

export interface PipelineTitlesState {
  strategies?: PipelineTitleStrategy[];
  directionSummary?: string;
  options?: PipelineTitleOption[];
  selectedId?: string | null;
  selectedReason?: string;
  [key: string]: any;
}

export interface PipelineCopyBrief {
  hookAngle?: string;
  tone?: string;
  pacing?: string;
  ctaIntent?: string;
}

export interface PipelineCopyRequirements {
  focus?: string;
  avoid?: string;
  style?: string;
  length?: string;
}

export interface PipelineCopyOutlineItem {
  id?: string;
  label?: string;
  beat?: string;
  goal?: string;
  evidenceAnchor?: string;
}

export interface PipelineCopyBlock {
  id?: string;
  text?: string;
  label?: string;
  [key: string]: any;
}

export interface PipelineCopyState {
  requirements?: PipelineCopyRequirements | null;
  brief?: PipelineCopyBrief | null;
  outline?: PipelineCopyOutlineItem[];
  hook?: string;
  body?: PipelineCopyBlock[];
  cta?: string;
  [key: string]: any;
}

export interface PipelinePromptEntry {
  prompt?: string;
  promptZh?: string;
  shotTitle?: string;
  visualSummaryZh?: string;
  visualFocusZh?: string;
  text?: string;
  negativePrompt?: string;
  negativePromptZh?: string;
  style?: string;
  mood?: string;
  visualFocus?: string;
  dataPoints?: string[];
  dataHighlightsZh?: string[];
  comparisonSummaryZh?: string;
  comparisons?: Array<{left?: string; right?: string}>;
  keywords?: string[];
  visual?: {
    description?: string;
    focus?: string;
    [key: string]: any;
  };
  imageUrl?: string;
  status?: 'pending' | 'generating' | 'done' | 'error';
  duration?: number;
  durationSeconds?: number;
  [key: string]: any;
}

export interface PipelinePromptsState {
  byShotId?: Record<string, PipelinePromptEntry>;
  [key: string]: any;
}

export interface PipelineVoiceScriptEntry {
  shotId?: string;
  text?: string;
  duration?: number;
  [key: string]: any;
}

export interface PipelineVoiceState {
  engine?: string;
  preset?: string;
  byShotId?: Record<string, PipelinePromptEntry>;
  script?: PipelineVoiceScriptEntry[];
  [key: string]: any;
}

export interface PipelineImagesState {
  urls?: Array<{shotId: string; url: string}>;
  jobId?: string | null;
  status?: JobStatus | string;
  progress?: number;
  progressMsg?: string | null;
  total?: number;
  completed?: number;
  currentShotId?: string | null;
  currentShotTitle?: string | null;
  byShotStatus?: Record<string, 'pending' | 'generating' | 'done' | 'error' | string>;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  [key: string]: any;
}

export interface PipelineTopicResearch {
  results?: any[];
  [key: string]: any;
}

export interface PipelinePayload {
  inputTopic?: string;
  inputTitleKeywords?: string;
  projectName?: string;
  stepSkills?: PipelineStepSkills | null;
  skillCatalog?: SkillCatalogEntry[] | null;
  skillSpecsById?: Record<string, SkillSpec> | null;
  stepResolvedSkills?: Partial<Record<WorkflowStepId, SkillSpec>> | null;
  stepEvaluations?: Partial<Record<WorkflowStepId, StepEvaluation>> | null;
  topicResearch?: PipelineTopicResearch | null;
  analysis?: PipelineAnalysisState | null;
  titles?: PipelineTitlesState | null;
  copy?: PipelineCopyState | null;
  prompts?: PipelinePromptsState | null;
  voice?: PipelineVoiceState | null;
  projectBuild?: ProjectBuildState | null;
  render?: Record<string, any> | null;
  images?: PipelineImagesState | null;
  selectedAnalysis?: PipelineAnalysisState | null;
  selectedTitleId?: string | null;
  shots?: Shot[];
  [key: string]: any;
}

export interface VoiceAssetPreview extends VoiceQueueItem {
  title: string;
  url: string;
}

export interface PipelineSessionSnapshot {
  apiBase: string;
  apiKey: string;
  titleKeywords: string;
  projectState: ProjectState;
  shotsState: Shot[];
  pipelineState: PipelinePayload;
  activeStep: WorkflowStepId;
  stepDone: Record<number, boolean>;
  stepConfirmed: Record<number, boolean>;
  selectedAnalysis: any;
  selectedTitleId: string | null;
  previewRatio: PreviewRatio;
  voiceJobId: string | null;
  voiceJobResult: VoiceJobResult | null;
  renderJobId: string | null;
  renderJobResult: RenderJobResult | null;
  voiceJobStatus: JobStatus;
  renderJobStatus: JobStatus;
  voiceProgress: number;
  renderProgress: number;
  imageStatus: JobStatus;
  imageCount: number;
  stepSkillDirty: Record<number, boolean>;
}

export interface PersistedPipelineSnapshot extends PipelineSessionSnapshot {
  savedAt: number;
}
