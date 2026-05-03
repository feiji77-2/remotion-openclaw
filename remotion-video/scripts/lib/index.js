// Public API — re-exports all modules from ultimate-project-adapter.js
// Consumer code should import from here rather than reaching into sub-modules

const constants = require('./constants.js');
const textUtils = require('./text-utils.js');
const extractors = require('./extractors.js');
const outputBuilders = require('./output-builders.js');
const buildersUtils = require('./builders-utils.js');
const sceneItems = require('./scene-items.js');
const scenePlanning = require('./scene-planning.js');
const sceneData = require('./scene-data.js');

module.exports = {
  // From constants.js
  ULTIMATE_TEMPLATE: constants.ULTIMATE_TEMPLATE,
  ULTIMATE_VISUAL_SYSTEMS: constants.ULTIMATE_VISUAL_SYSTEMS,
  ULTIMATE_DEFAULT_FPS: constants.ULTIMATE_DEFAULT_FPS,
  ULTIMATE_DEFAULT_WIDTH: constants.ULTIMATE_DEFAULT_WIDTH,
  ULTIMATE_DEFAULT_HEIGHT: constants.ULTIMATE_DEFAULT_HEIGHT,
  ULTIMATE_SCENE_FAMILIES: constants.ULTIMATE_SCENE_FAMILIES,
  ACCENT_ROTATION: constants.ACCENT_ROTATION,
  // From text-utils.js
  safeString: textUtils.safeString,
  toNumber: textUtils.toNumber,
  compactText: textUtils.compactText,
  compactSimilarityKey: textUtils.compactSimilarityKey,
  isCompactDuplicate: textUtils.isCompactDuplicate,
  isCompactDuplicateByKey: textUtils.isCompactDuplicateByKey,
  compactUniqueItems: textUtils.compactUniqueItems,
  asArray: textUtils.asArray,
  isPlaceholderText: textUtils.isPlaceholderText,
  uniqueList: textUtils.uniqueList,
  semanticArray: textUtils.semanticArray,
  splitTextUnits: textUtils.splitTextUnits,
  splitNarrationUnits: textUtils.splitNarrationUnits,
  // From extractors.js
  getDisplayTitle: extractors.getDisplayTitle,
  getDisplaySummary: extractors.getDisplaySummary,
  getDisplayPoints: extractors.getDisplayPoints,
  buildHeroHighlightWord: extractors.buildHeroHighlightWord,
  buildFeatureRailHeading: extractors.buildFeatureRailHeading,
  splitTitleTokens: extractors.splitTitleTokens,
  splitListPhrases: extractors.splitListPhrases,
  extractModelTokens: extractors.extractModelTokens,
  extractAsciiPhrases: extractors.extractAsciiPhrases,
  normalizeEvidenceChip: extractors.normalizeEvidenceChip,
  extractEvidenceChips: extractors.extractEvidenceChips,
  extractTargetModel: extractors.extractTargetModel,
  // From output-builders.js
  FEATURE_RAIL_HEADING_RULES: outputBuilders.FEATURE_RAIL_HEADING_RULES,
  buildCodeHeading: outputBuilders.buildCodeHeading,
  buildCodeFilename: outputBuilders.buildCodeFilename,
  buildTerminalOutputs: outputBuilders.buildTerminalOutputs,
  // From builders-utils.js
  inferAccent: buildersUtils.inferAccent,
  buildOverlay: buildersUtils.buildOverlay,
  normalizeDurationInFrames: buildersUtils.normalizeDurationInFrames,
  collectListTokens: buildersUtils.collectListTokens,
  inferManualGlyph: buildersUtils.inferManualGlyph,
  // From scene-items.js
  buildFeatureItems: sceneItems.buildFeatureItems,
  buildStepItems: sceneItems.buildStepItems,
  buildTimelineLabel: sceneItems.buildTimelineLabel,
  buildStripHeading: sceneItems.buildStripHeading,
  buildStripItemLabel: sceneItems.buildStripItemLabel,
  buildStripItemDetail: sceneItems.buildStripItemDetail,
  buildStripItemLayout: sceneItems.buildStripItemLayout,
  inferStripTag: sceneItems.inferStripTag,
  buildStripItems: sceneItems.buildStripItems,
  inferCompareSideTitles: sceneItems.inferCompareSideTitles,
  buildCompareRows: sceneItems.buildCompareRows,
  buildTagItems: sceneItems.buildTagItems,
  buildEvidenceCards: sceneItems.buildEvidenceCards,
  buildArchitectureNodes: sceneItems.buildArchitectureNodes,
  inferMetricLabel: sceneItems.inferMetricLabel,
  metricPriority: sceneItems.metricPriority,
  buildMetricItems: sceneItems.buildMetricItems,
  inferRatioFromText: sceneItems.inferRatioFromText,
  buildDataStreamItems: sceneItems.buildDataStreamItems,
  buildMemoryGraphNodes: sceneItems.buildMemoryGraphNodes,
  buildPipelineStages: sceneItems.buildPipelineStages,
  buildBenchmarkItems: sceneItems.buildBenchmarkItems,
  buildSceneSummary: sceneItems.buildSceneSummary,
  buildCodeLines: sceneItems.buildCodeLines,
  // From scene-planning.js
  getRhythmLayer: scenePlanning.getRhythmLayer,
  collectSceneFamilyCandidates: scenePlanning.collectSceneFamilyCandidates,
  inferSceneFamily: scenePlanning.inferSceneFamily,
  compareFamilyPlans: scenePlanning.compareFamilyPlans,
  selectSceneFamilies: scenePlanning.selectSceneFamilies,
  // From scene-data.js (main entry points)
  buildSceneData: sceneData.buildSceneData,
  isUltimateProject: sceneData.isUltimateProject,
  buildUltimateProjectConfig: sceneData.buildUltimateProjectConfig,
  buildUltimateRenderProps: sceneData.buildUltimateRenderProps,
};

// ESM default export for MJS compatibility
module.exports.default = module.exports;