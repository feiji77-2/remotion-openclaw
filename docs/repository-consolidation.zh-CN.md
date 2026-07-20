# 仓库副本与文档整合决策

> 日期：2026-07-19
> 结论：`/Users/macos/OpenClaw/remotion-generated-video-project` 是唯一开发真源；`/Users/macos/remotion/remotion-video` 只作为只读历史参考，不再作为审查、修复或产品开发对象。

---

## 1. 为什么必须整合

当前机器上存在两个相似但不等价的 Remotion 工作树：

| 代号 | 路径 | 定位 | 处理方式 |
| --- | --- | --- | --- |
| A | `/Users/macos/remotion/remotion-video` | 旧副本，remote 指向 `gitee.com/mango77/remotion.git`，工作区有大量未归档改动 | 只读历史参考 |
| B | `/Users/macos/OpenClaw/remotion-generated-video-project` | 当前 v2.0 真源，remote 指向 `remotion-openclaw`，架构文档和 Project JSON 合同以此为准 | 唯一开发真源 |

两个副本继续并行会带来三个直接风险：

1. 代码审查会打到错误副本，修复清单失真。
2. 文档会混入旧 pipeline、旧 server、旧 schema，后续开发继续空转。
3. 安全和确定性问题会重复出现，因为每次复核都要先判断“这条到底在哪个仓库成立”。

因此从现在开始，所有命令、审查、修复、文档和产品化设计默认只面向 B。

---

## 2. 唯一真源规则

### 2.1 开发真源

```text
/Users/macos/OpenClaw/remotion-generated-video-project
```

开发、测试和文档更新必须在这个根目录执行。真正的 Remotion 内核位于：

```text
/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video
```

### 2.2 代码真源

| 主题 | 真源 |
| --- | --- |
| Project JSON schema | `remotion-video/src/project/projectSchema.ts` |
| 编译器 | `remotion-video/src/project/compileProject.ts` |
| 资产解析 | `remotion-video/src/project/assetResolver.ts` |
| family 注册和 payload schema | `remotion-video/src/project/sceneRegistry.tsx` |
| Remotion composition 注册 | `remotion-video/src/Root.tsx` |
| 渲染主入口 | `remotion-video/src/compositions/v2/UltimateVideoV2.tsx` |
| CLI | `remotion-video/scripts/project-*.mjs` |
| 本地控制台 | `remotion-video/src/tools/console` |

### 2.3 文档真源

| 层级 | 路径 | 作用 |
| --- | --- | --- |
| 总入口 | `docs/README.zh-CN.md` | 所有文档从这里进入 |
| 产品架构 | `docs/product-architecture.zh-CN.md` | Remotion 产品化总架构 |
| 仓库整合 | `docs/repository-consolidation.zh-CN.md` | A/B 副本和文档收敛规则 |
| 内核开发 | `remotion-video/docs/project-development.zh-CN.md` | Project JSON 到 Remotion 渲染的开发手册 |
| 代码约束 | `remotion-video/docs/development-code-constraints.zh-CN.md` | 改内核、改 family、改渲染时的硬边界 |
| 操作知识库 | `kb/00 首页.md` | 当前样片和操作型笔记入口 |

如果文档冲突，优先级固定为：

```text
源码真源 > docs/README.zh-CN.md > docs/product-architecture.zh-CN.md > remotion-video/docs/* > kb/*
```

---

## 3. A 副本怎么处理

A 不直接删除，因为它当前有大量未归档工作区改动，直接删除或覆盖会丢信息。正确处理方式是“只读迁移”：

1. 不再从 A 发起代码审查。
2. 不再把 A 的缺陷清单直接套到 B。
3. 只允许从 A 迁移仍然适用于 B 的文档、经验或测试用例。
4. 迁移前必须在 B 中复核文件是否存在、缺陷是否成立、架构是否仍匹配。
5. 迁移到 B 后，在迁移文档或 commit 说明中标注来源和取舍。

禁止操作：

- 不要把 A 整仓复制覆盖 B。
- 不要把 A 的 `server/`、旧 workflow、旧 schema 作为 B 的产品架构事实。
- 不要在 B 的修复清单中引用未经复核的 A 行号。
- 不要同时在 A 和 B 改同一个问题。

---

## 4. 文档整合原则

文档整合不是把所有 Markdown 拼成一个巨文档，而是建立清晰层级。

### 4.1 保留

| 类型 | 保留原因 |
| --- | --- |
| 产品架构 | 指导 Remotion 产品上线，不和当前内核混淆 |
| 内核开发手册 | 指导 Project JSON、compile、render、QA |
| 代码约束 | 约束确定性、资产、caption、family payload |
| 控制台设计 | 本地工具向产品原型演进的依据 |
| 样片方法文档 | 解释 skill-showcase 和口播 Beat 方法 |
| kb 操作笔记 | 保留快速查找、换稿、命令、产物位置 |

### 4.2 合并

| 重复主题 | 合并目标 |
| --- | --- |
| Project JSON 合同 | 以 `kb/02 Project JSON 合同.md` 和 `remotion-video/docs/project-development.zh-CN.md` 为准，其他文档只链接 |
| V2 渲染架构 | 以 `kb/03 V2 渲染架构.md` 为操作摘要，以 `docs/product-architecture.zh-CN.md` 为产品化解释 |
| 命令入口 | 以 `kb/10 命令与脚本入口.md` 为准 |
| QA | 以 `kb/06 QA 与调试.md` 和 `verify-project-render.mjs` 为准 |
| 控制台 | 以 `remotion-video/docs/video-factory-console-design.zh-CN.md` 为准 |

### 4.3 降级为历史参考

这些内容不作为当前架构依据：

- A 副本中的旧 `server/` 文档。
- A 副本中的旧 Step workflow 文档。
- A 副本中的旧 API reference。
- A 副本中的旧 template grammar 文档。
- 未在 B 的 `Root.tsx` 或 Project JSON 主链路里出现的历史 composition 文档。

---

## 5. Git remote 整合建议

B 当前存在多个 remote，容易继续制造“A/B 到底推哪里”的混乱。建议后续把 B 的 remote 收敛为：

```text
origin   git@github.com:feiji77-2/remotion-openclaw.git
upstream https://github.com/remotion-dev/remotion.git
```

`gitee.com/mango77/remotion.git` 只保留在 A，或在 B 中改名为 `legacy-gitee`。不要让 B 的 `origin` fetch 指向旧 Gitee、push 又指向 GitHub。

这一步会修改本地 Git 配置，不在文档整合中自动执行；执行前应先确认当前分支、remote 和推送策略。

---

## 6. 后续执行顺序

1. 以 B 为唯一工作区，修复 B 中已复核成立的 P0 问题。
2. 把 B 的文档入口统一到 `docs/README.zh-CN.md`。
3. 清理或降级过时文档引用，尤其是把旧后端、旧 workflow 从“当前事实”改成“历史参考”。
4. 如需迁移 A 中资料，只迁移通过 B 复核的内容。
5. 进入 Remotion 产品化开发：Web / API / Queue / Renderer Worker 全部在 B 的架构边界内新增。

---

## 7. 一句话

不要再维护 A/B 两套心智模型。B 是产品化真源；A 是历史矿区，只能采样，不能继续开工。
