# Video Factory

[简体中文](README.md) | English

Video Factory produces portrait Remotion videos from one Project JSON. Root [CONTRACT.md](CONTRACT.md) governs the public HTTP API, seven-step Studio workflow, locked stack, and module ownership.

## Current Production Path

```text
brief.json + script-pack.json + asset-pack.json
  -> project:from-pack / Studio build-check
  -> TTS synthesis or uploaded audio
  -> audio:align-captions
  -> Project JSON rebuilt from source narration and current audio timing
  -> project:check + project:visual-check
  -> project:scene-stills / project:render / project:verify
```

Source narration controls visual meaning; current audio controls timing. ASR/Whisper supplies time boundaries and never replaces the source narration text.

The delivery composition is `UltimateVideoV2`, using the `skill-showcase` scene family at `1080x1920 / 30fps / portrait`. The 29 production composition templates are the only production component catalog.

The repository also keeps a non-public v2 product-spec QA path for schema, motion preset, variant, and report validation:

```text
video-product.json
  -> product:metrics
  -> product:report
  -> VideoProductSystemDemo (inspectable in Remotion Studio)
```

That path does not change the Studio HTTP API or seven-step delivery workflow.

## Quick Start

Node.js 20 or newer is required.

```bash
npm run setup
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
```

Generate Project JSON from a production pack:

```bash
npm --prefix remotion-video run project:from-pack -- examples --out project.json --ignore-captions
```

Generate Project JSON from direct narration:

```bash
npm run project:from-script -- --id demo --title "Demo video" --script-file ./script.txt --out projects/demo/project.json
```

Check, still, render, and verify:

```bash
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
npm --prefix remotion-video run project:verify -- --props examples/skill-showcase.json --video out/skill-showcase.mp4
```

Run v2 product-spec non-render checks:

```bash
npm run product:from-script -- remotion-video/scripts/lib/__tests__/fixtures/visual-diversity-product --out /tmp/video-product.json --strict
npm run product:metrics -- scripts/lib/__tests__/fixtures/video-product-product/video-product.json --strict
npm run product:report -- scripts/lib/__tests__/fixtures/video-product-product/video-product.json --variant editorial --strict
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

## Inputs And Outputs

| File | Purpose |
|---|---|
| `remotion-video/examples/brief.json` | Project metadata, platform, visual style, and audience |
| `remotion-video/examples/script-pack.json` | Narration and keywords, the semantic source of truth |
| `remotion-video/examples/asset-pack.json` | Registered local or remote assets |
| `remotion-video/examples/skill-showcase.json` | Schema v1 Project JSON example for `UltimateVideoV2` |
| `remotion-video/examples/video-product-system.json` | v2 product-spec example, not part of the public Studio API |
| `remotion-video/out/*.png|*.mp4|*.json` | Local still, MP4, QA, or report output |

The current sample `asset-pack.json` does not register image, screenshot, or video assets; the `skill-showcase` example uses text, icons, and procedural UI evidence. The latest non-render media audit found no usable image/video assets for the media-backed evidence scenes in the v2 examples and fixtures. Real deliveries should register usable `image` / `video` assets and reference them from evidence scenes.

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
