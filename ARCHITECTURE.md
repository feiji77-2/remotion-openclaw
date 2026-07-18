# Architecture

## Data flow

```text
Project JSON
  -> VideoProjectSchema
  -> compileProject()
  -> UltimateVideoV2
  -> PNG / MP4
```

`scenes[]` is the only public duration source. The compiler validates family payloads, resolves asset references, clamps captions, builds audio tracks, and adds transition overlap compensation internally.

## Boundaries

- `src/project`: public schema, deterministic compiler, asset resolver, scene registry.
- `src/compositions/v2`: Remotion Composition and metadata calculation.
- `src/timeline`: scene, caption, audio, and global overlay rendering.
- `src/components/ultimate-kit`: reusable visual components.
- `scripts/project-*`: local CLI entrypoints.

Search, LLM calls, image generation, and TTS are external preparation concerns. There is no application server, queue, worker, or workflow skill runtime.
