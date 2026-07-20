# TC-009 Validation Log

## Documentation

- Retained Markdown audited: 32 files.
- Missing local Markdown links: 0.
- Active references to deleted docs or retired implementation names: 0.
- Knowledge base: 8 current-only pages.
- Protected `remotion-video/projects/**` and `.env*` changes: none.

## Automated

- `npm run typecheck`: pass.
- `npm test`: pass, 5 files / 33 tests.
- `npm run project:check -- examples/skill-showcase.json`: pass, 9 scenes / 3649 frames.
- `npm --prefix remotion-video run skill:gate`: pass, 57 captions / 57 beats.
- `npm --prefix remotion-video run tools:build`: pass with advisory large-chunk warning.
- `npm --prefix remotion-video run storyboard:check -- --artifacts`: pass, 11 + 9 / 20 unique stills.
- `git diff --check`: pass.

## Visual

Directly inspected:

- `remotion-video/out/skill-showcase-still.png`: real, nonblank portrait Hero Track frame.
- `remotion-video/out/skill-showcase-v3-current-midpoints/contact-sheet.png`: nine distinct, populated scene frames.
- `remotion-video/out/remotion-storyboard-library/contact-all-20.png`: all 20 catalog frames populated without black or repeated placeholders.

## Gitee Preflight

- Remote: `git@gitee.com:mango77/remotion.git`
- Remote `main`: `3d400408534e6e43d58644b4bb0daee3921a6553`
- Local base before release: same commit.
- Result: no remote divergence before integration commit.

## Gitee Release

- Integration commit: `9bf460c179ec83051204e82e2ef8b0c888d2626a`.
- Push command: `git push git@gitee.com:mango77/remotion.git main`.
- Push result: `3d40040..9bf460c main -> main`.
- Post-push `ls-remote`: `9bf460c179ec83051204e82e2ef8b0c888d2626a`.
- GitHub push: not performed.
