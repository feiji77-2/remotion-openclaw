const ALLOWED_FAMILIES = new Set([
  'hero',
  'feature-rail',
  'focus',
  'number-strip',
  'step-flow',
  'terminal',
  'tag-matrix',
  'code',
  'metrics',
  'cta',
]);

const ALLOWED_TRANSITIONS = new Set(['fade', 'lift', 'flash']);
const ALLOWED_DIAGRAMS = new Set(['framing', 'rings', 'scale']);
const ALLOWED_ACCENTS = new Set(['cyan', 'green', 'yellow', 'orange', 'red', 'purple']);

const sceneBaseDurations = {
  hero: {base: 84, max: 180},
  'feature-rail': {base: 82, max: 180},
  focus: {base: 78, max: 168},
  'number-strip': {base: 64, max: 144},
  'step-flow': {base: 88, max: 210},
  terminal: {base: 84, max: 186},
  'tag-matrix': {base: 78, max: 168},
  code: {base: 74, max: 162},
  metrics: {base: 66, max: 144},
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
    case 'terminal':
      return data.note || data.heading || '';
    case 'tag-matrix':
      return data.heading || '';
    case 'code':
      return data.footer || data.heading || '';
    case 'metrics':
      return data.heading || '';
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
    case 'terminal':
      complexity +=
        countMany([data.heading, data.windowTitle, data.command, data.note]) +
        (Array.isArray(data.outputs) ? data.outputs.length * 16 : 0) +
        (Array.isArray(data.outputs)
          ? data.outputs.reduce((total, item) => total + countText(item), 0)
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
    case 'terminal':
      requireString(errors, `${path}.data.heading`, data.heading);
      requireString(errors, `${path}.data.command`, data.command);
      if (!Array.isArray(data.outputs) || data.outputs.length === 0) {
        pushError(errors, `${path}.data.outputs`, 'expected a non-empty array');
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
