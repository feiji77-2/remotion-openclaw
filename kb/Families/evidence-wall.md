# evidence-wall

![[evidence-wall.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

中心证据核。职责是把多个引用或事实从中心向外发散成证据网络。

## 适合

- 证据汇聚
- 社会证明
- 多来源事实支撑

## 不适合

- 单一概念解释
- 线性流程
- 单个数字冲击

## 输入合同

- 必填：`cards`
- 可选：`comparisons`、`heading`
- 推荐：每个 `card` 显式补 `icon`

## 默认节拍

- 85f
- `enter 20 / emphasis 48 / exit 17`
- stagger：`8f`
- camera：`pan-y`
- transition：`fade 14f`

## 建议记忆物

- `node`
- `pin`

## 常见误用

- 证据之间没有主次，只是三张并排说明板
- 每张证据都做成重卡片，中心焦点被吃掉
- 明明是列表，却假装做证据网络

## Step-04 推荐写法

```json
{
  "id": "shot-09",
  "family": "evidence-wall",
  "title": "为什么这次不是自嗨式升级",
  "narration": "真正有分量的，是三类外部证据同时开始对齐。",
  "frames": 90,
  "comparisons": [
    {"label": "GitHub 讨论", "text": "开发者开始用真实项目试跑"},
    {"label": "官方文档", "text": "桌面与编码链路一起收口"},
    {"label": "项目集成", "text": "不再停留在单点 Demo"}
  ]
}
```

## 失败 vs 正确

- 错误：只写观点，没有来源标签。
- 正确：每张证据卡都要有 `label`，让观众知道证据来自哪里。
