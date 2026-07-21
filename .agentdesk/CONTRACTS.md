# Contracts

## Renderer

- `cinematic`: one of 11 `SkillBeatShotPreset` values through `CinematicShot`.
- `hero-track-v2`: one of 9 `HeroTrackKind` values through `HeroTrackV2`.
- `Root.tsx` registers only `UltimateVideoV2` and `RemotionStoryboardLibrary`.

## Generation

- `project:from-script`, console starter creation, and `project:from-pack` reuse `buildSkillShowcaseProjectFromScript()`.
- Generated scenes must all use `family: skill-showcase`.
- Captions, scene ranges, beats, and Hero Track states must be continuous and bounded.
- New narration must not inherit golden-sample labels, entities, or product claims.

## Acceptance

- Typecheck and automated tests pass.
- Golden and newly generated Project JSON pass `project:check`.
- Storyboard reports exactly 11 + 9 = 20 unique stills.
- Browser E2E produces a real 1080x1920 Still and MP4.
- Final Still and contact sheets are directly inspected.

## Documentation

- Root docs, `docs/`, `remotion-video/docs/`, `kb/`, and `.agentdesk` must describe the same production path.
- `payload.variant` is documented as content semantics, never as another renderer.
- `storyboardContract.json` is the only 20-component catalog.
- Historical renderer documentation and local knowledge-base workspace state are not retained.
- Visual pass language requires direct inspection of the relevant rendered artifact.
- Knowledge-base sync means mirroring repository `kb/` to Obsidian Vault ID `0eb4e308bcd29e3e` at `/Users/macos/dan-koe-brain/remotion-product-image/kb/`; it is incomplete until both sides match.
- Sync may modify only the target `kb/**` path unless separately authorized.

## Release

- `remotion-video/projects/**`, `.env*`, credentials, and private local assets are protected from cleanup and release staging mistakes.
- Because `origin` has more than one push URL, Gitee releases use the explicit URL `git@gitee.com:mango77/remotion.git`.
- GitHub is not a release target unless the user explicitly requests it.
- Gitee synchronization is verified by comparing `refs/heads/main` with the local release `HEAD`.
