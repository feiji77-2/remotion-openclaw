#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const blueprintPath = path.join(repoRoot, 'src/data/contracts/contentBlueprint_v4h.json');
const sourcePath = path.join(repoRoot, 'src/data/contracts/contentManifest_v4h.source.json');
const outputPath = path.join(repoRoot, 'src/data/generated/contentManifest_v4h.generated.ts');

const expectedShotIds = Array.from({length: 20}, (_, index) => `shot-${String(index + 1).padStart(2, '0')}`);
const allowedKinds = new Set([
  'opening',
  'concept',
  'split-comparison',
  'bullet-list',
  'loop-flow',
  'skill-tree',
  'cta',
  'tech-analysis',
  'social-proof-post',
  'philosophy-clash',
]);
const allowedTones = new Set(['accent', 'secondary', 'tertiary', 'danger']);
const allowedIconTypes = new Set(['check', 'arrow', 'number', 'dot']);

const assertPlainObject = (value, message) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
};

const assertArray = (value, message) => {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
};

const assertString = (value, message) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
  return value;
};

const optionalString = (value) => {
  if (value == null || value === '') {
    return undefined;
  }
  return assertString(value, 'Invalid optional string');
};

const optionalTone = (value, fieldLabel) => {
  if (value == null || value === '') {
    return undefined;
  }
  if (!allowedTones.has(value)) {
    throw new Error(`${fieldLabel} must be one of: ${Array.from(allowedTones).join(', ')}`);
  }
  return value;
};

const optionalNumber = (value, fieldLabel) => {
  if (value == null || value === '') {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldLabel} must be a finite number.`);
  }
  return value;
};

const requiredNumber = (value, fieldLabel) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldLabel} must be a finite number.`);
  }
  return value;
};

const cleanObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(cleanObject);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, cleanObject(entry)]),
    );
  }

  return value;
};

const loadBlueprint = () => {
  const raw = fs.readFileSync(blueprintPath, 'utf8');
  const parsed = JSON.parse(raw);
  assertPlainObject(parsed, 'Content blueprint must be a JSON object.');
  assertArray(parsed.shots, 'Content blueprint must contain a "shots" array.');
  return parsed;
};

const normalizeTone = (value, fieldLabel) => optionalTone(value, fieldLabel);

const mapLegend = (legend, fieldLabel) => {
  assertArray(legend, `${fieldLabel} must be an array.`);
  return legend.map((item, index) => {
    assertPlainObject(item, `${fieldLabel}[${index}] must be an object.`);
    return {
      label: assertString(item.label, `${fieldLabel}[${index}].label is required.`),
      color: assertString(item.color, `${fieldLabel}[${index}].color is required.`),
    };
  });
};

const mapNodes = (nodes, fieldLabel) => {
  assertArray(nodes, `${fieldLabel} must be an array.`);
  return nodes.map((item, index) => {
    assertPlainObject(item, `${fieldLabel}[${index}] must be an object.`);
    return {
      label: assertString(item.label, `${fieldLabel}[${index}].label is required.`),
      x: requiredNumber(item.x, `${fieldLabel}[${index}].x`),
      y: requiredNumber(item.y, `${fieldLabel}[${index}].y`),
    };
  });
};

