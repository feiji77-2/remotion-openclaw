# P1-1 本地内容生产台执行方案

> 日期：2026-07-19
> 阶段：P1 本地 MVP 原型
> 目标：把当前 `tools:studio` 从“开发者命令控制台”推进到“别人也能用的本地内容生产台”。

---

## 0. 一句话

第一步先做**本地项目创建与生产闭环**：

```text
新建视频项目
  -> 填文案和基础配置
  -> 保存 brief/script-pack
  -> 生成 project.json
  -> Remotion Player 预览
  -> still 真渲染
  -> MP4 render
  -> 下载产物
```

这一步只做本地单用户版本，不做登录、数据库、云队列、云存储和正式 Renderer Worker。

---

## 1. 开发边界

### 1.1 本轮要做

| 能力 | 说明 |
| --- | --- |
| 新建项目 | 在 Web 控制台里创建 `projects/<projectId>/` |
| 项目列表刷新 | 新项目创建后立即出现在左侧项目列表 |
| 文案表单 | 让用户填写标题、口播稿、关键词、风格、画幅 |
| 生产合同保存 | 写入 `brief.json`、`script-pack.json` |
| Project JSON 生成 | 调用现有 `production:build-project` |
| Project JSON 校验 | 调用现有 `project:check` |
| 浏览器预览 | 使用当前 `@remotion/player` + `compileProject()` |
| still 输出 | 调用现有 `project:still`，展示 PNG |
| MP4 输出 | 调用现有 `project:render`，展示下载入口 |
| 错误解释 | command/job/schema 错误必须显示在 UI 中 |

### 1.2 本轮不做

| 不做项 | 原因 |
| --- | --- |
| 正式登录和多租户 | P2 才需要 |
| 数据库 | P1 继续使用本地文件系统 |
| 云端队列 | P1 继续使用本地 in-memory job map |
| LLM 自动拆 scene | 第一版先复用 `production:build-project` 的确定性生成 |
| TTS 云服务接入 | 第一版先允许无音频或使用已有音频资产 |
| 复杂模板市场 | 先用已有 family 和正在新增的 `swiss-*` |
| 复制 Remotion 工程 | 每条内容只创建 Project，不创建独立代码环境 |

---

## 2. 目标目录结构

新建一个内容项目后，目录应长这样：

```text
remotion-video/
  projects/
    <projectId>/
      brief.json
      script-pack.json
      asset-pack.json
      project.json
  public/
    projects/
      <projectId>/
        assets/
        audio/
  out/
    <projectId>-frame-30.png
    <projectId>.mp4
```

说明：

- `projects/<projectId>/` 是生产合同工作区。
- `public/projects/<projectId>/` 是 Remotion 可访问的素材目录。
- `out/` 是 still、MP4、QA 产物目录。
- 代码、family、schema 都继续使用同一个 `remotion-video` 内核。

---

## 3. 用户流程

### 3.1 第一屏

用户打开 `tools:studio` 后，应直接看到：

```text
左侧：项目列表 + 新建项目按钮
中间：当前项目生产表单 / 场景预览 / Player
右侧：质量闸门 + 命令队列 + 日志
底部：Timeline
```

不要让用户先理解 `project.json`、CLI 或 Remotion composition。

### 3.2 最小路径

```text
点击“新建视频”
  -> 输入标题、projectId、画幅、风格
  -> 粘贴口播稿
  -> 保存
  -> 点击“生成 Project JSON”
  -> 自动跑 project:check
  -> Player 预览
  -> 点击“生成关键帧”
  -> 看 still
  -> 点击“渲染 MP4”
  -> 下载
```

任何一步失败，都必须留下可读错误：

```text
哪一步失败
哪个文件失败
错误路径
下一步应该怎么处理
```

---

## 4. 数据合同

### 4.1 新建项目输入

新增前端类型：

```ts
export interface CreateProjectDraft {
  projectId: string;
  title: string;
  orientation: 'portrait' | 'landscape';
  style: 'swiss' | 'minimal' | 'cinematic' | 'tech';
  spokenScript: string;
  keywords: string;
}
```

约束：

- `projectId` 只能匹配 `^[A-Za-z0-9._-]{1,96}$`。
- `title` 必填。
- `spokenScript` 第一版至少 20 字。
- `orientation` 默认 `portrait`。
- `style` 默认 `swiss`，如果 `swiss-*` 未完成则 fallback 到 `skill-showcase` 或现有 spoken family。

