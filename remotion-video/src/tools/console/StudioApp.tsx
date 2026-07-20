// src/tools/console/StudioApp.tsx
// R1: 产品级视频生产台 — 主状态管理
import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {compileProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';
import type {
  ProjectOption, RunnerStatus, ContractKey, StudioFile, RunnerJob,
  ActivityEvent, DraftScript,
} from './types';
import {
  checkHealth, loadProjects, loadStudioFile, saveFile,
  startJob, pollJob, normalizeLoadedProject, cloneProject, filePathFor, runnerBaseUrl,
} from './api';
import {StudioShell} from './StudioShell';
import {PreviewCanvas} from './PreviewCanvas';
import {ProductionStepper, defaultStepStatus} from './ProductionStepper';
import type {StepId} from './ProductionStepper';
import {ScriptWorkspace} from './ScriptWorkspace';
import {StoryboardWorkspace} from './StoryboardWorkspace';
import {RenderWorkspace} from './RenderWorkspace';
import {SceneTimeline} from './SceneTimeline';
import {DeveloperDrawer} from './DeveloperDrawer';
import {NewProjectModal} from './NewProjectModal';
import type {CreateProjectResult} from './types';
import {StyleCard} from './StyleCard';
import {STYLE_PRESETS, type StylePresetId} from '../../styles/video-gen/style-presets';
import {theme} from './theme';
import './index.css';

const nowTime = () => new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});

const FALLBACK: ProjectOption = {
  id: 'skill-showcase', title: 'Skill Showcase 样片', productionPath: 'examples',
  projectJsonPath: 'examples/skill-showcase.json', outputVideoPath: 'out/workbuddy-six-skills-showcase-v3.mp4',
};

const defaultScriptFor = (project: VideoProject): DraftScript => {
  const first = project.scenes[0]?.payload ?? {};
  const title = String(first.title ?? project.title ?? '');
  const captionText = project.captions.map((c) => c.text).join('');
  return {
    topic: project.title || title, hook: '', viewpoint: '', pain: '', solution: '',
    selectedTitle: title, titles: [title], script: captionText, keywords: '',
  };
};

