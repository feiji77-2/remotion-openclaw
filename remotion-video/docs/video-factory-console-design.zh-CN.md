# 本地视频生产控制台开发手册

## 启动

```bash
npm run tools:studio
```

地址：`http://127.0.0.1:8787/`

`tools:studio` 先构建 `src/tools/console/index.tsx`，再由 `scripts/tools-studio-server.mjs` 同源提供静态页面和 API。

## 当前模块

| 模块 | 职责 |
|---|---|
| `StudioApp.tsx` | 项目、文案、分镜、预览和渲染状态 |
| `NewProjectModal.tsx` | 创建竖屏 Skill Showcase 项目 |
| `PreviewCanvas.tsx` | 使用 `UltimateVideoV2` 预览同一 Project JSON |
| `tools-studio-server.mjs` | 文件 API、任务进程和产物访问 |
| `starter-project.mjs` | 控制台首次创建时的 Project 生成 |
| `build-project-from-production.mjs` | pack 再生成，内部复用同一脚本生成器 |

## API

| 方法 | 路径 | 作用 |
|---|---|---|
| `GET` | `/api/health` | 执行器健康状态 |
| `GET` | `/api/projects` | 列出样例和 `projects/` 项目 |
| `POST` | `/api/projects` | 创建四文件项目包和初始 Project JSON |
| `GET/POST` | `/api/files` | 读取或保存四类 JSON 文件 |
| `POST` | `/api/jobs` | 启动 build/check/still/render/verify |
| `GET` | `/api/jobs/:id` | 查询任务状态 |
| `GET` | `/api/artifact` | 读取 PNG、MP4 或 JSON 产物 |

控制台只接受竖屏。四种样式卡只改变当前 20 组件的配色和字幕表现，不代表额外 family 或 renderer。

`POST /api/projects` 创建项目时直接生成可校验的 Skill Showcase Project JSON。`build-project` 任务读取同一生产包再调用共享脚本生成器；预览、Still 和 MP4 都消费项目的同一个 `project.json`。

## 验证

```bash
npm run tools:build
npm run test:e2e
npm run test:visual-e2e
npm run test:ui
```

浏览器测试必须确认控制台实际产生非空的 `1080x1920` Still 和 MP4。任务状态为 `done` 只表示子进程成功，最终画面仍需直接检查。

操作速查见 [控制台与生成命令](<../../kb/04 控制台与生成命令.md>)，视觉判定见 [QA 与视觉验收](<../../kb/05 QA 与视觉验收.md>)。