### 4.2 本地 server 创建项目响应

```ts
export interface CreateProjectResult {
  ok: true;
  project: ProjectOption;
  files: {
    brief: string;
    scriptPack: string;
    assetPack: string;
    projectJson: string;
  };
}
```

失败：

```ts
export interface CreateProjectError {
  ok: false;
  error: string;
  path?: string;
}
```

---

## 5. 后端执行方案

当前本地 server 是：

```text
remotion-video/scripts/tools-studio-server.mjs
```

本轮只扩展它，不新增正式 `apps/api`。

### 5.1 新增 endpoint

新增：

```text
POST /api/projects
```

请求体：

```json
{
  "projectId": "my-first-video",
  "title": "我的第一条视频",
  "orientation": "portrait",
  "style": "swiss",
  "spokenScript": "这里是口播稿……",
  "keywords": "AI, Remotion, 产品化"
}
```

行为：

1. 校验 `projectId`。
2. 确认 `projects/<projectId>` 不存在。
3. 创建 `projects/<projectId>/`。
4. 创建 `public/projects/<projectId>/assets`。
5. 创建 `public/projects/<projectId>/audio`。
6. 写入 `brief.json`。
7. 写入 `script-pack.json`。
8. 写入空的 `asset-pack.json`。
9. 写入一个可通过 `VideoProjectSchema` 的 starter `project.json`。
10. 返回 `ProjectOption`。

不要在这个 endpoint 里跑长任务；长任务仍然走 `/api/jobs`。

### 5.2 Starter Project JSON

starter `project.json` 必须能过：

```bash
npm run project:check -- projects/<projectId>/project.json
```

第一版可以生成 2-3 个短 scene：

- `spoken-title`
- `spoken-tags`
- `spoken-takeaway`

如果 `swiss-*` 已经注册完成，则 starter 可用：

- `swiss-title`
- `swiss-points`
- `swiss-outro`

### 5.3 命令映射

继续复用当前 `/api/jobs`：

| commandId | 命令 | 用途 |
| --- | --- | --- |
| `build-project` | `npm run production:build-project -- <productionPath>` | 从生产合同生成 Project JSON |
| `project-check` | `npm run project:check -- <projectJsonPath>` | 校验 Project JSON |
| `project-still` | `npm run project:still -- <projectJsonPath> --frame 30 --out out/<id>-frame-30.png` | 输出 still |
| `project-render` | `npm run project:render -- <projectJsonPath> --out out/<id>.mp4` | 输出 MP4 |
| `project-verify` | `node scripts/verify-project-render.mjs --props <projectJsonPath> --video out/<id>.mp4` | 验收 MP4 |

---

## 6. 前端执行方案

当前前端目录：

```text
remotion-video/src/tools/console/
```

### 6.1 建议新增文件

```text
src/tools/console/
  NewProjectModal.tsx
  ProjectCreateForm.tsx
  ProjectStatusStrip.tsx
```

也可以先只做 `NewProjectModal.tsx`，避免一次拆太碎。

### 6.2 修改文件

| 文件 | 修改 |
| --- | --- |
| `types.ts` | 新增 `CreateProjectDraft`、`CreateProjectResult` |
| `api.ts` | 新增 `createProject()` |
| `App.tsx` | 接入新建项目 modal、创建成功后刷新列表并选中 |
| `LeftPanel.tsx` | 增加“新建视频”按钮 |
| `CenterPanel.tsx` | 在无项目或新项目时展示生产表单 |
| `RightPanel.tsx` | 将 command 状态和错误解释显著展示 |

### 6.3 前端状态流

```text
NewProjectModal submit
  -> api.createProject(draft)
  -> loadProjects()
  -> selectProject(createdProject)
  -> refreshContracts(createdProject)
  -> pushActivity("项目已创建")
```

### 6.4 UI 必须显示的状态

| 状态 | 用户文案 |
| --- | --- |
| runner offline | 本地执行器未启动，请运行 `npm run tools:studio` |
| create failed | 项目创建失败，显示 server error |
| schema invalid | Project JSON 校验失败，显示 path + message |
| build running | 正在生成 Project JSON |
| still ready | 关键帧已生成，可预览 |
| render ready | 视频已生成，可下载 |

