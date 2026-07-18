# Video Factory Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 660-line monolithic VideoFactoryConsole.tsx + separate DirectorScorePreview.tsx with a unified professional video studio interface using the dark DaVinci Resolve-style layout.

**Architecture:** Single-page app with React state management in App.tsx, stateless presentational components for each panel, inline CSS-in-JS with tokenized theme object, and a data API layer extracted from the current implementation.

**Tech Stack:** React + TypeScript, inline styles referencing theme tokens, existing DirectorScore data layer (`data.ts`), existing API (`tools-studio-server.mjs`).

---

### File Structure

```
src/tools/console/
  theme.ts              — Design tokens (colors, spacing, fonts, shadows)
  index.css             — Base reset + CSS variable fallback
  api.ts                — API calls extracted from VideoFactoryConsole
  types.ts              — Shared TypeScript types
  App.tsx               — Main app: state management + layout shell
  Topbar.tsx            — Top navigation bar
  IconNav.tsx           — Left icon navigation tabs
  LeftPanel.tsx         — Flow steps panel container
  FlowSteps.tsx         — 7-step workflow with progress
  CenterPanel.tsx       — Center content area (tab container)
  ScriptEditor.tsx      — Script editing form with all fields
  RightPanel.tsx        — Right preview panel container
  PreviewArea.tsx       — Video player + frame counter
  QaBentoGrid.tsx       — 2×2 bento grid of QA status cards
  SceneMiniList.tsx     — Scene structure list
  TimelineDock.tsx      — Bottom timeline container
  TimelineRuler.tsx     — Frame ruler + playhead
  ActTrack.tsx          — Collapsible act row with scene segments
  CueDetail.tsx         — Cue metadata popup bar
  CueLayerRow.tsx       — Element-level cue tracks
  index.tsx             — Entry point (re-exports App)

Kept from existing:
  src/tools/data.ts     — DirectorScore SCORE, SEQUENCES, TimelineCue, helpers
  src/tools/index.html  — HTML entry point (no changes needed)
```

---

### Task 1: Theme tokens + base CSS

**Files:**
- Create: `src/tools/console/theme.ts`
- Create: `src/tools/console/index.css`

- [ ] **Step 1: Create theme.ts with all design tokens**

```typescript
// src/tools/console/theme.ts
// Design tokens for Video Factory Console v2 — Dark Professional Studio Theme

export const theme = {
  // Background hierarchy (darkest → lightest)
  bg: {
    deep: '#07080a',
    base: '#0b0d11',
    surface: '#111318',
    elevated: '#181b22',
    hover: '#1e2130',
  },
  // Borders
  border: {
    subtle: '#1e2130',
    default: '#282c3a',
    accent: '#363b4a',
  },
  // Text
  text: {
    primary: '#e8eaed',
    secondary: '#9aa0ab',
    muted: '#5c6270',
  },
  // Accent colors
  accent: {
    blue: '#3b82f6',
    indigo: '#6366f1',
    amber: '#f59e0b',
    green: '#22c55e',
    red: '#ef4444',
    purple: '#8b5cf6',
  },
  // Energy colors (DirectorScore)
  energy: {
    explosive: '#ef4444',
    high: '#f97316',
    moderate: '#eab308',
    calm: '#22c55e',
  },
  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  // Font sizes
  fontSize: {
    xs: 7,
    sm: 8,
    base: 10,
    md: 12,
    lg: 14,
  },
  // Border radius
  radius: {
    sm: 3,
    md: 6,
    lg: 8,
    xl: 10,
  },
  // Shadows
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
  },
  // Font family
  font: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  // Transition
  transition: 'all 0.15s ease',
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 2: Create index.css with base reset + CSS variable fallback**

```css
/* src/tools/console/index.css */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-deep: #07080a;
  --bg-base: #0b0d11;
  --bg-surface: #111318;
  --bg-elevated: #181b22;
  --bg-hover: #1e2130;
  --border-subtle: #1e2130;
  --border-default: #282c3a;
  --border-accent: #363b4a;
  --text-primary: #e8eaed;
  --text-secondary: #9aa0ab;
  --text-muted: #5c6270;
  --accent-blue: #3b82f6;
  --accent-green: #22c55e;
  --accent-amber: #f59e0b;
  --accent-red: #ef4444;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 3: Commit**

```
git add src/tools/console/theme.ts src/tools/console/index.css
git commit -m "feat: add design tokens and base CSS for console redesign"
```

---

### Task 2: API layer + shared types

**Files:**
- Create: `src/tools/console/types.ts`
- Create: `src/tools/console/api.ts`

- [ ] **Step 1: Create types.ts with shared types**

```typescript
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
```

- [ ] **Step 2: Create api.ts**

```typescript
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
```

- [ ] **Step 3: Commit**

```
git add src/tools/console/types.ts src/tools/console/api.ts
git commit -m "feat: add shared types and API layer for console redesign"
```

---

### Task 3: App shell — state management + layout

**Files:**
- Create: `src/tools/console/App.tsx`

- [ ] **Step 1: Create App.tsx with full state management and layout shell**

This is the main component. It holds all state and renders the layout structure. Each panel receives only the props it needs.

