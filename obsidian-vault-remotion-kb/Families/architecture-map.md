# architecture-map

![[Assets/family-gallery/architecture-map.png|520]]

## 定位

架构图。职责是展示系统部件如何连接，不是讲时间顺序。

## 适合

- 系统架构
- 模块连接
- 中心节点辐射

## 不适合

- 明确前后步骤
- 情绪化金句
- 简单列表

## 输入合同

- 必填：`nodes`、`centerTitle`
- 可选：`centerDetail`、`layout`、`items`、`heading`

## 默认节拍

- 82f
- `enter 18 / emphasis 48 / exit 16`
- stagger：`10f`
- camera：`drift`
- transition：`fade 14f`

## 建议记忆物

- `node`
- `ring`

## 常见误用

- 把纯流程画成架构图
- 中心节点不明确
- 节点太多，没有层级

## Step-04 推荐写法

```json
{
  "id": "shot-10",
  "family": "architecture-map",
  "title": "这次升级真正动到的是哪几层",
  "narration": "从工作流到渲染再到验收，这次更新不是单点，而是分层联动。",
  "frames": 88,
  "items": [
    {"label": "Workflow", "detail": "phase / skill / step 合同"},
    {"label": "Storyboard", "detail": "registry + grammar + scene data"},
    {"label": "Render", "detail": "UltimateSceneTemplate 出片"},
    {"label": "QA", "detail": "ffprobe 合同校验"}
  ],
  "visual": {
    "props": {
      "centerTitle": "Remotion 主链路",
      "centerDetail": "从步骤到成片的四层结构",
      "layout": "radial"
    }
  }
}
```

## 失败 vs 正确

- 错误：只写“系统升级了”，没有中心节点和外围节点。
- 正确：明确一个 `centerTitle`，外围 `items[]` 负责辐射解释。
