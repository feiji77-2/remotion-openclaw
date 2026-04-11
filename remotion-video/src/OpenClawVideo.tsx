/**
 * OpenClawVideo — 主视频组件（支持多模板 + 动态字幕）
 *
 * props 驱动：
 *   template: 'caption' | 'split' | 'fullscreen'
 *   subtitleData: parsed SRT subtitle array (from API)
 *   subtitleStyle: 'caption' | 'bottom'
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  Sequence,
  staticFile,
} from 'remotion';
import {STORYBOARD, FPS, BG_COLOR, ACCENT_GOLD, ACCENT_PURPLE} from './data/storyboard';
import {useVideoConfig as useSafeVideoConfig} from './hooks';
import {VOICE_SCRIPT} from './data/voiceScript';
import {CAPTION_TIMELINE, type CaptionChunk} from './captions';
import {SplitScreen} from './compositions/SplitScreen';
import {PipelineStoryboardVideo} from './components/PipelineStoryboardVideo';
import {SharedCaptionBubble} from './components/DesignCaptionText';
import {parseSRT, textToFallbackSubtitles} from './components/SRTParser';
import type {
  AudioSegmentProps,
  CaptionStyleProps,
  CaptionStyleSegmentProps,
  CaptionWordTimingProps,
  SubtitleCueProps,
  VideoProps,
} from './Root';

// ─── 通用动画组件 ────────────────────────────────────────
const FadeIn: React.FC<{children: React.ReactNode; delay?: number; duration?: number}> = ({
  children,
  delay = 0,
  duration = 15,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <div style={{opacity}}>{children}</div>;
};

const TitleText: React.FC<{text: string; size?: number; color?: string}> = ({
  text,
  size = 72,
  color = '#ffffff',
}) => (
  <div style={{fontSize: size, fontWeight: 800, color, textAlign: 'center', lineHeight: 1.3, padding: '0 60px'}}>
    {text}
  </div>
);

const SubtitleText: React.FC<{text: string; size?: number}> = ({text, size = 32}) => (
  <div style={{fontSize: size, fontWeight: 600, color: ACCENT_GOLD, textAlign: 'center', marginTop: 20, padding: '0 40px'}}>
    {text}
  </div>
);

const TagText: React.FC<{text: string}> = ({text}) => (
  <div style={{fontSize: 24, fontWeight: 600, color: ACCENT_PURPLE, textAlign: 'center', marginTop: 16, letterSpacing: 2}}>
    {text}
  </div>
);

// ─── 各 Shot 组件（保持原有样式）──────────────────────────
// （Shot01~09 组件保持不变，以下为节选）
const Shot01: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center'}}>
    <FadeIn delay={0} duration={20}>
      <div style={{fontSize: 280, marginBottom: 40}}>🦞</div>
    </FadeIn>
    <FadeIn delay={15} duration={15}>
      <TitleText text="你以为这就完了？" size={88} />
    </FadeIn>
    <FadeIn delay={30} duration={15}>
      <SubtitleText text="OpenClaw 小龙虾背后，真正撑住它的不是名字" size={36} />
    </FadeIn>
    <FadeIn delay={45} duration={10}>
      <TagText text="EP.4 · 技术解读" />
    </FadeIn>
  </AbsoluteFill>
);

const Shot02: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 50px'}}>
    <FadeIn delay={5} duration={20}>
      <TitleText text="为什么一个技术项目，能靠一个角色打开传播入口之后，后面还有一整套技术结构把热度接住？" size={56} />
    </FadeIn>
  </AbsoluteFill>
);

const Shot03: React.FC = () => {
  const steps = ['install', 'onboard', 'gateway', 'dashboard'];
  const icons = ['⌨️', '▶️', '🖥️', '📊'];
  return (
    <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center'}}>
      <FadeIn delay={0} duration={10}>
        <TitleText text="从讨论到试用，只需要四步" size={52} />
      </FadeIn>
      <div style={{display: 'flex', gap: 40, marginTop: 60, alignItems: 'center'}}>
        {steps.map((step, i) => (
          <FadeIn key={step} delay={10 + i * 8} duration={10}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 72, marginBottom: 12}}>{icons[i]}</div>
              <div style={{fontSize: 32, fontWeight: 700, color: '#fff', background: ACCENT_PURPLE, borderRadius: 16, padding: '12px 24px'}}>
                {step}
              </div>
              {i < steps.length - 1 && <div style={{fontSize: 36, color: ACCENT_GOLD, marginTop: 8}}>→</div>}
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={40} duration={10}>
        <SubtitleText text="install → onboard → gateway → dashboard" size={28} />
      </FadeIn>
    </AbsoluteFill>
  );
};

const Shot04: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
    <FadeIn delay={0} duration={12}><TitleText text="不需要研究底层架构" size={60} /></FadeIn>
    <FadeIn delay={15} duration={15}>
      <SubtitleText text="Node + 安装脚本 + onboarding + dashboard = 第一轮真实交互" size={30} />
    </FadeIn>
    <FadeIn delay={30} duration={15}>
      <div style={{marginTop: 60, display: 'flex', gap: 30, flexWrap: 'wrap', justifyContent: 'center'}}>
        {['打开终端', '执行脚本', '跑onboarding', '打开dashboard', '开始对话'].map((s) => (
          <div key={s} style={{background: 'rgba(139,92,246,0.2)', border: `2px solid ${ACCENT_PURPLE}`, borderRadius: 12, padding: '14px 22px', fontSize: 28, color: '#fff', fontWeight: 600}}>
            {s}
          </div>
        ))}
      </div>
    </FadeIn>
  </AbsoluteFill>
);

const Shot05a: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
    <FadeIn delay={0} duration={12}><div style={{fontSize: 160, marginBottom: 30}}>📁</div></FadeIn>
    <FadeIn delay={12} duration={15}><TitleText text="workspace 不是目录，是 Agent 的 home" size={58} /></FadeIn>
    <FadeIn delay={28} duration={12}><SubtitleText text="默认工作目录 · 记忆组织中心 · 人格定义空间" size={28} /></FadeIn>
  </AbsoluteFill>
);

const Shot05b: React.FC = () => {
  const files = [
    {name: 'AGENTS.md', icon: '📋', desc: '操作说明'},
    {name: 'SOUL.md', icon: '❤️', desc: '人格边界'},
    {name: 'USER.md', icon: '👤', desc: '用户偏好'},
    {name: 'TOOLS.md', icon: '🔧', desc: '工具规则'},
    {name: 'memory/', icon: '🗄️', desc: '记忆日志'},
    {name: 'skills/', icon: '🎯', desc: '技能模块'},
  ];
  return (
    <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 40px'}}>
      <FadeIn delay={0} duration={10}><TitleText text="这些文件共同构成 Agent 的工作模型" size={48} /></FadeIn>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 50}}>
        {files.map((f, i) => (
          <FadeIn key={f.name} delay={12 + i * 8} duration={10}>
            <div style={{background: 'rgba(139,92,246,0.15)', border: `1.5px solid ${ACCENT_PURPLE}`, borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16}}>
              <span style={{fontSize: 48}}>{f.icon}</span>
              <div>
                <div style={{fontSize: 28, fontWeight: 700, color: '#fff'}}>{f.name}</div>
                <div style={{fontSize: 22, color: 'rgba(255,255,255,0.6)'}}>{f.desc}</div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Shot05c: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
    <FadeIn delay={0} duration={12}><TitleText text="把规则写进文件，把行为写进模型" size={56} /></FadeIn>
    <FadeIn delay={15} duration={12}>
      <div style={{display: 'flex', gap: 30, marginTop: 60, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center'}}>
        <div style={{background: 'rgba(139,92,246,0.15)', border: `1.5px solid ${ACCENT_PURPLE}`, borderRadius: 16, padding: '20px 28px', maxWidth: 380}}>
          <div style={{fontSize: 24, color: ACCENT_PURPLE, marginBottom: 8, fontWeight: 700}}>AGENTS.md</div>
          <div style={{fontSize: 22, color: '#fff', lineHeight: 1.5}}>代码排查优先、中文回答、以结果优先</div>
        </div>
        <div style={{fontSize: 48, color: ACCENT_GOLD}}>→</div>
        <div style={{background: 'rgba(245,158,11,0.15)', border: `1.5px solid ${ACCENT_GOLD}`, borderRadius: 16, padding: '20px 28px', maxWidth: 380}}>
          <div style={{fontSize: 24, color: ACCENT_GOLD, marginBottom: 8, fontWeight: 700}}>SOUL.md</div>
          <div style={{fontSize: 22, color: '#fff', lineHeight: 1.5}}>务实、不讨好、有判断</div>
        </div>
      </div>
    </FadeIn>
  </AbsoluteFill>
);

const Shot06a: React.FC = () => {
  const nodes = ['接收输入', '组装上下文', '模型推理', '执行工具', '流式回复', '持久化'];
  const icons = ['📥', '🔗', '🧠', '🔧', '⚡', '💾'];
  return (
    <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 30px'}}>
      <FadeIn delay={0} duration={10}><TitleText text="这不是壳，是能稳定跑的系统" size={52} /></FadeIn>
      <div style={{display: 'flex', gap: 0, marginTop: 50, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center'}}>
        {nodes.map((node, i) => (
          <React.Fragment key={node}>
            <FadeIn delay={10 + i * 8} duration={10}>
              <div style={{textAlign: 'center', padding: '0 12px'}}>
                <div style={{fontSize: 56}}>{icons[i]}</div>
                <div style={{fontSize: 24, fontWeight: 700, color: '#fff', background: ACCENT_PURPLE, borderRadius: 12, padding: '10px 16px', marginTop: 8, whiteSpace: 'nowrap'}}>
                  {node}
                </div>
              </div>
            </FadeIn>
            {i < nodes.length - 1 && <div style={{fontSize: 36, color: ACCENT_GOLD}}>→</div>}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Shot06b: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
    <FadeIn delay={0} duration={12}><TitleText text="连续消息不会乱" size={64} /></FadeIn>
    <FadeIn delay={12} duration={10}><SubtitleText text="session lane + queueing" size={32} /></FadeIn>
    <FadeIn delay={25} duration={15}>
      <div style={{marginTop: 50, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center'}}>
        {['session lane', 'lifecycle', 'agent.wait'].map((tag) => (
          <div key={tag} style={{background: 'rgba(139,92,246,0.2)', border: `1.5px solid ${ACCENT_PURPLE}`, borderRadius: 100, padding: '14px 28px', fontSize: 28, color: '#fff', fontWeight: 600}}>
            {tag}
          </div>
        ))}
      </div>
    </FadeIn>
    <FadeIn delay={42} duration={10}>
      <div style={{marginTop: 40, fontSize: 28, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.6}}>
        每个 session 同时只走一条 lane<br/>不会乱上下文，不会重复调用工具
      </div>
    </FadeIn>
  </AbsoluteFill>
);

const Shot07a: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
    <FadeIn delay={0} duration={12}><TitleText text="不是单点工具，是可扩展平台" size={56} /></FadeIn>
    <FadeIn delay={14} duration={15}>
      <div style={{marginTop: 50, display: 'flex', gap: 30, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap'}}>
        {[{icon: '🖥️', label: 'gateway'}, {icon: '→', label: ''}, {icon: '🤖', label: '主 Agent'}, {icon: '→', label: ''}, {icon: '👥', label: '多 Agent'}].map((item, i) => (
          <FadeIn key={i} delay={14 + i * 6} duration={10}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 72}}>{item.icon}</div>
              {item.label && <div style={{fontSize: 24, color: '#fff', fontWeight: 700, marginTop: 8}}>{item.label}</div>}
            </div>
          </FadeIn>
        ))}
      </div>
    </FadeIn>
    <FadeIn delay={40} duration={10}><SubtitleText text="gateway · multi-agent · routing" size={28} /></FadeIn>
  </AbsoluteFill>
);

const Shot07b: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 50px'}}>
    <FadeIn delay={0} duration={12}><TitleText text="哪些工具对哪个 Agent 开放，完全可配置" size={50} /></FadeIn>
    <FadeIn delay={14} duration={12}>
      <div style={{marginTop: 50, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center'}}>
        {['plugin tools', 'optional tools', 'allowlist', 'sandbox policy'].map((tag, i) => (
          <div key={tag} style={{background: i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.15)', border: `1.5px solid ${i === 0 ? ACCENT_GOLD : ACCENT_PURPLE}`, borderRadius: 100, padding: '14px 28px', fontSize: 26, color: '#fff', fontWeight: 600}}>
            {tag}
          </div>
        ))}
      </div>
    </FadeIn>
    <FadeIn delay={30} duration={12}>
      <div style={{marginTop: 40, fontSize: 26, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.6}}>
        给主 Agent 只开某几个工具<br/>另一个 Agent 绑定不同 workspace<br/>不同消息通过 routing 分配
      </div>
    </FadeIn>
  </AbsoluteFill>
);

const Shot08: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 50px'}}>
    <FadeIn delay={0} duration={10}><div style={{fontSize: 120, marginBottom: 30}}>🦞</div></FadeIn>
    <FadeIn delay={10} duration={15}><TitleText text="真正撑住热度的，不是梗，是这套技术结构" size={52} /></FadeIn>
    <FadeIn delay={28} duration={15}>
      <div style={{marginTop: 50, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center'}}>
        {['上手路径短', 'workspace清晰', 'agent loop完整', '平台扩展强'].map((item) => (
          <div key={item} style={{background: 'rgba(139,92,246,0.2)', border: `1.5px solid ${ACCENT_PURPLE}`, borderRadius: 14, padding: '16px 28px', fontSize: 28, color: '#fff', fontWeight: 700}}>
            {item}
          </div>
        ))}
      </div>
    </FadeIn>
  </AbsoluteFill>
);

const Shot09: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center', padding: '0 50px'}}>
    <FadeIn delay={0} duration={15}><div style={{fontSize: 160, marginBottom: 40}}>✨</div></FadeIn>
    <FadeIn delay={15} duration={15}>
      <TitleText text="下一条，我们可以继续拆：OpenClaw 最值得借鉴的几条技术设计" size={48} />
    </FadeIn>
    <FadeIn delay={35} duration={10}><SubtitleText text="为什么它比大多数 AI 项目更值得研究" size={28} /></FadeIn>
  </AbsoluteFill>
);

// ─── Shot 映射 ───────────────────────────────────────────
const ShotComponents: Record<string, React.FC> = {
  'shot-01': Shot01, 'shot-02': Shot02, 'shot-03': Shot03,
  'shot-04': Shot04, 'shot-5a': Shot05a, 'shot-5b': Shot05b, 'shot-5c': Shot05c,
  'shot-6a': Shot06a, 'shot-6b': Shot06b, 'shot-7a': Shot07a, 'shot-7b': Shot07b,
  'shot-08': Shot08, 'shot-09': Shot09,
};

const VOICE_AUDIO_BY_SHOT = Object.fromEntries(
  VOICE_SCRIPT.map((segment, index) => [
    segment.shotId,
    `voice/by-shot/${String(index + 1).padStart(2, '0')}-${segment.shotId}.wav`,
  ]),
);

// ─── 字幕覆盖层（支持动态SRT）──────────────────────────────
interface CaptionOverlayProps {
  subtitleData?: SubtitleCueProps[] | null;
  subtitleFile?: string;
  subtitleText?: string;
  captionStyleSegments?: CaptionStyleSegmentProps[] | null;
  subtitleStyle?: 'caption' | 'bottom';
  typewriter?: boolean;
}

function normalizeStaticAssetPath(assetPath: string) {
  return assetPath.replace(/^\/+/, '');
}

function resolveAudioSource(src: string) {
  return /^https?:\/\//.test(src) ? src : staticFile(normalizeStaticAssetPath(src));
}

type SubtitleSource = 'subtitleData' | 'subtitleFile' | 'subtitleText' | 'timeline';

function shouldGlueCaptionWords(previousToken: string, token: string) {
  return (
    /^[，。！？；：,.!?;:]/.test(token) ||
    /[\u3400-\u9fff]$/.test(previousToken) ||
    /^[\u3400-\u9fff]/.test(token)
  );
}

function joinCaptionWordTokens(words: string[]) {
  let result = '';

  for (const token of words.map((word) => word.trim()).filter(Boolean)) {
    if (!result) {
      result = token;
      continue;
    }

    result += shouldGlueCaptionWords(result.slice(-1), token) ? token : ` ${token}`;
  }

  return result.replace(/\s+([，。！？；：,.!?;:])/g, '$1').trim();
}

function getCaptionWordVisualLength(word: CaptionWordTimingProps) {
  return Math.max(1, word.text.replace(/\s+/g, '').length);
}

function splitCaptionWordsIntoLines(words: CaptionWordTimingProps[], requestedLines: number | undefined) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const maxLines = Math.max(1, Math.min(words.length, Math.round(requestedLines || 1)));
  if (maxLines === 1) {
    return [words];
  }

  const totalVisualLength = words.reduce((sum, word) => sum + getCaptionWordVisualLength(word), 0);
  const lines: CaptionWordTimingProps[][] = [];
  let currentLine: CaptionWordTimingProps[] = [];
  let consumedVisualLength = 0;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    currentLine.push(word);
    consumedVisualLength += getCaptionWordVisualLength(word);

    const remainingWords = words.length - index - 1;
    const remainingLines = maxLines - lines.length - 1;
    if (remainingLines <= 0 || remainingWords <= 0) {
      continue;
    }

    const currentLineLength = currentLine.reduce((sum, currentWord) => sum + getCaptionWordVisualLength(currentWord), 0);
    const remainingVisualLength = Math.max(0, totalVisualLength - consumedVisualLength);
    const targetLineLength = Math.max(1, Math.round(remainingVisualLength / (remainingLines + 1)));
    const endsPhrase = /[，。！？；：,.!?;:]$/.test(word.text);
    const enoughWordsLeft = remainingWords >= remainingLines;

    if (enoughWordsLeft && (endsPhrase || currentLineLength >= targetLineLength)) {
      lines.push(currentLine);
      currentLine = [];
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const overflowLine = lines.slice(maxLines - 1).flat();
  return [...lines.slice(0, maxLines - 1), overflowLine];
}

function normalizeSubtitleWord(
  word: Partial<CaptionWordTimingProps> & {word?: string; start?: number; end?: number},
  cueStartFrame: number,
  cueEndFrame: number,
  fps: number,
): CaptionWordTimingProps | null {
  const text = typeof word.text === 'string'
    ? word.text.trim()
    : typeof word.word === 'string'
      ? word.word.trim()
      : '';

  if (!text) {
    return null;
  }

  const fallbackStartFrame = cueStartFrame;
  const fallbackEndFrame = Math.max(cueStartFrame + 1, cueEndFrame);
  const rawStartFrame = Number.isFinite(word.startFrame)
    ? Number(word.startFrame)
    : Number.isFinite(word.start)
      ? Number(word.start)
      : fallbackStartFrame;
  const rawEndFrame = Number.isFinite(word.endFrame)
    ? Number(word.endFrame)
    : Number.isFinite(word.end)
      ? Number(word.end)
      : fallbackEndFrame;
  const startFrame = Math.max(
    cueStartFrame,
    Math.min(fallbackEndFrame - 1, Math.max(0, Math.round(rawStartFrame))),
  );
  const endFrame = Math.max(
    startFrame + 1,
    Math.min(fallbackEndFrame, Math.round(rawEndFrame)),
  );
  const startMs = Number.isFinite(word.startMs)
    ? Math.max(0, Number(word.startMs))
    : Math.round((startFrame / fps) * 1000);
  const endMs = Number.isFinite(word.endMs)
    ? Math.max(startMs + 1, Number(word.endMs))
    : Math.max(startMs + 1, Math.round((endFrame / fps) * 1000));

  return {
    text,
    startFrame,
    endFrame,
    startMs,
    endMs,
    confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
    isKeyword: typeof word.isKeyword === 'boolean' ? word.isKeyword : undefined,
  };
}

function normalizeSubtitleEntry(
  subtitle: Partial<SubtitleCueProps>,
  index: number,
  fps: number,
): SubtitleCueProps | null {
  const safeIndex = Number.isFinite(subtitle.index) ? Number(subtitle.index) : index + 1;
  const startMs = Number.isFinite(subtitle.startMs)
    ? Number(subtitle.startMs)
    : Math.max(0, Math.round((Number(subtitle.startFrame) || 0) * 1000 / fps));
  const endMsFromFrames = Math.max(startMs + 200, Math.round((Number(subtitle.endFrame) || 0) * 1000 / fps));
  const endMs = Number.isFinite(subtitle.endMs)
    ? Math.max(startMs + 200, Number(subtitle.endMs))
    : endMsFromFrames;
  const startFrame = Number.isFinite(subtitle.startFrame)
    ? Math.max(0, Number(subtitle.startFrame))
    : Math.round((startMs / 1000) * fps);
  const endFrame = Number.isFinite(subtitle.endFrame)
    ? Math.max(startFrame + 1, Number(subtitle.endFrame))
    : Math.max(startFrame + 1, Math.round((endMs / 1000) * fps));
  const normalizedWords = Array.isArray(subtitle.words)
    ? subtitle.words
      .map((word) => normalizeSubtitleWord(word, startFrame, endFrame, fps))
      .filter((word): word is CaptionWordTimingProps => Boolean(word))
      .sort((a, b) => a.startFrame - b.startFrame)
    : [];
  const text = typeof subtitle.text === 'string'
    ? subtitle.text.replace(/<[^>]+>/g, '').trim()
    : joinCaptionWordTokens(normalizedWords.map((word) => word.text));

  if (!text) {
    return null;
  }

  return {
    index: safeIndex,
    startMs,
    endMs,
    startFrame,
    endFrame,
    text,
    words: normalizedWords.length > 0 ? normalizedWords : null,
  };
}

function normalizeSubtitlePayload(
  subtitleData: SubtitleCueProps[] | null | undefined,
  fps: number,
): SubtitleCueProps[] {
  if (!Array.isArray(subtitleData)) {
    return [];
  }

  return subtitleData
    .map((subtitle, index) => normalizeSubtitleEntry(subtitle, index, fps))
    .filter((subtitle): subtitle is SubtitleCueProps => Boolean(subtitle));
}

function getSubtitleSourceLabel(source: SubtitleSource, hasLoadError: boolean) {
  const labelMap: Record<SubtitleSource, string> = {
    subtitleData: 'INLINE',
    subtitleFile: 'SRT',
    subtitleText: 'TEXT',
    timeline: 'TIMELINE',
  };

  return hasLoadError ? `${labelMap[source]} FALLBACK` : labelMap[source];
}

function useResolvedSubtitles({
  subtitleData,
  subtitleFile,
  subtitleText,
}: {
  subtitleData?: SubtitleCueProps[] | null;
  subtitleFile?: string;
  subtitleText?: string;
}) {
  const { fps, durationInFrames } = useSafeVideoConfig();
  const inlineSubtitles = useMemo(() => normalizeSubtitlePayload(subtitleData, fps), [subtitleData, fps]);
  const normalizedSubtitleFile = useMemo(() => {
    return typeof subtitleFile === 'string' && subtitleFile.trim()
      ? normalizeStaticAssetPath(subtitleFile)
      : null;
  }, [subtitleFile]);
  const subtitleFileUrl = useMemo(() => {
    return normalizedSubtitleFile ? staticFile(normalizedSubtitleFile) : null;
  }, [normalizedSubtitleFile]);
  const textFallbackSubtitles = useMemo(() => {
    const normalizedText = typeof subtitleText === 'string' ? subtitleText.trim() : '';
    if (!normalizedText) {
      return [];
    }

    return normalizeSubtitlePayload(textToFallbackSubtitles(normalizedText, durationInFrames, fps), fps);
  }, [durationInFrames, fps, subtitleText]);

  const [fileSubtitles, setFileSubtitles] = useState<SubtitleCueProps[]>([]);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);
  const renderHandleRef = useRef<number | null>(null);
  const requestedFileRef = useRef<string | null>(null);

  if (
    inlineSubtitles.length === 0 &&
    normalizedSubtitleFile &&
    requestedFileRef.current !== normalizedSubtitleFile &&
    renderHandleRef.current === null
  ) {
    renderHandleRef.current = delayRender(`Loading subtitle file: ${normalizedSubtitleFile}`);
    requestedFileRef.current = normalizedSubtitleFile;
  }

  useEffect(() => {
    if (inlineSubtitles.length > 0 || !subtitleFileUrl || !normalizedSubtitleFile) {
      setFileSubtitles([]);
      setFileLoadError(null);
      if (renderHandleRef.current !== null) {
        continueRender(renderHandleRef.current);
        renderHandleRef.current = null;
      }
      requestedFileRef.current = normalizedSubtitleFile;
      return;
    }

    let cancelled = false;
    const finishLoading = () => {
      if (renderHandleRef.current !== null) {
        continueRender(renderHandleRef.current);
        renderHandleRef.current = null;
      }
    };

    fetch(subtitleFileUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load subtitle file (${response.status})`);
        }

        return response.text();
      })
      .then((srtText) => {
        if (cancelled) {
          return;
        }

        const parsedSubtitles = normalizeSubtitlePayload(parseSRT(srtText, fps), fps);
        if (parsedSubtitles.length === 0) {
          setFileSubtitles([]);
          setFileLoadError('subtitle file parsed but produced no cues');
          return;
        }

        setFileSubtitles(parsedSubtitles);
        setFileLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[OpenClawVideo] ${message}`);
        setFileSubtitles([]);
        setFileLoadError(message);
      })
      .finally(() => {
        finishLoading();
      });

    return () => {
      cancelled = true;
      finishLoading();
    };
  }, [fps, inlineSubtitles.length, normalizedSubtitleFile, subtitleFileUrl]);

  return useMemo<{
    subtitles: SubtitleCueProps[] | null;
    source: SubtitleSource;
    loadError: string | null;
  }>(() => {
    if (inlineSubtitles.length > 0) {
      return {
        subtitles: inlineSubtitles,
        source: 'subtitleData',
        loadError: null,
      };
    }

    if (fileSubtitles.length > 0) {
      return {
        subtitles: fileSubtitles,
        source: 'subtitleFile',
        loadError: fileLoadError,
      };
    }

    if (textFallbackSubtitles.length > 0) {
      return {
        subtitles: textFallbackSubtitles,
        source: 'subtitleText',
        loadError: fileLoadError,
      };
    }

    return {
      subtitles: null,
      source: 'timeline',
      loadError: fileLoadError,
    };
  }, [fileLoadError, fileSubtitles, inlineSubtitles, textFallbackSubtitles]);
}

const DynamicCaptionOverlay: React.FC<CaptionOverlayProps> = ({
  subtitleData,
  subtitleFile,
  subtitleText,
  captionStyleSegments,
  subtitleStyle = 'caption',
  typewriter = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useSafeVideoConfig();
  const {
    subtitles: resolvedSubtitles,
    source: subtitleSource,
    loadError: subtitleLoadError,
  } = useResolvedSubtitles({
    subtitleData,
    subtitleFile,
    subtitleText,
  });

  const activeShot = useMemo(() => {
    return CAPTION_TIMELINE.find(shot => frame >= shot.startFrame && frame < shot.endFrame)
      ?? CAPTION_TIMELINE[CAPTION_TIMELINE.length - 1];
  }, [frame]);

  if (!activeShot) return null;

  const localFrame = frame - activeShot.startFrame;
  const activeChunk = useMemo<CaptionChunk | null>(() => {
    return activeShot.chunks.find(chunk => localFrame >= chunk.startFrame && localFrame < chunk.endFrame)
      ?? activeShot.chunks[activeShot.chunks.length - 1];
  }, [localFrame, activeShot]);

  const activeSubtitle = useMemo<SubtitleCueProps | null>(() => {
    if (!resolvedSubtitles || resolvedSubtitles.length === 0) {
      return null;
    }

    return resolvedSubtitles.find((subtitle) => frame >= subtitle.startFrame && frame < subtitle.endFrame) ?? null;
  }, [frame, resolvedSubtitles]);
  const activeCaptionStyle = useMemo(() => {
    if (!Array.isArray(captionStyleSegments) || captionStyleSegments.length === 0) {
      return null;
    }

    return captionStyleSegments.find((segment) => frame >= segment.startFrame && frame < segment.endFrame)?.style ?? null;
  }, [captionStyleSegments, frame]);

  if (!activeChunk && !activeSubtitle) return null;

  const captionText = activeSubtitle?.text ?? activeChunk?.text ?? '';
  const captionStartFrame = activeSubtitle?.startFrame ?? (activeShot.startFrame + (activeChunk?.startFrame ?? 0));
  const chunkFrame = Math.max(0, frame - captionStartFrame);
  const pulse = spring({ frame: chunkFrame, fps, config: { damping: 20, stiffness: 180, mass: 0.8 } });
  const glow = interpolate(chunkFrame, [0, 10, 24], [0.24, 0.12, 0.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleSourceLabel = getSubtitleSourceLabel(subtitleSource, Boolean(subtitleLoadError));
  const usesDesignCaptionStyle = Boolean(activeCaptionStyle);

  return (
    <AbsoluteFill style={{justifyContent: 'space-between', padding: 32, pointerEvents: 'none'}}>
      {/* 左上角 Shot 信息 */}
      {usesDesignCaptionStyle ? null : (
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div style={{
            background: 'rgba(9,7,13,0.78)',
            border: `1px solid rgba(245,158,11,${0.28 + pulse * 0.2})`,
            borderRadius: 999,
            padding: '12px 18px',
            backdropFilter: 'blur(14px)',
            boxShadow: `0 0 32px rgba(245,158,11,${glow})`,
          }}>
            <div style={{fontSize: 14, fontWeight: 800, letterSpacing: 2, color: ACCENT_GOLD}}>
              SHOT {String(activeShot.shotIndex + 1).padStart(2, '0')} / {String(CAPTION_TIMELINE.length).padStart(2, '0')}
            </div>
            <div style={{fontSize: 20, fontWeight: 700, marginTop: 4, maxWidth: 560}}>{activeShot.title}</div>
            <div style={{fontSize: 12, fontWeight: 700, letterSpacing: 1.6, marginTop: 8, color: 'rgba(255,255,255,0.52)'}}>
              CAPTION SOURCE · {subtitleSourceLabel}
            </div>
          </div>
        </div>
      )}

      {/* 底部字幕区 */}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        {/* 进度条 */}
        {usesDesignCaptionStyle ? null : (
          <div style={{width: 720, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.12)'}}>
            <div style={{
              width: `${(frame / durationInFrames) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${ACCENT_PURPLE}, ${ACCENT_GOLD})`,
            }} />
          </div>
        )}

        {/* 字幕气泡 */}
        {captionText ? (
          <SharedCaptionBubble
            frame={frame}
            fps={fps}
            width={width}
            subtitleStyle={subtitleStyle}
            captionText={captionText}
            captionStartFrame={captionStartFrame}
            activeSubtitle={activeSubtitle}
            activeCaptionStyle={activeCaptionStyle}
            typewriter={typewriter}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ─── 主视频组件 ───────────────────────────────────────────
export const OpenClawVideo: React.FC<VideoProps> = ({
  audioSegments,
  captionStyleSegments,
  template = 'caption',
  shots,
  subtitleData,
  subtitleFile,
  subtitleStyle = 'caption',
  subtitleText,
  typewriter = true,
  useBundledShotAudio = false,
  voiceFile,
}) => {
  const offsets = useMemo(() => {
    const o: Record<string, number> = {};
    let currentFrame = 0;
    for (const shot of STORYBOARD) {
      o[shot.id] = currentFrame;
      currentFrame += shot.durationSec * FPS;
    }
    return o;
  }, []);
  const dynamicVoiceSrc =
    typeof voiceFile === 'string' && voiceFile.trim()
      ? resolveAudioSource(voiceFile)
      : null;
  const normalizedAudioSegments = useMemo(() => {
    if (!Array.isArray(audioSegments)) {
      return [];
    }

    return audioSegments
      .filter((segment): segment is AudioSegmentProps => {
        return Boolean(
          segment &&
            typeof segment.src === 'string' &&
            segment.src.trim() &&
            Number.isFinite(segment.startFrame) &&
            Number.isFinite(segment.durationInFrames) &&
            Number(segment.durationInFrames) > 0,
        );
      })
      .map((segment) => ({
        src: segment.src.trim(),
        startFrame: Math.max(0, Math.round(segment.startFrame)),
        durationInFrames: Math.max(1, Math.round(segment.durationInFrames)),
      }))
      .sort((a, b) => a.startFrame - b.startFrame);
  }, [audioSegments]);
  const usesDynamicAudioSegments = normalizedAudioSegments.length > 0;
  const shouldUseFallbackShotAudio = useBundledShotAudio && !dynamicVoiceSrc && !usesDynamicAudioSegments;
  const hasPipelineShots = Array.isArray(shots) && shots.length > 0;
  const dynamicAudioLayer = dynamicVoiceSrc ? (
    <Audio src={dynamicVoiceSrc} />
  ) : (
    <>
      {normalizedAudioSegments.map((segment) => (
        <Sequence
          key={`${segment.src}:${segment.startFrame}:${segment.durationInFrames}`}
          from={segment.startFrame}
          durationInFrames={segment.durationInFrames}
        >
          <Audio src={resolveAudioSource(segment.src)} />
        </Sequence>
      ))}
    </>
  );

  if (hasPipelineShots && template !== 'card-draw') {
    return (
      <AbsoluteFill style={{backgroundColor: BG_COLOR}}>
        {dynamicAudioLayer}
        <PipelineStoryboardVideo shots={shots || []} template={template} />
        <DynamicCaptionOverlay
          subtitleData={subtitleData}
          subtitleFile={subtitleFile}
          subtitleText={subtitleText}
          captionStyleSegments={captionStyleSegments}
          subtitleStyle={template === 'fullscreen' ? 'bottom' : subtitleStyle}
          typewriter={typewriter}
        />
      </AbsoluteFill>
    );
  }

  // ── 模板选择 ─────────────────────────────────────────
  if (template === 'split') {
    return (
      <AbsoluteFill style={{backgroundColor: BG_COLOR}}>
        {dynamicAudioLayer}
        <SplitScreen
          title="OpenClaw 小龙虾"
          body="4层逻辑深度拆解"
          icon="🦞"
          splitPosition="right"
        />
        <DynamicCaptionOverlay
          subtitleData={subtitleData}
          subtitleFile={subtitleFile}
          subtitleText={subtitleText}
          captionStyleSegments={captionStyleSegments}
          subtitleStyle={subtitleStyle}
          typewriter={typewriter}
        />
      </AbsoluteFill>
    );
  }

  if (template === 'fullscreen') {
    return (
      <AbsoluteFill style={{backgroundColor: BG_COLOR}}>
        {dynamicAudioLayer}
        {STORYBOARD.map((shot) => {
          const ShotComponent = ShotComponents[shot.id];
          if (!ShotComponent) return null;
          return (
            <Sequence key={shot.id} from={offsets[shot.id]} durationInFrames={shot.durationSec * FPS}>
              {shouldUseFallbackShotAudio && VOICE_AUDIO_BY_SHOT[shot.id] ? (
                <Audio src={staticFile(VOICE_AUDIO_BY_SHOT[shot.id])} />
              ) : null}
              <ShotComponent />
            </Sequence>
          );
        })}
        <DynamicCaptionOverlay
          subtitleData={subtitleData}
          subtitleFile={subtitleFile}
          subtitleText={subtitleText}
          captionStyleSegments={captionStyleSegments}
          subtitleStyle="bottom"
          typewriter={typewriter}
        />
      </AbsoluteFill>
    );
  }

  // ── 默认：caption 模板 ──────────────────────────────
  return (
    <AbsoluteFill style={{backgroundColor: BG_COLOR}}>
      {dynamicAudioLayer}
      {STORYBOARD.map((shot) => {
        const ShotComponent = ShotComponents[shot.id];
        if (!ShotComponent) return null;
        return (
          <Sequence key={shot.id} from={offsets[shot.id]} durationInFrames={shot.durationSec * FPS}>
            {shouldUseFallbackShotAudio && VOICE_AUDIO_BY_SHOT[shot.id] ? (
              <Audio src={staticFile(VOICE_AUDIO_BY_SHOT[shot.id])} />
            ) : null}
            <ShotComponent />
          </Sequence>
        );
      })}
      <DynamicCaptionOverlay
        subtitleData={subtitleData}
        subtitleFile={subtitleFile}
        subtitleText={subtitleText}
        captionStyleSegments={captionStyleSegments}
        subtitleStyle={subtitleStyle}
        typewriter={typewriter}
      />
    </AbsoluteFill>
  );
};
