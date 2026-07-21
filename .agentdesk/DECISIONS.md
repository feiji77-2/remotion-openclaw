# Decisions

## 2026-07-21: One Executable Video Path

The repository retains only the Skill Showcase production path with 11 Cinematic presets and 9 Hero Track kinds. The console is an authoring surface for the same Project JSON generator, not a separate renderer.

Source, scripts, fixtures, assets, snapshots, caches, and documentation that cannot participate in this path are removed. Real local project inputs remain preserved even when they predate the current schema.

## ADR-20260721-002: Current-Only Knowledge and Explicit Gitee Release

- Status: accepted
- Context: The previous knowledge base mixed active architecture with retired implementations, and `origin` contains multiple push URLs.
- Decision: Rebuild `kb/` from current source truth only, keep one documentation index, and publish this consolidation through the explicit Gitee SSH URL.
- Alternatives considered: Restore historical pages; keep a migration archive; push through `origin`; publish to GitHub simultaneously.
- Consequences: Future sessions see only the executable 11 Cinematic + 9 Hero Track path. Historical implementation details must be recovered from Git history if ever needed. Releases cannot accidentally fan out through `origin`.
- Related task cards: `TC-008-remove-non-production-paths`, `TC-009-docs-kb-gitee-release`.
