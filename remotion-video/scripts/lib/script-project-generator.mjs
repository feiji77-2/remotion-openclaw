import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  resolveProductionComponent,
  resolveSemanticIntent,
} from "./semantic-component-resolver.mjs";

export const FPS = 30;

// Chapter accents are intentionally lifted for small 9:16 screens. The stage
// owns darkness; an accent must remain readable above it at a glance.
const PALETTE = [
  "#48e7f3",
  "#ad94ff",
  "#63f0aa",
  "#ffd166",
  "#ff7aa8",
  "#7e98ff",
];

const VISUAL_SYSTEM_VARIANTS = [
  "cinematic-tech",
  "editorial-lightcut",
  "product-console",
];
const DIRECTOR_TRANSITION_PRESETS = [
  "ambient-fade",
  "stage-slide",
  "focus-handoff",
  "contrast-flash",
];

const NUMBERED_CUE =
  /^(第[一二三四五六七八九十0-9]+个|第[一二三四五六七八九十0-9]+步|首先|然后|接着|最后|压轴|总结|注意)/u;
const STRUCTURE_CUE = /^(但是|然而|不过|因为|所以|因此|此外|另外)/u;
const SEQUENCE_MARKER =
  /(第[一二三四五六七八九十0-9]+(?:个|步|阶段|部分)|第一|第二|第三|第四|第五|首先|然后|接着|最后|压轴)/gu;
const SEQUENCE_CONTEXT = /(步骤|流程|链路|路径|阶段|编号|顺序|依次|逐步)/u;
const METRIC_CONTEXT =
  /(指标|数据|转化|增长|下降|提升|降低|通过|失败|耗时|延迟|成本|预算|收入|用户|客户|订单|库存|缺货|产量|样本|断言|占比|比例|效率|速度|频率|准确率|完成率|帧|秒|分钟|小时|天|元|金额|次数|门店|页面|条目)/u;
const MEASURED_NUMBER =
  /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)?/iu;
const STRONG_MEASURED_NUMBER =
  /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)/iu;
const RUN_DIVERSITY_KINDS = [
  "quote-callout",
  "radial-explainer",
  "timeline-story",
  "checklist-progress",
];

const hasGroupedSequenceSignal = (text) => {
  const value = String(text ?? "");
  const markers = value.match(SEQUENCE_MARKER) ?? [];
  const normalized = markers.map((marker) =>
    marker.replace(/[，。！？、；：,.!?;:\s]/gu, ""),
  );
  if (new Set(normalized).size >= 2) return true;
  return (
    normalized.some((marker) => /^第|^第一/u.test(marker)) &&
    SEQUENCE_CONTEXT.test(value)
  );
};

const hasMetricSignal = (text) => {
  const value = String(text ?? "");
  if (!MEASURED_NUMBER.test(value)) return false;
  return STRONG_MEASURED_NUMBER.test(value) || METRIC_CONTEXT.test(value);
};

const NARRATIVE_SIGNAL_RULES = [
  {
    key: "ranked-sequence",
    family: "hero-track-v2 / vertical-step-flow",
    pattern:
      /(第[一二三四五六七八九十0-9]+个|第一|第二|第三|第四|第五|首先|然后|接着|最后|压轴)/u,
    match: hasGroupedSequenceSignal,
    visualMode: "process",
    action: "trace",
    motionPreset: "scan-lock",
    placement: "highlight",
    layoutSignature: "vertical-step-flow",
  },
  {
    key: "numeric-summary",
    family: "hero-track-v2 / metric-strip",
    pattern:
      /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)?/iu,
    match: hasMetricSignal,
    visualMode: "metrics",
    action: "counter",
    motionPreset: "number-roll",
    placement: "body",
    layoutSignature: "metric-strip",
  },
  {
    key: "tag-collection",
    family: "hero-track-v2 / tag-matrix",
    pattern: /(等等|此外|另外|包括|包含|内置|这些|一套|清单|规则|系统)/u,
    visualMode: "grid",
    action: "stack",
    motionPreset: "card-regroup",
    placement: "body",
    layoutSignature: "tag-matrix",
  },
  {
    key: "comparison",
    family: "hero-track-v2 / compare-board",
    pattern:
      /(但是|然而|不过|不是|而是|对比|左边|右边|之前|之后|默认|误区|VS)/iu,
    visualMode: "compare",
    action: "compare",
    motionPreset: "split-reveal",
    placement: "bottom",
    layoutSignature: "compare-board",
  },
  {
    key: "process-flow",
    family: "hero-track-v2 / focus-diagram",
    pattern: /(因为|所以|因此|流程|链路|输入|输出|生成|接入|沉淀)/u,
    visualMode: "process",
    action: "trace",
    motionPreset: "scan-lock",
    placement: "highlight",
    layoutSignature: "focus-diagram",
  },
];

const STOP_WORDS = new Set([
  "这个",
  "那个",
  "一个",
  "不是",
  "就是",
  "因为",
  "所以",
  "如果",
  "但是",
  "然后",
  "最后",
  "很多人",
  "同样",
  "直接",
  "真正",
  "现在",
  "以前",
  "可以",
  "需要",
]);

const ICON_RULES = [
  {
    pattern: /代码|编码|开发|工程|API|React|HTML|CSS|CLI|终端|仓库|repo/i,
    icon: "code",
    productIcon: "coding-agent",
  },
  {
    pattern: /视频|动效|渲染|帧|MP4|剪辑|录屏|Remotion|HyperFrames/i,
    icon: "film",
    productIcon: "video-engine",
  },
  {
    pattern: /PPT|PowerPoint|幻灯片|图表|形状|连线/i,
    icon: "presentation",
    productIcon: "creative-kit",
  },
  {
    pattern: /插画|配图|图片|画|手绘|素材/i,
    icon: "image-plus",
    productIcon: "creative-kit",
  },
  {
    pattern: /设计|UI|UX|排版|字体|配色|颜色|留白|品牌|审美/i,
    icon: "palette",
    productIcon: "design-system",
  },
  {
    pattern: /规则|原则|约束|清单|标准|规范|检测|验证|检查|反模式/i,
    icon: "list-checks",
    productIcon: "workflow-tool",
  },
  {
    pattern: /数据|数据库|指标|数字|统计|分析|榜单|\d/i,
    icon: "database",
    productIcon: "generic-ai",
  },
  {
    pattern: /流程|链路|步骤|工作流|输入|输出|接入|交付/i,
    icon: "workflow",
    productIcon: "workflow-tool",
  },
  {
    pattern: /Agent|AI|模型|智能|自动|助手|工具/i,
    icon: "bot",
    productIcon: "generic-ai",
  },
  {
    pattern: /评论|关注|分享|下载|发布|出成品|上线/i,
    icon: "send",
    productIcon: "generic-ai",
  },
];

