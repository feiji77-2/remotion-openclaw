# 本地内容生产台设计约束

> 状态：当前有效
> 范围：`src/tools/console/*`、`scripts/tools-studio-server.mjs`
> 定位：P1 本地 MVP 原型，不是已上线 Web/API/Worker 产品。

## 1. 产品目标

本地内容生产台只解决一件事：

```text
创建项目 -> 填写稿件和风格 -> 生成 Project JSON -> still 预览 -> MP4 渲染 -> QA -> 下载/打开产物
```

它要让非开发用户也能完成一条本地视频生产闭环，但不能把未来的云端能力伪装成当前事实。

## 2. 当前文件边界

| 模块 | 职责 |
|---|---|
| `src/tools/console/App.tsx` | 控制台状态和页面组合 |
| `src/tools/console/NewProjectModal.tsx` | 新建项目入口 |
| `src/tools/console/LeftPanel.tsx` | 项目列表和项目选择 |
| `src/tools/console/CenterPanel.tsx` | 当前工作区、稿件、预览、timeline |
| `src/tools/console/RightPanel.tsx` | QA、命令、文件检查 |
| `src/tools/console/api.ts` | 浏览器端 API client |
| `src/tools/console/types.ts` | 控制台数据类型 |
| `scripts/tools-studio-server.mjs` | 本地 runner/API |

旧路径 `src/tools/VideoFactoryConsole.tsx` 和 `src/tools/global.css` 不再作为当前文档范围。

## 3. 不可变体验

第一屏必须让用户知道：

- 当前选中哪个项目。
- 下一步该做什么。
- 是否有 schema、素材、渲染或 QA 错误。
- 可以运行哪个命令。
- 产物在哪里。

不要做营销型首页、模板橱窗、大段说明、无反馈按钮或假进度。

## 4. 数据流

```text
CreateProjectDraft
  -> POST /api/projects
  -> brief.json
  -> script-pack.json
  -> asset-pack.json
  -> project.json
  -> ProjectOption
```

`project.json` 必须继续通过 `VideoProjectSchema`。控制台可以展示错误，但不能静默把坏项目替换成默认项目。

## 5. 本地命令

在 `remotion-video/` 下执行：

```bash
npm run tools:dev
npm run tools:api
npm run tools:studio
```

渲染相关命令仍走内核脚本：

```bash
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 0 --out out/project-f0.png
npm run project:render -- examples/project.json --out out/project.mp4
```

## 6. UI 约束

- 面向生产操作台，不做落地页。
- 保持三域布局：项目列表、工作区、检查/命令区。
- 所有按钮必须有真实状态：idle、running、done、failed 或 disabled。
- 错误必须显示到具体文件、字段、素材或命令。
- 文案区域、命令区域和预览区域不要互相遮挡。
- 移动端可以降级为单列任务流，但必须保留核心闭环。

## 7. P1 禁区

- 不引入登录、数据库、队列、对象存储、计费或多租户。
- 不让 Remotion Composition 直接访问 API。
- 不在浏览器端拼接任意 shell 命令。
- 不把本地 runner 写成“生产后端”。
- 不把未来 Worker、SSE、云渲染写成已存在能力。

## 8. 验收

| 验收 | 标准 |
|---|---|
| 新建项目 | 返回 `brief/script-pack/asset-pack/project.json` 四个文件路径 |
| schema 错误 | UI 能解释字段路径，不静默 fallback |
| still | 带 Project JSON 参数真实出图 |
| render | 输出可解码 MP4 |
| QA | 至少能展示命令结果、exit code、产物路径 |

更完整执行方案见：

```text
docs/p1-local-content-studio-execution.zh-CN.md
```
