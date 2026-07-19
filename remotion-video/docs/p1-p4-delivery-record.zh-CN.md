# P1-P4 本地视频内容生产台 — 最终交付验收记录

> 日期：2026-07-19  
> 仓库：`codex-remotion-project` / `remotion-video`  
> 范围：P1 本地创建 → P2 动作条做实 → P3 链路一致性 → P4 合同单一真源

---

## 1. 闸门

```
npm test          → 53/53 passed (3 files, 31 new + 22 existing)
npm run test:e2e  → P4 E2E Smoke: ALL 11 CHECKS PASSED
npx tsc --noEmit  → 0 new TS errors (10 pre-existing in registry.ts)
npm run tools:build → built in ~4s (chunk size warning only, non-blocking)
```

## 2. 已完成能力

| 能力 | 入口 | 说明 |
|---|---|---|
| 新建视频项目 | UI 左侧「+ 新建视频」| 弹窗表单：projectId/title/画幅/风格/口播稿/关键词 |
| 生产合同创建 | POST /api/projects | 自动生成 brief/script-pack/asset-pack/project.json |
| 文案保存 | 状态条「保存文案」| dirty 指纹检测（全部 9 字段），保存后变「已保存」✓ |
| 生成 Project JSON | `npm run production:build-project` | 读取 brief.format/style/accent，保留 orientation/captionStyle |
| 生成关键帧 | `npm run project:still` | PNG 输出，UI 预览 |
| 渲染视频 | `npm run project:render` | MP4 输出，下载入口 |
| 智能动作条 | ProjectStatusStrip | 4 步状态机：保存→生成分镜→关键帧→渲染 |
| 错误解释 | Error banner + activity log | schema/asset/job 错误可读 |
| 端口自适应 | server 注入 `__VIDEO_FACTORY_PORT__` | tools:studio 同源 + Vite dev fallback |
| 统一风格合同 | `production-style-contract.mjs` | 4 种风格（swiss/minimal/cinematic/tech）单一真源 |

## 3. 新增文件

| 文件 | 职责 |
|---|---|
| `src/tools/console/NewProjectModal.tsx` | 新建项目弹窗 UI |
| `src/tools/console/ProjectStatusStrip.tsx` | 生产动作状态条（4 步智能按钮） |
| `src/types/global.d.ts` | `window.__VIDEO_FACTORY_PORT__` 类型声明 |
| `scripts/lib/starter-project.mjs` | 可测试 starter project JSON 生成 |
| `scripts/lib/production-style-contract.mjs` | 统一视觉风格合同（单真源） |
| `scripts/lib/__tests__/starter-project.test.mjs` | 31 项服务端回归测试 |
| `scripts/tools-studio-e2e-smoke.sh` | 11 项端到端集成测试 |
| `e2e/ui-studio-smoke.spec.ts` | Playwright 浏览器 UI E2E（代码就绪，待环境修复后运行） |
| `playwright.config.ts` | Playwright 配置 |

## 4. 修改文件

| 文件 | 改动要点 |
|---|---|
| `scripts/tools-studio-server.mjs` | +POST /api/projects, +HTML端口注入, import shared modules |
| `scripts/build-project-from-production.mjs` | render字段读取brief.format/style, accent从contract推导 |
| `src/tools/console/App.tsx` | createProject流程, draftDirty指纹, 错误banner |
| `src/tools/console/api.ts` | +createProject(), runnerBase端口自适应 |
| `src/tools/console/types.ts` | +CreateProjectDraft/Result/Error类型 |
| `src/tools/console/CenterPanel.tsx` | 接入ProjectStatusStrip, draftDirty |
| `src/tools/console/LeftPanel.tsx` | +「新建视频」按钮 |
| `remotion-video/tsconfig.json` | exclude playwright from tsc |
| `remotion-video/package.json` | test scope +test:e2e script |

## 5. 已知 Warning（非阻塞）

- `npm run tools:build` chunk size warning — Vite bundle 超 500KB，后续可拆 chunk
- `src/data/registry.ts` 10 个预存 TS 错误 — "red" 类型不匹配，与本次无关
- Playwright `npm install @playwright/test` 被预存 `@remotion/renderer` semver 冲突阻断，代码和配置已就绪，修复环境后 `npx playwright test` 即可运行

## 6. 产物路径

```
projects/<projectId>/
  brief.json          # 选题合同
  script-pack.json    # 口播稿
  asset-pack.json     # 素材计划
  project.json        # 视频渲染合同
public/projects/<projectId>/
  assets/             # 素材目录
  audio/              # 配音目录
out/
  <projectId>.mp4     # 渲染产物
  <projectId>-frame-30.png  # 关键帧
```

## 7. 手动验收步骤

```bash
npm run tools:studio
# 浏览器打开 http://127.0.0.1:8787
# 1. 点击左侧「+ 新建视频」
# 2. 填写 projectId/title/口播稿
# 3. 点击「创建项目」
# 4. 修改文案 → 状态条显示「保存文案」
# 5. 点击「保存文案」→ 变「已保存」✓
# 6. 点击「生成 Project JSON」→ 看日志
# 7. 点击「生成关键帧」→ 预览 PNG
# 8. 点击「渲染视频」→ 下载 MP4
```

## 8. 下一阶段边界（RC1 稳定化）

| 不做 | 要做 |
|---|---|
| 新功能 | UI 真机验收、日志体验、失败恢复、项目删除/复制、产物打开、视频 QA 报告 |
| 数据库/队列/多租户 | 继续本地文件系统 + 内存 job map |
| LLM/TTS 集成 | 继续确定性 generate，外部准备素材 |