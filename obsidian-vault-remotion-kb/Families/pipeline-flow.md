# pipeline-flow

![[Assets/family-gallery/pipeline-flow.png|520]]

## 定位

流程管线。职责是让阶段从前到后穿过去。

## 适合

- 生产链路
- 数据管线
- 多阶段处理过程

## 不适合

- 抽象关系图
- 情绪化金句
- 单点定义

## 输入合同

- 必填：`stages`
- 可选：`heading`、`summary`、`items`

## 默认节拍

- 80f
- `enter 16 / emphasis 48 / exit 16`
- stagger：`10f`
- camera：`pan-x`
- transition：`fade 14f`

## 建议记忆物

- `line`
- `node`

## 常见误用

- stages 没有清晰阶段名
- 本该用 architecture-map 的空间关系误放成 pipeline
- 一段里塞太多阶段，观众记不住

## Step-04 推荐写法

```json
{
  "id": "shot-16",
  "family": "pipeline-flow",
  "title": "现在出片链路已经怎么收口",
  "narration": "从选题到分镜，再到配音、渲染和验收，主链路已经可以连着走完。",
  "frames": 84,
  "items": [
    {"label": "研究与标题", "detail": "Step 1-3"},
    {"label": "分镜与视觉", "detail": "Step 4-5"},
    {"label": "配音与出片", "detail": "Step 6-8"}
  ],
  "visual": {
    "props": {
      "summary": "6 步主链路 + 1 条 QA 支线"
    }
  }
}
```

## 失败 vs 正确

- 错误：阶段名模糊成“优化 / 升级 / 完整化”。
- 正确：每个阶段都应该能对应一个具体动作或 step 区段。
