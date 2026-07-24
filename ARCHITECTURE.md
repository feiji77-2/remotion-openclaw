# Architecture

Public API, workflow order, locked stack, and module ownership are governed by [CONTRACT.md](CONTRACT.md). This document describes the implementation inside those boundaries.

## System Flow

```text
brief.json + script-pack.json + asset-pack.json
  -> scripts/lib/script-project-generator.mjs
  -> caption semantic intent
  -> beat + lens + shot
  -> production component resolver
  -> Project JSON + Visual Plan
  -> src/project/projectSchema.ts
  -> src/project/compileProject.ts (derive render states from Visual Plan)
  -> src/project/sceneRegistry.tsx
  -> UltimateVideoV2
  -> Still / MP4 / Verify
```

The Studio uses the same generator and renderer as command-line production. It does not maintain a second schema, renderer, or output path.

## Production Pack Workflow

The `build-check` workflow is owned by `scripts/lib/studio-backend.mjs`:

```text
project:from-pack --ignore-captions
  -> tts:project
  -> audio:align-captions
  -> project:from-pack --captions captions.json
  -> project:check
```

`build-check-audio` uses uploaded audio and omits TTS. Both paths rebuild Project JSON after audio alignment. Source narration supplies semantic text; the current voiceover supplies timestamps.

## Runtime Ownership

| Responsibility | Owner |
|---|---|
| HTTP routes and response serialization | `remotion-video/scripts/tools-studio-server.mjs` |
| Jobs, state, fingerprints, persistence | `remotion-video/scripts/lib/studio-backend.mjs` |
| Production-pack generation | `remotion-video/scripts/build-project-from-production.mjs` |
| TTS and voice asset registration | `remotion-video/scripts/generate-tts-for-project.mjs` |
| Audio-derived caption timing | `remotion-video/scripts/align-captions-from-audio.mjs` |
| Frontend HTTP boundary | `remotion-video/src/tools/console/api.ts` |
| Frontend DTO mirrors | `remotion-video/src/tools/console/types.ts` |
| Navigation and invalidation | `remotion-video/src/tools/console/workflow-model.ts` |
| Studio orchestration | `remotion-video/src/tools/console/StudioApp.tsx` |
| Shell layout | `remotion-video/src/tools/console/StudioShell.tsx` |
| Project schema | `remotion-video/src/project/projectSchema.ts` |
| Compile-time timing and assets | `remotion-video/src/project/compileProject.ts` |
| Scene payload validation | `remotion-video/src/project/sceneRegistry.tsx` |
| Visual production checks | `remotion-video/scripts/lib/visual-contract.mjs` |
| Semantic intent and component selection | `remotion-video/scripts/lib/semantic-component-resolver.mjs` |
| Type-safe Visual Plan | `remotion-video/src/project/visualPlan.ts` |
| Production component descriptors and renderers | `productionComponentCatalog.json` + `HeroTrackV2.tsx` |

## Timeline Model

`scenes[].durationInFrames` is the render-duration source. Generated projects bind the following data to one timeline:

```text
audio timestamp
  -> captions[]
  -> scene.captionRange
  -> visualPlan.entries[]
     -> semantic intent
     -> beat + HeroLens + HeroShot
     -> production component + props + assets + diagnostics
  -> compileProject derives beats[] + heroTrack.states[]
```

For a multi-caption scene, `visualPlan.entries[]` must cover the complete caption range and scene duration. The narration hash binds the plan to the current caption text and timestamps. `compileProject` derives both semantic beats and Hero states from those entries, so stale payload state cannot outrank the plan.

## Render Path

The only production scene family is `skill-showcase`:

```text
sceneRegistry.tsx
  -> SkillShowcase.tsx
     -> PortraitCinematicSkillShowcase.tsx
     -> HeroTrackV2.tsx
        -> production component registry
        -> matched Remotion renderer
```

The portrait composition has three independent responsibilities:

| Zone | Responsibility | Primary data |
|---|---|---|
| Top Hero | operation evidence and technical process | `heroTrack.states[].shot` |
| Middle-lower beat | current conclusion and emphasis | `beats[]` |
| Bottom captions | complete narration text | `captions[]` |

## Storyboard Contract

