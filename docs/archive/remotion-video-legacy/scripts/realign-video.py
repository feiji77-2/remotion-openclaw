#!/usr/bin/env python3
"""realign-video.py — 用实际TTS时长重新计算帧时间线，生成新版Video1.tsx"""
import json, os, re, time
from pydub import AudioSegment

FPS = 30
TMP_DIR = os.path.expanduser("~/video-gen/audio-tmp")
OUT_COMPONENT = os.path.expanduser("~/video-gen/src/compositions/Video1.tsx")

with open(os.path.join(TMP_DIR, "segments_meta.json")) as f:
    segments = json.load(f)

# 加载每段实际时长
for seg in segments:
    wav = seg.get("wav", os.path.join(TMP_DIR, "seg_%s.wav" % seg["id"]))
    if os.path.exists(wav):
        try:
            a = AudioSegment.from_wav(wav)
            seg["actual_dur"] = len(a) / 1000.0
        except:
            seg["actual_dur"] = seg.get("duration_s", 3.0)
    else:
        seg["actual_dur"] = seg.get("duration_s", 3.0)

print("实际TTS时长:")
for s in segments:
    print("  %s: %.2fs (计划%.2fs)" % (s['id'], s['actual_dur'], s.get('narrationDuration', s.get('duration_s', 0))))

# 重新计算帧时间线
shots = []
cur = 0
for seg in segments:
    dur = seg["actual_dur"] + 0.5  # +0.5s视觉留白
    frames = int(dur * FPS)
    shots.append({
        "id": seg["id"],
        "shotType": seg["shotType"],
        "startFrame": cur,
        "durationFrames": frames,
        "actual_dur": seg["actual_dur"],
        "narration": seg.get("narration", seg.get("text", "")),
    })
    cur += frames

total_frames = cur
total_sec = total_frames / FPS

print(f"\n重新计算: {len(shots)}个镜头, {total_sec:.1f}s ({total_frames}帧)\n")

# 生成 Video1.tsx
COMP_MAP = {
    "title":"TitleCard","concept":"ConceptBlock","flowchart":"FlowChart",
    "terminal":"TerminalShow","scenegrid":"SceneGrid","countup":"CountUp",
    "dialog":"DialogBlock","bullets":"BulletList","wordcloud":"WordCloud","cta":"CTAEnd",
}

def make_props(s):
    t = s["shotType"]; narration = s["narration"]
    if t == "title":
        p = narration.split("，")
        return 'title="%s" subtitle="%s" bgColor={bgColor} duration={%d}' % (p[0], "，".join(p[1:]), s["durationFrames"])
    elif t == "concept":
        p = narration.split("，")
        return 'title="%s" body="%s" accentColor={accentColor} bgColor={bgColor}' % (p[0], "，".join(p[1:]))
    elif t == "flowchart":
        return 'steps={[{ label: "输入文案", icon: "✍️", desc: "输入视频主题" },{ label: "AI分析", icon: "🤖", desc: "理解内容意图" },{ label: "场景匹配", icon: "🎯", desc: "选择最佳模板" },{ label: "渲染输出", icon: "⚡", desc: "生成最终封面" },{ label: "一键发布", icon: "🚀", desc: "多平台分发" }]} accentColor={accentColor} bgColor={bgColor}'
    elif t == "terminal":
        return 'title="video-gen" code="video-gen generate --prompt AI视频封面设计" outputLines={[" > Analyzing..."," > Rendering complete."]} prompt=">>>" accentColor={accentColor}'
    elif t == "scenegrid":
        items = ["封面设计","代码界面","终端演示","数据图表","流程图","对比图","词云","时间线","对话界面","统计面板","产品截图","获奖界面","用户评价","趋势图","地图","视频封面","Banner","Logo展示","App界面","后台面板","排行榜","日历","仪表盘"]
        all_items = ",".join('"%s"'%x for x in items)
        return 'items={[%s]} cols={5} rows={5} accentColor={accentColor} bgColor={bgColor}' % all_items
    elif t == "countup":
        return 'value={23} label="支持场景数" suffix="+" prefix="" accentColor={accentColor} bgColor={bgColor}'
    elif t == "dialog":
        return 'messages={[{ role: "user", content: "帮我做一个AI视频封面" },{ role: "assistant", content: "好的，正在分析你的需求，已理解内容意图，正在选择最佳场景模板，正在渲染输出" },{ role: "user", content: "需要多久" },{ role: "assistant", content: "预计30秒以内，正在渲染中，请稍候" }]} bgColor={bgColor} userColor={accentColor} assistantColor="#00BCD4"'
    elif t == "bullets":
        return 'title="核心优势" points={["全自动处理，无需手动调整","23种场景智能匹配","一键生成多平台版本","免费使用，无需信用卡"]} iconType="check" accentColor={accentColor} bgColor={bgColor}'
    elif t == "wordcloud":
        return 'words={[{ text: "AI自动化", weight: 10 },{ text: "视频封面", weight: 9 },{ text: "一键生成", weight: 8 },{ text: "23种场景", weight: 7 },{ text: "免费", weight: 6 },{ text: "高效", weight: 7 },{ text: "智能匹配", weight: 7 },{ text: "多平台", weight: 5 },{ text: "批量处理", weight: 4 },{ text: "零成本", weight: 6 }]} accentColor={accentColor} bgColor={bgColor}'
    elif t == "cta":
        p = narration.split("，")
        return 'mainText="%s" subText="%s" ctaText="开始使用 →" accentColor={accentColor} bgColor={bgColor}' % (p[0], "，".join(p[1:]))
    return "bgColor={bgColor}"

