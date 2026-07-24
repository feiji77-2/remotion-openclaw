# Video Factory Contract

This document is the constitution for Video Factory frontend and backend work.
It was last reconciled with the repository on 2026-07-23.

## 1. Authority and change protocol

1. This file is authoritative for public HTTP methods, paths, request bodies, response envelopes, workflow order, and architectural boundaries.
2. A task that does not explicitly require a public API change must not change a route, status code, request shape, or response shape.
3. A task that does require a public API change must update, in the same change:
   - this file first;
   - `remotion-video/scripts/tools-studio-server.mjs` and relevant backend helpers;
   - `remotion-video/src/tools/console/api.ts` and `types.ts`;
   - provider and consumer tests.
4. Do not edit this contract merely to legitimize an accidental implementation drift. Preserve the documented behavior, fix the drifting implementation or consumer, and add a regression test.
5. A discovered conflict between this file and executable behavior is a blocking defect for the affected feature. Report it explicitly and resolve it within the task scope before delivery.

## 2. HTTP conventions

Base URL: `http://127.0.0.1:8787`

JSON success responses use an `ok: true` envelope. Binary endpoints are the only exception. JSON failures use:

```typescript
interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
  path?: string;
  diagnostics?: JobDiagnostic[];
}
```

Unknown JSON fields are not permission to depend on them. Any new consumer-visible field must be documented here and typed in `types.ts`.

## 3. Public API

### Health

```text
GET /api/health
200 -> {
  ok: true,
  cwd: string,
  jobs: number,
  runningJobs: number,
  persistence: string
}
```

### Projects

```text
GET /api/projects
200 -> { ok: true, projects: ProjectOption[] }

POST /api/projects
body <- CreateProjectDraft
201 -> { ok: true, project: ProjectOption, files: ProjectContractPaths }
409 -> ErrorResponse

GET /api/projects/:id/state
200 -> { ok: true, state: ProjectState }
404 -> ErrorResponse

POST /api/projects/:id/audio?filename=<encoded>
body <- raw audio bytes; Content-Type: audio/* or application/octet-stream
201 -> { ok: true, audio: UploadedAudioAsset }
4xx -> ErrorResponse
```

### Contract files

```text
GET /api/files?path=<encoded>
200 -> { ok: true, file: StudioFile }

POST /api/files
body <- { path: string, data: unknown }
200 -> { ok: true, file: StudioFile }
```

Only backend-approved contract paths are readable. Only writable project contract paths may be written. Do not weaken the path guards or make sample projects writable as part of an unrelated task.

### Jobs

```text
GET /api/jobs?projectId=<id>&limit=<1..200>
200 -> { ok: true, jobs: RunnerJob[] }

POST /api/jobs
body <- {
  commandId: CommandId,
  label: string,
  project: ProjectOption,
  files?: Array<{ path: string, data: unknown }>
}
202 -> { ok: true, job: RunnerJob }

GET /api/jobs/:id
200 -> { ok: true, job: RunnerJob }
404 -> ErrorResponse

POST /api/jobs/:id/retry
body <- {}
202 -> { ok: true, job: RunnerJob }
4xx -> ErrorResponse
```

Supported `CommandId` values are:

```typescript
type CommandId =
  | 'build-project'
  | 'project-check'
  | 'project-still'
  | 'project-scene-stills'
  | 'project-render'
  | 'project-verify'
  | 'build-check'
  | 'build-check-audio'
  | 'render-verify';
```

`files` is accepted only by `build-check` and `build-check-audio`.

### Artifacts and libraries

```text
GET /api/artifact?path=<encoded>[&v=<cache-key>]
200 -> binary artifact or JSON artifact

GET /api/component-library
200 -> ComponentLibraryResponse

GET or HEAD /api/component-library/asset?path=<encoded>
200 -> binary preview asset

GET /api/video-library
200 -> { ok: true, records: VideoLibraryRecord[] }

GET /api/video-library/:id/download
200 -> binary MP4
4xx -> ErrorResponse
```

