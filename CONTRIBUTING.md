# Contributing

All production changes must stay inside the current Skill Showcase contract.

Before submitting a change, run:

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm --prefix remotion-video run skill:gate
npm --prefix remotion-video run storyboard:check
npm --prefix remotion-video run storyboard:render
git diff --check
```

Do not add another scene family, Remotion Composition, or renderer branch. Extend one of the 11 Cinematic presets or 9 Hero Track kinds and update the storyboard contract and visual evidence together.

Open the rendered Still and relevant contact sheet before describing a visual change as accepted. Exit codes prove executable contracts, not composition quality.

Architecture, commands, contracts, or visual IDs changed by a contribution must be synchronized across `docs/`, `remotion-video/docs/`, `kb/`, and `.agentdesk/`. See the [release playbook](<kb/07 变更与发布 Playbook.md>).
