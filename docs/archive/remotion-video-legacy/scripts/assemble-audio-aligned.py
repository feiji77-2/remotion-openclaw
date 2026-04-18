#!/usr/bin/env python3
"""
assemble-audio-aligned.py — TTS时长自动对齐版

功能：
  1. 测量每个 TTS 音频的实际时长
  2. 对比 segments_meta.json 中记录的期望时长
  3. 偏差 >5% 时用 ffmpeg atempo 自动拉伸/压缩
  4. 对齐后用 pydub 拼接成完整音轨

用法:
  python3 scripts/assemble-audio-aligned.py
"""

import subprocess, os, json, tempfile
from pydub import AudioSegment

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30
THRESHOLD = 0.05  # 偏差超过5%才调整


def get_audio_duration(path: str) -> float:
    """用 ffprobe 精确获取音频时长（秒）"""
    result = subprocess.run(
        ["ffprobe", "-v", "error",
         "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def align_audio_to_video(src_wav: str, expected_frames: int, fps: int = 30) -> str:
    """
    用 ffmpeg atempo 将音频自动对齐到期望帧数时长。

    原理：actual_duration / expected_duration = speed_factor
    atempo 范围 [0.5, 2.0]，超出则分多步处理。
    """
    expected_duration = expected_frames / fps
    actual_duration = get_audio_duration(src_wav)
    speed = actual_duration / expected_duration

    if abs(speed - 1.0) < THRESHOLD:
        return src_wav  # 偏差可接受，不处理

    print(f"    [对齐] 实际{actual_duration:.3f}s → 期望{expected_duration:.3f}s, speed={speed:.4f}")

    # atempo 单次限制 [0.5, 2.0]，超出则分段
    out_wav = src_wav.replace(".wav", f"_aligned_{speed:.3f}x.wav")

    if 0.5 <= speed <= 2.0:
        _run_atempo(src_wav, speed, out_wav)
    else:
        # 两步走：先降速/提速到安全范围，再第二次
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            mid_speed = speed ** 0.5 if speed > 1 else 1 / ((1 / speed) ** 0.5)
            mid_speed = max(0.5, min(2.0, mid_speed))
            _run_atempo(src_wav, mid_speed, tmp_path)
            _run_atempo(tmp_path, mid_speed, out_wav)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    return out_wav


def _run_atempo(src: str, speed: float, dst: str):
    subprocess.run(
        ["ffmpeg", "-y", "-i", src,
         "-filter:a", f"atempo={speed:.4f}",
         "-q:a", "0", dst],
        capture_output=True
    )


def main():
    meta_path = os.path.join(TMP_DIR, "segments_meta.json")
    with open(meta_path) as f:
        segments = json.load(f)

    print("🎞️ TTS时长自动对齐 + 音频拼接\n")

    # 第一步：对齐每个音频段
    aligned = {}
    for seg in segments:
        seg_id = seg["id"]
        wav_path = seg.get("wav", f"{TMP_DIR}/seg_{seg_id}.wav")

        if not os.path.exists(wav_path):
            print(f"  {seg_id}: [跳过 - 文件不存在]")
            continue

        expected_frames = seg.get("duration_s", 0) * FPS
        if expected_frames <= 0:
            expected_frames = seg.get("endFrame", 0) - seg.get("startFrame", 0)

        aligned_wav = align_audio_to_video(wav_path, expected_frames or 60, FPS)
        aligned[seg_id] = aligned_wav

        actual_dur = get_audio_duration(aligned_wav)
        print(f"  {seg_id}: {actual_dur:.3f}s")

    # 第二步：按帧时间线拼接
    combined = AudioSegment.silent(duration=0)
    cur_end_ms = 0

    print("\n拼接时间线：")
    for seg in segments:
        seg_id = seg["id"]
        start_frame = seg.get("startFrame", 0)

        target_ms = int(start_frame / FPS * 1000)
        if target_ms > cur_end_ms:
            combined += AudioSegment.silent(target_ms - cur_end_ms)
            cur_end_ms = target_ms

        audio_path = aligned.get(seg_id)
        if audio_path and os.path.exists(audio_path):
            audio = AudioSegment.from_wav(audio_path)
            combined += audio
            cur_end_ms += len(audio)
            print(f"  {seg_id:12s}: frame={start_frame}, dur={len(audio)/1000:.2f}s")
        else:
            print(f"  {seg_id:12s}: frame={start_frame}, [NO AUDIO]")

    # 第三步：导出
    out_path = os.path.join(TMP_DIR, "narration_aligned.wav")
    combined.export(out_path, format="wav")
    print(f"\n✅ 导出: {out_path}")
    print(f"   总时长: {len(combined)/1000:.2f}s")


if __name__ == "__main__":
    main()
