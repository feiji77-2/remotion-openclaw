## Remotion Video Legacy Archive

This folder preserves pre-`Video1v4` helper scripts and migration notes that are no
longer part of the active pipeline.

Current mainline entrypoints live under:

- `remotion-video/package.json`
- `remotion-video/scripts/render-project.mjs`
- `remotion-video/scripts/render-ultimate-scene.mjs`
- `remotion-video/scripts/run-search-to-ultimate.mjs`

Archived items here are kept for historical reference only. They are not wired into
the active package scripts and should not be treated as runnable tooling.

Safety notes:

- Any former hardcoded credentials have been replaced with environment-variable placeholders.
- Scripts in this folder are not part of the supported release surface and may intentionally exit with guidance.
- Treat this archive as reference material, not as production-ready tooling.
