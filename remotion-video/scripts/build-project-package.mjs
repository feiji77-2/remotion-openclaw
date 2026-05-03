#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import ultimateAdapter from './lib/index.js';

const DEFAULT_FPS = 30;
const {
  ULTIMATE_TEMPLATE,
  ULTIMATE_DEFAULT_WIDTH,
  ULTIMATE_DEFAULT_HEIGHT,
  isUltimateProject,
  buildUltimateRenderProps,
} = ultimateAdapter.default;

const loadJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const sanitizeText = (value) => String(value || '').trim();
const resolvePackageVersion = (project) => {
  return sanitizeText(project.packageVersion || project.version || project?.render?.packageVersion);
};
const sanitizeListItem = (value) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return sanitizeText(value);
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  return sanitizeText(
    value.label
    || value.value
    || value.text
    || value.title
    || value.name
    || value.point
    || value.fact
    || value.detail
    || value.source
    || '',
  );
};

const PLANNER_LIKE_TITLE_RE = /^(?:让(?:观众|用户|程序员|开发者|团队|行业观察者|决策者)|本shot|本段|收尾互动(?:\s*·\s*\d+)?|中段|开场|结尾|镜头\s*\d+|场景\s*\d+|Scene\s*\d+)/iu;

const isPlannerLikeTitle = (value) => {
  const text = sanitizeText(value);
  return !!text && (PLANNER_LIKE_TITLE_RE.test(text) || /本shot围绕/u.test(text));
};

const splitTextUnits = (value) => {
  return Array.from(new Set(
    sanitizeText(value)
      .replace(/\s+/g, ' ')
      .split(/[。！？!?\n]|(?<=，)|(?<=；)|(?<=：)|(?<=,)|(?<=;)|(?<=:)/u)
      .map((item) => item.replace(/^[，；：,;:\-\s]+|[，；：,;:\-\s]+$/g, '').trim())
      .filter(Boolean),
  ));
};

const buildDisplayTitle = (narration, fallbackTitle, index) => {
  const rawTitle = sanitizeText(fallbackTitle);

  if (rawTitle && !isPlannerLikeTitle(rawTitle)) {
    return rawTitle;
  }

  return splitTextUnits(narration)[0] || sanitizeText(narration) || rawTitle || `镜头 ${index + 1}`;
};

const buildDisplayPoints = (narration, fallbackPoints) => {
  const narrationUnits = splitTextUnits(narration);
  const normalizedFallback = Array.isArray(fallbackPoints)
    ? fallbackPoints.map((item) => sanitizeListItem(item)).filter(Boolean)
    : [];

  return Array.from(new Set([...narrationUnits, ...normalizedFallback])).slice(0, 10);
};

const resolveVisualSystem = (project, template) => {
  void template;
  const value = sanitizeText(project.visualSystem);
  return value || 'ultimate-1080p';
};

const resolveTemplate = (project) => {
  const explicitTemplate = sanitizeText(project.template).toLowerCase();
  if (explicitTemplate && explicitTemplate !== ULTIMATE_TEMPLATE && !isUltimateProject(project)) {
    return ULTIMATE_TEMPLATE;
  }
  return ULTIMATE_TEMPLATE;
};

