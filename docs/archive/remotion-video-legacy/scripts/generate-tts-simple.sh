#!/bin/bash
# TTS 配音生成 — 用 say 命令行直接生成，简单可靠

TMPDIR="$HOME/video-gen/audio-tmp"
mkdir -p "$TMPDIR"
OUT="$TMPDIR/narration.wav"
rm -f "$TMPDIR"/seg_*.wav "$TMPDIR"/narration.wav "$TMPDIR"/timeline.json

FPS=30

# [id, start_frame, duration_frames, voice, "text"]
declare -a SEGMENTS=(
  "title|0|90|Shelley|一条命令，完成AI视频封面设计，23种场景全自动"
  "concept|90|120|Shelley|核心概念：基于人工智能技术，自动理解内容并匹配最佳呈现方案，一键生成专业级视频封面"
  "flowchart|210|240|Shelley|五步流水线工作流程：第一步输入视频主题文案，第二步AI智能分析理解内容意图，第三步自动匹配最佳场景模板，第四步一键渲染输出视频封面，第五步多平台一键分发发布"
  "terminal|450|240|Shelley|让我们来看实际效果。输入命令指定场景数量，AI自动完成全部分析和渲染，无需任何手动干预"
  "scenegrid|690|360|Shelley|支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案"
  "countup|1050|180|Shelley|覆盖23个以上场景，一键生成，全自动处理"
  "dialog_user1|1230|75|Meijia|帮我做一个AI视频封面"
  "dialog_ai1|1305|112|Shelley|好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出，预计30秒内完成"
  "dialog_user2|1417|56|Meijia|需要多久"
  "dialog_ai2|1473|57|Shelley|预计30秒以内，正在渲染中，请稍候"
  "bullets|1530|300|Shelley|核心优势：全自动处理，无需手动调整。23种场景智能匹配。一键生成多平台版本。免费使用，无需信用卡"
  "wordcloud|1830|300|Shelley|AI自动化，视频封面，一键生成，免费高效，智能匹配，多平台实时预览，批量处理"
  "cta|2130|360|Shelley|立即体验，免费开始，无需信用卡。AI创作新方式，从现在开始"
)

# 生成每段音频
for seg in "${SEGMENTS[@]}"; do
  IFS='|' read -r id start_frame dur voice text <<< "$seg"
  wav="$TMPDIR/seg_${id}.wav"
  echo "[$id] ${text:0:30}... (frame $start_frame, ${dur}f)"
  say -v "$voice" -o "$TMPDIR/tmp_${id}.aiff" -- "$text" 2>/dev/null
  ffmpeg -y -i "$TMPDIR/tmp_${id}.aiff" -ar 44100 -ac 2 "$wav" 2>/dev/null
  rm -f "$TMPDIR/tmp_${id}.aiff"
  if [ -f "$wav" ]; then
    echo "  -> $(python3 -c "from pydub import AudioSegment; a=AudioSegment.from_wav('$wav'); print(f'{len(a)/1000:.2f}s')")"
  else
    echo "  -> FAILED"
  fi
done

# 收集有效片段并计算时间
python3 << 'PYEOF'
import subprocess, os, json
from pydub import AudioSegment

TMPDIR = os.path.expanduser("~/video-gen/audio-tmp")
FPS = 30

segments = []
current_time = 0.0

# Read from bash array (passed as lines)
import sys
lines = []
for seg in """title|0|90|Shelley|一条命令，完成AI视频封面设计，23种场景全自动
concept|90|120|Shelley|核心概念：基于人工智能技术，自动理解内容并匹配最佳呈现方案，一键生成专业级视频封面
flowchart|210|240|Shelley|五步流水线工作流程：第一步输入视频主题文案，第二步AI智能分析理解内容意图，第三步自动匹配最佳场景模板，第四步一键渲染输出视频封面，第五步多平台一键分发发布
terminal|450|240|Shelley|让我们来看实际效果。输入命令指定场景数量，AI自动完成全部分析和渲染，无需任何手动干预
scenegrid|690|360|Shelley|支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案
countup|1050|180|Shelley|覆盖23个以上场景，一键生成，全自动处理
dialog_user1|1230|75|Meijia|帮我做一个AI视频封面
dialog_ai1|1305|112|Shelley|好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出，预计30秒内完成
dialog_user2|1417|56|Meijia|需要多久
dialog_ai2|1473|57|Shelley|预计30秒以内，正在渲染中，请稍候
bullets|1530|300|Shelley|核心优势：全自动处理，无需手动调整。23种场景智能匹配。一键生成多平台版本。免费使用，无需信用卡
wordcloud|1830|300|Shelley|AI自动化，视频封面，一键生成，免费高效，智能匹配，多平台实时预览，批量处理
cta|2130|360|Shelley|立即体验，免费开始，无需信用卡。AI创作新方式，从现在开始""".strip().split('\n'):
    parts = seg.split('|')
    id, start_frame, dur_frames, voice, text = parts[0], int(parts[1]), int(parts[2]), parts[3], '|'.join(parts[4:])
    wav = f"{TMPDIR}/seg_{id}.wav"
    if not os.path.exists(wav):
        print(f"  [!] {id} wav not found, skipping")
        continue
    audio = AudioSegment.from_wav(wav)
    dur_s = len(audio) / 1000.0
    segments.append({
        'id': id,
        'start_frame': start_frame,
        'start_s': current_time,
        'duration_frames': dur_frames,
        'audio_duration_s': dur_s,
        'text': text
    })
    current_time += dur_s

print(f"\n总配音时长: {current_time:.2f}s")

# 拼接音频（加silence填充到每个片段的目标起始时间）
combined = AudioSegment.empty()
for seg in segments:
    target_start_ms = int(seg['start_s'] * 1000)
    current_ms = len(combined)
    if current_ms < target_start_ms:
        combined += AudioSegment.silent(duration=target_start_ms - current_ms)
    seg_audio = AudioSegment.from_wav(f"{TMPDIR}/seg_{seg['id']}.wav")
    combined += seg_audio

out_wav = f"{TMPDIR}/narration.wav"
combined.export(out_wav, format='wav')
print(f"导出: {out_wav}")
print(f"总时长: {len(combined)/1000:.2f}s")

# 保存时间轴
timeline = [{'id': s['id'], 'start_frame': s['start_frame'], 'start_s': round(s['start_s'], 3), 'duration_s': round(s['audio_duration_s'], 3), 'text': s['text']} for s in segments]
with open(f"{TMPDIR}/timeline.json", 'w', encoding='utf-8') as f:
    json.dump(timeline, f, ensure_ascii=False, indent=2)
print(f"时间轴: {TMPDIR}/timeline.json")
print("\n✅ 完成!")
PYEOF
