# Decisions

## 2026-07-21: One Executable Video Path

The repository retains one end-to-end Skill Showcase production path. That path starts at the interactive console or script input, continues through the shared Project JSON generator and 11 Cinematic + 9 Hero Track renderer, and ends at preview, QA, Verify, and delivery. The console is the product control plane for the same generator, not a disposable demo or a separate renderer.

Source, scripts, fixtures, assets, snapshots, caches, and documentation that cannot participate in either the product control plane or render plane are removed. Relevance cannot be decided from `Root.tsx` imports alone. Real local project inputs remain preserved even when they predate the current schema.

## ADR-20260721-002: Current-Only Knowledge and Explicit Gitee Release

- Status: accepted
- Context: The previous knowledge base mixed active architecture with retired implementations, and `origin` contains multiple push URLs.
- Decision: Rebuild `kb/` from current source truth only, keep one documentation index, and publish this consolidation through the explicit Gitee SSH URL.
- Alternatives considered: Restore historical pages; keep a migration archive; push through `origin`; publish to GitHub simultaneously.
- Consequences: Future sessions see only the executable 11 Cinematic + 9 Hero Track path. Historical implementation details must be recovered from Git history if ever needed. Releases cannot accidentally fan out through `origin`.
- Related task cards: `TC-008-remove-non-production-paths`, `TC-009-docs-kb-gitee-release`.
