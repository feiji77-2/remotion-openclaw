#!/usr/bin/env python3
"""
Remotion 视频流水线 — 简洁可靠版

核心原则：
- Video1v4.tsx 手写但数据从 segments_meta.json 读取（禁止硬编码）
- pipeline 只管 TTS → 拼接 → 验证 → 渲染 → 合并
- 每步有验证，失败即停

用法:
  python pipeline.py                    # 完整流水线
  python pipeline.py --step verify      # 验证TTS时长是否匹配
  python pipeline.py --step render      # 只渲染
"""

import argparse
import json
import subprocess
import sys
import re
from pathlib import Path
from typing import List, Optional

# ===== 配置 =====
PROJECT_DIR = Path.home() / "video-gen"
AUDIO_DIR = PROJECT_DIR / "audio-tmp"
OUT_DIR = PROJECT_DIR / "out"
VOICE = "zh-CN-XiaoxiaoNeural"
FPS = 30
TRANSITION_FRAMES = 20


def run(cmd: List[str], cwd: Optional[str] = None, check: bool = True) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, cwd=cwd or str(PROJECT_DIR),
                           capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"  ❌ 命令失败: {' '.join(cmd)}")
        print(f"     {result.stderr[:500]}")
        sys.exit(1)
    return result


def load_segments() -> List[dict]:
    """优先读 WhisperX 实测合同 v4h，fallback 到旧版"""
    v4h = AUDIO_DIR / "segments_meta_v4h.json"
    legacy = AUDIO_DIR / "segments_meta.json"
    if v4h.exists():
        with open(v4h) as f:
            data = json.load(f)
            print(f"  📋 加载合同: segments_meta_v4h.json ({len(data)} shots)")
            return data
    with open(legacy) as f:
        data = json.load(f)
        print(f"  📋 加载合同: segments_meta.json (legacy, {len(data)} shots)")
        return data


# ===== Step 1: TTS（仅 v4h_narration.mp3 — legacy 已废弃）=====
def step_tts(segments: List[dict]):
    v4h_narration = AUDIO_DIR / "v4h_narration.mp3"
    if v4h_narration.exists():
        print("⏭️  TTS 跳过：v4h_narration.mp3 已存在")
    else:
        print("❌ TTS 失败：v4h_narration.mp3 不存在，请先运行 harness 流程生成配音")
        sys.exit(1)


# ===== Step 2: 拼接配音（仅 v4h_narration.mp3 — legacy 已废弃）=====
def step_concat(segments: List[dict]):
    v4h_narration = AUDIO_DIR / "v4h_narration.mp3"
    if v4h_narration.exists():
        dur = float(run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "csv=p=0", str(v4h_narration)
        ], check=False).stdout.strip())
        size = v4h_narration.stat().st_size / 1024 / 1024
        print(f"⏭️  concat 跳过：v4h_narration.mp3 已存在（{dur:.2f}s / {size:.1f}MB）")
    else:
        print("❌ concat 失败：v4h_narration.mp3 不存在，请先运行 harness 流程")
        sys.exit(1)


# ===== Step 3: 验证时长（仅 v4h_narration.mp3）=====
def step_verify(segments: List[dict]):
    print("🔍 验证配音时长是否匹配合同...")

    v4h_narration = AUDIO_DIR / "v4h_narration.mp3"
    if not v4h_narration.exists():
        print("❌ verify 失败：v4h_narration.mp3 不存在")
        sys.exit(1)

    dur = float(run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(v4h_narration)
    ], check=False).stdout.strip())
    frames = int(dur * FPS)
    last = segments[-1]
    expected_total = last["startFrame"] + last["duration_frames"] + TRANSITION_FRAMES
    expected_dur = expected_total / FPS
    diff_pct = abs(dur - expected_dur) / expected_dur * 100
    if diff_pct < 5:
        print(f"  ✅ v4h_narration.mp3: {dur:.2f}s / {frames}帧 (合同 {expected_dur:.2f}s，偏差 {diff_pct:.1f}%)")
    else:
        print(f"  ⚠️  v4h_narration.mp3 时长偏差 {diff_pct:.1f}%，请检查")
        sys.exit(1)


# ===== Step 4: TS 检查 =====
def step_tsc():
    result = run(["npx", "tsc", "--noEmit"], check=False)
    if result.returncode == 0:
        print("  ✅ TS 检查通过")
        return True
    else:
        print(f"  ❌ TS 检查失败:")
        lines = result.stdout.splitlines()[:20]
        for l in lines:
            print(f"     {l}")
        sys.exit(1)


