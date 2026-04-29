# feature-rail

![[Assets/family-gallery/feature-rail.png|520]]

## 定位

路径式能力展开。职责是沿一条推进轨迹依次抛出多个能力节点。

## 适合

- 功能列表
- 能力拆解
- 多卖点并排推进

## 不适合

- 时间顺序
- 严格对比
- 证据引用

## 输入合同

- 必填：`items`
- 可选：`heading`、`subtitle`

## 默认节拍

- 82f
- `enter 18 / emphasis 48 / exit 16`
- stagger：`8f`
- camera：`pan-x`
- transition：`fade 14f`

## 建议记忆物

- `node`
- `line`

## 常见误用

- 还在按横向卡组思路摆内容，结果又回到 PPT 目录
- 没有明确推进路径，能力点只是散着出现
- 本该用 `step-flow` 的流程内容误放进 rail

## Step-04 推荐写法

```json
{
  "id": "shot-03",
  "family": "feature-rail",
  "title": "这次升级最值钱的 3 个能力",
  "narration": "真正有感知的，不是参数名字，而是这三类工作变得更顺了。",
  "frames": 84,
  "features": [
    {"title": "长链路改代码", "desc": "多文件协同修改更稳定"},
    {"title": "并行子任务", "desc": "把读写和验证拆开并发推进"},
    {"title": "桌面工作流", "desc": "从脚本到渲染闭环更完整"}
  ],
  "visual": {
    "props": {
      "heading": "能力升级"
    }
  }
}
```

## 失败 vs 正确

- 错误：只给 `items[]`，没有 `features[]`，结果 rail 卡片内容不完整。
- 正确：明确写 `features[]`，每张卡至少有 `title + desc`。
