# data-stream

![[data-stream.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

实时数据流。职责是制造“正在流动、正在刷新”的感觉。

## 适合

- 实时指标
- 连续事件流
- 快速数据刷新

## 不适合

- 结尾收束
- 单一定义解释
- 稳定静态结论

## 输入合同

- 必填：`items`
- 可选：`summary`、`dataPoints`、`heading`

## 默认节拍

- 80f
- `enter 16 / emphasis 48 / exit 16`
- stagger：`6f`
- camera：`drift`
- transition：`fade 14f`

## 建议记忆物

- `line`
- `beam`

## 常见误用

- 拿 data-stream 做收尾，导致视频不落地
- item 没有节奏层级，只剩繁忙感
- 想讲结构关系却用了流

## Step-04 推荐写法

```json
{
  "id": "shot-14",
  "family": "data-stream",
  "title": "这波升级最像实时流的地方",
  "narration": "当任务并行跑起来后，你看到的不是静态信息面板，而是持续变化的信号流。",
  "frames": 82,
  "dataPoints": [
    "tokens/s:182",
    "并发任务:12",
    "成功率:98.7%"
  ],
  "visual": {
    "props": {
      "summary": "实时监控感来自持续变化的指标。"
    }
  }
}
```

## 失败 vs 正确

- 错误：把 data-stream 当普通列表，只有 `items[]` 没有实时数值。
- 正确：优先给 `dataPoints[]`，而且尽量是“标签:值”格式。
