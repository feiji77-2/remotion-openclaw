# Remotion Skill Showcase Video Factory

This repository contains one production path:

```text
console / project:from-script
  -> skill-showcase Project JSON
  -> VideoProjectSchema / compileProject
  -> UltimateVideoV2
  -> 11 Cinematic + 9 Hero Track
  -> Still / MP4 / QA / Verify
```

```bash
npm run setup
npm run project:check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

The production contract is portrait `1080x1920 / 30fps`, accepts only the `skill-showcase` scene family, and routes scenes through `cinematic` or `hero-track-v2`.

The 11 Cinematic presets and 9 Hero Track kinds are two modes inside that one renderer path. `payload.variant` is content semantics, not a third visual system; the golden sample's nine scenes are sample structure, not the component catalog.

Only two Remotion compositions are registered: `UltimateVideoV2` for Project JSON output and `RemotionStoryboardLibrary` for the 20-component acceptance board. Automated checks do not replace direct inspection of the rendered Still, contact sheets, and MP4.

See the [documentation index](docs/README.zh-CN.md) and [current knowledge base](<kb/00 首页.md>).