# ===== Step 5: 渲染 =====
def step_render():
    print("🎬 渲染中...")
    output = OUT_DIR / "hermes_openclaw_v4.mp4"

    # 检查是否已有 output，有则先删除
    if output.exists():
        output.unlink()

    proc = subprocess.Popen([
        "npx", "remotion", "render",
        "src/Root.tsx", "Video1v4",
        str(output),
        "--crf=20", "--concurrency=8"
    ], cwd=str(PROJECT_DIR), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    last_progress = ""
    for line in proc.stdout:
        # 只打印进度行
        if "remaining" in line or "Encoded" in line or "Rendered" in line:
            # 提取帧数和剩余时间
            m = re.search(r'Rendered\s+(\d+)/(\d+).*?remaining[:\s]+(\d+\S+)', line)
            if m:
                cur, total, remaining = m.groups()
                if cur != last_progress:
                    print(f"  {cur}/{total}  remaining={remaining}", flush=True)
                    last_progress = cur

    proc.wait()
    if proc.returncode == 0:
        size = output.stat().st_size / 1024 / 1024
        print(f"  ✅ 渲染完成: {output} ({size:.1f}MB)")
        return True
    else:
        print(f"  ❌ 渲染失败")
        sys.exit(1)


# ===== Step 6: 合并音视频 =====
def step_merge():
    print("🔊 合并音视频...")
    video = OUT_DIR / "hermes_openclaw_v4.mp4"
    # 优先 harness v4h 配音，fallback 到 legacy
    audio_v4h = AUDIO_DIR / "v4h_narration.mp3"
    audio_legacy = AUDIO_DIR / "narration_v4.mp3"
    audio = audio_v4h if audio_v4h.exists() else audio_legacy
    final = OUT_DIR / "hermes_openclaw_v4_final.mp4"

    if not video.exists():
        print(f"  ❌ 视频不存在: {video}")
        sys.exit(1)
    if not audio.exists():
        print(f"  ❌ 配音不存在（尝试过 v4h 和 legacy）: {audio}")
        sys.exit(1)

    source = "v4h" if audio == audio_v4h else "legacy"
    print(f"  使用配音: {audio.name} [{source}]")

    run([
        "ffmpeg", "-y",
        "-i", str(video), "-i", str(audio),
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        str(final)
    ])

    size = final.stat().st_size / 1024 / 1024
    print(f"  ✅ 合并完成: {final} ({size:.1f}MB)")


# ===== Step 7: QA =====
def step_qa():
    print("🔍 QA 验证...")
    final = OUT_DIR / "hermes_openclaw_v4_final.mp4"

    if not final.exists():
        print(f"  ❌ 文件不存在: {final}")
        return

    v = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_name,width,height,nb_frames,r_frame_rate",
             "-of", "csv=p=0", str(final)], check=False)
    a = run(["ffprobe", "-v", "error", "-select_streams", "a:0",
             "-show_entries", "stream=sample_rate,channels,codec_name",
             "-of", "csv=p=0", str(final)], check=False)
    d = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(final)], check=False)
    size = final.stat().st_size / 1024 / 1024

    print(f"  视频: {v.stdout.strip()}")
    print(f"  音频: {a.stdout.strip()}")
    print(f"  时长: {d.stdout.strip()}s")
    print(f"  大小: {size:.1f}MB")
    print(f"  ✅ QA 完成")


# ===== 主流程 =====
def main():
    parser = argparse.ArgumentParser(description="Remotion 视频流水线")
    parser.add_argument("--step", choices=[
        "all", "tts", "concat", "verify", "tsc", "render", "merge", "qa"
    ], default="all")
    args = parser.parse_args()

    # 加载 segments
    try:
        segments = load_segments()
    except FileNotFoundError:
        print("❌ segments_meta.json 不存在！")
        sys.exit(1)

    print(f"📋 {len(segments)} 个镜头 | FPS={FPS} | 转场={TRANSITION_FRAMES}帧")

    if args.step == "all":
        print("\n=== 完整流水线 ===")
        # 合同只在入口生成一次，所有 step 复用
        print("🧱 生成内容合同...")
        run(["npm", "run", "content:generate"])
        step_tts(segments)
        step_concat(segments)
        step_verify(segments)
        step_tsc()
        step_render()
        step_merge()
        step_qa()
        print("\n🎉 全部完成！")

    elif args.step == "tts":
        step_tts(segments)

    elif args.step == "concat":
        step_concat(segments)

    elif args.step == "verify":
        step_verify(segments)

    elif args.step == "tsc":
        step_tsc()

    elif args.step == "render":
        step_render()

    elif args.step == "merge":
        step_merge()

    elif args.step == "qa":
        step_qa()


if __name__ == "__main__":
    main()
