# PM State

- Active card: `TC-009-docs-kb-gitee-release`
- Last accepted card: `TC-008-remove-non-production-paths`
- Status: review
- Current truth: The only retained video path is console or `project:from-script` -> Skill Showcase Project JSON -> schema/compiler -> `UltimateVideoV2` -> 11 Cinematic + 9 Hero Track -> Still/MP4/QA/Verify.
- Repository shape: 44 source files, 30 scripts, 4 examples, 9 current documentation files, and 2 Remotion compositions.
- Preserved inputs: `remotion-video/projects/**`, `remotion-video/.env*`, the golden MP4, the 20-component storyboard, and the 9-scene midpoint evidence.
- Acceptance evidence: automated generation/render/browser checks passed; the final Still and both contact sheets were directly inspected.
- Current delivery: align every retained document, rebuild the current-only knowledge base, validate the repository, and publish the accepted consolidation to Gitee only.
- TC-009 review evidence: 32 Markdown files / 0 missing links, 8 current-only KB pages, typecheck and 33 tests pass, golden project 9 scenes / 3649 frames, storyboard 11 + 9 / 20 unique stills, and all three visual evidence files directly inspected.
- Gitee preflight: remote `main` matches local base `3d400408534e6e43d58644b4bb0daee3921a6553`; integration commit and explicit Gitee push remain.
