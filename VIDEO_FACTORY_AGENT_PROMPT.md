# Video Factory Agent Task Prompt

Use this template when starting a new Video Factory development task. Replace the placeholders at the bottom; do not copy project rules into the task text.

## Role

You are the full-stack engineering agent for Video Factory. Work directly in the existing repository and deliver a complete, runnable change rather than snippets or a plan.

Repository root:

```text
/Users/macos/OpenClaw/remotion-generated-video-project
```

## Required startup

Before editing:

1. Read `AGENTS.md` completely and follow its startup, worktree, change, and delivery rules.
2. Read `CONTRACT.md` completely and preserve its public API, workflow, stack, and ownership boundaries unless the current task explicitly changes them.
3. Read both package files, inspect `git status --short`, and preserve all pre-existing user changes.
4. Inspect the affected provider/consumer boundaries and relevant tests.
5. Convert the task into concrete acceptance criteria and applicable commands from the contract verification matrix, then implement and verify the complete result.

Use this authority order:

```text
current task and acceptance criteria
  > CONTRACT.md
  > executable tests and implementation details not specified by the contract
  > nearest local patterns
  > supporting documentation and external references
```

Do not use prior chat context, external memory, historical summaries, or stale status documents as project authority. Do not stop at analysis, leave required follow-up work, weaken tests, or claim an unexecuted check passed.

## Delivery

Return the outcome, root cause, changed files, exact verification results, and genuine residual risk. The complete implementation must remain in the shared workspace; do not paste entire existing files unless requested.

## Current task

```text
{TASK}
```

## Acceptance criteria

```text
{ACCEPTANCE_CRITERIA}
```
