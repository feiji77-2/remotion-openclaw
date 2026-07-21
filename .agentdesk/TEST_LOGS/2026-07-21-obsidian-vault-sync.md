# Canonical Obsidian Vault Sync Log

## Target

- Obsidian Vault ID: `0eb4e308bcd29e3e`
- Vault root: `/Users/macos/dan-koe-brain`
- Project knowledge target: `/Users/macos/dan-koe-brain/remotion-product-image/kb/`
- Source: `/Users/macos/OpenClaw/remotion-generated-video-project/kb/`

## Sync

The target `kb/` was replaced with an exact current-only mirror of the repository `kb/`. Old target knowledge pages, nested Obsidian configuration, and retired image assets were removed only inside that target directory.

## Verification

- Source files: 8.
- Target files: 8.
- `rsync --checksum --dry-run --delete`: zero differences.
- Per-file SHA-256: all 8 source/target pairs match.
- Obsidian registry: Vault ID still resolves to `/Users/macos/dan-koe-brain` and is marked open.
- Target nested worktree changes outside `kb/**`: unchanged from pre-sync state; 11 pre-existing deletions remain untouched.
- Target Git commit: not created because the nested repository has unrelated user changes and no configured remote.

## Durable Rule

Future statements that the knowledge base is synchronized require both Gitee repository publication and exact synchronization to this Vault target. Repository-local `kb/` alone is insufficient.
