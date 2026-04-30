#!/bin/bash
set -e
OUTDIR="/Users/macos/OpenClaw/remotion-generated-video-project/remotion-video/public/segments"
MMX="/Users/macos/.npm-global/bin/mmx"

declare -A NARRATIONS
NARRATIONS["shot-01"]="都说AI只会说话、干不了活。GPT-5.5，第一个站出来打脸。36氪上周实测。四个字：它真能干活。"
NARRATIONS["shot-02"]="这次最硬的一层——战场变了。OpenAI把GPT-5.5从对话框挪到了工作流。以前，聊一句回一句，它是被动的。现在不一样了。"
NARRATIONS["shot-03"]="现在：你给它一个任务，它自己拆解步骤，自己执行。中途不用你盯着。这里有个技术点——以前模型强在生成，下一步干什么得你来定。"
NARRATIONS["shot-04"]="GPT-5.5不一样。它把规划能力内化了。以前模型给建议。GPT-5.5帮你做决定。"
NARRATIONS["shot-05"]="36氪实测验证了。从拆解到执行。全流程跑了。"
NARRATIONS["shot-06"]="这个能力叫Agent工作流。能独立完成整个任务链条。不只是回你一句话。是帮你把活干完。"
NARRATIONS["shot-07"]="53AI的分析说得很清楚：不再是聊天助手，是协作伙伴。技术层面怎么做到的？靠三样东西。任务拆解。工具调用。过程记忆。"
NARRATIONS["shot-08"]="任务拆解——把模糊指令拆成可执行步骤。工具调用——让它能操作真实环境。不只是输出文字。"
NARRATIONS["shot-09"]="过程记忆——记住执行到哪了，不会在中途断掉。三个能力加在一起。才是真正的门槛。"
NARRATIONS["shot-10"]="上线三天，已经有人在跑真实工作流了。不是Demo，是真的在跑。核心工作流已经能替代人工了。"
NARRATIONS["shot-11"]="不是那种'看起来厉害'的演示。是真的有人在上面跑生产流程。36氪判断很直接：最强模型不是嘴炮。它真能干活儿。"
NARRATIONS["shot-12"]="有个细节很多人忽略了。它变强的同时，安全体系同步升级。"
NARRATIONS["shot-13"]="发布前经历了完整红队测试，内外都有。红队测试是什么？就是让人专门找漏洞。找攻击路径。测到没问题才放出来。"
NARRATIONS["shot-14"]="能做到这一步，说明不只是在堆能力。是在认真对待真实场景下的安全性。这才是它真正值钱的地方。"
NARRATIONS["shot-15"]="如果你做执行类工作，这类工具会越来越多。你的岗位有没有可能被AI接手一大部分？评论区说说，我来看哪些影响最大。"
NARRATIONS["shot-16"]="觉得有用，转给身边做执行类工作的朋友。"

for shot in shot-01 shot-02 shot-03 shot-04 shot-05 shot-06 shot-07 shot-08 shot-09 shot-10 shot-11 shot-12 shot-13 shot-14 shot-15 shot-16; do
    text="${NARRATIONS[$shot]}"
    mp3_out="${OUTDIR}/${shot}.mp3"
    wav_out="${OUTDIR}/${shot}.wav"
    echo "[$shot] Generating..."
    $MMX speech synthesize --model speech-2.8-hd --voice male-qn-qingse --text "$text" --output "$mp3_out" 2>&1
    if [ -f "$mp3_out" ]; then
        ffmpeg -y -i "$mp3_out" -ar 44100 -ac 1 "$wav_out" 2>/dev/null
        echo "  -> $wav_out ($(du -k "$wav_out" | cut -f1)KB)"
    fi
done
echo "DONE"
