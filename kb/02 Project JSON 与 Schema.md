# Project JSON 与 Schema

## 核心结构

```json
{
  "schemaVersion": 1,
  "projectId": "demo",
  "title": "演示视频",
  "render": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "orientation": "portrait",
    "qualityMode": "cinematic",
    "captionStyle": "boxed",
    "showProjectLabel": true
  },
  "scenes": [],
  "captions": [],
  "audio": {},
  "assets": {}
}
```

不要从这个空骨架手写生产项目。使用脚本生成器或控制台，让 captions、scene ranges、Beat 和 Hero states 由同一口播时间轴生成。

## Scene 合同

- `family` 必须是 `skill-showcase`。
- `durationInFrames` 是渲染时长源。
- 所有 scene 同时使用 `captionRange`，或全部省略；使用时必须连续、不重叠。
- `payload.beats` 必须存在并在 scene 帧范围内。
- `payload.heroStyle` 只能是 `cinematic` 或 `hero-track-v2`。
- Hero Track state 必须有有效的 caption 范围、帧范围和实体目标。

## 资产合同

- 本地资产放在 `remotion-video/public/`，JSON 中使用相对该目录的路径。
- 禁止绝对路径、`public/` 前缀和 `..` 穿越。
- 远程资产只允许 HTTPS。
- 必需资产缺失时校验失败；可选视觉资产可以进入显式 fallback。

## 新口播生成

```bash
npm run project:from-script -- \
  --id demo \
  --title "演示视频" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

可增加 `--captions-file captions.json` 和 `--voice-src projects/demo/audio/voice.m4a`。新口播必须使用新的 `projectId`，不能复用黄金样片 ID 或复制其语义 payload。

## 校验

```bash
npm run project:check -- projects/demo/project.json
npm --prefix remotion-video run project:visual-check -- projects/demo/project.json
```

Schema 源码：[projectSchema.ts](../remotion-video/src/project/projectSchema.ts)；编译与时间合同：[compileProject.ts](../remotion-video/src/project/compileProject.ts)。

返回：[知识库首页](<00 首页.md>)。
