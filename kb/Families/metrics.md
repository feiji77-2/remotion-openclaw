# metrics

![[metrics.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

KPI 条与比例。职责是把多个指标做成可比较的增长面。

## 适合

- 多项 KPI
- 条状对比
- 进度 / 占比

## 不适合

- 双方激烈对撞
- 长文本解释
- 时间演进

## 输入合同

- 必填：`items`
- 可选：`dataPoints`、`heading`、`layout`
- 推荐：每个 `item` 显式补 `icon`

## 默认节拍

- 76f
- `enter 16 / emphasis 44 / exit 16`
- stagger：`8f`
- camera：`growth`
- transition：`fade 14f`

## 建议记忆物

- `axis`
- `line`

## 常见误用

- 用 metrics 拍 A/B 决斗，冲击力不够
- 数值没有单位或口径
- 条太多，导致主指标消失

## Step-04 推荐写法

```json
{
  "id": "shot-13",
  "family": "metrics",
  "title": "对开发者最有感知的 3 个结果",
  "narration": "一旦进入真实项目，大家感知到的首先是时间、返工和交付确定性。",
  "frames": 78,
  "dataPoints": [
    "渲染耗时:42秒:0.72",
    "返工轮次:2轮:0.36",
    "验收确认:一次通过:0.81"
  ],
  "visual": {
    "props": {
      "heading": "结果指标"
    }
  }
}
```

## 失败 vs 正确

- 错误：只写 `42秒`，没有标签，也没有 ratio。
- 正确：用 `标签:值:ratio`，让条状图有语义也有长度。
