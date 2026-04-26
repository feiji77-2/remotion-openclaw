# Contributing

## 开始之前

这个仓库当前包含两个主工程：

- `video-pipeline-view/player-app`
- `remotion-video`

提交改动前，请先确认你改的是“真实链路”而不是归档文档。`docs/archive/` 只保留少量升级资料，默认不作为功能迭代主战场。

## 建议流程

1. 先在对应子项目安装依赖
2. 只改与你任务直接相关的模块
3. 本地完成最小校验
4. 在 PR 中明确写清影响的 Step、API 和风险点

## 本地命令

```bash
npm run setup
npm run clean
npm run typecheck
npm run build
npm run release:check
```

常用开发命令：

```bash
npm run dev:player
npm run dev:api
npm run dev:worker
```

## 提交范围规则

- 不提交 `node_modules`、`dist`、`out`、`public/assets`、`public/jobs`、`public/voice`
- 不把临时测试素材、渲染结果、音频结果混进 PR
- 不在没有必要时改 `docs/archive/`
- 不把旧原型、benchmark 或临时脚本重新接回主入口

## Step 链路约束

- Step 1-3：优先遵守 Skill 真源与结构化生成约束
- Step 4-5：保持 `scene planner + scene prompts + Ultimate 20 family` 一致，不要把旧 6 镜头心智接回主链路
- Step 6：默认 `ChatTTS`，回退 `Melo / OpenVoice`
- Step 7：只做 Remotion 项目构建摘要
- Step 8：只做最终渲染参数、预览和导出

## 提交前检查

至少执行：

- `npm run release:check`
- 它现在会包含一次短合同 smoke 视频渲染与 MP4 合同校验，不再只是代码层绿灯

涉及后端工作流、渲染或配音时，额外确认：

- `/api/workflow/generate`
- `/api/voice`
- `/api/render`

对应链路没有被旧模板、旧静态内容或假回退覆盖。

## PR 说明建议

PR 描述建议至少包含：

- 改动目标
- 影响范围
- 验证方式
- 已知风险

如果改动影响 Step 消费链路，请明确写清是否兼容旧 localStorage 快照和旧项目状态。
