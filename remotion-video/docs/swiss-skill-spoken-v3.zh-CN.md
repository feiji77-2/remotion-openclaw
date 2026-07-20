# Swiss Skill Spoken V3

V3 将旧版 `workbuddy-six-skills-showcase-v3` 的语义节拍导演系统迁移到 16:9，同时保留当前设计 Skill 口播内容。

## 视觉取舍

- 保留：深色品牌基底、章节色、逐句语义动作、内容专属证据画面、稳定字幕区。
- 重做：所有布局均基于 1920×1080 横屏，不缩放或裁切 1080×1920 竖屏画布。
- 降低：持续霓虹、重复 HUD、装饰性英文与无意义漂移动效。
- 强化：Impeccable 扫描、Frontend Design 方向网格、UX Pro 数据库、Cloud Design 品牌 Token。
- 语义击打：`compare` 节点使用居中关键词与左右对照条，`stamp` 节点使用倾斜描边盖章卡；出现中心击打时隐藏右侧重复信息。

## 生成与渲染

```bash
npm run swiss:v3:build
npm run swiss:v3:render
```

输入项目为 `examples/swiss-skill-spoken-v2.json`，V3 项目生成到 `examples/swiss-skill-spoken-v3.json`，成片输出到 `out/swiss-skill-spoken-v3.mp4`。

V3 当前复用 V2 成片的 AAC 音轨，资产路径为 `public/projects/swiss-skill-spoken-v3/audio/voice.m4a`。源音轨只有静音采样；生成真实 AI 口播需要本机配置有效的 `OPENAI_API_KEY`，并按字幕逐句生成后重建 `audio/timings.json`。
