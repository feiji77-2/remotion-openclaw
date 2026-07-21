# Remotion Skill Showcase 视频工厂

[English](README.en.md) | 简体中文

本仓库只保留一条视频生产链路：

```text
控制台 / project:from-script
  -> skill-showcase Project JSON
  -> VideoProjectSchema / compileProject
  -> UltimateVideoV2
  -> 11 Cinematic + 9 Hero Track
  -> Still / MP4 / QA / Verify
```

这里的 11 + 9 是同一 `skill-showcase` family 下的两个主视觉模式，不是 20 条链路。`payload.variant` 仅表示内容语义，黄金样片的 9 个 scene 仅表示该成片结构。

## 快速开始

```bash
npm run setup
npm run project:check -- examples/skill-showcase.json
npm run project:still -- examples/skill-showcase.json --frame 60 --out out/skill-showcase-still.png
npm run project:render -- examples/skill-showcase.json --out out/skill-showcase.mp4
```

从新口播生成 Project JSON：

```bash
npm run project:from-script -- \
  --id demo \
  --title "演示视频" \
  --script-file ./script.txt \
  --out projects/demo/project.json
```

启动本地生产控制台：

```bash
cd remotion-video
npm run tools:studio
```

打开 `http://127.0.0.1:8787/`。

## 当前合同

- 画幅固定为 `1080x1920 / 30fps`。
- Scene family 只允许 `skill-showcase`。
- `heroStyle` 只允许 `cinematic` 或 `hero-track-v2`。
- Remotion 只注册 `UltimateVideoV2` 和 `RemotionStoryboardLibrary`。
- 20 组件目录只以 `storyboardContract.json` 为准。
- 真实本地项目输入位于 `remotion-video/projects/`，不会被清理脚本删除。
- 自动化通过后仍必须直接检查真实 Still、接触表或 MP4。

文档入口见 [docs/README.zh-CN.md](docs/README.zh-CN.md)，操作知识见 [kb/00 首页.md](<kb/00 首页.md>)。