const buildPromptBlock = (projectTitle, shot) => {
  const lines = [
    projectTitle ? `主题：${projectTitle}` : '',
    shot.title ? `镜头标题：${shot.title}` : '',
    shot.visualSummaryZh ? `画面内容：${shot.visualSummaryZh}` : '',
    shot.visualFocusZh ? `视觉重点：${shot.visualFocusZh}` : '',
    shot.comparisonSummaryZh ? `对比信息：${shot.comparisonSummaryZh}` : '',
    Array.isArray(shot.dataPoints) && shot.dataPoints.length > 0
      ? `关键信息：${shot.dataPoints.join(' / ')}`
      : '',
  ];

  return lines.filter(Boolean).join('\n');
};

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.error('Usage: node scripts/build-project-package.mjs <project-json-path>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const project = await loadJson(inputPath);
  const projectDir = path.dirname(inputPath);

  const projectId = sanitizeText(project.projectId) || 'test-project';
  const projectTitle = sanitizeText(project.title) || projectId;
  const packageVersion = resolvePackageVersion(project);
  const template = resolveTemplate(project);
  const visualSystem = resolveVisualSystem(project, template);
  const fps = Number.isFinite(project?.render?.fps) ? Math.round(project.render.fps) : DEFAULT_FPS;
  const width = Number.isFinite(project?.render?.width)
    ? Math.round(project.render.width)
    : ULTIMATE_DEFAULT_WIDTH;
  const height = Number.isFinite(project?.render?.height)
    ? Math.round(project.render.height)
    : ULTIMATE_DEFAULT_HEIGHT;
  const shots = Array.isArray(project.shots) ? project.shots : [];

  if (shots.length === 0) {
    console.error(`No shots found in ${inputPath}`);
    process.exit(1);
  }

  const normalizedShots = shots.map((shot, index) => {
    const id = sanitizeText(shot.id) || `shot-${String(index + 1).padStart(2, '0')}`;
    const narration = sanitizeText(shot.narration);
    const title = sanitizeText(shot.title) || `镜头 ${index + 1}`;
    const displayTitle = sanitizeText(shot.displayTitle) || buildDisplayTitle(narration, title, index);
    const displaySummary = sanitizeText(shot.displaySummary) || narration || sanitizeText(shot.visualSummaryZh);
    const displayPoints = Array.isArray(shot.displayPoints) && shot.displayPoints.length > 0
      ? shot.displayPoints.map((item) => sanitizeListItem(item)).filter(Boolean)
      : buildDisplayPoints(narration, shot.dataPoints);
    const durationSeconds = Number.isFinite(shot.durationSeconds)
      ? Math.max(1, Number(shot.durationSeconds))
      : 8;
    const visual = shot.visual && typeof shot.visual === 'object'
      ? {
          description: sanitizeText(shot.visual.description),
          focus: sanitizeText(shot.visual.focus),
        }
      : null;
    const comparisons = Array.isArray(shot.comparisons)
      ? shot.comparisons
        .map((item) => ({
          left: sanitizeText(item?.left),
          right: sanitizeText(item?.right),
        }))
        .filter((item) => item.left || item.right)
      : [];

    return {
      id,
      level: sanitizeText(shot.level),
      type: sanitizeText(shot.type),
      title,
      plannerTitle: sanitizeText(shot.plannerTitle),
      displayTitle,
      displaySummary,
      displayPoints,
      narration,
      durationSeconds,
      promptZh: sanitizeText(shot.promptZh),
      posterMode: typeof shot.posterMode === 'boolean' ? shot.posterMode : visualSystem === 'poster-hero',
      heroMark: sanitizeText(shot.heroMark),
      topLabel: sanitizeText(shot.topLabel),
      orbitLabels: Array.isArray(shot.orbitLabels) ? shot.orbitLabels.map((item) => sanitizeListItem(item)).filter(Boolean) : [],
      bottomLine: sanitizeText(shot.bottomLine),
      visualSummaryZh: sanitizeText(shot.visualSummaryZh),
      visualFocusZh: sanitizeText(shot.visualFocusZh),
      comparisonSummaryZh: sanitizeText(shot.comparisonSummaryZh),
      mood: sanitizeText(shot.mood),
      style: sanitizeText(shot.style),
      iconPack: Array.isArray(shot.iconPack) ? shot.iconPack.map((item) => sanitizeListItem(item)).filter(Boolean) : [],
      visual,
      comparisons,
      keywords: Array.isArray(shot.keywords) ? shot.keywords.map((item) => sanitizeListItem(item)).filter(Boolean) : [],
      dataPoints: Array.isArray(shot.dataPoints) ? shot.dataPoints.map((item) => sanitizeListItem(item)).filter(Boolean) : displayPoints,
      imageUrl: sanitizeText(shot.imageUrl) || null,
    };
  });

  const durationInFrames = normalizedShots.reduce((sum, shot) => {
    return sum + Math.max(1, Math.round(shot.durationSeconds * fps));
  }, 0);

  const imagePrompts = {
    projectId,
    title: projectTitle,
    packageVersion,
    visualSystem,
    canvasWidth: width,
    canvasHeight: height,
    shots: normalizedShots,
    byShotId: Object.fromEntries(
      normalizedShots.map((shot) => [
        shot.id,
        {
          shotTitle: shot.title,
          prompt: buildPromptBlock(projectTitle, shot),
          promptZh: shot.promptZh || shot.visualSummaryZh || shot.narration,
          visualSummaryZh: shot.visualSummaryZh,
          visualFocusZh: shot.visualFocusZh,
          comparisonSummaryZh: shot.comparisonSummaryZh,
          dataHighlightsZh: shot.dataPoints,
          heroMark: sanitizeText(shot.heroMark),
          topLabel: sanitizeText(shot.topLabel),
          orbitLabels: Array.isArray(shot.orbitLabels) ? shot.orbitLabels.map((item) => sanitizeListItem(item)).filter(Boolean) : [],
          bottomLine: sanitizeText(shot.bottomLine),
          mood: shot.mood,
          style: shot.style,
        },
      ]),
    ),
  };

  const imagePromptsPath = path.join(projectDir, 'image-prompts.json');
  const renderPropsPath = path.join(projectDir, 'render-props.json');
  const ultimateConfigPath = path.join(projectDir, 'ultimate-config.json');

  const renderProps = {
    packageVersion,
    ...buildUltimateRenderProps({
      ...project,
      projectId,
      title: projectTitle,
      visualSystem,
      render: {
        ...(project.render && typeof project.render === 'object' ? project.render : {}),
        fps,
        width,
        height,
      },
      shots: normalizedShots,
    }),
  };
  await fs.writeFile(ultimateConfigPath, `${JSON.stringify(renderProps.config, null, 2)}\n`, 'utf8');

  await fs.writeFile(imagePromptsPath, `${JSON.stringify(imagePrompts, null, 2)}\n`, 'utf8');
  await fs.writeFile(renderPropsPath, `${JSON.stringify(renderProps, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${JSON.stringify({
      status: 'ok',
      projectId,
      packageVersion,
      durationInFrames,
      durationSeconds: Number((durationInFrames / fps).toFixed(2)),
      imagePromptsPath,
      renderPropsPath,
      ultimateConfigPath,
      compositionId: renderProps.compositionId || 'UltimateSceneTemplate',
      template,
      shotCount: normalizedShots.length,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
