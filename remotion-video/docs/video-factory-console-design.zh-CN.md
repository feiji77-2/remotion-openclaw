# 本地视频生产控制台开发手册

> 状态：当前产品开发唯一真源
> 范围：`src/tools/console/**`、`scripts/tools-studio-server.mjs`、控制台调用的 Project 生成与渲染命令
> 当前形态：本地单用户交互式生产台；不是落地页，也不是已经上线的多租户 SaaS

## 1. 产品定位

控制台的目标不是让用户学习 Remotion、Project JSON 或命令行，而是让非开发用户在一个可交互界面内完成视频生产闭环：

```text
新建视频
  -> 填写和保存口播
  -> 选择视觉风格
  -> 生成并检查分镜
  -> Player / Still 预览
  -> 渲染 MP4
  -> Verify
  -> 播放、下载和交付
```

用户只看见“文案、风格、分镜、预览、渲染、交付”六步。系统内部继续复用唯一生产链路：

```text
控制台生产包
  -> buildSkillShowcaseProjectFromScript()
  -> skill-showcase Project JSON
  -> VideoProjectSchema / compileProject
  -> UltimateVideoV2
  -> 11 Cinematic + 9 Hero Track
  -> Still / MP4 / QA / Verify
```

控制台是生产主链路的产品入口，不是渲染器之外的附属 Demo。

## 2. 产品边界

### 2.1 当前必须成立

- 本地单用户可以不写 JSON、不运行 CLI 完成一次生产闭环。
- 画幅固定为 `1080x1920 / 30fps / portrait`。
- 只生成 `skill-showcase` Scene，并路由到 `cinematic` 或 `hero-track-v2`。
- 控制台、`project:from-script` 和 `project:from-pack` 使用同一个生成器。
- Player、Still 和 MP4 消费同一个 `project.json`。
- 所有按钮都有真实的 disabled/running/done/failed 反馈。
- 失败必须能定位到步骤、文件、字段或命令，不能静默 fallback 后继续交付。
- 交付完成必须晚于 MP4 Verify，不能只以 render 进程退出码判定。

### 2.2 当前不做

- 登录、团队、多租户和权限系统。
- 数据库、正式任务队列、对象存储和云端 Renderer Worker。
- 模板市场、计费和运营后台。
- 在 Remotion Composition 内调用 LLM、TTS、搜索或文件系统。
- 为每个内容项目复制一套 Remotion 工程。

这些属于云端产品阶段，不能写成当前已经存在的能力。

## 3. 目标用户和核心任务

| 用户 | 核心任务 | 不应该接触 |
|---|---|---|
| 内容创作者 | 粘贴口播、选风格、看分镜、预览、出片、下载 | Schema、Composition、CLI、文件路径 |
| 视频导演/审核者 | 检查 Scene、字幕、节奏、20 组件画面和最终 MP4 | 任意 shell 命令 |
| 开发维护者 | 查看 Job 日志、Schema 错误、产物路径和回归证据 | 用户主流程中的工程噪声 |

第一屏必须回答五个问题：

1. 当前选中哪个项目？
2. 当前进行到哪一步？
3. 下一步唯一主操作是什么？
4. 是否存在 Schema、素材、渲染或 Verify 错误？
5. Still、MP4 和 QA 产物在哪里？

## 4. 信息架构

当前 `StudioShell` 是四区主界面加一个开发者抽屉：

```text
┌──────────────────────────────────────────────────────────────┐
│ 顶栏：产品名 | 当前项目 | Runner 在线状态                    │
├───────┬────────────────────────────┬─────────────────────────┤
│ 六步  │ 中央 PreviewCanvas         │ 当前步骤 Workspace      │
│ 导航  │ Remotion Player            │ 文案/风格/分镜/渲染     │
│ 65px  │                            │ 360px                   │
├───────┴────────────────────────────┴─────────────────────────┤
│ 底部 SceneTimeline：Scene 宽度、顺序和总时长                 │
└──────────────────────────────────────────────────────────────┘
│ DeveloperDrawer：Job、日志、Activity，只在需要时展开         │
```

| 区域 | 当前实现 | 产品职责 |
|---|---|---|
| 顶栏 | `StudioApp.tsx` | 项目切换、Runner 健康状态、新建项目入口 |
| 六步导航 | `ProductionStepper.tsx` | 文案、风格、分镜、预览、渲染、交付 |
| 中央画布 | `PreviewCanvas.tsx` | 使用 `UltimateVideoV2` 和当前 Project 的 Remotion Player |
| 右侧工作区 | `ScriptWorkspace`、`StyleCard`、`StoryboardWorkspace`、`RenderWorkspace` | 当前步骤的唯一操作面 |
| 底部时间线 | `SceneTimeline.tsx` | Scene 顺序、相对时长和总帧数 |
| 开发者抽屉 | `DeveloperDrawer.tsx` | Job 状态、命令日志和 Activity，不占用用户主界面 |

