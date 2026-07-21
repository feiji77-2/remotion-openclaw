# 当前状态

截至 2026-07-21，仓库只保留以下生产合同：

- 1 个 Scene family：`skill-showcase`。
- 2 个 renderer mode：`cinematic`、`hero-track-v2`。
- 11 个 Cinematic preset。
- 9 个 Hero Track kind。
- 2 个 Remotion Composition：`UltimateVideoV2`、`RemotionStoryboardLibrary`。
- 1 个竖屏规格：`1080x1920 / 30fps`。

控制台、`project:from-script` 和 production pack 编译都调用同一个 Skill Showcase 生成器。所有退役实现、旁路导入、重复控制台、历史样例、快照和缓存已删除。

## 文档与知识库状态

- 根目录、`docs/`、`remotion-video/docs/`、贡献模板和 `.agentdesk` 已按当前源码复核。
- `kb/` 已重建为 8 页当前操作知识，不恢复旧版本页面和 Obsidian 工作区状态。
- `docs/README.zh-CN.md` 是文档总入口，`kb/00 首页.md` 是知识库入口。
- `payload.variant` 只表示内容语义；当前不存在由它驱动的第三套渲染旁路。
- 视觉验收只认真实 Still、9 场景中点接触表、20 组件接触表和 MP4，不以脚本退出码代替。

## 唯一事实源

20 组件目录以 `remotion-video/src/components/ultimate-kit/families/skill-showcase/storyboardContract.json` 为准。Composition 注册以 `remotion-video/src/Root.tsx` 为准，CLI 以两个 `package.json` 为准。

## 发布状态

当前生产链路、全部文档和知识库已由集成提交 `9bf460c` 发布到 Gitee `mango77/remotion` 的 `main`。发布使用显式 Gitee URL，未通过多 push URL 的 `origin`，也未同步 GitHub。
