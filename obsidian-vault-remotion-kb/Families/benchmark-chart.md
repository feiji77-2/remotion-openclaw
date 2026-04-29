# benchmark-chart

![[Assets/family-gallery/benchmark-chart.png|520]]

## 定位

曲线路径对打。职责是让“超车、领先、落后”变成一眼能读懂的运动轨迹。

## 适合

- 跑分对比
- 主副对象竞速
- 性能领先证明

## 不适合

- 三方以上复杂排名
- 长概念解释
- 纯分类盘点

## 输入合同

- 必填：`items`
- 可选：`primaryLabel`、`secondaryLabel`、`dataPoints`、`heading`

## 默认节拍

- 82f
- `enter 16 / emphasis 50 / exit 16`
- stagger：`8f`
- camera：`growth`
- transition：`fade 14f`

## 建议记忆物

- `axis`
- `line`

## 常见误用

- 不给主次标签，观众看不出谁赢
- 数值差异太小却想拍成大高潮
- 本应使用 compare-board 的定性对比被塞进 benchmark

## Step-04 推荐写法

```json
{
  "id": "shot-17",
  "family": "benchmark-chart",
  "title": "真正能打动开发者的还是跑分和完成率",
  "narration": "一旦进入实战比较，大家最先看的是任务完成质量而不是宣传语。",
  "frames": 86,
  "dataPoints": [
    "SWE-Bench:68.4:49.2:0.78",
    "Aider Polyglot:74.1:61.3:0.84",
    "回归成功率:92:81:0.76"
  ],
  "visual": {
    "props": {
      "primaryLabel": "GPT-5.5",
      "secondaryLabel": "前代"
    }
  }
}
```

## 失败 vs 正确

- 错误：只给一个数字，或者没有主副标签。
- 正确：每行都给 `主值 + 副值 + ratio`，同时明确谁是 primary。
