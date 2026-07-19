import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

export const FPS = 30;

const PALETTE = ['#20d9e8', '#9a7cff', '#45e28d', '#ffc44d', '#ff5f91', '#5f7dff'];

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
        confidence: caption.confidence == null ? 1 : Number(caption.confidence),
      };
    })
    .filter((caption) => caption.text && caption.endMs > caption.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
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
  const resolvedCaptions = captions.length
    ? captions
    : captionsFromScript(scriptText, {durationMs: audioDurationMs});
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
    const layoutSignature = layoutSignatureForScene(sceneText, visualMode, index);
    const labels = labelsForChunk(sceneText);
    const productIcon = productIconForText(sceneText);
    const payload = {
      variant: isFirst ? 'intro' : isLast ? 'outro' : 'generic',
      visualMode,
      narrativeSignal: dominantNarrativeSignal(sceneText),
      layoutSignature,
      title: sceneTitleFor(sceneText, index, resolvedTitle),
      subtitle: labels.slice(0, 3).join(' · ') || resolvedTitle,
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
      beats: beatsForChunk(chunk, sceneStartFrame, durationInFrames, index, chunks.length),
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