const KNOWN_PRODUCT_RULES = [
  { pattern: /WorkBuddy/i, productIcon: "workbuddy" },
  { pattern: /Karpathy|编码原则/i, productIcon: "coding" },
  { pattern: /Remotion|Mo\b/i, productIcon: "remotion" },
  { pattern: /PPT Master|PowerPoint|PPT/i, productIcon: "ppt" },
  { pattern: /正文配图|小黑|插画/i, productIcon: "illustration" },
  { pattern: /HyperFrames/i, productIcon: "hyperframes" },
  { pattern: /UI Skill/i, productIcon: "ui" },
  { pattern: /Impeccable/i, productIcon: "impeccable" },
  { pattern: /Frontend Design|front.*design/i, productIcon: "frontend-design" },
  { pattern: /UI UX PRO|UX PRO/i, productIcon: "ux-pro" },
  {
    pattern: /Awesome Cloud|Cloud Design|Stripe|Linear|Versa|Recast/i,
    productIcon: "cloud-design",
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const CAPTION_SOFT_LIMIT = 28;
const CAPTION_HARD_LIMIT = 34;

const narrativeSignalForText = (text) =>
  NARRATIVE_SIGNAL_RULES.find((rule) =>
    rule.match ? rule.match(text) : rule.pattern.test(text),
  ) ?? null;

export const compactLength = (value) =>
  String(value ?? "").replace(/\s+/g, "").length;

export const slugify = (value, fallback = "script-video") => {
  const ascii = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 72);
  return ascii || fallback;
};

const sentenceFallbackSplit = (text) => {
  const compact = text.trim();
  if (!compact) return [];
  const chunks = [];
  for (let index = 0; index < compact.length; index += CAPTION_SOFT_LIMIT) {
    chunks.push(compact.slice(index, index + CAPTION_SOFT_LIMIT));
  }
  return chunks;
};

const appendCaptionPart = (parts, candidate) => {
  const text = String(candidate ?? "").trim();
  if (!text) return;
  if (compactLength(text) <= CAPTION_HARD_LIMIT) {
    parts.push(text);
    return;
  }
  parts.push(...sentenceFallbackSplit(text));
};

const splitLongSentence = (sentence) => {
  const compact = String(sentence ?? "").trim();
  if (!compact) return [];
  if (compactLength(compact) <= CAPTION_HARD_LIMIT) return [compact];
  const minorParts = compact
    .split(/(?<=[，,、：:])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  if (minorParts.length <= 1) return sentenceFallbackSplit(compact);
  const chunks = [];
  let current = "";
  for (const part of minorParts) {
    const next = current ? `${current}${part}` : part;
    if (compactLength(next) <= CAPTION_SOFT_LIMIT) {
      current = next;
      continue;
    }
    appendCaptionPart(chunks, current);
    current = "";
    appendCaptionPart(chunks, part);
  }
  appendCaptionPart(chunks, current);
  return chunks;
};

export const splitSentences = (scriptText) => {
  const normalized = String(scriptText ?? "")
    .replace(/\r/g, "")
    .replace(/\n+/g, "。")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];
  const sentences = normalized
    .split(/(?<=[。！？!?；;])\s*/u)
    .flatMap(splitLongSentence)
    .filter(Boolean);
  return sentences.length > 1 ? sentences : sentenceFallbackSplit(normalized);
};

const estimateSentenceMs = (text) => {
  const chars = compactLength(text);
  return clamp(Math.round((chars / 5.2) * 1000), 1100, 4400);
};

const readAudioDurationMs = (projectRoot, voiceSrc) => {
  if (!voiceSrc || /^https:\/\//i.test(voiceSrc)) return null;
  const audioPath = path.resolve(projectRoot, "public", voiceSrc);
  if (!existsSync(audioPath)) return null;
  try {
    const raw = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        audioPath,
      ],
      { encoding: "utf8" },
    ).trim();
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000)
      : null;
  } catch {
    return null;
  }
};

export const captionsFromScript = (scriptText, { durationMs = null } = {}) => {
  const sentences = splitSentences(scriptText);
  const estimated = sentences.map(estimateSentenceMs);
  const totalEstimate = estimated.reduce((sum, value) => sum + value, 0);
  const target =
    Number.isFinite(durationMs) && durationMs > 0 ? durationMs : totalEstimate;
  let cursor = 0;
  return sentences.map((text, index) => {
    const share =
      totalEstimate > 0
        ? estimated[index] / totalEstimate
        : 1 / Math.max(1, sentences.length);
    const length =
      index === sentences.length - 1
        ? Math.max(900, target - cursor)
        : Math.max(900, Math.round(target * share));
    const caption = {
      text,
      startMs: cursor,
      endMs: cursor + length,
      timestampMs: cursor,
      confidence: 1,
    };
    cursor += length;
    return caption;
  });
};

