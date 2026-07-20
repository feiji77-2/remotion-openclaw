import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

export const FPS = 30;

// Chapter accents are intentionally lifted for small 9:16 screens. The stage
// owns darkness; an accent must remain readable above it at a glance.
const PALETTE = ['#48e7f3', '#ad94ff', '#63f0aa', '#ffd166', '#ff7aa8', '#7e98ff'];

const NUMBERED_CUE = /^(第[一二三四五六七八九十0-9]+个|第[一二三四五六七八九十0-9]+步|首先|然后|接着|最后|压轴|总结|注意)/u;
const STRUCTURE_CUE = /^(但是|然而|不过|因为|所以|因此|此外|另外)/u;

const NARRATIVE_SIGNAL_RULES = [
  {
    key: 'spoken-ranking',
    family: 'spoken-ranking / step-flow',
    pattern: /(第[一二三四五六七八九十0-9]+个|第一|第二|第三|第四|第五|首先|然后|接着|最后|压轴)/u,
    visualMode: 'process',
    action: 'trace',
    motionPreset: 'scan-lock',
    placement: 'highlight',
    layoutSignature: 'vertical-step-flow',
  },
  {
    key: 'spoken-takeaway',
    family: 'spoken-takeaway / number-strip',
    pattern: /(左右|大约|接近|超过|至少|不到|约|\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?)/iu,
    visualMode: 'metrics',
    action: 'counter',
    motionPreset: 'number-roll',
    placement: 'body',
    layoutSignature: 'metric-strip',
  },
  {
    key: 'spoken-tags',
    family: 'spoken-tags / tag-matrix',
    pattern: /(等等|此外|另外|包括|包含|内置|这些|一套|清单|规则|系统)/u,
    visualMode: 'grid',
    action: 'stack',
    motionPreset: 'card-regroup',
    placement: 'body',
    layoutSignature: 'tag-matrix',
  },
  {
    key: 'spoken-compare',
    family: 'spoken-compare / compare-board',
    pattern: /(但是|然而|不过|不是|而是|对比|左边|右边|之前|之后|默认|误区|VS)/iu,
    visualMode: 'compare',
    action: 'compare',
    motionPreset: 'split-reveal',
    placement: 'bottom',
    layoutSignature: 'compare-board',
  },
  {
    key: 'spoken-process',
    family: 'spoken-process / focus-diagram',
    pattern: /(因为|所以|因此|流程|链路|输入|输出|生成|接入|沉淀)/u,
    visualMode: 'process',
    action: 'trace',
    motionPreset: 'scan-lock',
    placement: 'highlight',
    layoutSignature: 'focus-diagram',
  },
];

const STOP_WORDS = new Set([
  '这个',
  '那个',
  '一个',
  '不是',
  '就是',
  '因为',
  '所以',
  '如果',
  '但是',
  '然后',
  '最后',
  '很多人',
  '同样',
  '直接',
  '真正',
  '现在',
  '以前',
  '可以',
  '需要',
]);

const ICON_RULES = [
  {pattern: /代码|编码|开发|工程|API|React|HTML|CSS|CLI|终端|仓库|repo/i, icon: 'code', productIcon: 'coding-agent'},
  {pattern: /视频|动效|渲染|帧|MP4|剪辑|录屏|Remotion|HyperFrames/i, icon: 'film', productIcon: 'video-engine'},
  {pattern: /PPT|PowerPoint|幻灯片|图表|形状|连线/i, icon: 'presentation', productIcon: 'creative-kit'},
  {pattern: /插画|配图|图片|画|手绘|素材/i, icon: 'image-plus', productIcon: 'creative-kit'},
  {pattern: /设计|UI|UX|排版|字体|配色|颜色|留白|品牌|审美/i, icon: 'palette', productIcon: 'design-system'},
  {pattern: /规则|原则|约束|清单|标准|规范|检测|验证|检查|反模式/i, icon: 'list-checks', productIcon: 'workflow-tool'},
  {pattern: /数据|数据库|指标|数字|统计|分析|榜单|\d/i, icon: 'database', productIcon: 'generic-ai'},
  {pattern: /流程|链路|步骤|工作流|输入|输出|接入|交付/i, icon: 'workflow', productIcon: 'workflow-tool'},
  {pattern: /Agent|AI|模型|智能|自动|助手|工具/i, icon: 'bot', productIcon: 'generic-ai'},
  {pattern: /评论|关注|分享|下载|发布|出成品|上线/i, icon: 'send', productIcon: 'generic-ai'},
];

