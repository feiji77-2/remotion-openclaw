#!/usr/bin/env python3
"""generate-video.py — 内容驱动视频生成（无 f-string 嵌套问题）"""

import json, os, re, time
from pathlib import Path

FPS = 30
AVG_SPEECH_RATE = 5

TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
OUT_COMPONENT = os.path.expanduser("~/video-gen/src/compositions/Video1.tsx")
os.makedirs(os.path.dirname(OUT_COMPONENT), exist_ok=True)

SECTIONS = [
    {"id": "shot_0", "title": "封面", "shotType": "title",
     "narration": "一条命令，完成AI视频封面设计，23种场景全自动"},
    {"id": "shot_1", "title": "核心概念", "shotType": "concept",
     "narration": "核心概念，基于人工智能技术，自动理解内容意图，匹配最佳呈现方案，一键生成专业级视频封面"},
    {"id": "shot_2", "title": "工作流程", "shotType": "flowchart",
     "narration": "五步流水线工作流程，第一步输入视频主题，第二步AI智能分析理解意图，第三步自动匹配最佳场景模板，第四步一键渲染输出封面，第五步多平台一键分发发布",
     "data": {"type": "flowchart", "steps": [
         {"label": "输入文案", "icon": "✍️", "desc": "输入视频主题"},
         {"label": "AI分析", "icon": "🤖", "desc": "理解内容意图"},
         {"label": "场景匹配", "icon": "🎯", "desc": "选择最佳模板"},
         {"label": "渲染输出", "icon": "⚡", "desc": "生成最终封面"},
         {"label": "一键发布", "icon": "🚀", "desc": "多平台分发"},
     ]}},
    {"id": "shot_3", "title": "终端演示", "shotType": "terminal",
     "narration": "输入命令，AI全自动完成分析渲染，无需任何手动干预，23种场景智能匹配，一键生成专业级视频封面"},
    {"id": "shot_4", "title": "场景覆盖", "shotType": "scenegrid",
     "narration": "支持23种场景自动匹配，覆盖封面设计、代码界面、数据图表、流程图、产品截图等全部主流视频类型，智能模板系统自动选择最佳呈现方案",
     "data": {"type": "scenegrid", "items": [
         "封面设计","代码界面","终端演示","数据图表","流程图",
         "对比图","词云","时间线","对话界面","统计面板",
         "产品截图","获奖界面","用户评价","趋势图","地图",
         "视频封面","Banner","Logo展示","App界面","后台面板",
         "排行榜","日历","仪表盘",
     ], "cols": 5, "rows": 5}},
    {"id": "shot_5", "title": "场景数量", "shotType": "countup",
     "narration": "覆盖23个以上场景，一键生成，全自动处理",
     "data": {"type": "countup", "value": 23, "label": "支持场景数"}},
    {"id": "shot_6", "title": "对话演示", "shotType": "dialog",
     "narration": "帮我做一个AI视频封面，好的正在分析你的需求已理解内容意图正在选择最佳场景模板正在渲染输出预计30秒内完成，需要多久，预计30秒以内正在渲染中请稍候",
     "data": {"type": "dialog", "messages": [
         {"role": "user", "content": "帮我做一个AI视频封面"},
         {"role": "assistant", "content": "好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出"},
         {"role": "user", "content": "需要多久"},
         {"role": "assistant", "content": "预计30秒以内，正在渲染中，请稍候"},
     ]}},
    {"id": "shot_7", "title": "核心优势", "shotType": "bullets",
     "narration": "核心优势，全自动处理无需手动调整，23种场景智能匹配，一键生成多平台版本，免费使用无需信用卡",
     "data": {"type": "bullets", "items": [
         "全自动处理，无需手动调整",
         "23种场景智能匹配",
         "一键生成多平台版本",
         "免费使用，无需信用卡",
     ]}},
    {"id": "shot_8", "title": "关键词云", "shotType": "wordcloud",
     "narration": "AI自动化视频封面一键生成，免费高效，智能匹配，多平台实时预览，批量处理",
     "data": {"type": "wordcloud", "words": [
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
     ]}},
    {"id": "shot_9", "title": "立即体验", "shotType": "cta",
     "narration": "立即体验，免费开始，无需信用卡，AI创作新方式从现在开始"},
]

