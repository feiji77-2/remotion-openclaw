# focus

![[focus.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

单点聚焦。职责是把一个词、一个概念、一个问题锁住。

## 适合

- 关键词解释
- 中段切换重点
- 一句话打出核心差异

## 不适合

- 多条列表
- 复杂结构图
- 双方对撞

## 输入合同

- 必填：`keyword`、`description`
- 可选：`eyebrow`、`question`、`diagram`、`kicker`

## 默认节拍

- 72f
- `enter 16 / emphasis 40 / exit 16`
- camera：`push-in`
- transition：`fade 14f`
- `showIconOrbit: false`

## 建议记忆物

- `word`
- `ring`

## 常见误用

- description 太长，焦点被冲散
- 一个 focus 里想解释三个概念
- 本该用 `glossary-term` 的术语卡写成 focus

## Step-04 推荐写法

```json
{
  "id": "shot-02",
  "family": "focus",
  "title": "不是更大，是更稳",
  "narration": "这次升级真正该看的，是复杂任务里的稳定完成率。",
  "frames": 72,
  "visual": {
    "props": {
      "eyebrow": "真正变化点",
      "keyword": "稳定完成率",
      "question": "为什么这比参数更重要？",
      "description": "因为用户真正感知的是任务能不能一次做完。",
      "diagram": "rings"
    }
  }
}
```

## 失败 vs 正确

- 错误：把三个概念和一堆背景都塞进一个 focus。
- 正确：只聚焦一个关键词，`keyword` 和 `description` 都尽量短。
