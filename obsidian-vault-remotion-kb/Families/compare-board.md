# compare-board

![[Assets/family-gallery/compare-board.png|520]]

## 定位

压缩对比板。职责是把两个对象压到同一画面，让差异自己说话。

## 适合

- 新旧方案对比
- A/B 结果
- 优缺点对照

## 不适合

- 三方以上竞赛
- 长时间历程
- 抽象概念定义

## 输入合同

- 必填：`rows`
- 可选：`leftTitle`、`rightTitle`、`comparisons`、`dataPoints`

## 默认节拍

- 82f
- `enter 16 / emphasis 50 / exit 16`
- stagger：`6f`
- camera：`pan-x`
- transition：`lift 12f`

## 建议记忆物

- `axis`
- `block`

## 常见误用

- 左右两列信息量失衡
- 明明是排行榜，却用了 compare-board
- 行数过多，观众来不及比

## Step-04 推荐写法

```json
{
  "id": "shot-07",
  "family": "compare-board",
  "title": "旧链路 vs 新链路",
  "narration": "变化不只是在结果上，更在每一段交付链路的确定性上。",
  "frames": 84,
  "comparisons": [
    {"label": "步骤数量", "text": "8 步", "secondary": "6 步"},
    {"label": "返工轮次", "text": "多轮手改", "secondary": "明显减少"},
    {"label": "验收方式", "text": "人工目测", "secondary": "脚本合同校验"}
  ],
  "dataPoints": [
    "8步 / 6步 / 0.75",
    "手改多轮 / 明显减少 / 0.55",
    "人工目测 / 合同校验 / 0.65"
  ],
  "visual": {
    "props": {
      "leftTitle": "旧链路",
      "rightTitle": "新链路"
    }
  }
}
```

## 失败 vs 正确

- 错误：只有 `comparisons[]` 标签，没有左右值。
- 正确：`comparisons[]` 给语义，`dataPoints[]` 补真正左右内容。
