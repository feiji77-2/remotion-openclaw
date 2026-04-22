# XTTS 本地真人语音克隆接入

这份文档对应当前项目里已经接好的 `xtts` 工作流支持。

目标：

- 本地启动 `XTTS-v2 HTTP` 服务
- 给工作流提供真人参考音频
- 直接通过 `workflow:ultimate` 生成带真人克隆旁白的视频

## 这次已经接好的内容

- `workflow:ultimate` 支持 `--voice-engine xtts`
- 支持 `--reference <路径或 URL>`
- 支持 `--voice-language <语言代码>`
- 支持 `--speaker <音色别名>`
- `workflow:ultimate` 在发现 `XTTS` 未启动时会自动拉起本地服务
- 如果存在 `runtime/voices/xtts/anchor.wav`，`workflow:ultimate` 最简命令会默认走 `xtts + anchor`
- 服务能力会出现在 `/health` 的 `capabilities.voice.engines.xtts`

相关文件：

- [`server/voice/voiceJob.js`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/voice/voiceJob.js)
- [`scripts/run-search-to-ultimate.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/run-search-to-ultimate.mjs)
- [`scripts/voice/xtts_http_server.py`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/voice/xtts_http_server.py)
- [`scripts/voice/start-xtts-server.sh`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/voice/start-xtts-server.sh)

## 你的机器建议

你这台机器目前更适合这样跑：

- 设备：默认直接 `cpu`
- 黑苹果 / Intel macOS / RX5500：优先 `cpu`
- `mps`：只建议当实验选项手动开启
- Python：单独用 `3.11`
- NumPy：固定 `numpy<2`
- Transformers：固定 `>=4.33,<5`

不要把 XTTS 装进系统 Python 里，单独虚拟环境更稳。

## 参考音频放哪里

推荐目录：

- `remotion-video/runtime/voices/xtts/`

推荐命名：

- `anchor.wav`
- `host-a.wav`
- `female-tech.wav`

要求建议：

- 单声道或普通立体声都可以
- 时长先用 `6-20 秒`
- 说话清晰
- 背景音乐尽量没有
- 不要混响太重

## 启动 XTTS 服务

在项目根目录执行：

```bash
brew install cmake ninja llvm@20
chmod +x scripts/voice/start-xtts-server.sh
./scripts/voice/start-xtts-server.sh
```

如果你是直接跑这条主工作流：

```bash
npm run workflow:ultimate -- "你的标题" \
  --voice-engine xtts \
  --speaker anchor \
  --reference runtime/voices/xtts/anchor.wav \
  --voice-language zh-cn
```

现在即使你没提前手动启动 `XTTS`，脚本也会先自动拉起服务，再继续配音。

如果你已经把默认样本放在：

- `runtime/voices/xtts/anchor.wav`

那么以后最简命令可以直接变成：

```bash
npm run workflow:ultimate -- "你的标题"
```

这时工作流会默认命中：

- `voice-engine = xtts`
- `speaker = anchor`
- `reference = runtime/voices/xtts/anchor.wav`
- `voice-language = zh-cn`

这个脚本会做这些事：

- 检查 `uv`
- 检查 `cmake / ninja / llvm@20`
- 自动准备 `Python 3.11`
- 创建 `.venvs/xtts`
- 自动修复 `TTS + numpy<2 + transformers<5`
- 启动本地 XTTS HTTP 服务

说明：

- 在 macOS 上如果你没显式传 `XTTS_DEVICE`，脚本默认会走 `cpu`
- 这是为了避免 `health` 正常但真实合成时被 `MPS` 的 `FFT / ComplexFloat` 算子问题打断
- 如果你想手动试 `MPS`，可以自己指定 `XTTS_DEVICE=mps`

## 首次启动前必须确认的授权

XTTS-v2 首次下载模型时会要求确认 Coqui 条款。

当前项目不会默认替你接受。

如果你已经确认接受对应条款，再这样启动：

```bash
XTTS_ACCEPT_CPML=1 ./scripts/voice/start-xtts-server.sh
```

这会把 `COQUI_TOS_AGREED=1` 传给 Coqui 下载器，避免后台启动时因为没有交互输入而报错。

默认地址：

- `http://127.0.0.1:18083/health`
- `http://127.0.0.1:18083/synthesize`

## 如何确认服务启动成功

浏览器或命令行访问：

```bash
curl http://127.0.0.1:18083/health
```

正常会返回类似：

```json
{
  "status": "ok",
  "engine": "xtts",
  "model": "tts_models/multilingual/multi-dataset/xtts_v2",
  "device": "mps"
}
```

在你这类黑苹果机器上，正常更常见的是：

```json
{
  "status": "ok",
  "engine": "xtts",
  "model": "tts_models/multilingual/multi-dataset/xtts_v2",
  "device": "cpu"
}
```

## 两种使用方式

### 方式 1：直接指定参考音频

最适合先验证效果。

```bash
npm run workflow:ultimate -- "国产 AI 开源王炸" \
  --voice-engine xtts \
  --reference runtime/voices/xtts/anchor.wav \
  --speaker anchor \
  --voice-language zh-cn \
  --no-resume \
  --output out/xtts-demo.mp4
```

说明：

- `--reference` 是参考音频
- `--speaker` 是给这次音色起的别名
- `--voice-language` 建议中文用 `zh-cn`

### 方式 2：只传别名

前提是目录里已经有：

- `runtime/voices/xtts/anchor.wav`

然后可以直接：

```bash
npm run workflow:ultimate -- "今日 AI 资讯" \
  --voice-engine xtts \
  --speaker anchor \
  --voice-language zh-cn \
  --output out/xtts-anchor.mp4
```

服务会自动去 `runtime/voices/xtts/` 下找同名音频。

## 支持哪些参数

当前工作流里和 XTTS 相关的主要参数：

- `--voice-engine xtts`
- `--reference <路径或 URL>`
- `--speaker <别名>`
- `--voice-language <code>`
- `--voice-speed <number>`

当前实现说明：

- `speed` 会在 XTTS 合成后用 `ffmpeg atempo` 做轻量速度调整
- `reference` 支持本地路径、`/assets/...` 路径、远程 URL
- 如果没给 `reference`，会尝试按 `speaker` 去 `runtime/voices/xtts/` 匹配同名文件

## 常用语言代码

- 中文：`zh-cn`
- 英文：`en`
- 日语：`ja`
- 韩语：`ko`
- 葡语：`pt`

## 失败时先查这几个点

- `curl http://127.0.0.1:18083/health` 是否返回 `status=ok`
- `runtime/voices/xtts/anchor.wav` 是否真的存在
- 参考音频是不是太短、太吵、太糊
- 当前 Python 环境是不是误用了系统 Python 3.9
- 是否出现 `numpy 2.x` 兼容问题
- Intel macOS / 黑苹果 是否还没装 `llvm@20`
- 如果是黑苹果 / RX5500，不要把 `mps` 当默认稳定方案

## 当前限制

- XTTS 首次加载模型会比较慢
- 参考音频质量差时，克隆效果会明显变差
- 这是本地单机方案，不是高并发部署方案
- 还没有做“多个主播音色配置中心”，当前先按文件别名管理

## 推荐你的实际使用方式

先固定一个真人主播样本，比如：

- `runtime/voices/xtts/anchor.wav`

之后每天出片直接用：

```bash
npm run workflow:ultimate -- "你的标题" \
  --voice-engine xtts \
  --speaker anchor \
  --voice-language zh-cn
```

这样最稳定，也最适合你现在这套“搜索 -> 文案 -> 配音 -> 视频”的日更链路。