const KNOWN_PRODUCT_RULES = [
  {pattern: /WorkBuddy/i, productIcon: 'workbuddy'},
  {pattern: /Karpathy|编码原则/i, productIcon: 'coding'},
  {pattern: /Remotion|Mo\b/i, productIcon: 'remotion'},
  {pattern: /PPT Master|PowerPoint|PPT/i, productIcon: 'ppt'},
  {pattern: /正文配图|小黑|插画/i, productIcon: 'illustration'},
  {pattern: /HyperFrames/i, productIcon: 'hyperframes'},
  {pattern: /UI Skill/i, productIcon: 'ui'},
  {pattern: /Impeccable/i, productIcon: 'impeccable'},
  {pattern: /Frontend Design|front.*design/i, productIcon: 'frontend-design'},
  {pattern: /UI UX PRO|UX PRO/i, productIcon: 'ux-pro'},
  {pattern: /Awesome Cloud|Cloud Design|Stripe|Linear|Versa|Recast/i, productIcon: 'cloud-design'},
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const narrativeSignalForText = (text) => (
  NARRATIVE_SIGNAL_RULES.find((rule) => rule.pattern.test(text)) ?? null
);

export const compactLength = (value) => String(value ?? '').replace(/\s+/g, '').length;

export const slugify = (value, fallback = 'script-video') => {
  const ascii = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 72);
  return ascii || fallback;
};

const sentenceFallbackSplit = (text) => {
  const compact = text.trim();
  if (!compact) return [];
  const chunks = [];
  for (let index = 0; index < compact.length; index += 42) {
    chunks.push(compact.slice(index, index + 42));
  }
  return chunks;
};

export const splitSentences = (scriptText) => {
  const normalized = String(scriptText ?? '')
    .replace(/\r/g, '')
    .replace(/\n+/g, '。')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];
  const sentences = normalized
    .split(/(?<=[。！？!?；;])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : sentenceFallbackSplit(normalized);
};

const estimateSentenceMs = (text) => {
  const chars = compactLength(text);
  return clamp(Math.round(chars / 5.2 * 1000), 1200, 7200);
};

const readAudioDurationMs = (projectRoot, voiceSrc) => {
  if (!voiceSrc || /^https:\/\//i.test(voiceSrc)) return null;
  const audioPath = path.resolve(projectRoot, 'public', voiceSrc);
  if (!existsSync(audioPath)) return null;
  try {
    const raw = execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ], {encoding: 'utf8'}).trim();
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null;
  } catch {
    return null;
  }
};

