# cta

![[Assets/family-gallery/cta.png|520]]

## 定位

结尾号召。职责是收束、定锤、给动作。

## 适合

- 结尾行动号召
- 最后一屏收口
- 品牌或项目落点

## 不适合

- 中段讲解
- 大量数据并排
- 复杂结构信息

## 输入合同

- 必填：`heading`
- 可选：`subtitle`、`badge`

## 默认节拍

- 72f
- `enter 16 / emphasis 40 / exit 16`
- camera：`push-in`
- transition：`lift 16f`
- `showOverlay: false`
- `showMediaCard: false`
- `showIconOrbit: false`

## 建议记忆物

- `word`
- `beam`

## 常见误用

- 结尾还在继续解释，没有动作句
- CTA 文字太多，失去力度
- 没有和前面主叙事形成闭环

## Step-04 推荐写法

```json
{
  "id": "shot-20",
  "family": "cta",
  "title": "下一步，该把你的 Step-04 也收成真源了",
  "narration": "先从 family、frames 和结构字段写规范开始，再去追更强的动效和镜头语言。",
  "frames": 72,
  "visual": {
    "props": {
      "badge": "NEXT",
      "heading": "把 Step-04 变成真源"
    }
  }
}
```

## 失败 vs 正确

- 错误：结尾继续展开新知识点。
- 正确：标题变成动作句，副标题只做收口和召回。
