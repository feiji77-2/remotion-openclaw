// Scene data builder — switch over all 20 family types

const {ULTIMATE_TEMPLATE, ULTIMATE_VISUAL_SYSTEMS, ULTIMATE_DEFAULT_FPS, ULTIMATE_DEFAULT_WIDTH, ULTIMATE_DEFAULT_HEIGHT} = require('./constants.js');
const {safeString, compactText, toNumber, asArray, uniqueList: uList, splitNarrationUnits} = require('./text-utils.js');
const {getDisplayTitle, getDisplaySummary, getDisplayPoints, extractTargetModel, splitListPhrases} = require('./extractors.js');
const {inferAccent, buildOverlay} = require('./builders-utils.js');
const {isCompactDuplicate, compactUniqueItems} = require('./text-utils.js');
const {
  buildFeatureItems,
  buildStepItems,
  buildTimelineLabel,
  buildTimelineItems,
  buildStripHeading,
  buildStripItems,
  inferStripTag,
  buildStripItemDetail,
  buildStripItemLayout,
  inferCompareSideTitles,
  buildCompareRows,
  buildTagItems,
  buildEvidenceCards,
  buildArchitectureNodes,
  buildMetricItems,
  buildDataStreamItems,
  buildMemoryGraphNodes,
  buildPipelineStages,
  buildBenchmarkItems,
  buildSceneSummary,
  buildCodeLines,
  extractNumberTokens,
  extractEvidenceChips,
} = require('./scene-items.js');
const {buildCodeHeading, buildCodeFilename, buildTerminalOutputs} = require('./output-builders.js');
const {selectSceneFamilies, inferSceneFamily, collectSceneFamilyCandidates} = require('./scene-planning.js');
const {semanticArray} = require('./text-utils.js');

