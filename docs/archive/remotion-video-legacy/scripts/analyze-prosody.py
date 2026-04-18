#!/usr/bin/env python3
"""
analyze-prosody.py — 语音韵律分析器

分析音频的语速、停顿、能量峰值、音调变化，
生成 Remotion 可消费的 prosody-markers.json。

用法:
  python3 scripts/analyze-prosody.py [--audio AUDIO_PATH]
"""

import subprocess, os, json, sys, argparse
import numpy as np
import librosa

FPS = 30
OUTPUT_DIR = os.path.expanduser("~/video-gen/src/prosody")


def analyze_prosody(audio_path: str) -> dict:
    """
    全面分析音频韵律特征。
    """
    y, sr = librosa.load(audio_path)
    duration = librosa.get_duration(y=y, sr=sr)

    # 1. 能量分析（每帧 RMS）
    hop_length = 512
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    rms_times = librosa.times_like(rms, sr=sr, hop_length=hop_length)

    # 2. 过零率（判断清音/浊音）
    zcr = librosa.feature.zero_crossing_rate(y, hop_length=hop_length)[0]

    # 3. 音调分析（基频 F0）
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, fmin=50, fmax=500, sr=sr, hop_length=hop_length
    )
    f0_times = librosa.times_like(f0, sr=sr, hop_length=hop_length)

    # 4. 语速（音节能量包络）
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
    beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=hop_length)

    # 5. 静音检测
    silence_threshold = np.percentile(rms, 10)
    silence_mask = rms < silence_threshold

    # ===== 构建标记 =====

    # 能量峰值标记（文字入场时机）
    energy_threshold = np.percentile(rms, 80)
    energy_peaks = []
    for i, (t, e) in enumerate(zip(rms_times, rms)):
        if e > energy_threshold:
            frame = int(t * FPS)
            energy_peaks.append({
                "frame": frame,
                "type": "emphasis",
                "energy": float(e),
                "source": "energy"
            })

    # 音调突变标记（画面震动/缩放）
    pitch_markers = []
    prev_f0 = None
    for t, f0_val, vp in zip(f0_times, f0, voiced_probs):
        if not np.isnan(f0_val) and vp > 0.5:
            if prev_f0 is not None and not np.isnan(prev_f0):
                delta = abs(f0_val - prev_f0)
                if delta > 50:  # 音调突变 > 50Hz
                    frame = int(t * FPS)
                    pitch_markers.append({
                        "frame": frame,
                        "type": "pitch_shift",
                        "delta_hz": float(delta),
                        "f0": float(f0_val),
                        "source": "pitch"
                    })
            prev_f0 = f0_val

    # 停顿标记（镜头切换时机）
    pause_markers = []
    in_pause = False
    pause_start = 0
    for t, is_silent in zip(rms_times, silence_mask):
        if is_silent and not in_pause:
            in_pause = True
            pause_start = t
        elif not is_silent and in_pause:
            in_pause = False
            pause_duration = t - pause_start
            if pause_duration > 0.3:  # 停顿 > 300ms
                frame = int(pause_start * FPS)
                pause_markers.append({
                    "frame": frame,
                    "type": "pause",
                    "duration_s": float(pause_duration),
                    "source": "silence"
                })

    # 合并所有标记，按时间排序
    all_markers = energy_peaks + pitch_markers + pause_markers
    all_markers.sort(key=lambda m: m["frame"])

    # 去重（相邻同类型标记保留能量最高的）
    deduped = []
    for marker in all_markers:
        if not deduped:
            deduped.append(marker)
        else:
            last = deduped[-1]
            if (marker["frame"] - last["frame"] < 5 and
                marker["type"] == last["type"] and
                marker.get("energy", 0) > last.get("energy", 0)):
                deduped[-1] = marker
            else:
                deduped.append(marker)

    return {
        "version": "1.0",
        "audio_duration_s": duration,
        "tempo_bpm": float(tempo),
        "total_frames": int(duration * FPS),
        "markers": deduped,
        "stats": {
            "energy_peaks": len(energy_peaks),
            "pitch_shifts": len(pitch_markers),
            "pauses": len(pause_markers),
        }
    }


def export_for_remotion(markers: dict, output_path: str):
    """导出为 Remotion 可直接 import 的 TS 文件。"""
    ts_content = f"""/**
 * prosody-markers.ts — 自动生成，请勿手动修改
 * 生成时间: {__import__('datetime').date.today()}
 * 音频时长: {markers['audio_duration_s']:.2f}s
 * 标记总数: {len(markers['markers'])}
 */

export const prosodyMarkers = {json.dumps(markers, indent=2, ensure_ascii=False)} as const;

export const prosodyConfig = {{
  fps: {FPS},
  tempoBpm: {markers['tempo_bpm']},
  totalFrames: {markers['total_frames']},
}} as const;
"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path.replace('.json', '.ts'), 'w') as f:
        f.write(ts_content)
    with open(output_path, 'w') as f:
        json.dump(markers, f, indent=2, ensure_ascii=False)
    print(f"✅ 导出 TS: {output_path.replace('.json', '.ts')}")


def main():
    parser = argparse.ArgumentParser(description='语音韵律分析')
    parser.add_argument('--audio', default=None, help='音频文件路径')
    args = parser.parse_args()

    if args.audio:
        audio_path = args.audio
    else:
        # 默认查找最新的 TTS 输出
        audio_path = os.path.expanduser("~/video-gen/audio-tmp/narration_aligned.wav")
        if not os.path.exists(audio_path):
            audio_path = os.path.expanduser("~/video-gen/audio-tmp/narration_synced.wav")
        if not os.path.exists(audio_path):
            print("❌ 未找到音频文件，请用 --audio 指定")
            sys.exit(1)

    print(f"🎙️ 韵律分析: {audio_path}\n")

    result = analyze_prosody(audio_path)

    print(f"  音频时长: {result['audio_duration_s']:.2f}s")
    print(f"  估计语速: {result['tempo_bpm']:.0f} BPM")
    print(f"  能量峰值: {result['stats']['energy_peaks']} 个")
    print(f"  音调突变: {result['stats']['pitch_shifts']} 个")
    print(f"  停顿间隙: {result['stats']['pauses']} 个")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_json = os.path.join(OUTPUT_DIR, "prosody-markers.json")
    export_for_remotion(result, output_json)

    print(f"\n✅ 韵律分析完成！")
    print(f"   提示：在组件中使用 useCurrentFrame() 对比 prosodyMarkers.markers")


if __name__ == "__main__":
    main()