A video download is permitted only when the record is downloadable and the project's current `deliveryReady` is true.

## 4. Public data types

```typescript
interface ProjectOption {
  id: string;
  title: string;
  productionPath: string;
  projectJsonPath: string;
  outputVideoPath: string;
}

interface CreateProjectDraft {
  projectId: string;
  title: string;
  orientation: 'portrait';
  style: 'cyan-tech' | 'amber-editorial' | 'red-minimal' | 'purple-launch';
  spokenScript: string;
  keywords: string;
}

interface ProjectContractPaths {
  brief: string;
  scriptPack: string;
  assetPack: string;
  projectJson: string;
}

interface StudioFile {
  path: string;
  exists: boolean;
  data: unknown | null;
  error?: string;
}

interface UploadedAudioAsset {
  src: string;
  path: string;
  fileName: string;
  size: number;
  contentType: string;
}

type JobStatus = 'running' | 'done' | 'failed';
type StageStatus = 'missing' | 'stale' | 'current';

interface JobStep {
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

interface JobDiagnostic {
  level: 'error' | 'warning' | 'info';
  code: string;
  phase: string;
  path: string | null;
  message: string;
}

interface RunnerJob {
  id: string;
  commandId: CommandId;
  workflowId: string | null;
  label: string;
  command: string;
  status: JobStatus;
  project: ProjectOption;
  projectId: string | null;
  currentStep: string | null;
  steps: JobStep[];
  logs: string[];
  exitCode: number | null;
  error: string | null;
  diagnostics: JobDiagnostic[];
  retryOf: string | null;
  artifact: { kind: 'image' | 'video' | 'json', path: string, url?: string | null } | null;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string | null;
}

interface ProjectStage {
  status: StageStatus;
  path?: string;
  checkedAt?: string | null;
  finishedAt?: string | null;
  result?: Record<string, unknown> | null;
}

interface ProjectState {
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

interface VideoLibraryRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  videoPath: string;
  createdAt: string;
  status: 'generated' | 'downloadable' | 'verification-failed';
  playbackUrl: string;
  downloadUrl: string | null;
  downloadAllowed: boolean;
  failureMessage: string | null;
  sourceJobId: string;
}

interface ComponentLibraryResponse {
  ok: true;
  available: boolean;
  sourceRoot: string;
  version: number | string | null;
  warning?: string;
  components: ComponentLibraryItem[];
}

interface ComponentLibraryItem {
  id: string;
  sourceId: string;
  source: 'project' | 'hyperframes';
  label: string;
  description: string;
  category: string;
  orientation: 'portrait' | 'landscape';
  size: string;
  duration: number | null;
  tags: string[];
  formats: string[];
  previewUrl: string | null;
  previewKind: 'video' | 'remotion' | 'mock';
  status: 'ready' | 'draft';
  productionReady: boolean;
  compatibleIntents: string[];
  compatibleShotKinds: string[];
  requiredData: string[];
  motionCapability: string[];
  styleCapability: string[];
  renderer: { componentId: string, rendererId: string } | null;
  schema: ComponentVariable[];
}
```

`save-inputs` is emitted when an authorized build workflow persists submitted contract files before its process steps. `internal` is reserved for backend bookkeeping steps such as reporting a state-persistence failure. Only `process` steps contain a command array.

`ComponentLibraryItem` is mirrored in `remotion-video/src/tools/console/component-library-model.ts`. Its server serializer and that type must change together.

`status: 'ready'` means the source asset or preview is available. It does not imply production capability. Only `productionReady: true` with a non-null `renderer` may enter a Visual Plan. HyperFrames HTML templates and pre-rendered samples are returned as `productionReady: false` and `renderer: null` until a real in-project Remotion renderer is integrated.

## 5. Workflow contract

The creator workflow has seven ordered production steps:

```text
copy -> script -> voice -> style -> storyboard -> render -> deliver
```

