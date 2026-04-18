#!/usr/bin/env python3
"""拼接同步音频 — Arrogant_Miss 音色版"""
import subprocess, os, json
from pydub import AudioSegment

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

with open(f"{TMP_DIR}/segments_meta.json") as f:
    raw = json.load(f)
all_wavs = {s["id"]: AudioSegment.from_wav(s["wav"]) for s in raw if os.path.exists(s["wav"])}

# 帧时间线（与 Video1.tsx 完全一致）
# dialog 4段合并：u1(72f) + a1(266f) + u2(36f) + a2(remaining)
timeline = [
    ("title",     0,      "title"),
    ("concept",   98,     "concept"),
    ("flowchart", 227,    "flowchart"),
    ("terminal",  417,    "terminal"),
    ("scenegrid", 556,    "scenegrid"),
    ("countup",   802,    "countup"),
    # dialog: 910开始，总665f，4段
    ("bullets",   1575,   "bullets"),
    ("wordcloud", 1775,   "wordcloud"),
    ("cta",       1950,   "cta"),
]

dialog_audio = (
    all_wavs.get("dialog_u1", AudioSegment.silent(duration=1)) +
    all_wavs.get("dialog_a1", AudioSegment.silent(duration=1)) +
    all_wavs.get("dialog_u2", AudioSegment.silent(duration=1)) +
    all_wavs.get("dialog_a2", AudioSegment.silent(duration=1))
)
print(f"Dialog合并: {len(dialog_audio)/1000:.2f}s\n")

combined = AudioSegment.silent(duration=0)
cur_end = 0

for name, start_f, audio_key in timeline:
    target = int(start_f / FPS * 1000)
    if target > cur_end:
        combined += AudioSegment.silent(target - cur_end)
        cur_end = target
    audio = all_wavs.get(audio_key, AudioSegment.silent(duration=1))
    combined += audio
    cur_end += len(audio)
    print(f"  {name:12s}: frame={start_f}, dur={len(audio)/1000:.2f}s")

# dialog
d_start = int(910 / FPS * 1000)
if d_start > cur_end:
    combined += AudioSegment.silent(d_start - cur_end)
    cur_end = d_start
combined += dialog_audio
cur_end += len(dialog_audio)
print(f"  {'dialog':12s}: frame=910, dur={len(dialog_audio)/1000:.2f}s")

# padding 到视频结束
video_end = int(2123 / FPS * 1000)
if cur_end < video_end:
    combined += AudioSegment.silent(video_end - cur_end)
    print(f"\n  [+ padding {video_end - cur_end}ms]")

print(f"\n总音频: {len(combined)/1000:.2f}s (2123帧 @ {FPS}fps)")

out = f"{TMP_DIR}/narration_synced.wav"
combined.export(out, format="wav")
print(f"✅ 导出: {out}")