def est_dur(text):
    clean = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)
    return len(clean) / AVG_SPEECH_RATE

# 分析
shots = []
cur = 0
for i, sec in enumerate(SECTIONS):
    dur = est_dur(sec["narration"]) + 0.5
    frames = int(dur * FPS)
    shots.append({
        "id": sec["id"], "shotType": sec["shotType"],
        "title": sec["title"], "startFrame": cur,
        "durationFrames": frames,
        "narrationDuration": round(dur, 2),
        "narration": sec["narration"],
        "data": sec.get("data", {"type": "none"}),
    })
    cur += frames

total_frames = cur
total_sec = total_frames / FPS

print(f"\n{'='*60}")
print(f"📋 内容分析完成 — {len(shots)}个镜头 {total_sec:.1f}s")
for s in shots:
    print(f"  {s['id']} | {s['shotType']:12s} | frame={s['startFrame']}+{s['durationFrames']} | {s['narrationDuration']:.1f}s | {s['narration'][:35]}...")

# 生成 Video1.tsx
COMPONENT_IMPORT = {
    "title": "TitleCard", "concept": "ConceptBlock",
    "flowchart": "FlowChart", "terminal": "TerminalShow",
    "scenegrid": "SceneGrid", "countup": "CountUp",
    "dialog": "DialogBlock", "bullets": "BulletList",
    "wordcloud": "WordCloud", "cta": "CTAEnd",
}

def make_props(s):
    p = s["data"]; t = s["shotType"]
    if t == "title":
        p_ = s["narration"].split("，")
        return 'title="%s" subtitle="%s" bgColor={bgColor} duration={%d}' % (p_[0], "，".join(p_[1:]), s["durationFrames"])
    elif t == "concept":
        p_ = s["narration"].split("，")
        return 'title="%s" body="%s" accentColor={accentColor} bgColor={bgColor}' % (p_[0], "，".join(p_[1:]))
    elif t == "flowchart":
        steps = p.get("steps", [])
        steps_str = ",\n      ".join('{ label: "%s", icon: "%s", desc: "%s" }' % (x["label"], x.get("icon",""), x.get("desc","")) for x in steps)
        return "steps={[" + steps_str + "]} accentColor={accentColor} bgColor={bgColor}"
    elif t == "terminal":
        return 'title="video-gen" code={"video-gen generate --prompt AI视频封面设计"} outputLines={[" > Analyzing..."," > Rendering complete."]} prompt=">>>" accentColor={accentColor}'
    elif t == "scenegrid":
        items = p.get("items", [])
        first5 = ",".join('"%s"' % x for x in items[:5])
        return 'items={[%s,...%d more]} cols={%d} rows={%d} accentColor={accentColor} bgColor={bgColor}' % (first5, len(items)-5, p.get("cols",5), p.get("rows",5))
    elif t == "countup":
        return 'value={%d} label="%s" suffix="+" prefix="" accentColor={accentColor} bgColor={bgColor}' % (p.get("value",0), p.get("label",""))
    elif t == "dialog":
        msgs = p.get("messages", [])
        msgs_str = ",\n          ".join('{ role: "%s", content: "%s" }' % (m["role"], m["content"]) for m in msgs)
        return "messages={[" + msgs_str + "]} bgColor={bgColor} userColor={accentColor} assistantColor=\"#00BCD4\""
    elif t == "bullets":
        items = p.get("items", [])
        items_str = ",\n            ".join('"%s"' % x for x in items)
        return 'title="%s" points={["%s"]} iconType="check" accentColor={accentColor} bgColor={bgColor}' % (s["title"], items[0])
    elif t == "wordcloud":
        words = p.get("words", [])
        words_str = ",\n            ".join('{ text: "%s", weight: %d }' % (w["text"], w["weight"]) for w in words)
        return "words={[" + words_str + "]} accentColor={accentColor} bgColor={bgColor}"
    elif t == "cta":
        p_ = s["narration"].split("，")
        return 'mainText="%s" subText="%s" ctaText="开始使用 →" accentColor={accentColor} bgColor={bgColor}' % (p_[0], "，".join(p_[1:]))
    return "bgColor={bgColor}"

