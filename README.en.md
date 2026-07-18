# Codex Remotion Project

[简体中文](README.md) | English

A Remotion image and video renderer driven by one Project JSON contract. Codex prepares content and asset references; the repository validates, compiles, and renders them.

```bash
npm run setup
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 30
npm run project:render -- examples/project.json --out out/project.mp4
```

The example is `remotion-video/examples/project.json`. The main composition is `UltimateVideoV2`, fixed to `1920x1080 / 30fps` in the first version.

The render path does not depend on OpenClaw skills, APIs, workers, queues, or a Step 1-8 workflow. See [the development guide](remotion-video/docs/project-development.zh-CN.md) for the schema and supported scene families.

## Verification

```bash
npm test
npm run typecheck
npm run release:check
```

## License

MIT
