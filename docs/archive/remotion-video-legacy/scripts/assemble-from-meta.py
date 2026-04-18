#!/usr/bin/env python3
"""
assemble-from-meta.py — 从 segments_meta.json 拼接同步音频

用法:
  python3 scripts/assemble-from-meta.py
"""

import subprocess, os, json
from pydub import AudioSegment

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(meta_path) as f:
    segments = json.load(f)

print("🎞️ 拼接同步音频...\n")

# 加载所有音频
wavs = {}
for seg in segments:
    wav = seg.get("wav", f"{TMP_DIR}/seg_{seg['id']}.wav")
    if os.path.exists(wav):
        try:
            wavs[seg["id"]] = AudioSegment.from_wav(wav)
        except:
            pass

print(f"已加载: {list(wavs.keys())}\n")

# 按帧时间线拼接
combined = AudioSegment.silent(duration=0)
cur_end_ms = 0

for seg in segments:
    seg_id = seg["id"]
    start_frame = seg["startFrame"]
    target_ms = int(start_frame / FPS * 1000)

    # silence 填充
    if target_ms > cur_end_ms:
        combined += AudioSegment.silent(target_ms - cur_end_ms)
        cur_end_ms = target_ms

    # 插入音频
    audio = wavs.get(seg_id)
    if audio:
        combined += audio
        cur_end_ms += len(audio)
        print(f"  {seg_id:12s}: frame={start_frame}, dur={len(audio)/1000:.2f}s")
    else:
        print(f"  {seg_id:12s}: frame={start_frame}, [NO AUDIO]")

# padding 到最后一个镜头结束
if segments:
    last = segments[-1]
    last_end_ms = int(last["startFrame"] / FPS * 1000) + wavs.get(last["id"], AudioSegment.empty()).duration_seconds * 1000
    if cur_end_ms < last_end_ms:
        combined += AudioSegment.silent(last_end_ms - cur_end_ms)
        print(f"\n  [+ silence {last_end_ms - cur_end_ms}ms padding]")

video_end_ms = int(sum(s["duration_frames"] for s in segments) / FPS * 1000)
total_dur = len(combined) / 1000
print(f"\n总音频: {total_dur:.2f}s")

out = f"{TMP_DIR}/narration_synced.wav"
combined.export(out, format="wav")
print(f"✅ 导出: {out}")
