# memory-graph

![[Assets/family-gallery/memory-graph.png|520]]

## 定位

知识 / 关系图。职责是拍“概念之间的连接”。

## 适合

- 概念地图
- 关联关系
- 主题辐射结构

## 不适合

- 明确步骤顺序
- 纯数字冲击
- 单一术语定义

## 输入合同

- 必填：`centerTitle`、`nodes`
- 可选：`centerDetail`、`items`、`heading`

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

- 节点太多，图成一团
- 关系没有主次
- 把系统流程错当概念关系

## Step-04 推荐写法

```json
{
  "id": "shot-15",
  "family": "memory-graph",
  "title": "为什么现在更像真正的知识工作台",
  "narration": "因为上下文、步骤、图像和成片不再彼此孤立，而是开始互相引用。",
  "frames": 86,
  "items": [
    {"label": "上下文", "detail": "研究与文案互相衔接"},
    {"label": "分镜", "detail": "Step-04 成为渲染真源"},
    {"label": "资产", "detail": "图片与语音都回写项目"},
    {"label": "验收", "detail": "成片再走 ffprobe 合同"}
  ],
  "visual": {
    "props": {
      "centerTitle": "项目记忆网络",
      "centerDetail": "不是单点脚本，而是一张互相引用的网"
    }
  }
}
```

## 失败 vs 正确

- 错误：把流程阶段错画成 graph。
- 正确：graph 讲关系，pipeline 讲顺序，先分清这两个语义。
