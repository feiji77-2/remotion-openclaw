# glossary-term

![[Assets/family-gallery/glossary-term.png|520]]

## 定位

术语定义卡。职责是快速解释一个名词，不是讲完整故事。

## 适合

- 术语拆解
- 概念补课
- 中段知识点解释

## 不适合

- 强情绪开场
- 多术语并列
- 长证据链

## 输入合同

- 必填：`term`、`definition`
- 可选：`heading`、`visualProps`

## 默认节拍

- 68f
- `enter 14 / emphasis 38 / exit 16`
- camera：`push-in`
- transition：`fade 14f`
- `showIconOrbit: false`

## 建议记忆物

- `word`
- `block`

## 常见误用

- definition 写成一整段小作文
- 一张卡解释多个术语
- 术语没有和主叙事连接

## Step-04 推荐写法

```json
{
  "id": "shot-19",
  "family": "glossary-term",
  "title": "什么叫数据驱动渲染",
  "narration": "就是帧数、family 和场景数据来自 Step-04，而不是手写 demo 文件。",
  "frames": 68,
  "visual": {
    "props": {
      "term": "数据驱动渲染",
      "heading": "术语解释"
    }
  }
}
```

## 失败 vs 正确

- 错误：一个 glossary 里解释三四个术语。
- 正确：一张卡只打一个术语，定义控制在一句内。
