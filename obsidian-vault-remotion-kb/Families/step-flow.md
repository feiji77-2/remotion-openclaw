# step-flow

![[Assets/family-gallery/step-flow.png|520]]

## 定位

步骤流。职责是把“先做什么，后做什么”拍清楚。

## 适合

- 操作步骤
- 工作流分段
- 过程演示

## 不适合

- 时间历史
- 纯能力列表
- 架构拓扑

## 输入合同

- 必填：`steps`
- 可选：`items`、`variant`、`stepVariants`

## 默认节拍

- 84f
- `enter 16 / emphasis 52 / exit 16`
- stagger：`10f`
- camera：`pan-x`
- transition：`fade 14f`

## 建议记忆物

- `line`
- `node`

## 常见误用

- 用 step-flow 讲没有顺序的内容
- steps 字段没补齐，只剩普通 items
- 每一步文案太长，导致节奏拖

## Step-04 推荐写法

```json
{
  "id": "shot-06",
  "family": "step-flow",
  "title": "一次完整链路现在怎么跑",
  "narration": "先生成结构，再补图，再配音，最后验证成片合同。",
  "frames": 90,
  "items": [
    {"label": "结构生成", "detail": "Step-04 先定 family 和 frames"},
    {"label": "资产补齐", "detail": "图像和旁白同步落位"},
    {"label": "渲染验证", "detail": "verify-render-output 校验成片"}
  ]
}
```

## 失败 vs 正确

- 错误：只写“这是工作流”，没有真正的 3 步以上结构。
- 正确：至少给 3 个 `items[]`，每一步都能单独念出来。