const parseCaptionInput = (captionsInput) => {
  const rawCaptions = Array.isArray(captionsInput)
    ? captionsInput
    : captionsInput?.captions;
  if (!Array.isArray(rawCaptions)) return [];
  const normalizeConfidence = (value) => {
    if (value == null) return null;
    const numeric = Number(value);
    // Whisper's avg_logprob is negative and is not a 0–1 confidence score.
    // Keep schema-safe probability values; otherwise explicitly mark confidence
    // as unavailable rather than inventing a misleading score.
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1
      ? numeric
      : null;
  };
  const captions = rawCaptions
    .map((caption, index) => {
      const startMs = Math.max(
        0,
        Math.round(
          Number(caption.startMs ?? caption.timestampMs ?? index * 1800),
        ),
      );
      const endCandidate = Number(caption.endMs);
      const endMs = Number.isFinite(endCandidate)
        ? Math.max(1, Math.round(endCandidate))
        : startMs + 1800;
      return {
        text: String(caption.text ?? "").trim(),
        startMs,
        endMs,
        timestampMs:
          caption.timestampMs == null
            ? null
            : Math.max(0, Math.round(Number(caption.timestampMs))),
        confidence: normalizeConfidence(caption.confidence),
      };
    })
    .filter((caption) => caption.text && caption.endMs > caption.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const merged = [];
  let leadingPunctuation = null;
  for (const caption of captions) {
    if (/[\p{L}\p{N}]/u.test(caption.text)) {
      if (leadingPunctuation) {
        merged.push({
          ...caption,
          text: `${leadingPunctuation.text}${caption.text}`,
          startMs: leadingPunctuation.startMs,
          timestampMs: leadingPunctuation.timestampMs,
        });
        leadingPunctuation = null;
      } else {
        merged.push(caption);
      }
      continue;
    }

    const previous = merged.at(-1);
    if (previous) {
      previous.text += caption.text;
      previous.endMs = Math.max(previous.endMs, caption.endMs);
    } else {
      leadingPunctuation = leadingPunctuation
        ? {
            ...leadingPunctuation,
            text: `${leadingPunctuation.text}${caption.text}`,
            endMs: Math.max(leadingPunctuation.endMs, caption.endMs),
          }
        : {...caption};
    }
  }
  return merged;
};

const alignCaptionsToAudioDuration = (captions, audioDurationMs) => {
  if (
    !Number.isFinite(audioDurationMs) ||
    audioDurationMs <= 0 ||
    captions.length === 0
  )
    return captions;
  const lastCaption = captions.at(-1);
  // Transcribers often end before the container's actual duration because of a
  // final breath or silence. Preserve the audio instead of truncating the MP4.
  if (lastCaption.endMs >= audioDurationMs) return captions;
  return captions.map((caption, index) =>
    index === captions.length - 1
      ? { ...caption, endMs: audioDurationMs }
      : caption,
  );
};

const shouldStartNewChunk = (caption, current, chunks) => {
  if (current.length === 0) return false;
  const text = caption.text.trim();
  const currentStart = current[0].startMs;
  const currentEnd = current.at(-1).endMs;
  const duration = currentEnd - currentStart;
  if (NUMBERED_CUE.test(text) || STRUCTURE_CUE.test(text)) return true;
  if (duration >= 17000 && current.length >= 2) return true;
  if (current.length >= 4) return true;
  return false;
};

const startsHardBoundary = (chunk) =>
  chunk.length > 0 && NUMBERED_CUE.test(String(chunk[0].text ?? "").trim());

const chunkDurationMs = (chunk) => chunk.at(-1).endMs - chunk[0].startMs;

const mergeSmallChunks = (chunks, maxChunks) => {
  const merged = chunks.map((chunk) => [...chunk]);
  while (merged.length > maxChunks) {
    let smallestIndex = -1;
    let smallestDuration = Infinity;
    for (let index = 0; index < merged.length - 1; index += 1) {
      if (startsHardBoundary(merged[index + 1])) continue;
      const duration = chunkDurationMs([
        ...merged[index],
        ...merged[index + 1],
      ]);
      if (duration < smallestDuration) {
        smallestDuration = duration;
        smallestIndex = index;
      }
    }
    if (smallestIndex < 0) break;
    merged.splice(smallestIndex, 2, [
      ...merged[smallestIndex],
      ...merged[smallestIndex + 1],
    ]);
  }
  return merged;
};

const splitLargeChunk = (chunk) => {
  if (chunk.length < 5) return [chunk];
  const middle = Math.ceil(chunk.length / 2);
  return [chunk.slice(0, middle), chunk.slice(middle)];
};

export const segmentCaptions = (captions, { maxScenes = 8 } = {}) => {
  const chunks = [];
  let current = [];
  for (const caption of captions) {
    if (shouldStartNewChunk(caption, current, chunks)) {
      chunks.push(current);
      current = [];
    }
    current.push(caption);
  }
  if (current.length) chunks.push(current);
  const expanded = chunks
    .flatMap(splitLargeChunk)
    .filter((chunk) => chunk.length > 0);
  return mergeSmallChunks(expanded, maxScenes);
};

const meaningfulTokens = (text, max = 6) => {
  const raw = String(text ?? "")
    .replace(/["'“”‘’《》()[\]{}]/g, " ")
    .split(/[，。！？、；：,.!?;:\s]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const tokens = [];
  for (const part of raw) {
    const english = part.match(/[A-Za-z][A-Za-z0-9+._-]{1,}/g) ?? [];
    for (const token of english) tokens.push(token);
    const numbers =
      part.match(/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/gi) ?? [];
    for (const token of numbers) tokens.push(token.trim());
    const cjk = part.replace(/[A-Za-z0-9+._%-]/g, "");
    if (cjk.length >= 2 && !STOP_WORDS.has(cjk)) {
      if (cjk.length <= 8) {
        tokens.push(cjk);
      } else {
        tokens.push(cjk.slice(0, 6));
        tokens.push(cjk.slice(-6));
      }
    }
  }
  return [...new Set(tokens)]
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, max);
};

const keywordForText = (text, fallbackIndex) => {
  const explicit = String(text).match(
    /[A-Za-z][A-Za-z0-9+._-]{2,}|\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/,
  );
  if (explicit) return explicit[0].trim().slice(0, 24);
  const tokens = meaningfulTokens(text, 4);
  return (tokens[0] ?? `要点 ${fallbackIndex + 1}`).slice(0, 24);
};

const iconForText = (text, fallbackIndex = 0) => {
  const rule = ICON_RULES.find((candidate) => candidate.pattern.test(text));
  if (rule) return rule.icon;
  const fallbackIcons = [
    "blocks",
    "focus",
    "lightbulb",
    "badge-check",
    "route",
    "zap",
  ];
  return fallbackIcons[fallbackIndex % fallbackIcons.length];
};

const productIconForText = (text) => {
  const known = KNOWN_PRODUCT_RULES.find((candidate) =>
    candidate.pattern.test(text),
  );
  if (known) return known.productIcon;
  const rule = ICON_RULES.find((candidate) => candidate.pattern.test(text));
  return rule?.productIcon ?? "generic-ai";
};

const actionForText = (text, sceneIndex, captionIndex, isLastScene) => {
  const signal = narrativeSignalForText(text);
  if (isLastScene && captionIndex > 0) return "burst";
  if (signal?.action) return signal.action;
  if (/不是|而是|对比|左边|右边|之前|之后|默认|误区|VS/i.test(text))
    return "compare";
  if (hasMetricSignal(text)) return "counter";
  if (
    /步骤|第一步|第二步|第三步|流程|链路|路径|接入|输入|输出|生成/i.test(text)
  )
    return "trace";
  if (/包括|包含|内置|几个|这些|一套|清单|规则|系统/i.test(text))
    return "stack";
  if (/核心|重点|关键|真正|本质|立场|判断/i.test(text)) return "focus";
  if (sceneIndex === 0 || NUMBERED_CUE.test(text)) return "stamp";
  return captionIndex % 3 === 0 ? "spotlight" : "focus";
};

const visualModeForText = (text, index, total) => {
  if (index === 0) return "hero";
  if (index === total - 1) return "quote";
  const signal = narrativeSignalForText(text);
  if (signal?.visualMode) return signal.visualMode;
  if (/不是|而是|对比|左边|右边|之前|之后|默认|误区|反模式|雷区/i.test(text))
    return "compare";
  if (hasMetricSignal(text)) return "metrics";
  if (
    /步骤|第一步|第二步|第三步|流程|链路|路径|接入|输入|输出|生成|沉淀/i.test(
      text,
    )
  )
    return "process";
  if (/金句|结论|最后|总结|判断/i.test(text)) return "quote";
  return "grid";
};

const evidenceForBeat = (text, action) => {
  if (action === "compare") {
    const leftRight = text.match(
      /左边是?([^，。；;]+)[，。；;]\s*右边是?([^，。；;]+)/u,
    );
    if (leftRight)
      return [
        leftRight[1].trim().slice(0, 28),
        leftRight[2].trim().slice(0, 28),
      ];
    const notBut = text.match(
      /不是([^，。；;]+)[，。；;]?(?:而是|是)([^，。；;]+)/u,
    );
    if (notBut)
      return [notBut[1].trim().slice(0, 28), notBut[2].trim().slice(0, 28)];
    const parts = meaningfulTokens(text, 2);
    return parts.length >= 2
      ? parts.map((part) => part.slice(0, 28))
      : ["旧认知", "新判断"];
  }
  if (action === "stack")
    return meaningfulTokens(text, 4).map((part) => part.slice(0, 28));
  return undefined;
};

const beatValueForText = (text) => {
  const match = hasMetricSignal(text) ? String(text).match(MEASURED_NUMBER) : null;
  return match ? match[0].trim().slice(0, 18) : undefined;
};

const frameForMs = (ms) => Math.round((ms / 1000) * FPS);

const motionPresetForAction = (action) => {
  if (action === "counter") return "number-roll";
  if (action === "compare") return "split-reveal";
  if (action === "stack") return "card-regroup";
  if (action === "trace") return "scan-lock";
  if (action === "focus") return "focus-pulse";
  if (action === "burst") return "flash-cut";
  return "slow-rise";
};

const motionPresetForText = (text, action) =>
  narrativeSignalForText(text)?.motionPreset ?? motionPresetForAction(action);

const placementForAction = (action) => {
  if (action === "stack" || action === "counter") return "body";
  if (action === "focus" || action === "trace") return "highlight";
  return "bottom";
};

const placementForText = (text, action) =>
  narrativeSignalForText(text)?.placement ?? placementForAction(action);

const SHOT_META = {
  "browser-demo": {
    environment: "Browser + DevTools",
    target: "viewport / DOM",
    actionLabel: "浏览器实操",
    evidenceType: "DOM 状态",
    objective: "展示页面与 DOM 的真实变化",
  },
  "terminal-execution": {
    environment: "Terminal + CI",
    target: "stdout / process",
    actionLabel: "终端执行",
    evidenceType: "命令输出",
    objective: "证明命令执行并产生结果",
  },
  "code-diff": {
    environment: "IDE + Diff",
    target: "changed file / diff hunk",
    actionLabel: "代码差异",
    evidenceType: "代码行",
    objective: "展示改动文件的行级变化",
  },
  "config-check": {
    environment: "Config Inspector",
    target: "config file / rule switch",
    actionLabel: "配置检查",
    evidenceType: "配置状态",
    objective: "确认配置或规则已经生效",
  },
  "interface-audit": {
    environment: "Browser + Inspector",
    target: "component / issue row",
    actionLabel: "界面审计",
    evidenceType: "DOM 状态",
    objective: "定位并审计界面问题",
  },
  "flow-trace": {
    environment: "Trace + Flow",
    target: "node graph / path",
    actionLabel: "流程追踪",
    evidenceType: "流程节点",
    objective: "把输入、处理和输出串成链路",
  },
  "test-report": {
    environment: "Test Runner",
    target: "test summary / assertions",
    actionLabel: "测试报告",
    evidenceType: "测试断言",
    objective: "用测试结果证明修复有效",
  },
  "asset-library": {
    environment: "Asset Library",
    target: "library grid / selected item",
    actionLabel: "素材库",
    evidenceType: "素材条目",
    objective: "从素材库里挑出匹配资源",
  },
  "system-map": {
    environment: "Architecture Workspace",
    target: "module graph / relation map",
    actionLabel: "系统图",
    evidenceType: "关系图",
    objective: "说明 Prompt、Skill 与 Renderer 的关系",
  },
  "before-after": {
    environment: "Split Compare",
    target: "before / after split",
    actionLabel: "前后对照",
    evidenceType: "截图差异",
    objective: "把旧状态和新状态并排对照",
  },
  "metric-highlight": {
    environment: "Metric Stage",
    target: "value / unit / context",
    actionLabel: "指标强调",
    evidenceType: "明确数值",
    objective: "突出当前口播中的明确数字和上下文",
  },
  "concept-explainer": {
    environment: "Editorial Stage",
    target: "claim / explanation / evidence",
    actionLabel: "概念解释",
    evidenceType: "语义证据",
    objective: "用清晰层级解释当前口播的核心主张",
  },
  "product-showcase": {environment: "Product Media", target: "product / work", actionLabel: "产品展示", evidenceType: "作品媒体", objective: "聚焦当前口播对应的产品或作品"},
  "editor-canvas": {environment: "Editor Canvas", target: "editable object", actionLabel: "编辑画布", evidenceType: "画布对象", objective: "展示当前可编辑对象"},
  "article-illustration": {environment: "Article Illustration", target: "article / illustration", actionLabel: "文章插画", evidenceType: "文章判断", objective: "用插画承接当前文章观点"},
  "timeline-story": {environment: "Timeline", target: "current stage", actionLabel: "时间线叙事", evidenceType: "阶段节点", objective: "按顺序呈现过程或版本"},
  "quote-callout": {environment: "Editorial Quote", target: "core claim", actionLabel: "观点引述", evidenceType: "核心判断", objective: "突出一句核心主张"},
  "checklist-progress": {environment: "Checklist", target: "current item", actionLabel: "清单进度", evidenceType: "清单项", objective: "逐项说明原则或能力"},
  "radial-explainer": {environment: "Concept Map", target: "central concept", actionLabel: "径向拆解", evidenceType: "概念要素", objective: "从中心概念拆解关键要素"},
  "media-compare": {environment: "Media Compare", target: "media difference", actionLabel: "媒体对比", evidenceType: "前后媒体", objective: "对比同一对象的不同状态"},
  "overview-matrix": {environment: "Overview Matrix", target: "capability grid", actionLabel: "能力总览", evidenceType: "能力矩阵", objective: "按顺序点亮完整能力矩阵"},
  "rule-compare": {environment: "Rule Compare", target: "rule pair", actionLabel: "规则对比", evidenceType: "正反对照", objective: "用正反对照说清规则差异"},
  "code-render": {environment: "Code Render", target: "code-to-frame", actionLabel: "代码渲染", evidenceType: "管线转译", objective: "展示代码到成片的转译过程"},
  "slide-editor": {environment: "Slide Editor", target: "slide objects", actionLabel: "幻灯片编辑", evidenceType: "原生对象", objective: "展示幻灯片对象的编辑与选区"},
  "article-map": {environment: "Article Map", target: "source-body-action", actionLabel: "文章映射", evidenceType: "判断路径", objective: "把文章判断连接到图像产出"},
  "video-agent": {environment: "Video Agent", target: "HTML-to-video", actionLabel: "视频代理", evidenceType: "转换流程", objective: "展示输入到预览再到交付的接力"},
  "design-compare": {environment: "Design Compare", target: "token surfaces", actionLabel: "设计对比", evidenceType: "设计token", objective: "展开设计 token 对页面的影响"},
  "system-summary": {environment: "System Summary", target: "center node", actionLabel: "系统汇总", evidenceType: "子系统汇聚", objective: "把多个子系统收束到中心"},
  "evidence-replay": {environment: "Evidence Replay", target: "step sequence", actionLabel: "证据回放", evidenceType: "步骤证据", objective: "按顺序定格输入、操作与结果"},
};

const lensForText = (text, shotKind, action, captionIndex) => {
  const meta = SHOT_META[shotKind];
  const signal = narrativeSignalForText(text);
  return {
    key: `${shotKind}:${captionIndex}`,
    objective: String(text ?? "").trim().slice(0, 72) || meta.objective,
    actionLabel: meta.actionLabel,
    signal: signal?.key ?? action,
    evidenceType: meta.evidenceType,
  };
};

const shotEvidenceForText = (text, shotKind, action) => {
  const value = String(text ?? "").trim();
  const tokenList = meaningfulTokens(value, 4);
  const number = beatValueForText(value);
  if (shotKind === "browser-demo") return [tokenList[0] ?? "页面", "DOM 已更新", "截图差异"];
  if (shotKind === "terminal-execution") return [commandForText(value), "stdout: ok", "exit code 0"];
  if (shotKind === "code-diff") return ["- old line", "+ new line", tokenList[0] ?? "diff hunk"];
  if (shotKind === "config-check") return [configPathForText(value), "rule enabled", "config reloaded"];
  if (shotKind === "interface-audit") return ["Inspector 面板", "问题行高亮", "DOM 状态更新"];
  if (shotKind === "flow-trace") return [tokenList[0] ?? "输入", tokenList[1] ?? "处理", tokenList[2] ?? "输出"];
  if (shotKind === "test-report") return [number ? `${number} 断言` : "test suite", "0 failed", "CI green"];
  if (shotKind === "asset-library") return [tokenList[0] ?? "素材", tokenList[1] ?? "标签", "已选中"];
  if (shotKind === "system-map") return [tokenList[0] ?? "Prompt", tokenList[1] ?? "Skill", tokenList[2] ?? "Renderer"];
  if (shotKind === "before-after") {
    const halves = value.split(/[，,。；;、：:\n]+/u).map((item) => item.trim()).filter(Boolean);
    return [halves[0] ?? "Before", halves[1] ?? "After", "Evidence"];
  }
  if (shotKind === "metric-highlight") return [number ?? "0", tokenList[0] ?? "当前指标", tokenList[1] ?? "口播上下文"];
  if (["product-showcase", "editor-canvas", "article-illustration", "timeline-story", "quote-callout", "checklist-progress", "radial-explainer", "media-compare"].includes(shotKind)) return tokenList.length ? tokenList.slice(0, 4) : [value.slice(0, 28) || "当前主张"];
  if (shotKind === "concept-explainer") return tokenList.length ? tokenList.slice(0, 3) : [value.slice(0, 28) || "当前主张"];
  return tokenList.length ? tokenList : [action || "evidence"];
};

const commandForText = (text) => {
  if (/install|安装/i.test(text)) return "npm install";
  if (/build|构建|生成/i.test(text)) return "npm run build";
  if (/test|测试|断言/i.test(text)) return "npm test";
  if (/lint|检查/i.test(text)) return "npm run lint";
  return "npm run verify";
};

const configPathForText = (text) => {
  if (/AGENTS/i.test(text)) return "AGENTS.md";
  if (/Prompt|Skill/i.test(text)) return "prompt.json";
  if (/Token|设计系统|规则/i.test(text)) return "tokens.json";
  return "config.json";
};

const shotForText = (text, shotKind, action, captionIndex, stateIndex) => {
  const meta = SHOT_META[shotKind];
  const evidence = shotEvidenceForText(text, shotKind, action);
  const number = beatValueForText(text);
  const value = String(text ?? "").trim();
  const beforeAfter = value.match(/(.+?)[，,。；;]*?(?:不是|而是|变成|变为|变成了|之后|之前)(.+)/u);
  const browserTarget = /浏览器|DevTools|DOM|页面/i.test(value) ? "viewport / DOM" : meta.target;
  return {
    kind: shotKind,
    environment: meta.environment,
    target: browserTarget,
    before: ["before-after", "media-compare"].includes(shotKind) ? (beforeAfter?.[1]?.trim().slice(0, 40) ?? evidence[0]) : undefined,
    after: ["before-after", "media-compare"].includes(shotKind) ? (beforeAfter?.[2]?.trim().slice(0, 40) ?? evidence[1]) : undefined,
    command: shotKind === "terminal-execution" ? commandForText(value) : undefined,
    path:
      shotKind === "code-diff"
        ? `src/${slugify(keywordForText(value, captionIndex), "change")}.ts`
        : shotKind === "config-check"
          ? configPathForText(value)
          : shotKind === "asset-library"
            ? "assets/library"
            : shotKind === "system-map"
              ? "architecture.map"
              : undefined,
    log:
      shotKind === "test-report"
        ? `${number ? `${number} 断言` : "test suite"} · 0 failed`
        : shotKind === "interface-audit"
          ? "Inspector flagged the current issue"
          : shotKind === "flow-trace"
            ? "input -> rule -> output"
            : undefined,
    metric:
      shotKind === "test-report" || shotKind === "metric-highlight"
        ? number ?? "100%"
        : shotKind === "browser-demo" || shotKind === "before-after"
          ? "1 screenshot diff"
          : undefined,
    status: "active",
    evidence,
  };
};

const componentPropsForShot = (label, text, shot) => ({
  title: label,
  detail: String(text ?? "").slice(0, 118),
  evidence: shot.evidence.map((item) => item.slice(0, 48)),
  metric: shot.metric,
  before: shot.before,
  after: shot.after,
  command: shot.command,
  path: shot.path,
  log: shot.log,
  status: shot.status,
});

const resolveRunDiversityComponent = ({
  text,
  action,
  captionIndex,
  stateIndex,
  sceneIndex,
  runIndex,
}) => {
  const shotKind =
    RUN_DIVERSITY_KINDS[
      (stateIndex + sceneIndex + runIndex) % RUN_DIVERSITY_KINDS.length
    ];
  const intent = {
    key: shotKind,
    shotKind,
    confidence: 0.6,
    signals: ["sequence-diversity"],
    sourceText: text,
  };
  const shot = shotForText(text, shotKind, action, captionIndex, stateIndex);
  const lens = lensForText(text, shotKind, action, captionIndex);
  const component = resolveProductionComponent({
    intent,
    shot,
    lens,
    orientation: "portrait",
  });
  return component.resolution === "matched"
    ? { intent, shotKind, shot, lens, component }
    : null;
};

const applyResolvedComponent = (state, resolved, text) => ({
  ...state,
  intent: { ...resolved.intent, sourceText: text },
  shot: resolved.shot,
  lens: resolved.lens,
  componentId: resolved.component.componentId,
  componentProps: componentPropsForShot(state.label, text, resolved.shot),
  resolution: resolved.component.resolution,
  diagnostics: resolved.component.diagnostics,
});

const visualStateForText = (text, action, captionIndex) => {
  if (/左边|右边|默认|之后|之前|不同结果|不是.*是/u.test(text))
    return "compare";
  if (hasMetricSignal(text)) return "metrics";
  if (/清单|规则|系统|包含|内置|打包|这些/u.test(text)) return "stack";
  if (/检测|标注|扫描|规避/u.test(text)) return "scan";
  if (/最后|总结|评论|发布|出成品/u.test(text)) return "outro";
  return captionIndex === 0 ? "title" : action;
};

const beatsForChunk = (
  chunk,
  sceneStartFrame,
  sceneDurationInFrames,
  sceneIndex,
  totalScenes,
) => {
  return chunk.map((caption, captionIndex) => {
    const action = actionForText(
      caption.text,
      sceneIndex,
      captionIndex,
      sceneIndex === totalScenes - 1,
    );
    const captionSourceIndex = Number.isInteger(caption.__captionIndex)
      ? caption.__captionIndex
      : captionIndex;
    let startFrame = Math.max(0, frameForMs(caption.startMs) - sceneStartFrame);
    let endFrame = Math.min(
      sceneDurationInFrames,
      frameForMs(caption.endMs) - sceneStartFrame,
    );
    startFrame = clamp(startFrame, 0, Math.max(0, sceneDurationInFrames - 1));
    endFrame = clamp(endFrame, startFrame + 1, sceneDurationInFrames);
    const beat = {
      startFrame,
      endFrame,
      captionStartIndex: captionSourceIndex,
      captionEndIndex: captionSourceIndex,
      keyword: keywordForText(caption.text, captionIndex),
      icon: iconForText(caption.text, captionIndex),
      action,
      visualState: visualStateForText(caption.text, action, captionIndex),
      motionPreset: motionPresetForText(caption.text, action),
      placement: placementForText(caption.text, action),
      detail: caption.text.slice(0, 60),
    };
    const evidence = evidenceForBeat(caption.text, action);
    if (evidence?.length) beat.evidence = evidence;
    const value = beatValueForText(caption.text);
    if (value && action === "counter") beat.value = value;
    return beat;
  });
};

const heroTrackKindForScene = (sceneText, index, totalScenes) => {
  if (index === 0) return "overview-matrix";
  if (index === totalScenes - 1) return "system-summary";
  if (/Karpathy|编码原则|无关改动|讲清假设/i.test(sceneText))
    return "rule-compare";
  if (/Remotion|React|帧画面|MP4/i.test(sceneText)) return "code-render";
  if (/PPT Master|PowerPoint|幻灯片|原生对象/i.test(sceneText))
    return "slide-editor";
  if (/正文配图|配图|素材|写文章/i.test(sceneText)) return "article-map";
  if (/HyperFrames|HTML|视频 Agent|视频/i.test(sceneText)) return "video-agent";
  if (/UI Skill|设计立场|排版|留白/i.test(sceneText)) return "design-compare";
  // No hard-coded shell default: derive from the resolved caption semantics and
  // only keep kinds that still exist in the retained legacy track set.
  const intent = resolveSemanticIntent(sceneText, {sceneIndex: index, sceneCount: totalScenes});
  return intent.shotKind in HERO_ENTITY_TARGETS ? intent.shotKind : "overview-matrix";
};

const HERO_ENTITY_TARGETS = {
  "overview-matrix": [
    "skill-01",
    "skill-02",
    "skill-03",
    "skill-04",
    "skill-05",
    "skill-06",
  ],
  "rule-compare": [
    "bad-rule-01",
    "bad-rule-02",
    "bad-rule-03",
    "good-rule-02",
    "terminal-verify",
  ],
  "code-render": ["code-line-01", "code-line-02", "frame-track", "mp4-output"],
  "slide-editor": [
    "slide-01",
    "shape-object",
    "chart-object",
    "text-object",
    "export-result",
  ],
  "article-map": [
    "article-source",
    "article-body",
    "article-bridge",
    "article-action",
  ],
  "video-agent": [
    "input-html",
    "agent-run",
    "render-preview",
    "capability-matrix",
  ],
  "design-compare": [
    "before-surface",
    "type-token",
    "space-token",
    "color-token",
    "system-token",
  ],
  "system-summary": [
    "summary-input",
    "summary-rules",
    "summary-process",
    "summary-evidence",
    "summary-output",
    "summary-result",
  ],
};

// The eleven cinematic components are motion language, not replacement hero
// layouts. A Hero Track keeps one stable technical composition while these
// short transitions carry the spoken shift into the next state.
const CINEMATIC_PRESETS = [
  "kinetic-type",
  "split-wipe",
  "particle-field",
  "orbital-map",
  "ui-scan",
  "material-carousel",
  "focus-lock",
  "pipeline-flow",
  "token-assembly",
  "surface-morph",
  "system-convergence",
];

const cinematicPresetForState = (
  text,
  stateIndex,
  heroTrackKind,
  previousPreset,
) => {
  const value = String(text ?? "");
  // Named product tracks carry known technical entities. Their motion must be
  // chosen from the entity sequence, not from loose keyword coincidence.
  const productSequences = {
    "overview-matrix": ["kinetic-type", "focus-lock", "system-convergence"],
    "rule-compare": [
      "kinetic-type",
      "focus-lock",
      "split-wipe",
      "focus-lock",
      "orbital-map",
    ],
    "code-render": [
      "kinetic-type",
      "focus-lock",
      "pipeline-flow",
      "surface-morph",
    ],
    "slide-editor": [
      "kinetic-type",
      "focus-lock",
      "particle-field",
      "focus-lock",
      "pipeline-flow",
    ],
    "article-map": [
      "kinetic-type",
      "focus-lock",
      "pipeline-flow",
      "split-wipe",
      "surface-morph",
    ],
    "video-agent": [
      "kinetic-type",
      "pipeline-flow",
      "surface-morph",
      "orbital-map",
    ],
    "design-compare": [
      "split-wipe",
      "token-assembly",
      "focus-lock",
      "material-carousel",
      "token-assembly",
    ],
    "system-summary": [
      "focus-lock",
      "pipeline-flow",
      "orbital-map",
      "system-convergence",
    ],
  };
  const knownSequence = productSequences[heroTrackKind];
  if (knownSequence) {
    const preset =
      knownSequence[Math.min(stateIndex, knownSequence.length - 1)];
    if (preset !== previousPreset) return preset;
    return CINEMATIC_PRESETS[
      (CINEMATIC_PRESETS.indexOf(preset) + 1) % CINEMATIC_PRESETS.length
    ];
  }
  let preferred;
  if (stateIndex === 0) preferred = "kinetic-type";
  else if (/对比|不是|而是|之前|之后|默认|不同/i.test(value))
    preferred = "split-wipe";
  else if (hasMetricSignal(value))
    preferred = "particle-field";
  else if (/检测|审计|扫描|标记|问题/i.test(value)) preferred = "ui-scan";
  else if (/颜色|字体|间距|Token|设计系统|WCAG/i.test(value))
    preferred = "token-assembly";
  else if (/风格|方向|材质|Swiss|Nordic|Neo/i.test(value))
    preferred = "material-carousel";
  else if (/锁定|锚定|聚焦|选择|确定/i.test(value)) preferred = "focus-lock";
  else if (/流程|路径|输入|输出|接入|穿过|生成/i.test(value))
    preferred = "pipeline-flow";
  else if (/变成|形变|切换|场景|官网|后台/i.test(value))
    preferred = "surface-morph";
  else if (/汇聚|总结|收尾|系统|全部|多个|分类|规则/i.test(value))
    preferred =
      heroTrackKind === "system-summary" ? "system-convergence" : "orbital-map";
  else
    preferred =
      CINEMATIC_PRESETS[
        (stateIndex +
          CINEMATIC_PRESETS.indexOf(previousPreset || "kinetic-type") +
          1) %
          CINEMATIC_PRESETS.length
      ];
  if (preferred !== previousPreset) return preferred;
  return CINEMATIC_PRESETS[
    (CINEMATIC_PRESETS.indexOf(preferred) + 1) % CINEMATIC_PRESETS.length
  ];
};

const heroEntityTargetForState = (kind, stateIndex) => {
  const targets =
    HERO_ENTITY_TARGETS[kind] ?? HERO_ENTITY_TARGETS["overview-matrix"];
  return targets[Math.min(stateIndex, targets.length - 1)];
};

const heroStatesForChunk = (
  chunk,
  sceneStartFrame,
  sceneDurationInFrames,
  heroTrackKind,
  sceneIndex,
  totalScenes,
) => {
  let previousCinematicPreset = "";
  let previousEnd = 0;
  let previousComponentId = "";
  let componentRun = 0;
  return chunk.map((caption, stateIndex, statesSource) => {
    const text = caption.text;
    const captionIndex = Number.isInteger(caption.__captionIndex)
      ? caption.__captionIndex
      : stateIndex;
    const action = actionForText(
      text,
      sceneIndex,
      stateIndex,
      sceneIndex === totalScenes - 1,
    );
    let intent = resolveSemanticIntent(text, {sceneIndex, sceneCount: totalScenes});
    let shotKind = intent.shotKind;
    let shot = shotForText(text, shotKind, action, captionIndex, stateIndex);
    let lens = lensForText(text, shotKind, action, captionIndex);
    let component = resolveProductionComponent({intent, shot, lens, orientation: "portrait"});
    const previous = stateIndex > 1 ? statesSource[stateIndex - 2] : null;
    if (component.componentId === "concept-explainer" && intent.key === "concept-explanation" && previous?.text) {
      const alternateIntent = resolveSemanticIntent(`${text} ${previous.text}`, {sceneIndex, sceneCount: totalScenes});
      const alternateShot = shotForText(text, alternateIntent.shotKind, action, captionIndex, stateIndex);
      const alternateLens = lensForText(text, alternateIntent.shotKind, action, captionIndex);
      const alternate = resolveProductionComponent({intent: alternateIntent, shot: alternateShot, lens: alternateLens, orientation: "portrait"});
      if (alternate.resolution === "matched" && alternate.componentId !== "concept-explainer") {
        intent = {...alternateIntent, sourceText: text};
        shotKind = alternateIntent.shotKind;
        shot = alternateShot;
        lens = alternateLens;
        component = alternate;
      }
    }
    if (component.componentId === previousComponentId) componentRun += 1;
    else componentRun = 1;
    if (componentRun > 2) {
      const diverse = resolveRunDiversityComponent({
        text,
        action,
        captionIndex,
        stateIndex,
        sceneIndex,
        runIndex: componentRun,
      });
      if (diverse) {
        intent = {...diverse.intent, sourceText: text};
        shotKind = diverse.shotKind;
        shot = diverse.shot;
        lens = diverse.lens;
        component = diverse.component;
        componentRun = 1;
      }
    }
    previousComponentId = component.componentId;
    const next = statesSource[stateIndex + 1];
    const label = keywordForText(text, stateIndex);
    let startFrame =
      stateIndex === 0
        ? 0
        : Math.max(0, frameForMs(caption.startMs) - sceneStartFrame);
    let endFrame =
      stateIndex === statesSource.length - 1 || !next
        ? sceneDurationInFrames
        : Math.min(sceneDurationInFrames, frameForMs(next.startMs) - sceneStartFrame);
    if (stateIndex > 0 && startFrame - previousEnd > 6) startFrame = previousEnd;
    startFrame = clamp(startFrame, 0, Math.max(0, sceneDurationInFrames - 1));
    endFrame = clamp(endFrame, startFrame + 1, sceneDurationInFrames);
    previousEnd = endFrame;
    const preset = cinematicPresetForState(
      text,
      stateIndex,
      heroTrackKind,
      previousCinematicPreset,
    );
    previousCinematicPreset = preset;
    return {
      startFrame,
      endFrame,
      captionStartIndex: captionIndex,
      captionEndIndex: captionIndex,
      label,
      detail: text.slice(0, 118),
      evidence: shot.evidence.map((item) => item.slice(0, 48)),
      entityTarget: heroEntityTargetForState(heroTrackKind, stateIndex),
      cinematicPreset: preset,
      lens,
      shot,
      intent,
      componentId: component.componentId,
      componentProps: componentPropsForShot(label, text, shot),
      resolution: component.resolution,
      diagnostics: component.diagnostics,
    };
  });
};

const labelsForChunk = (text) => {
  const tokens = meaningfulTokens(text, 6);
  if (tokens.length >= 3) return tokens;
  const sentences = splitSentences(text).map((part) => keywordForText(part, 0));
  return [...new Set([...tokens, ...sentences])].slice(0, 6);
};

const layoutSignatureForScene = (sceneText, visualMode, index) => {
  const signal = narrativeSignalForText(sceneText);
  if (signal?.layoutSignature) return signal.layoutSignature;
  if (visualMode === "hero") return "hero-title";
  if (visualMode === "quote") return "quote-close";
  if (visualMode === "metrics") return "metric-strip";
  if (visualMode === "compare") return "compare-board";
  if (visualMode === "process")
    return index % 2 === 0 ? "vertical-step-flow" : "focus-diagram";
  return index % 2 === 0 ? "icon-grid" : "tag-matrix";
};

const visualSystemVariantForText = (text, fallbackSeed = "") => {
  const value = `${text} ${fallbackSeed}`;
  if (/产品|客户|用户|订单|库存|销售|营销|品牌|发布|门店|收入|预算|商品|供应商|货架|补货/u.test(value)) {
    return "product-console";
  }
  if (/代码|终端|命令|React|Remotion|API|JSON|配置|测试|构建|浏览器|DevTools|DOM|CI|HTML/i.test(value)) {
    return "cinematic-tech";
  }
  if (/课程|知识|讲解|概念|原理|学习|方法论|课堂|读懂|判断|比喻/u.test(value)) {
    return "editorial-lightcut";
  }
  const seed = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return VISUAL_SYSTEM_VARIANTS[seed % VISUAL_SYSTEM_VARIANTS.length];
};

const pacingForCaptions = (captions, text) => {
  const durations = captions.map((caption) => caption.endMs - caption.startMs).filter((duration) => duration > 0);
  const meanDuration = durations.length
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : 0;
  if (meanDuration <= 1700 || captions.length >= 36) return "fast";
  if (meanDuration >= 2800 || /讲解|教程|课程|原理|方法论|为什么/u.test(text)) return "explainer";
  return "balanced";
};

const paletteForVisualSystem = (variant) => {
  if (variant === "editorial-lightcut") {
    return ["#ffd166", "#48e7f3", "#ff7aa8", "#63f0aa", "#ad94ff", "#7e98ff"];
  }
  if (variant === "product-console") {
    return ["#63f0aa", "#ffd166", "#48e7f3", "#ff7aa8", "#7e98ff", "#ad94ff"];
  }
  return PALETTE;
};

const scenePrimitiveFor = ({sceneText, visualMode, heroTrackKind, isFirst, isLast}) => {
  if (isFirst) return "hook-title";
  if (isLast) return "quote-close";
  if (heroTrackKind === "overview-matrix" || /总览|矩阵|几个|能力/u.test(sceneText)) return "capability-matrix";
  if (heroTrackKind === "rule-compare" || visualMode === "compare") return "problem-solution-compare";
  if (heroTrackKind === "code-render" || /代码|终端|命令|测试|配置|diff|npm|React/i.test(sceneText)) return "code-or-terminal-evidence";
  if (heroTrackKind === "slide-editor" || /画布|编辑|PPT|PowerPoint|对象/u.test(sceneText)) return "editor-canvas-demo";
  if (visualMode === "metrics" || hasMetricSignal(sceneText)) return "metric-spike";
  if (heroTrackKind === "system-summary") return "system-summary";
  if (visualMode === "quote") return "quote-close";
  return "process-map";
};

const scenePrimitiveForState = (state, fallbackPrimitive) => {
  const componentId = state.componentId ?? state.shot?.kind;
  if (["overview-matrix", "product-showcase"].includes(componentId)) return "capability-matrix";
  if (["rule-compare", "before-after", "media-compare", "design-compare"].includes(componentId)) return "problem-solution-compare";
  if (["terminal-execution", "code-diff", "config-check", "code-render", "test-report"].includes(componentId)) return "code-or-terminal-evidence";
  if (["slide-editor", "editor-canvas", "browser-demo", "interface-audit", "asset-library"].includes(componentId)) return "editor-canvas-demo";
  if (componentId === "metric-highlight") return "metric-spike";
  if (["quote-callout", "concept-explainer"].includes(componentId)) return "quote-close";
  if (componentId === "system-summary" || componentId === "system-map") return "system-summary";
  return fallbackPrimitive;
};

const directorMotionPresetFor = ({beat, state, scenePrimitive, stateIndex}) => {
  const sourcePreset = state.cinematicPreset ?? beat?.shotPreset ?? beat?.motionPreset ?? "";
  if (scenePrimitive === "capability-matrix" || sourcePreset === "card-regroup") return "matrix-step";
  if (scenePrimitive === "problem-solution-compare" || sourcePreset === "split-wipe" || sourcePreset === "split-reveal") return "split-reveal";
  if (scenePrimitive === "editor-canvas-demo" || /object|canvas|slide|editor/i.test(String(state.componentId ?? ""))) return "object-select";
  if (scenePrimitive === "metric-spike" || sourcePreset === "number-roll" || beat?.action === "counter") return "number-roll";
  if (scenePrimitive === "process-map" || sourcePreset === "pipeline-flow" || sourcePreset === "scan-lock" || beat?.action === "trace") return "path-draw";
  if (scenePrimitive === "quote-close" || beat?.action === "stamp" || beat?.action === "burst") return "quote-snap";
  if (sourcePreset === "focus-lock" || sourcePreset === "ui-scan") return "focus-lock";
  return stateIndex === 0 ? "stage-breathe" : "handoff-wipe";
};

const directorTransitionPresetFor = (index, totalScenes, visualSystemVariant) => {
  if (index === totalScenes - 1) return "none";
  if (visualSystemVariant === "product-console" && index % 3 === 1) return "stage-slide";
  if (visualSystemVariant === "editorial-lightcut" && index % 3 === 2) return "contrast-flash";
  return DIRECTOR_TRANSITION_PRESETS[index % DIRECTOR_TRANSITION_PRESETS.length];
};

const directorDensityFor = (scenePrimitive, state) => {
  if (["capability-matrix", "editor-canvas-demo", "process-map"].includes(scenePrimitive)) return "high";
  if (["quote-close", "metric-spike"].includes(scenePrimitive)) return "low";
  const evidenceCount = Array.isArray(state.evidence) ? state.evidence.length : 0;
  return evidenceCount >= 4 ? "high" : "medium";
};

const transitionForDirectorPreset = (preset, index) => {
  if (preset === "none") return false;
  return {
    type: preset === "stage-slide" ? "slide" : "fade",
    durationInFrames: preset === "contrast-flash" ? 8 : index % 2 === 0 ? 10 : 12,
  };
};

const directorForState = ({
  state,
  beat,
  scenePrimitive,
  layoutSignature,
  transitionPreset,
  stateIndex,
}) => {
  const resolvedPrimitive = scenePrimitiveForState(state, scenePrimitive);
  return {
    scenePrimitive: resolvedPrimitive,
    layoutSignature,
    motionPreset: directorMotionPresetFor({
      beat,
      state,
      scenePrimitive: resolvedPrimitive,
      stateIndex,
    }),
    transitionPreset,
    focusTarget: state.entityTarget,
    density: directorDensityFor(resolvedPrimitive, state),
  };
};

const BODY_LAYOUT_FALLBACKS = [
  "hero-title",
  "vertical-step-flow",
  "metric-strip",
  "tag-matrix",
  "compare-board",
  "focus-diagram",
  "icon-grid",
  "quote-close",
  "system-orbit",
];

const nonRepeatingBodyLayoutForScene = (
  sceneText,
  visualMode,
  index,
  previousLayouts,
) => {
  const preferred = index === 0
    ? "hero-title"
    : layoutSignatureForScene(sceneText, visualMode, index);
  if (!previousLayouts.includes(preferred)) return preferred;
  const unused = BODY_LAYOUT_FALLBACKS.find(
    (layout) => !previousLayouts.includes(layout),
  );
  if (unused) return unused;
  if (
    previousLayouts.length < 2 ||
    previousLayouts.at(-1) !== preferred ||
    previousLayouts.at(-2) !== preferred
  ) {
    return preferred;
  }
  return (
    BODY_LAYOUT_FALLBACKS.find(
      (layout) =>
        layout !== preferred &&
        layout !== previousLayouts.at(-1) &&
        layout !== previousLayouts.at(-2),
    ) ?? preferred
  );
};

const dominantNarrativeSignal = (sceneText) => {
  const signal = narrativeSignalForText(sceneText);
  if (!signal) return undefined;
  return {
    key: signal.key,
    family: signal.family,
  };
};

const sceneTitleFor = (text, index, title) => {
  if (index === 0) return title;
  const keyword = keywordForText(text, index);
  return keyword.length >= 2 ? keyword : `章节 ${index + 1}`;
};

const capConsecutiveComponentRuns = (scenes) => {
  let previousComponentId = "";
  let componentRun = 0;
  scenes.forEach((scene, sceneIndex) => {
    const states = scene.payload?.heroTrack?.states;
    if (!Array.isArray(states)) return;
    states.forEach((state, stateIndex) => {
      if (state.componentId === previousComponentId) componentRun += 1;
      else componentRun = 1;
      if (componentRun <= 2) {
        previousComponentId = state.componentId;
        return;
      }

      const text = String(state.detail ?? state.intent?.sourceText ?? "").trim();
      const captionIndex = Number.isInteger(state.captionStartIndex)
        ? state.captionStartIndex
        : stateIndex;
      const action = actionForText(
        text,
        sceneIndex,
        stateIndex,
        sceneIndex === scenes.length - 1,
      );
      const diverse = resolveRunDiversityComponent({
        text,
        action,
        captionIndex,
        stateIndex,
        sceneIndex,
        runIndex: componentRun,
      });
      if (!diverse || diverse.component.componentId === previousComponentId) {
        previousComponentId = state.componentId;
        return;
      }
      states[stateIndex] = applyResolvedComponent(state, diverse, text);
      previousComponentId = states[stateIndex].componentId;
      componentRun = 1;
    });
  });
};

const refreshSceneDirectors = (scenes) => {
  scenes.forEach((scene, sceneIndex) => {
    const states = scene.payload?.heroTrack?.states;
    const beats = scene.payload?.beats;
    if (!Array.isArray(states) || !Array.isArray(beats)) return;
    const transitionPreset = sceneIndex === scenes.length - 1
      ? "none"
      : states[0]?.director?.transitionPreset ?? scene.payload?.director?.transitionPreset ?? "ambient-fade";
    const scenePrimitive = scene.payload?.director?.scenePrimitive ?? scenePrimitiveFor({
      sceneText: String(scene.payload?.sourceText ?? ""),
      visualMode: scene.payload?.visualMode,
      heroTrackKind: scene.payload?.heroTrack?.kind,
      isFirst: sceneIndex === 0,
      isLast: sceneIndex === scenes.length - 1,
    });
    const layoutSignature = String(scene.payload?.layoutSignature ?? "");
    states.forEach((state, stateIndex) => {
      const beat = beats.find((candidate) => candidate.captionStartIndex === state.captionStartIndex) ?? beats[stateIndex];
      state.director = directorForState({
        state,
        beat,
        scenePrimitive,
        layoutSignature,
        transitionPreset,
        stateIndex,
      });
    });
    scene.payload.director = states[0]?.director ?? scene.payload.director;
  });
};

export const buildSkillShowcaseProjectFromScript = ({
  scriptText,
  captions: captionsInput,
  projectId,
  title,
  voiceSrc,
  projectRoot,
  maxScenes = 8,
}) => {
  const resolvedTitle =
    String(title ?? "").trim() || keywordForText(scriptText, 0) || "口播视频";
  const resolvedProjectId = slugify(projectId || resolvedTitle);
  const audioDurationMs = readAudioDurationMs(projectRoot, voiceSrc);
  const captions = parseCaptionInput(captionsInput);
  const unalignedCaptions = captions.length
    ? captions
    : captionsFromScript(scriptText, { durationMs: audioDurationMs });
  const resolvedCaptions = alignCaptionsToAudioDuration(
    unalignedCaptions,
    audioDurationMs,
  );
  if (!resolvedCaptions.length) {
    throw new Error("[SCRIPT_EMPTY] script text or captions are required");
  }

  const indexedCaptions = resolvedCaptions.map((caption, index) => ({
    ...caption,
    __captionIndex: index,
  }));
  const fullNarrationText = resolvedCaptions.map((caption) => caption.text).join("");
  const visualSystem = {
    variant: visualSystemVariantForText(`${resolvedTitle}${fullNarrationText}`, resolvedProjectId),
    pacing: pacingForCaptions(resolvedCaptions, fullNarrationText),
    platform: "portrait",
  };
  const scenePalette = paletteForVisualSystem(visualSystem.variant);
  const chunks = segmentCaptions(indexedCaptions, { maxScenes });
  const allLabels = labelsForChunk(
    resolvedCaptions.map((caption) => caption.text).join(""),
  ).slice(0, 6);
  const allProductIcons = allLabels.map((label) => productIconForText(label));
  const allLabelIcons = allLabels.map((label, index) =>
    iconForText(label, index),
  );
  const bodyLayoutSignatures = [];
  const scenes = chunks.map((chunk, index) => {
    const sceneText = chunk.map((caption) => caption.text).join("");
    const sceneStartMs = chunk[0].startMs;
    const sceneEndMs = chunk.at(-1).endMs;
    const sceneStartFrame = frameForMs(sceneStartMs);
    const sceneEndFrame = frameForMs(sceneEndMs);
    const durationInFrames = Math.max(1, sceneEndFrame - sceneStartFrame);
    const captionStartIndex = chunk[0].__captionIndex;
    const captionEndIndex = chunk.at(-1).__captionIndex;
    const isFirst = index === 0;
    const isLast = index === chunks.length - 1;
    const visualMode = visualModeForText(sceneText, index, chunks.length);
    const heroTrackKind = heroTrackKindForScene(
      sceneText,
      index,
      chunks.length,
    );
    const scenePrimitive = scenePrimitiveFor({
      sceneText,
      visualMode,
      heroTrackKind,
      isFirst,
      isLast,
    });
    const transitionPreset = directorTransitionPresetFor(
      index,
      chunks.length,
      visualSystem.variant,
    );
    const bodyLayoutSignature = nonRepeatingBodyLayoutForScene(
      sceneText,
      visualMode,
      index,
      bodyLayoutSignatures,
    );
    bodyLayoutSignatures.push(bodyLayoutSignature);
    const layoutSignature = `portrait:hero-track-v2:${bodyLayoutSignature}`;
    const labels = labelsForChunk(sceneText);
    const productIcon = productIconForText(sceneText);
    const beats = beatsForChunk(
      chunk,
      sceneStartFrame,
      durationInFrames,
      index,
      chunks.length,
    );
    const heroStates = heroStatesForChunk(
      chunk,
      sceneStartFrame,
      durationInFrames,
      heroTrackKind,
      index,
      chunks.length,
    ).map((state, stateIndex) => {
      const beat = beats.find((candidate) => candidate.captionStartIndex === state.captionStartIndex) ?? beats[stateIndex];
      return {
        ...state,
        director: directorForState({
          state,
          beat,
          scenePrimitive,
          layoutSignature,
          transitionPreset,
          stateIndex,
        }),
      };
    });
    const sceneDirector = heroStates[0]?.director ?? {
      scenePrimitive,
      layoutSignature,
      motionPreset: "stage-breathe",
      transitionPreset,
      density: "medium",
    };
    const heroTrack = {
      kind: heroTrackKind,
      captionStartIndex,
      captionEndIndex,
      states: heroStates,
    };
    const payload = {
      variant: isFirst ? "intro" : isLast ? "outro" : "generic",
      visualMode,
      visualSystem,
      director: sceneDirector,
      heroStyle: "hero-track-v2",
      narrativeSignal: dominantNarrativeSignal(sceneText),
      layoutSignature,
      title: sceneTitleFor(sceneText, index, resolvedTitle),
      subtitle: sceneText.slice(0, 92),
      brandName: resolvedTitle.slice(0, 32),
      brandIcon: productIcon,
      productIcon,
      eyebrow: isFirst
        ? "本片重点"
        : isLast
          ? "最后收束"
          : `章节 ${String(index + 1).padStart(2, "0")}`,
      headline: isFirst ? resolvedTitle : keywordForText(sceneText, index),
      body: sceneText.slice(0, 118),
      footer: isLast ? "按当前口播生成新视觉合同" : undefined,
      accent: scenePalette[index % scenePalette.length],
      secondaryAccent: scenePalette[(index + 1) % scenePalette.length],
      bullets: labels.slice(0, 4),
      labels: isFirst || isLast ? allLabels : labels,
      labelIcons: (isFirst || isLast
        ? allLabelIcons
        : labels.map((label, labelIndex) => iconForText(label, labelIndex))
      ).slice(0, 8),
      productIcons: (isFirst || isLast
        ? allProductIcons
        : labels.map((label) => productIconForText(label))
      ).slice(0, 8),
      progressIndex: index,
      progressTotal: chunks.length,
      captionStartIndex,
      captionEndIndex,
      sourceText: sceneText.slice(0, 800),
      beats,
      heroTrack,
    };
    return {
      id: isFirst
        ? "intro"
        : isLast
          ? "outro"
          : `scene-${String(index + 1).padStart(2, "0")}-${slugify(payload.headline, "topic").slice(0, 24)}`,
      family: "skill-showcase",
      durationInFrames,
      captionRange: {
        startIndex: captionStartIndex,
        endIndex: captionEndIndex,
      },
      payload,
      assetIds: [],
      transition: transitionForDirectorPreset(transitionPreset, index),
    };
  });
  capConsecutiveComponentRuns(scenes);
  refreshSceneDirectors(scenes);

  const visualPlanEntries = scenes.flatMap((scene, sceneIndex) => {
    const beats = scene.payload.beats;
    return scene.payload.heroTrack.states.map((state, stateIndex) => {
      const beat = beats.find((candidate) => candidate.captionStartIndex === state.captionStartIndex) ?? beats[stateIndex];
      return {
        id: `${scene.id}:caption-${state.captionStartIndex}`,
        sceneId: scene.id,
        sceneIndex,
        captionStartIndex: state.captionStartIndex,
        captionEndIndex: state.captionEndIndex,
        startFrame: state.startFrame,
        endFrame: state.endFrame,
        intent: state.intent,
        beat: {
          keyword: beat.keyword,
          icon: beat.icon,
          action: beat.action,
          visualState: beat.visualState,
          motionPreset: beat.motionPreset,
          placement: beat.placement,
          shotPreset: state.cinematicPreset,
          detail: beat.detail,
          evidence: beat.evidence,
          value: beat.value,
        },
        lens: state.lens,
        shot: state.shot,
        componentId: state.componentId,
        componentProps: state.componentProps,
        director: state.director,
        assetIds: [],
        orientation: "portrait",
        resolution: state.resolution,
        diagnostics: state.diagnostics,
      };
    });
  });
  const visualPlanDiagnostics = visualPlanEntries.flatMap((entry) =>
    entry.diagnostics.map((diagnostic) => ({...diagnostic, path: `visualPlan.entries.${entry.id}`})),
  );

  const assets = {};
  const audio = {};
  if (voiceSrc) {
    assets.voiceover = { kind: "audio", src: voiceSrc, required: true };
    audio.voiceAssetId = "voiceover";
  }

  return {
    schemaVersion: 1,
    projectId: resolvedProjectId,
    title: resolvedTitle,
    render: {
      fps: FPS,
      width: 1080,
      height: 1920,
      qualityMode: "cinematic",
      orientation: "portrait",
      captionStyle: "editorial",
      showProjectLabel: false,
    },
    scenes,
    captions: resolvedCaptions,
    visualSystem,
    visualPlan: {
      version: 1,
      generatedFrom: "captions",
      narrationHash: createHash("sha256").update(JSON.stringify(resolvedCaptions.map(({text, startMs, endMs}) => ({text, startMs, endMs})))).digest("hex"),
      entries: visualPlanEntries,
      diagnostics: visualPlanDiagnostics,
    },
    audio,
    assets,
  };
};
