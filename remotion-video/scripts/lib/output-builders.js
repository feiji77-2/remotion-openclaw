// Output builders — code headings, filenames, terminal outputs, feature rail heading rules

const {safeString, compactText} = require('./text-utils.js');

const FEATURE_RAIL_HEADING_RULES = [
  {
    patterns: [/不是在回答问题/u, /做完/u],
    matchAll: true,
    replacement: '它不是回答问题，它是在替你做完',
  },
  {
    patterns: [/输入含糊/u, /输出/u],
    matchAll: true,
    replacement: '输入很糊，输出直接可跑',
  },
  {
    patterns: [/完整(?:的)?可执行方案/u],
    matchAll: false,
    replacement: '它直接给出完整可执行方案',
  },
];

const buildCodeHeading = (shot, primaryText, fallbackTitle = '') => {
  const text = safeString(primaryText);
  const fullText = textFromShot(shot);

  if (/(benchmark|bench|exam|基准|跑分|gpt-\d)/.test(fullText)) {
    return 'Benchmark Snapshot';
  }
  if (/(开发者|团队|案例|想象一下|workflow|agent|部署|测试)/.test(fullText)) {
    return 'Workflow After K2.6';
  }
  if (/(json|schema|config|配置|脚本|接口)/.test(fullText)) {
    return 'Config Snapshot';
  }
  return compactText(text || fallbackTitle || 'Execution Snapshot', 20);
};

const buildCodeFilename = (shot) => {
  const fullText = textFromShot(shot);
  if (/(benchmark|bench|exam|基准|跑分|gpt-\d)/.test(fullText)) {
    return 'benchmark-facts.json';
  }
  if (/(开发者|团队|案例|想象一下|workflow|agent|部署|测试)/.test(fullText)) {
    return 'workflow-facts.json';
  }
  if (/(json|schema|config|配置|脚本|接口)/.test(fullText)) {
    return 'config-facts.json';
  }
  return 'scene-facts.json';
};

const textFromShot = (shot) => {
  const {safeString: sStr} = require('./text-utils.js');
  return `${sStr(shot?.displayTitle || shot?.title)} ${sStr(shot?.narration)} ${sStr(shot?.visualSummaryZh)} ${sStr(shot?.visualFocusZh)} ${sStr(shot?.type)} ${sStr(shot?.level)}`.toLowerCase();
};

const buildTerminalOutputs = (shot) => {
  const {uniqueList: uList, splitNarrationUnits: splitNarration} = require('./text-utils.js');
  const {getDisplayPoints, getDisplaySummary, getDisplayTitle} = require('./extractors.js');
  const items = uList(
    [
      ...splitNarration(shot?.narration),
      ...getDisplayPoints(shot),
    ],
    4,
  );
  const fallbackItems = items.length > 0
    ? items
    : splitNarration(shot?.narration || getDisplaySummary(shot, shot?.visualSummaryZh) || getDisplayTitle(shot) || 'scene ready');
  return fallbackItems.map((item) => `> ${compactText(item, 48)}`);
};

module.exports = {
  FEATURE_RAIL_HEADING_RULES,
  buildCodeHeading,
  buildCodeFilename,
  buildTerminalOutputs,
  textFromShot,
};