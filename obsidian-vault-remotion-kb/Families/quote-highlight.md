# quote-highlight

![[Assets/family-gallery/quote-highlight.png|520]]

## 定位

金句停留。职责是让一句话在高潮后留下余震。

## 适合

- 关键引述
- 结论一句话
- 情绪收束

## 不适合

- 长段解释
- 多项列表
- 动态数据流

## 输入合同

- 必填：`quote`
- 可选：`attribution`、`tags`、`heading`、`visualProps`

## 默认节拍

- 70f
- `enter 16 / emphasis 38 / exit 16`
- camera：`push-in`
- transition：`fade 14f`
- `showIconOrbit: false`

## 建议记忆物

- `word`
- `beam`

## 常见误用

- quote 太长，失去“金句”属性
- 结尾没有留白，像普通大字报
- 归因缺失，可信度不足

## Step-04 推荐写法

```json
{
  "id": "shot-18",
  "family": "quote-highlight",
  "title": "真正的变化，不在模型名，而在交付闭环",
  "narration": "真正有价值的升级，是从提示词演示走向可验证交付。",
  "frames": 72,
  "visual": {
    "props": {
      "attribution": "项目改造结论",
      "tags": ["交付闭环", "导演级叙事"]
    }
  }
}
```

## 失败 vs 正确

- 错误：拿一整段解说词直接当 quote。
- 正确：quote 应该像锤子一样短，能一屏打住。
