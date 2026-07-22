# Architecture

The repository has one maintained Skill Showcase production path:

```text
script / timed captions / console pack
  -> scripts/lib/script-project-generator.mjs
  -> examples or projects/<id>/project.json
  -> src/project/projectSchema.ts
  -> src/project/compileProject.ts
  -> src/compositions/v2/UltimateVideoV2.tsx
  -> src/project/sceneRegistry.tsx
  -> SkillShowcase.tsx
     -> PortraitCinematicSkillShowcase.tsx (11 Cinematic presets)
     -> HeroTrackV2.tsx (9 Hero Track kinds)
        -> HeroTrackState.lens
        -> HeroTrackState.shot
        -> TechnicalShotHero
```

`scenes[].durationInFrames` is the render duration source. Generated projects bind captions, scene ranges, semantic beats, Hero Track states, `lens`, and `shot` to the same timeline.

The console uses the same generator through `scripts/tools-studio-server.mjs`; it does not maintain a separate renderer, schema, or video path.

## Runtime Boundaries

- `Root.tsx` registers `UltimateVideoV2` and `RemotionStoryboardLibrary` only.
- `projectSchema.ts` defines the top-level Project JSON contract.
- `compileProject.ts` owns timing, asset, transition, and scene compilation boundaries.
- `sceneRegistry.tsx` accepts the `skill-showcase` scene payload and validates `heroTrack.states[].lens` and `heroTrack.states[].shot`.
- `skillShowcaseRouting.ts` resolves `cinematic` or `hero-track-v2`; fallback Hero Track generation also synthesizes `lens` and `shot`.
- `PortraitCinematicSkillShowcase.tsx` owns the 11 Cinematic motion presets.
- `HeroTrackV2.tsx` owns the 9 Hero Track kinds and renders `TechnicalShotHero` when a state has `shot`.
- `visual-contract.mjs` enforces Hero Track caption coverage, shot/lens presence, technical shot kind validity, and operation evidence.
- `storyboardContract.json` is the current acceptance catalog for the 11 + 9 visual catalog; it is not a permanent component ceiling.

## Caption-Driven Visual Contract

The current `hero-track-v2` contract is:

```text
captionIndex
  -> SkillShowcaseBeat
  -> HeroLens
  -> HeroShot
  -> HeroTrackState
  -> HeroTrackV2
```

Each generated Hero Track state should normally bind one caption sentence:

```text
state.captionStartIndex === state.captionEndIndex === captionIndex
```

For a multi-caption scene, `heroTrack.states[]` must cover the full `heroTrack.captionStartIndex..captionEndIndex` range and the full scene duration. A project that updates captions but leaves Hero states stale is invalid.

## Screen Zones

The portrait Skill Showcase render has three separate jobs:

- Top Hero: operation evidence, such as browser state, terminal output, code diff, config checks, inspector findings, trace flow, test report, asset selection, system map, or before/after comparison.
- Middle-lower semantic beat: conclusion emphasis driven by the current beat.
- Bottom captions: full spoken narration.

The top Hero must not become a large keyword poster. The semantic beat layer handles conclusion emphasis.

## Technical Shot Kinds

These values live in `HeroTrackState.shot.kind`:

- `browser-demo`
- `terminal-execution`
- `code-diff`
- `config-check`
- `interface-audit`
- `flow-trace`
- `test-report`
- `asset-library`
- `system-map`
- `before-after`

They are director-shot vocabulary under `hero-track-v2`. They are not standalone storyboard catalog components and must not be documented as a new component library.

## Expansion Rule

More components may be added later, but only after they pass the right boundary:

- New semantic beat motion: extend Cinematic preset typing, schema, renderer, contract, and tests.
- New stable Hero layout: extend Hero Track kind typing, schema, generator, renderer, visual contract, tests, and storyboard contract.
- New top technical director shot: extend `HeroShotKind`, schema, generator/fallback routing, `TechnicalShotHero`, visual contract, and tests.
- Candidate or experimental components may stay in source, but documentation must label them as not yet part of the production path.

## Forbidden Regressions

- Do not add `NarrationSemanticSurface`.
- Do not add `retargetHeroTrackForComponent`.
- Do not pass `componentId` into `HeroTrackV2` to bypass `captionIndex -> lens -> shot`.
- Do not solve narration mismatch by expanding random material assets.
- Do not let only the bottom captions update while the top Hero or semantic beat still show stale content.
- Do not use old `kb/`, `.agentdesk/`, or `remotion-video/docs/` pages as architecture truth.
- Do not use external memory, Codex memory, or Obsidian copies as architecture truth when they conflict with this repository.

Architecture guardrails must stay executable: every new production rule needs a current code path, schema, generator, renderer, contract, test, or command anchor.
