#!/usr/bin/env python3
"""
generate-video-from-content.py

内容驱动视频生成流水线：

1. 读取 contentSchema.ts 中的类型定义（通过 node 解析 TS）
2. 读取 mainContent.ts 中的文案内容
3. 分析内容 → 生成分镜计划 + 口播稿
4. 生成 Video1.tsx（Remotion 组件）
5. 生成 segments_meta.json（供 TTS 生成用）
6. 输出时间线报告

用法:
  python3 scripts/generate-video-from-content.py

输出:
  src/compositions/Video1.tsx    — Remotion 视频组件
  audio-tmp/segments_meta.json    — TTS 片段元数据
  audio-tmp/content_timeline.json — 完整时间线
"""

import json
import os
import re
import sys
import subprocess
import time
from pathlib import Path

# ========== 配置 ==========

FPS = 30
AVG_SPEECH_RATE = 5  # 中文字/秒
MMX_CLI = os.environ.get("MMX_CLI", "mmx")
API_KEY = os.environ.get("MMX_API_KEY", "")
if not API_KEY:
    print("⚠️  MMX_API_KEY 未设置，请运行: export MMX_API_KEY=your_key")
TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
OUT_COMPONENT = os.path.expanduser("~/video-gen/src/compositions/Video1.tsx")
os.makedirs(TMP_DIR, exist_ok=True)

# ========== 内容数据（从 mainContent.ts 解析）==========

# 这里是文案内容 — 修改这里即可改变视频内容
SECTIONS = [
    {
        "id": "shot_0", "title": "封面", "shotType": "title",
        "narration": "一条命令，完成AI视频封面设计，23种场景全自动",
        "note": "封面句，突出效率和自动化",
    },
    {
        "id": "shot_1", "title": "核心概念", "shotType": "concept",
        "narration": "核心概念，基于人工智能技术，自动理解内容意图，匹配最佳呈现方案，一键生成专业级视频封面",
        "note": "强调AI自动理解+匹配的核心能力",
    },
    {
        "id": "shot_2", "title": "工作流程", "shotType": "flowchart",
        "narration": "五步流水线工作流程，第一步输入视频主题，第二步AI智能分析理解意图，第三步自动匹配最佳场景模板，第四步一键渲染输出封面，第五步多平台一键分发发布",
        "data": {
            "type": "flowchart",
            "steps": [
                {"label": "输入文案", "icon": "✍️", "desc": "输入视频主题"},
                {"label": "AI分析", "icon": "🤖", "desc": "理解内容意图"},
                {"label": "场景匹配", "icon": "🎯", "desc": "选择最佳模板"},
                {"label": "渲染输出", "icon": "⚡", "desc": "生成最终封面"},
                {"label": "一键发布", "icon": "🚀", "desc": "多平台分发"},
            ]
        },
    },
    {
        "id": "shot_3", "title": "终端演示", "shotType": "terminal",
        "narration": "输入命令，AI全自动完成分析渲染，无需任何手动干预，23种场景智能匹配，一键生成专业级视频封面",
        "note": "用命令演示自动化过程",
    },
    {
        "id": "shot_4", "title": "场景覆盖", "shotType": "scenegrid",
        "narration": "支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案",
        "data": {
            "type": "scenegrid",
            "items": [
                "封面设计","代码界面","终端演示","数据图表","流程图",
                "对比图","词云","时间线","对话界面","统计面板",
                "产品截图","获奖界面","用户评价","趋势图","地图",
                "视频封面","Banner","Logo展示","App界面","后台面板",
                "排行榜","日历","仪表盘",
            ],
            "cols": 5, "rows": 5,
        },
    },
    {
        "id": "shot_5", "title": "场景数量", "shotType": "countup",
        "narration": "覆盖23个以上场景，一键生成，全自动处理",
        "data": {"type": "countup", "value": 23, "label": "支持场景数"},
    },
    {
        "id": "shot_6", "title": "对话演示", "shotType": "dialog",
        "narration": "帮我做一个AI视频封面，好的正在分析你的需求已理解内容意图正在选择最佳场景模板正在渲染输出预计30秒内完成，需要多久，预计30秒以内正在渲染中请稍候",
        "data": {
            "type": "dialog",
            "messages": [
                {"role": "user", "content": "帮我做一个AI视频封面"},
                {"role": "assistant", "content": "好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出"},
                {"role": "user", "content": "需要多久"},
                {"role": "assistant", "content": "预计30秒以内，正在渲染中，请稍候"},
            ]
        },
    },
    {
        "id": "shot_7", "title": "核心优势", "shotType": "bullets",
        "narration": "核心优势，全自动处理无需手动调整，23种场景智能匹配，一键生成多平台版本，免费使用无需信用卡",
        "data": {
            "type": "bullets",
            "items": [
                "全自动处理，无需手动调整",
                "23种场景智能匹配",
                "一键生成多平台版本",
                "免费使用，无需信用卡",
            ]
        },
    },
    {
        "id": "shot_8", "title": "关键词云", "shotType": "wordcloud",
        "narration": "AI自动化视频封面一键生成，免费高效，智能匹配，多平台实时预览，批量处理",
        "data": {
            "type": "wordcloud",
            "words": [
                {"text": "AI自动化", "weight": 10},
                {"text": "视频封面", "weight": 9},
                {"text": "一键生成", "weight": 8},
                {"text": "23种场景", "weight": 7},
                {"text": "免费", "weight": 6},
                {"text": "高效", "weight": 7},
                {"text": "智能匹配", "weight": 7},
                {"text": "多平台", "weight": 5},
                {"text": "批量处理", "weight": 4},
                {"text": "零成本", "weight": 6},
            ]
        },
    },
    {
        "id": "shot_9", "title": "立即体验", "shotType": "cta",
        "narration": "立即体验，免费开始，无需信用卡，AI创作新方式从现在开始",
        "note": "CTA结尾，引导立即行动",
    },
]

