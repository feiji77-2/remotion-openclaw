# TC-008: Remove Non-Production Paths

- Owner: `210-Integrator`
- Branch: current working branch
- Status: accepted

## Goal

Retain only console / `project:from-script` -> Skill Showcase Project JSON -> schema/compiler -> `UltimateVideoV2` -> 11 Cinematic + 9 Hero Track -> Still/MP4/QA/Verify.

## Protected Content

- `remotion-video/projects/**`
- `remotion-video/.env*`
- Current Skill Showcase MP4 and visual acceptance artifacts

## Acceptance

- [x] Production and console generation emit only `skill-showcase` scenes.
- [x] Generated scenes select `cinematic` or `hero-track-v2` only.
- [x] Static source inventory contains no superseded renderer family.
- [x] Typecheck, unit tests, console build, API E2E, visual E2E, UI E2E, project checks, Still render, skill verification, and storyboard render pass.
- [x] Final Still and both contact sheets were directly inspected.
- [x] `git diff --check` passes.
