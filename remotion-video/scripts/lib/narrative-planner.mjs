import path from "node:path";
import {
  FPS,
  captionsFromScript,
  segmentCaptions,
  slugify,
  splitSentences,
} from "./script-project-generator.mjs";

const ACCENTS = {
  tech: {accent: "#48e7f3", secondaryAccent: "#a78bfa", tone: "tech"},
  product: {accent: "#4be3c1", secondaryAccent: "#ff7aa8", tone: "commercial"},
  knowledge: {accent: "#f6d365", secondaryAccent: "#69d2e7", tone: "editorial"},
  documentary: {accent: "#d8c7a1", secondaryAccent: "#7dbba3", tone: "documentary"},
};

const SAMPLE_COPY_BLACKLIST = /WorkBuddy|PPT Master|HyperFrames|UI Skill|Karpathy|好帮手/u;
const NUMBER_SIGNAL = /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)?/iu;
const NUMBER_SIGNAL_GLOBAL = /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)?/giu;
const STRONG_NUMBER_SIGNAL = /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|倍|秒|分钟|小时|天|帧|元|人|次|分|GB|MB)/iu;
const COMPARISON_SIGNAL = /(不是|而是|但是|然而|对比|之前|之后|旧|新|默认|误区|VS)/iu;
const PROCESS_SIGNAL = /(第一|第二|第三|第四|第五|第[一二三四五六七八九十0-9]+步|首先|然后|接着|最后|流程|链路|输入|输出|生成|推进)/u;
const PRODUCT_SIGNAL = /(产品|发布|功能|用户|客户|门店|系统|仪表盘|后台|移动端|商品|订单|供应商|上线)/u;
const MEDIA_SIGNAL = /(截图|界面|页面|浏览器|控制台|DevTools|仪表盘|大屏|照片|图|UI|DOM)/iu;
const QUOTE_SIGNAL = /(一句话|判断|观点|结论|引用|创始人|他说|她说)/u;
const KNOWLEDGE_SIGNAL = /(知识|学习|笔记|概念|文章|练习|复盘|理解|判断)/u;
const TECH_SIGNAL = /(代码|技术|终端|DevTools|DOM|CI|diff|配置|schema|测试|renderer|Remotion|API|JSON)/iu;

const STOP_WORDS = new Set([
  "今天",
  "一个",
  "不是",
  "而是",
  "但是",
  "然后",
  "最后",
  "这个",
  "我们",
  "可以",
  "需要",
  "它们",
  "它会",
]);

const STEP_TITLE_PREFIX = /^(?:第[一二三四五六七八九十百千万0-9]+步|第一屏|首先|然后|接着|最后|最后一句话)[，,、：:\s]*/u;

const compact = (value) => String(value ?? "").replace(/\s+/g, "").trim();

