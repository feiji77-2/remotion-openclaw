# PRODUCTION_LOG

## Topic

- productionId: 2026-07-17-ai-tool-workflow
- title: 某个 AI 工具如何改变团队工作流
- primaryLink: https://example.com/product
- platform: 抖音
- format: 1920x1080 / 30fps

## Decisions

- contentType: 技术教程
- structure: 痛点 -> 方案 -> 3 步教程 -> 注意事项 -> 结论
- selectedViewpoint: view-1
- visualStyle: 蓝绿 AI 感
- brand: 第一阶段不做强品牌化

## Sources

| Priority | Source | Role | Status |
| --- | --- | --- | --- |
| 官方文档/官网 | https://example.com/product | 主来源 | 待核验 |

## Script

- maxLength: 1200 字
- TTS: 第一阶段使用高质量普通男声/女声
- humanCheckpoints: 选题、观点、文案、素材、still、MP4

## Assets

| Asset | Role | Status | Note |
| --- | --- | --- | --- |
| product-logo | Logo | missing | 等待官网截图 |
| source-excerpt | 新闻原文关键段落 | missing | 等待截图 |
| workflow-diagram | 解释型图表 | planned | 可由文案生成 |

## Render

```bash
npm run production:build-project -- projects/2026-07-17-ai-tool-workflow
npm run project:check -- projects/2026-07-17-ai-tool-workflow/project.json
npm run project:still -- projects/2026-07-17-ai-tool-workflow/project.json --frame 30
npm run project:render -- projects/2026-07-17-ai-tool-workflow/project.json --out out/2026-07-17-ai-tool-workflow.mp4
```
