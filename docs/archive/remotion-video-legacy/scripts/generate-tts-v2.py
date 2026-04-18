#!/usr/bin/env python3
"""TTS 配音生成 — 全 Python 实现，用 macOS say 命令"""

import subprocess
import os
import json
import sys

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
os.makedirs(TMP_DIR, exist_ok=True)

FPS = 30

NARRATIONS = [
    {"id": "title",    "start_frame": 0,    "text": "一条命令，完成AI视频封面设计，23种场景全自动",   "voice": "Tingting"},
    {"id": "concept",  "start_frame": 90,   "text": "核心概念，基于人工智能技术，自动理解内容并匹配最佳呈现方案，一键生成专业级视频封面", "voice": "Tingting"},
    {"id": "flowchart","start_frame": 210,  "text": "五步流水线工作流程：第一步输入视频主题文案，第二步AI智能分析理解内容意图，第三步自动匹配最佳场景模板，第四步一键渲染输出视频封面，第五步多平台一键分发发布", "voice": "Tingting"},
    {"id": "terminal", "start_frame": 450,  "text": "让我们来看实际效果，输入命令指定场景数量，AI自动完成全部分析和渲染，无需任何手动干预", "voice": "Tingting"},
    {"id": "scenegrid","start_frame": 690,  "text": "支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案", "voice": "Tingting"},
    {"id": "countup",  "start_frame": 1050, "text": "覆盖23个以上场景，一键生成，全自动处理", "voice": "Tingting"},
    {"id": "bullets", "start_frame": 1530, "text": "核心优势：全自动处理，无需手动调整，23种场景智能匹配，一键生成多平台版本，免费使用，无需信用卡", "voice": "Tingting"},
    {"id": "wordcloud","start_frame": 1830, "text": "AI自动化，视频封面，一键生成，免费高效，智能匹配，多平台实时预览，批量处理", "voice": "Tingting"},
    {"id": "cta",      "start_frame": 2130, "text": "立即体验，免费开始，无需信用卡，AI创作新方式，从现在开始", "voice": "Tingting"},
]

def run_cmd(cmd_list, timeout=60):
    result = subprocess.run(cmd_list, capture_output=True, timeout=timeout)
    return result.returncode == 0, result.stderr

def get_duration(wav_path):
    try:
        from pydub import AudioSegment
        a = AudioSegment.from_wav(wav_path)
        return len(a) / 1000.0
    except:
        return 0

print("🎙️ 生成配音...\n")
segments = []

for seg in NARRATIONS:
    seg_id = seg["id"]
    text = seg["text"]
    voice = seg["voice"]
    wav = os.path.join(TMP_DIR, f"seg_{seg_id}.wav")
    aiff = os.path.join(TMP_DIR, f"seg_{seg_id}.aiff")

    print(f"[{seg_id}] {text[:30]}... voice={voice}")

    # 用 say 生成 aiff
    ok, stderr = run_cmd(["say", "-v", voice, "-o", aiff, "--", text])
    if not ok or not os.path.exists(aiff):
        print(f"  [!] say failed, retry without '--'...")
        ok2, _ = run_cmd(["say", "-v", voice, "-o", aiff, text])
        if not ok2 or not os.path.exists(aiff):
            print(f"  [!] say retry failed too, skipping")
            continue

    size = os.path.getsize(aiff)
    print(f"  aiff size: {size}")

    # aiff -> wav 44100 stereo
    ok, _ = run_cmd(["ffmpeg", "-y", "-i", aiff, "-ar", "44100", "-ac", "2", wav])
    if not ok or not os.path.exists(wav):
        print(f"  [!] ffmpeg failed")
        continue

    os.remove(aiff)

    dur = get_duration(wav)
    print(f"  -> {dur:.2f}s")

    segments.append({
        "id": seg_id,
        "start_frame": seg["start_frame"],
        "text": text,
        "voice": voice,
        "wav": wav,
        "duration_s": dur,
    })

if not segments:
    print("❌ 没有生成任何配音!")
    sys.exit(1)

print(f"\n总片段数: {len(segments)}")

# 拼接音频（含silence填充）
from pydub import AudioSegment

combined = AudioSegment.empty()
for seg in segments:
    target_ms = int(seg["start_frame"] / FPS * 1000)
    current_ms = len(combined)
    if current_ms < target_ms:
        combined += AudioSegment.silent(duration=target_ms - current_ms)
    seg_audio = AudioSegment.from_wav(seg["wav"])
    combined += seg_audio

total_dur = len(combined) / 1000.0
print(f"总音频时长: {total_dur:.2f}s (视频83s)")

out_wav = os.path.join(TMP_DIR, "narration.wav")
combined.export(out_wav, format="wav")

# 时间轴
timeline = [{
    "id": s["id"],
    "start_frame": s["start_frame"],
    "start_s": round(s["start_frame"] / FPS, 3),
    "duration_s": round(s["duration_s"], 3),
    "text": s["text"],
} for s in segments]

timeline_path = os.path.join(TMP_DIR, "timeline.json")
with open(timeline_path, "w", encoding="utf-8") as f:
    json.dump(timeline, f, ensure_ascii=False, indent=2)

print(f"\n✅ 完成!")
print(f"   配音: {out_wav}")
print(f"   时间轴: {timeline_path}")