export const StudioApp: React.FC = () => {
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>('checking');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption>(FALLBACK);
  const [currentStep, setCurrentStep] = useState<StepId>('script');
  const [stepStatus, setStepStatus] = useState(defaultStepStatus);
  const [project, setProject] = useState<VideoProject>(() => cloneProject(DEFAULT_VIDEO_PROJECT));
  const [draft, setDraft] = useState<DraftScript>(() => defaultScriptFor(DEFAULT_VIDEO_PROJECT));
  const [files, setFiles] = useState<Record<ContractKey, StudioFile | null>>({'brief.json': null, 'script-pack.json': null, 'asset-pack.json': null, 'project.json': null});
  const [jobs, setJobs] = useState<Record<string, RunnerJob>>({});
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lastSavedDraft, setLastSavedDraft] = useState('');
  const [styleId, setStyleId] = useState<StylePresetId>('cyan-tech');

  const compiled = useMemo(() => {
    try { return {project: compileProject(project), error: null as string | null}; }
    catch (e) { return {project: null, error: e instanceof Error ? e.message : String(e)}; }
  }, [project]);

  const totalFrames = project.scenes.reduce((t, s) => t + s.durationInFrames, 0);

  const draftDirty = useMemo(() => {
    if (!files['brief.json']?.exists && !files['script-pack.json']?.exists) return true;
    return [draft.topic, draft.hook, draft.viewpoint, draft.pain, draft.solution, draft.selectedTitle, ...draft.titles, draft.script, draft.keywords].join('|||') !== lastSavedDraft;
  }, [draft, files, lastSavedDraft]);

  const pushActivity = useCallback((text: string, tone: 'info'|'success'|'warning'|'danger' = 'info') => {
    setActivity((a) => [{id: `${Date.now()}`, time: nowTime(), tone, text}, ...a].slice(0, 12));
  }, []);

  const refreshContracts = useCallback(async (opt: ProjectOption) => {
    const keys: ContractKey[] = ['brief.json', 'script-pack.json', 'asset-pack.json', 'project.json'];
    const entries = await Promise.all(keys.map(async (k) => [k, await loadStudioFile(filePathFor(opt, k))] as const));
    setFiles(Object.fromEntries(entries) as Record<ContractKey, StudioFile>);
    const norm = normalizeLoadedProject(entries.find(([k]) => k === 'project.json')?.[1].data);
    setProject(norm.project);
    const d = defaultScriptFor(norm.project);
    setDraft(d);
    setLastSavedDraft([d.topic, d.hook, d.viewpoint, d.pain, d.solution, d.selectedTitle, ...d.titles, d.script, d.keywords].join('|||'));
    if (!norm.ok) pushActivity('项目 JSON 校验失败，已回退默认。', 'danger');
    else pushActivity(`已载入 ${opt.title}`, 'success');
  }, [pushActivity]);

  const selectProject = useCallback(async (opt: ProjectOption) => {
    setSelectedProject(opt); setStillUrl(null); setVideoUrl(null); setCurrentStep('script');
    await refreshContracts(opt);
  }, [refreshContracts]);

  const saveScript = useCallback(async () => {
    setSaving(true);
    try {
      const payloads: Array<[string, unknown]> = [
        [filePathFor(selectedProject, 'brief.json'), {
          productionId: selectedProject.id, title: draft.topic || selectedProject.id,
          primaryLink: '', platform: 'douyin',
          format: {width: project.render.width, height: project.render.height, fps: 30, maxDurationSeconds: 180},
          audience: ['AI 从业者'], contentType: '技术教程', tone: '技术布道',
          structure: '开场 -> 痛点 -> 方案 -> 步骤 -> 结论',
          visualStyle: {palette: '蓝绿科技感', captionStyle: project.render.captionStyle, showProjectLabel: true, subtitles: '固定', branding: '不做'},
          research: {sourcePriority: [], socialPolicy: '只当线索'},
          viewpointCandidates: [{id: 'v1', claim: draft.viewpoint || '核心观点', whyItMatters: ''}],
          selectedViewpointId: 'v1',
        }],
        [filePathFor(selectedProject, 'script-pack.json'), {
          productionId: selectedProject.id, title: draft.selectedTitle || draft.topic,
          hook: draft.hook, selectedViewpoint: draft.viewpoint, pain: draft.pain || '',
          solution: draft.solution || '', spokenScript: draft.script, keywords: draft.keywords,
        }],
      ];
      for (const [p, d] of payloads) { if (!await saveFile(p, d)) throw new Error(`save failed: ${p}`); }
      setLastSavedDraft([draft.topic, draft.hook, draft.viewpoint, draft.pain, draft.solution, draft.selectedTitle, ...draft.titles, draft.script, draft.keywords].join('|||'));
      setStepStatus((s) => ({...s, script: 'done'}));
      pushActivity('文案已保存', 'success');
    } catch (e) { pushActivity(`保存失败: ${e}`, 'danger'); }
    finally { setSaving(false); }
  }, [draft, selectedProject, project, pushActivity]);

  const runCommand = useCallback(async (commandId: string, label: string) => {
    if (runnerStatus !== 'online') { pushActivity('执行器离线', 'danger'); return; }
    if (commandId === 'build-project') await saveScript();
    const result = await startJob(commandId, label, selectedProject);
    if (!result) { pushActivity('任务启动失败', 'danger'); return; }
    setJobs((j) => ({...j, [result.job.id]: result.job}));
    pushActivity(`已启动: ${label}`, 'info');
    const poll = async () => {
      const job = await pollJob(result.job.id);
      setJobs((j) => ({...j, [result.job.id]: job}));
      if (job.status === 'running') { setTimeout(poll, 900); return; }
      if (job.status === 'done') {
        if (job.artifact?.kind === 'image' && job.artifact.url) setStillUrl(`${runnerBaseUrl()}${job.artifact.url}`);
        if (job.artifact?.kind === 'video' && job.artifact.url) setVideoUrl(`${runnerBaseUrl()}${job.artifact.url}`);
        if (commandId === 'build-project') {
          await refreshContracts(selectedProject);
          setStepStatus((s) => ({...s, storyboard: 'done'}));
        } else if (commandId === 'project-still') setStepStatus((s) => ({...s, preview: 'done'}));
        else if (commandId === 'project-render') setStepStatus((s) => ({...s, render: 'done', deliver: 'done'}));
        pushActivity(`${label} 完成`, 'success');
      } else pushActivity(`${label} 失败`, 'danger');
    };
    setTimeout(poll, 900);
  }, [runnerStatus, saveScript, selectedProject, pushActivity, refreshContracts]);

  const handleCreateProject = useCallback(async (result: CreateProjectResult) => {
    setShowNewProjectModal(false);
    const loaded = await loadProjects();
    if (loaded.length > 0) { setProjects(loaded); const c = loaded.find((p) => p.id === result.project.id); if (c) await selectProject(c); }
    pushActivity('项目已创建', 'success');
  }, [selectProject, pushActivity]);

  // Init
  useEffect(() => {
    let c = false;
    const tick = async () => { const s = await checkHealth(); if (!c) setRunnerStatus(s); };
    tick(); const iv = window.setInterval(tick, 5000);
    return () => { c = true; window.clearInterval(iv); };
  }, []);
  useEffect(() => {
    let c = false;
    if (!initialized && runnerStatus === 'online') {
      (async () => {
        const l = await loadProjects();
        if (c) return;
        if (l.length > 0) { setProjects(l); setSelectedProject(l[0]); await refreshContracts(l[0]); }
        setInitialized(true);
      })();
    }
    return () => { c = true; };
  }, [runnerStatus, initialized, refreshContracts]);

  const hasProject = !!selectedProject;

  return (
    <>
      <StudioShell
        header={
          <div style={{height: '100%', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12}}>
            <div style={{width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 800}}>V</div>
            <span style={{fontWeight: 700, fontSize: 13, color: theme.text.primary}}>Video Studio</span>
            <div style={{flex: 1}} />
            <select value={selectedProject.projectJsonPath} onChange={(e) => { const n = projects.find((p) => p.projectJsonPath === e.target.value); if (n) selectProject(n); }} style={{background: theme.bg.surface, color: theme.text.primary, border: `1px solid ${theme.border.default}`, borderRadius: 5, padding: '4px 10px', fontSize: 10, outline: 'none'}}>
              {projects.map((p) => <option key={p.projectJsonPath} value={p.projectJsonPath}>{p.title}</option>)}
            </select>
            <div style={{display: 'flex', alignItems: 'center', gap: 5, background: `${runnerStatus === 'online' ? theme.accent.green : theme.accent.red}14`, borderRadius: 20, padding: '2px 10px'}}>
              <span style={{width: 6, height: 6, borderRadius: '50%', background: runnerStatus === 'online' ? theme.accent.green : theme.accent.red}} />
              <span style={{fontSize: 9, color: runnerStatus === 'online' ? theme.accent.green : theme.accent.red}}>{runnerStatus === 'online' ? '已连接' : '离线'}</span>
            </div>
          </div>
        }
        stepper={<ProductionStepper currentStep={currentStep} onStepClick={(s) => setCurrentStep(s)} status={stepStatus} />}
        preview={<PreviewCanvas compiled={compiled} project={project} stillUrl={stillUrl} />}
        workspace={
          <>
            {currentStep === 'script' && <ScriptWorkspace draft={draft} onSetDraft={setDraft} onSave={saveScript} saving={saving} hasProject={hasProject} />}
            {(currentStep === 'style' || currentStep === 'preview') && (
              <div style={{padding: '16px 18px', height: '100%', overflow: 'auto'}}>
                <div style={{marginBottom: 16}}>
                  <h2 style={{margin: 0, fontSize: 13, fontWeight: 700, color: theme.text.primary}}>
                    {currentStep === 'style' ? '🎨 选择风格' : '▶ 预览'}
                  </h2>
                  <p style={{margin: '4px 0 0', fontSize: 9, color: theme.text.muted}}>
                    {currentStep === 'style' ? '选择一种视觉风格，影响配色、字幕样式和动效。' : '点击生成关键帧查看视频效果。'}
                  </p>
                </div>
                {currentStep === 'style' ? (
                  <>
                    <StyleCard presets={STYLE_PRESETS} selected={styleId} onSelect={(id) => { setStyleId(id as StylePresetId); setStepStatus((s) => ({...s, style: 'done'})); }} />
                    <button
                      onClick={() => setCurrentStep('storyboard')}
                      style={{
                        width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
                        color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      确认风格，进入分镜
                    </button>
                  </>
                ) : (
                  <div style={{
                    padding: 16, borderRadius: 6, textAlign: 'center',
                    background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
                    fontSize: 10, color: theme.text.muted,
                  }}>
                    点击下方「生成关键帧」查看视频预览效果。
                  </div>
                )}
              </div>
            )}
            {currentStep === 'storyboard' && <StoryboardWorkspace project={project} totalFrames={totalFrames} fps={project.render.fps} />}
            {(currentStep === 'render' || currentStep === 'deliver') && (
              <RenderWorkspace compiled={compiled} stillUrl={stillUrl} videoUrl={videoUrl} onRunCommand={runCommand} runnerOnline={runnerStatus === 'online'} totalFrames={totalFrames} fps={project.render.fps} sceneCount={project.scenes.length} />
            )}
          </>
        }
        timeline={<SceneTimeline project={project} totalFrames={totalFrames} fps={project.render.fps} />}
        drawer={<DeveloperDrawer jobs={jobs} activity={activity} />}
      />

      {/* Floating new project button */}
      <button
        onClick={() => setShowNewProjectModal(true)}
        style={{
          position: 'fixed', left: 77, top: 64, zIndex: 50,
          padding: '6px 14px', borderRadius: 20, border: `1px dashed ${theme.border.accent}`,
          background: `${theme.accent.blue}0d`, color: theme.accent.blue,
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}
      >
        + 新建视频
      </button>

      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreated={handleCreateProject}
          onError={(msg) => pushActivity(msg, 'danger')}
        />
      )}
    </>
  );
};
