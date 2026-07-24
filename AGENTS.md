# Video Factory Agent Bootstrap

These instructions apply to the entire repository. They are the stable startup rules for every new coding-agent window.

For Video Factory engineering work, this project-level file supersedes project-memory and engineering guidance inherited from `/Users/macos/OpenClaw/AGENTS.md`. Continue to obey the parent file's safety and privacy rules, but do not use its workspace memory files, agent routing, or historical context as authority for this repository. Do not rely on prior chat context, external memory, or historical summaries as project authority.

## Mandatory startup

Before editing any file:

1. Read this file completely.
2. Read `CONTRACT.md` completely.
3. Read `VIDEO_FACTORY_AGENT_PROMPT.md` completely.
4. Read the root `package.json` and `remotion-video/package.json`.
5. Run `git status --short` and preserve every pre-existing user change.
6. Inspect the affected implementation, its direct provider/consumer boundaries, and relevant tests.
7. Translate the current task into concrete acceptance criteria and applicable verification commands, then continue without waiting unless the action is destructive or requires a material public-contract decision that the user did not authorize.

Do not trust remembered line counts, file counts, completion percentages, old task reports, Codex memory, deleted documentation systems, or prose summaries when the current repository can be inspected.

## Authority order

When instructions or evidence conflict, use this precedence:

1. The user's current task and explicit acceptance criteria.
2. `CONTRACT.md` for public HTTP API behavior, workflow order and gates, locked stack, and ownership boundaries.
3. Executable tests and current implementation for details not specified by the contract.
4. Existing patterns in the nearest affected files.
5. `README.md`, `ARCHITECTURE.md`, and `docs/` for supporting usage and implementation guidance.
6. External references and historical material.

External projects may provide proven patterns, but they must never override the repository contract or locked stack. For substantial new features or architectural work, inspect at least one mature open-source analogue before implementation. For a narrow bug fix, the closest existing pattern and a reproducing regression test are sufficient.

## Contract discipline

- A task that does not explicitly require a public API change must not change HTTP methods, paths, status codes, request bodies, response envelopes, workflow gates, or locked architecture.
- If implementation and `CONTRACT.md` conflict, treat the conflict as a defect. Do not edit the contract merely to legitimize accidental drift.
- If the task explicitly requires a contract change, follow the coordinated provider, consumer, type, test, and documentation protocol in `CONTRACT.md`.
- Preserve the workflow, ownership boundaries, and locked stack exactly as documented in `CONTRACT.md` unless the current task explicitly changes that contract.

## Change rules

- Make the smallest complete change that fixes the root cause.
- Do not refactor, reformat, move, delete, or revert unrelated code.
- Never discard existing dirty-worktree changes unless the user explicitly requests it.
- Do not hide drift with `any`, unsafe casts, fallback field names, silent response normalization, duplicated gate logic, or weakened tests.
- Add or update a focused regression test for every bug fix or behavior change.
- Do not leave required work as TODOs, placeholders, mocked production behavior, or a future phase.
- Do not create parallel documentation systems, status snapshots, or memory files. Update the existing contract and development documents when the task changes documented behavior.

## Verification and delivery

Run every always-required command and every applicable surface-specific command from the verification matrix in `CONTRACT.md`. Continue fixing until applicable checks pass. Never claim a command passed unless it was executed successfully.

Before delivery:

- inspect `git diff` and `git status --short`;
- confirm unrelated user changes remain intact;
- confirm API, frontend DTOs, workflow gates, tests, and documentation have not drifted;
- report the outcome, root cause, changed files, exact verification results, and only genuine residual risk.

The workspace contains the implementation. Do not paste entire existing files into the final response unless the user explicitly asks for their contents.
