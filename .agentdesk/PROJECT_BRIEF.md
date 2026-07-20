# Project Brief

## Product

Remotion Skill Showcase 视频工厂：从口播、时间字幕或本地控制台生产包生成可验证的竖屏 MP4。

## Objective

Maintain one production path:

```text
console / project:from-script
  -> skill-showcase Project JSON
  -> schema / compileProject
  -> UltimateVideoV2
  -> 11 Cinematic + 9 Hero Track
  -> Still / MP4 / QA / Verify
```

## Boundaries

- Portrait `1080x1920 / 30fps` only.
- `skill-showcase` is the only scene family.
- `cinematic` and `hero-track-v2` are the only renderer modes.
- The console and CLI must call the same script generator.
- Real `projects/` inputs and environment files are not cleanup targets.
- Visual acceptance requires opening real rendered images.

## Non-Goals

- Multiple scene families, landscape output, or parallel renderer stacks.
- A second schema or console-specific render path.
- Keeping retired implementation notes, screenshots, caches, or versioned architecture memories.
- Treating automated process completion as visual approval.

## Technology

- Node.js 20+
- TypeScript and React 19
- Remotion 4.0.454
- Zod 4
- Vite and Vitest
- Puppeteer for browser E2E

## Current Commands

```bash
npm run setup
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
npm --prefix remotion-video run tools:studio
```

## Repository Memory

- Current operations: `PM_STATE.md`
- Stable interfaces: `CONTRACTS.md`
- Architecture decisions: `DECISIONS.md`
- Active and accepted work: `TASKS/`, `REPORTS/`, `TEST_LOGS/`
- Documentation index: `docs/README.zh-CN.md`
- Current-only knowledge base: `kb/00 首页.md`