export const captionsFromScript = (scriptText, {durationMs = null} = {}) => {
  const sentences = splitSentences(scriptText);
  const estimated = sentences.map(estimateSentenceMs);
  const totalEstimate = estimated.reduce((sum, value) => sum + value, 0);
  const target = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : totalEstimate;
  let cursor = 0;
  return sentences.map((text, index) => {
    const share = totalEstimate > 0 ? estimated[index] / totalEstimate : 1 / Math.max(1, sentences.length);
    const length = index === sentences.length - 1 ? Math.max(900, target - cursor) : Math.max(900, Math.round(target * share));
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
  const rawCaptions = Array.isArray(captionsInput) ? captionsInput : captionsInput?.captions;
  if (!Array.isArray(rawCaptions)) return [];
  const normalizeConfidence = (value) => {
    if (value == null) return null;
    const numeric = Number(value);
    // Whisper's avg_logprob is negative and is not a 0–1 confidence score.
    // Keep schema-safe probability values; otherwise explicitly mark confidence
    // as unavailable rather than inventing a misleading score.
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : null;
  };
  return rawCaptions
    .map((caption, index) => {
      const startMs = Math.max(0, Math.round(Number(caption.startMs ?? caption.timestampMs ?? index * 1800)));
      const endCandidate = Number(caption.endMs);
      const endMs = Number.isFinite(endCandidate)
        ? Math.max(1, Math.round(endCandidate))
        : startMs + 1800;
      return {
        text: String(caption.text ?? '').trim(),
        startMs,
        endMs,
        timestampMs: caption.timestampMs == null ? null : Math.max(0, Math.round(Number(caption.timestampMs))),
        confidence: normalizeConfidence(caption.confidence),
      };
    })
    .filter((caption) => caption.text && caption.endMs > caption.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
};

const alignCaptionsToAudioDuration = (captions, audioDurationMs) => {
  if (!Number.isFinite(audioDurationMs) || audioDurationMs <= 0 || captions.length === 0) return captions;
  const lastCaption = captions.at(-1);
  // Transcribers often end before the container's actual duration because of a
  // final breath or silence. Preserve the audio instead of truncating the MP4.
  if (lastCaption.endMs >= audioDurationMs) return captions;
  return captions.map((caption, index) => index === captions.length - 1
    ? {...caption, endMs: audioDurationMs}
    : caption);
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

const startsHardBoundary = (chunk) => chunk.length > 0 && NUMBERED_CUE.test(String(chunk[0].text ?? '').trim());

const chunkDurationMs = (chunk) => chunk.at(-1).endMs - chunk[0].startMs;

const mergeSmallChunks = (chunks, maxChunks) => {
  const merged = chunks.map((chunk) => [...chunk]);
  while (merged.length > maxChunks) {
    let smallestIndex = -1;
    let smallestDuration = Infinity;
    for (let index = 0; index < merged.length - 1; index += 1) {
      if (startsHardBoundary(merged[index + 1])) continue;
      const duration = chunkDurationMs([...merged[index], ...merged[index + 1]]);
      if (duration < smallestDuration) {
        smallestDuration = duration;
        smallestIndex = index;
      }
    }
    if (smallestIndex < 0) break;
    merged.splice(smallestIndex, 2, [...merged[smallestIndex], ...merged[smallestIndex + 1]]);
  }
  return merged;
};

const splitLargeChunk = (chunk) => {
  if (chunk.length < 5) return [chunk];
  const middle = Math.ceil(chunk.length / 2);
  return [chunk.slice(0, middle), chunk.slice(middle)];
};

export const segmentCaptions = (captions, {maxScenes = 8} = {}) => {
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
  const expanded = chunks.flatMap(splitLargeChunk).filter((chunk) => chunk.length > 0);
  return mergeSmallChunks(expanded, maxScenes);
};

const meaningfulTokens = (text, max = 6) => {
  const raw = String(text ?? '')
    .replace(/["'“”‘’《》()[\]{}]/g, ' ')
    .split(/[，。！？、；：,.!?;:\s]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const tokens = [];
  for (const part of raw) {
    const english = part.match(/[A-Za-z][A-Za-z0-9+._-]{1,}/g) ?? [];
    for (const token of english) tokens.push(token);
    const numbers = part.match(/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/gi) ?? [];
    for (const token of numbers) tokens.push(token.trim());
    const cjk = part.replace(/[A-Za-z0-9+._%-]/g, '');
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
  const explicit = String(text).match(/[A-Za-z][A-Za-z0-9+._-]{2,}|\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/);
  if (explicit) return explicit[0].trim().slice(0, 24);
  const tokens = meaningfulTokens(text, 4);
  return (tokens[0] ?? `要点 ${fallbackIndex + 1}`).slice(0, 24);
};

const iconForText = (text, fallbackIndex = 0) => {
  const rule = ICON_RULES.find((candidate) => candidate.pattern.test(text));
  if (rule) return rule.icon;
  const fallbackIcons = ['blocks', 'focus', 'lightbulb', 'badge-check', 'route', 'zap'];
  return fallbackIcons[fallbackIndex % fallbackIcons.length];
};

const productIconForText = (text) => {
  const known = KNOWN_PRODUCT_RULES.find((candidate) => candidate.pattern.test(text));
  if (known) return known.productIcon;
  const rule = ICON_RULES.find((candidate) => candidate.pattern.test(text));
  return rule?.productIcon ?? 'generic-ai';
};

const actionForText = (text, sceneIndex, captionIndex, isLastScene) => {
  const signal = narrativeSignalForText(text);
  if (isLastScene && captionIndex > 0) return 'burst';
  if (signal?.action) return signal.action;
  if (/不是|而是|对比|左边|右边|之前|之后|默认|误区|VS/i.test(text)) return 'compare';
  if (/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/i.test(text)) return 'counter';
  if (/步骤|第一步|第二步|第三步|流程|链路|路径|接入|输入|输出|生成/i.test(text)) return 'trace';
  if (/包括|包含|内置|几个|这些|一套|清单|规则|系统/i.test(text)) return 'stack';
  if (/核心|重点|关键|真正|本质|立场|判断/i.test(text)) return 'focus';
  if (sceneIndex === 0 || NUMBERED_CUE.test(text)) return 'stamp';
  return captionIndex % 3 === 0 ? 'spotlight' : 'focus';
};

const visualModeForText = (text, index, total) => {
  if (index === 0) return 'hero';
  if (index === total - 1) return 'quote';
  const signal = narrativeSignalForText(text);
  if (signal?.visualMode) return signal.visualMode;
  if (/不是|而是|对比|左边|右边|之前|之后|默认|误区|反模式|雷区/i.test(text)) return 'compare';
  if (/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/i.test(text)) return 'metrics';
  if (/步骤|第一步|第二步|第三步|流程|链路|路径|接入|输入|输出|生成|沉淀/i.test(text)) return 'process';
  if (/金句|结论|最后|总结|判断/i.test(text)) return 'quote';
  return 'grid';
};

const evidenceForBeat = (text, action) => {
  if (action === 'compare') {
    const leftRight = text.match(/左边是?([^，。；;]+)[，。；;]\s*右边是?([^，。；;]+)/u);
    if (leftRight) return [leftRight[1].trim().slice(0, 28), leftRight[2].trim().slice(0, 28)];
    const notBut = text.match(/不是([^，。；;]+)[，。；;]?(?:而是|是)([^，。；;]+)/u);
    if (notBut) return [notBut[1].trim().slice(0, 28), notBut[2].trim().slice(0, 28)];
    const parts = meaningfulTokens(text, 2);
    return parts.length >= 2 ? parts.map((part) => part.slice(0, 28)) : ['旧认知', '新判断'];
  }
  if (action === 'stack') return meaningfulTokens(text, 4).map((part) => part.slice(0, 28));
  return undefined;
};

const beatValueForText = (text) => {
  const match = String(text).match(/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/i);
  return match ? match[0].trim().slice(0, 18) : undefined;
};

const frameForMs = (ms) => Math.round(ms / 1000 * FPS);

const motionPresetForAction = (action) => {
  if (action === 'counter') return 'number-roll';
  if (action === 'compare') return 'split-reveal';
  if (action === 'stack') return 'card-regroup';
  if (action === 'trace') return 'scan-lock';
  if (action === 'focus') return 'focus-pulse';
  if (action === 'burst') return 'flash-cut';
  return 'slow-rise';
};

const motionPresetForText = (text, action) => narrativeSignalForText(text)?.motionPreset ?? motionPresetForAction(action);

const placementForAction = (action) => {
  if (action === 'stack' || action === 'counter') return 'body';
  if (action === 'focus' || action === 'trace') return 'highlight';
  return 'bottom';
};

const placementForText = (text, action) => narrativeSignalForText(text)?.placement ?? placementForAction(action);

const visualStateForText = (text, action, captionIndex) => {
  if (/左边|右边|默认|之后|之前|不同结果|不是.*是/u.test(text)) return 'compare';
  if (/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个)?/i.test(text)) return 'metrics';
  if (/清单|规则|系统|包含|内置|打包|这些/u.test(text)) return 'stack';
  if (/检测|标注|扫描|规避/u.test(text)) return 'scan';
  if (/最后|总结|评论|发布|出成品/u.test(text)) return 'outro';
  return captionIndex === 0 ? 'title' : action;
};

const beatsForChunk = (chunk, sceneStartFrame, sceneDurationInFrames, sceneIndex, totalScenes) => {
  let previousEnd = 0;
  return chunk.map((caption, captionIndex) => {
    const action = actionForText(caption.text, sceneIndex, captionIndex, sceneIndex === totalScenes - 1);
    const captionSourceIndex = Number.isInteger(caption.__captionIndex) ? caption.__captionIndex : captionIndex;
    let startFrame = Math.max(0, frameForMs(caption.startMs) - sceneStartFrame);
    let endFrame = Math.min(sceneDurationInFrames, frameForMs(caption.endMs) - sceneStartFrame);
    if (captionIndex > 0 && startFrame - previousEnd > 6) startFrame = previousEnd;
    startFrame = clamp(startFrame, 0, Math.max(0, sceneDurationInFrames - 1));
    endFrame = clamp(endFrame, startFrame + 1, sceneDurationInFrames);
    previousEnd = endFrame;
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
    if (value && action === 'counter') beat.value = value;
    return beat;
  });
};

const heroTrackKindForScene = (sceneText, index, totalScenes) => {
  if (index === 0) return 'overview-matrix';
  if (index === totalScenes - 1) return 'system-summary';
  if (/Karpathy|编码原则|无关改动|讲清假设/i.test(sceneText)) return 'rule-compare';
  if (/Remotion|React|帧画面|MP4/i.test(sceneText)) return 'code-render';
  if (/PPT Master|PowerPoint|幻灯片|原生对象/i.test(sceneText)) return 'slide-editor';
  if (/正文配图|配图|素材|写文章/i.test(sceneText)) return 'article-map';
  if (/HyperFrames|HTML|视频 Agent|视频/i.test(sceneText)) return 'video-agent';
  if (/UI Skill|设计立场|排版|留白/i.test(sceneText)) return 'design-compare';
  return 'generic-explainer';
};

const heroTrackTitleForKind = (kind, fallback, brandName) => ({
  'overview-matrix': '几个 Skill',
  'rule-compare': '编码原则',
  'code-render': 'Remotion',
  'slide-editor': 'PPT Master',
  'article-map': '正文配图',
  'video-agent': 'HyperFrames',
  'design-compare': 'UI Skill',
  'system-summary': `装上 Skill，${brandName} 才算好帮手`,
  'generic-explainer': fallback,
}[kind] ?? fallback);

const heroTrackSubtitleForKind = (kind, fallback) => ({
  'overview-matrix': '把 AI 从聊天框变成可执行的工作流',
  'rule-compare': '先约束，再动手',
  'code-render': '用 React 写视频，一段代码就是一帧画面',
  'slide-editor': '不是截图，是可继续编辑的原生对象',
  'article-map': '先读懂正文，再把判断画出来',
  'video-agent': '把 HTML 交给 Agent，变成可编辑视频',
  'design-compare': '不是模板，是一整套设计立场',
  'system-summary': '六个 Skill 汇聚成可复用能力系统',
  'generic-explainer': fallback,
}[kind] ?? fallback);

const HERO_ENTITY_TARGETS = {
  'overview-matrix': ['skill-01', 'skill-02', 'skill-03', 'skill-04', 'skill-05', 'skill-06'],
  'rule-compare': ['bad-rule-01', 'bad-rule-02', 'bad-rule-03', 'good-rule-02', 'terminal-verify'],
  'code-render': ['code-line-01', 'code-line-02', 'frame-track', 'mp4-output'],
  'slide-editor': ['slide-01', 'shape-object', 'chart-object', 'text-object', 'export-result'],
  'article-map': ['article-source', 'article-body', 'article-bridge', 'article-action'],
  'video-agent': ['input-html', 'agent-run', 'render-preview', 'capability-matrix'],
  'design-compare': ['before-surface', 'type-token', 'space-token', 'color-token', 'system-token'],
  'system-summary': ['skill-karpathy', 'skill-remotion', 'skill-ppt', 'skill-article', 'skill-hyperframes', 'skill-ui'],
  'generic-explainer': ['input-node', 'rule-node', 'result-node'],
};

// The eleven cinematic components are motion language, not replacement hero
// layouts. A Hero Track keeps one stable technical composition while these
// short transitions carry the spoken shift into the next state.
const CINEMATIC_PRESETS = [
  'kinetic-type', 'split-wipe', 'particle-field', 'orbital-map', 'ui-scan',
  'material-carousel', 'focus-lock', 'pipeline-flow', 'token-assembly',
  'surface-morph', 'system-convergence',
];

const cinematicPresetForState = (text, stateIndex, heroTrackKind, previousPreset) => {
  const value = String(text ?? '');
  // Named product tracks carry known technical entities. Their motion must be
  // chosen from the entity sequence, not from loose keyword coincidence.
  const productSequences = {
    'overview-matrix': ['kinetic-type', 'focus-lock', 'system-convergence'],
    'rule-compare': ['kinetic-type', 'focus-lock', 'split-wipe', 'focus-lock', 'orbital-map'],
    'code-render': ['kinetic-type', 'focus-lock', 'pipeline-flow', 'surface-morph'],
    'slide-editor': ['kinetic-type', 'focus-lock', 'particle-field', 'focus-lock', 'pipeline-flow'],
    'article-map': ['kinetic-type', 'focus-lock', 'pipeline-flow', 'split-wipe', 'surface-morph'],
    'video-agent': ['kinetic-type', 'pipeline-flow', 'surface-morph', 'orbital-map'],
    'design-compare': ['split-wipe', 'token-assembly', 'focus-lock', 'material-carousel', 'token-assembly'],
    'system-summary': ['focus-lock', 'pipeline-flow', 'orbital-map', 'system-convergence'],
  };
  const knownSequence = productSequences[heroTrackKind];
  if (knownSequence) {
    const preset = knownSequence[Math.min(stateIndex, knownSequence.length - 1)];
    if (preset !== previousPreset) return preset;
    return CINEMATIC_PRESETS[(CINEMATIC_PRESETS.indexOf(preset) + 1) % CINEMATIC_PRESETS.length];
  }
  let preferred;
  if (stateIndex === 0) preferred = 'kinetic-type';
  else if (/对比|不是|而是|之前|之后|默认|不同/i.test(value)) preferred = 'split-wipe';
  else if (/\d+(?:[.,]\d+)?\s*(?:K|万|亿|%|条|套|种|个)?/i.test(value)) preferred = 'particle-field';
  else if (/检测|审计|扫描|标记|问题/i.test(value)) preferred = 'ui-scan';
  else if (/颜色|字体|间距|Token|设计系统|WCAG/i.test(value)) preferred = 'token-assembly';
  else if (/风格|方向|材质|Swiss|Nordic|Neo/i.test(value)) preferred = 'material-carousel';
  else if (/锁定|锚定|聚焦|选择|确定/i.test(value)) preferred = 'focus-lock';
  else if (/流程|路径|输入|输出|接入|穿过|生成/i.test(value)) preferred = 'pipeline-flow';
  else if (/变成|形变|切换|场景|官网|后台/i.test(value)) preferred = 'surface-morph';
  else if (/汇聚|总结|收尾|系统|全部|多个|分类|规则/i.test(value)) preferred = heroTrackKind === 'system-summary' ? 'system-convergence' : 'orbital-map';
  else preferred = CINEMATIC_PRESETS[(stateIndex + CINEMATIC_PRESETS.indexOf(previousPreset || 'kinetic-type') + 1) % CINEMATIC_PRESETS.length];
  if (preferred !== previousPreset) return preferred;
  return CINEMATIC_PRESETS[(CINEMATIC_PRESETS.indexOf(preferred) + 1) % CINEMATIC_PRESETS.length];
};

const heroEntityTargetForState = (kind, stateIndex) => {
  const targets = HERO_ENTITY_TARGETS[kind] ?? HERO_ENTITY_TARGETS['generic-explainer'];
  return targets[Math.min(stateIndex, targets.length - 1)];
};

const heroStatesForChunk = (chunk, sceneStartFrame, sceneDurationInFrames, heroTrackKind) => {
  const stateCount = Math.min(chunk.length, clamp(Math.ceil(chunk.length / 2), 3, 6));
  let previousCinematicPreset = '';
  return Array.from({length: stateCount}, (_, stateIndex) => {
    const startOffset = Math.floor(stateIndex * chunk.length / stateCount);
    const endOffset = Math.max(startOffset, Math.floor((stateIndex + 1) * chunk.length / stateCount) - 1);
    const group = chunk.slice(startOffset, endOffset + 1);
    const nextStartOffset = Math.floor((stateIndex + 1) * chunk.length / stateCount);
    const next = chunk[nextStartOffset];
    const text = group.map((caption) => caption.text).join('');
    const captionStartIndex = group[0].__captionIndex;
    const captionEndIndex = group.at(-1).__captionIndex;
    const label = keywordForText(text, stateIndex);
    const evidence = meaningfulTokens(text, 4).map((token) => token.slice(0, 48));
    return {
      startFrame: stateIndex === 0 ? 0 : Math.max(0, frameForMs(group[0].startMs) - sceneStartFrame),
      endFrame: stateIndex === stateCount - 1
        ? sceneDurationInFrames
        : Math.min(sceneDurationInFrames, frameForMs(next.startMs) - sceneStartFrame),
      captionStartIndex,
      captionEndIndex,
      label,
      detail: text.slice(0, 118),
      evidence: evidence.length ? evidence : [label],
      entityTarget: heroEntityTargetForState(heroTrackKind, stateIndex),
    };
  }).map((state, stateIndex, states) => ({
    ...state,
    endFrame: Math.max(state.startFrame + 1, stateIndex === states.length - 1 ? sceneDurationInFrames : state.endFrame),
    cinematicPreset: (() => {
      const preset = cinematicPresetForState(state.detail, stateIndex, heroTrackKind, previousCinematicPreset);
      previousCinematicPreset = preset;
      return preset;
    })(),
  }));
};

const workbenchKindForText = (text, visualMode, isLast) => {
  if (isLast || /系统|复用|节点|依赖|架构|汇聚|整体/u.test(text)) return 'architecture-workspace';
  if (/终端|命令行|CLI|shell|npm|pnpm|代码|源码|配置|JSON|YAML|API|参数|变量|安装|构建/i.test(text)) return 'ide-terminal';
  if (/检测|扫描|标注|问题|错误|毛病|规则|测试|验证|覆盖率|审计/u.test(text)) return 'audit-trace';
  if (/Prompt|提示词|输入|输出|流程|管线|路径|规避|闸门|生成/u.test(text)) return 'prompt-pipeline';
  if (/设计|风格|品牌|素材|图标|配色|字体|模板|方向|Token|组件/u.test(text)) return 'design-system-lab';
  if (visualMode === 'process') return 'prompt-pipeline';
  if (visualMode === 'metrics') return 'audit-trace';
  if (visualMode === 'compare') return 'ide-terminal';
  return 'architecture-workspace';
};

const ACTION_LABELS = {
  spotlight: 'inspect target',
  stamp: 'commit state',
  trace: 'trace workflow',
  compare: 'compare states',
  counter: 'verify metric',
  stack: 'index evidence',
  focus: 'focus diagnostic',
  burst: 'converge system',
};

const WORKBENCH_LENSES_BY_KIND = {
  'ide-terminal': ['source-diff', 'terminal-run', 'manifest-resolve', 'design-inspector'],
  'audit-trace': ['rule-counter', 'category-index', 'live-scan', 'snapshot-compare'],
  'prompt-pipeline': ['repo-signal', 'direction-picker', 'style-lock', 'anchor-map', 'deny-list', 'skill-gate'],
  'design-system-lab': ['knowledge-vault', 'catalog-metrics', 'token-assembly', 'scenario-switch', 'blank-audit', 'brand-pack', 'brand-style-map'],
  'architecture-workspace': ['system-graph', 'anchor-map', 'skill-gate'],
};

const workbenchForScene = ({sceneText, visualMode, beats, labels, isLast}) => {
  const kind = workbenchKindForText(sceneText, visualMode, isLast);
  const filesByKind = {
    'ide-terminal': ['input.md', 'config.json', 'src/output.tsx', 'report.json'],
    'audit-trace': ['rules/index.ts', 'src/component.tsx', 'trace.json'],
    'prompt-pipeline': ['prompt.input', 'skill.contract', 'output.spec'],
    'design-system-lab': ['tokens/system.json', 'components/index.ts', 'a11y/rules.json'],
    'architecture-workspace': ['system.graph', 'inputs.json', 'output.contract'],
  };
  const steps = beats.map((beat, index) => {
    const lenses = WORKBENCH_LENSES_BY_KIND[kind] ?? WORKBENCH_LENSES_BY_KIND['architecture-workspace'];
    const evidenceValues = [beat.value, ...(beat.evidence ?? []), beat.keyword].filter(Boolean);
    const evidence = [...new Set(evidenceValues)].slice(0, 3).map((value, evidenceIndex) => ({
      label: evidenceIndex === 0 && beat.value ? 'SCRIPT METRIC' : evidenceIndex === 0 ? 'PRIMARY SIGNAL' : `EVIDENCE ${evidenceIndex + 1}`,
      value: String(value).slice(0, 48),
      source: 'script',
      status: beat.action === 'compare' && evidenceIndex === 0 ? 'fail' : 'info',
    }));
    if (evidence.length < 3) evidence.push({label: 'WORKBENCH STATE', value: ACTION_LABELS[beat.action].toUpperCase(), source: 'derived', status: 'pass'});
    if (evidence.length < 3) evidence.push({label: 'CAPTION BINDING', value: `BEAT ${String(index + 1).padStart(2, '0')}`, source: 'demo', status: 'pass'});
    const semanticLines = [...new Set([...(beat.evidence ?? []), beat.keyword, ...(labels ?? [])])].slice(0, 5);
    return {
      captionIndex: beat.captionStartIndex,
      lens: lenses[index % lenses.length],
      objective: beat.detail ?? beat.keyword,
      actionLabel: ACTION_LABELS[beat.action],
      command: kind === 'ide-terminal' ? `inspect topic: ${beat.keyword}` : undefined,
      target: beat.keyword,
      file: filesByKind[kind][Math.min(index, filesByKind[kind].length - 1)],
      before: beat.action === 'compare' ? semanticLines.slice(0, 2).map((line) => `before: ${line}`) : undefined,
      after: semanticLines.map((line) => `${beat.visualState ?? beat.action}: ${line}`),
      logs: [
        `caption ${beat.captionStartIndex ?? index} bound`,
        `${ACTION_LABELS[beat.action]} started`,
        `${beat.keyword} resolved`,
        'evidence emitted',
      ],
      evidence,
    };
  });
  return {
    kind,
    title: `technical workbench / ${kind}`,
    context: 'caption → action → observable state → evidence',
    files: filesByKind[kind],
    steps,
  };
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
  if (visualMode === 'hero') return 'hero-title';
  if (visualMode === 'quote') return 'quote-close';
  if (visualMode === 'metrics') return 'metric-strip';
  if (visualMode === 'compare') return 'compare-board';
  if (visualMode === 'process') return index % 2 === 0 ? 'vertical-step-flow' : 'focus-diagram';
  return index % 2 === 0 ? 'icon-grid' : 'tag-matrix';
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

export const buildSkillShowcaseProjectFromScript = ({
  scriptText,
  captions: captionsInput,
  projectId,
  title,
  voiceSrc,
  projectRoot,
  maxScenes = 8,
}) => {
  const resolvedTitle = String(title ?? '').trim() || keywordForText(scriptText, 0) || '口播视频';
  const resolvedProjectId = slugify(projectId || resolvedTitle);
  const audioDurationMs = readAudioDurationMs(projectRoot, voiceSrc);
  const captions = parseCaptionInput(captionsInput);
  const unalignedCaptions = captions.length
    ? captions
    : captionsFromScript(scriptText, {durationMs: audioDurationMs});
  const resolvedCaptions = alignCaptionsToAudioDuration(unalignedCaptions, audioDurationMs);
  if (!resolvedCaptions.length) {
    throw new Error('[SCRIPT_EMPTY] script text or captions are required');
  }

  const indexedCaptions = resolvedCaptions.map((caption, index) => ({...caption, __captionIndex: index}));
  const chunks = segmentCaptions(indexedCaptions, {maxScenes});
  const allLabels = labelsForChunk(resolvedCaptions.map((caption) => caption.text).join('')).slice(0, 6);
  const allProductIcons = allLabels.map((label) => productIconForText(label));
  const allLabelIcons = allLabels.map((label, index) => iconForText(label, index));
  const scenes = chunks.map((chunk, index) => {
    const sceneText = chunk.map((caption) => caption.text).join('');
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
    const heroTrackKind = heroTrackKindForScene(sceneText, index, chunks.length);
    const layoutSignature = `portrait:hero-track-v2:${heroTrackKind}`;
    const labels = labelsForChunk(sceneText);
    const productIcon = productIconForText(sceneText);
    const beats = beatsForChunk(chunk, sceneStartFrame, durationInFrames, index, chunks.length);
    const heroTrack = {
      kind: heroTrackKind,
      captionStartIndex,
      captionEndIndex,
      states: heroStatesForChunk(chunk, sceneStartFrame, durationInFrames, heroTrackKind),
    };
    const payload = {
      variant: isFirst ? 'intro' : isLast ? 'outro' : 'generic',
      visualMode,
      heroStyle: 'hero-track-v2',
      narrativeSignal: dominantNarrativeSignal(sceneText),
      layoutSignature,
      title: heroTrackTitleForKind(heroTrackKind, sceneTitleFor(sceneText, index, resolvedTitle), resolvedTitle),
      subtitle: heroTrackSubtitleForKind(heroTrackKind, labels.slice(0, 3).join(' · ') || resolvedTitle),
      brandName: resolvedTitle.slice(0, 32),
      brandIcon: productIcon,
      productIcon,
      eyebrow: isFirst ? '本片重点' : isLast ? '最后收束' : `章节 ${String(index + 1).padStart(2, '0')}`,
      headline: isFirst ? resolvedTitle : keywordForText(sceneText, index),
      body: sceneText.slice(0, 118),
      footer: isLast ? '按当前口播生成新视觉合同' : undefined,
      accent: PALETTE[index % PALETTE.length],
      secondaryAccent: PALETTE[(index + 1) % PALETTE.length],
      bullets: labels.slice(0, 4),
      labels: isFirst || isLast ? allLabels : labels,
      labelIcons: (isFirst || isLast ? allLabelIcons : labels.map((label, labelIndex) => iconForText(label, labelIndex))).slice(0, 8),
      productIcons: (isFirst || isLast ? allProductIcons : labels.map((label) => productIconForText(label))).slice(0, 8),
      progressIndex: index,
      progressTotal: chunks.length,
      captionStartIndex,
      captionEndIndex,
      sourceText: sceneText.slice(0, 800),
      beats,
      heroTrack,
    };
    return {
      id: isFirst ? 'intro' : isLast ? 'outro' : `scene-${String(index + 1).padStart(2, '0')}-${slugify(payload.headline, 'topic').slice(0, 24)}`,
      family: 'skill-showcase',
      durationInFrames,
      captionRange: {startIndex: captionStartIndex, endIndex: captionEndIndex},
      payload,
      assetIds: [],
      transition: isLast ? false : {type: index % 2 === 0 ? 'fade' : 'slide', durationInFrames: 10},
    };
  });

  const assets = {};
  const audio = {};
  if (voiceSrc) {
    assets.voiceover = {kind: 'audio', src: voiceSrc, required: true};
    audio.voiceAssetId = 'voiceover';
  }

  return {
    schemaVersion: 1,
    projectId: resolvedProjectId,
    title: resolvedTitle,
    render: {
      fps: FPS,
      width: 1080,
      height: 1920,
      qualityMode: 'cinematic',
      orientation: 'portrait',
      captionStyle: 'editorial',
      showProjectLabel: false,
    },
    scenes,
    captions: resolvedCaptions,
    audio,
    assets,
  };
};
