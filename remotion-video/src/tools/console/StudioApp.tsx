import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';
import {STYLE_PRESETS, type StylePresetId} from '../../styles/video-gen/style-presets';
import {
  artifactUrl, checkHealth, cloneProject, createProject, filePathFor, loadJobs, loadProjectState,
  loadProjects, loadRemoteComponentLibrary, loadSceneStillsManifest, loadStudioFile, normalizeLoadedProject, pollJob, retryJob, saveFile, startJob, StudioApiError, uploadProjectAudio, videoLibraryDownloadUrl,
  type UploadedAudioAsset,
} from './api';
import {ComponentLibraryWorkspace} from './ComponentLibraryWorkspace';
import {ComponentPreviewCanvas} from './ComponentPreviewCanvas';
import {CopyWorkshop} from './CopyWorkshop';
import {DeveloperDrawer} from './DeveloperDrawer';
import {NewProjectModal} from './NewProjectModal';
import {PreviewCanvas} from './PreviewCanvas';
import {ProductionStepper, type StepId, type StepStatus} from './ProductionStepper';
import {RenderWorkspace, sceneStillsProgressPercent} from './RenderWorkspace';
import {SceneTimeline} from './SceneTimeline';
import {ScriptWorkspace} from './ScriptWorkspace';
import {StoryboardFrameCanvas} from './StoryboardFrameCanvas';
import {StoryboardWorkspace} from './StoryboardWorkspace';
import {StudioShell} from './StudioShell';
import {StyleCard} from './StyleCard';
import {VideoLibrary} from './VideoLibrary';
import {VoiceWorkspace, type VoiceWorkspaceAudio} from './VoiceWorkspace';
import type {ActivityEvent, CommandId, ContractKey, DraftScript, ProjectOption, ProjectState, RunnerJob, RunnerStatus, SceneStillsManifest, StudioFile, Tone} from './types';
import {LOCAL_SCENE_COMPONENTS, type CompositionTemplateItem} from './component-library-model';
import {invalidateProductionArtifacts, navigationState, requestCopyTransfer, usesSceneTimeline, usesWideEditor, type PendingCopyTransfer} from './workflow-model';
import './index.css';

const FALLBACK: ProjectOption = {id: 'skill-showcase', title: 'Skill Showcase 样片', productionPath: 'examples', projectJsonPath: 'examples/skill-showcase.json', outputVideoPath: 'out/workbuddy-six-skills-showcase-v3.mp4'};
const SELECTED_PROJECT_STORAGE_KEY = 'video-factory:selected-project-id:v2';
const contractKeys: ContractKey[] = ['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json'];
const scriptKey = (draft: DraftScript) => [draft.topic, draft.hook, draft.viewpoint, draft.pain, draft.solution, draft.selectedTitle, draft.script, draft.keywords].join('\u0001');
const now = () => new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stringOf = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const contentFingerprint = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};
const styleIdOf = (value: unknown): StylePresetId => STYLE_PRESETS.some((style) => style.id === value) ? value as StylePresetId : 'cyan-tech';
const projectTimestamp = (option: ProjectOption) => Number(option.id.match(/^video-(\d+)/)?.[1] || 0);
const voiceCommandIds = new Set<CommandId>(['build-check', 'build-check-audio']);
const preferredWritableProject = (items: ProjectOption[]) => [...items]
  .filter((item) => item.productionPath.startsWith('projects/'))
  .sort((left, right) => projectTimestamp(right) - projectTimestamp(left) || right.id.localeCompare(left.id))[0] || null;

const arrayOf = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const uploadedVoiceAssetId = 'voiceover';

export const audioFromAssetPack = (value: unknown, voiceAssetId = uploadedVoiceAssetId): VoiceWorkspaceAudio | null => {
  const pack = recordOf(value);
  const asset = arrayOf(pack.assets).map(recordOf).find((item) => (
    item.kind === 'audio'
    && item.id === voiceAssetId
    && stringOf(item.src)
  ));
  if (!asset) return null;
  const source = asset.source === 'upload' || asset.source === 'tts' ? asset.source : 'project';
  return {
    src: stringOf(asset.src),
    fileName: stringOf(asset.fileName, stringOf(asset.id, 'voiceover')),
    size: typeof asset.size === 'number' ? asset.size : undefined,
    contentType: stringOf(asset.contentType),
    source,
    updatedAt: stringOf(asset.uploadedAt),
  };
};

const audioFromProject = (project: VideoProject): VoiceWorkspaceAudio | null => {
  const voiceAssetId = project.audio?.voiceAssetId;
  if (!voiceAssetId) return null;
  const asset = project.assets?.[voiceAssetId];
  if (!asset || asset.kind !== 'audio' || !asset.src) return null;
  return {src: asset.src, fileName: voiceAssetId, source: 'project'};
};

const baseAssetPack = (value: unknown, projectId: string) => {
  const pack = recordOf(value);
  return {
    ...pack,
    productionId: projectId,
    publicPathPrefix: stringOf(pack.publicPathPrefix, `projects/${projectId}`),
    assets: arrayOf(pack.assets),
    sceneAssetPlan: recordOf(pack.sceneAssetPlan),
    missingAssets: arrayOf(pack.missingAssets),
  };
};

export const withoutVoiceAudio = (value: unknown, projectId: string, voiceAssetId = uploadedVoiceAssetId) => {
  const pack = baseAssetPack(value, projectId);
  return {
    ...pack,
    voiceSourceScriptFingerprint: null,
    assets: arrayOf(pack.assets).filter((asset) => {
      const item = recordOf(asset);
      return item.id !== uploadedVoiceAssetId && item.id !== voiceAssetId;
    }),
  };
};

const withUploadedVoiceAsset = (value: unknown, projectId: string, audio: UploadedAudioAsset, scriptFingerprint: string, voiceAssetId = uploadedVoiceAssetId) => {
  const pack = withoutVoiceAudio(value, projectId, voiceAssetId);
  return {
    ...pack,
    voiceSourceScriptFingerprint: scriptFingerprint,
    assets: [
      {
        id: uploadedVoiceAssetId,
        kind: 'audio',
        src: audio.src,
        required: true,
        source: 'upload',
        fileName: audio.fileName,
        size: audio.size,
        contentType: audio.contentType,
        uploadedAt: new Date().toISOString(),
      },
      ...arrayOf(pack.assets),
    ],
  };
};

