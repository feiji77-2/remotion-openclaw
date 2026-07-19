// src/tools/console/App.tsx
import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {compileProject} from '../../project/compileProject';
import {VideoProjectSchema, type VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';
import {theme} from './theme';
import type {
  ProjectOption, RunnerStatus, ContractKey, StudioFile, RunnerJob,
  ActivityEvent, DraftScript, Tone, SceneTimeline, CreateProjectResult, CreateProjectError,
} from './types';
import {
  checkHealth, loadProjects, loadStudioFile, saveFile,
  startJob, pollJob, normalizeLoadedProject, cloneProject, filePathFor,
} from './api';
import {Topbar} from './Topbar';
import {IconNav} from './IconNav';
import {LeftPanel} from './LeftPanel';
import {CenterPanel} from './CenterPanel';
import {RightPanel} from './RightPanel';
import {TimelineDock} from './TimelineDock';
import {FullPreview} from './FullPreview';
import {StoryboardView} from './StoryboardView';
import {AssetManager} from './AssetManager';
import {SettingsPanel} from './SettingsPanel';
import {NewProjectModal} from './NewProjectModal';
import './index.css';

const nowTime = () => new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});

const fallbackProjects: ProjectOption[] = [
  {id: 'examples-project', title: '默认 Project JSON 样片', productionPath: 'examples', projectJsonPath: 'examples/project.json', outputVideoPath: 'out/examples-project.mp4'},
  {id: '2026-07-17-pipeline-smoke', title: 'AI Agent 如何改变工作流', productionPath: 'projects/2026-07-17-pipeline-smoke', projectJsonPath: 'projects/2026-07-17-pipeline-smoke/project.json', outputVideoPath: 'out/2026-07-17-pipeline-smoke.mp4'},
];

const defaultScriptFor = (project: VideoProject): DraftScript => {
  const first = project.scenes[0]?.payload ?? {};
  const title = String(first.title ?? project.title ?? 'AI Agent 如何改变工作流');
  const captionText = project.captions.map((c) => c.text).join('');
  return {
    topic: project.title || title,
    hook: '先用一句反常识开场，让观众意识到工作流正在变化。',
    viewpoint: 'AI Agent 真正改变的是工作流所有权，不只是生成内容。',
    pain: '过去我们花很多时间不是在创造，而是在推动流程、催进度、对齐状态。',
    solution: '把目标、上下文和验收标准交给 Agent，让它自己组织步骤并交付结果。',
    selectedTitle: title,
    titles: [title, '别再管流程了，AI 已经能自己交付', '未来工作流，只剩目标和验收'],
    script: captionText || `${title}\n\n你有没有发现，过去我们花很多时间不是在创造，而是在推动流程？`,
    keywords: 'Agent，工作流，自动化，结果验收，团队协作，生产效率',
  };
};

