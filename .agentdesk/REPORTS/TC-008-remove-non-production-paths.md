# Report for TC-008

## Status

completed and accepted

## Summary

The repository now exposes one executable video path. Static production source was reduced from 307 files to 44 files; 39 are reachable from the Remotion or console browser entrypoints and the remainder are type/test files. The cleanup removed 77,000+ lines and reclaimed roughly 4.5 GB of historical environments, builds, outputs, snapshots, assets, and duplicate source.

## Implementation

- Removed generic, Swiss, Morfeo, Director, adaptive, legacy-import, duplicate console, and retired Composition paths.
- Retained only `UltimateVideoV2` and `RemotionStoryboardLibrary`.
- Routed console pack builds through the same Skill Showcase generator as `project:from-script`.
- Locked console creation to portrait and kept style cards renderer-neutral.
- Removed golden-sample labels and entity IDs from new-script system summaries.
- Added public asset serving with audio MIME and byte-range support to the console server.
- Declared Puppeteer explicitly for UI E2E instead of relying on an accidental local install.
- Replaced historical documentation with the current chain and 20-component contract.

## Validation

- Typecheck: pass.
- Unit tests: 5 files / 33 tests pass.
- Console build: pass.
- Golden `project:check`: pass, 9 scenes / 3649 frames.
- New-script `project:check`: pass, no stale golden content.
- API E2E: pass.
- Visual E2E: pass, starter and rebuilt stills are 1080x1920 and nonblank.
- UI E2E: 16/16 pass, including real Still and MP4 output.
- Skill verify: pass, H.264/AAC, 1080x1920, 30fps, 3649 frames, 121.633 seconds.
- Storyboard: pass, 11 Cinematic + 9 Hero Track, 20 unique PNGs.
- Visual inspection: final Still, 9-scene midpoint sheet, and 20-component sheet pass.
- `git diff --check`: pass.

## Preserved Data

- `remotion-video/projects/**`
- `remotion-video/.env*`
- `out/workbuddy-six-skills-showcase-v3.mp4`
- `out/remotion-storyboard-library/**`
- `out/skill-showcase-v3-current-midpoints/**`
