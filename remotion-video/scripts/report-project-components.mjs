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
const report = {
  projectId: project.projectId,
  title: project.title,
  narrationHash: project.visualPlan.narrationHash,
  generatedFrom: project.visualPlan.generatedFrom,
  totalEntries: entries.length,
  uniqueComponents: usage.size,
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