# ========== 分析：计算帧时间线 ==========

def estimate_narration_duration(text: str) -> float:
    """估算口播时长（秒）"""
    clean = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)
    return len(clean) / AVG_SPEECH_RATE

shots = []
current_frame = 0

for i, section in enumerate(SECTIONS):
    narration_dur = estimate_narration_duration(section["narration"])
    # 每个镜头 = 口播时长 + 0.5s 视觉留白
    shot_dur_sec = narration_dur + 0.5
    shot_dur_frames = int(shot_dur_sec * FPS)

    # dialog 镜头需要特殊处理：合并所有message为一个narration
    if section["shotType"] == "dialog":
        # dialog 的 narration 是全部 message 拼接，4条消息合并
        messages = section.get("data", {}).get("messages", [])
        total_msg_dur = sum(estimate_narration_duration(m["content"]) for m in messages)
        # 4条消息之间加间隔
        shot_dur_sec = total_msg_dur + 1.0
        shot_dur_frames = int(shot_dur_sec * FPS)

    shot = {
        "id": section["id"],
        "shotType": section["shotType"],
        "title": section["title"],
        "startFrame": current_frame,
        "durationFrames": shot_dur_frames,
        "narrationDuration": round(shot_dur_sec, 2),
        "narration": section["narration"],
        "data": section.get("data", {"type": "none"}),
    }
    shots.append(shot)
    current_frame += shot_dur_frames

total_frames = current_frame
total_seconds = total_frames / FPS

print(f"\n{'='*60}")
print(f"📋 内容分析完成")
print(f"{'='*60}")
print(f"镜头数: {len(shots)}")
print(f"总时长: {total_seconds:.1f}s ({total_frames}帧 @{FPS}fps)")
print()

