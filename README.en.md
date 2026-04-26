# OpenClaw Remotion Video Pipeline

English | [简体中文](README.md)

An open-source workflow studio and Remotion render pipeline for Chinese tech / AI explainer videos.

The active mainline is now:

- Step 1-3: search, analysis, title, script
- Step 4: `video-pipeline-scene-planner` for variable scene planning
- Step 5: `video-pipeline-scene-prompts` for 16:9 visual prompts
- Step 6: narration and TTS
- Step 7: Remotion project packaging
- Step 8: Ultimate widescreen rendering

The old `video-pipeline-storyboard + Video1v4` fixed 6-shot path has been removed from the active source tree. Historical migration material only remains under `docs/archive/`, and it is no longer a default skill source, build target, or render entrypoint.

## Highlights

- Two-app structure: player UI + Remotion / API runtime
- Mainline defaults to the `Ultimate 1920x1080` widescreen system
- Step 4 / 5 is aligned to `20` reusable template families instead of a fixed 6-shot storyboard
- Async image, voice, and render job flow
- Single public validation entrypoint: `npm run release:check`

## Repository Layout

```text
.
├── .github/
├── ARCHITECTURE.md
├── docs/
├── remotion-video/
└── video-pipeline-view/player-app/
```

## Main Modules

- `video-pipeline-view/player-app`
  Step 1-8 workflow UI, local persistence, job polling, and result review
- `remotion-video/server`
  Express API, skill registry, image / voice / render jobs, and worker integration
- `remotion-video/src`
  Remotion compositions, Ultimate template components, and runtime contracts

## Current Video Path

- `20` means `20` Ultimate template families, not a fixed `20`-shot storyboard
- Step 4 expands the script into `6-12` widescreen scenes and preassigns `sceneFamily`
- Step 5 generates `16:9 / 1920x1080` visual prompts per scene
- `hero` is fixed as the first scene, `cta` is fixed as the final scene
- Middle-scene families are selected with a diversity bias

## Requirements

- Node.js `>=20`
- npm `>=10`
- Optional local services:
  - ChatTTS HTTP
  - Melo / OpenVoice
  - Deepgram
  - Redis for BullMQ mode
- Optional workflow providers:
  - OpenClaw CLI
  - OpenAI-compatible API endpoint

## Quick Start

1. Install dependencies for both subprojects.

```bash
npm run setup
```

2. Copy the environment template.

```bash
cp remotion-video/.env.example remotion-video/.env
```

3. Start the API, worker, and player app.

```bash
npm run dev:api
npm run dev:worker
npm run dev:player
```

4. Open the local services.

- Player: `http://127.0.0.1:5174`
- API Health: `http://127.0.0.1:3001/health`

## Core Commands

- `npm run setup`
  Install dependencies for the player app and Remotion runtime
- `npm run clean`
  Remove local build outputs and runtime artifacts
- `npm run dev:player`
  Start the player app
- `npm run dev:api`
  Start the pipeline API
- `npm run dev:worker`
  Start the render worker
- `npm run dev:video`
  Open Remotion Studio
- `npm run build`
  Build the player app
- `npm run build:video`
  Run a demo render using `UltimateSceneTemplate`
- `npm run typecheck`
  Run frontend TS, Remotion TS, and backend syntax checks
- `npm run test`
  Run backend tests
- `npm run release:check`
  Run the main public-release validation, including a short smoke MP4 render verification

## Workflow Scope

- Step 1: `video-pipeline-analysis`
- Step 2: `video-pipeline-title`
- Step 3: `video-pipeline-content`
- Step 4: `video-pipeline-scene-planner`
- Step 5: `video-pipeline-scene-prompts`
- Step 6: `video-pipeline-audio`
- Step 7: `remotion-video-maker`
- Step 8: `video-pipeline-video`

Step 4 / 5 now produces the Ultimate scene source of truth:

- `shots[].sceneFamily`
- `shots[].templateCandidates`
- `scenePlan`
- `prompts.byShotId`
- `prompts.byShotId[].sceneFamily`

## API Surface

- `GET /health`
- `GET /api/skills/catalog`
- `GET /api/skills/:skillId`
- `POST /api/workflow/generate`
- `GET /api/workflow/:jobId`
- `POST /api/images/generate`
- `GET /api/images/:jobId`
- `POST /api/voice`
- `GET /api/voice/:jobId`
- `POST /api/render`
- `GET /api/render/:jobId`
- `GET /api/render/:jobId/download`

## Documentation

- Mainline and generation references
  - [ARCHITECTURE.md](ARCHITECTURE.md)
    Current architecture, Step ownership, and API surface
  - [remotion-video/docs/ultimate-20-template-audit.zh-CN.md](remotion-video/docs/ultimate-20-template-audit.zh-CN.md)
    Audit summary for the active 20-template mainline
  - [remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md](remotion-video/docs/ultimate-20-template-cheatsheet.zh-CN.md)
    Full family table and hit rules
- [remotion-video/docs/ultimate-style-hit-guide.zh-CN.md](remotion-video/docs/ultimate-style-hit-guide.zh-CN.md)
  Style hit rules and practical control notes
- [CONTRIBUTING.md](CONTRIBUTING.md)
  Contribution workflow and validation rules
- [SECURITY.md](SECURITY.md)
  Security reporting guidance

## Release Notes

- Default production composition: `UltimateSceneTemplate`
- Default widescreen output: `1920x1080 / 30fps`
- Local generated packages under `remotion-video/projects/` stay out of version control
- Root `package.json` remains `private: true`

## License

MIT. See [LICENSE](LICENSE).
