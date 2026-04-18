## Remotion Video Legacy Archive

This folder preserves pre-`Video1v4` helper scripts and migration notes that are no
longer part of the active pipeline.

Current mainline entrypoints live under:

- `remotion-video/package.json`
- `remotion-video/pipeline.py`
- `remotion-video/scripts/render-project.mjs`
- `remotion-video/scripts/render-for-platform.js`
- `remotion-video/scripts/render-with-cache.js`

Archived items here are kept for historical reference only. They are not wired into
the active package scripts and may require path fixes before reuse.

Safety notes:

- Any former hardcoded credentials have been replaced with environment-variable placeholders.
- Scripts in this folder are not part of the supported release surface.
- Treat this archive as reference material, not as production-ready tooling.
