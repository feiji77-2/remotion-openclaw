# Lambda 云端渲染

> Remotion Lambda 让视频渲染分发到 AWS Lambda 函数，无需自建渲染农场。

## 核心概念

| 概念 | 说明 |
|---|---|
| `npx remotion lambda render` | 在 Lambda 上渲染，输出到 S3 |
| `site` / `composition` | 部署到 Lambda 的 Remotion 项目 |
| `--browser-executable` | 指定 Lambda 函数内使用的 Chrome 路径 |
| `--frames-per-lambda` | 每个 Lambda 实例渲染多少帧（默认全部） |
| `--out` S3 URL | 渲染结果写入 S3，而非本地文件系统 |

## 部署步骤

### 1. 构建 Remotion Site

```bash
npx remotion studio src/Root.tsx --no-open
```

或直接部署：

```bash
npx remotion deploy <entry-file> <composition-id>
# 示例：
npx remotion deploy src/Root.tsx UltimateSceneTemplate
```

部署成功后返回 `site-name`（如 `my-video-123`），后续渲染用这个名称。

### 2. 渲染（Lambda）

```bash
npx remotion lambda render \
  <site-name> \
  UltimateSceneTemplate \
  --env-url "https://your-site.com" \
  --out s3://my-bucket/renders/ \
  --frames-per-lambda 30
```

### 3. 下载结果

```bash
# Lambda 写入 S3 后，用 aws cli 下载：
aws s3 cp s3://my-bucket/renders/<render-id>/ out/ --recursive
```

## 帧分段并行

帧分段越多并行度越高，但每个 Lambda 实例有冷启动开销：

```
总帧数 1200 帧 / 30帧每个Lambda = 40 个 Lambda 实例并行
```

| `--frames-per-lambda` | 适用场景 |
|---|---|
| `120`+ | 长视频（5min+），Lambda 充裕 |
| `30` | 短至中等（1–3min），平衡冷启动开销 |
| `10` | 极短或调试 |

## 本地 + Lambda 混合策略（推荐）

Chrome reuse 脚本在 Lambda 环境中仍然有效（每个 Lambda 实例会复用同一 Chrome）：

```bash
# 1. 先 warm-up Lambda（复用已就绪的 Chrome）
source scripts/chrome-reuse.sh
npx remotion lambda sites deploy src/Root.tsx

# 2. 渲染时明确指定 frames-per-lambda
npx remotion lambda render \
  "$(npx remotion lambda sites list | grep -i my-video | awk '{print $1}')" \
  UltimateSceneTemplate \
  --frames-per-lambda 30 \
  --out s3://my-bucket/renders/
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `CHROME_PATH` | Chrome 二进制路径（空字符串=复用已有） | 自动查找 |
| `CHROMIUM_FLAGS` | Chromium 附加参数 | `--no-sandbox --disable-dev-shm-usage` |
| `REMOTION_LAMBDA_REGION` | Lambda 部署区域 | `us-east-1` |
| `AWS_PROFILE` | AWS 凭证 profile | `default` |

## 成本估算

以 `1920×1080` 30fps 视频为例（仅供参考，实际 AWS 定价以官方为准）：

| 时长 | 总帧数 | Lambda 实例 | 估算 GB-秒 | 估算成本 |
|---|---|---|---|---|
| 30s | 900 | 30 × 1 | ~180 GB-s | ~$0.006 |
| 60s | 1800 | 30 × 3 | ~540 GB-s | ~$0.018 |
| 3min | 5400 | 30 × 9 | ~1620 GB-s | ~$0.055 |

> 实际成本取决于 Lambda 内存配置（默认 1GB）和并发数。

## Chrome Reuse 在 Lambda

Lambda 函数生命周期比长渲染任务短，Chrome reuse 主要价值在于**同一次渲染任务内**多个 Lambda 实例各自复用 Chrome 进程。

若需跨渲染任务复用，应考虑：
1. 保持 Lambda 函数"热"（使用预留并发）
2. 或将渲染拆分为多个短批次，中间不做完全销毁

## 常见错误

```
Error: No Chrome found at /var/task/node_modules/remotion/dist/chrome
→ 需在部署时指定正确 `--browser-executable`

Error: Cannot read S3 object
→ 检查 IAM 角色是否有 S3 读写权限（`s3:GetObject`, `s3:PutObject`）

Error: ETIMEDOUT
→ 增加 `--frames-per-lambda` 减少 Lambda 并发数，或增大 Lambda 超时
```

## 相关脚本

- `scripts/chrome-reuse.sh` — 检测并复用 Chrome 实例，减少冷启动
- `scripts/snapshots.mts` — 本地 visual regression 测试（Lambda 渲染前必跑）
