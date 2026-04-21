#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import ultimateAdapter from './lib/ultimate-project-adapter.js';

const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_VISUAL_SYSTEM = 'poster-hero';
const {
  ULTIMATE_TEMPLATE,
  ULTIMATE_DEFAULT_WIDTH,
  ULTIMATE_DEFAULT_HEIGHT,
  isUltimateProject,
  buildUltimateRenderProps,
} = ultimateAdapter;

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

const resolveVisualSystem = (project, template) => {
  const value = sanitizeText(project.visualSystem);
  if (value) {
    return value;
  }

  return template === ULTIMATE_TEMPLATE ? 'ultimate-1080p' : DEFAULT_VISUAL_SYSTEM;
};

const resolveTemplate = (project) => {
  const explicitTemplate = sanitizeText(project.template);
  if (explicitTemplate) {
    return explicitTemplate;
  }

  if (isUltimateProject(project)) {
    return ULTIMATE_TEMPLATE;
  }

  return sanitizeText(project.visualSystem) === 'poster-hero' ? 'fullscreen' : 'split';
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

const buildHiddenCaptionStyle = (durationInFrames) => ({
  startFrame: 0,
  endFrame: Math.max(1, durationInFrames),
  style: {
    top: '86%',
    left: '140px',
    width: 800,
    height: 80,
    fontSize: 48,
    fontWeight: 700,
    textAlign: 'center',
    color: 'rgba(255,255,255,0)',
    activeColor: 'rgba(255,255,255,0)',
    appearedColor: 'rgba(255,255,255,0)',
    activeFillColor: 'transparent',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    textShadow: 'none',
    opacity: 0,
    transform: 'none',
  },
});

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
    : (template === ULTIMATE_TEMPLATE ? ULTIMATE_DEFAULT_WIDTH : DEFAULT_WIDTH);
  const height = Number.isFinite(project?.render?.height)
    ? Math.round(project.render.height)
    : (template === ULTIMATE_TEMPLATE ? ULTIMATE_DEFAULT_HEIGHT : DEFAULT_HEIGHT);
  const shots = Array.isArray(project.shots) ? project.shots : [];

  if (shots.length === 0) {
    console.error(`No shots found in ${inputPath}`);
    process.exit(1);
  }

  const normalizedShots = shots.map((shot, index) => {
    const id = sanitizeText(shot.id) || `shot-${String(index + 1).padStart(2, '0')}`;
    const title = sanitizeText(shot.title) || `镜头 ${index + 1}`;
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
      narration: sanitizeText(shot.narration),
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
      dataPoints: Array.isArray(shot.dataPoints) ? shot.dataPoints.map((item) => sanitizeListItem(item)).filter(Boolean) : [],
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

  let renderProps = {
    template,
    projectId,
    packageVersion,
    visualSystem,
    subtitleStyle: 'caption',
    typewriter: false,
    renderFps: fps,
    renderWidth: width,
    renderHeight: height,
    durationInFrames,
    captionStyleSegments: [buildHiddenCaptionStyle(durationInFrames)],
    shots: normalizedShots,
  };

  let resolvedUltimateConfigPath = null;

  if (template === ULTIMATE_TEMPLATE) {
    renderProps = {
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
    resolvedUltimateConfigPath = ultimateConfigPath;
  }

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
      ultimateConfigPath: resolvedUltimateConfigPath,
      compositionId: renderProps.compositionId || 'OpenClawVideo',
      template,
      shotCount: normalizedShots.length,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
