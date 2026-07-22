# Remotion Skill Showcase Video Factory

This repository keeps one executable video production path. Documentation must follow the running code, never the other way around.

```text
console / project:from-script
  -> scripts/lib/script-project-generator.mjs
  -> skill-showcase Project JSON
  -> VideoProjectSchema
  -> compileProject
  -> UltimateVideoV2
  -> sceneRegistry.tsx
  -> SkillShowcase
  -> cinematic / hero-track-v2
  -> Still / MP4 / QA / Verify
```

## Current Contract

- Output is portrait `1080x1920 / 30fps`.
- The only production scene family is `skill-showcase`.
- The only registered Remotion compositions are `UltimateVideoV2` and `RemotionStoryboardLibrary`.
- `payload.variant` is content semantics, not a renderer boundary.
- The golden sample's nine scenes are sample structure, not nine production paths.
- The current accepted visual catalog is `11 Cinematic + 9 Hero Track` via `storyboardContract.json`; it is the current production catalog, not a permanent expansion limit.

## Live Documentation

- `README.md`: production entry, core chain, minimum guardrails, and daily checks.
- `ARCHITECTURE.md`: current architecture, extension boundaries, and rendering responsibilities.
- `docs/README.zh-CN.md`: detailed documentation index for code-supported material only.
- `docs/PRODUCTION-GUARDRAILS.zh-CN.md`: complete production guardrails and extension gates.
- Deleted `.agentdesk/`, `kb/`, and `remotion-video/docs/` were old parallel documentation systems and are not current truth.

## Code Anchors

| Current fact | Code anchor |
|---|---|
| Project JSON top-level contract | `remotion-video/src/project/projectSchema.ts` |
| Project compile, duration, assets, diagnostics | `remotion-video/src/project/compileProject.ts` |
| `skill-showcase` scene payload and Hero lens/shot validation | `remotion-video/src/project/sceneRegistry.tsx` |
| Script-to-Project generation | `remotion-video/scripts/lib/script-project-generator.mjs` |
| Beat-to-lens/shot routing | `remotion-video/src/components/ultimate-kit/families/skill-showcase/skillShowcaseRouting.ts` |
| `HeroTrackState`, `HeroLens`, `HeroShotKind` types | `remotion-video/src/components/ultimate-kit/families/skill-showcase/types.ts` |
| Top Hero technical shot rendering | `remotion-video/src/components/ultimate-kit/families/skill-showcase/HeroTrackV2.tsx` |
| `11 Cinematic + 9 Hero Track` acceptance catalog | `remotion-video/src/components/ultimate-kit/families/skill-showcase/storyboardContract.json` |
| Storyboard catalog contact sheet | `remotion-video/src/compositions/RemotionStoryboardLibrary.tsx` |
| Visual contract checks | `remotion-video/scripts/lib/visual-contract.mjs`, `remotion-video/scripts/check-project-visual-contract.mjs` |
| Runnable commands | `package.json`, `remotion-video/package.json` |

## Narration-Driven Hero Track

`hero-track-v2` is driven by caption-bound states:

```text
captionIndex
  -> beat        semantic beat for the middle-lower emphasis layer
  -> lens        semantic contract: what this beat explains
  -> shot        director shot: how the top Hero shows operation evidence
  -> HeroTrackV2 / TechnicalShotHero
```

The rendered video keeps three separate zones: top Hero operation evidence, middle-lower semantic beat emphasis, and bottom full captions.

The 10 technical Hero shots are `HeroTrackState.shot.kind` values inside `hero-track-v2`, not standalone catalog components: `browser-demo`, `terminal-execution`, `code-diff`, `config-check`, `interface-audit`, `flow-trace`, `test-report`, `asset-library`, `system-map`, and `before-after`.

## Extension Gates

- The 20 catalog items are the current accepted production capability, not the limit of future components.
- Candidate components, console preview components, and raw library assets are not production paths by themselves.
- A new Cinematic preset must wire type, Zod schema, renderer, visual contract, tests, documentation, and `storyboardContract.json`.
- A new Hero Track kind must wire type, Zod schema, generator, renderer, visual contract, tests, documentation, and `storyboardContract.json`.
- A new technical Hero shot must wire `HeroShotKind`, Zod schema, generator/fallback routing, `TechnicalShotHero`, visual contract, tests, and documentation; it remains an internal `hero-track-v2` shot language.

## Fresh Script Checks

- Confirm the input script, project id, and output path belong to the current run.
- Do not reuse old Project JSON, stills, or MP4s as proof for a new script.
- Every `heroTrack.states[]` entry must cover the scene caption range through `captionStartIndex` / `captionEndIndex`.
- Every state with `shot` must have the same beat's `lens.objective`, `actionLabel`, and readable `evidence`.
- When narration moves to the next sentence, the top Hero, semantic beat, and bottom caption must switch together.
- If the top Hero stays stale, debug `captionIndex -> beat -> lens -> shot -> HeroTrackV2`; expanding assets alone is not the fix.

## Quick Start

```bash
npm run setup
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

Generate Project JSON from a new script:

```bash
npm run project:from-script -- \
  --id demo \
  --title "Demo Video" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

Run the local production console:

```bash
cd remotion-video
npm run tools:studio
```

Open `http://127.0.0.1:8787/`.
