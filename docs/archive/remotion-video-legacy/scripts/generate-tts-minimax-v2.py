#!/usr/bin/env python3
"""TTS 配音生成 — MiniMax speech-2.8-hd 模型
策略：音频时长决定视频镜头时长，先有音频再定视频
"""

import subprocess, os, json, sys, urllib.request, urllib.error, time

API_KEY = os.environ.get("MINIMAX_API_KEY", "")
API_URL = "https://api.minimaxi.com/v1/t2a_v2"
TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

os.makedirs(TMP_DIR, exist_ok=True)

# 口播稿 — 严格控制字数，对应视频镜头
NARRATIONS = [
    {"id": "title",    "text": "一条命令，完成AI视频封面设计",             "voice": "female-tianmei", "speed": 1.0},
    {"id": "concept",  "text": "核心概念，AI自动理解内容，匹配最佳呈现方案",  "voice": "female-tianmei", "speed": 1.0},
    {"id": "flowchart","text": "五步流水线，输入主题，AI分析，匹配模板，渲染输出，一键分发", "voice": "female-tianmei", "speed": 1.0},
    {"id": "terminal", "text": "输入命令，AI全自动完成分析渲染，无需人工干预", "voice": "female-tianmei", "speed": 1.0},
    {"id": "scenegrid","text": "支持23种场景，覆盖封面设计、代码界面、数据图表、流程图、产品截图等主流类型", "voice": "female-tianmei", "speed": 1.0},
    {"id": "countup",  "text": "23种场景一键生成，全自动处理",              "voice": "female-tianmei", "speed": 1.0},
    {"id": "dialog_u1","text": "帮我做一个AI视频封面",                     "voice": "female-tianmei", "speed": 1.0},
    {"id": "dialog_a1","text": "好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出", "voice": "female-tianmei", "speed": 1.0},
    {"id": "dialog_u2","text": "需要多久",                                 "voice": "female-tianmei", "speed": 1.0},
    {"id": "dialog_a2","text": "预计30秒以内，正在渲染中，请稍候",          "voice": "female-tianmei", "speed": 1.0},
    {"id": "bullets",  "text": "核心优势，全自动处理，23种场景智能匹配，一键生成，免费使用", "voice": "female-tianmei", "speed": 1.0},
    {"id": "wordcloud","text": "AI自动化，视频封面，一键生成，免费高效，智能匹配", "voice": "female-tianmei", "speed": 1.0},
    {"id": "cta",      "text": "立即体验，免费开始，无需信用卡，AI创作新方式从现在开始", "voice": "female-tianmei", "speed": 1.0},
]


def call_tts(text, voice_id, speed=1.0, retry=3):
    """调用 MiniMax TTS API，返回音频URL"""
    if not API_KEY:
        print("  [!] MINIMAX_API_KEY not set")
        return None

    for attempt in range(retry):
        payload = json.dumps({
            "model": "speech-2.8-hd",
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": voice_id,
                "speed": speed,
                "emotion": "happy",
            },
            "output_format": "url",
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
                "channel": 1,
            },
        }).encode("utf-8")

        req = urllib.request.Request(
            API_URL, data=payload,
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  [!] Attempt {attempt+1} failed: {e}")
            time.sleep(2)
            continue

        base_resp = result.get("base_resp", {})
        if base_resp.get("status_code") != 0:
            print(f"  [!] API error: {base_resp.get('status_msg')}")
            time.sleep(2)
            continue

        audio_url = result.get("data", {}).get("audio")
        if audio_url:
            return audio_url
    return None


def download(url, path):
    try:
        urllib.request.urlretrieve(url, path)
        return os.path.exists(path) and os.path.getsize(path) > 1000
    except:
        return False


def get_duration(wav_path):
    try:
        from pydub import AudioSegment
        return len(AudioSegment.from_wav(wav_path)) / 1000.0
    except:
        return 0


print("🎙️ MiniMax TTS 生成（精简口播稿）...\n")
segments = []

for seg in NARRATIONS:
    seg_id = seg["id"]
    text = seg["text"]
    voice = seg["voice"]
    mp3 = os.path.join(TMP_DIR, f"seg_{seg_id}.mp3")
    wav = os.path.join(TMP_DIR, f"seg_{seg_id}.wav")

    chars = len(text)
    print(f"[{seg_id}] ({chars}字) {text[:40]}...")

    url = call_tts(text, voice, seg.get("speed", 1.0))
    if not url:
        print(f"  [!] TTS failed\n")
        continue

    if not download(url, mp3):
        print(f"  [!] Download failed\n")
        continue

    subprocess.run(["ffmpeg", "-y", "-i", mp3, "-ar", "44100", "-ac", "2", wav],
                  capture_output=True, timeout=30)
    os.remove(mp3)

    dur = get_duration(wav)
    frames = int(dur * FPS)
    print(f"  -> {dur:.2f}s ({frames}帧 @ {FPS}fps)\n")

    segments.append({
        "id": seg_id,
        "text": text,
        "voice": voice,
        "wav": wav,
        "duration_s": dur,
        "duration_frames": frames,
    })

if not segments:
    print("❌ 没有生成任何配音!")
    sys.exit(1)

print(f"\n已生成 {len(segments)} 个片段\n")

# 打印时长汇总
total_frames = 0
for s in segments:
    print(f"  {s['id']:12s}: {s['duration_s']:.2f}s ({s['duration_frames']}帧)")
    total_frames += s['duration_frames']

print(f"\n总帧数: {total_frames} ({total_frames/FPS:.1f}s)")

# 保存片段信息供视频编辑用
out_meta = os.path.join(TMP_DIR, "segments_meta.json")
with open(out_meta, "w", encoding="utf-8") as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)
print(f"元数据: {out_meta}")
