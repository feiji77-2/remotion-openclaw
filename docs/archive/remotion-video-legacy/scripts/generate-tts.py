#!/usr/bin/env python3
"""TTS 配音生成脚本 — 使用 macOS say 命令生成中文配音"""

import subprocess
import os
import json
import argparse
import re
from pydub import AudioSegment

# ===== 配音文本 =====
# 每个片段对应视频中的一个镜头/时间段
NARRATIONS = [
    {
        "id": "title",
        "start_frame": 0,
        "duration_frames": 90,
        "text": "一条命令，完成AI视频封面设计，23种场景全自动",
        "voice": "Shelley",
    },
    {
        "id": "concept",
        "start_frame": 90,
        "duration_frames": 120,
        "text": "核心概念：基于人工智能技术，自动理解内容并匹配最佳呈现方案，一键生成专业级视频封面",
        "voice": "Shelley",
    },
    {
        "id": "flowchart",
        "start_frame": 210,
        "duration_frames": 240,
        "text": "五步流水线工作流程：第一步，输入视频主题文案；第二步，AI智能分析理解内容意图；第三步，自动匹配最佳场景模板；第四步，一键渲染输出视频封面；第五步，多平台一键分发发布。",
        "voice": "Shelley",
    },
    {
        "id": "terminal",
        "start_frame": 450,
        "duration_frames": 240,
        "text": "让我们来看实际效果。输入命令，指定场景数量，AI自动完成全部分析和渲染，无需任何手动干预。",
        "voice": "Shelley",
    },
    {
        "id": "scenegrid",
        "start_frame": 690,
        "duration_frames": 360,
        "text": "支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案。",
        "voice": "Shelley",
    },
    {
        "id": "countup",
        "start_frame": 1050,
        "duration_frames": 180,
        "text": "覆盖23个以上场景，一键生成，全自动处理。",
        "voice": "Shelley",
    },
    {
        "id": "dialog_user1",
        "start_frame": 1230,
        "duration_frames": 75,
        "text": "帮我做一个AI视频封面",
        "voice": "Meijia",
    },
    {
        "id": "dialog_ai1",
        "start_frame": 1305,
        "duration_frames": 112,
        "text": "好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出，预计30秒内完成。",
        "voice": "Shelley",
    },
    {
        "id": "dialog_user2",
        "start_frame": 1417,
        "duration_frames": 56,
        "text": "需要多久？",
        "voice": "Meijia",
    },
    {
        "id": "dialog_ai2",
        "start_frame": 1473,
        "duration_frames": 57,
        "text": "预计30秒以内，正在渲染中，请稍候。",
        "voice": "Shelley",
    },
    {
        "id": "bullets",
        "start_frame": 1530,
        "duration_frames": 300,
        "text": "核心优势：全自动处理，无需手动调整。23种场景智能匹配。一键生成多平台版本。免费使用，无需信用卡。",
        "voice": "Shelley",
    },
    {
        "id": "wordcloud",
        "start_frame": 1830,
        "duration_frames": 300,
        "text": "AI自动化，视频封面，一键生成，免费高效，智能匹配，多平台实时预览，批量处理。",
        "voice": "Shelley",
    },
    {
        "id": "cta",
        "start_frame": 2130,
        "duration_frames": 360,
        "text": "立即体验，免费开始，无需信用卡。AI创作新方式，从现在开始。",
        "voice": "Shelley",
    },
]

FPS = 30
TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
OUTPUT_WAV = os.path.join(TMP_DIR, "narration.wav")
os.makedirs(TMP_DIR, exist_ok=True)


def run_cmd(cmd, timeout=60):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        print(f"  [!] {' '.join(cmd) if isinstance(cmd, list) else cmd}")
        print(f"     stderr: {result.stderr[:200]}")
    return result.returncode == 0


def generate_single_tts(text, voice, output_path):
    """用 say 命令生成单条 TTS，输出为 CAF 格式再转 WAV"""
    caf_path = output_path.replace(".wav", ".caf")
    # macOS say 命令
    # say 支持直接传文本作为参数
    proc = subprocess.run(
        ["say", "-v", voice, "-o", caf_path, text],
        capture_output=True,
        timeout=30,
    )
    if proc.returncode != 0:
        print(f"  [!] say failed: {proc.stderr[:100]}")
        return False
    # CAF -> WAV
    ok = run_cmd(["ffmpeg", "-y", "-i", caf_path, "-ar", "44100", "-ac", "2", output_path])
    try:
        os.remove(caf_path)
    except:
        pass
    return ok


def get_duration_wav(wav_path):
    """获取 WAV 文件时长（秒）"""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", wav_path],
        capture_output=True, text=True
    )
    try:
        import json as json_lib
        d = json_lib.loads(result.stdout)
        return float(d["format"]["duration"])
    except:
        return 0


def main():
    print("🎙️ 开始生成配音...\n")
    print(f"输出目录: {TMP_DIR}\n")

    all_segments = []
    total_duration = 0

    for i, seg in enumerate(NARRATIONS):
        print(f"[{i+1}/{len(NARRATIONS)}] {seg['id']}: {seg['text'][:40]}...")
        seg_wav = os.path.join(TMP_DIR, f"seg_{i:02d}_{seg['id']}.wav")

        ok = generate_single_tts(seg["text"], seg["voice"], seg_wav)
        if not ok or not os.path.exists(seg_wav):
            print(f"  [!] 生成失败，跳过\n")
            continue

        dur = get_duration_wav(seg_wav)
        print(f"  ✓ {dur:.2f}s\n")
        all_segments.append({
            **seg,
            "wav_path": seg_wav,
            "duration_s": dur,
        })

    if not all_segments:
        print("没有生成任何配音片段！")
        return

    # 计算每段起始时间（秒）
    print("\n📐 拼接配音...")
    current_time = 0
    segment_times = []
    for seg in all_segments:
        segment_times.append({
            **seg,
            "start_s": current_time,
        })
        current_time += seg["duration_s"]

    total_time = current_time
    print(f"总配音时长: {total_time:.2f}s")

    # 生成空白填充音频，然后拼接各段
    from pydub import AudioSegment
    silence = AudioSegment.silent(duration=100, frame_rate=44100)  # 100ms silence

    # 合并所有片段（含间隙填充）
    combined = AudioSegment.empty()
    for i, seg in enumerate(segment_times):
        seg_audio = AudioSegment.from_wav(seg["wav_path"])
        # 计算目标起始时间
        target_start_ms = int(seg["start_s"] * 1000)
        current_ms = len(combined)
        # 如果有间隙，填充静音
        if current_ms < target_start_ms:
            combined += AudioSegment.silent(duration=target_start_ms - current_ms, frame_rate=44100)
        combined += seg_audio

    # 导出
    print(f"\n💾 导出到: {OUTPUT_WAV}")
    combined.export(OUTPUT_WAV, format="wav")

    # 清理临时文件
    for seg in segment_times:
        try:
            os.remove(seg["wav_path"])
        except:
            pass

    # 输出时间轴 JSON
    timeline_path = os.path.join(TMP_DIR, "timeline.json")
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump(segment_times, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 完成！")
    print(f"   配音文件: {OUTPUT_WAV}")
    print(f"   时间轴:   {timeline_path}")
    print(f"   总时长:   {total_time:.2f}s")


if __name__ == "__main__":
    main()
