#!/usr/bin/env python3
"""
generate-tts-from-meta.py — 从 segments_meta.json 读取，调用 mmx TTS

用法:
  python3 scripts/generate-tts-from-meta.py [--voice VOICE_ID]
"""

import subprocess, os, json, sys, time, shutil

MMX = os.environ.get("MMX_CLI", "mmx")
TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30
VOICE = sys.argv[2] if len(sys.argv) > 2 else "Arrogant_Miss"

meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(meta_path) as f:
    segments = json.load(f)

print(f"🎙️ MiniMax TTS 生成（音色: {VOICE}）...\n")
os.makedirs(TMP_DIR, exist_ok=True)

def mmx_speech(text: str, out_mp3: str, voice: str, retry=3) -> bool:
    for attempt in range(retry):
        result = subprocess.run(
            [MMX, "speech", "synthesize",
             "--text", text,
             "--voice", voice,
             "--format", "mp3",
             "--out", out_mp3,
             "--quiet"],
            capture_output=True, timeout=120
        )
        if result.returncode == 0 and os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 1000:
            return True
        time.sleep(2)
    return False

generated = []
for seg in segments:
    seg_id = seg["id"]
    text = seg["text"]
    mp3 = os.path.join(TMP_DIR, f"seg_{seg_id}.mp3")
    wav = os.path.join(TMP_DIR, f"seg_{seg_id}.wav")

    chars = len(text)
    print(f"[{seg_id}] ({chars}字) {text[:30]}... ", end="", flush=True)

    ok = mmx_speech(text, mp3, VOICE)
    if not ok:
        print("FAILED")
        continue

    # mp3 → wav 44100 stereo
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", mp3, "-ar", "44100", "-ac", "2", wav],
        capture_output=True, timeout=30
    )
    if r.returncode != 0 or not os.path.exists(wav):
        print("FFMPEG FAILED")
        continue

    os.remove(mp3)

    from pydub import AudioSegment
    dur = len(AudioSegment.from_wav(wav)) / 1000.0
    frames = int(dur * FPS)
    print(f"{dur:.2f}s ({frames}f)")

    generated.append({
        "id": seg_id,
        "shotType": seg["shotType"],
        "startFrame": seg["startFrame"],
        "wav": wav,
        "duration_s": round(dur, 3),
        "duration_frames": frames,
        "text": text,
    })

if not generated:
    print("❌ 没有生成任何配音!")
    sys.exit(1)

# 保存更新后的元数据（含实际时长）
with open(meta_path, "w") as f:
    json.dump(generated, f, ensure_ascii=False, indent=2)

total_frames = sum(s["duration_frames"] for s in generated)
print(f"\n✅ 完成 {len(generated)} 片段")
print(f"   总帧数: {total_frames} ({total_frames/FPS:.1f}s)")
