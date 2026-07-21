# 文档总入口

当前文档与 `kb/` 只描述一条生产链路，不保留退役版本说明。

| 文档 | 内容 |
|---|---|
| [项目开发手册](../remotion-video/docs/project-development.zh-CN.md) | Project JSON、Schema、编译与 CLI |
| [本地视频生产控制台](../remotion-video/docs/video-factory-console-design.zh-CN.md) | 产品目标、六步交互、状态机、API、加速、验收和云端边界 |
| [Skill Showcase 成片](../remotion-video/docs/skill-showcase-video.zh-CN.md) | 当前黄金样片与验收命令 |
| [视频制作流程关系图谱](video-production-relationship-map.zh-CN.md) | 从选题、口播到 20 组件、QA 和 MP4 的全局介绍 |
| [开发代码约束](../remotion-video/docs/development-code-constraints.zh-CN.md) | 禁止分叉和验收规则 |
| [Scene family 参考](../remotion-video/docs/family-reference.zh-CN.md) | 唯一 `skill-showcase` family |
| [内容生产包](../remotion-video/docs/personal-ip-video-pipeline.zh-CN.md) | brief/script/asset pack 到 Project JSON |
| [当前状态](documentation-status-2026-07-21.zh-CN.md) | 仓库收敛结果 |
| [知识库首页](<../kb/00 首页.md>) | 当前架构、操作、QA、代码地图和发布手册 |

## 当前事实源

```text
控制台 / project:from-script
  -> skill-showcase Project JSON
  -> VideoProjectSchema / compileProject
  -> UltimateVideoV2
  -> 11 Cinematic + 9 Hero Track
  -> Still / MP4 / QA / Verify
```

`payload.variant` 是内容语义字段，不是另一套视觉组件；黄金样片 9 个 scene 的接触表是成片证据，也不是组件目录。20 个主视觉组件的唯一目录是 `storyboardContract.json`。

## 标准验证

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm --prefix remotion-video run skill:gate
npm --prefix remotion-video run storyboard:render
```

自动化成功不代表视觉审核通过。最终必须直接打开 Still、9 场景中点接触表和 20 组件接触表。