The project Storyboard is not `RemotionStoryboardLibrary`. The latter is a fixed capability acceptance catalog for renderer development. The Studio Storyboard reads `project.visualPlan.entries[]` and displays stills rendered from the current Project JSON. If a current still does not exist, it displays plan metadata and diagnostics rather than a hand-built wireframe.

```text
Project Visual Plan
  -> Storyboard inspector + project scene stills
  -> compileProject + UltimateVideoV2 + MP4
```

There is no Storyboard-only component resolver, renderer, or component override. `sceneEditor.componentId` remains provenance metadata and never changes the plan or render path.

## Component Audit

| Surface | Production status | Reason |
|---|---|---|
| 12 entries in `productionComponentCatalog.json` | Production | Each descriptor binds compatible intents and shots to a real Remotion renderer. |
| HyperFrames catalog entries | Preview only | They are HTML templates or pre-rendered samples and have no in-project React renderer. |
| 9 legacy Hero Track layouts | Compatibility renderer | Existing projects may still render them, but caption-driven production states resolve through the production component registry. |
| 11 Cinematic presets | Motion capability | They animate semantic beats; they are not selectable content components. |
| `RemotionStoryboardLibrary` | Capability QA only | Fixed 11 + 9 acceptance catalog, never a project Storyboard. |
| Studio structural sketch | Removed | It duplicated appearance with generic lines and boxes instead of rendering the current plan. |
| HyperFrames scene asset overlay | Removed | A preview video could bypass captions, lens, shot, and component resolution. |

The production fallback is an explicit red diagnostic surface. `compileProject` and the visual contract reject fallback/error entries before a final render, so it cannot silently dominate an MP4.

Domain definitions live in [docs/INTRO.zh-CN.md](docs/INTRO.zh-CN.md). Production prohibitions live in [docs/PRODUCTION-GUARDRAILS.zh-CN.md](docs/PRODUCTION-GUARDRAILS.zh-CN.md).

## Renderer Quality Boundary

The current production registry contains 12 component IDs, but registry reachability is not visual acceptance. A renderer must express the semantics of its `shot.kind` through composition and motion, not only copy, color, or icon changes.

`HeroTrackV2.tsx` keeps `TechnicalShotHero`, `TrackShell`, and `ShotFrame` as compatibility and diagnostic surfaces. Matched production states now resolve to dedicated renderers for browser viewports, terminal execution, editor diffs, config inspection, interface audit, flow trace, test report, asset grids, system maps, before/after comparison, metric emphasis, and editorial concept explanation.

The root cause fixed in the current implementation was that all production descriptors could resolve while still sharing the same generic technical shell. The renderer boundary is therefore:

```text
visualPlan.entries[].componentId
  -> production component registry
  -> renderer compatible with entry.shot.kind
  -> semantic composition and motion
```

Current limitations:

- `asset-library` renders structured, generated thumbnail states from available shot evidence; it does not yet ingest arbitrary user media thumbnails from a full DAM.
- `concept-explainer` uses semantic text heuristics to vary editorial layouts; it is not a general design system generator.
- `code-diff` and `config-check` use editor/config semantics, but they do not parse real repository diffs unless the shot provides that data.
- Visual checks verify contract and fallback safety; human review of Still, QA contact sheets, and MP4 remains required for visual quality.

## Visual Taxonomy

- 11 Cinematic presets are `beats[].shotPreset` motion languages.
- 9 Hero Track kinds are stable `heroTrack.kind` layouts.
- 12 `HeroTrackState.shot.kind` values are production shot vocabulary inside `hero-track-v2`; each caption-driven shot maps to a registered renderer component.
- `storyboardContract.json` is the acceptance catalog for the current 11 + 9 visual set, not a permanent component ceiling.

## Extension Points

| Change | Required integration points |
|---|---|
| Cinematic preset | types, Zod schema, renderer, visual contract, tests, storyboard contract, docs |
| Hero Track kind | types, Zod schema, generator, renderer, visual contract, tests, storyboard contract, docs |
| Technical Hero shot | `HeroShotKind`, Zod schema, generator/fallback routing, `TechnicalShotHero`, visual contract, tests, docs |
| Public Studio DTO | `CONTRACT.md`, server serializer, `api.ts`, `types.ts`, provider and consumer tests |
| Workflow gate | `workflow-model.ts`, its tests, `CONTRACT.md`, affected UI tests |

Candidate components may remain in source, but they are not production capability until their required integration points pass.
