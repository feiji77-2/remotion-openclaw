import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {productionComponentCatalog} from './lib/semantic-component-resolver.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const propsArg = valueFor('--props', args.find((argument) => !argument.startsWith('--')));
if (!propsArg) throw new Error('[USAGE] node scripts/report-project-components.mjs --props <project.json> [--out <report.json>]');
const propsPath = path.resolve(projectRoot, propsArg);
const project = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
if (!project.visualPlan?.entries?.length) throw new Error('[VISUAL_PLAN_MISSING] project has no component usage plan');

const descriptors = new Map(productionComponentCatalog.components.map((descriptor) => [descriptor.componentId, descriptor]));
const usage = new Map();
const entries = project.visualPlan.entries.map((entry) => {
  const descriptor = descriptors.get(entry.componentId) ?? null;
  usage.set(entry.componentId, (usage.get(entry.componentId) ?? 0) + 1);
  return {
    id: entry.id,
    sceneId: entry.sceneId,
    captionRange: [entry.captionStartIndex, entry.captionEndIndex],
    frameRange: [entry.startFrame, entry.endFrame],
    caption: project.captions.slice(entry.captionStartIndex, entry.captionEndIndex + 1).map((caption) => caption.text).join(''),
    intent: entry.intent.key,
    shotKind: entry.shot.kind,
    componentId: entry.componentId,
    productionReady: Boolean(descriptor?.productionReady),
    resolution: entry.resolution,
    assetIds: entry.assetIds,
    diagnostics: entry.diagnostics,
  };
});
const componentRuns = [];
for (const entry of entries) {
  const current = componentRuns.at(-1);
  if (current?.componentId === entry.componentId) current.count += 1;
  else componentRuns.push({componentId: entry.componentId, count: 1});
}
const compositionFor = (componentId) => ({
  'browser-demo': 'viewport', 'terminal-execution': 'command-log', 'code-diff': 'line-diff', 'config-check': 'key-value', 'interface-audit': 'annotated-target', 'flow-trace': 'directed-path', 'test-report': 'result-summary', 'asset-library': 'asset-grid', 'system-map': 'relation-network', 'before-after': 'split-compare', 'metric-highlight': 'single-metric', 'concept-explainer': 'editorial-claim', 'product-showcase': 'media-hero', 'editor-canvas': 'free-canvas', 'article-illustration': 'article-figure', 'timeline-story': 'single-axis', 'quote-callout': 'quote-layout', 'checklist-progress': 'vertical-checklist', 'radial-explainer': 'radial-map', 'media-compare': 'media-split',
  'overview-matrix': 'capability-grid', 'rule-compare': 'rule-flip', 'code-render': 'code-pipeline', 'slide-editor': 'slide-selection', 'article-map': 'article-path', 'video-agent': 'input-preview-delivery', 'design-compare': 'token-impact', 'system-summary': 'converge-center', 'evidence-replay': 'evidence-trail',
}[componentId] ?? componentId);
const report = {
  projectId: project.projectId,
  title: project.title,
  narrationHash: project.visualPlan.narrationHash,
  generatedFrom: project.visualPlan.generatedFrom,
  totalEntries: entries.length,
  uniqueComponents: usage.size,
  uniqueCompositions: new Set(entries.map((entry) => compositionFor(entry.componentId))).size,
  componentRuns,
  maxComponentRun: Math.max(0, ...componentRuns.map((run) => run.count)),
  unresolvedEntries: entries.filter((entry) => entry.resolution !== 'matched' || !entry.productionReady).map((entry) => entry.id),
  usage: [...usage.entries()].map(([componentId, count]) => ({componentId, count})).sort((left, right) => right.count - left.count || left.componentId.localeCompare(right.componentId)),
  entries,
  diagnostics: [...(project.visualPlan.diagnostics ?? []), ...entries.flatMap((entry) => entry.diagnostics)],
};
const outArg = valueFor('--out');
if (outArg) {
  const outPath = path.resolve(projectRoot, outArg);
  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ok: true, report: path.relative(projectRoot, outPath), totalEntries: report.totalEntries, uniqueComponents: report.uniqueComponents}, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}
