#!/usr/bin/env node
/**
 * Shot Image Generator
 * 根据 Step 5 的中文展示字段生成 SVG 分镜图，并在 stdout 输出进度事件。
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
let WIDTH = DEFAULT_WIDTH;
let HEIGHT = DEFAULT_HEIGHT;

const MOTIFS = {
  cinematic: (accent = '#8b5cf6') => `
    <circle cx="540" cy="960" r="380" fill="rgba(139,92,246,0.15)"/>
    <circle cx="540" cy="960" r="240" fill="rgba(245,158,11,0.12)"/>
    <circle cx="540" cy="960" r="120" fill="rgba(255,255,255,0.06)"/>
    <line x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" stroke="rgba(139,92,246,0.08)" stroke-width="2"/>
    <line x1="${WIDTH}" y1="0" x2="0" y2="${HEIGHT}" stroke="rgba(139,92,246,0.08)" stroke-width="2"/>
  `,
  timeline: (accent = '#8b5cf6') => `
    <line x1="160" y1="1100" x2="920" y2="1100" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.8"/>
    ${[200, 380, 560, 740, 900].map((x, i) => `
      <circle cx="${x}" cy="1100" r="28" fill="${accent}" opacity="0.9"/>
      <text x="${x}" y="1110" text-anchor="middle" fill="#fff" font-size="24" font-weight="700">${i + 1}</text>
    `).join('')}
    <line x1="200" y1="1140" x2="200" y2="1200" stroke="${accent}" stroke-width="3" opacity="0.5"/>
    <line x1="740" y1="1140" x2="740" y2="1200" stroke="${accent}" stroke-width="3" opacity="0.5"/>
  `,
  flow: (accent = '#8b5cf6') => `
    <rect x="130" y="840" width="220" height="110" rx="20" fill="rgba(139,92,246,0.3)" stroke="${accent}"/>
    <rect x="430" y="840" width="220" height="110" rx="20" fill="rgba(139,92,246,0.2)" stroke="${accent}" opacity="0.8"/>
    <rect x="730" y="840" width="220" height="110" rx="20" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" opacity="0.8"/>
    <path d="M350 895 L430 895" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <path d="M650 895 L730 895" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <polygon points="410,895 430,885 430,905" fill="${accent}"/>
    <polygon points="710,895 730,885 730,905" fill="${accent}"/>
  `,
  pyramid: (accent = '#8b5cf6') => `
    <polygon points="540,700 180,1300 900,1300" fill="rgba(139,92,246,0.18)" stroke="${accent}" stroke-width="4"/>
    <line x1="300" y1="1100" x2="780" y2="1100" stroke="#f59e0b" stroke-width="4"/>
    <line x1="400" y1="950" x2="680" y2="950" stroke="#f59e0b" stroke-width="4"/>
    <line x1="490" y1="800" x2="590" y2="800" stroke="#f59e0b" stroke-width="4"/>
    <line x1="540" y1="700" x2="540" y2="1300" stroke="${accent}" stroke-width="2" stroke-dasharray="8 6" opacity="0.4"/>
  `,
  network: (accent = '#8b5cf6') => `
    <circle cx="540" cy="980" r="100" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" stroke-width="4"/>
    <text x="540" y="990" text-anchor="middle" fill="#f59e0b" font-size="28" font-weight="700">智核</text>
    ${[[260, 760], [820, 740], [200, 1160], [880, 1160], [540, 1420]].map(([x, y]) => `
      <line x1="540" y1="980" x2="${x}" y2="${y}" stroke="${accent}" stroke-width="3" opacity="0.7"/>
      <circle cx="${x}" cy="${y}" r="60" fill="rgba(139,92,246,0.25)" stroke="${accent}" stroke-width="3"/>
    `).join('')}
  `,
  spotlight: (accent = '#8b5cf6') => `
    <ellipse cx="540" cy="700" rx="420" ry="320" fill="rgba(245,158,11,0.12)"/>
    <ellipse cx="540" cy="700" rx="280" ry="200" fill="rgba(245,158,11,0.08)"/>
    <circle cx="540" cy="700" r="80" fill="rgba(255,255,255,0.15)"/>
    <line x1="540" y1="0" x2="540" y2="1020" stroke="rgba(255,255,255,0.06)" stroke-width="120"/>
  `,
  data: (accent = '#8b5cf6') => `
    ${[0.2, 0.4, 0.6, 0.8, 1.0].map((h, i) => `
      <rect x="${120 + i * 80}" y="${1500 - h * 600}" width="60" height="${h * 600}"
        fill="${accent}" opacity="${0.3 + h * 0.5}" rx="8"/>
    `).join('')}
    <line x1="100" y1="1500" x2="560" y2="1500" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
  `,
  abstract: (accent = '#8b5cf6') => `
    <circle cx="240" cy="420" r="300" fill="rgba(139,92,246,0.12)"/>
    <circle cx="840" cy="1520" r="350" fill="rgba(245,158,11,0.1)"/>
    <circle cx="200" cy="1500" r="200" fill="rgba(139,92,246,0.08)"/>
    <circle cx="880" cy="400" r="180" fill="rgba(245,158,11,0.08)"/>
    <path d="M0,960 Q540,600 1080,960 Q540,1320 0,960Z" fill="rgba(139,92,246,0.06)"/>
  `,
};

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const LOCALIZED_REPLACEMENTS = [
  [/\bCodex for almost everything\b/gi, '几乎全流程'],
  [/\bcomputer use\b/gi, '电脑操作'],
  [/\bparallel agents?\b/gi, '多代理并行'],
  [/\bcoding agent\b/gi, '编码代理'],
  [/\blong-horizon\b/gi, '长链路'],
  [/\blow[- ]latency\b/gi, '低延迟'],
  [/\breal[- ]time\b/gi, '实时'],
  [/\brefactor\b/gi, '重构'],
  [/\bsecurity\b/gi, '安全'],
  [/\bworkflow\b/gi, '工作流'],
  [/\bworkspace\b/gi, '工作台'],
  [/\bdesktop\b/gi, '桌面'],
  [/\bmemory\b/gi, '记忆偏好'],
  [/\bimages?\b/gi, '图像生成'],
  [/\btools?\b/gi, '工具调用'],
  [/\bcoding\b/gi, '编码'],
  [/\bapp\b/gi, '应用'],
  [/\blane\b/gi, '流程'],
];

function localizeDisplayText(value) {
  let text = String(value || '').trim();
  if (!text) return '';

  for (const [pattern, replacement] of LOCALIZED_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\s*\+\s*/g, ' / ')
    .replace(/\s*[|｜]\s*/g, ' / ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*→\s*/g, ' 到 ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    .replace(/\s*，\s*/g, '，')
    .replace(/\s*。\s*/g, '。')
    .trim();
}

function cleanToken(value) {
  return localizeDisplayText(value)
    .replace(/^[：:、，,.·/ -]+|[：:、，,.·/ -]+$/g, '')
    .trim();
}

