# 内容生产包

控制台项目目录包含四个文件：

```text
projects/<id>/
  brief.json
  script-pack.json
  asset-pack.json
  project.json
```

- `brief.json`：标题、受众、竖屏规格和配色 preset。
- `script-pack.json`：口播稿和关键词。
- `asset-pack.json`：可选本地或 HTTPS 资产。
- `project.json`：可直接进入 Remotion 的唯一渲染输入。

控制台创建项目时立即调用 `buildStarterProject()` 生成 `project.json`。再次构建时，`project:from-pack` 读取前三个 pack，并调用同一个 `buildSkillShowcaseProjectFromScript()`；它不会进入另一套 family 或 renderer。

```bash
npm run project:from-pack -- projects/<id>
npm run project:check -- projects/<id>/project.json
npm run project:still -- projects/<id>/project.json --frame 60
npm run project:render -- projects/<id>/project.json --out out/<id>.mp4
```

## 重建规则

- 修改 `script-pack.json` 后必须重新运行 `project:from-pack`，不能只改 `project.json` 字幕。
- 新口播必须生成新的 source text、captions、scene ranges、Beat 和 Hero states。
- `brief.json` 的四种样式只控制同一 20 组件体系的配色与字幕风格。
- `asset-pack.json` 只能引用 `public/` 相对路径或 HTTPS 资产。
- 生成后先跑 `project:check`，再输出 Still 或 MP4，并直接检查真实画面。

完整操作见 [控制台与生成命令](<../../kb/04 控制台与生成命令.md>)。
