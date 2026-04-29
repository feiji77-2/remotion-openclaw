# number-strip

![[Assets/family-gallery/number-strip.png|520]]

## 定位

主信号核 + 卫星轨道。职责是先钉住核心判断，再把补充结论沿轨道展开。

## 适合

- 核心指标
- 跑分差距
- 里程碑数字

## 不适合

- 复杂过程
- 多层引用
- 需要读很多文字的段落

## 输入合同

- 必填：`count`
- 可选：`items`、`summary`、`heading`

## 默认节拍

- 75f
- `enter 18 / emphasis 42 / exit 15`
- stagger：`6f`
- camera：`zoom-pulse`
- transition：`fade 14f`

## 建议记忆物

- `ring`
- `node`

## 常见误用

- 还在做“大数字 + 三张解释卡”，没有形成主核结构
- 补充节点没有轨道关系，只是并排摆放
- `count` 有了，但没有承担主信号角色

## Step-04 推荐写法

```json
{
  "id": "shot-05",
  "family": "number-strip",
  "title": "明面上是 3 项升级",
  "narration": "但真正拉开差距的，是背后那条更完整的执行链。",
  "frames": 78,
  "items": [
    {"label": "代码修改", "detail": "跨文件更稳"},
    {"label": "并行代理", "detail": "多任务并发推进"},
    {"label": "渲染交付", "detail": "脚本到成片收口"}
  ],
  "visual": {
    "props": {
      "count": "3",
      "summary": "升级表面是三项，底层其实是一条链。"
    }
  }
}
```

## 失败 vs 正确

- 错误：只放一个大数字，没有 `items[]` 支撑。
- 正确：`count` 负责冲击，`items[]` 负责解释数字代表什么。