export const App: React.FC = () => {
  // ── State ──
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>('checking');
  const [projects, setProjects] = useState<ProjectOption[]>(fallbackProjects);
  const [selectedProject, setSelectedProject] = useState<ProjectOption>(fallbackProjects[0]);
  const [activeTab, setActiveTab] = useState('production');
  const [project, setProject] = useState<VideoProject>(() => cloneProject(DEFAULT_VIDEO_PROJECT));
  const [draft, setDraft] = useState<DraftScript>(() => defaultScriptFor(DEFAULT_VIDEO_PROJECT));
  const [files, setFiles] = useState<Record<ContractKey, StudioFile | null>>({
    'brief.json': null, 'script-pack.json': null, 'asset-pack.json': null, 'project.json': null,
  });
  const [jobs, setJobs] = useState<Record<string, RunnerJob>>({});
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityEvent[]>([
    {id: 'boot', time: nowTime(), tone: 'info', text: '制作台已打开，等待载入项目合同。'},
  ]);

  // ── P1: 新建项目状态 ──
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectCreateStatus, setProjectCreateStatus] = useState<{
    phase: 'idle' | 'creating';
    error: string | null;
  }>({phase: 'idle', error: null});

  // ── P4: Draft dirty state (full fingerprint) ──
  const [lastSavedDraft, setLastSavedDraft] = useState<string>('');
  const draftDirty = useMemo(() => {
    if (!files['brief.json']?.exists && !files['script-pack.json']?.exists) return true;
    const currentFingerprint = [
      draft.topic, draft.hook, draft.viewpoint, draft.pain, draft.solution,
      draft.selectedTitle, ...draft.titles, draft.script, draft.keywords,
    ].join('|||');
    return currentFingerprint !== lastSavedDraft;
  }, [draft, files, lastSavedDraft]);

  // ── Memoized ──
  const compiled = useMemo(() => {
    try {
      return {project: compileProject(project), error: null as string | null};
    } catch (error) {
      return {project: null, error: error instanceof Error ? error.message : String(error)};
    }
  }, [project]);

  const visibleJob = activeJobId ? jobs[activeJobId] : Object.values(jobs).sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;
  const totalFrames = project.scenes.reduce((t, s) => t + s.durationInFrames, 0);
  const totalSeconds = Math.round(totalFrames / project.render.fps * 10) / 10;
  const scriptSeconds = Math.max(totalSeconds, Math.round(draft.script.length / 7));

  const timeline: SceneTimeline[] = project.scenes.map((scene, index) => {
    const start = project.scenes.slice(0, index).reduce((t, item) => t + item.durationInFrames, 0);
    return {scene, start, end: start + scene.durationInFrames};
  });

  // ── Callbacks ──
  const pushActivity = useCallback((text: string, tone: Tone = 'info') => {
    setActivity((current) => [
      {id: `${Date.now()}-${Math.random()}`, time: nowTime(), tone, text},
      ...current,
    ].slice(0, 8));
  }, []);

  const refreshContracts = useCallback(async (projectOption: ProjectOption) => {
    const keyOrder: ContractKey[] = ['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json'];
    const entries = await Promise.all(
      keyOrder.map(async (key) => [key, await loadStudioFile(filePathFor(projectOption, key))] as const),
    );
    setFiles(Object.fromEntries(entries) as Record<ContractKey, StudioFile>);
    const normalized = normalizeLoadedProject(entries.find(([k]) => k === 'project.json')?.[1].data);
    setProject(normalized.project);
    setDraft(defaultScriptFor(normalized.project));
    const d = defaultScriptFor(normalized.project);
    setLastSavedDraft([d.topic, d.hook, d.viewpoint, d.pain, d.solution, d.selectedTitle, ...d.titles, d.script, d.keywords].join('|||'));
    if (!normalized.ok) {
      const detail = normalized.diagnostics
        .map((d) => `${d.path}: ${d.message}`)
        .slice(0, 3)
        .join('；');
      pushActivity(`项目 JSON 校验失败，已回退默认合同。${normalized.diagnostics.length} 处错误${
        detail ? `（${detail}${normalized.diagnostics.length > 3 ? '…' : ''}）` : ''
      }`, 'danger');
    } else {
      pushActivity(`已载入 ${projectOption.title}。`, 'success');
    }
  }, [pushActivity]);

  const selectProject = useCallback(async (projectOption: ProjectOption) => {
    setSelectedProject(projectOption);
    setStillUrl(null);
    setVideoUrl(null);
    await refreshContracts(projectOption);
  }, [refreshContracts]);

  const saveProductionScript = useCallback(async (nextDraft = draft) => {
    const brief = files['brief.json']?.data && typeof files['brief.json']?.data === 'object'
      ? {...files['brief.json']?.data as Record<string, unknown>} : {};
    const scriptPack = files['script-pack.json']?.data && typeof files['script-pack.json']?.data === 'object'
      ? {...files['script-pack.json']?.data as Record<string, unknown>} : {};
    const topic = nextDraft.topic.trim() || project.title || selectedProject.id;
    const selectedViewpoint = nextDraft.viewpoint.trim() || '这条视频要把复杂变化讲成可执行的方法。';
    const payloads: Array<[string, unknown]> = [
      [filePathFor(selectedProject, 'brief.json'), {
        productionId: selectedProject.id, title: topic,
        primaryLink: brief.primaryLink ?? '', platform: brief.platform ?? 'douyin',
        format: brief.format ?? {width: 1920, height: 1080, fps: 30, maxDurationSeconds: 180},
        audience: brief.audience ?? ['AI 从业者', '产品经理', '创业者'],
        contentType: brief.contentType ?? '技术教程', tone: brief.tone ?? '技术布道',
        structure: brief.structure ?? '钩子 -> 痛点 -> 方案 -> 步骤 -> 结论',
        visualStyle: brief.visualStyle ?? {palette: '蓝绿 AI 感', subtitles: '固定字幕样式', branding: '第一阶段不做强品牌化'},
        research: brief.research ?? {sourcePriority: ['官方文档/官网', 'GitHub/论文/发布页'], socialPolicy: '只当线索，不当证据'},
        viewpointCandidates: [{id: 'view-1', claim: selectedViewpoint, whyItMatters: '作为本片主观点。'}],
        selectedViewpointId: 'view-1',
      }],
      [filePathFor(selectedProject, 'script-pack.json'), {
        productionId: selectedProject.id, title: nextDraft.selectedTitle.trim() || topic,
        hook: nextDraft.hook.trim(), selectedViewpoint, pain: nextDraft.pain.trim(),
        solution: nextDraft.solution.trim(), spokenScript: nextDraft.script.trim(),
        keywords: nextDraft.keywords,
      }],
    ];
    for (const [path, data] of payloads) {
      if (!await saveFile(path, data)) {
        pushActivity(`保存失败：${path}`, 'danger');
        return false;
      }
    }
    const nextProject = {...project, title: topic};
    const parsed = VideoProjectSchema.safeParse(nextProject);
    if (parsed.success) {
      await saveFile(selectedProject.projectJsonPath, parsed.data);
      setProject(parsed.data);
    }
    await refreshContracts(selectedProject);
    setDraft(nextDraft);
    setLastSavedDraft([nextDraft.topic, nextDraft.hook, nextDraft.viewpoint, nextDraft.pain, nextDraft.solution, nextDraft.selectedTitle, ...nextDraft.titles, nextDraft.script, nextDraft.keywords].join('|||'));
    pushActivity('选题和文案已保存到 brief/script-pack。', 'success');
    return true;
  }, [draft, files, project, refreshContracts, pushActivity, selectedProject]);

  const runCommand = useCallback(async (commandId: string, label: string) => {
    if (runnerStatus !== 'online') {
      pushActivity('执行器离线，先启动 tools:api 或 tools:studio。', 'danger');
      return;
    }
    if (commandId === 'build-project') {
      const saved = await saveProductionScript();
      if (!saved) return;
    }
    const result = await startJob(commandId, label, selectedProject);
    if (!result) {
      pushActivity(`任务启动失败`, 'danger');
      return;
    }
    setJobs((current) => ({...current, [result.job.id]: result.job}));
    setActiveJobId(result.job.id);
    setLogOpen(true);
    pushActivity(`已启动：${label}`, 'info');

    const poll = async () => {
      const job = await pollJob(result.job.id);
      setJobs((current) => ({...current, [result.job.id]: job}));
      if (job.status === 'running') {
        setTimeout(poll, 900);
        return;
      }
      if (job.status === 'done') {
        if (job.artifact?.kind === 'image' && job.artifact.url) setStillUrl(`${window.location.protocol === 'https:' ? 'https' : 'http'}://127.0.0.1:8787${job.artifact.url}`);
        if (job.artifact?.kind === 'video' && job.artifact.url) setVideoUrl(`${window.location.protocol === 'https:' ? 'https' : 'http'}://127.0.0.1:8787${job.artifact.url}`);
        if (commandId === 'build-project') await refreshContracts(selectedProject);
        pushActivity(`${label} 已完成。`, 'success');
      } else {
        pushActivity(`${label} 失败，请查看日志。`, 'danger');
      }
    };
    setTimeout(poll, 900);
  }, [runnerStatus, saveProductionScript, selectedProject, pushActivity, refreshContracts]);

  const saveProject = useCallback(async () => {
    const nextProject = {...project, title: draft.topic.trim() || project.title};
    const parsed = VideoProjectSchema.safeParse(nextProject);
    if (!parsed.success) {
      pushActivity(`保存被阻止：${parsed.error.issues[0]?.message ?? 'Project JSON 不合法'}`, 'danger');
      return false;
    }
    if (await saveFile(selectedProject.projectJsonPath, parsed.data)) {
      setProject(parsed.data);
      pushActivity('project.json 已保存。', 'success');
      return true;
    }
    pushActivity(`保存失败`, 'danger');
    return false;
  }, [project, draft.topic, selectedProject, pushActivity]);

  const navigateToStep = useCallback((stepIndex: number) => {
    // Map FlowSteps index to tabs/sections
    switch (stepIndex) {
      case 0: // 选题 Brief
      case 1: // 标题/口播
        setActiveTab('production');
        break;
      case 2: // 素材检查
        setActiveTab('assets');
        break;
      case 3: // 配音/字幕
        setActiveTab('production');
        break;
      case 4: // 分镜编排
        setActiveTab('storyboard');
        break;
      case 5: // 关键帧验收
        runCommand('project-still', '生成关键帧');
        break;
      case 6: // 成片输出
        runCommand('project-render', '渲染视频');
        break;
    }
  }, [runCommand]);

  // ── P1: 新建项目 ──
  const handleCreateProject = useCallback(async (result: CreateProjectResult) => {
    setShowNewProjectModal(false);
    setProjectCreateStatus({phase: 'idle', error: null});
    // Refresh project list from server
    const loaded = await loadProjects();
    if (loaded.length > 0) {
      setProjects(loaded);
      // Find and select the newly created project
      const created = loaded.find((p) => p.id === result.project.id);
      if (created) {
        await selectProject(created);
        pushActivity(`项目 ${created.title} 已创建。`, 'success');
      } else {
        pushActivity('项目已创建但未找到，请刷新。', 'warning');
      }
    }
  }, [selectProject, pushActivity]);

  const handleCreateProjectError = useCallback((message: string) => {
    setProjectCreateStatus({phase: 'idle', error: message});
    pushActivity(`项目创建失败：${message}`, 'danger');
  }, [pushActivity]);

  // ── Effects ──
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const status = await checkHealth();
      if (!cancelled) setRunnerStatus(status);
    };
    tick();
    const interval = window.setInterval(tick, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const loaded = await loadProjects();
      if (cancelled) return;
      if (loaded.length > 0) {
        setProjects(loaded);
        setSelectedProject(loaded[0]);
        await refreshContracts(loaded[0]);
        setInitialized(true);
      }
    };
    if (!initialized && runnerStatus === 'online') {
      init();
    }
    return () => { cancelled = true; };
  }, [runnerStatus, initialized, refreshContracts]);

  // ── Layout shell ──
  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg.base}}>
      <Topbar
        project={selectedProject}
        projects={projects}
        runnerStatus={runnerStatus}
        onSelectProject={selectProject}
        onRunCommand={runCommand}
        onToggleLog={() => setLogOpen(!logOpen)}
      />

      <div style={{display: 'flex', flex: 1, minHeight: 0}}>
        <IconNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {activeTab === 'production' && (
          <div style={{display: 'flex', flex: 1, minWidth: 0}}>
            <LeftPanel
              files={files}
              totalFrames={totalFrames}
              fps={project.render.fps}
              onStepClick={navigateToStep}
              onNewProject={() => {
                setProjectCreateStatus({phase: 'idle', error: null});
                setShowNewProjectModal(true);
              }}
            />
            <CenterPanel
              draft={draft}
              onSetDraft={setDraft}
              scriptSeconds={scriptSeconds}
              onSaveScript={() => saveProductionScript()}
              onRunCommand={runCommand}
              timeline={timeline}
              totalFrames={totalFrames}
              fps={project.render.fps}
              project={project}
              files={files}
              compiled={compiled}
              stillUrl={stillUrl}
              videoUrl={videoUrl}
              runnerOnline={runnerStatus === 'online'}
              draftDirty={draftDirty}
            />
            <RightPanel
              compiled={compiled}
              stillUrl={stillUrl}
              videoUrl={videoUrl}
              timeline={timeline}
              project={project}
              totalFrames={totalFrames}
              onRunCommand={runCommand}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <FullPreview
            compiled={compiled}
            project={project}
            stillUrl={stillUrl}
            videoUrl={videoUrl}
            totalFrames={totalFrames}
            onRunCommand={runCommand}
          />
        )}

        {activeTab === 'storyboard' && (
          <StoryboardView timeline={timeline} project={project} totalFrames={totalFrames} fps={project.render.fps} />
        )}

        {activeTab === 'assets' && (
          <AssetManager files={files} project={project} onRunCommand={runCommand} />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel project={project} draft={draft} selectedProject={selectedProject} onSaveProject={saveProject} />
        )}
      </div>

      <TimelineDock
        totalFrames={totalFrames}
        fps={project.render.fps}
        timeline={timeline}
        project={project}
        visibleJob={visibleJob}
        logOpen={logOpen}
        activity={activity}
        onRunCommand={runCommand}
      />

      {/* P1: New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreated={handleCreateProject}
          onError={handleCreateProjectError}
        />
      )}

      {/* P1: Create project error banner */}
      {projectCreateStatus.error && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          padding: '10px 20px',
          borderRadius: 8,
          background: `${theme.accent.red}22`,
          border: `1px solid ${theme.accent.red}44`,
          color: theme.accent.red,
          fontSize: 10,
          fontWeight: 600,
          maxWidth: '80vw',
        }}>
          {projectCreateStatus.error}
        </div>
      )}
    </div>
  );
};