```typescript
// src/tools/console/App.tsx
import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {compileProject} from '../../project/compileProject';
import type {VideoProject} from '../../project/projectSchema';
import {DEFAULT_VIDEO_PROJECT} from '../../compositions/v2/defaultProject';
import {theme} from './theme';
import type {
  ProjectOption, RunnerStatus, ContractKey, StudioFile, RunnerJob,
  ActivityEvent, DraftScript, Tone, SceneTimeline,
} from './types';
import {
  fetchJson, checkHealth, loadProjects, loadStudioFile, saveFile,
  startJob, pollJob, normalizeLoadedProject, cloneProject, filePathFor,
} from './api';
import {Topbar} from './Topbar';
import {IconNav} from './IconNav';
import {LeftPanel} from './LeftPanel';
import {CenterPanel} from './CenterPanel';
import {RightPanel} from './RightPanel';
import {TimelineDock} from './TimelineDock';
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
  const [activeTab, setActiveTab] = useState('production'); // production | preview | storyboard | assets | settings
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
    const loadedProject = normalizeLoadedProject(entries.find(([k]) => k === 'project.json')?.[1].data);
    setProject(loadedProject);
    setDraft(defaultScriptFor(loadedProject));
    pushActivity(`已载入 ${projectOption.title}。`, 'success');
  }, [pushActivity]);

  const selectProject = useCallback(async (projectOption: ProjectOption) => {
    setSelectedProject(projectOption);
    setStillUrl(null);
    setVideoUrl(null);
    await refreshContracts(projectOption);
  }, [refreshContracts]);

  const saveProductionScript = useCallback(async (nextDraft = draft) => {
    // Same implementation as current VideoFactoryConsole saveProductionScript
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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const loaded = await loadProjects();
      if (!cancelled && loaded.length > 0) {
        setProjects(loaded);
        setSelectedProject(loaded[0]);
        await refreshContracts(loaded[0]);
      } else if (!cancelled) {
        await refreshContracts(fallbackProjects[0]);
        pushActivity('项目列表接口不可用，已使用默认样片。', 'warning');
      }
    };
    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        <div style={{display: 'flex', flex: 1, minWidth: 0}}>
          <LeftPanel
            files={files}
            totalFrames={totalFrames}
            fps={project.render.fps}
          />

          <CenterPanel
            draft={draft}
            onSetDraft={setDraft}
            scriptSeconds={scriptSeconds}
            onSaveScript={() => saveProductionScript()}
            onRunCommand={runCommand}
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
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```
git add src/tools/console/App.tsx
git commit -m "feat: add App shell with state management for console redesign"
```

---

### Task 4: Topbar + IconNav

**Files:**
- Create: `src/tools/console/Topbar.tsx`
- Create: `src/tools/console/IconNav.tsx`

- [ ] **Step 1: Create Topbar.tsx**

```typescript
// src/tools/console/Topbar.tsx
import React from 'react';
import {theme} from './theme';
import type {ProjectOption, RunnerStatus} from './types';

interface TopbarProps {
  project: ProjectOption;
  projects: ProjectOption[];
  runnerStatus: RunnerStatus;
  onSelectProject: (p: ProjectOption) => void;
  onRunCommand: (cmd: string, label: string) => void;
  onToggleLog: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  project, projects, runnerStatus, onSelectProject, onRunCommand, onToggleLog,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', height: 44, padding: '0 14px',
    background: theme.bg.elevated, borderBottom: `1px solid ${theme.border.subtle}`,
  }}>
    {/* Logo */}
    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: '#fff', fontWeight: 800,
      }}>V</div>
      <span style={{fontWeight: 700, fontSize: 13, color: theme.text.primary, letterSpacing: -0.3}}>
        Video Factory
      </span>
    </div>

    {/* Breadcrumb */}
    <div style={{display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, fontSize: 10, color: theme.text.muted}}>
      <span>Projects</span>
      <span>›</span>
      <span style={{color: theme.text.secondary}}>{project.id}</span>
    </div>

    {/* Project selector */}
    <select
      value={project.projectJsonPath}
      onChange={(e) => {
        const next = projects.find((p) => p.projectJsonPath === e.target.value);
        if (next) onSelectProject(next);
      }}
      style={{
        marginLeft: 12, background: theme.bg.surface, color: theme.text.primary,
        border: `1px solid ${theme.border.default}`, borderRadius: 4, padding: '3px 8px',
        fontSize: 10, outline: 'none',
      }}
    >
      {projects.map((p) => (
        <option key={p.projectJsonPath} value={p.projectJsonPath}>{p.title}</option>
      ))}
    </select>

    {/* Spacer */}
    <div style={{flex: 1}} />

    {/* Status indicators */}
    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, background: theme.bg.surface,
        padding: '3px 10px', borderRadius: 20, fontSize: 9,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: runnerStatus === 'online' ? theme.accent.green
            : runnerStatus === 'checking' ? theme.accent.amber : theme.accent.red,
        }} />
        <span style={{color: theme.text.muted}}>
          {runnerStatus === 'online' ? 'Executor Online' : runnerStatus === 'checking' ? '检测中' : '离线'}
        </span>
      </div>

      <button
        onClick={onToggleLog}
        style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
          fontSize: 9, cursor: 'pointer',
        }}
      >
        任务管理
      </button>

      <button
        onClick={() => onRunCommand('build-project', '生成分镜')}
        style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          color: theme.text.secondary, padding: '3px 10px', borderRadius: 4,
          fontSize: 9, cursor: 'pointer',
        }}
      >
        生成分镜
      </button>

      <button
        onClick={() => onRunCommand('project-render', '生成视频')}
        style={{
          background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
          border: 'none', color: '#fff', padding: '4px 14px', borderRadius: 6,
          fontSize: 10, fontWeight: 600, cursor: 'pointer',
        }}
      >
        渲染
      </button>
    </div>
  </div>
);
```

- [ ] **Step 2: Create IconNav.tsx**

```typescript
// src/tools/console/IconNav.tsx
import React from 'react';
import {theme} from './theme';

interface IconNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const tabs = [
  {id: 'production', icon: '📝', label: '制作'},
  {id: 'preview', icon: '🎬', label: '预览'},
  {id: 'storyboard', icon: '📊', label: '分镜'},
  {id: 'assets', icon: '🗂️', label: '资产'},
  {id: 'settings', icon: '⚙️', label: '设置'},
];

