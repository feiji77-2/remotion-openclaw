#!/usr/bin/env python3
"""
assemble-narration.py — 拼接完整旁白音轨

从 segments_meta.json 读取8个镜头音频，
按帧时间线拼接成完整 narration.wav。
"""

import subprocess, os, json
from pydub import AudioSegment

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(meta_path) as f:
    segments = json.load(f)

print(f"🎙️ 拼接旁白音轨（{len(segments)} 个镜头）\n")

# 加载所有音频
loaded = {}
for seg in segments:
    wav_path = seg.get("wav", "")
    if os.path.exists(wav_path):
        try:
            loaded[seg["id"]] = AudioSegment.from_wav(wav_path)
            print(f"  ✅ {seg['id']}: {seg['actual_dur']:.2f}s")
        except Exception as e:
            print(f"  ❌ {seg['id']}: {e}")
            loaded[seg["id"]] = AudioSegment.silent(duration=1000)
    else:
        print(f"  ❌ {seg['id']}: 文件不存在 ({wav_path})")
        loaded[seg["id"]] = AudioSegment.silent(duration=1000)

# 按时间线拼接
combined = AudioSegment.silent(duration=0)
cur_end_ms = 0

print("\n📋 时间线:")
for seg in segments:
    seg_id = seg["id"]
    start_frame = seg["startFrame"]
    target_ms = int(start_frame / FPS * 1000)

    # 静音填充到目标位置
    if target_ms > cur_end_ms:
        silence = AudioSegment.silent(duration=target_ms - cur_end_ms)
        combined += silence
        cur_end_ms = target_ms

    # 插入音频
    audio = loaded.get(seg_id, AudioSegment.silent(duration=1))
    combined += audio
    actual_dur = len(audio)
    cur_end_ms += actual_dur

    print(f"  {seg_id:10s} frame={start_frame:5d} → {target_ms/1000:.2f}s | dur={actual_dur/1000:.2f}s")

# 导出
out_path = os.path.join(TMP_DIR, "narration.wav")
combined.export(out_path, format="wav")

# 验证
dur = len(combined) / 1000
total_frames = int(dur * FPS)
print(f"\n✅ 旁白导出: {out_path}")
print(f"   时长: {dur:.2f}s ({total_frames}帧 @ {FPS}fps)")
print(f"   大小: {os.path.getsize(out_path)/1024/1024:.1f}MB")
