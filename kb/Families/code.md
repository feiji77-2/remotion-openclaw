# code

![[code.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

代码证据面板。职责是把关键代码片段拍成“证据”，不是把文件全文搬上来。

## 适合

- 核心片段展示
- schema / JSON 结构
- 关键实现说明

## 不适合

- 超长文件滚动
- 终端输出现场
- 抽象概念宣传

## 输入合同

- 必填：`lines`
- 可选：`filename`、`language`、`heading`、`visualProps`

## 默认节拍

- 78f
- `enter 14 / emphasis 48 / exit 16`
- camera：`none`
- transition：`fade 14f`
- `showOverlay: false`
- `showMediaCard: false`

## 建议记忆物

- `block`
- `word`

## 常见误用

- 一屏代码太多，完全不可读
- 该用 terminal 的命令现场误放 code
- 高亮重点不明确

## Step-04 推荐写法

```json
{
  "id": "shot-12",
  "family": "code",
  "title": "现在真正的数据驱动入口长这样",
  "narration": "关键不是再写死 demo，而是把 Step-04 直接作为 composition 输入。",
  "frames": 78,
  "visual": {
    "props": {
      "filename": "step-04.json",
      "lines": [
        "\"shots\": [",
        "  {\"id\":\"shot-01\",\"family\":\"hero\",\"frames\":96},",
        "  {\"id\":\"shot-02\",\"family\":\"focus\",\"frames\":72}",
        "]"
      ],
      "heading": "Data-driven Render"
    }
  }
}
```

## 失败 vs 正确

- 错误：把几十行代码整段塞上来。
- 正确：只放最关键的 3 到 6 行，保证一眼能看懂。
