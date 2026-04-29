# hero

![[Assets/family-gallery/hero.png|520]]

## 定位

开场标题 / hook 屏。职责是钉题，不是解释。

## 适合

- 视频开场
- 章节开头
- 发布主题一句话打穿

## 不适合

- 信息列表
- 长解释
- 多组数据并列

## 输入合同

- 必填：`title`
- 可选：`kicker`、`subtitle`、`visualSummary`、`heroMark`、`topLabel`

## 默认节拍

- 90f
- `enter 20 / emphasis 50 / exit 20`
- easing：`ease-out`
- spring：`smooth`
- camera：`push-in`
- transition：`fade 18f`

## 建议记忆物

- `word`
- `beam`

## 常见误用

- 标题过长，导致开场像文档封面
- 用 hero 承载三层以上信息
- 没有 `kicker` 或 `topLabel`，导致开场没层级

## Step-04 推荐写法

```json
{
  "id": "shot-01",
  "family": "hero",
  "title": "GPT-5.5 发布",
  "narration": "这不是一次例行升级，而是编码代理和桌面链路的一次真正收口。",
  "frames": 96,
  "visual": {
    "props": {
      "kicker": "OPENAI / RELEASE",
      "heroEmoji": "🤖",
      "highlightedWord": "收口",
      "lines": ["编码代理更稳", "多代理并行更强", "桌面链路继续收口"],
      "brandIcon": "telegram",
      "brandLabel": "Tech Brief"
    }
  }
}
```

## 失败 vs 正确

- 错误：只有 `title` 和一大段 narration，没有 `lines`、`heroEmoji`、`kicker`。
- 正确：把开场拆成一句主标题 + 2 到 3 行副信息，让 hero 真正成为钉题屏。
