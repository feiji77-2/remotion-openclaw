# terminal

![[terminal.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

终端现场。职责是给出“真在执行”的技术证据感。

## 适合

- 命令行演示
- 输出日志
- 技术步骤展示

## 不适合

- 情绪化开场
- 长篇概念解释
- 需要大量图形关系的段落

## 输入合同

- 必填：`command`
- 可选：`windowTitle`、`outputs`、`note`、`heading`、`filename`、`language`

## 默认节拍

- 75f
- `enter 14 / emphasis 46 / exit 15`
- camera：`none`
- transition：`fade 12f`
- `showOverlay: false`
- `showMediaCard: false`

## 建议记忆物

- `block`
- `word`

## 常见误用

- 输出行过多，画面成文字墙
- 没有真实 command，只剩装饰终端壳
- 该用 `code` 时误用 terminal

## Step-04 推荐写法

```json
{
  "id": "shot-08",
  "family": "terminal",
  "title": "真实命令不是装饰，是证据",
  "narration": "当链路跑起来时，命令和输出本身就是叙事的一部分。",
  "frames": 78,
  "visual": {
    "props": {
      "windowTitle": "release-check",
      "command": "node scripts/render-ultimate-scene.mjs --config projects/gpt55/steps/step-04.json",
      "outputs": [
        "$ node scripts/render-ultimate-scene.mjs --config step-04.json",
        "[render] 8 shots / 7169f / 238.9s",
        "[render] Done: out/gpt55-final.mp4"
      ],
      "note": "render contract verified"
    }
  }
}
```

## 失败 vs 正确

- 错误：只有 `command` 没有 `outputs`。
- 正确：至少给 2 到 3 行输出，让终端现场成立。