const draftFrom = (project: VideoProject, brief: unknown, scriptPack: unknown): DraftScript => {
  const script = recordOf(scriptPack);
  const first = project.scenes[0]?.payload ?? {};
  const title = stringOf(script.title, stringOf(first.title, project.title));
  return {
    topic: stringOf(recordOf(brief).title, title), hook: stringOf(script.hook), viewpoint: stringOf(script.selectedViewpoint), pain: stringOf(script.pain), solution: stringOf(script.solution),
    selectedTitle: title, titles: [title], script: stringOf(script.spokenScript, project.captions.map((caption) => caption.text).join('')), keywords: stringOf(script.keywords),
  };
};

export const StudioApp: React.FC = () => {
  const [screen, setScreen] = useState<'studio' | 'library'>('studio');
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>('checking');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption>(FALLBACK);
  const [currentStep, setCurrentStep] = useState<StepId>('script');
  const [project, setProject] = useState<VideoProject>(() => cloneProject(DEFAULT_VIDEO_PROJECT));
  const [files, setFiles] = useState<Record<ContractKey, StudioFile | null>>({'brief.json': null, 'script-pack.json': null, 'asset-pack.json': null, 'project.json': null});
  const [draft, setDraft] = useState<DraftScript>(() => draftFrom(DEFAULT_VIDEO_PROJECT, null, null));
  const [lastSavedDraft, setLastSavedDraft] = useState('');
  const [copyText, setCopyText] = useState('');
  const [savedCopyText, setSavedCopyText] = useState('');
  const [copySavedAt, setCopySavedAt] = useState<string | null>(null);
  const [copySaving, setCopySaving] = useState(false);
  const [pendingCopyTransfer, setPendingCopyTransfer] = useState<PendingCopyTransfer | null>(null);
  const [savedStyleId, setSavedStyleId] = useState<StylePresetId>('cyan-tech');
  const [candidateStyleId, setCandidateStyleId] = useState<StylePresetId | null>(null);
  const [state, setState] = useState<ProjectState | null>(null);
  const [sceneStills, setSceneStills] = useState<SceneStillsManifest | null>(null);
  const [jobs, setJobs] = useState<RunnerJob[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [remoteComponents, setRemoteComponents] = useState<CompositionTemplateItem[]>([]);
  const [componentLibraryLoading, setComponentLibraryLoading] = useState(false);
  const [componentLibraryWarning, setComponentLibraryWarning] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState(LOCAL_SCENE_COMPONENTS[0]?.compositionId || null);
  const [selectedScene, setSelectedScene] = useState(0);
  const [sceneStillsAnchorScene, setSceneStillsAnchorScene] = useState<number | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [sceneEditSaving, setSceneEditSaving] = useState(false);
  const [issue, setIssue] = useState<{title: string; diagnostics: RunnerJob['diagnostics']}>({title: '', diagnostics: []});
  const projectSelectionPending = useRef(false);
  const openNewProject = useCallback(() => { setScreen('studio'); setShowNewProjectModal(true); }, []);

  const totalFrames = project.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);
  const writable = selectedProject.productionPath.startsWith('projects/');
  const draftDirty = scriptKey(draft) !== lastSavedDraft;
  const styleDirty = candidateStyleId !== null && candidateStyleId !== savedStyleId;
  const productionInputsDirty = draftDirty || styleDirty;
  const hasSceneOverrides = project.scenes.some((scene) => Boolean(recordOf(scene.payload.sceneEditor).componentId));
  const activeJob = state ? state.activeJob : jobs.find((job) => job.status === 'running') || null;
  const activeRenderJob = activeJob?.commandId === 'render-verify' ? activeJob : null;
  const activeFinalVideoJob = activeJob && (activeJob.commandId === 'render-verify' || voiceCommandIds.has(activeJob.commandId)) ? activeJob : null;
  const activeSceneStillsJob = activeJob?.commandId === 'project-scene-stills' ? activeJob : null;
  const sceneStillsLocked = sceneStillsAnchorScene !== null || Boolean(activeSceneStillsJob);
  const lockedScene = sceneStillsAnchorScene ?? selectedScene;
  const sceneStillsProgress = sceneStillsProgressPercent(activeSceneStillsJob, project.scenes.length);
  const activeVoiceJob = activeJob && voiceCommandIds.has(activeJob.commandId) ? activeJob : null;
  const renderBlockingJob = activeJob && activeJob.commandId !== 'render-verify' ? activeJob : null;
  const interactionBusy = projectLoading || working || Boolean(activeJob) || sceneEditSaving;
  const previewStage = state?.stages.sceneStills?.status ? state.stages.sceneStills : state?.stages.preview;
  const videoVersion = [state?.stages.render.finishedAt, state?.updatedAt].filter(Boolean).join(':') || null;
  const videoUrl = state?.stages.render.status === 'current' && state.stages.render.path ? artifactUrl(state.stages.render.path, videoVersion) : null;
  const recentRenderJob = jobs.find((job) => job.commandId === 'render-verify') || null;
  const downloadUrl = state?.deliveryReady && recentRenderJob ? videoLibraryDownloadUrl(recentRenderJob.id) : null;
  const deliveryEvidenceLinks = state?.deliveryReady ? [
    {key: 'verify-json', label: 'Verify JSON', detail: '成片验收结果', url: artifactUrl(`out/${selectedProject.id}-verify.json`, state.updatedAt)},
    {key: 'component-report', label: 'Component Report', detail: '组件使用分布', url: artifactUrl(`out/${selectedProject.id}-component-report.json`, state.updatedAt)},
    {key: 'qa-manifest', label: 'QA Manifest', detail: '抽帧样张索引', url: artifactUrl(`out/${selectedProject.id}-qa/manifest.json`, state.updatedAt)},
    {key: 'qa-contact-sheet', label: 'QA Contact Sheet', detail: '交付质检拼图', url: artifactUrl(`out/${selectedProject.id}-qa/contact-sheet.jpg`, state.updatedAt)},
  ] : [];
  const recentVoiceJob = jobs.find((job) => voiceCommandIds.has(job.commandId)) || null;
  const componentLibrary = useMemo(() => remoteComponents.length > 0 ? remoteComponents : LOCAL_SCENE_COMPONENTS, [remoteComponents]);
  const selectedComponent = useMemo(() => componentLibrary.find((component) => component.compositionId === selectedComponentId) || componentLibrary[0] || null, [componentLibrary, selectedComponentId]);
  const currentVoiceAudio = useMemo(() => audioFromAssetPack(files['asset-pack.json']?.data, project.audio?.voiceAssetId) || audioFromProject(project), [files, project]);
  const currentScriptFingerprint = contentFingerprint(draft.script);
  const voiceSourceScriptFingerprint = stringOf(recordOf(files['asset-pack.json']?.data).voiceSourceScriptFingerprint);
  const hasVoiceAsset = Boolean(currentVoiceAudio && (!voiceSourceScriptFingerprint || voiceSourceScriptFingerprint === currentScriptFingerprint));

  const pushActivity = useCallback((text: string, tone: Tone = 'info') => {
    setActivity((items) => [{id: `${Date.now()}-${Math.random()}`, time: now(), tone, text}, ...items].slice(0, 12));
  }, []);

  const markProductionArtifactsStale = useCallback(() => {
    setSceneStills(null);
    setState((current) => {
      if (!current) return current;
      return {...current, deliveryReady: false, stages: {
        project: {...current.stages.project, status: 'stale'},
        preview: {...current.stages.preview, status: 'stale'},
        sceneStills: current.stages.sceneStills
          ? {...current.stages.sceneStills, status: 'stale'}
          : {status: 'stale'},
        render: {...current.stages.render, status: 'stale'},
        verify: {...current.stages.verify, status: 'stale'},
      }};
    });
  }, []);

  const rememberProjectId = useCallback((projectId: string) => {
    try { window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId); }
    catch { /* Local storage is optional; selection still works in memory. */ }
  }, []);

  const refreshState = useCallback(async (option = selectedProject) => {
    try {
      const next = await loadProjectState(option.id);
      setState(next);
      if (next.stages.sceneStills?.status === 'current') setSceneStills(await loadSceneStillsManifest(next.stages.sceneStills.path));
      else setSceneStills(null);
    }
    catch { setState(null); setSceneStills(null); }
  }, [selectedProject]);

  const refreshProject = useCallback(async (option: ProjectOption) => {
    const [entries, copyFile] = await Promise.all([
      Promise.all(contractKeys.map(async (key) => [key, await loadStudioFile(filePathFor(option, key))] as const)),
      option.productionPath.startsWith('projects/')
        ? loadStudioFile(`${option.productionPath}/copy-draft.json`)
        : Promise.resolve({path: 'examples/copy-draft.json', exists: false, data: null} as StudioFile),
    ]);
    const nextFiles = Object.fromEntries(entries) as Record<ContractKey, StudioFile>;
    const normalized = normalizeLoadedProject(nextFiles['project.json'].data);
    const nextDraft = draftFrom(normalized.project, nextFiles['brief.json'].data, nextFiles['script-pack.json'].data);
    const nextStyle = styleIdOf(recordOf(nextFiles['brief.json'].data).visualStyle && recordOf(recordOf(nextFiles['brief.json'].data).visualStyle).presetId);
    const copyData = recordOf(copyFile.data);
    const nextCopyText = stringOf(copyData.text);
    const nextCopySavedAt = stringOf(copyData.savedAt) || null;
    setFiles(nextFiles); setProject(normalized.project); setDraft(nextDraft); setLastSavedDraft(scriptKey(nextDraft)); setSavedStyleId(nextStyle); setCandidateStyleId(null); setSelectedScene(0);
    setCopyText(nextCopyText); setSavedCopyText(nextCopyText); setCopySavedAt(nextCopySavedAt); setPendingCopyTransfer(null);
    if (!normalized.ok) setIssue({title: 'Project JSON 未通过 Schema 校验', diagnostics: normalized.diagnostics.map((item) => ({...item, phase: 'load', path: item.path}))});
    await Promise.all([refreshState(option), loadJobs(option.id).then(setJobs).catch(() => setJobs([]))]);
  }, [refreshState]);

  const selectProject = useCallback(async (option: ProjectOption) => {
    if (projectSelectionPending.current) return;
    projectSelectionPending.current = true;
    setProjectLoading(true);
    try {
      setSelectedProject(option); setCurrentStep('script'); setIssue({title: '', diagnostics: []});
      rememberProjectId(option.id);
      await refreshProject(option);
      pushActivity(`已切换至 ${option.title}`, 'success');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '项目加载失败', diagnostics: apiError.diagnostics || []});
    } finally {
      projectSelectionPending.current = false;
      setProjectLoading(false);
    }
  }, [pushActivity, refreshProject, rememberProjectId]);

  const refreshBuiltProject = useCallback(async (option: ProjectOption): Promise<ProjectOption> => {
    const items = await loadProjects().catch(() => []);
    if (items.length > 0) setProjects(items);
    const nextOption = items.find((item) => item.id === option.id) || option;
    setSelectedProject(nextOption);
    rememberProjectId(nextOption.id);
    await refreshProject(nextOption);
    return nextOption;
  }, [refreshProject, rememberProjectId]);

  const saveCopyDraft = useCallback(async () => {
    if (!writable || !copyText.trim()) return;
    const savedAt = new Date().toISOString();
    try {
      setCopySaving(true);
      await saveFile(`${selectedProject.productionPath}/copy-draft.json`, {text: copyText, savedAt});
      setSavedCopyText(copyText); setCopySavedAt(savedAt); setPendingCopyTransfer(null);
      pushActivity('创作草稿已保存', 'success');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '草稿保存失败', diagnostics: apiError.diagnostics || []});
    } finally {
      setCopySaving(false);
    }
  }, [copyText, pushActivity, selectedProject.productionPath, writable]);

  const saveSceneEdit = useCallback(async (
    sceneIndex: number,
    payload: Record<string, unknown>,
    baseProject = project,
    projectOption = selectedProject,
  ): Promise<boolean> => {
    if (!writable) {
      setIssue({title: '样例项目不可编辑分镜', diagnostics: []});
      return false;
    }
    const scene = baseProject.scenes[sceneIndex];
    if (!scene) {
      setIssue({title: '当前分镜不存在', diagnostics: []});
      return false;
    }
    const nextProject = cloneProject(baseProject);
    nextProject.scenes[sceneIndex] = {...scene, payload};
    try {
      setSceneEditSaving(true);
      const saved = await saveFile(filePathFor(projectOption, 'project.json'), nextProject);
      const normalized = normalizeLoadedProject(saved.data);
      if (!normalized.ok) throw new Error('保存后的 Project JSON 未通过 Schema 校验');
      setProject(normalized.project);
      setFiles((current) => ({...current, 'project.json': saved}));
      markProductionArtifactsStale();
      await refreshState(projectOption);
      pushActivity(`分镜 ${String(sceneIndex + 1).padStart(2, '0')} 修改已保存`, 'success');
      return true;
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '分镜保存失败', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '分镜保存失败', 'danger');
      return false;
    } finally {
      setSceneEditSaving(false);
    }
  }, [markProductionArtifactsStale, project, pushActivity, refreshState, selectedProject, writable]);

  const prepareCopyTransfer = useCallback(() => {
    try {
      setPendingCopyTransfer(requestCopyTransfer({savedText: savedCopyText, savedAt: copySavedAt}));
      pushActivity('草稿已准备转入口播文案', 'info');
    } catch (error) {
      setIssue({title: error instanceof Error ? error.message : '请先保存草稿', diagnostics: []});
    }
  }, [copySavedAt, pushActivity, savedCopyText]);

  const changeStep = useCallback((nextStep: StepId) => {
    if (sceneStillsLocked || interactionBusy) return;
    if (nextStep === currentStep) return;
    if (currentStep === 'copy' && pendingCopyTransfer) {
      const confirmed = window.confirm('将已保存草稿替换为当前口播文案？现有分镜、预览和成片状态将需要重新生成。');
      if (!confirmed) return;
      setDraft((current) => ({
        ...current,
        script: pendingCopyTransfer.text,
        hook: pendingCopyTransfer.text.slice(0, 120),
      }));
      setPendingCopyTransfer(null);
      setSceneStills(null);
      setState((current) => {
        if (!current) return current;
        const invalid = invalidateProductionArtifacts({
          projectStatus: current.stages.project.status,
          previewStatus: current.stages.preview.status,
          sceneStillsStatus: current.stages.sceneStills?.status,
          renderStatus: current.stages.render.status,
          verifyStatus: current.stages.verify.status,
          deliveryReady: current.deliveryReady,
        });
        return {...current, deliveryReady: invalid.deliveryReady, stages: {
          project: {...current.stages.project, status: invalid.projectStatus},
          preview: {...current.stages.preview, status: invalid.previewStatus},
          sceneStills: current.stages.sceneStills
            ? {...current.stages.sceneStills, status: invalid.sceneStillsStatus || 'stale'}
            : {status: invalid.sceneStillsStatus || 'stale'},
          render: {...current.stages.render, status: invalid.renderStatus},
          verify: {...current.stages.verify, status: invalid.verifyStatus},
        }};
      });
      setCurrentStep('script');
      pushActivity('草稿已转入口播文案，请确认并保存', 'warning');
      return;
    }
    setCurrentStep(nextStep);
  }, [currentStep, interactionBusy, pendingCopyTransfer, pushActivity, sceneStillsLocked]);

  const buildInputs = useCallback((assetPackOverride?: unknown, visualStyleId: StylePresetId = candidateStyleId ?? savedStyleId) => {
    const previousBrief = recordOf(files['brief.json']?.data);
    const previousVisualStyle = recordOf(previousBrief.visualStyle);
    const brief = {
      ...previousBrief,
      productionId: selectedProject.id,
      title: draft.topic || draft.selectedTitle || selectedProject.title,
      visualStyle: {...previousVisualStyle, presetId: visualStyleId},
      viewpointCandidates: [{id: 'v1', claim: draft.viewpoint || '核心观点', whyItMatters: ''}], selectedViewpointId: 'v1',
    };
    const previousScript = recordOf(files['script-pack.json']?.data);
    const scriptPack = {...previousScript, productionId: selectedProject.id, title: draft.selectedTitle || draft.topic, hook: draft.hook, selectedViewpoint: draft.viewpoint, pain: draft.pain, solution: draft.solution, spokenScript: draft.script, keywords: draft.keywords, contentFingerprint: contentFingerprint(draft.script)};
    const inputFiles: Array<{path: string; data: unknown}> = [{path: filePathFor(selectedProject, 'brief.json'), data: brief}, {path: filePathFor(selectedProject, 'script-pack.json'), data: scriptPack}];
    if (assetPackOverride) inputFiles.push({path: filePathFor(selectedProject, 'asset-pack.json'), data: assetPackOverride});
    return inputFiles;
  }, [candidateStyleId, draft, files, savedStyleId, selectedProject]);

  const saveScriptDraft = useCallback(async () => {
    if (!writable || !draftDirty) return;
    if (draft.script.trim().length < 20) {
      setIssue({title: '口播稿至少需要 20 个字符', diagnostics: []});
      return;
    }
    try {
      setWorking(true);
      setIssue({title: '', diagnostics: []});
      const [briefInput, scriptInput] = buildInputs(undefined, savedStyleId);
      if (!briefInput || !scriptInput) throw new Error('口播文案保存数据不完整');
      const previousSpokenScript = stringOf(recordOf(files['script-pack.json']?.data).spokenScript);
      const voiceNeedsInvalidation = Boolean(currentVoiceAudio && contentFingerprint(previousSpokenScript) !== currentScriptFingerprint);
      const nextAssetPack = voiceNeedsInvalidation
        ? {...baseAssetPack(files['asset-pack.json']?.data, selectedProject.id), voiceSourceScriptFingerprint: voiceSourceScriptFingerprint || contentFingerprint(previousSpokenScript)}
        : null;
      const [briefFile, scriptFile, assetPackFile] = await Promise.all([
        saveFile(briefInput.path, briefInput.data),
        saveFile(scriptInput.path, scriptInput.data),
        nextAssetPack ? saveFile(filePathFor(selectedProject, 'asset-pack.json'), nextAssetPack) : Promise.resolve(null),
      ]);
      setFiles((current) => ({...current, 'brief.json': briefFile, 'script-pack.json': scriptFile, ...(assetPackFile ? {'asset-pack.json': assetPackFile} : {})}));
      setLastSavedDraft(scriptKey(draft));
      markProductionArtifactsStale();
      await refreshState(selectedProject);
      pushActivity('口播稿已保存，等待选择语音来源', 'success');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '口播稿保存失败', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '口播稿保存失败', 'danger');
    } finally {
      setWorking(false);
    }
  }, [buildInputs, currentScriptFingerprint, currentVoiceAudio, draft, draftDirty, files, markProductionArtifactsStale, pushActivity, refreshState, savedStyleId, selectedProject, voiceSourceScriptFingerprint, writable]);

  const saveStyleSelection = useCallback(async () => {
    if (!writable || !candidateStyleId || candidateStyleId === savedStyleId) return;
    try {
      setWorking(true);
      setIssue({title: '', diagnostics: []});
      const [briefInput] = buildInputs(undefined, candidateStyleId);
      if (!briefInput) throw new Error('风格保存数据不完整');
      const briefFile = await saveFile(briefInput.path, briefInput.data);
      setFiles((current) => ({...current, 'brief.json': briefFile}));
      setSavedStyleId(candidateStyleId);
      setCandidateStyleId(null);
      markProductionArtifactsStale();
      await refreshState(selectedProject);
      pushActivity('风格已保存，可进入分镜生成画面', 'success');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '风格保存失败', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '风格保存失败', 'danger');
    } finally {
      setWorking(false);
    }
  }, [buildInputs, candidateStyleId, markProductionArtifactsStale, pushActivity, refreshState, savedStyleId, selectedProject, writable]);

  const waitForTerminalJob = useCallback(async (started: RunnerJob) => {
    let next = started;
    let consecutiveFailures = 0;
    const deadline = Date.now() + 30 * 60 * 1000;
    while (next.status === 'running') {
      if (Date.now() >= deadline) throw new Error(`任务 ${started.id} 状态轮询超时`);
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(4500, 900 * (consecutiveFailures + 1))));
      try {
        next = await pollJob(started.id);
        consecutiveFailures = 0;
      } catch (error) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 5) throw error;
        continue;
      }
      setJobs((items) => [next, ...items.filter((item) => item.id !== next.id)]);
      await refreshState(started.project);
    }
    await refreshState(started.project);
    return next;
  }, [refreshState]);

  const ensureBuiltProject = useCallback(async (
    option: ProjectOption,
    {label, saveInputs}: {label: string; saveInputs: boolean},
  ): Promise<{ok: true; project: ProjectOption} | {ok: false; job: RunnerJob}> => {
    const commandId = hasVoiceAsset ? 'build-check-audio' : 'build-check';
    const build = await startJob(commandId, label, option, saveInputs ? buildInputs() : undefined);
    setJobs((items) => [build.job, ...items.filter((item) => item.id !== build.job.id)]);
    pushActivity(`${label}已启动`, 'info');
    const finishedBuild = await waitForTerminalJob(build.job);
    if (finishedBuild.status !== 'done') return {ok: false, job: finishedBuild};
    const nextProject = await refreshBuiltProject(finishedBuild.project);
    pushActivity('分镜结构已更新', 'success');
    return {ok: true, project: nextProject};
  }, [buildInputs, hasVoiceAsset, pushActivity, refreshBuiltProject, waitForTerminalJob]);

  const followJob = useCallback(async (started: RunnerJob, commandId: CommandId) => {
    try {
      const next = await waitForTerminalJob(started);
      if (voiceCommandIds.has(commandId)) await refreshBuiltProject(started.project);
      if (next.status === 'done') {
        pushActivity(`${started.label}完成`, 'success');
      } else {
        setIssue({title: `${started.label}失败`, diagnostics: next.diagnostics});
        pushActivity(`${started.label}失败`, 'danger');
      }
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || `${started.label}状态读取失败`, diagnostics: apiError.diagnostics || []});
      pushActivity(`${started.label}状态读取失败，请检查执行器后刷新`, 'danger');
    } finally {
      setWorking(false);
    }
  }, [pushActivity, refreshBuiltProject, waitForTerminalJob]);

  const runSceneStills = useCallback(async () => {
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return; }
    if (activeJob) { setIssue({title: '请等待当前任务完成', diagnostics: []}); return; }
    setSceneStillsAnchorScene(selectedScene);
    try {
      setWorking(true); setIssue({title: '', diagnostics: []});
      let projectForStills = selectedProject;
      if (writable && (productionInputsDirty || (state?.stages.project.status !== 'current' && !hasSceneOverrides))) {
        const built = await ensureBuiltProject(selectedProject, {
          label: productionInputsDirty ? '保存并更新分镜' : '更新分镜结构',
          saveInputs: productionInputsDirty,
        });
        if (!built.ok) {
          setIssue({title: productionInputsDirty ? '保存并更新分镜失败' : '更新分镜结构失败', diagnostics: built.job.diagnostics});
          pushActivity('更新分镜结构失败', 'danger');
          return;
        }
        projectForStills = built.project;
      }
      const stills = await startJob('project-scene-stills', '生成分镜画面', projectForStills);
      setJobs((items) => [stills.job, ...items.filter((item) => item.id !== stills.job.id)]);
      pushActivity('生成分镜画面已启动', 'info');
      const finishedStills = await waitForTerminalJob(stills.job);
      if (finishedStills.status === 'done') {
        await refreshState(projectForStills);
        pushActivity('分镜画面完成', 'success');
      } else {
        setIssue({title: '生成分镜画面失败', diagnostics: finishedStills.diagnostics});
        pushActivity('生成分镜画面失败', 'danger');
      }
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '任务无法启动', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '任务无法启动', 'danger');
    } finally {
      setWorking(false);
      setSceneStillsAnchorScene(null);
    }
  }, [activeJob, ensureBuiltProject, hasSceneOverrides, productionInputsDirty, pushActivity, refreshState, runnerStatus, selectedProject, selectedScene, state?.stages.project.status, waitForTerminalJob, writable]);

  const runJob = useCallback(async (commandId: 'build-check' | 'build-check-audio' | 'project-scene-stills' | 'render-verify', label: string, includeInputs = false) => {
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return; }
    try {
      setWorking(true); setIssue({title: '', diagnostics: []});
      let projectForCommand = selectedProject;
      let shouldIncludeInputs = includeInputs;
      if (commandId === 'render-verify' && hasSceneOverrides && !productionInputsDirty && state?.stages.project.status !== 'current') {
        const check = await startJob('project-check', '检查人工分镜修改', selectedProject);
        setJobs((items) => [check.job, ...items.filter((item) => item.id !== check.job.id)]);
        pushActivity('正在检查人工分镜修改', 'info');
        const checked = await waitForTerminalJob(check.job);
        if (checked.status !== 'done') {
          setWorking(false);
          setIssue({title: '人工分镜修改未通过检查', diagnostics: checked.diagnostics});
          pushActivity('生成最终视频已停止：人工分镜修改未通过检查', 'danger');
          return;
        }
        await refreshState(selectedProject);
        pushActivity('人工分镜修改已通过检查', 'success');
      }
      if (commandId === 'render-verify' && writable && (productionInputsDirty || (state?.stages.project.status !== 'current' && !hasSceneOverrides))) {
        const built = await ensureBuiltProject(selectedProject, {
          label: productionInputsDirty ? '保存并更新分镜' : '更新分镜结构',
          saveInputs: productionInputsDirty,
        });
        if (!built.ok) {
          setWorking(false);
          setIssue({title: productionInputsDirty ? '保存并更新分镜失败' : '更新分镜结构失败', diagnostics: built.job.diagnostics});
          pushActivity('生成最终视频已停止：分镜未更新', 'danger');
          return;
        }
        projectForCommand = built.project;
        shouldIncludeInputs = false;
      }
      const result = await startJob(commandId, label, projectForCommand, shouldIncludeInputs ? buildInputs() : undefined);
      if (shouldIncludeInputs) {
        setSceneStills(null);
        setState((current) => {
          if (!current) return current;
          const invalid = invalidateProductionArtifacts({
            projectStatus: current.stages.project.status,
            previewStatus: current.stages.preview.status,
            sceneStillsStatus: current.stages.sceneStills?.status,
            renderStatus: current.stages.render.status,
            verifyStatus: current.stages.verify.status,
            deliveryReady: current.deliveryReady,
          });
          return {...current, deliveryReady: invalid.deliveryReady, stages: {
            project: {...current.stages.project, status: invalid.projectStatus},
            preview: {...current.stages.preview, status: invalid.previewStatus},
            sceneStills: current.stages.sceneStills
              ? {...current.stages.sceneStills, status: invalid.sceneStillsStatus || 'stale'}
              : {status: invalid.sceneStillsStatus || 'stale'},
            render: {...current.stages.render, status: invalid.renderStatus},
            verify: {...current.stages.verify, status: invalid.verifyStatus},
          }};
        });
      }
      setJobs((items) => [result.job, ...items.filter((item) => item.id !== result.job.id)]);
      pushActivity(`${label}已启动`, 'info');
      void followJob(result.job, commandId);
    } catch (error) {
      setWorking(false);
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '任务无法启动', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '任务无法启动', 'danger');
    }
  }, [buildInputs, ensureBuiltProject, followJob, hasSceneOverrides, productionInputsDirty, pushActivity, refreshState, runnerStatus, selectedProject, state?.stages.project.status, waitForTerminalJob, writable]);

  const runVoiceSynthesis = useCallback(async () => {
    if (!writable) { setIssue({title: '样例项目不可合成语音', diagnostics: []}); return; }
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return; }
    if (draft.script.trim().length < 20) { setIssue({title: '口播稿太短，无法开始语音生产', diagnostics: []}); return; }
    if (draftDirty) { setIssue({title: '请先保存口播稿', diagnostics: []}); return; }
    try {
      setWorking(true);
      setIssue({title: '', diagnostics: []});
      markProductionArtifactsStale();
      const nextAssetPack = {...withoutVoiceAudio(files['asset-pack.json']?.data, selectedProject.id, project.audio?.voiceAssetId), voiceSourceScriptFingerprint: currentScriptFingerprint};
      const assetPackFile = await saveFile(filePathFor(selectedProject, 'asset-pack.json'), nextAssetPack);
      setFiles((current) => ({...current, 'asset-pack.json': assetPackFile}));
      const result = await startJob('build-check', '合成语音', selectedProject);
      setJobs((items) => [result.job, ...items.filter((item) => item.id !== result.job.id)]);
      pushActivity('语音合成已启动', 'info');
      void followJob(result.job, 'build-check');
    } catch (error) {
      setWorking(false);
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '语音合成任务无法启动', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '语音合成任务无法启动', 'danger');
    }
  }, [currentScriptFingerprint, draft.script, draftDirty, files, followJob, markProductionArtifactsStale, project.audio?.voiceAssetId, pushActivity, runnerStatus, selectedProject, writable]);

  const runVoiceFromUpload = useCallback(async (file: File): Promise<boolean> => {
    if (!writable) { setIssue({title: '样例项目不可上传音频', diagnostics: []}); return false; }
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return false; }
    if (draft.script.trim().length < 20) { setIssue({title: '口播稿太短，无法对齐音频', diagnostics: []}); return false; }
    if (draftDirty) { setIssue({title: '请先保存口播稿', diagnostics: []}); return false; }
    try {
      setWorking(true);
      setIssue({title: '', diagnostics: []});
      const uploaded = await uploadProjectAudio(selectedProject, file);
      const nextAssetPack = withUploadedVoiceAsset(files['asset-pack.json']?.data, selectedProject.id, uploaded, currentScriptFingerprint, project.audio?.voiceAssetId);
      const assetPackFile = await saveFile(filePathFor(selectedProject, 'asset-pack.json'), nextAssetPack);
      setFiles((current) => ({...current, 'asset-pack.json': assetPackFile}));
      markProductionArtifactsStale();
      const result = await startJob('build-check-audio', '上传并处理音频', selectedProject);
      setJobs((items) => [result.job, ...items.filter((item) => item.id !== result.job.id)]);
      pushActivity(`音频 ${uploaded.fileName} 已上传，正在对齐字幕`, 'info');
      void followJob(result.job, 'build-check-audio');
      return true;
    } catch (error) {
      setWorking(false);
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '音频上传任务无法启动', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '音频上传任务无法启动', 'danger');
      return false;
    }
  }, [currentScriptFingerprint, draft.script, draftDirty, files, followJob, markProductionArtifactsStale, project.audio?.voiceAssetId, pushActivity, runnerStatus, selectedProject, writable]);

  const deleteVoiceAudio = useCallback(async () => {
    if (!writable) { setIssue({title: '样例项目不可删除音频', diagnostics: []}); return; }
    if (activeJob) { setIssue({title: '任务运行中，暂时不能删除音频', diagnostics: []}); return; }
    try {
      setWorking(true);
      setIssue({title: '', diagnostics: []});
      const nextAssetPack = withoutVoiceAudio(files['asset-pack.json']?.data, selectedProject.id, project.audio?.voiceAssetId);
      const nextProject = cloneProject(project);
      const removeAssetIds = new Set([uploadedVoiceAssetId]);
      if (nextProject.audio?.voiceAssetId) removeAssetIds.add(nextProject.audio.voiceAssetId);
      nextProject.audio = {...nextProject.audio};
      delete nextProject.audio.voiceAssetId;
      nextProject.assets = Object.fromEntries(Object.entries(nextProject.assets || {}).filter(([assetId]) => !removeAssetIds.has(assetId)));
      const [assetPackFile, projectFile] = await Promise.all([
        saveFile(filePathFor(selectedProject, 'asset-pack.json'), nextAssetPack),
        saveFile(filePathFor(selectedProject, 'project.json'), nextProject),
      ]);
      setFiles((current) => ({...current, 'asset-pack.json': assetPackFile, 'project.json': projectFile}));
      setProject(nextProject);
      markProductionArtifactsStale();
      await refreshState(selectedProject);
      pushActivity('音频已删除，分镜和成片需重新生成', 'warning');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '音频删除失败', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '音频删除失败', 'danger');
    } finally {
      setWorking(false);
    }
  }, [activeJob, files, markProductionArtifactsStale, project, pushActivity, refreshState, selectedProject, writable]);

  const retry = useCallback(async (job: RunnerJob) => {
    if (working || activeJob) {
      setIssue({title: '请等待当前任务完成后再重试', diagnostics: []});
      return;
    }
    try {
      setWorking(true); const result = await retryJob(job.id); setJobs((items) => [result.job, ...items]); void followJob(result.job, result.job.commandId);
    } catch (error) { setWorking(false); const apiError = error as StudioApiError; setIssue({title: apiError.message, diagnostics: apiError.diagnostics}); }
  }, [activeJob, followJob, working]);

  useEffect(() => {
    let cancelled = false;
    const health = async () => { const result = await checkHealth(); if (!cancelled) setRunnerStatus(result); };
    void health(); const interval = window.setInterval(() => void health(), 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);
  useEffect(() => {
    if (runnerStatus !== 'online') return;
    let cancelled = false;
    setComponentLibraryLoading(true);
    setComponentLibraryWarning(null);
    void loadRemoteComponentLibrary()
      .then((result) => {
        if (cancelled) return;
        setRemoteComponents(result.components);
        if (!result.available) setComponentLibraryWarning('生产组件目录暂时不可用。');
      })
      .catch((error) => {
        if (!cancelled) setComponentLibraryWarning(error instanceof Error ? error.message : '组件库同步失败');
      })
      .finally(() => { if (!cancelled) setComponentLibraryLoading(false); });
    return () => { cancelled = true; };
  }, [runnerStatus]);
  useEffect(() => {
    if (runnerStatus !== 'online') return;
    void loadProjects().then(async (items) => {
      setProjects(items);
      const storedId = (() => {
        try { return window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY) || ''; }
        catch { return ''; }
      })();
      const target = items.find((item) => item.id === storedId) || preferredWritableProject(items) || items.find((item) => item.id === selectedProject.id) || items[0];
      if (target) { setSelectedProject(target); rememberProjectId(target.id); await refreshProject(target); }
    }).catch((error) => {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '项目列表加载失败', diagnostics: apiError.diagnostics || []});
    });
  // Initial connection only. Selection is handled by selectProject.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runnerStatus]);
  useEffect(() => {
    if (!activeJob) return;
    const interval = window.setInterval(() => { void refreshState(); void loadJobs(selectedProject.id).then(setJobs).catch(() => undefined); }, 2000);
    return () => window.clearInterval(interval);
  }, [activeJob, refreshState, selectedProject.id]);

  const newProjectModal = showNewProjectModal ? <NewProjectModal
    onClose={() => setShowNewProjectModal(false)}
    onCreated={async (result) => {
      setShowNewProjectModal(false);
      setScreen('studio');
      const items = await loadProjects();
      setProjects(items);
      const next = items.find((item) => item.id === result.project.id);
      if (next) await selectProject(next);
      pushActivity('项目已创建，请先确认并保存口播稿', 'success');
    }}
    onError={(message) => setIssue({title: message, diagnostics: []})}
  /> : null;

  if (screen === 'library') {
    return <><VideoLibrary onBack={() => setScreen('studio')} onOpenProject={(projectId) => { const next = projects.find((item) => item.id === projectId); if (next) void selectProject(next); setScreen('studio'); }} />{newProjectModal}</>;
  }

  const voiceJobActive = Boolean(activeJob && voiceCommandIds.has(activeJob.commandId));
  const stepStatus: Record<StepId, StepStatus> = {
    copy: copyText !== savedCopyText ? 'draft' : copySavedAt ? 'current' : 'missing',
    script: working && currentStep === 'script' && !activeJob ? 'running' : draftDirty ? 'draft' : 'current',
    voice: voiceJobActive ? 'running' : hasVoiceAsset ? 'current' : draftDirty ? 'draft' : 'missing',
    style: working && currentStep === 'style' && !activeJob ? 'running' : styleDirty ? 'draft' : 'current', storyboard: voiceJobActive ? 'running' : state?.stages.project.status || 'missing',
    preview: working && activeJob?.commandId === 'project-scene-stills' ? 'running' : previewStage?.status || 'missing',
    render: working && activeJob?.commandId === 'render-verify' ? 'running' : state?.stages.render.status || 'missing',
    deliver: state?.deliveryReady ? 'ready' : state?.stages.verify.status || 'missing',
    components: 'current',
  };
  const navigation = navigationState({
    hasProject: Boolean(selectedProject.id),
    scriptDraftReady: draft.script.trim().length >= 20,
    scriptReady: draft.script.trim().length >= 20 && !draftDirty,
    voiceReady: hasVoiceAsset,
    styleReady: !styleDirty,
    projectStatus: state?.stages.project.status || 'missing',
    previewStatus: previewStage?.status || 'missing',
    renderStatus: state?.stages.render.status || 'missing',
    verifyStatus: state?.stages.verify.status || 'missing',
  });
  const showSceneTimeline = usesSceneTimeline(currentStep);
  const wideWorkspace = usesWideEditor(currentStep);
  const previewLabel = currentStep === 'storyboard'
    ? '当前分镜画面'
    : currentStep === 'components'
      ? '组件预览'
      : '视频预览';
  const preview = wideWorkspace
    ? undefined
    : currentStep === 'components'
      ? <ComponentPreviewCanvas component={selectedComponent} projectTitle={selectedProject.title} />
      : currentStep === 'storyboard'
        ? <StoryboardFrameCanvas
            project={project}
            projectTitle={selectedProject.title}
            selectedScene={lockedScene}
            sceneStills={sceneStills}
            state={state}
            activeJob={activeSceneStillsJob}
            fps={project.render.fps}
          />
        : <PreviewCanvas project={project} state={state} selectedScene={selectedScene} projectTitle={selectedProject.title} videoUrl={videoUrl} activeJob={activeFinalVideoJob} starting={working && !activeJob} />;

  return <>
    <StudioShell
      header={<div className="header-content">
        <div className="product-lockup"><span className="product-mark">VF</span><span>Video Factory</span><small>AI 视频生产台</small></div>
        <div className="header-project"><span>当前项目</span><select aria-label="当前项目" disabled={sceneStillsLocked || interactionBusy} value={selectedProject.projectJsonPath} onChange={(event) => { const next = projects.find((item) => item.projectJsonPath === event.target.value); if (next) void selectProject(next); }}>{projects.map((item) => <option key={item.projectJsonPath} value={item.projectJsonPath}>{item.title}</option>)}</select></div>
        <div className={`runner-status is-${runnerStatus}`}><i /><span>{runnerStatus === 'online' ? '执行器在线' : runnerStatus === 'checking' ? '连接执行器' : '执行器离线'}</span></div>
        <div className="header-actions"><button className="new-project" type="button" disabled={sceneStillsLocked || interactionBusy} onClick={openNewProject}>+ 新建视频</button></div>
      </div>}
      stepper={<ProductionStepper currentStep={currentStep} onStepClick={changeStep} onOpenVideoLibrary={() => setScreen('library')} status={stepStatus} navigation={navigation} busy={interactionBusy} />}
      preview={preview}
      previewLabel={previewLabel}
      workspace={<>
        {issue.title && <section className="issue-panel"><div><strong>{issue.title}</strong>{issue.diagnostics.slice(0, 2).map((diagnostic, index) => <p key={`${diagnostic.code}-${index}`}>{diagnostic.path ? `${diagnostic.path}: ` : ''}{diagnostic.message}</p>)}</div><button type="button" onClick={() => setIssue({title: '', diagnostics: []})}>关闭</button></section>}
        {currentStep === 'copy' && <CopyWorkshop projectTitle={selectedProject.title} text={copyText} savedText={savedCopyText} savedAt={copySavedAt} writable={writable} saving={copySaving} transferPending={Boolean(pendingCopyTransfer)} onChange={setCopyText} onSave={() => void saveCopyDraft()} onTransfer={prepareCopyTransfer} />}
        {currentStep === 'script' && <ScriptWorkspace draft={draft} dirty={draftDirty} writable={writable} saving={working} onSetDraft={setDraft} onSave={() => void saveScriptDraft()} />}
        {currentStep === 'voice' && <VoiceWorkspace draft={draft} dirty={draftDirty} writable={writable} runnerOnline={runnerStatus === 'online'} saving={working || Boolean(activeJob)} currentAudio={hasVoiceAsset ? currentVoiceAudio : null} activeJob={activeVoiceJob} recentJob={recentVoiceJob} onSynthesize={runVoiceSynthesis} onUploadAudio={runVoiceFromUpload} onDeleteAudio={deleteVoiceAudio} />}
        {currentStep === 'style' && <div className="workspace-panel style-workspace"><div className="workspace-heading"><div><span className="workspace-kicker">03 / 视觉系统</span><h1>风格</h1></div><span className={`state-chip ${styleDirty ? 'is-stale' : 'is-current'}`}>{styleDirty ? '未保存' : '已保存'}</span></div><p className="workspace-copy">这里只保存色彩、字体、节奏和版式规则；分镜页再根据已保存风格生成画面。</p>{!writable && <div className="notice notice--neutral">样例项目为只读输入。</div>}<StyleCard presets={STYLE_PRESETS} candidate={candidateStyleId} applied={savedStyleId} disabled={!writable} onSelect={setCandidateStyleId} /><button className="primary-action" type="button" disabled={!writable || working || !styleDirty} onClick={() => void saveStyleSelection()}>{working ? '正在保存风格' : styleDirty ? '保存风格' : candidateStyleId === savedStyleId ? '当前风格已保存' : '先选择一个风格'}</button></div>}
        {currentStep === 'storyboard' && <StoryboardWorkspace project={project} fps={project.render.fps} selectedScene={lockedScene} state={state} sceneStills={sceneStills} activeJob={activeJob} runnerOnline={runnerStatus === 'online'} busy={Boolean(activeJob)} writable={writable} saving={sceneEditSaving} onSaveScene={saveSceneEdit} onRenderSceneStills={() => void runSceneStills()} />}
        {currentStep === 'render' && <RenderWorkspace mode="render" state={state} videoUrl={videoUrl} downloadUrl={downloadUrl} evidenceLinks={deliveryEvidenceLinks} runnerOnline={runnerStatus === 'online'} activeJob={activeRenderJob} blockingJob={renderBlockingJob} starting={working && !activeJob} recentJob={recentRenderJob} onRun={(command) => void runJob(command, '生成最终视频')} totalFrames={totalFrames} fps={project.render.fps} sceneCount={project.scenes.length} />}
        {currentStep === 'deliver' && <RenderWorkspace mode="deliver" state={state} videoUrl={videoUrl} downloadUrl={downloadUrl} evidenceLinks={deliveryEvidenceLinks} runnerOnline={runnerStatus === 'online'} activeJob={activeRenderJob} blockingJob={renderBlockingJob} starting={working && !activeJob} recentJob={recentRenderJob} onRun={(command) => void runJob(command, '生成最终视频')} totalFrames={totalFrames} fps={project.render.fps} sceneCount={project.scenes.length} />}
        {currentStep === 'components' && <ComponentLibraryWorkspace components={componentLibrary} loading={componentLibraryLoading} warning={componentLibraryWarning} selectedId={selectedComponent?.compositionId || null} onSelect={setSelectedComponentId} />}
      </>}
      timeline={showSceneTimeline ? <SceneTimeline project={project} totalFrames={totalFrames} fps={project.render.fps} selectedScene={lockedScene} sceneStills={sceneStills} stillsRendering={sceneStillsLocked} onSelectScene={(index) => { if (!sceneStillsLocked) setSelectedScene(index); }} /> : undefined}
      wideWorkspace={wideWorkspace}
      drawer={<DeveloperDrawer jobs={jobs} activity={activity} onRetry={(job) => void retry(job)} />}
      interactionLock={sceneStillsLocked ? {
        label: activeSceneStillsJob ? '正在渲染分镜关键帧' : '正在准备关键帧任务',
        detail: `已锁定分镜 ${String(lockedScene + 1).padStart(2, '0')}，完成后自动恢复编辑`,
        progress: sceneStillsProgress,
      } : undefined}
    />
    {newProjectModal}
  </>;
};
