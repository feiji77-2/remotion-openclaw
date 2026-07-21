# 变更与发布 Playbook

## 修改边界

1. 先读 `.agentdesk/PM_STATE.md`、任务卡和合同。
2. 只在现有 `skill-showcase` family 内修改。
3. 新视觉能力必须扩展 11 个 Cinematic preset 或 9 个 Hero Track kind之一。
4. 不新增 Composition、scene family、旁路 Schema 或重复控制台。
5. 修改口播后重新生成 captions、scene ranges、Beat 和 Hero states，不能只替换音频或字幕。
6. `remotion-video/projects/**` 和 `.env*` 是受保护本地输入。

## 验证顺序

```bash
npm run typecheck
npm test
npm run project:check -- examples/skill-showcase.json
npm --prefix remotion-video run skill:gate
npm --prefix remotion-video run storyboard:render
git diff --check
```

根据改动范围增加 `tools:build`、API/visual/UI E2E、Still、MP4 和 `skill:verify`。完成后直接检查相关图片或视频，不以测试退出码代替视觉验收。

## 文档同步

架构、合同或命令变化时同时更新：

- 根目录 `README.md`、`README.en.md`、`ARCHITECTURE.md`、`CONTRIBUTING.md`。
- `docs/` 总入口、状态和视频制作流程关系图谱。
- `remotion-video/docs/` 中受影响的开发手册。
- `kb/` 中受影响的操作知识。
- `.agentdesk/CONTRACTS.md`、`DECISIONS.md`、`PM_STATE.md`、任务报告与测试日志。

## Gitee 发布

当前 `origin` 配置可能包含多个 push URL。为了只发布到 Gitee，禁止使用含糊的 `git push origin main`，应显式执行：

```bash
git fetch git@gitee.com:mango77/remotion.git main
git push git@gitee.com:mango77/remotion.git main
```

推送前确认远端没有未纳入的提交，检查 staged diff 不含密钥、真实环境文件或误删的 `projects/**`。推送后用 `git ls-remote` 核对 Gitee `main` 与本地 `HEAD` 一致。

返回：[知识库首页](<00 首页.md>)。
