# Remotion Skill Showcase Video Factory

[简体中文](README.md) | English

Video Factory produces portrait Remotion videos from one Project JSON. Root [CONTRACT.md](CONTRACT.md) governs the public API, seven-step workflow, locked stack, and module ownership.

## Production Path

```text
narration script
  -> initial Project JSON build (ignoring stale captions)
  -> TTS synthesis or uploaded audio
  -> timestamps extracted from the current audio
  -> Project JSON rebuilt with source text and real timing
  -> Project / Visual Check
  -> scene stills / MP4 / Verify
```

Source narration controls visual meaning; current audio controls timing. ASR/Whisper supplies time boundaries and never replaces the source narration text.

Production output is `1080x1920 / 30fps / portrait`, using the `skill-showcase` scene family. Remotion registers `UltimateVideoV2` and `RemotionStoryboardLibrary`.

## Quick Start

Node.js 20 or newer is required.

```bash
npm run setup
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
```

Generate Project JSON from narration:

```bash
npm run project:from-script -- \
  --id demo \
  --title "Demo video" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

Generate a still or MP4:

```bash
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

## Studio

```bash
cd remotion-video
npm run tools:studio
```

Open [http://127.0.0.1:8787/](http://127.0.0.1:8787/). The creator flow is fixed:

```text
copy -> script -> voice -> style -> storyboard -> render -> deliver
```

The video library is a separate screen and the component library is an auxiliary workspace.

## Documentation

| Document | Read it when |
|---|---|
| [AGENTS.md](AGENTS.md) | Starting a new coding-agent window |
| [CONTRACT.md](CONTRACT.md) | Changing API, workflow, stack, or ownership boundaries |
| [VIDEO_FACTORY_AGENT_PROMPT.md](VIDEO_FACTORY_AGENT_PROMPT.md) | Assigning a development task to a new agent |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Locating implementation modules, data flow, and extension points |
| [docs/INTRO.zh-CN.md](docs/INTRO.zh-CN.md) | Understanding caption, beat, lens, shot, and screen zones |
| [docs/PRODUCTION-GUARDRAILS.zh-CN.md](docs/PRODUCTION-GUARDRAILS.zh-CN.md) | Changing generation or visual-quality behavior |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Preparing and verifying a code change |
| [SECURITY.md](SECURITY.md) | Handling local assets, paths, and sensitive data |

Historical cleanup records are not current engineering authority.