function dedupeTextList(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const cleaned = cleanToken(item);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function splitSemanticTokens(value) {
  return dedupeTextList(
    localizeDisplayText(value)
      .split(/[\/、，,|·]/)
      .map((item) => item.trim()),
  );
}

function extractDateChip(value) {
  const text = localizeDisplayText(value);
  const zhMatch = text.match(/^((?:20\d{2}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日)[：:]\s*(.+)$/);
  if (zhMatch) {
    return {
      topLabel: zhMatch[1].replace(/\s+/g, ''),
      title: zhMatch[2].trim(),
    };
  }

  const isoMatch = text.match(/^(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?:[：:\s-]+)(.+)$/);
  if (isoMatch) {
    return {
      topLabel: `${isoMatch[1]}.${isoMatch[2].padStart(2, '0')}.${isoMatch[3].padStart(2, '0')}`,
      title: isoMatch[4].trim(),
    };
  }

  return null;
}

function resolveTitlePresentation({title, topLabel}) {
  let displayTitle = localizeDisplayText(title);
  let displayTopLabel = cleanToken(topLabel);

  if (!displayTopLabel) {
    const dateChip = extractDateChip(displayTitle);
    if (dateChip) {
      displayTopLabel = dateChip.topLabel;
      displayTitle = dateChip.title;
    }
  }

  return {
    title: truncate(displayTitle, 24),
    topLabel: truncate(displayTopLabel, 12),
  };
}

function buildSubtitle({visualFocus, comparisonSummary, subtitle}) {
  const candidates = dedupeTextList([
    localizeDisplayText(visualFocus),
    localizeDisplayText(comparisonSummary),
    localizeDisplayText(subtitle),
  ]);

  if (candidates.length === 0) {
    return '';
  }

  const primary = candidates[0];
  const semanticTokens = splitSemanticTokens(primary).filter((item) => item.length <= 10);

  if (semanticTokens.length >= 2) {
    return truncate(`${semanticTokens[0]} / ${semanticTokens[1]}`, 18);
  }

  if (/^从.+走向.+$/.test(primary)) {
    return '';
  }

  if (primary.length <= 14) {
    return primary;
  }

  return '';
}

function emitJobEvent(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function toTextList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function buildComparisonSummaryZh(comparisons) {
  const validItems = Array.isArray(comparisons)
    ? comparisons.filter((item) => item && (item.left || item.right))
    : [];
  if (validItems.length === 0) return '';
  const first = validItems[0];
  return `对比关系：${truncate(localizeDisplayText(first.left || '左侧方案'), 16)} 对比 ${truncate(localizeDisplayText(first.right || '右侧方案'), 16)}`;
}

function deriveTitleFromPrompt(promptText, shotId) {
  const titleMatch = String(promptText || '').match(/^[^。！？.!?\n]+/);
  if (titleMatch?.[0]) {
    return truncate(titleMatch[0].trim(), 24);
  }
  return shotId || '镜头';
}

function resolveShotDisplayContent(item, shotMeta, shotId) {
  const promptText = typeof item?.prompt === 'string' ? item.prompt : '';
  const title = truncate(
    String(item?.shotTitle || shotMeta?.title || deriveTitleFromPrompt(promptText, shotId) || '镜头').trim(),
    24,
  );
  const visualSummary = String(
    item?.visualSummaryZh
    || item?.promptZh
    || item?.visual?.description
    || shotMeta?.visual?.description
    || shotMeta?.narration
    || promptText
    || '围绕当前镜头内容生成竖屏视觉',
  ).trim();
  const visualFocus = String(
    item?.visualFocusZh
    || item?.visualFocus
    || item?.visual?.focus
    || shotMeta?.visual?.focus
    || '',
  ).trim();
  const dataHighlights = [
    ...toTextList(item?.dataHighlightsZh),
    ...toTextList(item?.dataPoints),
  ].filter(Boolean).slice(0, 3);
  const comparisonSummary = String(item?.comparisonSummaryZh || buildComparisonSummaryZh(item?.comparisons)).trim();
  const subtitle = String(visualFocus || item?.mood || shotMeta?.level || '').trim();
  const contentText = [
    `画面内容：${truncate(visualSummary, 72)}`,
    visualFocus ? `视觉重点：${truncate(visualFocus, 48)}` : '',
    dataHighlights.length > 0 ? `关键信息：${dataHighlights.map((entry) => truncate(entry, 18)).join(' / ')}` : '',
    comparisonSummary,
  ].filter(Boolean).join('\n');
  const heroMark = String(item?.heroMark || shotMeta?.heroMark || '').trim();
  const topLabel = String(item?.topLabel || shotMeta?.topLabel || '').trim();
  const orbitLabels = toTextList(item?.orbitLabels || shotMeta?.orbitLabels).slice(0, 4);
  const bottomLine = String(item?.bottomLine || shotMeta?.bottomLine || '').trim();

  return {
    title,
    subtitle,
    visualSummary,
    visualFocus,
    dataHighlights,
    comparisonSummary,
    contentText,
    heroMark,
    topLabel,
    orbitLabels,
    bottomLine,
  };
}

function pickMotif(prompt, mood) {
  const combined = `${prompt || ''} ${mood || ''}`.toLowerCase();
  if (/timeline|步骤|流程|链路|step|flow|process/i.test(combined)) return 'timeline';
  if (/开场|引入|问题|悬念|hook|open|question|curiosity|总览|更新/i.test(combined)) return 'cinematic';
  if (/parallel|并行|多代理|agent|协作|任务|computer|电脑|工具|tool|memory|工作台|workspace|桌面|desktop/i.test(combined)) return 'network';
  if (/层|结构|金字塔|拆解|layer|structure|hierarchy/i.test(combined)) return 'pyramid';
  if (/网络|连接|节点|关系|network|connect|node/i.test(combined)) return 'network';
  if (/数据|统计|图表|增长|data|chart|percent|rise/i.test(combined)) return 'data';
  if (/聚焦|特写|光|spotlight|focus|highlight|beam/i.test(combined)) return 'spotlight';
  if (/对比|比较|之前之后|before|after|compare/i.test(combined)) return 'flow';
  if (/抽象|艺术|创意|mood|art|abstract|creative/i.test(combined)) return 'abstract';
  return 'cinematic';
}

function buildSubtleMotif(motifKey, accent) {
  if (motifKey === 'timeline') {
    return `
      <line x1="210" y1="1380" x2="870" y2="1380" stroke="${accent}" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      ${[250, 430, 610, 790].map((x) => `
        <circle cx="${x}" cy="1380" r="8" fill="${accent}" fill-opacity="0.32"/>
      `).join('')}
    `;
  }

  if (motifKey === 'network') {
    return `
      ${[
        [320, 820],
        [770, 800],
        [300, 1140],
        [790, 1115],
      ].map(([x, y]) => `
        <line x1="540" y1="980" x2="${x}" y2="${y}" stroke="${accent}" stroke-opacity="0.12" stroke-width="1.2"/>
        <circle cx="${x}" cy="${y}" r="18" fill="${accent}" fill-opacity="0.08" stroke="${accent}" stroke-opacity="0.14" stroke-width="1"/>
      `).join('')}
    `;
  }

  if (motifKey === 'pyramid') {
    return `
      <polygon points="540,760 300,1220 780,1220" fill="${accent}" fill-opacity="0.06" stroke="${accent}" stroke-opacity="0.14" stroke-width="1.2"/>
      <line x1="390" y1="1070" x2="690" y2="1070" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.2"/>
      <line x1="450" y1="920" x2="630" y2="920" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.2"/>
    `;
  }

  return `
    <circle cx="540" cy="980" r="340" fill="${accent}" fill-opacity="0.03"/>
    <circle cx="540" cy="980" r="228" fill="rgba(255,255,255,0.015)"/>
  `;
}

function buildHeroMark({title, subtitle, visualFocus, comparisonSummary, dataHighlights, heroMark, topLabel}) {
  if (heroMark) {
    return truncate(heroMark, 8);
  }

  const dateMatch = `${topLabel || ''} ${title} ${subtitle}`.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (dateMatch) {
    return `${dateMatch[1].padStart(2, '0')}·${dateMatch[2].padStart(2, '0')}`;
  }

  const isoDateMatch = `${topLabel || ''} ${title}`.match(/20\d{2}\.(\d{2})\.(\d{2})/);
  if (isoDateMatch) {
    return `${isoDateMatch[1]}·${isoDateMatch[2]}`;
  }

  const versionMatch = `${title} ${subtitle} ${visualFocus}`.match(/(\d+\.\d+)/);
  if (versionMatch) {
    return versionMatch[1];
  }

  const combined = localizeDisplayText(`${title} ${subtitle} ${visualFocus} ${comparisonSummary}`).toLowerCase();
  if (/codex app|应用|桌面/.test(combined)) return 'APP';
  if (/codex/.test(combined)) return 'CX';
  if (/电脑|pc/.test(combined)) return 'PC';
  if (/并行|多代理/.test(combined)) return '3X';
  if (/系统|生产/.test(combined)) return 'SYS';

  const fallback = localizeDisplayText(toTextList(dataHighlights)[0] || title || '01');
  return truncate(fallback.replace(/[^\w\u4e00-\u9fff.+-]/g, ''), 6);
}

function buildOrbitLabels({orbitLabels, visualFocus, dataHighlights, subtitle, motifKey, visualSystem}) {
  if (Array.isArray(orbitLabels) && orbitLabels.length > 0) {
    return dedupeTextList(orbitLabels.map((item) => truncate(localizeDisplayText(item), 14))).slice(0, 2);
  }

  if (visualSystem === 'poster-hero' && !['network', 'timeline', 'flow'].includes(motifKey)) {
    return [];
  }

  const subtitleTokens = new Set(splitSemanticTokens(subtitle).map((item) => item.toLowerCase()));
  const raw = dedupeTextList([
    ...splitSemanticTokens(visualFocus),
    ...toTextList(dataHighlights).map((item) => localizeDisplayText(item)),
    ...splitSemanticTokens(subtitle),
  ]);

  return raw
    .filter((item) => item.length <= 10)
    .filter((item) => !subtitleTokens.has(item.toLowerCase()))
    .filter((item) => !/^(20\d{2}|\d{1,2}\s*月)/.test(item))
    .map((item) => truncate(item, 10))
    .slice(0, visualSystem === 'poster-hero' ? 2 : 4);
}

function buildBottomLine({bottomLine}) {
  return truncate(localizeDisplayText(bottomLine || ''), 22);
}

function extractPrimaryBrandWord(...sources) {
  for (const source of sources) {
    const matches = String(source || '').match(/[A-Za-z][A-Za-z0-9.+-]{2,}/g) || [];
    for (const match of matches) {
      if (/^(macOS|Windows|Chrome|Brave|Edge)$/i.test(match)) {
        continue;
      }
      return match;
    }
  }

  return '';
}

function splitBrandHeadline({title, projectTitle}) {
  const displayTitle = localizeDisplayText(title || projectTitle || '');
  const brand = extractPrimaryBrandWord(displayTitle, projectTitle);
  if (!brand) {
    return {
      brandLine: '',
      descriptor: truncate(displayTitle, 18),
    };
  }

  const lowerTitle = displayTitle.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  const brandIndex = lowerTitle.indexOf(lowerBrand);
  let descriptor = displayTitle;

  if (brandIndex >= 0) {
    descriptor = `${displayTitle.slice(0, brandIndex)} ${displayTitle.slice(brandIndex + brand.length)}`;
  }

  descriptor = cleanToken(descriptor);
  if (!descriptor && projectTitle) {
    descriptor = cleanToken(localizeDisplayText(projectTitle).replace(new RegExp(escapeRegExp(brand), 'i'), ' '));
  }

  return {
    brandLine: brand,
    descriptor: truncate(descriptor || '最新更新', 18),
  };
}

function findDateBadge(...sources) {
  for (const source of sources) {
    const text = localizeDisplayText(source);
    if (!text) continue;

    const zhMatch = text.match(/(20\d{2})\s*[-./年]\s*(\d{1,2})(?:\s*[-./月]\s*(\d{1,2}))?/);
    if (zhMatch) {
      if (zhMatch[3]) {
        return `${zhMatch[1]}.${zhMatch[2].padStart(2, '0')}.${zhMatch[3].padStart(2, '0')}`;
      }
      return `${zhMatch[1]}.${zhMatch[2].padStart(2, '0')}`;
    }

    const monthDayMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (monthDayMatch) {
      return `${monthDayMatch[1].padStart(2, '0')}.${monthDayMatch[2].padStart(2, '0')}`;
    }
  }

  return '';
}

function buildBrandSupportLine({visualFocus, visualSummary, dataHighlights}) {
  const focus = localizeDisplayText(visualFocus);
  const transitionMatch = focus.match(/^从(.+)走向(.+)$/);
  if (transitionMatch) {
    return truncate(cleanToken(transitionMatch[2]), 14);
  }

  const tokens = dedupeTextList([
    ...splitSemanticTokens(focus),
    ...toTextList(dataHighlights).map((item) => localizeDisplayText(item)),
  ]).filter((item) => item.length <= 12 && !/^(20\d{2}|\d{2}\.\d{2})/.test(item));

  if (tokens.length > 0) {
    return truncate(tokens[0], 14);
  }

  return truncate(localizeDisplayText(visualSummary), 14);
}

function shouldUseBrandHero({visualSystem, shotIndex, title, projectTitle, visualSummary, topLabel}) {
  if (visualSystem !== 'poster-hero') {
    return false;
  }

  if (shotIndex !== 0) {
    return false;
  }

  if (topLabel) {
    return false;
  }

  const brand = extractPrimaryBrandWord(title, projectTitle);
  if (!brand) {
    return false;
  }

  const combined = localizeDisplayText(`${title} ${projectTitle} ${visualSummary}`);
  if (shotIndex === 0 && /开场|标题页|更新|发布|升级|总览|最新|launch|release|overview/i.test(combined)) {
    return true;
  }

  return false;
}

function createSeededRandom(seedText) {
  let seed = 0;
  for (const char of String(seedText || 'seed')) {
    seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function buildParticleField(seedText, accent) {
  const rand = createSeededRandom(seedText);
  const particles = [];

  for (let i = 0; i < 22; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 220 + rand() * 320;
    const x = 540 + Math.cos(angle) * radius * 0.9;
    const y = 900 + Math.sin(angle) * radius * 0.68;
    const size = 1.4 + rand() * 3.2;
    const opacity = 0.1 + rand() * 0.25;
    particles.push(`
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${accent}" fill-opacity="${opacity.toFixed(2)}"/>
    `);
  }

  return particles.join('');
}

function buildBrandHeroSvg({
  id,
  title,
  projectTitle,
  visualSummary,
  visualFocus,
  dataHighlights,
  style,
  accent,
}) {
  const {brandLine, descriptor} = splitBrandHeadline({title, projectTitle});
  const supportLine = buildBrandSupportLine({visualFocus, visualSummary, dataHighlights});
  const releaseBadge = findDateBadge(...toTextList(dataHighlights), title, projectTitle);
  const particleField = buildParticleField(`${id}-${brandLine}-${descriptor}`, accent);
  const descriptorSize = descriptor.length >= 6 ? 74 : 82;
  const supportY = supportLine ? 1236 : 0;

  const bgStops = style === 'warm'
    ? '<stop offset="0%" stop-color="#0a1018"/><stop offset="55%" stop-color="#0d1216"/><stop offset="100%" stop-color="#1a1007"/>'
    : '<stop offset="0%" stop-color="#07111a"/><stop offset="58%" stop-color="#081420"/><stop offset="100%" stop-color="#0a0f17"/>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      ${bgStops}
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="46%" r="44%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.36"/>
      <stop offset="36%" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fogGlow" cx="50%" cy="78%" r="62%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.11"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wordmarkFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dff7ff"/>
      <stop offset="62%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#9fe7ff"/>
    </linearGradient>
    <pattern id="scanPattern" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="1" fill="rgba(255,255,255,0.018)"/>
    </pattern>
    <filter id="brandBlur">
      <feGaussianBlur stdDeviation="54"/>
    </filter>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fogGlow)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scanPattern)" opacity="0.26"/>

  <circle cx="540" cy="900" r="364" fill="url(#coreGlow)"/>
  <circle cx="540" cy="900" r="248" fill="${accent}" opacity="0.1" filter="url(#brandBlur)"/>
  <circle cx="540" cy="900" r="304" fill="none" stroke="${accent}" stroke-opacity="0.12" stroke-width="1.2"/>
  <circle cx="540" cy="900" r="214" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <path d="M210 900 C300 720, 780 720, 870 900" fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="1.2"/>
  <path d="M250 944 C330 792, 750 792, 830 944" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="350" y1="900" x2="730" y2="900" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <line x1="540" y1="696" x2="540" y2="1104" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <g opacity="0.92">
    ${particleField}
  </g>

  ${releaseBadge ? `
  <g transform="translate(424 206)">
    <line x1="0" y1="16" x2="74" y2="16" stroke="${accent}" stroke-opacity="0.48" stroke-width="1.4"/>
    <text x="94" y="24" fill="rgba(255,255,255,0.78)" font-size="24" letter-spacing="4"
      font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">${esc(releaseBadge)}</text>
    <line x1="250" y1="16" x2="324" y2="16" stroke="${accent}" stroke-opacity="0.48" stroke-width="1.4"/>
  </g>
  ` : ''}

  <text x="540" y="950" text-anchor="middle" fill="url(#wordmarkFill)" font-size="184" font-weight="700"
    font-family="Georgia, Times New Roman, serif" letter-spacing="-3">${esc(brandLine || 'Brand')}</text>

  <text x="540" y="1118" text-anchor="middle" fill="#f4f7fb" font-size="${descriptorSize}" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(descriptor)}</text>

  ${supportLine ? `
  <text x="540" y="${supportY}" text-anchor="middle" fill="${accent}" font-size="30" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif" opacity="0.95">${esc(truncate(supportLine, 14))}</text>
  <line x1="444" y1="${supportY + 34}" x2="636" y2="${supportY + 34}" stroke="${accent}" stroke-opacity="0.26" stroke-width="1.2"/>
  ` : ''}

  <circle cx="540" cy="900" r="8" fill="#ffffff" opacity="0.26" filter="url(#softBlur)"/>
</svg>`;
}

function shouldUseReleaseHero({visualSystem, shotIndex, topLabel, title, visualSummary, visualFocus}) {
  if (visualSystem !== 'poster-hero') {
    return false;
  }

  if (shotIndex === 0) {
    return false;
  }

  if (topLabel) {
    return true;
  }

  const combined = `${title || ''} ${visualSummary || ''} ${visualFocus || ''}`;
  return /\b(GPT-\d+\.\d+|Codex-Spark)\b/i.test(combined);
}

function buildReleaseSupportLine({subtitle, visualFocus, visualSummary}) {
  const normalizedSubtitle = cleanToken(subtitle);
  if (normalizedSubtitle && normalizedSubtitle.length <= 16) {
    return truncate(normalizedSubtitle, 16);
  }

  const candidates = dedupeTextList([
    ...splitSemanticTokens(visualFocus),
    ...splitSemanticTokens(visualSummary),
  ]).filter((item) => item.length <= 12);

  if (candidates.length >= 2) {
    return truncate(`${candidates[0]} / ${candidates[1]}`, 18);
  }

  return truncate(candidates[0] || normalizedSubtitle || '', 16);
}

function buildReleaseMetaLine({dataHighlights, subtitle, topLabel}) {
  const subtitleTokens = new Set(splitSemanticTokens(subtitle).map((item) => item.toLowerCase()));
  const dateBadge = cleanToken(topLabel);
  const items = dedupeTextList(
    toTextList(dataHighlights)
      .map((item) => localizeDisplayText(item))
      .flatMap((item) => item.split(/[\/、]/).map((token) => token.trim())),
  )
    .filter((item) => item.length <= 12)
    .filter((item) => item.toLowerCase() !== dateBadge.toLowerCase())
    .filter((item) => !subtitleTokens.has(item.toLowerCase()))
    .slice(0, 3);

  return truncate(items.join('  ·  '), 28);
}

function buildReleaseHeroSvg({
  id,
  title,
  subtitle,
  visualSummary,
  visualFocus,
  dataHighlights,
  topLabel,
  style,
  accent,
}) {
  const supportLine = buildReleaseSupportLine({subtitle, visualFocus, visualSummary});
  const metaLine = buildReleaseMetaLine({dataHighlights, subtitle: supportLine, topLabel});
  const releaseBadge = cleanToken(topLabel) || findDateBadge(title, visualSummary, visualFocus);
  const particleField = buildParticleField(`${id}-${title}-${releaseBadge}`, accent);
  const hero = esc(buildHeroMark({
    title,
    subtitle: supportLine,
    visualFocus,
    comparisonSummary: '',
    dataHighlights,
    heroMark: '',
    topLabel: releaseBadge,
  }));

  const bgStops = style === 'warm'
    ? '<stop offset="0%" stop-color="#0a1017"/><stop offset="58%" stop-color="#11120f"/><stop offset="100%" stop-color="#1a1007"/>'
    : '<stop offset="0%" stop-color="#07111a"/><stop offset="55%" stop-color="#0a1520"/><stop offset="100%" stop-color="#0a0f17"/>';

  const accentSoft = style === 'warm' ? '#ffd08a' : '#b8f1ff';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      ${bgStops}
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="48%" r="42%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.3"/>
      <stop offset="40%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="heroFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentSoft}"/>
      <stop offset="70%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <pattern id="scanPattern" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="1" fill="rgba(255,255,255,0.014)"/>
    </pattern>
    <filter id="releaseBlur">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scanPattern)" opacity="0.24"/>
  <circle cx="540" cy="930" r="320" fill="url(#coreGlow)"/>
  <rect x="505" y="460" width="70" height="860" rx="35" fill="${accent}" fill-opacity="0.055" filter="url(#releaseBlur)"/>
  <line x1="240" y1="930" x2="840" y2="930" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  <path d="M210 930 C300 790, 780 790, 870 930" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="1.4"/>
  <path d="M250 980 C330 860, 750 860, 830 980" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="350" y1="760" x2="438" y2="848" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.4"/>
  <line x1="730" y1="760" x2="642" y2="848" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.4"/>

  <g opacity="0.76">
    ${particleField}
  </g>

  ${releaseBadge ? `
  <g transform="translate(424 206)">
    <line x1="0" y1="16" x2="78" y2="16" stroke="${accent}" stroke-opacity="0.48" stroke-width="1.4"/>
    <text x="98" y="24" fill="rgba(255,255,255,0.82)" font-size="24" letter-spacing="4"
      font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">${esc(releaseBadge)}</text>
    <line x1="252" y1="16" x2="330" y2="16" stroke="${accent}" stroke-opacity="0.48" stroke-width="1.4"/>
  </g>
  ` : ''}

  <text x="540" y="1004" text-anchor="middle" fill="url(#heroFill)" font-size="178" font-weight="700"
    font-family="Georgia, Times New Roman, serif" letter-spacing="-4">${hero}</text>

  <text x="540" y="1166" text-anchor="middle" fill="#f5f7fb" font-size="${title.length >= 10 ? 62 : 68}" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(title, 18))}</text>

  ${supportLine ? `
  <text x="540" y="1234" text-anchor="middle" fill="${accent}" font-size="30" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif" opacity="0.96">${esc(truncate(supportLine, 18))}</text>
  <line x1="444" y1="1268" x2="636" y2="1268" stroke="${accent}" stroke-opacity="0.26" stroke-width="1.2"/>
  ` : ''}

  ${metaLine ? `
  <text x="540" y="1456" text-anchor="middle" fill="rgba(255,255,255,0.66)" font-size="24" letter-spacing="2"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(metaLine)}</text>
  ` : ''}
</svg>`;
}

function shouldUseCapabilityHero({visualSystem, shotIndex, topLabel, title, visualSummary, visualFocus}) {
  if (visualSystem !== 'poster-hero') {
    return false;
  }

  if (shotIndex === 0 || topLabel) {
    return false;
  }

  const combined = localizeDisplayText(`${title || ''} ${visualSummary || ''} ${visualFocus || ''}`);
  if (/底层|底座|系统|生产|意义|升级|长链路|重构|安全|助手|结论|收束/.test(combined)) {
    return false;
  }
  return /电脑|操作|工具|图像生成|记忆偏好|并行|多代理|agent|computer|memory|workspace|工作台/.test(combined);
}

function buildCapabilitySupportLine({subtitle, visualFocus}) {
  const normalizedSubtitle = cleanToken(subtitle);
  if (normalizedSubtitle && normalizedSubtitle.length <= 16) {
    return truncate(normalizedSubtitle, 16);
  }

  const tokens = dedupeTextList(splitSemanticTokens(visualFocus)).filter((item) => item.length <= 12);
  if (tokens.length >= 2) {
    return truncate(`${tokens[0]} / ${tokens[1]}`, 18);
  }

  return truncate(tokens[0] || normalizedSubtitle || '', 16);
}

function buildCapabilityMetaLine({dataHighlights, visualFocus, supportLine}) {
  const supportTokens = new Set(splitSemanticTokens(supportLine).map((item) => item.toLowerCase()));
  const tokens = dedupeTextList([
    ...toTextList(dataHighlights).map((item) => localizeDisplayText(item)),
    ...splitSemanticTokens(visualFocus),
  ])
    .filter((item) => item.length <= 12)
    .filter((item) => !supportTokens.has(item.toLowerCase()))
    .slice(0, 3);

  return truncate(tokens.join('  ·  '), 28);
}

function buildCapabilityOrbitLabels({dataHighlights, visualFocus, supportLine}) {
  const supportTokens = new Set(splitSemanticTokens(supportLine).map((item) => item.toLowerCase()));
  return dedupeTextList([
    ...toTextList(dataHighlights).map((item) => localizeDisplayText(item)),
    ...splitSemanticTokens(visualFocus),
  ])
    .filter((item) => item.length <= 10)
    .filter((item) => !supportTokens.has(item.toLowerCase()))
    .slice(0, 3);
}

function buildCapabilityHeroSvg({
  id,
  title,
  subtitle,
  visualSummary,
  visualFocus,
  dataHighlights,
  style,
  accent,
}) {
  const supportLine = buildCapabilitySupportLine({subtitle, visualFocus});
  const metaLine = buildCapabilityMetaLine({dataHighlights, visualFocus, supportLine});
  const orbitLabels = buildCapabilityOrbitLabels({dataHighlights, visualFocus, supportLine});
  const hero = esc(buildHeroMark({
    title,
    subtitle: supportLine,
    visualFocus,
    comparisonSummary: '',
    dataHighlights,
    heroMark: '',
    topLabel: '',
  }));
  const particleField = buildParticleField(`${id}-${title}-${hero}`, accent);
  const bgStops = style === 'warm'
    ? '<stop offset="0%" stop-color="#090f16"/><stop offset="58%" stop-color="#10140f"/><stop offset="100%" stop-color="#171009"/>'
    : '<stop offset="0%" stop-color="#06111a"/><stop offset="56%" stop-color="#08141f"/><stop offset="100%" stop-color="#091018"/>';
  const accentSoft = style === 'warm' ? '#ffd08a' : '#baf2ff';
  const orbitAnchors = [
    {cx: 746, cy: 772, tx: 820, ty: 744, align: 'start'},
    {cx: 812, cy: 1110, tx: 884, ty: 1138, align: 'start'},
    {cx: 312, cy: 1134, tx: 238, ty: 1162, align: 'end'},
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      ${bgStops}
    </linearGradient>
    <linearGradient id="heroFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentSoft}"/>
      <stop offset="68%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <radialGradient id="beamGlow" cx="50%" cy="50%" r="46%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.24"/>
      <stop offset="42%" stop-color="${accent}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="beamBlur">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="540" cy="930" r="330" fill="url(#beamGlow)"/>
  <ellipse cx="540" cy="928" rx="340" ry="286" fill="none" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.4" transform="rotate(-12 540 928)"/>
  <ellipse cx="540" cy="928" rx="268" ry="212" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.1" transform="rotate(14 540 928)"/>
  <ellipse cx="540" cy="928" rx="188" ry="146" fill="${accent}" fill-opacity="0.05" filter="url(#beamBlur)"/>
  <path d="M242 1286 C358 1142, 446 1004, 540 930" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="1.2"/>
  <path d="M838 1286 C722 1142, 634 1004, 540 930" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="1.2"/>
  <path d="M318 762 C414 804, 488 858, 540 930" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <path d="M762 762 C666 804, 592 858, 540 930" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <circle cx="746" cy="772" r="9" fill="${accent}" fill-opacity="0.9"/>
  <circle cx="812" cy="1110" r="8" fill="rgba(255,255,255,0.74)"/>
  <circle cx="312" cy="1134" r="8" fill="rgba(255,255,255,0.74)"/>

  <g opacity="0.58">
    ${particleField}
  </g>

  ${orbitLabels.map((label, index) => {
    const anchor = orbitAnchors[index];
    if (!anchor) return '';
    const lineEndX = anchor.align === 'start' ? anchor.tx - 18 : anchor.tx + 18;
    return `
  <g>
    <line x1="${anchor.cx}" y1="${anchor.cy}" x2="${lineEndX}" y2="${anchor.ty - 10}" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.1"/>
    <text x="${anchor.tx}" y="${anchor.ty}" text-anchor="${anchor.align}" fill="${index === 0 ? accent : 'rgba(255,255,255,0.82)'}" font-size="24" font-weight="600"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(label, 8))}</text>
  </g>`;
  }).join('')}

  <text x="540" y="1012" text-anchor="middle" fill="url(#heroFill)" font-size="172" font-weight="700"
    font-family="Georgia, Times New Roman, serif" letter-spacing="-4">${hero}</text>

  <text x="540" y="1178" text-anchor="middle" fill="#f5f7fb" font-size="${title.length >= 10 ? 60 : 66}" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(title, 18))}</text>

  ${supportLine ? `
  <text x="540" y="1248" text-anchor="middle" fill="${accent}" font-size="30" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif" opacity="0.96">${esc(truncate(supportLine, 18))}</text>
  <line x1="434" y1="1284" x2="646" y2="1284" stroke="${accent}" stroke-opacity="0.26" stroke-width="1.2"/>
  ` : ''}

  ${metaLine ? `
  <text x="540" y="1488" text-anchor="middle" fill="rgba(255,255,255,0.62)" font-size="24" letter-spacing="2"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(metaLine)}</text>
  ` : ''}
</svg>`;
}

function shouldUseSystemHero({visualSystem, shotIndex, topLabel, title, visualSummary, visualFocus}) {
  if (visualSystem !== 'poster-hero') {
    return false;
  }

  if (shotIndex === 0 || topLabel) {
    return false;
  }

  const combined = localizeDisplayText(`${title || ''} ${visualSummary || ''} ${visualFocus || ''}`);
  return /底层|底座|系统|生产|意义|升级|长链路|重构|安全|助手|结论|收束/.test(combined);
}

function buildSystemCoreWord({title, visualSummary, visualFocus}) {
  const combined = localizeDisplayText(`${title || ''} ${visualSummary || ''} ${visualFocus || ''}`);
  if (/底层|底座/.test(combined)) return '底座';
  if (/生产|系统/.test(combined)) return '系统';
  if (/安全/.test(combined)) return '安全';
  if (/长链路/.test(combined)) return '长链路';
  return truncate(cleanToken(localizeDisplayText(visualFocus || title)), 6);
}

function buildSystemPillars({visualFocus, dataHighlights, coreWord}) {
  const coreLower = String(coreWord || '').toLowerCase();
  return dedupeTextList([
    ...toTextList(dataHighlights).map((item) => localizeDisplayText(item)),
    ...splitSemanticTokens(visualFocus),
  ])
    .filter((item) => item.length <= 12)
    .filter((item) => item.toLowerCase() !== coreLower)
    .slice(0, 3);
}

function buildSystemHeroSvg({
  id,
  title,
  visualSummary,
  visualFocus,
  dataHighlights,
  style,
  accent,
}) {
  const coreWord = buildSystemCoreWord({title, visualSummary, visualFocus});
  const pillars = buildSystemPillars({visualFocus, dataHighlights, coreWord});
  const particleField = buildParticleField(`${id}-${coreWord}-${title}`, accent);
  const bgStops = style === 'warm'
    ? '<stop offset="0%" stop-color="#0a1018"/><stop offset="58%" stop-color="#11130e"/><stop offset="100%" stop-color="#181108"/>'
    : '<stop offset="0%" stop-color="#07111a"/><stop offset="56%" stop-color="#091420"/><stop offset="100%" stop-color="#0a0f17"/>';
  const accentSoft = style === 'warm' ? '#ffd08a' : '#bdf4ff';
  const pillarPositions = [358, 540, 722];
  const pedestalTop = 1238;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      ${bgStops}
    </linearGradient>
    <radialGradient id="systemGlow" cx="50%" cy="50%" r="44%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="40%" stop-color="${accent}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="systemFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accentSoft}"/>
      <stop offset="72%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="systemBlur">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="540" cy="912" r="312" fill="url(#systemGlow)"/>
  <ellipse cx="540" cy="924" rx="240" ry="168" fill="${accent}" fill-opacity="0.08" filter="url(#systemBlur)"/>
  <path d="M222 956 C320 760, 760 760, 858 956" fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="1.3"/>
  <path d="M274 1026 C354 888, 726 888, 806 1026" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <path d="M318 ${pedestalTop} C406 ${pedestalTop - 28}, 674 ${pedestalTop - 28}, 762 ${pedestalTop}" fill="none" stroke="${accent}" stroke-opacity="0.24" stroke-width="1.5"/>
  <path d="M288 ${pedestalTop + 42} C390 ${pedestalTop + 16}, 690 ${pedestalTop + 16}, 792 ${pedestalTop + 42}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/>
  <ellipse cx="540" cy="${pedestalTop + 62}" rx="238" ry="36" fill="${accent}" fill-opacity="0.1" filter="url(#systemBlur)"/>
  <line x1="540" y1="702" x2="540" y2="${pedestalTop - 46}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  <line x1="332" y1="${pedestalTop + 10}" x2="748" y2="${pedestalTop + 10}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <g opacity="0.44">
    ${particleField}
  </g>

  <text x="540" y="1012" text-anchor="middle" fill="url(#systemFill)" font-size="${coreWord.length >= 3 ? 126 : 162}" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif" letter-spacing="${coreWord.length >= 3 ? '4' : '0'}">${esc(coreWord)}</text>

  <text x="540" y="1178" text-anchor="middle" fill="#f5f7fb" font-size="${title.length >= 10 ? 58 : 64}" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(title, 20))}</text>

  ${pillars.length > 0 ? `
  <line x1="300" y1="1368" x2="780" y2="1368" stroke="${accent}" stroke-opacity="0.12" stroke-width="1.2"/>
  ${pillars.map((pillar, index) => `
  <circle cx="${pillarPositions[index] || 540}" cy="1368" r="6" fill="${accent}" fill-opacity="0.82"/>
  <text x="${pillarPositions[index] || 540}" y="1424" text-anchor="middle" fill="${index === 1 ? accent : 'rgba(255,255,255,0.78)'}" font-size="28" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(pillar, 8))}</text>
  `).join('')}
  ` : ''}
</svg>`;
}

function splitLandscapeLines(text, maxChars = 14, maxLines = 2) {
  const value = localizeDisplayText(text);
  if (!value) {
    return [];
  }

  const segments = value
    .split(/(?<=[，：:、\s])/)
    .map((item) => item.trim())
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const segment of segments.length > 0 ? segments : [value]) {
    if (!current) {
      current = segment;
      continue;
    }

    if ((current + segment).length <= maxChars) {
      current += segment;
      continue;
    }

    lines.push(current);
    current = segment;
    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === 0) {
    lines.push(value);
  }

  return lines
    .slice(0, maxLines)
    .map((line, index) => index === maxLines - 1 ? truncate(line, maxChars + 6) : truncate(line, maxChars + 2));
}

