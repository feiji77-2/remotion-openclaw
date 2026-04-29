const ALLOWED_FAMILIES = new Set([
  'hero',
  'feature-rail',
  'focus',
  'number-strip',
  'step-flow',
  'timeline',
  'compare-board',
  'terminal',
  'evidence-wall',
  'architecture-map',
  'tag-matrix',
  'code',
  'metrics',
  'data-stream',
  'memory-graph',
  'pipeline-flow',
  'benchmark-chart',
  'quote-highlight',
  'glossary-term',
  'cta',
]);

const ALLOWED_TRANSITIONS = new Set(['fade', 'lift', 'flash', 'slide', 'wipe', 'flip', 'clock-wipe']);
const ALLOWED_DIAGRAMS = new Set(['framing', 'rings', 'scale']);
const ALLOWED_ACCENTS = new Set(['cyan', 'green', 'yellow', 'orange', 'red', 'purple']);

const sceneBaseDurations = {
  hero: {base: 84, max: 180},
  'feature-rail': {base: 82, max: 180},
  focus: {base: 78, max: 168},
  'number-strip': {base: 64, max: 144},
  'step-flow': {base: 88, max: 210},
  timeline: {base: 82, max: 186},
  'compare-board': {base: 90, max: 204},
  terminal: {base: 84, max: 186},
  'evidence-wall': {base: 84, max: 192},
  'architecture-map': {base: 90, max: 210},
  'tag-matrix': {base: 78, max: 168},
  code: {base: 74, max: 162},
  metrics: {base: 66, max: 144},
  'data-stream': {base: 80, max: 174},
  'memory-graph': {base: 88, max: 192},
  'pipeline-flow': {base: 84, max: 180},
  'benchmark-chart': {base: 84, max: 180},
  'quote-highlight': {base: 68, max: 144},
  'glossary-term': {base: 74, max: 156},
  cta: {base: 72, max: 150},
};

