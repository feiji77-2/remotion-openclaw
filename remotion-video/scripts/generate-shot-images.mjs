#!/usr/bin/env node
/**
 * Shot Image Generator
 * 根据 Step 5 的中文展示字段生成 9:16 SVG 分镜图，并在 stdout 输出进度事件。
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const WIDTH = 1080;
const HEIGHT = 1920;

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
  return `对比关系：${truncate(first.left || '左侧方案', 16)} vs ${truncate(first.right || '右侧方案', 16)}`;
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
  const subtitle = truncate(visualFocus || item?.mood || shotMeta?.level || '', 32);
  const contentText = [
    `画面内容：${truncate(visualSummary, 72)}`,
    visualFocus ? `视觉重点：${truncate(visualFocus, 48)}` : '',
    dataHighlights.length > 0 ? `关键信息：${dataHighlights.map((entry) => truncate(entry, 18)).join(' / ')}` : '',
    comparisonSummary,
  ].filter(Boolean).join('\n');

  return {
    title,
    subtitle,
    visualSummary,
    visualFocus,
    comparisonSummary,
    contentText,
  };
}

function pickMotif(prompt, mood) {
  const combined = `${prompt || ''} ${mood || ''}`.toLowerCase();
  if (/timeline|步骤|流程|链路|step|flow|process/i.test(combined)) return 'timeline';
  if (/层|结构|金字塔|拆解|layer|structure|hierarchy/i.test(combined)) return 'pyramid';
  if (/网络|连接|节点|关系|network|connect|node/i.test(combined)) return 'network';
  if (/数据|统计|图表|增长|data|chart|percent|rise/i.test(combined)) return 'data';
  if (/聚焦|特写|光|spotlight|focus|highlight|beam/i.test(combined)) return 'spotlight';
  if (/对比|比较|之前之后|before|after|compare/i.test(combined)) return 'flow';
  if (/抽象|艺术|创意|mood|art|abstract|creative/i.test(combined)) return 'abstract';
  if (/开场|引入|问题|悬念|hook|open|question|curiosity/i.test(combined)) return 'cinematic';
  return 'cinematic';
}

function extractVisualKeywords(prompt) {
  return String(prompt || '')
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(-5);
}

function summarizePromptLines(prompt) {
  return String(prompt || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => truncate(line, 30));
}

function buildSvg({id, title, subtitle, prompt, mood, style}) {
  const motifKey = pickMotif(prompt, mood);
  const motifFn = MOTIFS[motifKey] || MOTIFS.cinematic;
  const accent = style === 'warm' ? '#f59e0b' : style === 'cool' ? '#06b6d4' : '#8b5cf6';
  const titleText = esc(truncate(title || id || '镜头', 30));
  const subtitleText = esc(truncate(subtitle || '', 60));
  const keywords = extractVisualKeywords(prompt);
  const promptLines = summarizePromptLines(prompt);
  const motifShapes = motifFn(accent);

  const bgGrad = style === 'warm'
    ? `<stop offset="0%" stop-color="#1a0f05"/><stop offset="100%" stop-color="#0f0a05"/>`
    : style === 'cool'
      ? `<stop offset="0%" stop-color="#050f1a"/><stop offset="100%" stop-color="#050a0f"/>`
      : `<stop offset="0%" stop-color="#09070d"/><stop offset="60%" stop-color="#120a1f"/><stop offset="100%" stop-color="#09070d"/>`;

  const keywordTags = keywords.length > 0
    ? keywords.map((kw, index) => `
        <rect x="${120 + index * 160}" y="${HEIGHT - 100}" width="${Math.min(kw.length * 30 + 24, 155)}" height="48" rx="24"
          fill="${accent}" opacity="${0.25 - index * 0.04}"/>
        <text x="${132 + index * 160}" y="${HEIGHT - 70}" fill="${accent}" font-size="22" font-weight="600"
          font-family="PingFang SC, Microsoft YaHei, sans-serif" opacity="${1 - index * 0.15}">#${esc(kw)}</text>
      `).join('')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      ${bgGrad}
    </linearGradient>
    <radialGradient id="glow-main" cx="30%" cy="25%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-second" cx="75%" cy="80%" r="45%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.06"/></feComponentTransfer>
    </filter>
    <filter id="card-glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow-main)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow-second)"/>
  ${motifShapes}

  <g filter="url(#card-glow)">
    <rect x="72" y="100" width="936" height="240" rx="32"
      fill="rgba(9,7,13,0.55)" stroke="${accent}" stroke-opacity="0.4" stroke-width="2"/>
  </g>

  <text x="120" y="210" fill="#ffffff" font-size="58" font-weight="800"
    font-family="PingFang SC, Microsoft YaHei, sans-serif"
    letter-spacing="-1">${titleText}</text>

  ${subtitleText ? `
  <text x="120" y="290" fill="${accent}" font-size="32" font-weight="600"
    font-family="PingFang SC, Microsoft YaHei, sans-serif"
    opacity="0.9">${subtitleText}</text>
  ` : ''}

  <rect x="72" y="1320" width="936" height="420" rx="28" fill="rgba(9,7,13,0.48)" stroke="rgba(255,255,255,0.08)"/>
  ${promptLines.map((line, index) => `
    <rect x="110" y="${1370 + index * 112}" width="860" height="82" rx="18" fill="rgba(255,255,255,0.04)"/>
    <text x="140" y="${1424 + index * 112}" fill="#e9ddff" font-size="28" font-weight="600"
      font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(line)}</text>
  `).join('')}

  <text x="120" y="${HEIGHT - 120}" fill="rgba(255,255,255,0.5)" font-size="24"
    font-family="PingFang SC, SFMono-Regular, monospace">镜头 ${esc(id)}</text>

  ${keywordTags}
  <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#noise)" opacity="0.9"/>
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
    const display = resolveShotDisplayContent(item, shotMetaMap[shotId], shotId);

    emitJobEvent({
      type: 'shot-start',
      current: index + 1,
      total: shots.length,
      shotId,
      shotTitle: display.title,
    });

    const svg = buildSvg({
      id: shotId,
      title: display.title,
      subtitle: display.subtitle,
      prompt: display.contentText,
      mood,
      style,
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