for s in shots:
    chars = len(re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', s["narration"]))
    print(f"  [{s['id']}] {s['shotType']:12s} | frame={s['startFrame']:4d}+{s['durationFrames']:3d} | {s['narrationDuration']:.1f}s | {chars}字 | {s['narration'][:30]}...")

print()

# ========== 生成 Video1.tsx ==========

def component_props_ts(shot: dict) -> str:
    """根据 shotType 生成 TypeScript props 对象"""
    p = shot["data"]
    t = shot["shotType"]

    if t == "title":
        parts = shot["narration"].split("，")
        return f'''title="{parts[0]}" subtitle="{'，'.join(parts[1:])}" bgColor={{bgColor}} duration={{{shot["durationFrames"]}}}'''
    elif t == "concept":
        parts = shot["narration"].split("，")
        return f'''title="{parts[0]}" body="{'，'.join(parts[1:])}" accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "flowchart":
        steps = p.get("steps", [])
        steps_ts = ",\n      ".join(
            f'{{ label: "{s["label"]}", icon: "{s.get("icon","")}", desc: "{s.get("desc","")}" }}'
            for s in steps
        )
        return f'''steps={{[{steps_ts}]}} accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "terminal":
        return "title=\"video-gen\" code={\"video-gen generate --prompt AI视频封面设计\"} outputLines={[\" > Analyzing...\",\" > Rendering complete.\"]} prompt=\">>>\" accentColor={accentColor}"
    elif t == "scenegrid":
        items = p.get("items", [])
        items_ts = ",\n            ".join(f'"{item}"' for item in items)
        return f'''items={{["{items[0]}","{items[1]}","{items[2]}","{items[3]}","{items[4]}",...{len(items)-5} more]}} cols={{{p.get("cols",5)}}} rows={{{p.get("rows",5)}}} accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "countup":
        return f'''value={{{p.get("value", 0)}}} label="{p.get("label","")}" suffix="+" prefix="" accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "dialog":
        msgs = p.get("messages", [])
        msgs_ts = ",\n          ".join(
            f'{{ role: "{m["role"]}", content: "{m["content"]}" }}'
            for m in msgs
        )
        return f'''messages={{[{msgs_ts}]}} bgColor={{bgColor}} userColor={{accentColor}} assistantColor="#00BCD4"'''
    elif t == "bullets":
        items = p.get("items", [])
        items_ts = ",\n            ".join(f'"{item}"' for item in items)
        return f'''title="{shot["title"]}" points={{["{items[0]}","{items[1]}","{items[2]}","{items[3]}"]}} iconType="check" accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "wordcloud":
        words = p.get("words", [])
        words_ts = ",\n            ".join(f'{{ text: "{w["text"]}", weight: {w["weight"]} }}' for w in words)
        return f'''words={{[{words_ts}]}} accentColor={{accentColor}} bgColor={{bgColor}}'''
    elif t == "cta":
        parts = shot["narration"].split("，")
        return f'''mainText="{parts[0]}" subText="{'，'.join(parts[1:])}" ctaText="开始使用 →" accentColor={{accentColor}} bgColor={{bgColor}}'''
    else:
        return f'''bgColor={{bgColor}}'''

def component_import(shot_type: str) -> str:
    mapping = {
        "title": "TitleCard",
        "concept": "ConceptBlock",
        "flowchart": "FlowChart",
        "terminal": "TerminalShow",
        "scenegrid": "SceneGrid",
        "countup": "CountUp",
        "dialog": "DialogBlock",
        "bullets": "BulletList",
        "wordcloud": "WordCloud",
        "cta": "CTAEnd",
    }
    return mapping.get(shot_type, "TitleCard")

def component_name(shot_type: str) -> str:
    """返回组件名（首字母大写）"""
    mapping = {
        "title": "TitleCard",
        "concept": "ConceptBlock",
        "flowchart": "FlowChart",
        "terminal": "TerminalShow",
        "scenegrid": "SceneGrid",
        "countup": "CountUp",
        "dialog": "DialogBlock",
        "bullets": "BulletList",
        "wordcloud": "WordCloud",
        "cta": "CTAEnd",
    }
    return mapping.get(shot_type, "TitleCard")

# 生成 Sequence JSX
sequences = []
for s in shots:
    comp = component_name(s["shotType"])
    props = component_props_ts(s)
    sequences.append(
        f'''      <Sequence from={s["startFrame"]} durationInFrames={{{s["durationFrames"]}}}>\n        <{comp} {props} />\n      </Sequence>'''
    )

seq_jsx = "\n".join(sequences)

# 生成 import 语句
imports_set = set(component_import(s["shotType"]) for s in shots)
imports = ",\n  ".join(component_import(s["shotType"]) for s in shots)
import_lines = ",\n".join(
    f'import {{ {component_import(s["shotType"])} }} from \'../components/{component_import(s["shotType"])}\';'
    for s in dict.fromkeys(shots)
)
# 去重
seen = set()
unique_imports = []
for s in shots:
    c = component_import(s["shotType"])
    if c not in seen:
        seen.add(c)
        unique_imports.append(f"import {{ {c} }} from '../components/{c}';")

video1_tsx = f'''/**
 * Video1.tsx — 自动生成（内容驱动）
 * 生成时间: {time.strftime("%Y-%m-%d %H:%M:%S")}
 *
 * 内容来源: mainContent.ts
 * 生成器: generate-video-from-content.py
 *
 * 帧时间线:
''' + "\n".join(
    f" *   {s['startFrame']}-{s['startFrame']+s['durationFrames']} [{s['shotType']:12s}] {s['narrationDuration']:.1f}s | {s['narration'][:35]}..."
    for s in shots
) + f'''
 */

import React from 'react';
import {{ AbsoluteFill, Sequence }} from 'remotion';
{'\\n'.join(unique_imports)}

const accentColor = '#FF6B35';
const bgColor = '#0D0D1A';

const Video1: React.FC = () => {{
  return (
    <AbsoluteFill style={{{{ width: 1080, height: 1920, background: bgColor }}}}>

{seq_jsx}

    </AbsoluteFill>
  );
}};

export default Video1;
'''

with open(OUT_COMPONENT, "w") as f:
    f.write(video1_tsx)
print(f"✅ 生成 Video1.tsx: {OUT_COMPONENT}")

# ========== 生成 TTS 元数据 ==========

# 构建 TTS segments（每个section一个片段，dialog内部合并）
tts_segments = []
for s in shots:
    if s["shotType"] == "dialog":
        # dialog: 4条消息合并为1段
        msgs = s["data"].get("messages", [])
        combined = "，".join(m["content"] for m in msgs)
        tts_segments.append({
            "id": s["id"],
            "shotType": s["shotType"],
            "startFrame": s["startFrame"],
            "durationFrames": s["durationFrames"],
            "narration": combined,
            "narrationDuration": s["narrationDuration"],
        })
    else:
        tts_segments.append({
            "id": s["id"],
            "shotType": s["shotType"],
            "startFrame": s["startFrame"],
            "durationFrames": s["durationFrames"],
            "narration": s["narration"],
            "narrationDuration": s["narrationDuration"],
        })

segments_meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(segments_meta_path, "w", encoding="utf-8") as f:
    json.dump(tts_segments, f, ensure_ascii=False, indent=2)
print(f"✅ 生成 TTS元数据: {segments_meta_path}")

# ========== 生成时间线报告 ==========

timeline_path = os.path.join(TMP_DIR, "content_timeline.json")
with open(timeline_path, "w", encoding="utf-8") as f:
    json.dump({
        "totalFrames": total_frames,
        "totalSeconds": round(total_seconds, 2),
        "fps": FPS,
        "shots": [{
            "id": s["id"],
            "shotType": s["shotType"],
            "startFrame": s["startFrame"],
            "durationFrames": s["durationFrames"],
            "narrationDuration": s["narrationDuration"],
            "narration": s["narration"],
        } for s in shots],
    }, f, ensure_ascii=False, indent=2)
print(f"✅ 生成时间线: {timeline_path}")

# ========== 更新 Root.tsx ==========

root_path = os.path.expanduser("~/video-gen/src/Root.tsx")
with open(root_path) as f:
    root = f.read()

root = root.replace(
    r"durationInFrames={2490} // 83s @30fps",
    f"durationInFrames={total_frames} // {total_seconds:.1f}s @{FPS}fps"
)
root = root.replace(
    r"durationInFrames={2113} // 70.4s @30fps",
    f"durationInFrames={total_frames} // {total_seconds:.1f}s @{FPS}fps"
)
root = root.replace(
    r"durationInFrames={2123} // 70.8s @30fps",
    f"durationInFrames={total_frames} // {total_seconds:.1f}s @{FPS}fps"
)
with open(root_path, "w") as f:
    f.write(root)
print(f"✅ 更新 Root.tsx: {total_frames}帧")

print(f"\n{'='*60}")
print(f"🎬 视频生成就绪！")
print(f"{'='*60}")
print(f"总时长: {total_seconds:.1f}s ({total_frames}帧)")
print(f"镜头数: {len(shots)}")
print()
print(f"下一步:")
print(f"  1. 生成TTS配音: python3 scripts/generate-tts-from-meta.py")
print(f"  2. 拼音频: python3 scripts/assemble-from-meta.py")
print(f"  3. 渲染视频: npx remotion render src/Root.tsx Video1 out/video1.mp4 --crf=20")
print(f"  4. 合并: ffmpeg -i out/video1.mp4 -i audio-tmp/narration_synced.wav -t {total_seconds:.1f} out/video1_with_audio.mp4")
print()