export const IconNav: React.FC<IconNavProps> = ({activeTab, onSelectTab}) => (
  <div style={{
    width: 44, background: theme.bg.elevated, borderRight: `1px solid ${theme.border.subtle}`,
    padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  }}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        title={tab.label}
        style={{
          width: 32, height: 32, borderRadius: 6,
          background: activeTab === tab.id ? theme.accent.blue : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: activeTab === tab.id ? '#fff' : theme.text.muted,
          border: 'none', cursor: 'pointer', position: 'relative',
        }}
      >
        {tab.icon}
        {activeTab === tab.id && (
          <span style={{
            position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
            borderRadius: '50%', background: theme.accent.green,
            border: `2px solid ${theme.bg.elevated}`,
          }} />
        )}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 3: Commit**

```
git add src/tools/console/Topbar.tsx src/tools/console/IconNav.tsx
git commit -m "feat: add Topbar and IconNav components"
```

---

### Task 5: LeftPanel + FlowSteps

**Files:**
- Create: `src/tools/console/LeftPanel.tsx`
- Create: `src/tools/console/FlowSteps.tsx`

- [ ] **Step 1: Create FlowSteps.tsx**

```typescript
// src/tools/console/FlowSteps.tsx
import React from 'react';
import {theme} from './theme';
import type {StudioFile, ContractKey} from './types';

interface FlowStepsProps {
  files: Record<ContractKey, StudioFile | null>;
}

const steps = [
  {key: 'brief.json', label: '选题 Brief', file: 'brief.json', done: true},
  {key: 'script-pack.json', label: '标题 / 口播', file: 'script-pack.json', done: true},
  {key: 'asset-pack.json', label: '素材检查', file: 'asset-pack.json', active: true},
  {key: null, label: '配音 / 字幕', file: null, active: false},
  {key: null, label: '分镜编排', file: null, active: false},
  {key: null, label: '关键帧验收', file: null, active: false},
  {key: null, label: '成片输出', file: null, active: false},
];

export const FlowSteps: React.FC<FlowStepsProps> = ({files}) => (
  <div style={{padding: '10px 12px', flex: 1, overflow: 'auto', fontSize: 10}}>
    {steps.map((step, i) => {
      const fileExists = step.key ? files[step.key as ContractKey]?.exists : false;
      const isDone = step.done || fileExists;
      return (
        <div key={i} style={{display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start', opacity: isDone || step.active ? 1 : 0.4}}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700,
            background: isDone ? theme.accent.green : step.active ? theme.accent.amber : theme.bg.elevated,
            border: isDone || step.active ? 'none' : `1px solid ${theme.border.default}`,
            color: isDone || step.active ? '#fff' : theme.text.muted,
          }}>
            {isDone ? '✓' : i + 1}
          </div>
          <div>
            <div style={{fontWeight: 600, color: step.active ? theme.accent.amber : theme.text.primary, fontSize: 10}}>
              {step.label}
            </div>
            <div style={{color: step.active ? theme.accent.amber : theme.text.muted, fontSize: 8}}>
              {step.active ? '进行中' : isDone ? '已完成' : '待处理'}
            </div>
            {step.active && (
              <div style={{width: 80, height: 3, background: theme.bg.elevated, borderRadius: 2, marginTop: 4, overflow: 'hidden'}}>
                <div style={{width: '50%', height: '100%', background: theme.accent.amber, borderRadius: 2}} />
              </div>
            )}
          </div>
        </div>
      );
    })}
    <div style={{color: theme.text.muted, fontSize: 8, paddingLeft: 28, marginTop: -4}}>
      共 {7} 步
    </div>
  </div>
);
```

- [ ] **Step 2: Create LeftPanel.tsx**

```typescript
// src/tools/console/LeftPanel.tsx
import React from 'react';
import {theme} from './theme';
import type {StudioFile, ContractKey} from './types';
import {FlowSteps} from './FlowSteps';

interface LeftPanelProps {
  files: Record<ContractKey, StudioFile | null>;
  totalFrames: number;
  fps: number;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({files, totalFrames, fps}) => (
  <div style={{
    width: 240, borderRight: `1px solid ${theme.border.subtle}`,
    display: 'flex', flexDirection: 'column', background: theme.bg.base,
  }}>
    {/* Header */}
    <div style={{
      padding: '8px 12px', borderBottom: `1px solid ${theme.border.subtle}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>制作流程</span>
      <span style={{fontSize: 9, color: theme.text.muted, background: theme.bg.surface, padding: '1px 8px', borderRadius: 10}}>
        3/7
      </span>
    </div>

    <FlowSteps files={files} />

    {/* AI Suggestion */}
    <div style={{
      padding: '8px 12px', borderTop: `1px solid ${theme.border.subtle}`,
      background: theme.bg.surface,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: `${theme.accent.blue}11`, border: `1px solid ${theme.border.accent}`,
        borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
      }}>
        <span style={{fontSize: 12}}>✨</span>
        <span style={{fontSize: 9, color: theme.text.secondary}}>AI 建议: 检查素材完整性...</span>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Commit**

```
git add src/tools/console/LeftPanel.tsx src/tools/console/FlowSteps.tsx
git commit -m "feat: add LeftPanel and FlowSteps components"
```

---

### Task 6: CenterPanel + ScriptEditor

**Files:**
- Create: `src/tools/console/CenterPanel.tsx`
- Create: `src/tools/console/ScriptEditor.tsx`

- [ ] **Step 1: Create ScriptEditor.tsx**

```typescript
// src/tools/console/ScriptEditor.tsx
import React from 'react';
import {theme} from './theme';
import type {DraftScript} from './types';

interface ScriptEditorProps {
  draft: DraftScript;
  onSetDraft: (d: DraftScript) => void;
  scriptSeconds: number;
  onSaveScript: () => void;
  onRunCommand: (cmd: string, label: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  draft, onSetDraft, scriptSeconds, onSaveScript, onRunCommand,
}) => {
  const generateTitles = () => {
    const topic = draft.topic.trim() || '这个视频选题';
    const titles = [
      `别再低估${topic}，真正变化已经开始`,
      `${topic}：普通人最该看懂的三个变化`,
      `未来一年，${topic}会先改变这类工作`,
    ];
    onSetDraft({...draft, titles, selectedTitle: titles[0]});
  };

  const rewriteScript = () => {
    const lines = [
      draft.hook, draft.pain, draft.solution,
      '第一步，写清楚目标和观众，让系统知道这条视频到底要说服谁。',
      '第二步，冻结标题、口播和分镜，不要一边渲染一边漂移。',
      '第三步，先生成关键帧验收，再进入完整 MP4 渲染。',
      '所以未来的视频生产，不是从命令开始，而是从选题、文案和验收标准开始。',
    ].filter(Boolean);
    onSetDraft({...draft, script: lines.join('\n\n'), keywords: draft.keywords || `${draft.topic}，工作流，自动化，效率，案例`});
  };

  return (
    <div style={{padding: '12px 14px', flex: 1, overflow: 'auto', fontSize: 10}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <span style={{fontWeight: 600, fontSize: 12, color: theme.text.primary}}>口播文案</span>
          <span style={{color: theme.text.muted, background: theme.bg.surface, padding: '1px 8px', borderRadius: 4, fontSize: 8}}>
            {draft.script.length} 字
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>预计 {scriptSeconds}s</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <button onClick={rewriteScript} style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            color: theme.text.secondary, padding: '3px 8px', borderRadius: 4,
            fontSize: 8, cursor: 'pointer',
          }}>✎ 优化</button>
        </div>
      </div>

      {/* Theme */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          主题
        </div>
        <div style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          borderRadius: 6, padding: '6px 10px', fontSize: 11, color: theme.text.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <input
            value={draft.topic}
            onChange={(e) => onSetDraft({...draft, topic: e.target.value})}
            style={{
              background: 'transparent', border: 'none', color: theme.text.primary,
              fontSize: 11, outline: 'none', flex: 1,
            }}
          />
        </div>
      </div>

      {/* Viewpoint */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          主观点
        </div>
        <input
          value={draft.viewpoint}
          onChange={(e) => onSetDraft({...draft, viewpoint: e.target.value})}
          style={{
            width: '100%', background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
            borderRadius: 6, padding: '6px 10px', fontSize: 11, color: theme.text.primary,
            outline: 'none',
          }}
        />
      </div>

      {/* Title candidates */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          标题候选
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {draft.titles.map((title) => (
            <button
              key={title}
              onClick={() => onSetDraft({...draft, selectedTitle: title})}
              style={{
                textAlign: 'left', padding: '5px 10px', borderRadius: 4, fontSize: 10,
                background: draft.selectedTitle === title ? `${theme.accent.blue}15` : theme.bg.surface,
                border: draft.selectedTitle === title ? `1px solid ${theme.accent.blue}66` : `1px solid ${theme.border.default}`,
                color: theme.text.primary, cursor: 'pointer',
              }}
            >
              <span style={{color: draft.selectedTitle === title ? theme.accent.blue : theme.text.muted, marginRight: 6}}>
                {draft.selectedTitle === title ? '●' : '○'}
              </span>
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{marginBottom: 10}}>
        <div style={{color: theme.text.muted, fontSize: 8, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3}}>
          脚本内容
        </div>
        <textarea
          value={draft.script}
          onChange={(e) => onSetDraft({...draft, script: e.target.value})}
          style={{
            width: '100%', minHeight: 110, background: theme.bg.surface,
            border: `1px solid ${theme.border.default}`, borderRadius: 6,
            padding: 10, fontSize: 10, lineHeight: 1.7, color: theme.text.secondary,
            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{display: 'flex', gap: 6, marginTop: 10}}>
        <button onClick={generateTitles} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}>生成标题</button>
        <button onClick={rewriteScript} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}>生成口播</button>
        <button onClick={() => onSetDraft({...draft, keywords: `${draft.topic}，工作流，自动化，效率`})} style={{
          background: theme.bg.surface, border: `1px solid ${theme.border.default}`,
          padding: '4px 10px', borderRadius: 4, fontSize: 9, color: theme.text.secondary,
          cursor: 'pointer',
        }}># 关键词</button>
        <div style={{flex: 1}} />
        <button onClick={() => onRunCommand('build-project', '生成分镜')} style={{
          background: `linear-gradient(135deg, ${theme.accent.blue}, ${theme.accent.indigo})`,
          border: 'none', padding: '4px 14px', borderRadius: 6, fontSize: 9,
          color: '#fff', fontWeight: 600, cursor: 'pointer',
        }}>✨ 生成分镜</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create CenterPanel.tsx**

```typescript
// src/tools/console/CenterPanel.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {DraftScript} from './types';
import {ScriptEditor} from './ScriptEditor';

interface CenterPanelProps {
  draft: DraftScript;
  onSetDraft: (d: DraftScript) => void;
  scriptSeconds: number;
  onSaveScript: () => void;
  onRunCommand: (cmd: string, label: string) => void;
}

const subTabs = [
  {id: 'script', label: '✎ 文案'},
  {id: 'storyboard', label: '📋 分镜'},
  {id: 'audio', label: '🔊 配音'},
];

export const CenterPanel: React.FC<CenterPanelProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState('script');
  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: theme.bg.base}}>
      {/* Sub tabs */}
      <div style={{display: 'flex', borderBottom: `1px solid ${theme.border.subtle}`, background: theme.bg.elevated}}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '6px 16px', borderBottom: activeSubTab === tab.id ? `2px solid ${theme.accent.blue}` : '2px solid transparent',
              color: activeSubTab === tab.id ? theme.text.primary : theme.text.muted,
              fontWeight: activeSubTab === tab.id ? 600 : 400, fontSize: 10,
              background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'script' && <ScriptEditor {...props} />}
      {activeSubTab === 'storyboard' && (
        <div style={{padding: 20, color: theme.text.muted, fontSize: 10, textAlign: 'center'}}>
          分镜编辑 (开发中)
        </div>
      )}
      {activeSubTab === 'audio' && (
        <div style={{padding: 20, color: theme.text.muted, fontSize: 10, textAlign: 'center'}}>
          配音管理 (开发中)
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```
git add src/tools/console/CenterPanel.tsx src/tools/console/ScriptEditor.tsx
git commit -m "feat: add CenterPanel and ScriptEditor components"
```

---

### Task 7: RightPanel — PreviewArea + QaBentoGrid + SceneMiniList

**Files:**
- Create: `src/tools/console/RightPanel.tsx`
- Create: `src/tools/console/PreviewArea.tsx`
- Create: `src/tools/console/QaBentoGrid.tsx`
- Create: `src/tools/console/SceneMiniList.tsx`

- [ ] **Step 1: Create PreviewArea.tsx**

```typescript
// src/tools/console/PreviewArea.tsx
import React from 'react';
import {Player} from '@remotion/player';
import {UltimateVideoV2} from '../../compositions/v2/UltimateVideoV2';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';

interface PreviewAreaProps {
  compiled: {project: VideoProject | null; error: string | null};
  stillUrl: string | null;
  totalFrames: number;
}

export const PreviewArea: React.FC<PreviewAreaProps> = ({compiled, stillUrl, totalFrames}) => (
  <div>
    <div style={{padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <span style={{fontWeight: 600, fontSize: 11, color: theme.text.primary}}>▶ 预览</span>
    </div>
    <div style={{padding: 8, background: '#050608', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {compiled.project ? (
        <div style={{aspectRatio: '16/9', width: '100%'}}>
          <Player
            component={UltimateVideoV2}
            durationInFrames={compiled.project.durationInFrames}
            fps={compiled.project.fps}
            compositionWidth={compiled.project.width}
            compositionHeight={compiled.project.height}
            controls
            loop
            inputProps={{...compiled.project, compiledProject: compiled.project}}
            style={{width: '100%', aspectRatio: '16/9', background: '#05070d'}}
          />
        </div>
      ) : (
        <div style={{
          aspectRatio: '16/9', width: '100%', background: '#080b10',
          border: `1px solid ${theme.border.subtle}`, borderRadius: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, color: theme.text.muted, fontSize: 9,
        }}>
          <span style={{fontSize: 18, color: theme.accent.blue}}>▶</span>
          <span>Remotion Player</span>
          {compiled.error && <span style={{color: theme.accent.red, fontSize: 8}}>{compiled.error}</span>}
        </div>
      )}
    </div>
    <div style={{padding: '4px 10px', fontSize: 8, color: theme.text.muted, textAlign: 'center', borderBottom: `1px solid ${theme.border.subtle}`}}>
      帧 {stillUrl ? '已生成关键帧' : `0 / ${totalFrames}`}
    </div>
  </div>
);
```

- [ ] **Step 2: Create QaBentoGrid.tsx**

```typescript
// src/tools/console/QaBentoGrid.tsx
import React from 'react';
import {theme} from './theme';

interface QaBentoGridProps {
  compiled: {project: unknown; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  onRunCommand: (cmd: string, label: string) => void;
}

export const QaBentoGrid: React.FC<QaBentoGridProps> = ({compiled, stillUrl, videoUrl, onRunCommand}) => {
  const cards = [
    {
      label: 'Check', value: compiled.project ? '✓ 通过' : '✗ 未通过',
      color: compiled.project ? theme.accent.green : theme.accent.red,
      border: compiled.project ? theme.accent.green : theme.accent.red,
      sub: compiled.project ? '编译正常' : compiled.error ?? '未知错误',
    },
    {
      label: 'Still', value: stillUrl ? '✓ 已生成' : '◷ 待生成',
      color: stillUrl ? theme.accent.green : theme.accent.amber,
      border: stillUrl ? theme.accent.green : theme.accent.amber,
      sub: stillUrl ? '可预览' : '5 场景待渲染',
      action: stillUrl ? null : () => onRunCommand('project-still', '生成关键帧'),
    },
    {
      label: 'MP4', value: videoUrl ? '✓ 已渲染' : '— 待渲染',
      color: videoUrl ? theme.accent.green : theme.text.muted,
      border: videoUrl ? theme.accent.green : theme.text.muted,
      sub: videoUrl ? '可下载' : '排队中',
      action: videoUrl ? null : () => onRunCommand('project-render', '渲染 MP4'),
    },
    {
      label: '导演评分', value: '78', color: theme.accent.blue,
      border: theme.accent.blue, sub: 'B 级 · 良好',
    },
  ];

  return (
    <div style={{
      padding: '8px 10px', borderBottom: `1px solid ${theme.border.subtle}`,
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
    }}>
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={card.action ? card.action : undefined}
          style={{
            background: theme.bg.surface, border: `1px solid ${theme.border.subtle}`,
            borderLeft: `2px solid ${card.border}`, borderRadius: 5,
            padding: '6px 8px', cursor: card.action ? 'pointer' : 'default',
          }}
        >
          <div style={{fontSize: 7, color: theme.text.muted, textTransform: 'uppercase'}}>
            {card.label}
          </div>
          <div style={{fontSize: 11, color: card.color, fontWeight: 700}}>
            {card.value}
          </div>
          <div style={{fontSize: 7, color: theme.text.muted}}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Create SceneMiniList.tsx**

```typescript
// src/tools/console/SceneMiniList.tsx
import React from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface SceneMiniListProps {
  timeline: SceneTimeline[];
}

const sceneLabel = (family: string) => {
  const labels: Record<string, string> = {
    'spoken-title': '标题开场', 'spoken-metric': '数据指标',
    'spoken-process': '步骤流程', 'spoken-ranking': '排行重点',
    'spoken-compare': '左右对比', 'spoken-tags': '标签矩阵',
    'spoken-code': '代码窗口', 'spoken-takeaway': '结论收束',
  };
  return labels[family] ?? family;
};

export const SceneMiniList: React.FC<SceneMiniListProps> = ({timeline}) => (
  <div style={{padding: '8px 10px', flex: 1, overflow: 'auto'}}>
    <div style={{fontSize: 8, color: theme.text.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3}}>
      场景结构
    </div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
      {timeline.map(({scene, start, end}, index) => (
        <div
          key={scene.id}
          style={{
            background: theme.bg.surface, border: `1px solid ${index === 0 ? theme.accent.blue + '33' : theme.border.subtle}`,
            borderLeft: index === 0 ? `2px solid ${theme.accent.blue}` : `2px solid transparent`,
            borderRadius: 4, padding: '5px 8px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{fontSize: 7, color: index === 0 ? theme.accent.blue : theme.text.muted, fontWeight: 700}}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span style={{fontSize: 10, color: theme.text.primary}}>{scene.id}</span>
          </div>
          <span style={{fontSize: 8, color: theme.text.muted}}>{start}-{end}f</span>
        </div>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 4: Create RightPanel.tsx**

```typescript
// src/tools/console/RightPanel.tsx
import React from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {SceneTimeline} from './types';
import {PreviewArea} from './PreviewArea';
import {QaBentoGrid} from './QaBentoGrid';
import {SceneMiniList} from './SceneMiniList';

interface RightPanelProps {
  compiled: {project: VideoProject | null; error: string | null};
  stillUrl: string | null;
  videoUrl: string | null;
  timeline: SceneTimeline[];
  project: VideoProject;
  totalFrames: number;
  onRunCommand: (cmd: string, label: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  compiled, stillUrl, videoUrl, timeline, totalFrames, onRunCommand,
}) => (
  <div style={{
    width: 280, borderLeft: `1px solid ${theme.border.subtle}`,
    display: 'flex', flexDirection: 'column', background: theme.bg.base,
  }}>
    <PreviewArea compiled={compiled} stillUrl={stillUrl} totalFrames={totalFrames} />
    <QaBentoGrid compiled={compiled} stillUrl={stillUrl} videoUrl={videoUrl} onRunCommand={onRunCommand} />
    <SceneMiniList timeline={timeline} />
  </div>
);
```

- [ ] **Step 5: Commit**

```
git add src/tools/console/PreviewArea.tsx src/tools/console/QaBentoGrid.tsx src/tools/console/SceneMiniList.tsx src/tools/console/RightPanel.tsx
git commit -m "feat: add RightPanel components (PreviewArea, QaBentoGrid, SceneMiniList)"
```

---

### Task 8: TimelineDock with interactive DirectorScore timeline

**Files:**
- Create: `src/tools/console/TimelineDock.tsx`
- Create: `src/tools/console/TimelineRuler.tsx`
- Create: `src/tools/console/ActTrack.tsx`
- Create: `src/tools/console/CueDetail.tsx`
- Create: `src/tools/console/CueLayerRow.tsx`

- [ ] **Step 1: Create TimelineRuler.tsx**

```typescript
// src/tools/console/TimelineRuler.tsx
import React from 'react';
import {theme} from './theme';

interface TimelineRulerProps {
  totalFrames: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({totalFrames}) => {
  const tickInterval = 30;
  const ticks: number[] = [];
  for (let f = 0; f <= totalFrames; f += tickInterval) ticks.push(f);

  return (
    <div style={{
      display: 'flex', height: 16, position: 'relative',
      borderBottom: `1px solid ${theme.border.subtle}`, fontSize: 7, color: theme.text.muted,
      marginBottom: 4,
    }}>
      {ticks.map((f) => (
        <React.Fragment key={f}>
          <span style={{position: 'absolute', left: `${(f / totalFrames) * 100}%`, top: 2}}>
            {f}
          </span>
          <div style={{
            position: 'absolute', left: `${(f / totalFrames) * 100}%`, top: 10,
            width: 1, height: 4, background: theme.border.default,
          }} />
        </React.Fragment>
      ))}
      {/* Playhead at 30% */}
      <div style={{
        position: 'absolute', left: '30%', top: 0, width: 1, height: 14,
        background: theme.accent.blue, zIndex: 2,
      }}>
        <div style={{
          width: 7, height: 7, background: theme.accent.blue,
          borderRadius: '50%', marginLeft: -3,
        }} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create ActTrack.tsx**

```typescript
// src/tools/console/ActTrack.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface ActConfig {
  id: string;
  name: string;
  energy: 'explosive' | 'high' | 'moderate' | 'calm';
  color: string;
  scenes: SceneTimeline[];
  totalFrames: number;
}

const energyColors: Record<string, string> = {
  explosive: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  calm: '#22c55e',
};

export const ActTrack: React.FC<{act: ActConfig}> = ({act}) => {
  const [expanded, setExpanded] = useState(true);
  const color = energyColors[act.energy];

  return (
    <div style={{marginBottom: 2, border: `1px solid ${theme.border.subtle}`, borderRadius: 4, overflow: 'hidden'}}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px',
          background: theme.bg.surface, cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{fontSize: 7, color: theme.text.muted, transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s'}}>
          ▾
        </span>
        <span style={{fontSize: 7, color: theme.text.muted, width: 36}}>Act {act.id}</span>
        <span style={{fontSize: 8, color: theme.text.primary, fontWeight: 600}}>{act.name}</span>
        <span style={{fontSize: 7, color, display: 'flex', alignItems: 'center', gap: 3}}>⬤ {act.energy}</span>
        <span style={{fontSize: 7, color: theme.text.muted}}>
          {act.scenes[0]?.start ?? 0}-{act.scenes[act.scenes.length - 1]?.end ?? 0}f
        </span>
        <span style={{marginLeft: 'auto', fontSize: 7, color: theme.text.muted}}>
          {act.scenes.length} 场景
        </span>
      </div>

      {/* Scene segments */}
      {expanded && (
        <div style={{padding: '4px 8px 6px'}}>
          <div style={{display: 'flex', height: 24, background: theme.bg.deep, borderRadius: 3, position: 'relative', overflow: 'hidden'}}>
            {act.scenes.map(({scene, start, end}, index) => {
              const left = (start / act.totalFrames) * 100;
              const width = ((end - start) / act.totalFrames) * 100;
              const isFirst = index === 0;
              const isLast = index === act.scenes.length - 1;
              return (
                <div
                  key={scene.id}
                  style={{
                    position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%',
                    background: `${color}22`, border: `1px solid ${color}66`,
                    borderRadius: isFirst ? '3px 0 0 3px' : isLast ? '0 3px 3px 0' : '0',
                    display: 'flex', alignItems: 'center', padding: '0 5px',
                    cursor: 'pointer',
                  }}
                  title={`${scene.id} (${start}-${end}f)`}
                >
                  <span style={{fontSize: 7, color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {scene.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Create CueDetail.tsx**

```typescript
// src/tools/console/CueDetail.tsx
import React from 'react';
import {theme} from './theme';
import type {SceneTimeline} from './types';

interface CueDetailProps {
  selectedScene: SceneTimeline | null;
}

export const CueDetail: React.FC<CueDetailProps> = ({selectedScene}) => {
  if (!selectedScene) return null;
  const {scene, start, end} = selectedScene;

  return (
    <div style={{
      margin: '4px 12px 6px', background: theme.bg.deep,
      border: `1px solid ${theme.border.default}`, borderRadius: 4,
      padding: '6px 10px',
    }}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{fontWeight: 600, fontSize: 10, color: theme.accent.blue}}>{scene.id}</span>
          <span style={{color: theme.text.muted, fontSize: 8, background: theme.bg.surface, padding: '1px 6px', borderRadius: 3}}>
            {scene.family}
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>{start}-{end}f</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <div style={{background: theme.bg.surface, padding: '2px 8px', borderRadius: 3, fontSize: 8, color: theme.text.muted}}>
            入场: spring
          </div>
          <div style={{background: theme.accent.blue + '22', padding: '2px 8px', borderRadius: 3, fontSize: 8, color: theme.accent.blue, cursor: 'pointer'}}>
            预览此段 ▶
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Create CueLayerRow.tsx**

```typescript
// src/tools/console/CueLayerRow.tsx
import React from 'react';
import {theme} from './theme';

const layers = [
  {label: 'text 入场 0-15f', width: 80, color: theme.accent.blue},
  {label: 'icon 5-20f', width: 60, color: theme.accent.green},
  {label: 'shape bg 0-30f', width: 100, color: theme.accent.purple},
  {label: 'text 退场', width: 70, color: theme.accent.amber},
];

export const CueLayerRow: React.FC = () => (
  <div style={{
    margin: '0 12px 6px', background: theme.bg.deep,
    border: `1px solid ${theme.border.default}`, borderRadius: 4,
    padding: '6px 10px',
  }}>
    <div style={{fontSize: 8, color: theme.text.muted, marginBottom: 4}}>
      Cue 层细节 · <span style={{color: theme.accent.blue}}>cue-opening-title</span>
    </div>
    <div style={{display: 'flex', gap: 6, overflow: 'auto'}}>
      {layers.map((layer) => (
        <div
          key={layer.label}
          style={{
            flex: `0 0 ${layer.width}px`, height: 14,
            background: `${layer.color}22`, border: `1px solid ${layer.color}88`,
            borderRadius: 2, display: 'flex', alignItems: 'center', padding: '0 4px',
          }}
        >
          <span style={{fontSize: 6, color: layer.color}}>{layer.label}</span>
        </div>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 5: Create TimelineDock.tsx**

```typescript
// src/tools/console/TimelineDock.tsx
import React, {useState} from 'react';
import {theme} from './theme';
import type {VideoProject} from '../../project/projectSchema';
import type {SceneTimeline, RunnerJob, ActivityEvent} from './types';
import {TimelineRuler} from './TimelineRuler';
import {ActTrack} from './ActTrack';
import {CueDetail} from './CueDetail';
import {CueLayerRow} from './CueLayerRow';

interface TimelineDockProps {
  totalFrames: number;
  fps: number;
  timeline: SceneTimeline[];
  project: VideoProject;
  visibleJob: RunnerJob | null;
  logOpen: boolean;
  activity: ActivityEvent[];
  onRunCommand: (cmd: string, label: string) => void;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({
  totalFrames, fps, timeline, visibleJob, logOpen, activity,
}) => {
  const [selectedScene, setSelectedScene] = useState<SceneTimeline | null>(null);

  // Group timeline scenes by "acts" (using 3 arbitrary act groupings based on position)
  const acts = [
    {
      id: '1', name: '开场', energy: 'explosive' as const, color: '#ef4444',
      scenes: timeline.filter((_, i) => i < 3), totalFrames,
    },
    {
      id: '2', name: '展开', energy: 'high' as const, color: '#f97316',
      scenes: timeline.filter((_, i) => i >= 3 && i < 6), totalFrames,
    },
    {
      id: '3', name: '收束', energy: 'moderate' as const, color: '#eab308',
      scenes: timeline.filter((_, i) => i >= 6), totalFrames,
    },
  ].filter((act) => act.scenes.length > 0);

  return (
    <div style={{
      borderTop: `1px solid ${theme.border.subtle}`,
      background: theme.bg.deep, flexShrink: 0,
    }}>
      {/* Timeline header */}
      <div style={{
        padding: '5px 14px', borderBottom: `1px solid ${theme.border.subtle}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: theme.bg.elevated,
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{fontWeight: 600, fontSize: 10, color: theme.text.primary, display: 'flex', alignItems: 'center', gap: 4}}>
            <span>⏱</span> 分镜时间线
          </span>
          <span style={{color: theme.text.muted, fontSize: 8}}>{totalFrames} 帧 · {(totalFrames / fps).toFixed(1)}s @{fps}fps</span>
          <span style={{fontSize: 7, color: '#ef4444'}}>⬤ 爆发</span>
          <span style={{fontSize: 7, color: '#f97316'}}>⬤ 高能</span>
          <span style={{fontSize: 7, color: '#eab308'}}>⬤ 温和</span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <div style={{background: theme.bg.surface, padding: '2px 6px', borderRadius: 3, fontSize: 8, color: theme.text.muted, cursor: 'pointer', border: `1px solid ${theme.border.subtle}`}}>
            🔍 +
          </div>
          <div style={{background: theme.bg.surface, padding: '2px 6px', borderRadius: 3, fontSize: 8, color: theme.text.muted, cursor: 'pointer', border: `1px solid ${theme.border.subtle}`}}>
            −
          </div>
        </div>
      </div>

      {/* Timeline body */}
      <div style={{padding: '6px 14px 4px'}}>
        <TimelineRuler totalFrames={totalFrames} />
        {acts.map((act) => (
          <ActTrack key={act.id} act={act} />
        ))}
        {acts.length === 0 && (
          <div style={{padding: '20px 0', textAlign: 'center', color: theme.text.muted, fontSize: 9}}>
            暂无分镜数据，请先生成文案
          </div>
        )}
      </div>

      {/* Cue detail (shown when scene selected) */}
      <CueDetail selectedScene={selectedScene} />
      <CueLayerRow />

      {/* Job activity footer */}
      <div style={{
        borderTop: `1px solid ${theme.border.subtle}`, padding: '4px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: theme.bg.elevated, fontSize: 8, color: theme.text.muted,
      }}>
        <span>{activity[0]?.text ?? '就绪'}</span>
        <span>{visibleJob ? `任务: ${visibleJob.status}` : '无活跃任务'}</span>
      </div>

      {/* Log viewer */}
      {logOpen && visibleJob && (
        <pre style={{
          maxHeight: 120, overflow: 'auto', padding: '8px 14px',
          borderTop: `1px solid ${theme.border.subtle}`, background: theme.bg.deep,
          color: theme.text.secondary, fontSize: 9, fontFamily: theme.mono,
          lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0,
        }}>
          {visibleJob.logs.join('\n') || visibleJob.command}
        </pre>
      )}
    </div>
  );
};
```

- [ ] **Step 6: Commit**

```
git add src/tools/console/TimelineDock.tsx src/tools/console/TimelineRuler.tsx src/tools/console/ActTrack.tsx src/tools/console/CueDetail.tsx src/tools/console/CueLayerRow.tsx
git commit -m "feat: add TimelineDock with interactive DirectorScore timeline"
```

---

### Task 9: Entry point — update to use new console app

**Files:**
- Create: `src/tools/console/index.tsx`

- [ ] **Step 1: Create index.tsx entry point**

```typescript
// src/tools/console/index.tsx
import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
export default App;
```

- [ ] **Step 2: Update src/tools/index.html**

The existing index.html already imports `VideoFactoryConsole.tsx`. Update the import to point to the new entry point. Change the script tag `src="./VideoFactoryConsole.tsx"` to `src="./console/index.tsx"`.

Search for the script tag in `index.html`:

```html
<script type="module" src="./console/index.tsx"></script>
```

No other changes needed to index.html.

- [ ] **Step 3: Commit**

```
git add src/tools/console/index.tsx src/tools/index.html
git commit -m "feat: add entry point for new console, update index.html"
```

---

### Task 10: Remove old files

**Files:**
- Delete: `src/tools/VideoFactoryConsole.tsx`
- Delete: `src/tools/DirectorScorePreview.tsx`
- Delete: `src/tools/global.css`
- Delete: `src/tools/components/*.tsx` (8 files)

- [ ] **Step 1: Verify nothing else imports the old files**

Search for imports of `VideoFactoryConsole`, `DirectorScorePreview`, and `global.css`.

Run: `grep -r "VideoFactoryConsole\|DirectorScorePreview\|global\.css\|from './components" src/tools/ --include='*.ts' --include='*.tsx'`

Expected: only index.tsx references the old VideoFactoryConsole. No remaining references to DirectorScorePreview or components.

- [ ] **Step 2: Delete old files**

```bash
rm src/tools/VideoFactoryConsole.tsx
rm src/tools/DirectorScorePreview.tsx
rm src/tools/global.css
rm src/tools/components/ActTrack.tsx
rm src/tools/components/CameraPathChart.tsx
rm src/tools/components/CueTrack.tsx
rm src/tools/components/DetailPanel.tsx
rm src/tools/components/PreviewHeader.tsx
rm src/tools/components/PreviewPlayer.tsx
rm src/tools/components/TimelineFooter.tsx
rm src/tools/components/TimelinePanel.tsx
```

- [ ] **Step 3: Commit**

```
git add -A src/tools/
git commit -m "refactor: remove old VideoFactoryConsole, DirectorScorePreview, global.css and legacy components"
```

---

### Task 11: Build and verify

- [ ] **Step 1: Run the build to check for errors**

Run: `cd remotion-video && npx tsc --noEmit --pretty src/tools/console/index.tsx 2>&1 | head -50`
Expected: No type errors.

- [ ] **Step 2: Start the dev server and verify in browser**

```
cd remotion-video && npm run tools:dev
```

Expected: The app loads in the browser showing the dark theme console with:
- Topbar with project selector and status
- Left panel with 7-step flow
- Center panel with script editor
- Right panel with preview and bento grid
- Bottom timeline dock
- All existing functionality works (project loading, script editing, job running)

- [ ] **Step 3: Fix any issues found**

If the build fails or the app doesn't work, fix the issues inline. Common issues:
- Missing imports from the old data layer
- Type mismatches between old and new code
- CSS class references that were removed

- [ ] **Step 4: Final commit with any fixes**

```
git commit -am "fix: resolve type errors and integration issues"
```
