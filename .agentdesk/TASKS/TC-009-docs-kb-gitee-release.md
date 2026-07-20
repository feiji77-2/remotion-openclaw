# TC-009: Publish Current Documentation and Knowledge Base to Gitee

## Owner

- Role: `208-Docs` + `210-Integrator`
- Recommended model tier: high
- Branch: `main`
- Status: review

## Goal

Make every retained document and the local knowledge base describe the same current production path, then publish the accepted repository consolidation to Gitee.

## User Value

Developers and future AI sessions must be able to recover the actual renderer architecture from the repository without reviving deleted families, legacy generators, or historical variants.

## Required Context

Read before editing:

- `.agentdesk/PROJECT_BRIEF.md`
- `.agentdesk/PM_STATE.md`
- `.agentdesk/CONTRACTS.md`
- `.agentdesk/DECISIONS.md`
- `.agentdesk/TASKS/TC-008-remove-non-production-paths.md`
- `.agentdesk/REPORTS/TC-008-remove-non-production-paths.md`
- `docs/README.zh-CN.md`
- `ARCHITECTURE.md`
- `remotion-video/src/Root.tsx`
- `remotion-video/src/project/projectSchema.ts`
- `remotion-video/src/project/sceneRegistry.tsx`
- `remotion-video/src/components/ultimate-kit/families/skill-showcase/storyboardContract.json`
- `package.json`
- `remotion-video/package.json`

## Allowed Scope

- All retained repository documentation and contribution templates.
- `kb/**` rebuilt from current truth only.
- `.agentdesk/**` for TC-009 state, report, validation log, and release acceptance.
- Git staging, one release commit, and explicit push to `git@gitee.com:mango77/remotion.git`.

## Forbidden Scope

- Production source, scripts, tests, examples, assets, and real `remotion-video/projects/**` inputs.
- Environment files and credentials.
- Reintroducing deleted historical documentation, render families, generators, or snapshots.
- Pushing this release to GitHub.

## Contract Rules

- Contract changes allowed: no.
- Documentation must reflect the existing contract: one `skill-showcase` family, `cinematic` and `hero-track-v2`, 11 Cinematic presets, 9 Hero Track kinds, two registered compositions, portrait `1080x1920 / 30fps`.

## Implementation Requirements

- Audit all retained Markdown and repository templates against source and package scripts.
- Rebuild `kb/` as a compact, current-only operational knowledge base.
- Link the knowledge base from the main documentation index.
- Remove or clearly reject stale paths, deleted documents, and obsolete renderer names.
- Record validation evidence, release commit, Gitee synchronization, and PM acceptance.

## Acceptance Criteria

- [x] All retained docs agree on the single executable production path.
- [x] The knowledge base covers architecture, Project JSON, all 20 renderer components, console/CLI operations, QA, code map, and release procedure.
- [x] Local Markdown links resolve and no active documentation points to deleted files.
- [x] Production validation and storyboard artifact checks pass.
- [ ] Intended consolidation changes are committed once and pushed explicitly to Gitee `main`.
- [x] TC-009 report, test log, decisions, contracts, and PM state contain enough truth to resume without chat history.

## Validation Commands

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm --prefix remotion-video run storyboard:check
git diff --check
git status --short
git ls-remote git@gitee.com:mango77/remotion.git refs/heads/main
```

Also run a local Markdown link audit and a stale-reference audit over all retained docs and `kb/`.

## Expected Report

Use the structured report format from the Mango `structured-report-template.md`, followed by PM acceptance.