function buildLandscapeSvg({
  id,
  title,
  subtitle,
  visualSummary,
  visualFocus,
  comparisonSummary,
  dataHighlights,
  style,
  accent,
  heroMark,
  topLabel,
  orbitLabels,
  bottomLine,
  motifKey,
}) {
  const titleLines = splitLandscapeLines(title, 14, 2);
  const subtitleText = esc(truncate(subtitle || visualFocus || comparisonSummary, 34));
  const summaryText = esc(truncate(localizeDisplayText(visualSummary || comparisonSummary || visualFocus), 72));
  const focusText = esc(truncate(localizeDisplayText(visualFocus || comparisonSummary), 30));
  const footer = esc(buildBottomLine({bottomLine}));
  const hero = esc(buildHeroMark({
    title,
    subtitle,
    visualFocus,
    comparisonSummary,
    dataHighlights,
    heroMark,
    topLabel,
  }));
  const orbit = buildOrbitLabels({
    orbitLabels,
    visualFocus,
    dataHighlights,
    subtitle,
    motifKey,
    visualSystem: 'ultimate-1080p',
  }).slice(0, 4);
  const infoCards = dedupeTextList([
    ...toTextList(dataHighlights),
    ...splitSemanticTokens(visualFocus),
    ...splitSemanticTokens(comparisonSummary),
  ]).slice(0, 4);
  const topChip = esc(cleanToken(topLabel));
  const panelX = WIDTH - 760;
  const panelY = 142;
  const panelWidth = 620;
  const panelHeight = 660;
  const titleFontSize = titleLines[0]?.length > 10 ? 86 : 94;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${style === 'warm' ? '#10141a' : '#080b14'}"/>
      <stop offset="56%" stop-color="${style === 'cool' ? '#091623' : '#0b1020'}"/>
      <stop offset="100%" stop-color="${style === 'warm' ? '#1b1209' : '#121226'}"/>
    </linearGradient>
    <linearGradient id="panelGlow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <radialGradient id="heroGlow" cx="50%" cy="50%" r="56%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="40%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="28"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="${panelX + 320}" cy="${panelY + 320}" r="360" fill="url(#heroGlow)" filter="url(#softBlur)"/>
  <circle cx="240" cy="210" r="180" fill="${accent}" fill-opacity="0.06" filter="url(#softBlur)"/>
  <circle cx="${WIDTH - 220}" cy="${HEIGHT - 150}" r="220" fill="#f59e0b" fill-opacity="0.05" filter="url(#softBlur)"/>

  <g opacity="0.13">
    ${buildSubtleMotif(motifKey, accent)}
  </g>

  <line x1="120" y1="860" x2="${WIDTH - 120}" y2="860" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/>
  <line x1="120" y1="128" x2="480" y2="128" stroke="${accent}" stroke-opacity="0.22" stroke-width="2"/>

  ${topChip ? `
  <g transform="translate(128 144)">
    <rect x="0" y="0" width="${Math.max(140, topChip.length * 28)}" height="52" rx="26"
      fill="rgba(6,18,28,0.56)" stroke="${accent}" stroke-opacity="0.42" stroke-width="1.2"/>
    <circle cx="24" cy="26" r="6" fill="${accent}"/>
    <text x="42" y="34" fill="${accent}" font-size="22" font-weight="700"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${topChip}</text>
  </g>` : ''}

  ${titleLines.map((line, index) => `
  <text x="132" y="${topChip ? 304 + index * 110 : 256 + index * 110}" fill="#f5f7fb"
    font-size="${titleFontSize}" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(line)}</text>
  `).join('')}

  ${subtitleText ? `
  <text x="136" y="${topChip ? 542 : 494}" fill="${accent}" font-size="30" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${subtitleText}</text>` : ''}

  ${summaryText ? `
  <text x="136" y="${topChip ? 622 : 574}" fill="rgba(255,255,255,0.82)" font-size="32" font-weight="500"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${summaryText}</text>` : ''}

  ${focusText ? `
  <text x="136" y="${topChip ? 688 : 640}" fill="rgba(255,255,255,0.56)" font-size="24" font-weight="500"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${focusText}</text>` : ''}

  <g transform="translate(${panelX} ${panelY})">
    <rect x="0" y="0" width="${panelWidth}" height="${panelHeight}" rx="36"
      fill="rgba(7, 10, 18, 0.58)" stroke="rgba(194,219,255,0.18)" stroke-width="1.6"/>
    <rect x="18" y="18" width="${panelWidth - 36}" height="${panelHeight - 36}" rx="28"
      fill="url(#panelGlow)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <circle cx="${panelWidth / 2}" cy="250" r="180" fill="url(#heroGlow)"/>
    <circle cx="${panelWidth / 2}" cy="250" r="148" fill="none" stroke="${accent}" stroke-opacity="0.2" stroke-width="2"/>
    <circle cx="${panelWidth / 2}" cy="250" r="102" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
    <text x="${panelWidth / 2}" y="282" text-anchor="middle" fill="${accent}" font-size="${hero.length >= 3 ? 122 : 148}" font-weight="700"
      font-family="Georgia, Times New Roman, serif" letter-spacing="-3">${hero}</text>
    <text x="${panelWidth / 2}" y="446" text-anchor="middle" fill="#f5f7fb" font-size="42" font-weight="700"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(title, 20))}</text>
    <text x="${panelWidth / 2}" y="508" text-anchor="middle" fill="${accent}" font-size="24" font-weight="600"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(subtitle || visualFocus || comparisonSummary, 22))}</text>
    ${orbit.map((item, index) => `
    <g transform="translate(${78 + (index % 2) * 254} ${552 + Math.floor(index / 2) * 72})">
      <rect x="0" y="0" width="210" height="46" rx="23" fill="rgba(255,255,255,0.05)" stroke="${accent}" stroke-opacity="0.16" stroke-width="1"/>
      <circle cx="18" cy="23" r="5" fill="${accent}"/>
      <text x="34" y="30" fill="rgba(255,255,255,0.88)" font-size="18" font-weight="600"
        font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(item, 14))}</text>
    </g>`).join('')}
  </g>

  ${infoCards.map((item, index) => `
  <g transform="translate(${128 + index * 330} 902)">
    <rect x="0" y="0" width="292" height="108" rx="24" fill="rgba(255,255,255,0.04)" stroke="${accent}" stroke-opacity="${index === 0 ? '0.36' : '0.14'}" stroke-width="1.2"/>
    <text x="24" y="42" fill="${index === 0 ? accent : 'rgba(255,255,255,0.6)'}" font-size="16" font-weight="700"
      font-family="Inter, PingFang SC, Microsoft YaHei, sans-serif">POINT ${String(index + 1).padStart(2, '0')}</text>
    <text x="24" y="78" fill="#f5f7fb" font-size="28" font-weight="700"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(truncate(item, 16))}</text>
  </g>`).join('')}

  ${footer ? `
  <text x="${WIDTH / 2}" y="${HEIGHT - 92}" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${footer}</text>` : ''}
