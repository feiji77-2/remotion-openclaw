# tag-matrix

![[tag-matrix.png|520]]

> 2026-05-01：本页图片已切到导演夹具回归快照，覆盖 `cameraMotion / revealDirection / archetype / dataEvent / memoryObject`。

## 定位

标签矩阵。职责是把内容分门别类，而不是按顺序推进。

## 适合

- 模块分类
- 特征分组
- 概览盘点

## 不适合

- 严格步骤
- 大数字冲击
- 证据引用

## 输入合同

- 必填：`tabs`
- 可选：`activeTab`、`items`、`heading`

## 默认节拍

- 70f
- `enter 14 / emphasis 40 / exit 16`
- stagger：`6f`
- camera：`pan-x`
- transition：`fade 14f`

## 建议记忆物

- `block`
- `word`

## 常见误用

- 分组名空泛，分类没有意义
- 项目过多，像表格截图
- 想讲先后关系却用了矩阵

## Step-04 推荐写法

```json
{
  "id": "shot-11",
  "family": "tag-matrix",
  "title": "这次升级影响了哪些工作面",
  "narration": "不是只有编码更强，而是多个工作面一起被带动。",
  "frames": 74,
  "visual": {
    "props": {
      "tabs": ["编码", "渲染", "验收"],
      "activeTab": "编码",
      "items": [
        {"label": "多文件修改"},
        {"label": "代理并行"},
        {"label": "终端执行"},
        {"label": "结果回写"}
      ]
    }
  }
}
```

## 失败 vs 正确

- 错误：只有一串标签，没有 `tabs`。
- 正确：先给分组，再给条目，矩阵才会成立。