# 去重 imports
seen = set()
imports = []
for s in shots:
    c = COMP_MAP.get(s["shotType"], "TitleCard")
    if c not in seen:
        seen.add(c)
        imports.append('import { %s } from \'../components/%s\';' % (c, c))

seqs = []
for s in shots:
    c = COMP_MAP.get(s["shotType"], "TitleCard")
    props = make_props(s)
    seqs.append('      <Sequence from={%d} durationInFrames={%d}>\n        <%s %s />\n      </Sequence>' % (
        s["startFrame"], s["durationFrames"], c, props))

timeline_comment = "\n".join(
    " *   %d-%d [%s] %.1fs | %s..." % (
        s["startFrame"], s["startFrame"]+s["durationFrames"],
        s["shotType"].ljust(12), s["actual_dur"], s["narration"][:35])
    for s in shots)

tsx = """/**
 * Video1.tsx — 自动生成（内容驱动 + TTS实际时长）
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
""" % (time.strftime("%Y-%m-%d %H:%M:%S"), total_sec, total_frames, FPS, len(shots),
     "\n".join(imports), "\n".join(seqs))

with open(OUT_COMPONENT, "w") as f:
    f.write(tsx)
print("✅ Video1.tsx 更新:", OUT_COMPONENT)

# 更新 Root.tsx
root_path = os.path.expanduser("~/video-gen/src/Root.tsx")
with open(root_path) as f:
    root = f.read()
root = re.sub(r'durationInFrames=\{\d+\}.*?@\d+fps', 'durationInFrames={%d} // %.1fs @%dfps' % (total_frames, total_sec, FPS), root)
with open(root_path, "w") as f:
    f.write(root)
print("✅ Root.tsx 更新:", total_frames, "帧")

# 更新 segments_meta with actual durations
for seg, shot in zip(segments, shots):
    seg["startFrame"] = shot["startFrame"]
    seg["durationFrames"] = shot["durationFrames"]
    seg["actual_dur"] = shot["actual_dur"]

with open(os.path.join(TMP_DIR, "segments_meta.json"), "w") as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)

print("\n" + "="*60)
for s in shots:
    print(f"  {s['id']} | {s['shotType']:12s} | frame={s['startFrame']}+{s['durationFrames']} | {s['actual_dur']:.1f}s | {s['narration'][:30]}...")
