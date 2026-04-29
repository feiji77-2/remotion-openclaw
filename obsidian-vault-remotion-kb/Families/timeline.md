# timeline

![[Assets/family-gallery/timeline.png|520]]

## 定位

时间线。职责是表达事件前后推进，而不是流程操作。

## 适合

- 发布历程
- 版本演进
- 历史节点

## 不适合

- 功能列表
- A/B 对比
- 结构说明

## 输入合同

- 必填：`items`
- 可选：`heading`、`subtitle`

## 默认节拍

- 80f
- `enter 18 / emphasis 46 / exit 16`
- stagger：`10f`
- camera：`pan-x`
- transition：`fade 14f`

## 建议记忆物

- `line`
- `axis`

## 常见误用

- 把时间线做成功能墙
- 节点没有明确前后关系
- 开场直接上 timeline，缺 hook

## Step-04 推荐写法

```json
{
  "id": "shot-04",
  "family": "timeline",
  "title": "这一波更新是怎么展开的",
  "narration": "从发布到开发者实测，关键节点其实非常密集。",
  "frames": 84,
  "items": [
    {"label": "发布日", "detail": "模型与桌面链路同步公开"},
    {"label": "开发者试跑", "detail": "先看编码任务稳定性"},
    {"label": "渲染集成", "detail": "开始接进真实项目工作流"}
  ],
  "visual": {
    "props": {
      "heading": "关键节点"
    }
  }
}
```

## 失败 vs 正确

- 错误：只有一个时间点，却硬用 timeline。
- 正确：至少 3 个时间节点，并且顺序明确。