禁止重新引入第二套 Console App、营销首页、模板橱窗或与这套六步流程竞争的导航。

## 5. 六步用户流程与状态机

| 步骤 | 用户操作 | 当前实现 | 产品级完成条件 |
|---|---|---|---|
| 文案 | 编辑标题、主题、钩子、观点、口播和关键词 | 保存 `brief.json`、`script-pack.json` | 保存成功且草稿无未保存变化 |
| 风格 | 从四张样式卡选择配色方向 | 新建项目时写入生产包；已有项目页当前只更新 UI 选中态 | 风格持久化，触发 Project 重建，并能从重新打开的项目恢复 |
| 分镜 | 查看 Scene、模式、起止时间和 payload 摘要 | 当前为只读 Scene 列表 | 文案或风格变化后自动重建 Project，并通过 `project:check` |
| 预览 | 在 Player 播放，生成快速 Still 或 Scene 接触表 | Player 常驻；当前预览页只有提示，Still 按钮位于渲染页 | 有明确的快速预览动作，产物对应当前 Project 指纹 |
| 渲染 | 生成最终 MP4 | `project-render` Job，显示 `<video>` | MP4 完整落盘，Job done，但尚不能标记交付完成 |
| 交付 | Verify、播放和下载 | 当前 render 完成即把 deliver 标为 done | `project-verify` 通过后才允许下载并标记交付完成 |

### 5.1 产品级主按钮

用户不应该自己选择底层命令。每个状态只展示一个高优先级主按钮：

| 当前状态 | 主按钮 | 后台动作 |
|---|---|---|
| 没有项目 | 新建视频 | `POST /api/projects` |
| 草稿已修改 | 保存并更新分镜 | 保存两个 pack -> build -> check |
| Project 有效但没有当前预览 | 生成快速预览 | 低清/受影响 Scene Still 或接触表 |
| 预览已确认但没有当前 MP4 | 渲染成片 | render |
| MP4 未核验 | 核验成片 | verify |
| Verify 通过 | 下载视频 | `/api/artifact` |

六步导航用于理解和回看，不得允许用户绕过前置条件造成假完成。

### 5.2 状态失效规则

- 文案变化：分镜、预览、渲染、交付全部失效。
- 风格变化：分镜、预览、渲染、交付全部失效。
- Project 重建：预览、渲染、交付失效。
- 组件源码变化：所有预览和 MP4 失效，并要求组件回归。
- MP4 重新渲染：交付失效，直到 Verify 再次通过。

## 6. 新建项目流程

### 6.1 用户输入

`NewProjectModal` 当前接收：

```ts
interface CreateProjectDraft {
  projectId: string;
  title: string;
  orientation: 'portrait';
  style: 'cyan-tech' | 'amber-editorial' | 'red-minimal' | 'purple-launch';
  spokenScript: string;
  keywords: string;
}
```

约束：

- `projectId` 匹配 `^[A-Za-z0-9._-]{1,96}$`。
- 标题必填，最多 200 字符。
- 口播稿至少 20 字，最多 8000 字。
- 画幅固定竖屏。
- 重复项目 ID 返回 HTTP `409`，不能覆盖现有项目。

### 6.2 创建结果

```text
projects/<id>/
  brief.json
  script-pack.json
  asset-pack.json
  project.json

public/projects/<id>/
  assets/
  audio/

out/<id>.mp4
```

`POST /api/projects` 必须一次创建四文件生产包和可通过 Schema 的 starter Project，创建成功后刷新项目列表、选中新项目并载入 Player。

## 7. 数据合同

| 文件 | 用户含义 | 系统职责 |
|---|---|---|
| `brief.json` | 标题、受众、画幅、风格 | 决定生产约束和配色方向 |
| `script-pack.json` | 口播、钩子、观点、关键词 | 生成 captions、Scene 和语义 payload |
| `asset-pack.json` | 图片、音频等素材声明 | 只允许 `public/` 相对路径或 HTTPS |
| `project.json` | 当前视频的完整分镜 | 唯一 Remotion 渲染输入 |

控制台保存的是生产输入；`project.json` 必须由共享生成器重建。禁止用户修改口播后继续使用旧 Project，也禁止 Schema 失败后静默展示默认样片并继续渲染。

## 8. 本地 API 和任务合同

### 8.1 API

