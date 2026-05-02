# Ultimate Scene Template

`UltimateSceneTemplate` is the 1920x1080 production template that combines the two analyzed reference styles into one reusable scene system.

## What It Includes

- Dark tech backdrop with large safe margins
- Hero opener / chapter cover
- Feature card rail
- Focus definition screen with diagram
- Number strip / option row
- Step flow
- Terminal window
- Tag matrix
- Code block
- Metric bars
- CTA / closing screen

## Authoring Flow

1. Copy [`examples/ultimate-scene-demo.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-scene-demo.json)
2. Replace the text inside `data`
3. Remove `durationInFrames` unless you explicitly need a custom duration
4. Optionally override `transition` per scene
5. Run `npm run ultimate:check`
6. Run `node scripts/render-ultimate-scene.mjs --config <your-json> --out out/<your-name>.mp4`

## Faster Config Flow

If you do not want to author a config from scratch, start from:

1. Copy [`examples/ultimate-scene-demo.json`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/examples/ultimate-scene-demo.json)
2. Edit `scenes[]` and keep each scene on a valid family contract
3. Run `npm run ultimate:check`
4. Run `npm run ultimate:render`

The old outline compiler flow has been retired from the main runtime.

## Project-Level Fields

```json
{
  "title": "Your project",
  "defaultPlatformOverlay": {
    "brand": "SceneLab",
    "account": "@your-brand",
    "searchLabel": "Search reusable scenes",
    "watermark": "1080p"
  },
  "defaultTransition": {
    "preset": "lift",
    "durationInFrames": 12
  },
  "scenes": []
}
```

## Scene Base Fields

Every scene supports:

```json
{
  "id": "unique-id",
  "family": "hero",
  "subtitle": "optional; auto-derived if omitted",
  "durationInFrames": 96,
  "warm": true,
  "showGrid": false,
  "overlay": false,
  "transition": {
    "preset": "flash",
    "durationInFrames": 14
  },
  "data": {}
}
```

## Supported Scene Families

### `hero`

```json
{
  "family": "hero",
  "data": {
    "kicker": "small label",
    "title": "main hero title",
    "subtitle": "supporting line",
    "badge": "small badge",
    "accent": "orange",
    "avatarLabel": "YOU"
  }
}
```

### `feature-rail`

```json
{
  "family": "feature-rail",
  "data": {
    "kicker": "feature rail",
    "heading": "four dimensions",
    "items": [
      {"title": "Subject", "caption": "what it is", "icon": "S", "accent": "green"}
    ]
  }
}
```

### `focus`

```json
{
  "family": "focus",
  "data": {
    "eyebrow": "focus explainer",
    "keyword": "Framing",
    "question": "How much should the frame hold?",
    "description": "helper line",
    "accent": "cyan",
    "diagram": "framing"
  }
}
```

### `number-strip`

```json
{
  "family": "number-strip",
  "data": {
    "count": "31",
    "heading": "Reusable Blocks",
    "items": [{"label": "hero"}]
  }
}
```

### `step-flow`

```json
{
  "family": "step-flow",
  "data": {
    "heading": "Five Steps",
    "steps": [
      {"label": "Input", "detail": "copy enters the system", "icon": "1", "accent": "cyan"}
    ]
  }
}
```

### `terminal`

```json
{
  "family": "terminal",
  "data": {
    "heading": "Runtime",
    "windowTitle": "render-runtime",
    "command": "pnpm render",
    "outputs": ["> loading", "> done"],
    "note": "optional helper line",
    "accent": "green"
  }
}
```

### `tag-matrix`

```json
{
  "family": "tag-matrix",
  "data": {
    "heading": "Reusable modules",
    "tabs": ["script", "visual"],
    "activeTab": "visual",
    "items": [{"label": "hero", "accent": "orange"}]
  }
}
```

### `code`

```json
{
  "family": "code",
  "data": {
    "heading": "JSON schema",
    "filename": "video.json",
    "lines": [
      {"text": "{", "tone": "base"},
      {"text": "\"family\": \"hero\"", "tone": "accent"}
    ],
    "highlightLine": 2,
    "footer": "optional helper line",
    "accent": "purple"
  }
}
```

### `metrics`

```json
{
  "family": "metrics",
  "data": {
    "heading": "Output",
    "items": [
      {"label": "preview", "value": "1.4s", "ratio": 0.92, "accent": "cyan"}
    ]
  }
}
```

### `cta`

```json
{
  "family": "cta",
  "data": {
    "heading": "Next step",
    "subtitle": "helper line",
    "searchLabel": "Type your next scene",
    "badge": "cta / next / follow-up"
  }
}
```

## Automatic Behaviors

- `subtitle` is auto-derived if omitted
- `durationInFrames` is auto-estimated if omitted
- project-level transitions are applied automatically
- scene-level `transition` overrides project defaults
- `ultimate:check` validates the config and writes a normalized config snapshot to `out/ultimate-scene-template.normalized.json`

## Commands

```bash
npm run ultimate:check
npm run ultimate:render
node scripts/render-ultimate-scene.mjs --config ./my-video.json --out out/my-video.mp4
node scripts/render-ultimate-scene.mjs --config ./my-video.json --dry-run --write-normalized out/my-video.normalized.json
```