const truncate = (value, max) => {
  const text = String(value ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const countSignal = (regex, text) => {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  return (String(text ?? "").match(new RegExp(regex.source, flags)) ?? []).length;
};

const textTokens = (text, max = 5) => {
  const raw = String(text ?? "")
    .replace(/["'“”‘’《》()[\]{}]/g, " ")
    .split(/[，。！？、；：,.!?;:\s]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const tokens = [];
  for (const part of raw) {
    const english = part.match(/[A-Za-z][A-Za-z0-9+._-]{1,}/g) ?? [];
    tokens.push(...english);
    const numbers = part.match(/\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍)?/giu) ?? [];
    tokens.push(...numbers.map((item) => item.trim()));
    const cjk = part.replace(/[A-Za-z0-9+._%-]/g, "");
    if (cjk.length >= 2 && !STOP_WORDS.has(cjk)) {
      tokens.push(cjk.length > 8 ? cjk.slice(0, 8) : cjk);
    }
  }
  return [...new Set(tokens)]
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, max);
};

const titleFromText = (text, fallback) => {
  const raw = String(text ?? "").trim();
  const firstClause = raw.split(/[。！？!?；;]/u)[0] ?? raw;
  const sentences = splitSentences(text);
  const first = sentences[0] ?? raw;
  const cleaned = firstClause
    .trim()
    .replace(STEP_TITLE_PREFIX, "")
    .replace(/^(?:收束到一个判断|一句话)[：:\s]*/u, "")
    .trim();
  if (cleaned.length >= 2) return truncate(cleaned, 36);
  const tokens = textTokens(first, 2);
  return truncate(tokens.join(" / ") || first || fallback, 28);
};

const contrastTitleFromText = (text) => {
  const raw = String(text ?? "").trim();
  const cleaned = (raw.split(/[。！？!?；;]/u)[0] ?? raw)
    .replace(STEP_TITLE_PREFIX, "")
    .trim();
  const positive = cleaned.match(/而是(.+)$/u)?.[1]?.trim();
  if (positive && positive.length >= 2) return truncate(positive, 36);
  return null;
};

const parseCaptionsInput = (captionsInput) => {
  const raw = Array.isArray(captionsInput) ? captionsInput : captionsInput?.captions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((caption, index) => {
      const startMs = Math.max(0, Math.round(Number(caption.startMs ?? caption.timestampMs ?? index * 1800)));
      const endMs = Math.max(startMs + 1, Math.round(Number(caption.endMs ?? startMs + 1800)));
      return {
        text: String(caption.text ?? "").trim(),
        startMs,
        endMs,
        timestampMs: caption.timestampMs == null ? startMs : Math.max(0, Math.round(Number(caption.timestampMs))),
        confidence: Number.isFinite(Number(caption.confidence)) && Number(caption.confidence) >= 0 && Number(caption.confidence) <= 1
          ? Number(caption.confidence)
          : null,
      };
    })
    .filter((caption) => caption.text && caption.endMs > caption.startMs)
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
};

const captionsForInput = ({scriptText, captions}) => {
  const parsed = parseCaptionsInput(captions);
  if (parsed.length) return parsed;
  return captionsFromScript(scriptText);
};

const themeForText = (text) => {
  const scores = {
    product: countSignal(PRODUCT_SIGNAL, text),
    tech: countSignal(TECH_SIGNAL, text),
    knowledge: countSignal(KNOWLEDGE_SIGNAL, text),
  };
  if (scores.product >= 2 && scores.product >= scores.tech && scores.product >= scores.knowledge) return "product";
  if (scores.tech >= 2 && scores.tech >= scores.product && scores.tech >= scores.knowledge) return "tech";
  if (scores.knowledge >= 2 && scores.knowledge >= scores.product && scores.knowledge >= scores.tech) return "knowledge";
  if (PRODUCT_SIGNAL.test(text)) return "product";
  if (TECH_SIGNAL.test(text)) return "tech";
  if (KNOWLEDGE_SIGNAL.test(text)) return "knowledge";
  return "documentary";
};

const visualForTheme = (theme, text) => {
  const base = ACCENTS[theme] ?? ACCENTS.documentary;
  const hasManyNumbers = (String(text).match(NUMBER_SIGNAL) ?? []).length >= 3;
  return {
    tone: base.tone,
    density: hasManyNumbers ? "high" : "medium",
    pacing: compact(text).length > 260 ? "fast" : "medium",
    motionIntensity: hasManyNumbers || PROCESS_SIGNAL.test(text) ? "high" : "medium",
    colorStrategy: theme === "knowledge" ? "editorial-contrast" : "dual-accent",
    accent: base.accent,
    secondaryAccent: base.secondaryAccent,
  };
};

const intentForScene = ({text, index, total}) => {
  if (index === 0) return "hook";
  if (index === total - 1) return "payoff";
  if (COMPARISON_SIGNAL.test(text)) return "contrast";
  if (PRODUCT_SIGNAL.test(text) && MEDIA_SIGNAL.test(text)) return "product-reveal";
  if (STRONG_NUMBER_SIGNAL.test(text) || MEDIA_SIGNAL.test(text)) return "proof";
  if (QUOTE_SIGNAL.test(text) && compact(text).length < 70) return "quote";
  if (PROCESS_SIGNAL.test(text)) return "process";
  if (NUMBER_SIGNAL.test(text) || MEDIA_SIGNAL.test(text)) return "proof";
  return "statement";
};

const blockForScene = ({intent, medium, index}) => {
  if (intent === "hook") return "HookScene";
  if (intent === "proof") return "EvidenceScene";
  if (intent === "contrast") return "ContrastScene";
  if (intent === "product-reveal") return "ProductRevealScene";
  if (intent === "quote") return "QuoteScene";
  if (intent === "payoff" || intent === "cta") return "SummaryScene";
  if (intent === "process") {
    if (medium === "screenshot" || medium === "data") return "EvidenceScene";
    if (medium === "product") return "ProductRevealScene";
    return index % 3 === 0 ? "StatementScene" : "ProcessScene";
  }
  return "StatementScene";
};

const mediumForText = (text, intent) => {
  if (intent === "quote") return "quote";
  if (MEDIA_SIGNAL.test(text)) return "screenshot";
  if (PRODUCT_SIGNAL.test(text)) return "product";
  if (NUMBER_SIGNAL.test(text)) return "data";
  return "text";
};

const layoutForIntent = (intent, index) => {
  if (intent === "hook" || intent === "payoff" || intent === "cta") {
    return {density: "low", focus: "center", safeArea: intent === "payoff" ? "caption-heavy" : "standard"};
  }
  if (intent === "contrast") return {density: "medium", focus: "split", safeArea: "standard"};
  if (intent === "process") return {density: "medium", focus: "timeline", safeArea: "standard"};
  if (intent === "proof" || intent === "product-reveal") return {density: "high", focus: index % 2 ? "edge" : "split", safeArea: "standard"};
  return {density: "medium", focus: index % 2 ? "edge" : "split", safeArea: "standard"};
};

const motionForIntent = (intent, medium, index) => {
  if (intent === "hook") return {presetIds: ["maskReveal", "kineticCaption", "pushIn"], intensity: "high", transition: "matchCut"};
  if (intent === "contrast") return {presetIds: ["directionalWipe", "snap", "highlightSweep"], intensity: "punchy", transition: "matchCut"};
  if (intent === "process") return {presetIds: ["lineWipe", "panelShift", "assetStack"], intensity: "medium", transition: "directionalWipe"};
  if (intent === "product-reveal") return {presetIds: ["clipReveal", "productOrbit", "depthShift"], intensity: "high", transition: "cameraMove"};
  if (intent === "proof" && medium === "screenshot") return {presetIds: ["screenshotInspect", "focusLock", "pushIn"], intensity: "high", transition: "cameraMove"};
  if (intent === "proof") return {presetIds: ["numberCount", "focusLock", "depthShift"], intensity: "high", transition: "panelShift"};
  if (intent === "quote") return {presetIds: ["typeReveal", "quoteBuild", "pullBack"], intensity: "medium", transition: "panelShift"};
  if (intent === "payoff" || intent === "cta") return {presetIds: ["pullBack", "quoteBuild", "highlightSweep"], intensity: "medium", transition: "cameraMove"};
  return {
    presetIds: index % 2
      ? ["staggeredWords", "parallaxDrift", "highlightSweep"]
      : ["maskReveal", "depthShift", "focusLock"],
    intensity: "medium",
    transition: "panelShift",
  };
};

const emphasisForText = (text, intent) => {
  const emphasis = [];
  const numbers = [...String(text).matchAll(NUMBER_SIGNAL_GLOBAL)]
    .map((match) => match[0].trim())
    .filter(Boolean);
  for (const number of [...new Set(numbers)].slice(0, 2)) {
    emphasis.push({text: number, level: 3, reason: "number"});
  }
  if (intent === "contrast") {
    const parts = String(text).split(/不是|而是|但是|然而|对比|VS/iu).map((part) => titleFromText(part, "对比")).filter(Boolean);
    for (const part of parts.slice(0, 2)) {
      emphasis.push({text: part, level: emphasis.length ? 2 : 3, reason: "contrast"});
    }
  }
  const tokens = textTokens(text, 4);
  for (const token of tokens) {
    if (emphasis.length >= 4) break;
    if (!emphasis.some((item) => item.text === token)) {
      emphasis.push({text: token, level: intent === "payoff" ? 3 : 2, reason: intent === "payoff" ? "claim" : "claim"});
    }
  }
  return emphasis;
};

const sceneMessage = (text, intent, index) => {
  const sentences = splitSentences(text);
  const primary = intent === "contrast"
    ? contrastTitleFromText(text) ?? titleFromText(text, `Scene ${index + 1}`)
    : titleFromText(text, `Scene ${index + 1}`);
  const secondary = truncate(sentences.slice(1).join("") || text, 150);
  return {
    primary: intent === "hook" ? truncate(sentences[0] ?? text, 42) : primary,
    secondary: secondary && secondary !== primary ? secondary : undefined,
    keywords: textTokens(text, 5),
  };
};

const sceneDurationFrames = (chunk) => {
  if (!chunk.length) return undefined;
  const durationMs = chunk.at(-1).endMs - chunk[0].startMs;
  return Math.max(60, Math.round(durationMs / 1000 * FPS));
};

const mapAssetKind = (kind) => {
  if (kind === "image" || kind === "audio" || kind === "video" || kind === "font" || kind === "json") return kind;
  if (kind === "logo" || kind === "icon") return kind;
  return "json";
};

export const assetsFromProductionPack = (assetPack) => {
  const assets = {};
  for (const asset of Array.isArray(assetPack?.assets) ? assetPack.assets : []) {
    if (!asset?.id || !asset?.src) continue;
    const kind = mapAssetKind(String(asset.kind ?? "json"));
    assets[String(asset.id)] = {
      kind,
      src: String(asset.src),
      alt: asset.alt ? String(asset.alt) : undefined,
      role: kind === "audio" ? "audio" : kind === "image" || kind === "video" ? "proof" : undefined,
      required: Boolean(asset.required),
    };
  }
  return assets;
};

const sceneAssetRefs = (scene, assets) => {
  const entries = Object.entries(assets);
  if (!entries.length) return [];
  const preferred = entries.find(([, asset]) => scene.medium === "screenshot" && asset.kind === "image")
    ?? entries.find(([, asset]) => scene.medium === "product" && (asset.kind === "image" || asset.kind === "video"))
    ?? entries.find(([, asset]) => asset.kind === "image" || asset.kind === "video" || asset.kind === "json");
  if (!preferred) return [];
  return [{assetId: preferred[0], role: scene.intent === "hook" ? "hero" : "proof"}];
};

const variantsForTheme = (theme) => [
  {
    id: "editorial",
    label: "Editorial Explainer",
    template: "editorial-explainer",
    visual: {
      tone: "editorial",
      density: "medium",
      pacing: "medium",
      motionIntensity: "medium",
      colorStrategy: "editorial-contrast",
      accent: "#f6d365",
      secondaryAccent: "#69d2e7",
    },
  },
  {
    id: "product-proof",
    label: "Product Proof Film",
    template: "product-proof",
    visual: {
      tone: "commercial",
      density: "high",
      pacing: "fast",
      motionIntensity: "high",
      colorStrategy: "dual-accent",
      accent: "#4be3c1",
      secondaryAccent: "#ff7aa8",
    },
  },
  {
    id: theme === "knowledge" ? "founder-story" : "data-insight",
    label: theme === "knowledge" ? "Founder Story" : "Data Insight Video",
    template: theme === "knowledge" ? "founder-story" : "data-insight",
    visual: {
      tone: theme === "knowledge" ? "documentary" : "tech",
      density: "high",
      pacing: "punchy",
      motionIntensity: "punchy",
      colorStrategy: "dual-accent",
      accent: theme === "knowledge" ? "#d8c7a1" : "#48e7f3",
      secondaryAccent: theme === "knowledge" ? "#7dbba3" : "#a78bfa",
    },
  },
];

const narrativeForScenes = (scenes, scriptText) => {
  const sentences = splitSentences(scriptText);
  const proofScenes = scenes.filter((scene) => scene.intent === "proof" || scene.intent === "process" || scene.intent === "contrast");
  return {
    arc: STRONG_NUMBER_SIGNAL.test(scriptText) ? "data-insight" : PRODUCT_SIGNAL.test(scriptText) ? "launch" : "proof-led",
    hook: truncate(sentences[0] ?? scenes[0]?.message.primary ?? "建立开场判断", 220),
    context: truncate(sentences[1] ?? scenes[1]?.message.primary ?? "", 320) || undefined,
    turningPoint: truncate((scenes.find((scene) => scene.intent === "contrast") ?? scenes.find((scene) => scene.intent === "process"))?.message.primary ?? "", 320) || undefined,
    proof: proofScenes.slice(0, 4).map((scene) => ({
      claim: scene.message.primary,
      evidenceIds: scene.assetRefs.map((ref) => ref.assetId),
    })),
    payoff: truncate(scenes.at(-1)?.message.primary ?? sentences.at(-1) ?? "形成可复用输出", 260),
    cta: PRODUCT_SIGNAL.test(scriptText) ? "用同一套 schema 继续生成下一条视频。" : undefined,
  };
};

export const buildVideoProductSpecFromScript = ({
  scriptText,
  captions,
  projectId,
  title,
  keywords,
  assets = {},
  maxScenes = 8,
} = {}) => {
  const resolvedText = String(scriptText ?? "").trim();
  const resolvedCaptions = captionsForInput({scriptText: resolvedText, captions});
  if (!resolvedText && !resolvedCaptions.length) {
    throw new Error("[SCRIPT_EMPTY] script text or captions are required");
  }
  const narrationText = resolvedText || resolvedCaptions.map((caption) => caption.text).join("");
  if (SAMPLE_COPY_BLACKLIST.test(narrationText)) {
    throw new Error("[SAMPLE_COPY_REJECTED] v2 product specs must not be generated from golden sample copy");
  }
  const resolvedTitle = String(title ?? "").trim() || titleFromText(narrationText, "视频产品");
  const resolvedProjectId = slugify(projectId || resolvedTitle, "video-product");
  const theme = themeForText(`${resolvedTitle}${narrationText}${keywords ?? ""}`);
  const visual = visualForTheme(theme, narrationText);
  const indexed = resolvedCaptions.map((caption, index) => ({...caption, __captionIndex: index}));
  const chunks = segmentCaptions(indexed, {maxScenes: Math.max(3, maxScenes)});
  const scenes = chunks.map((chunk, index) => {
    const text = chunk.map((caption) => caption.text).join("");
    const intent = intentForScene({text, index, total: chunks.length});
    const medium = mediumForText(text, intent);
    const scene = {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      intent,
      block: blockForScene({intent, medium, index}),
      message: sceneMessage(text, intent, index),
      medium,
      emphasis: emphasisForText(text, intent),
      layout: layoutForIntent(intent, index),
      motion: motionForIntent(intent, medium, index),
      assetRefs: [],
      durationFrames: sceneDurationFrames(chunk),
    };
    scene.assetRefs = sceneAssetRefs(scene, assets);
    return scene;
  });
  if (scenes.length && !scenes.some((scene) => scene.intent === "payoff" || scene.intent === "cta")) {
    scenes[scenes.length - 1] = {
      ...scenes.at(-1),
      intent: "payoff",
      block: "SummaryScene",
      layout: layoutForIntent("payoff", scenes.length - 1),
      motion: motionForIntent("payoff", "text", scenes.length - 1),
    };
  }
  const durationSec = Math.max(8, Math.round((resolvedCaptions.at(-1)?.endMs ?? scenes.reduce((sum, scene) => sum + (scene.durationFrames ?? 90), 0) / FPS * 1000) / 1000));
  return {
    schemaVersion: 2,
    metadata: {
      projectId: resolvedProjectId,
      title: resolvedTitle,
      language: "zh-CN",
      aspectRatio: "9:16",
      platform: "internal",
      targetDurationSec: durationSec,
      theme: `${theme}:${resolvedTitle}`,
    },
    narrative: narrativeForScenes(scenes, narrationText),
    visual,
    scenes,
    assets,
    variants: variantsForTheme(theme),
  };
};

export const buildVideoProductSpecFromProductionPack = ({
  brief,
  scriptPack,
  assetPack,
  captions,
  maxScenes = 8,
} = {}) => {
  const assets = assetsFromProductionPack(assetPack);
  const projectId = String(brief?.productionId ?? scriptPack?.productionId ?? "video-product");
  const title = String(scriptPack?.title ?? brief?.title ?? projectId);
  const scriptText = String(scriptPack?.spokenScript ?? "").trim();
  return buildVideoProductSpecFromScript({
    scriptText,
    captions,
    projectId,
    title,
    keywords: scriptPack?.keywords ?? "",
    assets,
    maxScenes,
  });
};

export const relativeProjectPath = (projectRoot, filePath) =>
  path.relative(projectRoot, filePath).split(path.sep).join("/");