const buildSceneData = (family, shot, index) => {
  const accent = inferAccent(shot, index);
  const narrationUnits = splitNarrationUnits(shot?.narration);
  const displayTitle = getDisplayTitle(shot);
  const displaySummary = getDisplaySummary(shot, shot?.visualSummaryZh);
  const primaryText = narrationUnits[0] || displayTitle || shot?.narration || shot?.level || shot?.type || `Scene ${index + 1}`;
  const secondaryText = narrationUnits.slice(1).join('，') || displaySummary || '';
  const title = compactText(primaryText, 28);
  const subtitle = compactText(displaySummary, 72);
  const summary = buildSceneSummary(shot, primaryText, 44);
  const keywords = uList(
    [
      ...getDisplayPoints(shot),
      ...narrationUnits,
    ],
    3,
  );
  const points = uList(
    [
      ...getDisplayPoints(shot),
      ...narrationUnits.slice(1),
    ],
    4,
  );
  const metricItems = buildMetricItems(shot);
  const timelineItems = buildTimelineItems(shot);
  const compareRows = buildCompareRows(shot);
  const compareTitles = inferCompareSideTitles(shot);
  const evidenceCards = buildEvidenceCards(shot);
  const architectureNodes = buildArchitectureNodes(shot);
  const tagItems = buildTagItems(shot);
  const dataStreamItems = buildDataStreamItems(shot);
  const memoryGraphNodes = buildMemoryGraphNodes(shot);
  const pipelineStages = buildPipelineStages(shot);
  const benchmarkItems = buildBenchmarkItems(shot);

  switch (family) {
    case 'hero':
      return {
        kicker: '',
        title,
        subtitle: compactText(secondaryText, 94),
        badge: '',
        accent,
        avatarLabel: '',
        highlightedWord: (() => {
          const keywordModel = extractTargetModel(`${safeString(shot?.narration)} ${displayTitle}`);
          if (keywordModel) return keywordModel.toLowerCase();
          const {extractAsciiPhrases} = require('./extractors.js');
          const asciiPhrase = extractAsciiPhrases(`${safeString(shot?.narration)} ${displayTitle}`).find((item) => item.length >= 4);
          if (asciiPhrase) return asciiPhrase.toLowerCase();
          const {splitTitleTokens} = require('./extractors.js');
          const tokens = splitTitleTokens(primaryText);
          const longToken = tokens.find((item) => item.length >= 4);
          return safeString(longToken || tokens[0] || '');
        })(),
        brandLabel: extractTargetModel(`${safeString(shot?.narration)} ${displayTitle}`) || '',
      };
    case 'focus':
      return {
        eyebrow: '',
        keyword: compactText(primaryText, 18),
        question: compactText(narrationUnits[1] || primaryText, 28),
        description: compactText(secondaryText, 88),
        accent,
        diagram: /对比|parallel|系统|loop|闭环/.test(`${shot?.narration || ''} ${displayTitle || ''}`.toLowerCase()) ? 'rings' : 'framing',
      };
    case 'feature-rail':
      return {
        kicker: '',
        heading: (() => {
          const {buildFeatureRailHeading} = require('./scene-items.js');
          return buildFeatureRailHeading(shot, title);
        })(),
        items: buildFeatureItems(shot),
      };
    case 'number-strip': {
      const displayItems = buildStripItems(shot, summary);
      const numericCount = toNumber(extractNumberTokens(title)[0], 0);
      return {
        count: String(Math.max(2, displayItems.length || points.length || numericCount || 2)),
        heading: buildStripHeading(primaryText, title),
        summary,
        items: displayItems.length > 0
          ? displayItems
          : [
              {
                label: compactText(primaryText, 16),
                tag: inferStripTag(primaryText, 0),
                accent,
                chips: extractEvidenceChips(primaryText),
                detail: buildStripItemDetail(primaryText),
                layout: 'regular',
              },
              {
                label: compactText(secondaryText, 18),
                detail: buildStripItemDetail(secondaryText),
                chips: extractEvidenceChips(secondaryText),
                tag: inferStripTag(secondaryText, 1),
                accent: inferAccent(shot, index + 1),
                layout: buildStripItemLayout(secondaryText, 1),
              },
            ],
        accent,
      };
    }
    case 'step-flow':
      return {
        heading: title,
        steps: buildStepItems(shot),
      };
    case 'timeline':
      return {
        heading: title,
        summary,
        items: timelineItems.length > 0
          ? timelineItems
          : [{label: '节点 1', title: compactText(primaryText, 24), detail: compactText(secondaryText, 40), icon: '', accent}],
        accent,
      };
    case 'compare-board':
      return {
        heading: title,
        summary,
        leftTitle: compareTitles.leftTitle,
        rightTitle: compareTitles.rightTitle,
        leftEyebrow: '',
        rightEyebrow: '',
        rows: compareRows.length > 0
          ? compareRows
          : [{label: compactText(displayTitle || '核心差异', 16), left: compactText(primaryText, 20), right: compactText(secondaryText || summary || primaryText, 20), accent}],
        leftAccent: 'red',
        rightAccent: 'green',
      };
    case 'terminal':
      return {
        heading: title,
        windowTitle: '',
        command: compactText(primaryText, 48),
        outputs: buildTerminalOutputs(shot),
        note: compactText(secondaryText, 72),
        accent,
      };
    case 'evidence-wall':
      return {
        heading: title,
        summary,
        cards: evidenceCards.length > 0
          ? evidenceCards
          : [{source: '证据 1', quote: compactText(primaryText, 44), detail: compactText(secondaryText, 40), chips: extractEvidenceChips(primaryText), icon: '', accent}],
        accent: 'yellow',
      };
    case 'architecture-map':
      return {
        heading: title,
        centerTitle: compactText(displayTitle || primaryText, 22),
        centerDetail: summary || compactText(secondaryText, 52),
        nodes: architectureNodes.length > 0
          ? architectureNodes
          : [{label: compactText(primaryText, 18), detail: compactText(secondaryText, 28), icon: '', accent}],
        accent,
        layout: architectureNodes.length >= 5 ? 'radial' : 'stack',
      };
    case 'tag-matrix':
      return {
        heading: title,
        tabs: [],
        activeTab: '',
        items: buildTagItems(shot),
      };
    case 'code': {
      const codeResult = buildCodeLines(shot);
      return {
        heading: codeResult.heading,
        filename: codeResult.filename,
        lines: codeResult.lines,
        highlightLine: 2,
        footer: codeResult.footer,
        accent,
      };
    }
    case 'metrics':
      return {
        heading: title,
        summary,
        layout: 'bars',
        items: metricItems.length > 0
          ? metricItems
          : [{label: compactText(keywords[0] || primaryText, 16), value: compactText(points[0] || secondaryText || primaryText, 18), ratio: 0.82, accent}],
      };
    case 'data-stream':
      return {
        heading: title,
        summary,
        items: dataStreamItems.length > 0
          ? dataStreamItems
          : [{label: compactText(keywords[0] || primaryText, 16), value: extractNumberTokens(primaryText)[0] || '92%', detail: compactText(secondaryText, 34), trend: 'up', accent}],
        accent,
      };
    case 'memory-graph':
      return {
        heading: title,
        summary,
        centerTitle: compactText(displayTitle || primaryText, 22),
        centerDetail: summary || compactText(secondaryText, 52),
        nodes: memoryGraphNodes.length > 0
          ? memoryGraphNodes
          : [{label: compactText(primaryText, 18), detail: compactText(secondaryText, 28), icon: '', accent}],
        accent,
      };
    case 'pipeline-flow':
      return {
        heading: title,
        summary,
        stages: pipelineStages.length > 0
          ? pipelineStages
          : [{label: compactText(primaryText, 18), detail: compactText(secondaryText, 28), icon: '', accent}],
        accent,
      };
    case 'benchmark-chart':
      return {
        heading: title,
        summary,
        primaryLabel: compareTitles.rightTitle || extractTargetModel(textFromShot(shot)) || 'Current',
        secondaryLabel: compareTitles.leftTitle || 'Baseline',
        items: benchmarkItems.length > 0
          ? benchmarkItems
          : [{label: compactText(primaryText, 18), primaryValue: extractNumberTokens(primaryText)[0] || '92%', secondaryValue: '68%', primaryRatio: 0.92, secondaryRatio: 0.68, accent}],
        accent: 'yellow',
      };
    case 'quote-highlight':
      return {
        heading: compactText(displayTitle || '关键判断', 18),
        quote: compactText(primaryText || shot?.narration || displayTitle, 72),
        attribution: compactText(summary || secondaryText, 44),
        tags: tagItems.slice(0, 3),
        accent,
      };
    case 'glossary-term':
      return {
        heading: compactText(displayTitle || '术语解释', 18),
        term: compactText(displayTitle || primaryText, 18),
        pronunciation: '',
        definition: compactText(summary || secondaryText || shot?.narration, 88),
        related: tagItems.slice(0, 4),
        accent,
      };
    case 'cta':
      {
        const questionLine = narrationUnits.find((item) => /[？?]/.test(item) || /哪个|怎么选|怎么看|值不值/.test(item));
        const sourceLine = narrationUnits[0] || shot?.narration || displayTitle || '';
        const highlights = compactUniqueItems(
          [
            ...splitListPhrases(sourceLine),
            ...getDisplayPoints(shot),
          ].filter((item) => !/[？?]/.test(item)),
          16,
          3,
        );
        const supportText = compactText(
          uList(
            [
              ...narrationUnits.filter((item) => item !== sourceLine && item !== questionLine),
              ...getDisplayPoints(shot).filter(
                (item) => !highlights.some((entry) => isCompactDuplicate(entry, item))
                  && !isCompactDuplicate(item, questionLine),
              ),
            ],
            3,
          ).join('，'),
          40,
        );
        return {
          heading: compactText(questionLine || '你最看重哪个', 18),
          subtitle: supportText || compactText(secondaryText, 88),
          searchLabel: '',
          badge: '',
          highlights,
        };
      }
    default:
      return {
        eyebrow: '',
        keyword: compactText(primaryText, 18),
        question: title,
        description: compactText(secondaryText, 88),
        accent,
        diagram: 'framing',
      };
  }
};