const DEFAULT_TRANSITION = {
  preset: 'lift',
  durationInFrames: 12,
  color: 'rgba(7, 10, 18, 1)',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const countText = (value) => String(value ?? '').replace(/\s+/g, '').length;
const countMany = (values) => values.reduce((total, current) => total + countText(current), 0);

export const deriveSceneSubtitle = (scene) => {
  if (typeof scene.subtitle === 'string' && scene.subtitle.trim()) {
    return scene.subtitle.trim();
  }

  const data = scene.data ?? {};

  switch (scene.family) {
    case 'hero':
      return data.subtitle || data.title || '';
    case 'feature-rail':
      return data.heading || '';
    case 'focus':
      return data.question || data.keyword || '';
    case 'number-strip':
      return [data.count, data.heading].filter(Boolean).join(' ').trim();
    case 'step-flow':
      return data.heading || '';
    case 'timeline':
      return data.summary || data.heading || '';
    case 'compare-board':
      return data.summary || data.heading || '';
    case 'terminal':
      return data.note || data.heading || '';
    case 'evidence-wall':
      return data.summary || data.heading || '';
    case 'architecture-map':
      return data.centerDetail || data.heading || '';
    case 'tag-matrix':
      return data.heading || '';
    case 'code':
      return data.footer || data.heading || '';
    case 'metrics':
      return data.heading || '';
    case 'data-stream':
      return data.summary || data.heading || '';
    case 'memory-graph':
      return data.centerDetail || data.heading || '';
    case 'pipeline-flow':
      return data.summary || data.heading || '';
    case 'benchmark-chart':
      return data.summary || data.heading || '';
    case 'quote-highlight':
      return data.heading || data.quote || '';
    case 'glossary-term':
      return data.definition || data.term || '';
    case 'cta':
      return data.subtitle || data.heading || '';
    default:
      return '';
  }
};

export const estimateSceneDuration = (scene) => {
  if (Number.isFinite(scene.durationInFrames) && Number(scene.durationInFrames) > 0) {
    return Math.round(Number(scene.durationInFrames));
  }

  const data = scene.data ?? {};
  const subtitle = deriveSceneSubtitle(scene);
  let complexity = countText(subtitle);

  switch (scene.family) {
    case 'hero':
      complexity += countMany([data.kicker, data.title, data.subtitle, data.badge]);
      break;
    case 'feature-rail':
      complexity +=
        countMany([data.kicker, data.heading]) +
        (Array.isArray(data.items) ? data.items.length * 18 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce(
              (total, item) =>
                total + countMany([item?.title, item?.eyebrow, item?.caption]),
              0,
            )
          : 0);
      break;
    case 'focus':
      complexity += countMany([data.eyebrow, data.keyword, data.question, data.description]);
      break;
    case 'number-strip':
      complexity +=
        countMany([data.count, data.heading]) +
        (Array.isArray(data.items) ? data.items.length * 14 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce((total, item) => total + countText(item?.label), 0)
          : 0);
      break;
    case 'step-flow':
      complexity +=
        countText(data.heading) +
        (Array.isArray(data.steps) ? data.steps.length * 22 : 0) +
        (Array.isArray(data.steps)
          ? data.steps.reduce(
              (total, item) => total + countMany([item?.label, item?.detail]),
              0,
            )
          : 0);
      break;
    case 'timeline':
      complexity +=
        countMany([data.heading, data.summary]) +
        (Array.isArray(data.items) ? data.items.length * 18 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce(
              (total, item) => total + countMany([item?.label, item?.title, item?.detail]),
              0,
            )
          : 0);
      break;
    case 'compare-board':
      complexity +=
        countMany([data.heading, data.summary, data.leftTitle, data.rightTitle]) +
        (Array.isArray(data.rows) ? data.rows.length * 20 : 0) +
        (Array.isArray(data.rows)
          ? data.rows.reduce(
              (total, row) => total + countMany([row?.label, row?.left, row?.right]),
              0,
            )
          : 0);
      break;
    case 'terminal':
      complexity +=
        countMany([data.heading, data.windowTitle, data.command, data.note]) +
        (Array.isArray(data.outputs) ? data.outputs.length * 16 : 0) +
        (Array.isArray(data.outputs)
          ? data.outputs.reduce((total, item) => total + countText(item), 0)
          : 0);
      break;
    case 'evidence-wall':
      complexity +=
        countMany([data.heading, data.summary]) +
        (Array.isArray(data.cards) ? data.cards.length * 22 : 0) +
        (Array.isArray(data.cards)
          ? data.cards.reduce(
              (total, card) =>
                total + countMany([card?.source, card?.quote, card?.detail, ...(Array.isArray(card?.chips) ? card.chips : [])]),
              0,
            )
          : 0);
      break;
    case 'architecture-map':
      complexity +=
        countMany([data.heading, data.centerTitle, data.centerDetail]) +
        (Array.isArray(data.nodes) ? data.nodes.length * 18 : 0) +
        (Array.isArray(data.nodes)
          ? data.nodes.reduce(
              (total, node) => total + countMany([node?.label, node?.detail]),
              0,
            )
          : 0);
      break;
    case 'tag-matrix':
      complexity +=
        countMany([data.heading, data.activeTab]) +
        (Array.isArray(data.tabs)
          ? data.tabs.reduce((total, item) => total + countText(item), 0)
          : 0) +
        (Array.isArray(data.items) ? data.items.length * 10 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce((total, item) => total + countText(item?.label), 0)
          : 0);
      break;
    case 'code':
      complexity +=
        countMany([data.heading, data.filename, data.footer]) +
        (Array.isArray(data.lines) ? data.lines.length * 12 : 0) +
        (Array.isArray(data.lines)
          ? data.lines.reduce((total, item) => total + countText(item?.text), 0)
          : 0);
      break;
    case 'metrics':
      complexity +=
        countText(data.heading) +
        (Array.isArray(data.items) ? data.items.length * 16 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce(
              (total, item) => total + countMany([item?.label, item?.value]),
              0,
            )
          : 0);
      break;
    case 'data-stream':
      complexity +=
        countMany([data.heading, data.summary]) +
        (Array.isArray(data.items) ? data.items.length * 16 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce(
              (total, item) => total + countMany([item?.label, item?.value, item?.detail]),
              0,
            )
          : 0);
      break;
    case 'memory-graph':
      complexity +=
        countMany([data.heading, data.summary, data.centerTitle, data.centerDetail]) +
        (Array.isArray(data.nodes) ? data.nodes.length * 16 : 0) +
        (Array.isArray(data.nodes)
          ? data.nodes.reduce(
              (total, node) => total + countMany([node?.label, node?.detail]),
              0,
            )
          : 0);
      break;
    case 'pipeline-flow':
      complexity +=
        countMany([data.heading, data.summary]) +
        (Array.isArray(data.stages) ? data.stages.length * 18 : 0) +
        (Array.isArray(data.stages)
          ? data.stages.reduce(
              (total, stage) => total + countMany([stage?.label, stage?.detail]),
              0,
            )
          : 0);
      break;
    case 'benchmark-chart':
      complexity +=
        countMany([data.heading, data.summary, data.primaryLabel, data.secondaryLabel]) +
        (Array.isArray(data.items) ? data.items.length * 18 : 0) +
        (Array.isArray(data.items)
          ? data.items.reduce(
              (total, item) =>
                total + countMany([item?.label, item?.primaryValue, item?.secondaryValue]),
              0,
            )
          : 0);
      break;
    case 'quote-highlight':
      complexity += countMany([
        data.heading,
        data.quote,
        data.attribution,
        ...(Array.isArray(data.tags) ? data.tags.map((tag) => tag?.label) : []),
      ]);
      break;
    case 'glossary-term':
      complexity += countMany([
        data.heading,
        data.term,
        data.pronunciation,
        data.definition,
        ...(Array.isArray(data.related) ? data.related.map((tag) => tag?.label) : []),
      ]);
      break;
    case 'cta':
      complexity += countMany([data.heading, data.subtitle, data.searchLabel, data.badge]);
      break;
    default:
      break;
  }

  const preset = sceneBaseDurations[scene.family] ?? {base: 72, max: 150};
  return clamp(preset.base + Math.round(complexity * 0.42), preset.base, preset.max);
};

const pushError = (errors, path, message) => {
  errors.push(`${path}: ${message}`);
};

const requireString = (errors, path, value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(errors, path, 'expected a non-empty string');
  }
};

