#!/usr/bin/env python3
"""拼接同步音频 — 按帧时间线对齐 Video1 镜头"""
import subprocess, os, json, sys
from pydub import AudioSegment

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(meta_path) as f:
    raw_segments = json.load(f)

seg_map = {s["id"]: s["wav"] for s in raw_segments}

print("🎞️ 拼接同步音频...\n")

# 加载所有音频片段
all_wavs = {}
for seg in raw_segments:
    if os.path.exists(seg["wav"]):
        all_wavs[seg["id"]] = AudioSegment.from_wav(seg["wav"])
        print(f"  加载 {seg['id']}: {seg['duration_s']:.2f}s")

# Dialog 4段合并
dialog_audio = sum(
    all_wavs.get(sid, AudioSegment.silent(duration=1))
    for sid, _, _ in [
        ("dialog_u1", 0, 68),
        ("dialog_a1", 0, 266),
        ("dialog_u2", 0, 47),
        ("dialog_a2", 0, 127),
    ]
)
print(f"  Dialog合并: {len(dialog_audio)/1000:.2f}s\n")

# 镜头帧时间线（与 Video1.tsx 完全一致）
timeline = [
    ("title",     0,      "title"),
    ("concept",   110,     "concept"),
    ("flowchart", 259,     "flowchart"),
    ("terminal",  471,     "terminal"),
    ("scenegrid", 632,     "scenegrid"),
    ("countup",   911,     "countup"),
    ("dialog",    1027,    None),  # 特殊处理
    ("bullets",   1535,   "bullets"),
    ("wordcloud", 1760,   "wordcloud"),
    ("cta",       1925,    "cta"),
]

# 构建完整音频（按帧时间线，在对应帧位置放对应音频）
combined = AudioSegment.silent(duration=0)
current_audio_end_ms = 0  # 当前已拼接音频的结束时间

for shot_name, start_frame, audio_key in timeline:
    target_start_ms = int(start_frame / FPS * 1000)

    # 如果目标位置 > 当前音频结束，先填充 silence
    if target_start_ms > current_audio_end_ms:
        silence_dur = target_start_ms - current_audio_end_ms
        combined += AudioSegment.silent(duration=silence_dur)
        current_audio_end_ms = target_start_ms

    # 插入该镜头的音频
    if audio_key:
        audio = all_wavs.get(audio_key, AudioSegment.silent(duration=1))
    else:
        audio = dialog_audio  # dialog 用合并音频

    combined += audio
    current_audio_end_ms += len(audio)

    print(f"  {shot_name:12s}: frame={start_frame}, audio_dur={len(audio)/1000:.2f}s")

# padding 到视频结束（2113帧 = 70.43s）
video_end_ms = int(2113 / FPS * 1000)
if current_audio_end_ms < video_end_ms:
    combined += AudioSegment.silent(duration=video_end_ms - current_audio_end_ms)
    print(f"\n  [+ silence padding {video_end_ms - current_audio_end_ms}ms 填满视频]")

total_dur = len(combined) / 1000
print(f"\n总音频时长: {total_dur:.2f}s")
print(f"视频时长: 70.4s (2113帧)")

# 导出
out_wav = os.path.join(TMP_DIR, "narration_synced.wav")
combined.export(out_wav, format="wav")
print(f"\n✅ 导出: {out_wav} ({total_dur:.2f}s)")
