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
  payload: Record<string, unknown>;
  assetIds: string[];
  transition: false | {
    type: 'fade' | 'slide';
    durationInFrames: number;
  };
};
```

Scene 表示一个完整章节。`durationInFrames` 必须来自真实时间轴，而不是组件内部自己计时。

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
  "keyword": "最小改动",
  "icon": "git-compare-arrows",
  "action": "trace",
  "value": "3 files",
  "evidence": ["目标", "范围", "验收"]
}
```

规则：

- 帧数是 Scene 内局部帧。
- `endFrame > startFrame`。
- Beat 必须按 `startFrame` 排序。
- Beat 不能超出 Scene 时长。
- `skill-showcase` 的每个 Scene 都必须有 Beat，不能只给核心章节写。
- 全片第一个 Beat 必须从第 0 帧开始。
- Scene 第一个 Beat 必须在局部 1 秒内出现。
- Scene 最后一个 Beat 必须贴到 `durationInFrames`。
- `icon` 必须来自 `iconRegistry.ts` 的固定注册表。
- `action` 支持 `spotlight`、`stamp`、`trace`、`compare`、`counter`、`stack`、`focus`、`burst`。
- `evidence` 最多 4 项，每项不超过 28 字符；`value` 不超过 18 字符。
- `detail` 仍可用于单行解释，结构化证据优先使用 `evidence/value`。

## 最小检查

```bash
cd remotion-video
npm run project:check -- examples/skill-showcase.json
```

## 继续阅读

- 编译和渲染：[[03 V2 渲染架构]]
- Beat 方法：[[04 口播语义节拍视频方法]]
