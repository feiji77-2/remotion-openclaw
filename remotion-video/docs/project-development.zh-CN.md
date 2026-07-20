# Project JSON 开发手册

## 唯一数据流

```text
Project JSON
  -> VideoProjectSchema
  -> compileProject()
  -> UltimateVideoV2
  -> SkillShowcase
  -> CinematicShot / HeroTrackV2
```

默认样例是 `examples/skill-showcase.json`。

## 最小合同

```json
{
  "schemaVersion": 1,
  "projectId": "demo",
  "title": "演示",
  "render": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "orientation": "portrait",
    "qualityMode": "cinematic"
  },
  "scenes": [
    {
      "id": "intro",
      "family": "skill-showcase",
      "durationInFrames": 120,
      "payload": {
        "variant": "intro",
        "heroStyle": "hero-track-v2",
        "heroTrack": {
          "kind": "overview-matrix",
          "captionStartIndex": 0,
          "captionEndIndex": 0,
          "states": []
        }
      },
      "assetIds": [],
      "transition": false
    }
  ],
  "captions": [],
  "audio": {},
  "assets": {}
}
```

实际项目应使用生成器填充 captions、beats 和 Hero Track states，不要手写空状态。

`variant` 是内容语义字段，不是渲染器名称。实际 renderer 只由 `heroStyle`、`heroTrack` 和 `skillShowcaseRouting.ts` 解析为 `cinematic` 或 `hero-track-v2`。

## 生成

```bash
npm run project:from-script -- \
  --id demo \
  --title "演示" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

带时间字幕可增加 `--captions-file captions.json`，配音可增加 `--voice-src projects/demo/audio/voice.m4a`。

## 校验与输出

```bash
npm run project:visual-check -- projects/demo/project.json
npm run project:check -- projects/demo/project.json
npm run project:still -- projects/demo/project.json --frame 60 --out out/demo-f60.png
npm run project:qa-sheet -- projects/demo/project.json --render
npm run project:render -- projects/demo/project.json --out out/demo.mp4
npm run project:verify -- --props projects/demo/project.json --video out/demo.mp4
```

## 约束

- 所有场景必须是 `skill-showcase`。
- `heroStyle` 只能是 `cinematic` 或 `hero-track-v2`。
- Cinematic 使用 11 个 `shotPreset` 之一。
- Hero Track 使用 9 个 `kind` 之一。
- 本地资产路径相对于 `public/`，远程资产只允许 HTTPS。
- Scene、caption、beat 和 Hero state 时间必须连续且不越界。
- 20 个主视觉组件以 `storyboardContract.json` 为唯一目录。
- 黄金样片 9 个 scene 不等于 9 个独立 renderer。

字段、生成与排错速查见 [Project JSON 与 Schema](<../../kb/02 Project JSON 与 Schema.md>)。