const mapBlueprintShot = (shot, index) => {
  assertPlainObject(shot, `shots[${index}] must be an object.`);
  const shotLabel = `shots[${index}]`;
  const kind = assertString(shot.kind, `${shotLabel}.kind is required.`);

  if (!allowedKinds.has(kind)) {
    throw new Error(`${shotLabel}.kind must be one of: ${Array.from(allowedKinds).join(', ')}`);
  }

  switch (kind) {
    case 'opening':
      return cleanObject({
        kind,
        mainNumber: assertString(shot.n, `${shotLabel}.n is required.`),
        mainNumberLabel: optionalString(shot.label),
        subtitle: optionalString(shot.subtitle),
        suspenseLine: optionalString(shot.question),
        accentTone: normalizeTone(shot.tone, `${shotLabel}.tone`),
      });
    case 'concept':
      return cleanObject({
        kind,
        title: assertString(shot.title, `${shotLabel}.title is required.`),
        body: assertString(shot.body, `${shotLabel}.body is required.`),
        highlight: optionalString(shot.highlight),
        accentTone: normalizeTone(shot.tone, `${shotLabel}.tone`),
      });
    case 'split-comparison':
      assertPlainObject(shot.left, `${shotLabel}.left is required.`);
      assertPlainObject(shot.right, `${shotLabel}.right is required.`);
      assertArray(shot.left.items, `${shotLabel}.left.items must be an array.`);
      assertArray(shot.right.items, `${shotLabel}.right.items must be an array.`);
      return cleanObject({
        kind,
        leftTitle: assertString(shot.left.title, `${shotLabel}.left.title is required.`),
        leftItems: shot.left.items.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.left.items[${itemIndex}] is required.`)),
        rightTitle: assertString(shot.right.title, `${shotLabel}.right.title is required.`),
        rightItems: shot.right.items.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.right.items[${itemIndex}] is required.`)),
        leftTone: normalizeTone(shot.left.tone, `${shotLabel}.left.tone`),
        rightTone: normalizeTone(shot.right.tone, `${shotLabel}.right.tone`),
      });
    case 'bullet-list':
      assertArray(shot.points, `${shotLabel}.points must be an array.`);
      if (shot.icon && !allowedIconTypes.has(shot.icon)) {
        throw new Error(`${shotLabel}.icon must be one of: ${Array.from(allowedIconTypes).join(', ')}`);
      }
      return cleanObject({
        kind,
        title: optionalString(shot.title),
        points: shot.points.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.points[${itemIndex}] is required.`)),
        iconType: shot.icon,
        accentTone: normalizeTone(shot.tone, `${shotLabel}.tone`),
      });
    case 'loop-flow':
      assertArray(shot.open, `${shotLabel}.open must be an array.`);
      assertArray(shot.closed, `${shotLabel}.closed must be an array.`);
      return cleanObject({
        kind,
        openLoopSteps: shot.open.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.open[${itemIndex}] is required.`)),
        closedLoopSteps: shot.closed.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.closed[${itemIndex}] is required.`)),
        title: optionalString(shot.title),
      });
    case 'skill-tree':
      return cleanObject({
        kind,
        title: optionalString(shot.title),
        mainNumber: assertString(shot.n, `${shotLabel}.n is required.`),
        mainLabel: assertString(shot.label, `${shotLabel}.label is required.`),
        subInfo: optionalString(shot.sub),
        nodes: mapNodes(shot.nodes, `${shotLabel}.nodes`),
        accentTone: normalizeTone(shot.tone, `${shotLabel}.tone`),
      });
    case 'cta':
      return cleanObject({
        kind,
        mainText: optionalString(shot.main),
        subText: optionalString(shot.sub),
        ctaText: optionalString(shot.cta),
        accentTone: normalizeTone(shot.tone, `${shotLabel}.tone`),
      });
    case 'tech-analysis':
      assertArray(shot.problems, `${shotLabel}.problems must be an array.`);
      assertPlainObject(shot.formula, `${shotLabel}.formula is required.`);
      assertPlainObject(shot.chart, `${shotLabel}.chart is required.`);
      assertPlainObject(shot.conclusion, `${shotLabel}.conclusion is required.`);
      assertArray(shot.conclusion.lines, `${shotLabel}.conclusion.lines must be an array.`);
      return cleanObject({
        kind,
        topLabel: assertString(shot.topLabel, `${shotLabel}.topLabel is required.`),
        problemItems: shot.problems.map((item, problemIndex) => {
          assertPlainObject(item, `${shotLabel}.problems[${problemIndex}] must be an object.`);
          return {
            label: assertString(item.label, `${shotLabel}.problems[${problemIndex}].label is required.`),
            color: assertString(item.color, `${shotLabel}.problems[${problemIndex}].color is required.`),
          };
        }),
        summaryLabel: assertString(shot.summary, `${shotLabel}.summary is required.`),
        formulaIntro: assertString(shot.formula.intro, `${shotLabel}.formula.intro is required.`),
        formulaText: assertString(shot.formula.text, `${shotLabel}.formula.text is required.`),
        formulaSubline: assertString(shot.formula.subline, `${shotLabel}.formula.subline is required.`),
        yAxisLabel: assertString(shot.chart.yAxisLabel, `${shotLabel}.chart.yAxisLabel is required.`),
        legend: mapLegend(shot.chart.legend, `${shotLabel}.chart.legend`),
        metrics: shot.chart.metrics.map((item, metricIndex) => {
          assertPlainObject(item, `${shotLabel}.chart.metrics[${metricIndex}] must be an object.`);
          return {
            label: assertString(item.label, `${shotLabel}.chart.metrics[${metricIndex}].label is required.`),
            value: assertString(item.value, `${shotLabel}.chart.metrics[${metricIndex}].value is required.`),
            color: assertString(item.color, `${shotLabel}.chart.metrics[${metricIndex}].color is required.`),
            x: requiredNumber(item.x, `${shotLabel}.chart.metrics[${metricIndex}].x`),
            y: requiredNumber(item.y, `${shotLabel}.chart.metrics[${metricIndex}].y`),
          };
        }),
        conclusionLabel: assertString(shot.conclusion.label, `${shotLabel}.conclusion.label is required.`),
        conclusionLines: shot.conclusion.lines.map((line, lineIndex) =>
          assertString(line, `${shotLabel}.conclusion.lines[${lineIndex}] is required.`)),
        conclusionFootnote: assertString(shot.conclusion.footnote, `${shotLabel}.conclusion.footnote is required.`),
        template: shot.template,
      });
    case 'social-proof-post':
      assertArray(shot.engagement, `${shotLabel}.engagement must be an array.`);
      assertArray(shot.tags, `${shotLabel}.tags must be an array.`);
      return cleanObject({
        kind,
        community: assertString(shot.community, `${shotLabel}.community is required.`),
        authorMeta: assertString(shot.author, `${shotLabel}.author is required.`),
        postTitle: assertString(shot.title, `${shotLabel}.title is required.`),
        quote: assertString(shot.quote, `${shotLabel}.quote is required.`),
        engagementItems: shot.engagement.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.engagement[${itemIndex}] is required.`)),
        tags: shot.tags.map((item, tagIndex) => {
          assertPlainObject(item, `${shotLabel}.tags[${tagIndex}] must be an object.`);
          return {
            label: assertString(item.label, `${shotLabel}.tags[${tagIndex}].label is required.`),
            color: assertString(item.color, `${shotLabel}.tags[${tagIndex}].color is required.`),
            bg: assertString(item.bg, `${shotLabel}.tags[${tagIndex}].bg is required.`),
          };
        }),
        sourceLabel: assertString(shot.source, `${shotLabel}.source is required.`),
        footnote: assertString(shot.footnote, `${shotLabel}.footnote is required.`),
        template: shot.template,
      });
    case 'philosophy-clash':
      assertPlainObject(shot.left, `${shotLabel}.left is required.`);
      assertPlainObject(shot.right, `${shotLabel}.right is required.`);
      assertArray(shot.left.items, `${shotLabel}.left.items must be an array.`);
      assertArray(shot.right.items, `${shotLabel}.right.items must be an array.`);
      return cleanObject({
        kind,
        leftHeadline: assertString(shot.left.headline, `${shotLabel}.left.headline is required.`),
        leftBrand: assertString(shot.left.brand, `${shotLabel}.left.brand is required.`),
        leftItems: shot.left.items.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.left.items[${itemIndex}] is required.`)),
        rightHeadline: assertString(shot.right.headline, `${shotLabel}.right.headline is required.`),
        rightBrand: assertString(shot.right.brand, `${shotLabel}.right.brand is required.`),
        rightItems: shot.right.items.map((item, itemIndex) =>
          assertString(item, `${shotLabel}.right.items[${itemIndex}] is required.`)),
        centerLabel: assertString(shot.centerLabel, `${shotLabel}.centerLabel is required.`),
        template: shot.template,
      });
    default:
      throw new Error(`Unsupported kind: ${kind}`);
  }
};

const buildContractFromBlueprint = (blueprint) => {
  const shots = blueprint.shots;
  const missing = expectedShotIds.slice(shots.length);
  const extraCount = shots.length - expectedShotIds.length;

  if (missing.length > 0 || extraCount > 0) {
    throw new Error(
      `Blueprint shot count must be exactly ${expectedShotIds.length}. ` +
      `Received ${shots.length}${missing.length > 0 ? `, missing entries for ${missing.join(', ')}` : ''}`,
    );
  }

  return Object.fromEntries(
    shots.map((shot, index) => [expectedShotIds[index], mapBlueprintShot(shot, index)]),
  );
};

const orderContract = (contract) => {
  return Object.fromEntries(expectedShotIds.map((shotId) => [shotId, contract[shotId]]));
};

const renderOutput = (orderedContract) => {
  const body = JSON.stringify(orderedContract, null, 2);

  return `/**
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Blueprint: src/data/contracts/contentBlueprint_v4h.json
 * Run: npm run content:generate
 */

import type { Video1v4ShotContent, Video1v4ShotId } from '../contentManifest_v4h';

export const VIDEO1V4_CONTENT_MANIFEST = ${body} satisfies Record<Video1v4ShotId, Video1v4ShotContent>;
`;
};

const main = () => {
  if (!fs.existsSync(blueprintPath)) {
    if (fs.existsSync(outputPath)) {
      process.stdout.write(
        `[content:generate] Missing ${path.relative(repoRoot, blueprintPath)}, reuse existing ${path.relative(repoRoot, outputPath)}\n`,
      );
      return;
    }

    throw new Error(
      `Missing ${path.relative(repoRoot, blueprintPath)} and no generated fallback at ${path.relative(repoRoot, outputPath)}`,
    );
  }

  const blueprint = loadBlueprint();
  const contract = buildContractFromBlueprint(blueprint);
  const orderedContract = orderContract(contract);
  const output = renderOutput(orderedContract);

  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.mkdirSync(path.dirname(sourcePath), {recursive: true});
  fs.writeFileSync(sourcePath, JSON.stringify(orderedContract, null, 2) + '\n');
  fs.writeFileSync(outputPath, output);
  process.stdout.write(
    `Generated ${path.relative(repoRoot, sourcePath)} and ` +
    `${path.relative(repoRoot, outputPath)} from ${path.relative(repoRoot, blueprintPath)}\n`,
  );
};

main();