</svg>`;
}

function buildSvg({
  visualSystem = 'poster-hero',
  shotIndex = 0,
  id,
  title,
  projectTitle,
  subtitle,
  visualSummary,
  visualFocus,
  comparisonSummary,
  dataHighlights,
  mood,
  style,
  heroMark,
  topLabel,
  orbitLabels,
  bottomLine,
}) {
  const motifKey = pickMotif(`${visualSummary} ${visualFocus} ${comparisonSummary}`, mood);
  const accent = style === 'warm' ? '#f59e0b' : style === 'cool' ? '#06b6d4' : '#8b5cf6';
  const titlePresentation = resolveTitlePresentation({title, topLabel});
  const displaySubtitle = buildSubtitle({visualFocus, comparisonSummary, subtitle});
  const isLandscape = WIDTH >= HEIGHT;

  if (isLandscape) {
    return buildLandscapeSvg({
      id,
      title: titlePresentation.title || title,
      subtitle: displaySubtitle,
      visualSummary,
      visualFocus,
      comparisonSummary,
      dataHighlights,
      style,
      accent,
      heroMark,
      topLabel: titlePresentation.topLabel,
      orbitLabels,
      bottomLine,
      motifKey,
    });
  }

  const useBrandHero = shouldUseBrandHero({
    visualSystem,
    shotIndex,
    title,
    projectTitle,
    visualSummary,
    topLabel: titlePresentation.topLabel,
  });

  if (useBrandHero) {
    return buildBrandHeroSvg({
      id,
      title: titlePresentation.title || title,
      projectTitle,
      visualSummary,
      visualFocus,
      dataHighlights,
      style,
      accent,
    });
  }

  const useReleaseHero = shouldUseReleaseHero({
    visualSystem,
    shotIndex,
    topLabel: titlePresentation.topLabel,
    title: titlePresentation.title || title,
    visualSummary,
    visualFocus,
  });

  if (useReleaseHero) {
    return buildReleaseHeroSvg({
      id,
      title: titlePresentation.title || title,
      subtitle: displaySubtitle,
      visualSummary,
      visualFocus,
      dataHighlights,
      topLabel: titlePresentation.topLabel,
      style,
      accent,
    });
  }

  const useSystemHero = shouldUseSystemHero({
    visualSystem,
    shotIndex,
    topLabel: titlePresentation.topLabel,
    title: titlePresentation.title || title,
    visualSummary,
    visualFocus,
  });

  if (useSystemHero) {
    return buildSystemHeroSvg({
      id,
      title: titlePresentation.title || title,
      visualSummary,
      visualFocus,
      dataHighlights,
      style,
      accent,
    });
  }

  const useCapabilityHero = shouldUseCapabilityHero({
    visualSystem,
    shotIndex,
    topLabel: titlePresentation.topLabel,
    title: titlePresentation.title || title,
    visualSummary,
    visualFocus,
  });

  if (useCapabilityHero) {
    return buildCapabilityHeroSvg({
      id,
      title: titlePresentation.title || title,
      subtitle: displaySubtitle,
      visualSummary,
      visualFocus,
      dataHighlights,
      style,
      accent,
    });
  }

  const hero = esc(buildHeroMark({
    title: titlePresentation.title || title,
    subtitle: displaySubtitle,
    visualFocus,
    comparisonSummary,
    dataHighlights,
    heroMark,
    topLabel: titlePresentation.topLabel,
  }));
  const orbit = buildOrbitLabels({
    orbitLabels,
    visualFocus,
    dataHighlights,
    subtitle: displaySubtitle,
    motifKey,
    visualSystem,
  });
  const footer = esc(buildBottomLine({bottomLine}));
  const titleText = esc(truncate(titlePresentation.title || title || id || '镜头', 24));
  const subtitleText = esc(truncate(displaySubtitle, 20));
  const topChip = esc(titlePresentation.topLabel);
  const bgStops = style === 'warm'
    ? '<stop offset="0%" stop-color="#0a1018"/><stop offset="68%" stop-color="#0a1317"/><stop offset="100%" stop-color="#120d08"/>'
    : style === 'cool'
      ? '<stop offset="0%" stop-color="#07121b"/><stop offset="60%" stop-color="#07131c"/><stop offset="100%" stop-color="#0a0d18"/>'
      : '<stop offset="0%" stop-color="#09070d"/><stop offset="100%" stop-color="#111022"/>';
  const motifOpacity = motifKey === 'pyramid' ? 0.18 : motifKey === 'network' ? 0.16 : 0.12;
  const heroCenterY = orbit.length > 0 ? 980 : 940;
  const heroTextY = orbit.length > 0 ? 1030 : 1008;
  const titleY = subtitleText ? 1168 : 1198;
  const subtitleY = titleY + 68;
  const dividerY = footer ? 1540 : 1676;
  const topChipWidth = Math.max(120, topChip.length * 34);
  const topChipX = Math.round((WIDTH - topChipWidth) / 2);
  const orbitPositions = [
    {x: 316, y: 760, lx: 358, ly: 744, align: 'start'},
    {x: 762, y: 736, lx: 720, ly: 720, align: 'end'},
    {x: 782, y: 1036, lx: 730, ly: 1052, align: 'end'},
    {x: 284, y: 1088, lx: 334, ly: 1104, align: 'start'},
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      ${bgStops}
    </linearGradient>
    <radialGradient id="heroGlow" cx="50%" cy="52%" r="42%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.32"/>
      <stop offset="38%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ambientGlow" cx="50%" cy="72%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="24"/>
    </filter>
    <filter id="heroBlur">
      <feGaussianBlur stdDeviation="50"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ambientGlow)"/>
  <circle cx="540" cy="${heroCenterY}" r="300" fill="url(#heroGlow)"/>
  <circle cx="540" cy="${heroCenterY}" r="228" fill="${accent}" opacity="0.08" filter="url(#heroBlur)"/>
  <circle cx="540" cy="${heroCenterY}" r="270" fill="none" stroke="${accent}" stroke-opacity="${motifOpacity}" stroke-width="1.5"/>
  <circle cx="540" cy="${heroCenterY}" r="166" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <line x1="210" y1="${dividerY}" x2="870" y2="${dividerY}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <g opacity="${motifOpacity}">
    ${buildSubtleMotif(motifKey, accent)}
  </g>

  ${topChip ? `
  <g transform="translate(${topChipX} 210)">
    <rect x="0" y="0" width="${Math.max(110, topChip.length * 34)}" height="56" rx="28"
      fill="rgba(6,18,28,0.58)" stroke="${accent}" stroke-opacity="0.42" stroke-width="1.2"/>
    <circle cx="28" cy="28" r="6" fill="${accent}"/>
    <text x="54" y="36" fill="${accent}" font-size="24" font-weight="700"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${topChip}</text>
  </g>
  ` : ''}

  ${orbit.map((label, index) => {
    const pos = orbitPositions[index];
    const isStart = pos.align === 'start';
    const lineEndX = isStart ? pos.x + 26 : pos.x - 26;
    return `
    <g>
      <circle cx="${pos.x}" cy="${pos.y}" r="7" fill="${accent}"/>
      <line x1="${540}" y1="${heroCenterY}" x2="${lineEndX}" y2="${pos.y}" stroke="${accent}" stroke-opacity="0.18" stroke-width="1.2"/>
      <text x="${pos.lx}" y="${pos.ly}" text-anchor="${pos.align}" fill="rgba(255,255,255,0.9)"
        font-size="22" font-weight="600" font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(label)}</text>
    </g>`;
  }).join('')}

  <text x="540" y="${heroTextY}" text-anchor="middle" fill="${accent}" font-size="${orbit.length > 0 ? 154 : 172}" font-weight="700"
    font-family="Georgia, Times New Roman, serif" letter-spacing="-4">${hero}</text>

  <text x="540" y="${titleY}" text-anchor="middle" fill="#f5f7fb" font-size="66" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${titleText}</text>

  ${subtitleText ? `
  <text x="540" y="${subtitleY}" text-anchor="middle" fill="${accent}" font-size="30" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif" opacity="0.95">${subtitleText}</text>
  ` : ''}

  ${footer ? `
  <text x="540" y="1718" text-anchor="middle" fill="#ffffff" font-size="42" font-weight="700"
    font-family="PingFang SC, Microsoft YaHei, sans-serif">${footer}</text>
  ` : ''}
</svg>`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/generate-shot-images.mjs <projectId> [shotsJsonFile]');
    process.exit(1);
  }

  const projectId = args[0];
  const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
  const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
  const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public/assets', projectId, 'images');

  let promptsData;
  if (args[1] && args[1] !== '-') {
    const content = await fs.promises.readFile(args[1], 'utf8');
    promptsData = JSON.parse(content);
  } else if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    promptsData = JSON.parse(Buffer.concat(chunks).toString());
  } else {
    console.error('No input data. Pass a JSON file or pipe data via stdin.');
    process.exit(1);
  }

  const byShotId = promptsData?.prompts?.byShotId || promptsData?.byShotId || {};
  const visualSystem = typeof promptsData?.visualSystem === 'string' && promptsData.visualSystem.trim()
    ? promptsData.visualSystem.trim()
    : 'poster-hero';
  WIDTH = Math.max(320, Math.round(Number(promptsData?.canvasWidth || promptsData?.renderWidth || DEFAULT_WIDTH) || DEFAULT_WIDTH));
  HEIGHT = Math.max(320, Math.round(Number(promptsData?.canvasHeight || promptsData?.renderHeight || DEFAULT_HEIGHT) || DEFAULT_HEIGHT));
  const shotMetaMap = Object.fromEntries(
    (Array.isArray(promptsData?.shots) ? promptsData.shots : [])
      .filter((item) => item && item.id)
      .map((item) => [item.id, item]),
  );
  const shots = Object.entries(byShotId);

  if (shots.length === 0) {
    emitJobEvent({type: 'result', status: 'done', projectId, total: 0, images: []});
    return;
  }

  await fs.promises.mkdir(OUTPUT_DIR, {recursive: true});

  const generated = [];
  emitJobEvent({type: 'start', total: shots.length, projectId});

  for (const [index, [shotId, item]] of shots.entries()) {
    const safeId = shotId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const mood = typeof item?.mood === 'string' ? item.mood : '';
    const style = item?.style || 'default';
    const shotMeta = shotMetaMap[shotId];
    const resolvedShotIndex = Math.max(
      0,
      Math.round(Number(item?.shotIndex ?? shotMeta?.shotIndex ?? index) || 0),
    );
    const display = resolveShotDisplayContent(item, shotMeta, shotId);

    emitJobEvent({
      type: 'shot-start',
      current: index + 1,
      total: shots.length,
      shotId,
      shotTitle: display.title,
    });

    const svg = buildSvg({
      visualSystem,
      shotIndex: resolvedShotIndex,
      id: shotId,
      title: display.title,
      projectTitle: promptsData?.title || projectId,
      subtitle: display.subtitle,
      visualSummary: display.visualSummary,
      visualFocus: display.visualFocus,
      comparisonSummary: display.comparisonSummary,
      dataHighlights: display.dataHighlights,
      mood,
      style,
      heroMark: display.heroMark,
      topLabel: display.topLabel,
      orbitLabels: display.orbitLabels,
      bottomLine: display.bottomLine,
    });

    const fileName = `${safeId}.svg`;
    const absPath = path.join(OUTPUT_DIR, fileName);
    const publicPath = `/assets/${projectId}/images/${fileName}`;
    await fs.promises.writeFile(absPath, svg, 'utf8');

    const image = {
      shotId,
      path: publicPath,
      format: 'svg',
      motif: pickMotif(`${display.visualSummary} ${display.visualFocus} ${display.comparisonSummary}`, mood),
    };
    generated.push(image);
    emitJobEvent({
      type: 'progress',
      current: index + 1,
      total: shots.length,
      shotId,
      shotTitle: display.title,
      image,
    });
  }

  emitJobEvent({type: 'result', status: 'done', projectId, total: generated.length, images: generated});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