| 方法 | 路径 | 作用 |
|---|---|---|
| `GET` | `/api/health` | Runner 健康状态和当前 Job 数 |
| `GET` | `/api/projects` | 列出黄金样例和 `projects/` 中的本地项目 |
| `POST` | `/api/projects` | 创建四文件生产包和 starter Project |
| `GET` | `/api/files` | 读取允许的 JSON 合同文件 |
| `POST` | `/api/files` | 保存允许的 JSON 合同文件 |
| `POST` | `/api/jobs` | 启动白名单 Job |
| `GET` | `/api/jobs/:id` | 查询状态、日志、exit code 和产物 |
| `GET` | `/api/artifact` | 读取 JSON、PNG、MP4；音视频支持 MIME 和 Range |

所有文件路径必须经过安全相对路径校验。浏览器不能提交任意 shell 命令，只能发送白名单 `commandId`。

### 8.2 Job 映射

| `commandId` | 当前命令 | 产物 |
|---|---|---|
| `build-project` | `npm run project:from-pack -- <productionPath>` | `project.json` |
| `project-check` | `npm run project:check -- <projectJsonPath>` | 诊断结果 |
| `project-still` | `npm run project:still -- <projectJsonPath> --frame 30` | PNG |
| `project-render` | `npm run project:render -- <projectJsonPath>` | MP4 |
| `project-verify` | `verify-project-render.mjs --props ... --video ...` | 媒体核验结果 |

Job 状态只能是 `running`、`done`、`failed`。进程成功和视觉通过是两件事：Still、接触表和 MP4 仍然需要直接查看。

## 9. 错误、恢复与反馈

| 错误 | 用户必须看到 | 恢复动作 |
|---|---|---|
| Runner 离线 | “本地执行器未启动”及启动命令 | 重连健康检查，不丢草稿 |
| 项目 ID 非法/重复 | 字段级错误或 409 原因 | 修改 ID，不创建半成品目录 |
| JSON Schema 失败 | 文件名、字段 path、message | 返回文案/生产包修正，不静默交付默认项目 |
| 资产缺失 | asset ID、src、required | 上传/修正资产后重新 check |
| Build 失败 | Job、命令、日志末尾和 exit code | 修正输入后重试 build |
| Still/Render 失败 | 失败步骤、完整日志入口、预期产物 | 保留上次有效产物但标记过期 |
| Verify 失败 | 编码、尺寸、帧数、时长或解码原因 | 重新渲染，禁止交付 |

当前实现已经有 Activity、Job 日志和通用错误提示；产品级目标是把 Schema diagnostics、失败步骤和下一步恢复动作直接显示在当前 Workspace。

## 10. 加速与增量执行

控制台不能每次都运行全部工程门禁。根据变化范围选择最小充分检查：

| 变化 | 自动执行 | 跳过 |
|---|---|---|
| 口播、字幕、关键词 | 保存 -> build -> check -> Scene 预览 -> render -> verify | 20 组件回归、全量 UI E2E |
| 图片、音频 | 资产检查 -> 受影响 Scene 预览 -> render -> verify | 20 组件回归 |
| Cinematic/Hero 组件代码 | typecheck、测试、受影响组件 Still、20 组件回归 | 文档发布流程 |
| 控制台代码 | tools build、API E2E、UI E2E | 不相关完整视频 |
| 纯文档 | 链接检查、Gitee、Obsidian 同步 | Remotion 渲染 |

产品实现应使用四类指纹：

- `contentHash`：brief、script、captions。
- `assetHash`：实际引用资产。
- `projectHash`：标准化 Project JSON。
- `rendererHash`：当前渲染源码和 20 组件合同。

指纹未变化时复用 Bundle、Still、接触表和 MP4；只重渲染受影响 Scene。开发模式保持 Remotion Bundle/Player 常驻，先输出低清预览，用户确认后再执行 `1080x1920` 最终渲染。

## 11. 当前实现与产品级差距

### P0：闭环真实性

- 增加可见的“保存并更新分镜”主按钮，串联 save -> build -> check。
- 已有项目的风格选择必须写入生产包并触发重建，不能只改变 UI 选中态。
- 预览步骤必须提供真实的快速 Still/Scene 接触表，不只显示提示文字。
- `project-verify` 必须进入用户流程；render 完成不能直接把 deliver 标成 done。
- Schema diagnostics 必须显示字段 path 和 message，不能只显示“校验失败”。
- 步骤状态必须从产物指纹恢复，刷新页面后不能全部丢失或假完成。

### P1：产品效率

- 分镜页加入每个 Scene 的真实缩略图、选择和局部重渲染。
- 加入 Job 取消、重试、超时、恢复和并发保护。
- 加入资产/音频上传、引用检查和替换入口。
- 加入 Project、Still、MP4 的版本与过期标识。
- 在交付页同时展示 Verify 结果、产物规格和下载入口。
- 把 20 组件图库作为选择/审核辅助，不让用户编辑底层 preset 字段。