const validateAccent = (errors, path, value) => {
  if (value !== undefined && !ALLOWED_ACCENTS.has(value)) {
    pushError(errors, path, `accent must be one of ${Array.from(ALLOWED_ACCENTS).join(', ')}`);
  }
};

const validateTransition = (errors, path, transition) => {
  if (!transition || transition === false) {
    return;
  }

  if (transition.preset !== undefined && !ALLOWED_TRANSITIONS.has(transition.preset)) {
    pushError(errors, `${path}.preset`, `must be one of ${Array.from(ALLOWED_TRANSITIONS).join(', ')}`);
  }

  if (
    transition.durationInFrames !== undefined &&
    (!Number.isFinite(transition.durationInFrames) || Number(transition.durationInFrames) <= 0)
  ) {
    pushError(errors, `${path}.durationInFrames`, 'must be a positive number');
  }
};

const validateSceneData = (errors, scene, index) => {
  const path = `scenes[${index}]`;
  const data = scene.data;

  if (!data || typeof data !== 'object') {
    pushError(errors, `${path}.data`, 'expected an object');
    return;
  }

  switch (scene.family) {
    case 'hero':
      requireString(errors, `${path}.data.title`, data.title);
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'feature-rail':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      } else {
        data.items.forEach((item, itemIndex) => {
          requireString(errors, `${path}.data.items[${itemIndex}].title`, item?.title);
          validateAccent(errors, `${path}.data.items[${itemIndex}].accent`, item?.accent);
        });
      }
      break;
    case 'focus':
      requireString(errors, `${path}.data.keyword`, data.keyword);
      if (data.diagram !== undefined && !ALLOWED_DIAGRAMS.has(data.diagram)) {
        pushError(errors, `${path}.data.diagram`, `must be one of ${Array.from(ALLOWED_DIAGRAMS).join(', ')}`);
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'number-strip':
      requireString(errors, `${path}.data.count`, data.count);
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      }
      break;
    case 'step-flow':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.steps) || data.steps.length === 0) {
        pushError(errors, `${path}.data.steps`, 'expected a non-empty array');
      } else {
        data.steps.forEach((step, stepIndex) => {
          requireString(errors, `${path}.data.steps[${stepIndex}].label`, step?.label);
          validateAccent(errors, `${path}.data.steps[${stepIndex}].accent`, step?.accent);
        });
      }
      break;
    case 'timeline':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      } else {
        data.items.forEach((item, itemIndex) => {
          requireString(errors, `${path}.data.items[${itemIndex}].label`, item?.label);
          requireString(errors, `${path}.data.items[${itemIndex}].title`, item?.title);
          validateAccent(errors, `${path}.data.items[${itemIndex}].accent`, item?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'compare-board':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.leftTitle`, data.leftTitle);
      requireString(errors, `${path}.data.rightTitle`, data.rightTitle);
      if (!Array.isArray(data.rows) || data.rows.length === 0) {
        pushError(errors, `${path}.data.rows`, 'expected a non-empty array');
      } else {
        data.rows.forEach((row, rowIndex) => {
          requireString(errors, `${path}.data.rows[${rowIndex}].label`, row?.label);
          requireString(errors, `${path}.data.rows[${rowIndex}].left`, row?.left);
          requireString(errors, `${path}.data.rows[${rowIndex}].right`, row?.right);
          validateAccent(errors, `${path}.data.rows[${rowIndex}].accent`, row?.accent);
        });
      }
      validateAccent(errors, `${path}.data.leftAccent`, data.leftAccent);
      validateAccent(errors, `${path}.data.rightAccent`, data.rightAccent);
      break;
    case 'terminal':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.command`, data.command);
      if (!Array.isArray(data.outputs) || data.outputs.length === 0) {
        pushError(errors, `${path}.data.outputs`, 'expected a non-empty array');
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'evidence-wall':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.cards) || data.cards.length === 0) {
        pushError(errors, `${path}.data.cards`, 'expected a non-empty array');
      } else {
        data.cards.forEach((card, cardIndex) => {
          requireString(errors, `${path}.data.cards[${cardIndex}].source`, card?.source);
          requireString(errors, `${path}.data.cards[${cardIndex}].quote`, card?.quote);
          validateAccent(errors, `${path}.data.cards[${cardIndex}].accent`, card?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'architecture-map':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.centerTitle`, data.centerTitle);
      if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
        pushError(errors, `${path}.data.nodes`, 'expected a non-empty array');
      } else {
        data.nodes.forEach((node, nodeIndex) => {
          requireString(errors, `${path}.data.nodes[${nodeIndex}].label`, node?.label);
          validateAccent(errors, `${path}.data.nodes[${nodeIndex}].accent`, node?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'tag-matrix':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      }
      break;
    case 'code':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.lines) || data.lines.length === 0) {
        pushError(errors, `${path}.data.lines`, 'expected a non-empty array');
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'metrics':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      } else {
        data.items.forEach((item, itemIndex) => {
          requireString(errors, `${path}.data.items[${itemIndex}].label`, item?.label);
          requireString(errors, `${path}.data.items[${itemIndex}].value`, item?.value);
          if (!Number.isFinite(item?.ratio) || item.ratio < 0 || item.ratio > 1) {
            pushError(errors, `${path}.data.items[${itemIndex}].ratio`, 'must be a number between 0 and 1');
          }
          validateAccent(errors, `${path}.data.items[${itemIndex}].accent`, item?.accent);
        });
      }
      break;
    case 'data-stream':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      } else {
        data.items.forEach((item, itemIndex) => {
          requireString(errors, `${path}.data.items[${itemIndex}].label`, item?.label);
          requireString(errors, `${path}.data.items[${itemIndex}].value`, item?.value);
          validateAccent(errors, `${path}.data.items[${itemIndex}].accent`, item?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'memory-graph':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.centerTitle`, data.centerTitle);
      if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
        pushError(errors, `${path}.data.nodes`, 'expected a non-empty array');
      } else {
        data.nodes.forEach((node, nodeIndex) => {
          requireString(errors, `${path}.data.nodes[${nodeIndex}].label`, node?.label);
          validateAccent(errors, `${path}.data.nodes[${nodeIndex}].accent`, node?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'pipeline-flow':
      requireString(errors, `${path}.data.heading`, data.heading);
      if (!Array.isArray(data.stages) || data.stages.length === 0) {
        pushError(errors, `${path}.data.stages`, 'expected a non-empty array');
      } else {
        data.stages.forEach((stage, stageIndex) => {
          requireString(errors, `${path}.data.stages[${stageIndex}].label`, stage?.label);
          validateAccent(errors, `${path}.data.stages[${stageIndex}].accent`, stage?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'benchmark-chart':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.primaryLabel`, data.primaryLabel);
      requireString(errors, `${path}.data.secondaryLabel`, data.secondaryLabel);
      if (!Array.isArray(data.items) || data.items.length === 0) {
        pushError(errors, `${path}.data.items`, 'expected a non-empty array');
      } else {
        data.items.forEach((item, itemIndex) => {
          requireString(errors, `${path}.data.items[${itemIndex}].label`, item?.label);
          requireString(errors, `${path}.data.items[${itemIndex}].primaryValue`, item?.primaryValue);
          requireString(errors, `${path}.data.items[${itemIndex}].secondaryValue`, item?.secondaryValue);
          if (!Number.isFinite(item?.primaryRatio) || item.primaryRatio < 0 || item.primaryRatio > 1) {
            pushError(errors, `${path}.data.items[${itemIndex}].primaryRatio`, 'must be a number between 0 and 1');
          }
          if (!Number.isFinite(item?.secondaryRatio) || item.secondaryRatio < 0 || item.secondaryRatio > 1) {
            pushError(errors, `${path}.data.items[${itemIndex}].secondaryRatio`, 'must be a number between 0 and 1');
          }
          validateAccent(errors, `${path}.data.items[${itemIndex}].accent`, item?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'quote-highlight':
      requireString(errors, `${path}.data.quote`, data.quote);
      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag, tagIndex) => {
          requireString(errors, `${path}.data.tags[${tagIndex}].label`, tag?.label);
          validateAccent(errors, `${path}.data.tags[${tagIndex}].accent`, tag?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'glossary-term':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.term`, data.term);
      requireString(errors, `${path}.data.definition`, data.definition);
      if (Array.isArray(data.related)) {
        data.related.forEach((tag, tagIndex) => {
          requireString(errors, `${path}.data.related[${tagIndex}].label`, tag?.label);
          validateAccent(errors, `${path}.data.related[${tagIndex}].accent`, tag?.accent);
        });
      }
      validateAccent(errors, `${path}.data.accent`, data.accent);
      break;
    case 'cta':
      requireString(errors, `${path}.data.heading`, data.heading);
      break;
    default:
      pushError(errors, `${path}.family`, 'unsupported family');
      break;
  }
};

export const validateUltimateConfig = (config) => {
  const errors = [];

  if (!config || typeof config !== 'object') {
    pushError(errors, 'config', 'expected an object');
    return errors;
  }

  if (!Array.isArray(config.scenes) || config.scenes.length === 0) {
    pushError(errors, 'config.scenes', 'expected a non-empty array');
    return errors;
  }

  const ids = new Set();

  if (config.defaultTransition !== undefined && config.defaultTransition !== false) {
    validateTransition(errors, 'config.defaultTransition', config.defaultTransition);
  }

  config.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;

    if (!scene || typeof scene !== 'object') {
      pushError(errors, path, 'expected an object');
      return;
    }

    requireString(errors, `${path}.id`, scene.id);

    if (scene.id && ids.has(scene.id)) {
      pushError(errors, `${path}.id`, 'must be unique');
    }

    ids.add(scene.id);

    if (!ALLOWED_FAMILIES.has(scene.family)) {
      pushError(errors, `${path}.family`, `must be one of ${Array.from(ALLOWED_FAMILIES).join(', ')}`);
    }

    if (
      scene.durationInFrames !== undefined &&
      (!Number.isFinite(scene.durationInFrames) || Number(scene.durationInFrames) <= 0)
    ) {
      pushError(errors, `${path}.durationInFrames`, 'must be a positive number');
    }

    validateTransition(errors, `${path}.transition`, scene.transition);
    validateSceneData(errors, scene, index);
  });

  return errors;
};

const normalizeTransition = (projectTransition, sceneTransition) => {
  if (sceneTransition === false) {
    return false;
  }

  if (projectTransition === false && !sceneTransition) {
    return false;
  }

  return {
    ...DEFAULT_TRANSITION,
    ...(projectTransition === false ? {} : projectTransition ?? {}),
    ...(sceneTransition ?? {}),
  };
};

export const normalizeUltimateConfig = (config) => {
  return {
    ...config,
    defaultTransition:
      config.defaultTransition === false
        ? false
        : {
            ...DEFAULT_TRANSITION,
            ...(config.defaultTransition ?? {}),
          },
    scenes: config.scenes.map((scene) => ({
      ...scene,
      subtitle: deriveSceneSubtitle(scene),
      durationInFrames: estimateSceneDuration(scene),
      transition: normalizeTransition(config.defaultTransition, scene.transition),
    })),
  };
};

export const summarizeUltimateConfig = (config) => {
  const normalized = normalizeUltimateConfig(config);
  const durationInFrames = normalized.scenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );

  return {
    title: normalized.title ?? 'Untitled project',
    sceneCount: normalized.scenes.length,
    durationInFrames,
    durationInSeconds: Number((durationInFrames / 30).toFixed(2)),
    families: normalized.scenes.map((scene) => ({
      id: scene.id,
      family: scene.family,
      durationInFrames: scene.durationInFrames,
      subtitle: scene.subtitle ?? '',
    })),
  };
};
