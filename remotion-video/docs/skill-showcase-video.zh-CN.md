# Skill Showcase 黄金样片

项目真源：`examples/skill-showcase.json`

```text
projectId: workbuddy-six-skills-showcase
规格: 1080x1920 / 30fps
场景: 9
总帧数: 3649
字幕 / Beat: 57 / 57
音频: public/projects/skill-showcase/audio/voice.m4a
```

当前生成器默认把新口播路由到 9 个 Hero Track kind 之一；Cinematic 11 个 preset 用于需要更强转场和电影化动效的 Beat。两者是唯一的主视觉实现。

黄金样片的 9 个 scene 是这条口播的章节结构，不等于 Hero Track 的 9 个 kind。`variant` 也只是章节语义，不能作为另一套视觉链路。

## 验收

```bash
npm run project:check -- examples/skill-showcase.json
npm run skill:gate
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run storyboard:render
npm run skill:verify
```

需要直接检查：

- `out/workbuddy-six-skills-showcase-v3.mp4`
- `out/skill-showcase-still.png`
- `out/skill-showcase-v3-current-midpoints/contact-sheet.png`
- `out/remotion-storyboard-library/contact-all-20.png`

测试退出码不能替代画面验收。

20 组件用途与对应 ID 见 [11 Cinematic + 9 Hero Track](<../../kb/03 11 Cinematic + 9 Hero Track.md>)。
