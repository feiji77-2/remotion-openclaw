# Contributing

All production changes must stay inside the current Skill Showcase contract.

Before submitting a change, run:

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:visual-check -- examples/skill-showcase.json
npm --prefix remotion-video run skill:gate
npm --prefix remotion-video run storyboard:check
git diff --check
```

Open the rendered Still and relevant contact sheet before describing a visual change as accepted. Exit codes prove executable contracts, not composition quality.

## Current Boundaries

- Do not add another scene family, Remotion Composition, or renderer branch.
- `11 Cinematic + 9 Hero Track` is the current accepted Storyboard catalog, not a permanent expansion ceiling.
- 10 technical Hero shots are `HeroTrackState.shot.kind` values inside `hero-track-v2`; they are not standalone catalog components.
- Documentation truth lives in `README.md`, `ARCHITECTURE.md`, and `docs/`.

## Adding Visual Capability

- A new Cinematic preset must update types, Zod schema, renderer, visual contract, tests, and documentation.
- A new Hero Track kind must update types, Zod schema, generator, renderer, visual contract, tests, storyboard contract, and documentation.
- A new technical Hero shot must update `HeroShotKind`, Zod schema, generator/fallback routing, `TechnicalShotHero`, visual contract, tests, and documentation.
- Candidate components may exist in source, but must be documented as not yet part of the production path until those gates pass.

## Forbidden Regressions

- Do not add `NarrationSemanticSurface`.
- Do not add `retargetHeroTrackForComponent`.
- Do not pass `componentId` into `HeroTrackV2` as the primary visual driver.
- Do not solve narration mismatch by adding unrelated material-library animation.
- Do not let bottom captions update while top Hero evidence or middle semantic beats stay stale.
- Do not use external memory, Codex memory, or deleted document systems as current source of truth.

Every new production rule must point to a current code path, schema, generator, renderer, contract, test, or command. Do not submit documentation that only redirects to another document.