### P2：云端产品化

- 正式 Web App、鉴权、项目数据库。
- 持久任务队列、Renderer Worker、失败重试和进度事件。
- 对象存储、CDN、下载授权和生命周期管理。
- 团队协作、评论、审片版本、审计与成本监控。

P2 必须建立在本地六步闭环稳定之后，不能把云端概念提前塞进当前本地 Runner。

## 12. 验收标准

### 12.1 产品功能

1. 打开控制台后直接进入生产界面，不出现营销首页。
2. 顶栏显示当前项目和 Runner 在线状态。
3. 合法输入可创建项目，四个合同文件全部落盘。
4. 非法字段有就地提示，重复 ID 被 409 拒绝。
5. 新项目创建后自动进入项目列表并被选中。
6. 六步导航切换到对应 Workspace。
7. 保存文案后生产输入真实落盘。
8. 保存并更新分镜后，Project 已重建且通过 check。
9. 分镜 Scene 数、顺序和时长与 Project 一致。
10. Player 使用当前 Project，而不是默认样片。
11. 生成关键帧后 UI 显示真实非空 PNG。
12. 渲染后 UI 播放真实 MP4。
13. Verify 通过后才显示交付完成和下载入口。
14. Job 失败时 UI 显示可读日志和恢复动作。
15. 底部时间线与当前 Scene 数据一致。
16. 开发者日志默认不干扰用户主流程。

### 12.2 工程门禁

在 `remotion-video/` 运行：

```bash
npm run typecheck
npm test
npm run tools:build
npm run test:e2e
npm run test:visual-e2e
npm run test:ui
```

涉及渲染内核时再增加：

```bash
npm run project:check -- examples/skill-showcase.json
npm run skill:gate
npm run storyboard:render
npm run skill:verify
```

浏览器 E2E 必须生成真实 Still 和 MP4。自动化退出码不能替代直接查看 Player、Still、Scene 接触表、20 组件接触表和最终视频。

## 13. 启动和环境

```bash
cd remotion-video
npm run tools:studio
```

默认地址：`http://127.0.0.1:8787/`。

端口冲突时：

```bash
VIDEO_FACTORY_PORT=8788 npm run tools:studio
```

`tools:studio` 先构建 `src/tools/console/index.tsx`，再由 `scripts/tools-studio-server.mjs` 同源提供页面、API、静态资产和产物。音频与视频必须支持正确 MIME 和 HTTP Range，保证 Player 可以拖动和续播。

## 14. 文件所有权

| 文件 | 职责 |
|---|---|
| `StudioApp.tsx` | 项目选择、六步状态、草稿、Job、产物和 Activity 总编排 |
| `StudioShell.tsx` | 顶栏、步骤栏、Player、Workspace、Timeline 和 Drawer 布局 |
| `ProductionStepper.tsx` | 六步定义和状态显示 |
| `NewProjectModal.tsx` | 新建项目输入与字段校验 |
| `ScriptWorkspace.tsx` | 文案编辑与保存 |
| `StyleCard.tsx` | 四种 renderer-neutral 配色选择 |
| `StoryboardWorkspace.tsx` | Scene 模式、时间和 payload 摘要 |
| `PreviewCanvas.tsx` | 当前 Project 的 Remotion Player |
| `RenderWorkspace.tsx` | Still、MP4、播放和下载 |
| `DeveloperDrawer.tsx` | Job 日志和 Activity |
| `SceneTimeline.tsx` | 底部 Scene 时间线 |
| `api.ts` / `types.ts` | 浏览器 API、数据和诊断合同 |
| `tools-studio-server.mjs` | 本地文件、Job、静态和产物服务 |
| `starter-project.mjs` | 新建项目的 starter Project |
| `build-project-from-production.mjs` | 从生产包调用共享生成器 |

## 15. 文档与清理规则

本手册是控制台产品目标、交互、状态、API、验收和演进边界的唯一真源。后续旧执行方案中的有效内容只能合并到这里，不再并行维护另一份产品计划。

判断文件是否属于生产主链路时，必须同时检查：

```text
用户入口
  + 控制台交互
  + 本地 API / Job
  + Project 生成
  + Remotion 渲染
  + QA / Verify
  + 产品合同和 E2E
```

不能再用“是否被 `Root.tsx` import”或“是否直接参与 MP4 渲染”作为删除产品文件和开发文档的唯一标准。

操作速查见 [控制台与生成命令](<../../kb/04 控制台与生成命令.md>)，视觉判定见 [QA 与视觉验收](<../../kb/05 QA 与视觉验收.md>)。