function textFromShot(shot) {
  return `${getDisplayTitle(shot)} ${safeString(shot?.narration)} ${safeString(shot?.visualSummaryZh)} ${safeString(shot?.visualFocusZh)} ${safeString(shot?.type)} ${safeString(shot?.level)}`.toLowerCase();
}

function resolveSceneMediaSrc(family, shot) {
  const mediaSrc = safeString(shot?.imageUrl);
  return mediaSrc || null;
}

function isUltimateProject(project) {
  const explicitTemplate = safeString(project?.template || project?.renderTemplate).toLowerCase();
  const visualSystem = safeString(project?.visualSystem).toLowerCase();
  const width = toNumber(project?.render?.width ?? project?.renderWidth, 0);
  const height = toNumber(project?.render?.height ?? project?.renderHeight, 0);

  if (explicitTemplate) {
    return explicitTemplate === ULTIMATE_TEMPLATE;
  }

  if (ULTIMATE_VISUAL_SYSTEMS.has(visualSystem)) {
    return true;
  }

  return width >= height && width >= 1600;
}

function buildUltimateProjectConfig(project) {
  const fps = Math.max(1, Math.round(toNumber(project?.render?.fps ?? project?.renderFps, ULTIMATE_DEFAULT_FPS)));
  const width = Math.max(320, Math.round(toNumber(project?.render?.width ?? project?.renderWidth, ULTIMATE_DEFAULT_WIDTH)));
  const height = Math.max(320, Math.round(toNumber(project?.render?.height ?? project?.renderHeight, ULTIMATE_DEFAULT_HEIGHT)));
  const shots = asArray(project?.shots);
  const overlay = buildOverlay(project, width, height);
  const title = safeString(project?.title) || safeString(project?.projectId) || 'Ultimate Project';
  const selectedFamilies = selectSceneFamilies(shots);

  return {
    title,
    defaultPlatformOverlay: overlay,
    defaultTransition: {
      preset: width >= height ? 'lift' : 'fade',
      durationInFrames: 12,
    },
    scenes: shots.map((shot, index) => {
      const family = selectedFamilies[index] || inferSceneFamily(shot, index, shots.length, selectedFamilies[index - 1] || '');
      const accent = inferAccent(shot, index);

      return {
        id: safeString(shot?.id) || `shot-${String(index + 1).padStart(2, '0')}`,
        family,
        iconPack: semanticArray(shot?.iconPack, 6),
        mediaSrc: resolveSceneMediaSrc(family, shot),
        subtitle: compactText(getDisplaySummary(shot, shot?.visualSummaryZh || shot?.visualFocusZh), 72),
        durationInFrames: (() => {
          const {normalizeDurationInFrames} = require('./builders-utils.js');
          return normalizeDurationInFrames(shot, fps);
        })(),
        warm: /warm|里程碑|升级|结论|发布|收束/.test(`${safeString(shot?.style)} ${safeString(shot?.mood)} ${getDisplayTitle(shot)}`.toLowerCase()),
        showGrid: false,
        transition: index === 0 ? {preset: 'flash', durationInFrames: 14} : undefined,
        data: buildSceneData(family, shot, index),
      };
    }),
  };
}

