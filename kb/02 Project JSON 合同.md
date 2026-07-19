# Project JSON 合同

## 顶层结构

```ts
type VideoProject = {
  schemaVersion: 1;
  projectId: string;
  title: string;
  render: RenderConfig;
  scenes: ProjectScene[];
  captions: Caption[];
  audio: AudioConfig;
  assets: Record<string, ProjectAsset>;
};
```

真源：`remotion-video/src/project/projectSchema.ts`。

## Render

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "orientation": "portrait",
  "qualityMode": "cinematic",
  "captionStyle": "editorial",
  "showProjectLabel": false
}
```

- `fps` 当前固定为 30。
- 实际宽高由 `orientation` 编译为横屏或竖屏规格。
- `boxed` 适合通用视频，`editorial` 适合竖屏口播。

## Scene

```ts
type ProjectScene = {
  id: string;
  family: string;
  durationInFrames: number;
  captionRange?: {
    startIndex: number;
    endIndex: number;
  };
  payload: Record<string, unknown>;
  assetIds: string[];
  transition: false | {
    type: 'fade' | 'slide';
    durationInFrames: number;
  };
};
```

Scene 表示一个完整章节。旧项目可只写 `durationInFrames`；新口播项目必须写 `captionRange`，并让 `durationInFrames` 由该字幕区间换算得到，误差不得超过 1 帧。

`skill-showcase` 新稿 Scene 的 payload 必须额外包含：

```json
{
  "variant": "generic",
  "visualMode": "process",
  "title": "第一步",
  "headline": "统一输入",
  "captionStartIndex": 4,
  "captionEndIndex": 7,
  "sourceText": "第一步，把输入统一成主题、来源和结论。",
  "beats": []
}
```

`sourceText` 必须来自当前 captions/口播，用于防止只换字幕和配音却继续渲染旧画面。`captionStartIndex/captionEndIndex` 与 Scene 的 `captionRange` 保持一致，传给组件做视觉状态说明。

## Caption

```ts
type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};
```

`endMs` 必须大于 `startMs`。超出项目总时长的字幕会被编译器裁到总时长。

## Assets

```json
{
  "voiceover": {
    "kind": "audio",
    "src": "projects/skill-showcase/audio/voice.m4a",
    "required": true
  }
}
```

本地 `src` 必须相对于 `public/`，不能带 `public/` 前缀，不能包含 `..`。

## Semantic Beat

Beat 是 `skill-showcase` 的章节内事件：

```json
{
  "startFrame": 365,
  "endFrame": 417,
  "captionStartIndex": 12,
  "captionEndIndex": 12,
  "keyword": "最小改动",
  "icon": "git-compare-arrows",
  "action": "trace",
  "visualState": "minimal-change",
  "motionPreset": "scan-lock",
  "placement": "highlight",
  "value": "3 files",
  "evidence": ["目标", "范围", "验收"]
}
```

规则：

- 帧数是 Scene 内局部帧，并由绑定字幕毫秒换算得到。
- `endFrame > startFrame`。
- 新口播项目必须写 `captionStartIndex/captionEndIndex`。
- 新口播项目必须写 `visualState/motionPreset/placement`。
- Beat 必须按 `startFrame` 排序。
- Beat 不能超出 Scene 时长。
- `skill-showcase` 的每个 Scene 都必须有 Beat，不能只给核心章节写。
- 全片第一个 Beat 必须从第 0 帧开始。
- Scene 第一个 Beat 必须在局部 1 秒内出现。
- Scene 最后一个 Beat 必须贴到 `durationInFrames`。
- `icon` 必须来自 `iconRegistry.ts` 的固定注册表。
- `action` 支持 `spotlight`、`stamp`、`trace`、`compare`、`counter`、`stack`、`focus`、`burst`。
- `motionPreset` 支持 `slow-rise`、`scan-lock`、`number-roll`、`split-reveal`、`card-regroup`、`icon-relay`、`focus-pulse`、`flash-cut`。
- `placement` 支持 `bottom`、`body`、`highlight`，用于限制 Beat 是否占底部、主体替换或局部高亮区。
- `evidence` 最多 4 项，每项不超过 28 字符；`value` 不超过 18 字符。
- `detail` 仍可用于单行解释，结构化证据优先使用 `evidence/value`。

换算公式：

```text
sceneStartFrame = round(captions[scene.captionRange.startIndex].startMs / 1000 * 30)
beatStartFrame  = round(captions[beat.captionStartIndex].startMs / 1000 * 30) - sceneStartFrame
beatEndFrame    = round(captions[beat.captionEndIndex].endMs / 1000 * 30) - sceneStartFrame
```

## 最小检查

```bash
cd remotion-video
npm run project:check -- examples/skill-showcase.json
npm run project:check -- examples/design-skills-showcase.json
npm run project:qa-sheet -- examples/design-skills-showcase.json --out-dir out/design-skills-showcase-qa-v2
```

## 继续阅读

- 编译和渲染：[[03 V2 渲染架构]]
- Beat 方法：[[04 口播语义节拍视频方法]]
