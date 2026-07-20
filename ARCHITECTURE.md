# Architecture

```text
script / timed captions / console pack
  -> scripts/lib/script-project-generator.mjs
  -> examples or projects/<id>/project.json
  -> src/project/projectSchema.ts
  -> src/project/compileProject.ts
  -> src/compositions/v2/UltimateVideoV2.tsx
  -> src/project/sceneRegistry.tsx
  -> SkillShowcase.tsx
     -> PortraitCinematicSkillShowcase.tsx (11 presets)
     -> HeroTrackV2.tsx (9 kinds)
```

`scenes[].durationInFrames` is the render duration source. Generated projects also bind captions, scene ranges, semantic beats, and Hero Track states to the same timeline.

The console uses the same generator through `scripts/tools-studio-server.mjs`; it does not maintain a separate renderer or schema.

## Runtime Boundaries

- `Root.tsx` registers `UltimateVideoV2` and `RemotionStoryboardLibrary` only.
- `sceneRegistry.tsx` accepts `skill-showcase` only.
- `skillShowcaseRouting.ts` resolves `cinematic` or `hero-track-v2` only.
- `PortraitCinematicSkillShowcase.tsx` owns 11 Cinematic presets.
- `HeroTrackV2.tsx` owns 9 Hero Track kinds.
- `storyboardContract.json` is the acceptance catalog for all 20 visuals.

`payload.variant` selects content semantics and default mappings; it is not a renderer boundary. `RemotionStoryboardLibrary` renders catalog evidence and does not create a second production path.

The maintained operational map is [kb/06 当前代码地图.md](<kb/06 当前代码地图.md>).