function buildUltimateRenderProps(project) {
  const fps = Math.max(1, Math.round(toNumber(project?.render?.fps ?? project?.renderFps, ULTIMATE_DEFAULT_FPS)));
  const width = Math.max(320, Math.round(toNumber(project?.render?.width ?? project?.renderWidth, ULTIMATE_DEFAULT_WIDTH)));
  const height = Math.max(320, Math.round(toNumber(project?.render?.height ?? project?.renderHeight, ULTIMATE_DEFAULT_HEIGHT)));

  return {
    compositionId: 'UltimateSceneTemplate',
    renderTemplate: ULTIMATE_TEMPLATE,
    template: ULTIMATE_TEMPLATE,
    projectId: safeString(project?.projectId) || 'ultimate-project',
    visualSystem: safeString(project?.visualSystem) || 'ultimate-1080p',
    renderFps: fps,
    renderWidth: width,
    renderHeight: height,
    voiceFile: safeString(project?.voiceFile) || null,
    audioSegments: Array.isArray(project?.audioSegments) ? project.audioSegments : null,
    subtitleData: Array.isArray(project?.subtitleData) ? project.subtitleData : null,
    config: buildUltimateProjectConfig({
      ...project,
      render: {
        ...(project?.render && typeof project.render === 'object' ? project.render : {}),
        fps,
        width,
        height,
      },
    }),
  };
}

module.exports = {
  buildSceneData,
  isUltimateProject,
  buildUltimateProjectConfig,
  buildUltimateRenderProps,
};