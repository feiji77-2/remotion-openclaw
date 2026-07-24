# Contributing

## Before Editing

1. Read [AGENTS.md](AGENTS.md), [CONTRACT.md](CONTRACT.md), and the affected implementation/tests.
2. Inspect `git status --short` and preserve existing user changes.
3. Identify the owning boundary in [ARCHITECTURE.md](ARCHITECTURE.md).
4. Define the behavior to verify before changing code.

For substantial new capability, inspect a mature open-source analogue for proven patterns. Do not inherit an incompatible framework or architecture.

## Change Routing

| Change | Update together |
|---|---|
| Public HTTP contract | `CONTRACT.md`, backend, `api.ts`, `types.ts`, provider/consumer tests |
| Workflow gate or invalidation | `CONTRACT.md`, `workflow-model.ts`, workflow tests, affected UI tests |
| Visual capability | schema/types, generator, renderer, visual contract, tests, architecture/docs |
| User interaction or layout | owning component/CSS, focused tests, Studio build, UI e2e |
| Documentation only | the single owning document; link instead of copying rules elsewhere |

Production-specific visual constraints are listed in [docs/PRODUCTION-GUARDRAILS.zh-CN.md](docs/PRODUCTION-GUARDRAILS.zh-CN.md).

## Verification

Run every always-required command and every applicable surface-specific command from the matrix in [CONTRACT.md](CONTRACT.md#8-required-verification). Visual changes require direct inspection of a current Still, contact sheet, or MP4; an exit code alone is not visual acceptance.

For production renderer changes, also run the same Project JSON through baseline and after generation paths, then inspect:

- component usage report
- visual check
- QA contact sheet
- rendered MP4

If the current output still shows the same generic shell or unreadable wireframe behavior, iterate before submitting.

Before delivery, run `git diff --check`, inspect the final diff/status, and report exact results plus genuine residual risk.