The video library is a separate screen, not an eighth gated production step. The component library is an auxiliary workspace. `preview` remains a disabled legacy `WorkflowStepId` and is not rendered in the production stepper.

`remotion-video/src/tools/console/workflow-model.ts` is the sole navigation gate implementation. Current gates are:

| Destination | Required evidence |
|---|---|
| `copy` | project selected |
| `script` | project selected |
| `voice` | project selected and script explicitly saved |
| `style` | voice asset ready |
| `storyboard` | saved style ready |
| `render` | saved style ready |
| `deliver` | render artifact status is `current` |
| `components` | project selected |
| `preview` | always disabled |

Entering `deliver` allows the user to inspect or retry a rendered artifact. Actual download readiness is stricter: backend `deliveryReady` requires both a current production build and a current verification result.

Changes to formal production inputs must immediately mark downstream project, preview, scene still, render, and verify artifacts stale and set `deliveryReady` to false.

## 6. Locked architecture

| Layer | Current choice |
|---|---|
| UI | React 19 |
| Language | TypeScript 5 |
| Tooling | Vite 6 |
| Video | Remotion 4 |
| Backend | Node.js ESM, native `node:http` |
| Runtime support | Node.js 20 or newer |
| Client state | React built-in hooks |
| Studio styling | global `src/tools/console/index.css` |
| HTTP client | built-in `fetch` |

Do not introduce or migrate to Next.js, Vue, Svelte, Angular, jQuery, Redux, MobX, styled-components, Express, Fastify, Koa, or NestJS. `tailwindcss` already exists as a development dependency, but the Studio does not use it; its presence is not authorization to enable Tailwind or migrate Studio CSS.

Do not add a dependency when an existing repository utility or platform API solves the task. Any task that genuinely requires a new framework or architectural dependency must first change this contract explicitly.

## 7. Ownership boundaries

```text
remotion-video/
  scripts/tools-studio-server.mjs       backend HTTP server and route handlers
  scripts/lib/studio-backend.mjs        backend state, jobs, and persistence helpers
  src/tools/console/api.ts              only frontend HTTP client boundary
  src/tools/console/types.ts            frontend mirrors of public DTOs
  src/tools/console/workflow-model.ts   navigation and artifact invalidation rules
  src/tools/console/StudioApp.tsx       orchestration
  src/tools/console/StudioShell.tsx     shell regions and conditional layout
  src/tools/console/*Workspace.tsx      step-specific UI
  src/tools/console/__tests__/          Studio consumer and workflow tests
```

Do not encode API calls directly in workspace components. Do not duplicate gate logic outside `workflow-model.ts`. Do not move files or ownership boundaries unless the task explicitly calls for an architectural change and this section is updated.

`StudioShell` preserves header, navigation, workspace, and developer drawer. Preview and timeline regions are conditional: wide editing steps intentionally omit preview, and only scene-oriented steps show the timeline.

## 8. Required verification

Run commands from the repository root.

Always run:

```bash
npm run typecheck
npm test
npm --prefix remotion-video exec vitest run src/tools/console
```

Also run the applicable checks:

| Change | Additional verification |
|---|---|
| Studio UI or CSS | `npm --prefix remotion-video run tools:build` and relevant console tests |
| User interaction or layout | `npm --prefix remotion-video run test:ui` |
| Backend route or API client | `npm --prefix remotion-video run test:e2e` plus provider/consumer regression tests |
| Project schema or generation | relevant `project:check` and generator tests |
| Rendering behavior | relevant still/render/verify command for the affected fixture |

Never claim a check passed unless it was executed successfully. If an environmental prerequisite prevents a required check, report the exact command, failure, and residual risk.

Before delivery, inspect the diff and confirm:

- public APIs changed only when the task required it, with contract, provider, consumer, and tests updated together;
- `types.ts` mirrors consumed response fields;
- workflow order, gates, and invalidation behavior remain covered;
- no forbidden dependency or framework was introduced;
- unrelated user changes were preserved;
- no route, gate, or layout claim relies on stale file counts or line counts.
