# OpenClaw Remotion Video Pipeline

English | [简体中文](README.md)

An open-source workflow studio and Remotion render pipeline for Chinese short-form video production.

This repository packages the Step 1-8 workflow UI, workflow API, voice/image/render jobs, and the `Video1v4` production composition into one public-facing codebase. It can serve as:

- a short-form video workflow product prototype
- a Remotion-based video generation starter
- an async job orchestration example for voice, image, and render pipelines
- a reusable base for Chinese content production tooling

## Highlights

- Two-app structure: player UI + Remotion/API runtime
- Mainline release surface is cleaned up and legacy scripts are archived under `docs/archive/`
- Supports either OpenAI-compatible APIs or a local OpenClaw CLI workflow provider
- Includes async image, voice, and render job flows
- Ships with a single public-release validation command: `npm run release:check`

## Repository Layout

```text
.
├── .github/
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── docs/
│   ├── archive/
│   └── release-metadata.md
├── remotion-video/
└── video-pipeline-view/player-app/
```

## Main Modules

- `video-pipeline-view/player-app`
  Step 1-8 workflow UI, local persistence, task polling, and result review
- `remotion-video/server`
  Express API, skill registry, image/voice/render jobs, and worker integration
- `remotion-video/src`
  Remotion compositions, render families, visual components, and runtime contracts

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
- `npm run typecheck`
  Run frontend TypeScript, Remotion TypeScript, and backend syntax checks
- `npm run build`
  Build the player app
- `npm run build:video`
  Run one render using the default production composition
- `npm run release:check`
  Main public-release validation entrypoint

## Release Check

`npm run release:check` runs:

```bash
npm run clean
npm run typecheck
npm run build
node remotion-video/scripts/clean-runtime.mjs --check
```

Goals:

- public scripts resolve correctly
- key backend files pass syntax checks
- the player app builds successfully
- runtime directories remain clean after validation

## Workflow Scope

The active pipeline is organized as Step 1-8:

- Step 1-3: analysis, title generation, script generation
- Step 4-5: storyboard structure and image prompts
- Step 6: narration and TTS preparation
- Step 7: Remotion project/build summary
- Step 8: final render parameters, preview, and export

For deeper architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## API Surface

- `GET /health`
- `GET /api/skills/catalog`
- `GET /api/skills/:skillId`
- `POST /api/workflow/generate`
- `POST /api/images/generate`
- `GET /api/images/:jobId`
- `POST /api/voice`
- `GET /api/voice/:jobId`
- `POST /api/render`
- `GET /api/render/:jobId`
- `GET /api/render/:jobId/download`

## Environment Variables

See [remotion-video/.env.example](remotion-video/.env.example) for the full variable list.

Common variables:

- `PIPELINE_QUEUE_MODE`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_WORKFLOW_MODEL`
- `OPENCLAW_CLI_PATH`
- `CHATTTS_HTTP_HEALTH_URL`
- `CHATTTS_HTTP_SYNTH_URL`
- `MELO_HTTP_HEALTH_URL`
- `MELO_HTTP_SYNTH_URL`
- `REDIS_URL`

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
  Mainline architecture, Step ownership, and API surface
- [CONTRIBUTING.md](CONTRIBUTING.md)
  Contribution rules and validation workflow
- [SECURITY.md](SECURITY.md)
  Security reporting guidance
- [docs/release-metadata.md](docs/release-metadata.md)
  Ready-to-use GitHub/Gitee descriptions, topics, and release copy
- [docs/archive/README.md](docs/archive/README.md)
  Archive policy

## Release Notes

- Current production composition: `Video1v4`
- Legacy helper scripts are preserved only under `docs/archive/`
- Local generated project packages under `remotion-video/projects/` are excluded from version control
- Root `package.json` remains `private: true`; this repository is not intended for npm package publishing by default

## License

MIT. See [LICENSE](LICENSE).
