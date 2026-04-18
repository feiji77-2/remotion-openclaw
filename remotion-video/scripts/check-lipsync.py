#!/usr/bin/env python3
"""
check-lipsync.py — 音画同步检测

对比视频音轨与参考音频的时间偏移，
检测是否存在音画不同步问题。

原理：
  1. 提取视频音轨
  2. 与参考音频（原始TTS）做互相关（cross-correlation）
  3. 找出最大相似度对应的时间偏移

用法:
  python3 scripts/check-lipsync.py out/video.mp4 audio-tmp/narration_aligned.wav
"""

import subprocess, sys, os, json
import numpy as np
from scipy.io import wavfile
from scipy.signal import correlate

FPS = 30
MAX_DRIFT_MS = 500  # 超过500ms判定为严重不同步


def to_mono(signal: np.ndarray) -> np.ndarray:
    """统一转为单声道 float，避免 stereo / mono 维度不一致。"""
    if signal.ndim == 1:
        return signal.astype(np.float32)
    return signal.mean(axis=1).astype(np.float32)


def extract_audio(video_path: str, out_wav: str) -> bool:
    """用 ffmpeg 提取视频音轨为 wav"""
    result = subprocess.run([
        'ffmpeg', '-y', '-i', video_path,
        '-vn', '-acodec', 'pcm_s16le',
        '-ar', '16000', '-ac', '1',
        out_wav
    ], capture_output=True)
    return result.returncode == 0


def cross_correlate_offset(ref_wav: str, test_wav: str) -> dict:
    """
    计算 test_wav 相对于 ref_wav 的时间偏移（毫秒）。
    正值 = test 晚于 ref，负值 = test 早于 ref。
    """
    try:
        _, ref = wavfile.read(ref_wav)
        _, test = wavfile.read(test_wav)
    except Exception as e:
        return {'error': str(e)}

    ref = to_mono(ref)
    test = to_mono(test)
    if ref.size == 0 or test.size == 0:
        return {'error': '空音频输入'}

    # 降采样到 4000Hz 加速计算
    ref = ref[::4]
    test = test[::4]
    sr = 4000

    # 互相关
    correlation = correlate(test, ref, mode='full')
    mid = len(correlation) // 2

    # 找最大相关峰值
    peak_idx = np.argmax(np.abs(correlation)) - mid
    offset_samples = peak_idx
    offset_ms = (offset_samples / sr) * 1000

    # 计算信噪比
    max_corr = np.max(np.abs(correlation))
    noise_level = np.std(correlation)
    snr = max_corr / (noise_level + 1e-10)

    return {
        'offset_ms': round(offset_ms, 1),
        'offset_frames': round(offset_ms / (1000 / FPS), 2),
        'snr_db': round(20 * np.log10(snr), 1),
        'status': 'OK' if abs(offset_ms) <= MAX_DRIFT_MS else 'DRIFT',
    }


def check_lipsync(video_path: str, ref_audio: str) -> dict:
    """
    主检测函数。
    """
    print(f"🎬 视频: {video_path}")
    print(f"🎙️ 参考: {ref_audio}")

    if not os.path.exists(video_path):
        return {'error': f'视频文件不存在: {video_path}'}
    if not os.path.exists(ref_audio):
        return {'error': f'参考音频不存在: {ref_audio}'}

    # 提取视频音轨
    tmp_wav = video_path + '.tmp_audio.wav'
    if not extract_audio(video_path, tmp_wav):
        return {'error': '提取视频音轨失败'}

    try:
        result = cross_correlate_offset(ref_audio, tmp_wav)
    finally:
        if os.path.exists(tmp_wav):
            os.remove(tmp_wav)

    return result


def print_report(result: dict):
    """格式化输出报告"""
    print("\n" + "=" * 50)
    print("  音画同步检测报告")
    print("=" * 50)

    if 'error' in result:
        print(f"  ❌ 错误: {result['error']}")
        return

    offset = result['offset_ms']
    frames = result['offset_frames']
    snr = result['snr_db']
    status = result['status']

    print(f"  时间偏移: {offset:+.1f}ms ({frames:+.2f}帧 @30fps)")
    print(f"  信噪比:   {snr}dB")
    print(f"  阈值:    ±{MAX_DRIFT_MS}ms")

    if status == 'OK':
        print(f"\n  ✅ {status} — 音画同步正常")
    else:
        print(f"\n  ❌ {status} — 检测到严重偏移！")
        print(f"\n  建议: 检查音频拼接脚本或 TTS 生成参数")

    print("=" * 50)


def main():
    if len(sys.argv) < 3:
        # 尝试默认路径
        video = "out/hermes_openclaw_v4_final.mp4"
        if not os.path.exists(video):
            video = "out/Video1_cached.mp4"
        audio = os.path.expanduser("~/video-gen/audio-tmp/narration_aligned.wav")
        if not os.path.exists(video):
            video = "out/video.mp4"
        if not os.path.exists(audio):
            audio = os.path.expanduser("~/video-gen/audio-tmp/narration_synced.wav")
        if not os.path.exists(audio):
            print("用法: python3 check-lipsync.py <视频> <参考音频>")
            sys.exit(1)
        print(f"使用默认路径: {video} / {audio}")
    else:
        video = sys.argv[1]
        audio = sys.argv[2]

    result = check_lipsync(video, audio)
    print_report(result)

    if 'error' not in result and result['status'] == 'DRIFT':
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
