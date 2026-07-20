#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'examples', 'swiss-skill-spoken-v4-portrait.json');
const OUTPUT = resolve(ROOT, 'examples', 'swiss-skill-spoken-v5-workbench.json');
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

const LENS_BY_CAPTION = [
  'source-diff',
  'terminal-run',
  'manifest-resolve',
  'design-inspector',
  'rule-counter',
  'category-index',
  'live-scan',
  'snapshot-compare',
  'repo-signal',
  'direction-picker',
  'style-lock',
  'anchor-map',
  'deny-list',
  'skill-gate',
  'knowledge-vault',
  'catalog-metrics',
  'token-assembly',
  'scenario-switch',
  'blank-audit',
  'brand-pack',
  'brand-style-map',
  'system-graph',
];

const ev = (label, value, source = 'derived', status = 'info') => ({label, value, source, status});
const step = (captionIndex, objective, actionLabel, data) => ({
  captionIndex,
  lens: LENS_BY_CAPTION[captionIndex],
  objective,
  actionLabel,
  ...data,
});

const workbenches = new Map([
  [0, {kind: 'ide-terminal', title: 'design-agent / output diagnosis', context: 'baseline → manifest → constrained surface', files: ['skills.yml', 'prompt.md', 'src/page.tsx', 'audit.json'], steps: [
    step(0, '记录默认输出，并把“可识别的 AI 模式”落到可检查状态', 'capture baseline', {command: 'inspect output: baseline', file: 'audit.json', before: ['design.source: ai-default', 'direction: unresolved'], after: ['diagnostic.profile: average', 'recognition: immediate'], logs: ['baseline snapshot captured', 'layout signature extracted', 'style ownership unresolved'], evidence: [ev('OUTPUT SOURCE', 'AI DEFAULT', 'script'), ev('RECOGNITION', 'IMMEDIATE', 'script', 'fail'), ev('DESIGN OWNER', 'UNRESOLVED', 'derived', 'fail')]}),
    step(1, '定位默认平均审美的具体界面特征，而不是只给抽象评价', 'inspect defaults', {command: 'audit visual defaults', file: 'src/page.tsx', before: ['theme: purple-gradient', 'layout: centered-stack'], after: ['flag: generic-gradient', 'flag: centered-composition'], logs: ['theme tokens read', 'layout tree inspected', 'two defaults matched'], evidence: [ev('COLOR MODE', 'PURPLE GRADIENT', 'script', 'fail'), ev('LAYOUT MODE', 'CENTERED', 'script', 'fail'), ev('PATTERN COUNT', '2 MATCHED', 'derived', 'fail')]}),
    step(2, '把 Skill 从声明写入生成链，并观察约束是否真正生效', 'resolve manifest', {command: 'resolve skill: frontend-design', file: 'skills.yml', before: ['skills: []', 'design.direction: auto', 'constraints: default'], after: ['skills:', '  - frontend-design', 'design.direction: swiss', 'constraints: skill-defined'], logs: ['manifest detected: skills.yml', 'frontend-design contract loaded', 'generic template path bypassed', 'renderer state rebuilt'], evidence: [ev('SKILL STATE', '1 ACTIVE', 'script', 'pass'), ev('CONSTRAINT OWNER', 'SKILL CONTRACT', 'derived'), ev('RENDER STATE', 'REBUILT', 'demo', 'pass')]}),
    step(3, '区分“技术实现正确”和“设计语言存在”这两个独立判断', 'inspect design language', {command: 'inspect output: design-language', file: 'audit.json', before: ['build.status: valid', 'design.language: none'], after: ['technology: valid', 'design-language: missing'], logs: ['runtime check passed', 'visual grammar queried', 'stable direction not found'], evidence: [ev('TECHNOLOGY', 'VALID', 'script', 'pass'), ev('DESIGN LANGUAGE', 'MISSING', 'script', 'fail'), ev('ROOT CAUSE', 'NO STABLE DIRECTION', 'derived', 'fail')]}),
  ]}],
  [1, {kind: 'audit-trace', title: 'impeccable / rule registry + live audit', context: 'rule source → matcher → component annotation', files: ['rules/index.ts', 'rules/layout.ts', 'src/Hero.tsx'], steps: [
    step(4, '载入规则注册表，并验证规则数量与分类索引', 'load registry', {target: 'rules/index.ts', file: 'rules/index.ts', after: ['registry.load(manifest)', 'registry.groupBy(category)', 'scanner.attach(registry)', 'return registry.summary()'], logs: ['manifest parsed', '37 rules registered', '8 categories indexed', 'live scanner attached'], evidence: [ev('RULES', '37 LOADED', 'script', 'pass'), ev('CATEGORIES', '8 INDEXED', 'script', 'pass'), ev('SCANNER', 'ATTACHED', 'derived', 'pass')]}),
    step(5, '把规则按八个类别建立可查询索引', 'index categories', {target: 'registry / categories', file: 'rules/index.ts', after: ['visual', 'typography', 'color · layout', 'spacing · hierarchy', 'interaction · accessibility'], logs: ['category keys normalized', 'rule references linked', 'query index committed'], evidence: [ev('CATEGORY COUNT', '8', 'script', 'pass'), ev('INDEX MODE', 'QUERYABLE', 'derived', 'pass'), ev('RULE LINKS', 'CONNECTED', 'demo', 'pass')]}),
    step(6, '扫描当前组件，定位反模式并把诊断绑定回源码', 'inspect component', {target: 'Hero / centered-stack', file: 'src/Hero.tsx', after: ['<Hero data-layout="centered-stack">', '  <Gradient tone="purple" />', '</Hero>', 'diagnostic.bind("layout/center-stack")'], logs: ['component tree captured', 'anti-pattern matcher executed', 'source location resolved', 'preview annotation emitted'], evidence: [ev('MATCH', 'CENTERED STACK', 'derived', 'fail'), ev('SOURCE', 'Hero.tsx', 'demo'), ev('RESULT', 'ANNOTATION VISIBLE', 'derived', 'pass')]}),
    step(7, '对照启用 Skill 前后的同一界面，确认变化来自规则而非随机重绘', 'compare snapshots', {target: 'before / after', file: 'src/Hero.tsx', after: ['before: default composition', 'after: rule-constrained layout', 'diff: structure + hierarchy'], logs: ['baseline loaded', 'constrained output loaded', 'structural diff computed', 'cause linked to registry'], evidence: [ev('RESULT', 'COMPLETELY DIFFERENT', 'script', 'pass'), ev('CAUSE', 'RULE CONSTRAINTS', 'derived'), ev('COMPARISON', 'SAME INPUT', 'demo', 'pass')]}),
  ]}],
  [2, {kind: 'prompt-pipeline', title: 'frontend-design / generation trace', context: 'repository signal → direction gate → constrained output', files: ['registry.meta', 'prompt.input', 'skill.contract', 'output.spec'], steps: [
    step(8, '读取项目可信度信号，再决定是否进入 Skill 解析流程', 'inspect registry', {before: ['repository: frontend-design', 'stars: pending'], logs: ['registry metadata fetched', 'star count normalized', 'package marked selectable'], after: ['repository: frontend-design', 'stars: 22K', 'selection: candidate'], evidence: [ev('REPOSITORY SIGNAL', '22K STAR', 'script', 'pass'), ev('SELECTION', 'CANDIDATE', 'derived'), ev('METADATA', 'RESOLVED', 'demo', 'pass')]}),
    step(9, '展开六种明确方向，让选择发生在生成之前', 'enumerate directions', {before: ['direction: auto'], logs: ['direction registry opened', 'six options enumerated', 'selection required'], after: ['Swiss', 'RAW list', 'Nordic', 'Neo', '+ 2 explicit directions'], evidence: [ev('DIRECTIONS', '6', 'script', 'pass'), ev('DEFAULT AUTO', 'DISABLED', 'derived'), ev('NEXT ACTION', 'SELECT ONE', 'demo')]}),
    step(10, '从候选方向中锁定 Swiss 极简，并保留其他方向作为可追踪备选', 'select direction', {before: ['RAW list', 'Nordic', 'Neo', 'Swiss'], logs: ['candidates scored', 'Swiss selected', 'direction token written'], after: ['design.direction = swiss', 'grid = explicit', 'ornament = restrained'], evidence: [ev('TARGET', 'SWISS', 'script', 'pass'), ev('ALTERNATIVES', 'RAW · NORDIC · NEO', 'script'), ev('STATE', 'LOCKED', 'derived', 'pass')]}),
    step(11, '把审美方向变成持续约束，而不是一次性的风格抽签', 'anchor direction', {before: ['direction: selected', 'memory: transient'], logs: ['anchor created', 'generation constraints bound', 'subsequent surfaces checked'], after: ['direction: swiss', 'anchor: persistent', 'output: consistent'], evidence: [ev('ANCHOR', 'ACTIVE', 'script', 'pass'), ev('OUTPUT MEMORY', 'PERSISTENT', 'derived', 'pass'), ev('RANDOM PICK', 'DISABLED', 'script', 'pass')]}),
    step(12, '在生成前加载反模式清单，并逐项阻断默认模板语言', 'apply deny list', {before: ['Inter font', 'purple gradient', 'centered stack'], logs: ['deny list loaded', 'three patterns matched', 'default route rejected'], after: ['font: requires intent', 'gradient: rejected', 'layout: rejected'], evidence: [ev('ANTI-PATTERNS', '3 SHOWN', 'script', 'fail'), ev('MATCHER', 'ENFORCED', 'derived', 'pass'), ev('DEFAULT ROUTE', 'BLOCKED', 'derived', 'pass')]}),
    step(13, '在生成之前拦截默认模板，把审美方向和反模式约束写入输出规范', 'apply skill gate', {target: 'generation pipeline', before: ['build a landing page', 'design.direction = auto', 'template = default'], logs: ['read aesthetic direction', 'apply anti-pattern list', 'reject generic defaults', 'emit constrained specification'], after: ['design.direction = swiss', 'layout.grid = explicit', 'antiPatterns = enforced', 'output = constrained spec'], evidence: [ev('DEFAULT PATH', 'BYPASSED', 'derived', 'pass'), ev('ANTI-PATTERNS', 'ENFORCED', 'script', 'pass'), ev('DIRECTION', 'ANCHORED', 'script', 'pass')]}),
  ]}],
  [3, {kind: 'design-system-lab', title: 'ux-pro / knowledge + token laboratory', context: 'built-in knowledge → token binding → scenario rules', files: ['library/index.json', 'tokens/system.json', 'a11y/rules.json'], steps: [
    step(14, '确认设计资料来自内置知识库，而不是每次从零搜索', 'resolve built-ins', {after: ['knowledge.source = built-in', 'external.search = skipped', 'library.status = ready'], logs: ['embedded index opened', 'design references resolved', 'external lookup skipped'], evidence: [ev('KNOWLEDGE', 'BUILT-IN', 'script', 'pass'), ev('SEARCH FROM ZERO', 'SKIPPED', 'script', 'pass'), ev('LIBRARY', 'READY', 'derived', 'pass')]}),
    step(15, '读取四组设计知识数据，并保持每个数字的语义归属', 'inspect catalog', {after: ['palettes.byIndustry = 161', 'uiStyle.definitions = 67', 'font.pairings = 57', 'ux.guidelines = 99'], logs: ['catalog opened', 'four collections verified', 'indexes available'], evidence: [ev('PALETTES', '161', 'script', 'pass'), ev('UI · FONT', '67 · 57', 'script', 'pass'), ev('UX PRINCIPLES', '99', 'script', 'pass')]}),
    step(16, '把配色、字体、间距和无障碍规则绑定到同一个可复用界面', 'bind system tokens', {file: 'tokens/system.json', after: ['color.palette = selected', 'typography.scale = bound', 'spacing.rhythm = bound', 'accessibility.rules = included'], logs: ['token sources resolved', 'component bindings updated', 'preview recomputed', 'system check completed'], evidence: [ev('FOUNDATIONS', '4 CONNECTED', 'script', 'pass'), ev('COMPONENTS', 'TOKEN-BOUND', 'derived', 'pass'), ev('ACCESSIBILITY', 'INCLUDED', 'script', 'pass')]}),
    step(17, '让同一套知识库按官网、工具和作品集切换场景规则', 'switch scenario', {after: ['scenario.website = rules + antiPatterns', 'scenario.tool = rules + antiPatterns', 'scenario.portfolio = rules + antiPatterns'], logs: ['scenario selected', 'rule subset loaded', 'anti-pattern subset loaded', 'preview rebound'], evidence: [ev('SCENARIOS', '3 SHOWN', 'script', 'pass'), ev('RULES', 'SCOPED', 'script', 'pass'), ev('ANTI-PATTERNS', 'SCOPED', 'script', 'pass')]}),
  ]}],
  [4, {kind: 'design-system-lab', title: 'cloud-design / brand system laboratory', context: 'blank project → brand pack → industry-aware tokens', files: ['project.tokens.json', 'brand-pack.json', 'components/index.ts'], steps: [
    step(18, '复现从零定义变量和规范仍然缺乏行业感的问题', 'inspect blank project', {after: ['color.variables = manual', 'font.rules = manual', 'component.spec = manual', 'industry.context = missing'], logs: ['new project initialized', 'local variables created', 'industry reference unresolved'], evidence: [ev('SETUP', 'FROM ZERO', 'script', 'fail'), ev('RULES', 'REDEFINED', 'script', 'fail'), ev('INDUSTRY FEEL', 'MISSING', 'script', 'fail')]}),
    step(19, '载入单文件品牌包，并验证品牌系统数量', 'load brand pack', {file: 'brand-pack.json', after: ['brandSystems.count = 68', 'package.files = 1', 'tokenMaps = indexed'], logs: ['brand-pack.json opened', '68 systems indexed', 'token maps linked', 'component presets available'], evidence: [ev('BRAND SYSTEMS', '68', 'script', 'pass'), ev('PACKAGE', '1 FILE', 'script', 'pass'), ev('INDEX', 'QUERYABLE', 'derived', 'pass')]}),
    step(20, '把四个品牌的视觉特征映射到可执行 Token', 'inspect brand styles', {after: ['Stripe → minimal compatibility', 'Linear → engineering aesthetic', 'Vercel → extreme monochrome', 'Recta → precision gradient'], logs: ['four brands selected', 'style descriptors resolved', 'token previews generated'], evidence: [ev('BRANDS', '4 SHOWN', 'script', 'pass'), ev('STYLE MAP', 'TOKENIZED', 'derived', 'pass'), ev('PREVIEW', 'LIVE', 'demo', 'pass')]}),
  ]}],
  [5, {kind: 'architecture-workspace', title: 'design-agent / reusable judgment system', context: 'input → skill → judgment → tokens → renderer → reusable output', files: ['system.graph', 'skills.yml', 'tokens.json'], steps: [
    step(21, '把一次性的审美判断收束成可复用系统，并确认 Skill 在链路中的责任', 'converge system', {after: ['INPUT / product intent', 'SKILL / design contract', 'JUDGMENT / explicit direction', 'TOKENS / reusable language', 'RENDERER / constrained output', 'SYSTEM / repeatable result'], logs: ['intent connected', 'skill contract active', 'judgment encoded', 'tokens reusable', 'output repeatable'], evidence: [ev('DESIGN JUDGMENT', 'REUSABLE', 'script', 'pass'), ev('SKILL', 'CORRECTLY INSTALLED', 'script', 'pass'), ev('AI POSITION', 'EXPLICIT', 'script', 'pass')]}),
  ]}],
]);

let sampleCount = 0;
const scenes = source.scenes.map((scene, sceneIndex) => {
  const workbench = workbenches.get(sceneIndex);
  if (!workbench) return scene;
  sampleCount += workbench.steps.length;
  return {
    ...scene,
    payload: {
      ...scene.payload,
      heroStyle: 'technical-workbench-v2',
      layoutSignature: `portrait:workbench-v2:${workbench.kind}`,
      workbench,
    },
  };
});

if (sampleCount !== 22) throw new Error(`Expected 22 workbench steps, received ${sampleCount}`);

const project = {
  ...source,
  projectId: 'swiss-skill-spoken-v5-workbench',
  title: '技术证据工作台 V2 — 全节拍版',
  scenes,
};

writeFileSync(OUTPUT, `${JSON.stringify(project, null, 2)}\n`);
console.log(`written: ${OUTPUT}`);
console.log(`workbench steps: ${sampleCount}`);
