# 阿里云百炼 Qwen TTS 接入说明

这份文档对应当前项目里已经接好的 `qwen-tts` 语音链路。

官方文档：

- [Qwen TTS API](https://help.aliyun.com/zh/model-studio/qwen-tts-api)
- [Qwen TTS 音色复刻](https://help.aliyun.com/zh/model-studio/qwen-tts-voice-replica)

## 已接入内容

- `workflow:ultimate` 支持 `--voice-engine qwen-tts`
- 支持通过参考音频自动创建 / 复用阿里云百炼克隆音色
- 支持直接生成 wav，并落地到当前项目的 `public/assets/voice/...`
- 支持本地管理命令：创建 / 复用 / 列表 / 删除 / 单条预览
- 本地缓存克隆音色映射：`runtime/voices/qwen/voice-registry.json`

## 1. 环境变量

先在 `remotion-video/.env` 里补上：

```bash
DASHSCOPE_API_KEY=你的阿里云百炼 API Key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
QWEN_TTS_MODEL=qwen3-tts-vc-2026-01-22
QWEN_TTS_DEFAULT_VOICE=Cherry
```

说明：

- `DASHSCOPE_API_KEY` 必填
- `QWEN_TTS_MODEL` 默认已经设成适合语音复刻的 `qwen3-tts-vc-2026-01-22`
- `QWEN_TTS_DEFAULT_VOICE` 只在你没传自定义 `voice`，也没传参考音频时作为兜底

## 2. 克隆音色

创建一个新的克隆音色：

```bash
npm run voice:qwen -- create \
  --file runtime/voices/qwen/daman-business-001.wav \
  --name daman-qwen \
  --language zh-cn
```

如果想“有就复用，没有再创建”：

```bash
npm run voice:qwen -- ensure \
  --file runtime/voices/qwen/daman-business-001.wav \
  --name daman-qwen \
  --language zh-cn
```

说明：

- `--file` 可以是本地音频路径
- `--name` 是你希望保存的音色名
- 同一份参考音频 + 同一个名字 + 同一个模型，会优先复用本地 registry

## 3. 查看 / 删除音色

列出现有克隆音色：

```bash
npm run voice:qwen -- list
```

删除一个音色：

```bash
npm run voice:qwen -- delete --voice daman-qwen
```

## 4. 单条语音预览

直接生成一条 wav：

```bash
npm run voice:qwen -- synthesize \
  --voice daman-qwen \
  --text "这是一条阿里云百炼千问语音测试。" \
  --language zh-cn \
  --out out/qwen-tts-preview.wav
```

## 5. 接到原工作流

如果你要把它直接接进原来的“搜标题 -> 生成内容 -> 生成配音 -> 出片”流程，命令如下：

```bash
npm run workflow:ultimate -- "国产 AI 开源王炸到底强在哪" \
  --voice-engine qwen-tts \
  --speaker daman-qwen
```

如果还没提前创建音色，也可以直接给参考音频：

```bash
npm run workflow:ultimate -- "GPT-5.5 发布后岗位会被替代吗" \
  --voice-engine qwen-tts \
  --reference runtime/voices/qwen/daman-business-001.wav \
  --speaker daman-qwen \
  --voice-language zh-cn
```

这条链路会自动做三件事：

- 先检查 `DASHSCOPE_API_KEY` 是否存在
- 如果 `speaker` 不存在但给了 `reference`，会先创建 / 复用克隆音色
- 再把每个镜头的口播文本生成成 wav

## 6. 当前项目里的关键文件

- [`server/voice/qwenTtsClient.js`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/voice/qwenTtsClient.js)
- [`server/voice/voiceJob.js`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/server/voice/voiceJob.js)
- [`scripts/voice/qwen-tts-voice.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/voice/qwen-tts-voice.mjs)
- [`scripts/run-search-to-ultimate.mjs`](/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/scripts/run-search-to-ultimate.mjs)

## 7. 注意事项

- 这条链路是云端调用，不是本地推理
- 如果 `DASHSCOPE_API_KEY` 没配，工作流会直接报错，不会静默回退成别的语音
- 当前接法优先服务“短视频整片配音”和“固定克隆音色复用”，不是 realtime 对话