# 去重 imports
seen = set()
imports_list = []
for s in shots:
    c = COMPONENT_IMPORT.get(s["shotType"], "TitleCard")
    if c not in seen:
        seen.add(c)
        imports_list.append('import { %s } from \'../components/%s\';' % (c, c))

imports_str = "\n".join(imports_list)

# 生成 sequences
seqs = []
for s in shots:
    c = COMPONENT_IMPORT.get(s["shotType"], "TitleCard")
    props = make_props(s)
    seqs.append('      <Sequence from={%d} durationInFrames={%d}>\n        <%s %s />\n      </Sequence>' % (
        s["startFrame"], s["durationFrames"], c, props))

seq_jsx = "\n".join(seqs)

# timeline 注释
timeline_comment = "\n".join(
    " *   %d-%d [%s] %.1fs | %s..." % (
        s["startFrame"], s["startFrame"]+s["durationFrames"], s["shotType"].ljust(12), s["narrationDuration"], s["narration"][:35])
    for s in shots)

tsx_content = """/**
 * Video1.tsx — 自动生成（内容驱动）
 * 生成时间: %s
 * 总时长: %.1ffs (%d帧 @%dfps)
 * 镜头数: %d
 */

import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
%s

const accentColor = '#FF6B35';
const bgColor = '#0D0D1A';

const Video1: React.FC = () => {
  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, background: bgColor }}>
%s
    </AbsoluteFill>
  );
};

export default Video1;
""" % (time.strftime("%Y-%m-%d %H:%M:%S"), total_sec, total_frames, FPS, len(shots), imports_str, seq_jsx)

with open(OUT_COMPONENT, "w") as f:
    f.write(tsx_content)
print("\n✅ Video1.tsx 生成完成:", OUT_COMPONENT)

# TTS 元数据
tts_segs = []
for s in shots:
    tts_segs.append({
        "id": s["id"], "shotType": s["shotType"],
        "startFrame": s["startFrame"],
        "durationFrames": s["durationFrames"],
        "narration": s["narration"],
        "narrationDuration": s["narrationDuration"],
    })

meta_path = os.path.join(TMP_DIR, "segments_meta.json")
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(tts_segs, f, ensure_ascii=False, indent=2)
print("✅ TTS元数据:", meta_path)

# 时间线
timeline_path = os.path.join(TMP_DIR, "content_timeline.json")
with open(timeline_path, "w", encoding="utf-8") as f:
    json.dump({"totalFrames": total_frames, "totalSeconds": round(total_sec, 2), "fps": FPS,
               "shots": [{"id": s["id"], "shotType": s["shotType"], "startFrame": s["startFrame"],
                          "durationFrames": s["durationFrames"], "narrationDuration": s["narrationDuration"],
                          "narration": s["narration"]} for s in shots]}, f, ensure_ascii=False, indent=2)
print("✅ 时间线:", timeline_path)

# 更新 Root.tsx
root_path = os.path.expanduser("~/video-gen/src/Root.tsx")
with open(root_path) as f:
    root = f.read()
root = re.sub(r'durationInFrames=\{\d+\}.*?@\d+fps', 'durationInFrames={%d} // %.1fs @%dfps' % (total_frames, total_sec, FPS), root)
with open(root_path, "w") as f:
    f.write(root)
print("✅ Root.tsx 更新:", total_frames, "帧")

print("\n" + "="*60)
print("🎬 下一步:")
print("  1. python3 scripts/generate-tts-from-meta.py")
print("  2. python3 scripts/assemble-from-meta.py")
print("  3. npx remotion render src/Root.tsx Video1 out/video1.mp4 --crf=20")
print("  4. ffmpeg -i out/video1.mp4 -i audio-tmp/narration_synced.wav -t %.1f out/video1_with_audio.mp4" % total_sec)
