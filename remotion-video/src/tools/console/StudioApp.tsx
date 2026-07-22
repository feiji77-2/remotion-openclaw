import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {compileProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';
import {STYLE_PRESETS, type StylePresetId} from '../../styles/video-gen/style-presets';
import {
  artifactUrl, checkHealth, cloneProject, createProject, filePathFor, loadJobs, loadProjectState,
  loadProjects, loadRemoteComponentLibrary, loadSceneStillsManifest, loadStudioFile, normalizeLoadedProject, pollJob, retryJob, saveFile, startJob, StudioApiError,
} from './api';
import {ComponentLibraryWorkspace} from './ComponentLibraryWorkspace';
import {ComponentPreviewCanvas} from './ComponentPreviewCanvas';
import {CopyWorkshop} from './CopyWorkshop';
import {DeveloperDrawer} from './DeveloperDrawer';
import {NewProjectModal} from './NewProjectModal';
import {PreviewCanvas} from './PreviewCanvas';
import {ProductionStepper, type StepId, type StepStatus} from './ProductionStepper';
import {RenderWorkspace} from './RenderWorkspace';
import {SceneTimeline} from './SceneTimeline';
import {ScriptWorkspace} from './ScriptWorkspace';
import {sceneTitle} from './scene-labels';
import {StoryboardFrameCanvas} from './StoryboardFrameCanvas';
import {StoryboardWorkspace} from './StoryboardWorkspace';
import {StudioShell} from './StudioShell';
import {StyleCard} from './StyleCard';
import {VideoLibrary} from './VideoLibrary';
import type {ActivityEvent, ContractKey, DraftScript, ProjectOption, ProjectState, RunnerJob, RunnerStatus, SceneStillsManifest, StudioFile, Tone} from './types';
import type {ComponentLibraryItem} from './component-library-model';
import {LOCAL_SCENE_COMPONENTS} from './component-library-model';
import {invalidateProductionArtifacts, navigationState, requestCopyTransfer, usesSceneTimeline, usesWideEditor, type PendingCopyTransfer} from './workflow-model';
import './index.css';

const FALLBACK: ProjectOption = {id: 'skill-showcase', title: 'Skill Showcase 样片', productionPath: 'examples', projectJsonPath: 'examples/skill-showcase.json', outputVideoPath: 'out/workbuddy-six-skills-showcase-v3.mp4'};
const SELECTED_PROJECT_STORAGE_KEY = 'video-factory:selected-project-id:v2';
const contractKeys: ContractKey[] = ['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json'];
const scriptKey = (draft: DraftScript) => [draft.topic, draft.hook, draft.viewpoint, draft.pain, draft.solution, draft.selectedTitle, draft.script, draft.keywords].join('\u0001');
const now = () => new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stringOf = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const styleIdOf = (value: unknown): StylePresetId => STYLE_PRESETS.some((style) => style.id === value) ? value as StylePresetId : 'cyan-tech';
const projectTimestamp = (option: ProjectOption) => Number(option.id.match(/^video-(\d+)/)?.[1] || 0);
const componentLayoutSignature = (componentId: string) => `library:${componentId.replace(/[^a-z0-9:_-]/gi, '-').slice(0, 54)}`;
const preferredWritableProject = (items: ProjectOption[]) => [...items]
  .filter((item) => item.productionPath.startsWith('projects/'))
  .sort((left, right) => projectTimestamp(right) - projectTimestamp(left) || right.id.localeCompare(left.id))[0] || null;

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
  const [remoteComponents, setRemoteComponents] = useState<ComponentLibraryItem[]>([]);
  const [componentLibraryLoading, setComponentLibraryLoading] = useState(false);
  const [componentLibraryWarning, setComponentLibraryWarning] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState(LOCAL_SCENE_COMPONENTS[0]?.id || null);
  const [selectedScene, setSelectedScene] = useState(0);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [sceneEditSaving, setSceneEditSaving] = useState(false);
  const [issue, setIssue] = useState<{title: string; diagnostics: RunnerJob['diagnostics']}>({title: '', diagnostics: []});
  const openNewProject = useCallback(() => { setScreen('studio'); setShowNewProjectModal(true); }, []);

  const compiled = useMemo(() => {
    try { return {project: compileProject(project), error: null as string | null}; }
    catch (error) { return {project: null, error: error instanceof Error ? error.message : String(error)}; }
  }, [project]);
  const totalFrames = project.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);
  const writable = selectedProject.productionPath.startsWith('projects/');
  const draftDirty = scriptKey(draft) !== lastSavedDraft;
  const styleDirty = candidateStyleId !== null && candidateStyleId !== savedStyleId;
  const productionInputsDirty = draftDirty || styleDirty;
  const activeJob = state?.activeJob || jobs.find((job) => job.status === 'running') || null;
  const previewStage = state?.stages.sceneStills?.status ? state.stages.sceneStills : state?.stages.preview;
  const videoVersion = [state?.stages.render.finishedAt, state?.updatedAt].filter(Boolean).join(':') || null;
  const videoUrl = state?.stages.render.status === 'current' && state.stages.render.path ? artifactUrl(state.stages.render.path, videoVersion) : null;
  const recentRenderJob = jobs.find((job) => job.commandId === 'render-verify') || null;
  const componentLibrary = useMemo(() => [...LOCAL_SCENE_COMPONENTS, ...remoteComponents], [remoteComponents]);
  const selectedComponent = useMemo(() => componentLibrary.find((component) => component.id === selectedComponentId) || componentLibrary[0] || null, [componentLibrary, selectedComponentId]);

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
    setSelectedProject(option); setCurrentStep('script'); setIssue({title: '', diagnostics: []});
    rememberProjectId(option.id);
    await refreshProject(option);
    pushActivity(`已切换至 ${option.title}`, 'success');
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

  const saveSceneEdit = useCallback(async (sceneIndex: number, payload: Record<string, unknown>) => {
    if (!writable) {
      setIssue({title: '样例项目不可编辑分镜', diagnostics: []});
      return;
    }
    const scene = project.scenes[sceneIndex];
    if (!scene) {
      setIssue({title: '当前分镜不存在', diagnostics: []});
      return;
    }
    const nextProject = cloneProject(project);
    nextProject.scenes[sceneIndex] = {...scene, payload};
    try {
      setSceneEditSaving(true);
      const saved = await saveFile(filePathFor(selectedProject, 'project.json'), nextProject);
      setProject(nextProject);
      setFiles((current) => ({...current, 'project.json': saved}));
      markProductionArtifactsStale();
      await refreshState(selectedProject);
      pushActivity(`分镜 ${String(sceneIndex + 1).padStart(2, '0')} 修改已保存`, 'success');
    } catch (error) {
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '分镜保存失败', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '分镜保存失败', 'danger');
    } finally {
      setSceneEditSaving(false);
    }
  }, [markProductionArtifactsStale, project, pushActivity, refreshState, selectedProject, writable]);

  const applyComponentToScene = useCallback(async (component: ComponentLibraryItem) => {
    const sceneIndex = project.scenes.length > 0 ? Math.min(Math.max(selectedScene, 0), project.scenes.length - 1) : 0;
    const scene = project.scenes[sceneIndex];
    if (!scene) {
      setIssue({title: '当前没有可应用组件的分镜', diagnostics: []});
      return;
    }
    const previousEditor = recordOf(scene.payload.sceneEditor);
    const nextPayload = {
      ...scene.payload,
      variant: component.renderer.variant,
      visualMode: component.renderer.visualMode,
      heroStyle: component.renderer.heroStyle,
      title: stringOf(scene.payload.title, sceneTitle(scene)),
      subtitle: stringOf(scene.payload.subtitle, stringOf(scene.payload.body, component.description)).slice(0, 120),
      body: stringOf(scene.payload.body, stringOf(scene.payload.subtitle, component.description)).slice(0, 120),
      accent: stringOf(scene.payload.accent, component.source === 'hyperframes' ? '#d9642a' : '#2e6b63'),
      layoutSignature: componentLayoutSignature(component.id),
      sceneEditor: {
        ...previousEditor,
        componentId: component.id,
        source: component.source,
        sourceComponentId: component.sourceId,
        rendererComponentId: component.renderer.componentId,
        componentLabel: component.label,
        componentCategory: component.category,
        orientation: component.orientation,
        blocks: ['background', 'component', 'caption'],
        updatedAt: new Date().toISOString(),
      },
    };
    await saveSceneEdit(sceneIndex, nextPayload);
    pushActivity(`组件 ${component.label} 已应用到分镜 ${String(sceneIndex + 1).padStart(2, '0')}`, 'success');
  }, [project, pushActivity, saveSceneEdit, selectedScene]);

  const prepareCopyTransfer = useCallback(() => {
    try {
      setPendingCopyTransfer(requestCopyTransfer({savedText: savedCopyText, savedAt: copySavedAt}));
      pushActivity('草稿已准备转入口播文案', 'info');
    } catch (error) {
      setIssue({title: error instanceof Error ? error.message : '请先保存草稿', diagnostics: []});
    }
  }, [copySavedAt, pushActivity, savedCopyText]);

  const changeStep = useCallback((nextStep: StepId) => {
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
  }, [currentStep, pendingCopyTransfer, pushActivity]);

  const buildInputs = useCallback(() => {
    const previousBrief = recordOf(files['brief.json']?.data);
    const previousVisualStyle = recordOf(previousBrief.visualStyle);
    const brief = {
      ...previousBrief,
      productionId: selectedProject.id,
      title: draft.topic || draft.selectedTitle || selectedProject.title,
      visualStyle: {...previousVisualStyle, presetId: candidateStyleId ?? savedStyleId},
      viewpointCandidates: [{id: 'v1', claim: draft.viewpoint || '核心观点', whyItMatters: ''}], selectedViewpointId: 'v1',
    };
    const previousScript = recordOf(files['script-pack.json']?.data);
    const scriptPack = {...previousScript, productionId: selectedProject.id, title: draft.selectedTitle || draft.topic, hook: draft.hook, selectedViewpoint: draft.viewpoint, pain: draft.pain, solution: draft.solution, spokenScript: draft.script, keywords: draft.keywords};
    return [{path: filePathFor(selectedProject, 'brief.json'), data: brief}, {path: filePathFor(selectedProject, 'script-pack.json'), data: scriptPack}];
  }, [candidateStyleId, draft, files, savedStyleId, selectedProject]);

  const waitForTerminalJob = useCallback(async (started: RunnerJob) => {
    let next = started;
    while (next.status === 'running') {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      next = await pollJob(started.id);
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
    const build = await startJob('build-check', label, option, saveInputs ? buildInputs() : undefined);
    setJobs((items) => [build.job, ...items.filter((item) => item.id !== build.job.id)]);
    pushActivity(`${label}已启动`, 'info');
    const finishedBuild = await waitForTerminalJob(build.job);
    if (finishedBuild.status !== 'done') return {ok: false, job: finishedBuild};
    const nextProject = await refreshBuiltProject(finishedBuild.project);
    pushActivity('分镜结构已更新', 'success');
    return {ok: true, project: nextProject};
  }, [buildInputs, pushActivity, refreshBuiltProject, waitForTerminalJob]);

  const followJob = useCallback(async (started: RunnerJob, commandId: string) => {
    const next = await waitForTerminalJob(started);
    setWorking(false);
    if (next.status === 'done') {
      if (commandId === 'build-check') { await refreshBuiltProject(started.project); setCurrentStep('storyboard'); }
      pushActivity(`${started.label}完成`, 'success');
    } else {
      setIssue({title: `${started.label}失败`, diagnostics: next.diagnostics});
      pushActivity(`${started.label}失败`, 'danger');
    }
  }, [pushActivity, refreshBuiltProject, waitForTerminalJob]);

  const runSceneStills = useCallback(async () => {
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return; }
    try {
      setWorking(true); setIssue({title: '', diagnostics: []});
      let projectForStills = selectedProject;
      if (writable && (productionInputsDirty || state?.stages.project.status !== 'current')) {
        const built = await ensureBuiltProject(selectedProject, {
          label: productionInputsDirty ? '保存并更新分镜' : '更新分镜结构',
          saveInputs: productionInputsDirty,
        });
        if (!built.ok) {
          setIssue({title: productionInputsDirty ? '保存并更新分镜失败' : '更新分镜结构失败', diagnostics: built.job.diagnostics});
          pushActivity('更新分镜结构失败', 'danger');
          setWorking(false);
          return;
        }
        projectForStills = built.project;
      }
      const stills = await startJob('project-scene-stills', '生成分镜画面', projectForStills);
      setJobs((items) => [stills.job, ...items.filter((item) => item.id !== stills.job.id)]);
      pushActivity('生成分镜画面已启动', 'info');
      const finishedStills = await waitForTerminalJob(stills.job);
      setWorking(false);
      if (finishedStills.status === 'done') {
        await refreshState(projectForStills);
        pushActivity('分镜画面完成', 'success');
      } else {
        setIssue({title: '生成分镜画面失败', diagnostics: finishedStills.diagnostics});
        pushActivity('生成分镜画面失败', 'danger');
      }
    } catch (error) {
      setWorking(false);
      const apiError = error as StudioApiError;
      setIssue({title: apiError.message || '任务无法启动', diagnostics: apiError.diagnostics || []});
      pushActivity(apiError.message || '任务无法启动', 'danger');
    }
  }, [ensureBuiltProject, productionInputsDirty, pushActivity, refreshState, runnerStatus, selectedProject, state?.stages.project.status, waitForTerminalJob, writable]);

  const runJob = useCallback(async (commandId: 'build-check' | 'project-scene-stills' | 'render-verify', label: string, includeInputs = false) => {
    if (runnerStatus !== 'online') { setIssue({title: '本地执行器未启动', diagnostics: []}); return; }
    try {
      setWorking(true); setIssue({title: '', diagnostics: []});
      let projectForCommand = selectedProject;
      let shouldIncludeInputs = includeInputs;
      if (commandId === 'render-verify' && writable && (productionInputsDirty || state?.stages.project.status !== 'current')) {
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
  }, [buildInputs, ensureBuiltProject, followJob, productionInputsDirty, pushActivity, runnerStatus, selectedProject, state?.stages.project.status, writable]);

  const retry = useCallback(async (job: RunnerJob) => {
    try {
      setWorking(true); const result = await retryJob(job.id); setJobs((items) => [result.job, ...items]); void followJob(result.job, result.job.commandId);
    } catch (error) { setWorking(false); const apiError = error as StudioApiError; setIssue({title: apiError.message, diagnostics: apiError.diagnostics}); }
  }, [followJob]);

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
        if (!result.available) setComponentLibraryWarning(`未找到 HyperFrames 动效库：${result.sourceRoot}`);
        else if (result.warning) setComponentLibraryWarning(result.warning);
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
      pushActivity('项目已创建，等待更新分镜', 'success');
    }}
    onError={(message) => setIssue({title: message, diagnostics: []})}
  /> : null;

  if (screen === 'library') {
    return <><VideoLibrary onBack={() => setScreen('studio')} onOpenProject={(projectId) => { const next = projects.find((item) => item.id === projectId); if (next) void selectProject(next); setScreen('studio'); }} />{newProjectModal}</>;
  }

  const stepStatus: Record<StepId, StepStatus> = {
    copy: copyText !== savedCopyText ? 'draft' : copySavedAt ? 'current' : 'missing',
    script: working && activeJob?.commandId === 'build-check' ? 'running' : draftDirty ? 'draft' : 'current',
    style: styleDirty ? 'draft' : 'current', storyboard: working && activeJob?.commandId === 'build-check' ? 'running' : state?.stages.project.status || 'missing',
    preview: working && activeJob?.commandId === 'project-scene-stills' ? 'running' : previewStage?.status || 'missing',
    render: working && activeJob?.commandId === 'render-verify' ? 'running' : state?.stages.render.status || 'missing',
    deliver: state?.deliveryReady ? 'ready' : state?.stages.verify.status || 'missing',
    components: 'current',
  };
  const navigation = navigationState({
    hasProject: Boolean(selectedProject.id),
    scriptReady: draft.script.trim().length >= 20 && !productionInputsDirty,
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
            selectedScene={selectedScene}
            sceneStills={sceneStills}
            state={state}
            activeJob={activeJob}
            fps={project.render.fps}
          />
        : <PreviewCanvas compiled={compiled} project={project} state={state} selectedScene={selectedScene} projectTitle={selectedProject.title} videoUrl={videoUrl} />;

  return <>
    <StudioShell
      header={<div className="header-content">
        <div className="product-lockup"><span className="product-mark">VF</span><span>Video Factory</span><small>AI 视频生产台</small></div>
        <div className="header-project"><span>当前项目</span><select aria-label="当前项目" value={selectedProject.projectJsonPath} onChange={(event) => { const next = projects.find((item) => item.projectJsonPath === event.target.value); if (next) void selectProject(next); }}>{projects.map((item) => <option key={item.projectJsonPath} value={item.projectJsonPath}>{item.title}</option>)}</select></div>
        <div className={`runner-status is-${runnerStatus}`}><i /><span>{runnerStatus === 'online' ? '执行器在线' : runnerStatus === 'checking' ? '连接执行器' : '执行器离线'}</span></div>
        <div className="header-actions"><button className="new-project" type="button" onClick={openNewProject}>+ 新建视频</button></div>
      </div>}
      stepper={<ProductionStepper currentStep={currentStep} onStepClick={changeStep} onOpenVideoLibrary={() => setScreen('library')} status={stepStatus} navigation={navigation} />}
      preview={preview}
      previewLabel={previewLabel}
      workspace={<>
        {issue.title && <section className="issue-panel"><div><strong>{issue.title}</strong>{issue.diagnostics.slice(0, 2).map((diagnostic, index) => <p key={`${diagnostic.code}-${index}`}>{diagnostic.path ? `${diagnostic.path}: ` : ''}{diagnostic.message}</p>)}</div><button type="button" onClick={() => setIssue({title: '', diagnostics: []})}>关闭</button></section>}
        {currentStep === 'copy' && <CopyWorkshop projectTitle={selectedProject.title} text={copyText} savedText={savedCopyText} savedAt={copySavedAt} writable={writable} saving={copySaving} transferPending={Boolean(pendingCopyTransfer)} onChange={setCopyText} onSave={() => void saveCopyDraft()} onTransfer={prepareCopyTransfer} />}
        {currentStep === 'script' && <ScriptWorkspace draft={draft} dirty={draftDirty} writable={writable} saving={working} onSetDraft={setDraft} onBuild={() => void runJob('build-check', '保存并更新分镜', true)} />}
        {currentStep === 'style' && <div className="workspace-panel style-workspace"><div className="workspace-heading"><div><span className="workspace-kicker">02 / 视觉系统</span><h1>风格</h1></div><span className={`state-chip ${styleDirty ? 'is-stale' : 'is-current'}`}>{styleDirty ? '待应用' : '已应用'}</span></div><p className="workspace-copy">风格只定义色彩、字体、节奏和版式规则，不播放项目镜头。确认应用后才会重新生成分镜结构。</p>{!writable && <div className="notice notice--neutral">样例项目为只读输入。</div>}<StyleCard presets={STYLE_PRESETS} candidate={candidateStyleId} applied={savedStyleId} disabled={!writable} onSelect={setCandidateStyleId} /><button className="primary-action" type="button" disabled={!writable || working || !styleDirty} onClick={() => void runJob('build-check', '应用风格并更新分镜', true)}>{working ? '正在应用风格' : styleDirty ? '应用候选风格' : candidateStyleId === savedStyleId ? '当前风格已应用' : '先选择一个风格'}</button></div>}
        {currentStep === 'storyboard' && <StoryboardWorkspace project={project} fps={project.render.fps} selectedScene={selectedScene} state={state} sceneStills={sceneStills} runnerOnline={runnerStatus === 'online'} busy={Boolean(activeJob)} writable={writable} saving={sceneEditSaving} onSaveScene={saveSceneEdit} onRenderSceneStills={() => void runSceneStills()} />}
        {currentStep === 'render' && <RenderWorkspace mode="render" state={state} videoUrl={videoUrl} runnerOnline={runnerStatus === 'online'} activeJob={activeJob} recentJob={recentRenderJob} onRun={(command) => void runJob(command, '生成最终视频')} totalFrames={totalFrames} fps={project.render.fps} sceneCount={project.scenes.length} />}
        {currentStep === 'deliver' && <RenderWorkspace mode="deliver" state={state} videoUrl={videoUrl} runnerOnline={runnerStatus === 'online'} activeJob={activeJob} recentJob={recentRenderJob} onRun={(command) => void runJob(command, '生成最终视频')} totalFrames={totalFrames} fps={project.render.fps} sceneCount={project.scenes.length} />}
        {currentStep === 'components' && <ComponentLibraryWorkspace components={componentLibrary} loading={componentLibraryLoading} warning={componentLibraryWarning} selectedId={selectedComponent?.id || null} selectedScene={selectedScene} project={project} writable={writable} saving={sceneEditSaving} onSelect={setSelectedComponentId} onApply={(component) => void applyComponentToScene(component)} />}
      </>}
      timeline={showSceneTimeline ? <SceneTimeline project={project} totalFrames={totalFrames} fps={project.render.fps} selectedScene={selectedScene} sceneStills={sceneStills} stillsRendering={activeJob?.commandId === 'project-scene-stills'} onSelectScene={setSelectedScene} /> : undefined}
      wideWorkspace={wideWorkspace}
      drawer={<DeveloperDrawer jobs={jobs} activity={activity} onRetry={(job) => void retry(job)} />}
    />
    {newProjectModal}
  </>;
};