---

## 7. 验收标准

### 7.1 功能验收

| # | 验收 |
| --- | --- |
| 1 | 打开 `tools:studio` 后能看到“新建视频”入口 |
| 2 | 输入合法 projectId/title/script 后能创建 `projects/<id>` |
| 3 | 创建后项目自动出现在左侧列表 |
| 4 | 创建后自动选中新项目并载入合同 |
| 5 | `brief.json`、`script-pack.json`、`asset-pack.json`、`project.json` 都存在 |
| 6 | starter `project.json` 能通过 `project:check` |
| 7 | 点击“生成 Project JSON”能启动 job 并展示日志 |
| 8 | 点击“生成关键帧”能输出 PNG 并在 UI 显示 |
| 9 | 点击“渲染视频”能输出 MP4 并显示下载入口 |
| 10 | 任意失败状态不会静默 fallback，Activity Log 有可读错误 |

### 7.2 命令验收

必须跑：

```bash
cd remotion-video
npm run typecheck
npm test
npm run tools:build
npm run project:check -- examples/project.json
npm run project:still -- examples/project.json --frame 0 --out out/p1-baseline-still.png
```

创建一个新项目后，额外跑：

```bash
npm run project:check -- projects/<projectId>/project.json
npm run project:still -- projects/<projectId>/project.json --frame 30 --out out/<projectId>-frame-30.png
```

注意：`npm run project:still` 不带参数只是 usage/no-op，不能算 still smoke。

---

## 8. 推荐实现顺序

### Step 1：后端创建项目

改 `scripts/tools-studio-server.mjs`：

1. 加 `POST /api/projects` 分支。
2. 复用 `safeProjectId()` 和 `safeRelPath()`。
3. 写 `brief.json`、`script-pack.json`、`asset-pack.json`、`project.json`。
4. 返回 `ProjectOption`。

验收：

```bash
curl -X POST http://127.0.0.1:8787/api/projects \
  -H 'content-type: application/json' \
  -d '{"projectId":"p1-smoke","title":"P1 Smoke","orientation":"portrait","style":"swiss","spokenScript":"这是一条用于验证本地内容生产台的新视频口播稿。","keywords":"P1,Remotion,Smoke"}'
```

### Step 2：前端 API

改 `src/tools/console/api.ts`：

```ts
export async function createProject(draft: CreateProjectDraft): Promise<CreateProjectResult> {
  // POST /api/projects
}
```

失败必须 throw 或返回明确错误，不允许静默吞。

### Step 3：新建项目 UI

新增 `NewProjectModal.tsx`：

- projectId
- title
- orientation
- style
- spokenScript
- keywords
- 创建按钮

创建成功后：

- 关闭 modal
- 刷新项目列表
- 选中新项目
- Activity Log 显示成功

### Step 4：生产动作串联

在 UI 中给新项目露出四个明确动作：

```text
保存文案
生成 Project JSON
生成关键帧
渲染视频
```

不要隐藏命令日志；第一版产品最需要可解释。

### Step 5：体验收口

把“下一步”做成单一主按钮：

| 当前状态 | 主按钮 |
| --- | --- |
| 未保存文案 | 保存文案 |
| 已保存文案但 project.json 未生成 | 生成 Project JSON |
| project.json 有效但无 still | 生成关键帧 |
| still 已生成但无 MP4 | 渲染视频 |
| MP4 已生成 | 下载视频 |

---

## 9. 不要踩的坑

- 不要新建第二套 React App。
- 不要把正式 SaaS API 写进 `tools-studio-server.mjs`。
- 不要在 Remotion Composition 里调用 LLM、TTS、fetch 或文件系统。
- 不要每条内容复制一份 `remotion-video` 工程。
- 不要让坏 `project.json` 静默变成默认项目。
- 不要用 `project:still` 的 usage 输出当成渲染通过。
- 不要把 `swiss-*` family 注册和内容项目创建混成一个任务；family 是共享能力，project 是内容实例。

---

## 10. 完成后的状态

这一步完成后，项目会从：

```text
开发者写 JSON + 跑 CLI
```

变成：

```text
用户新建视频 + 填文案 + 点按钮 + 看预览 + 导出
```

它仍然是本地单用户工具，但已经具备产品形态。下一步再考虑正式 API、数据库、队列和 Renderer Worker。
