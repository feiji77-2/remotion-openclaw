import {validateUltimateConfig} from './ultimate-scene-config.mjs';

const ACCENT_ROTATION = ['cyan', 'green', 'yellow', 'orange', 'purple', 'red'];

const KIND_TO_FAMILY = new Map([
  ['hero', 'hero'],
  ['cover', 'hero'],
  ['opener', 'hero'],
  ['chapter', 'hero'],
  ['feature-rail', 'feature-rail'],
  ['feature', 'feature-rail'],
  ['features', 'feature-rail'],
  ['cards', 'feature-rail'],
  ['dimensions', 'feature-rail'],
  ['focus', 'focus'],
  ['definition', 'focus'],
  ['concept', 'focus'],
  ['keyword', 'focus'],
  ['number-strip', 'number-strip'],
  ['strip', 'number-strip'],
  ['numbers', 'number-strip'],
  ['options', 'number-strip'],
  ['step-flow', 'step-flow'],
  ['steps', 'step-flow'],
  ['process', 'step-flow'],
  ['flow', 'step-flow'],
  ['pipeline', 'step-flow'],
  ['timeline', 'timeline'],
  ['roadmap', 'timeline'],
  ['history', 'timeline'],
  ['milestones', 'timeline'],
  ['events', 'timeline'],
  ['compare-board', 'compare-board'],
  ['compare', 'compare-board'],
  ['comparison', 'compare-board'],
  ['versus', 'compare-board'],
  ['battle', 'compare-board'],
  ['terminal', 'terminal'],
  ['runtime', 'terminal'],
  ['command', 'terminal'],
  ['logs', 'terminal'],
  ['evidence-wall', 'evidence-wall'],
  ['evidence', 'evidence-wall'],
  ['proof', 'evidence-wall'],
  ['sources', 'evidence-wall'],
  ['citations', 'evidence-wall'],
  ['architecture-map', 'architecture-map'],
  ['architecture', 'architecture-map'],
  ['system-map', 'architecture-map'],
  ['stack', 'architecture-map'],
  ['topology', 'architecture-map'],
  ['tag-matrix', 'tag-matrix'],
  ['tags', 'tag-matrix'],
  ['matrix', 'tag-matrix'],
  ['modules', 'tag-matrix'],
  ['code', 'code'],
  ['schema', 'code'],
  ['json', 'code'],
  ['snippet', 'code'],
  ['metrics', 'metrics'],
  ['stats', 'metrics'],
  ['results', 'metrics'],
  ['cta', 'cta'],
  ['close', 'cta'],
  ['closing', 'cta'],
  ['outro', 'cta'],
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const asArray = (value) => {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
};

const textOrEmpty = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const requireText = (errors, path, value, message = 'expected a non-empty string') => {
  if (textOrEmpty(value).length === 0) {
    errors.push(`${path}: ${message}`);
    return '';
  }

  return textOrEmpty(value);
};

const pickAccent = (value, index, fallback = 'cyan') => {
  return textOrEmpty(value) || ACCENT_ROTATION[index % ACCENT_ROTATION.length] || fallback;
};

const pickSceneId = (section, family, index) => {
  const rawId = textOrEmpty(section.id);

  if (rawId) {
    return rawId;
  }

  return `${String(index + 1).padStart(2, '0')}-${family}`;
};

const resolveFamily = (section) => {
  const kind = textOrEmpty(section.family || section.kind).toLowerCase();
  return KIND_TO_FAMILY.get(kind) || null;
};

const resolveSectionHeading = (section) => {
  return (
    textOrEmpty(section.heading) ||
    textOrEmpty(section.title) ||
    textOrEmpty(section.keyword) ||
    textOrEmpty(section.count) ||
    ''
  );
};

const normalizeFeatureItems = (items, errors, path) => {
  const list = asArray(items);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        title: item.trim(),
        eyebrow: `slot ${String.fromCharCode(97 + (index % 26))}`,
        caption: '',
        icon: item.trim().charAt(0).toUpperCase() || String(index + 1),
        accent: pickAccent('', index),
      };
    }

    const title = textOrEmpty(item?.title || item?.label || item?.name);

    if (!title) {
      errors.push(`${path}[${index}].title: expected a non-empty string`);
    }

    return {
      title,
      eyebrow: textOrEmpty(item?.eyebrow || item?.kicker) || `slot ${String.fromCharCode(97 + (index % 26))}`,
      caption: textOrEmpty(item?.caption || item?.detail || item?.description),
      icon: textOrEmpty(item?.icon) || title.charAt(0).toUpperCase() || String(index + 1),
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeStripItems = (items, errors, path) => {
  const list = asArray(items);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        label: item.trim(),
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name);

    if (!label) {
      errors.push(`${path}[${index}].label: expected a non-empty string`);
    }

    return {
      label,
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeSteps = (steps, errors, path) => {
  const list = asArray(steps);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        label: item.trim(),
        detail: '',
        icon: String(index + 1),
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name);

    if (!label) {
      errors.push(`${path}[${index}].label: expected a non-empty string`);
    }

    return {
      label,
      detail: textOrEmpty(item?.detail || item?.caption || item?.description),
      icon: textOrEmpty(item?.icon) || String(index + 1),
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeTimelineItems = (items, errors, path) => {
  const list = asArray(items);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        label: `节点 ${index + 1}`,
        title: item.trim(),
        detail: '',
        icon: '',
        accent: pickAccent('', index),
      };
    }

    const title = textOrEmpty(item?.title || item?.label || item?.name);

    if (!title) {
      errors.push(`${path}[${index}].title: expected a non-empty string`);
    }

    return {
      label: textOrEmpty(item?.label || item?.kicker || item?.date || item?.time) || `节点 ${index + 1}`,
      title,
      detail: textOrEmpty(item?.detail || item?.caption || item?.description),
      icon: textOrEmpty(item?.icon),
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeCompareRows = (rows, errors, path) => {
  const list = asArray(rows);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      const [label, left, right] = item.split('|').map((part) => textOrEmpty(part));
      return {
        label: label || `维度 ${index + 1}`,
        left: left || '',
        right: right || '',
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name) || `维度 ${index + 1}`;
    const left = textOrEmpty(item?.left || item?.before || item?.old || item?.a);
    const right = textOrEmpty(item?.right || item?.after || item?.new || item?.b);

    if (!left) {
      errors.push(`${path}[${index}].left: expected a non-empty string`);
    }

    if (!right) {
      errors.push(`${path}[${index}].right: expected a non-empty string`);
    }

    return {
      label,
      left,
      right,
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeTagItems = (items, errors, path) => {
  const list = asArray(items);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        label: item.trim(),
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name);

    if (!label) {
      errors.push(`${path}[${index}].label: expected a non-empty string`);
    }

    return {
      label,
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeEvidenceCards = (cards, errors, path) => {
  const list = asArray(cards);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        source: `证据 ${index + 1}`,
        quote: item.trim(),
        detail: '',
        chips: [],
        icon: '',
        accent: pickAccent('', index),
      };
    }

    const source = textOrEmpty(item?.source || item?.label || item?.title);
    const quote = textOrEmpty(item?.quote || item?.text || item?.description || item?.detail);

    if (!source) {
      errors.push(`${path}[${index}].source: expected a non-empty string`);
    }

    if (!quote) {
      errors.push(`${path}[${index}].quote: expected a non-empty string`);
    }

    return {
      source,
      quote,
      detail: textOrEmpty(item?.detail || item?.caption),
      chips: asArray(item?.chips || item?.tags).map((chip) => textOrEmpty(chip)).filter(Boolean),
      icon: textOrEmpty(item?.icon),
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeArchitectureNodes = (nodes, errors, path) => {
  const list = asArray(nodes);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      return {
        label: item.trim(),
        detail: '',
        icon: '',
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name);

    if (!label) {
      errors.push(`${path}[${index}].label: expected a non-empty string`);
    }

    return {
      label,
      detail: textOrEmpty(item?.detail || item?.caption || item?.description),
      icon: textOrEmpty(item?.icon),
      accent: pickAccent(item?.accent, index),
    };
  });
};

const defaultMetricRatio = (index, total) => {
  if (total <= 1) {
    return 0.9;
  }

  const start = 0.92;
  const end = 0.56;
  const step = (start - end) / Math.max(total - 1, 1);
  return Number(clamp(start - step * index, 0.3, 1).toFixed(2));
};

const normalizeMetrics = (items, errors, path) => {
  const list = asArray(items);

  if (list.length === 0) {
    errors.push(`${path}: expected a non-empty array`);
    return [];
  }

  return list.map((item, index) => {
    if (typeof item === 'string') {
      const parts = item.split(':');
      return {
        label: textOrEmpty(parts[0]) || `Metric ${index + 1}`,
        value: textOrEmpty(parts.slice(1).join(':')) || item.trim(),
        ratio: defaultMetricRatio(index, list.length),
        accent: pickAccent('', index),
      };
    }

    const label = textOrEmpty(item?.label || item?.title || item?.name);
    const value = textOrEmpty(item?.value || item?.detail || item?.description);

    if (!label) {
      errors.push(`${path}[${index}].label: expected a non-empty string`);
    }

    if (!value) {
      errors.push(`${path}[${index}].value: expected a non-empty string`);
    }

    const ratio =
      Number.isFinite(item?.ratio) && Number(item.ratio) >= 0 && Number(item.ratio) <= 1
        ? Number(item.ratio)
        : defaultMetricRatio(index, list.length);

    return {
      label,
      value,
      ratio,
      accent: pickAccent(item?.accent, index),
    };
  });
};

const normalizeCodeLines = (lines, highlightLine) => {
  const list =
    typeof lines === 'string'
      ? lines.split('\n')
      : asArray(lines).map((line) => {
          if (typeof line === 'string') {
            return line;
          }

          return {
            text: textOrEmpty(line?.text),
            tone: textOrEmpty(line?.tone),
          };
        });

  return list.map((line, index) => {
    if (typeof line === 'string') {
      return {
        text: line,
        tone: highlightLine === index + 1 ? 'accent' : 'base',
      };
    }

    return {
      text: line.text,
      tone: line.tone || (highlightLine === index + 1 ? 'accent' : 'base'),
    };
  });
};

const compileHero = (section, errors, path) => {
  const title = requireText(errors, `${path}.title`, section.title || section.heading);

  return {
    data: {
      kicker: textOrEmpty(section.kicker || section.eyebrow),
      title,
      subtitle: textOrEmpty(section.body || section.description || section.subtitle),
      badge: textOrEmpty(section.badge),
      accent: pickAccent(section.accent, 0, 'orange'),
      avatarLabel: textOrEmpty(section.avatarLabel || section.avatar) || 'YOU',
    },
  };
};

const compileFeatureRail = (section, errors, path) => {
  return {
    data: {
      kicker: textOrEmpty(section.kicker || section.eyebrow),
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      items: normalizeFeatureItems(section.items || section.points || section.cards, errors, `${path}.items`),
    },
  };
};

const compileFocus = (section, errors, path) => {
  return {
    data: {
      eyebrow: textOrEmpty(section.eyebrow || section.kicker),
      keyword: requireText(errors, `${path}.keyword`, section.keyword || section.title),
      question: textOrEmpty(section.question || section.heading),
      description: textOrEmpty(section.description || section.body || section.detail),
      accent: pickAccent(section.accent, 0),
      diagram: textOrEmpty(section.diagram) || 'framing',
    },
  };
};

const compileNumberStrip = (section, errors, path) => {
  const items = normalizeStripItems(section.items || section.options || section.points, errors, `${path}.items`);

  return {
    data: {
      count: textOrEmpty(section.count) || String(items.length),
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      items,
      accent: pickAccent(section.accent, 0, 'yellow'),
    },
  };
};

const compileStepFlow = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      steps: normalizeSteps(section.steps || section.items || section.points, errors, `${path}.steps`),
    },
  };
};

const compileTimeline = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      summary: textOrEmpty(section.summary || section.subtitle || section.description),
      items: normalizeTimelineItems(
        section.items || section.timeline || section.milestones || section.events,
        errors,
        `${path}.items`,
      ),
      accent: pickAccent(section.accent, 0, 'cyan'),
    },
  };
};

const compileCompareBoard = (section, errors, path) => {
  const rows = normalizeCompareRows(
    section.rows || section.items || section.comparisons,
    errors,
    `${path}.rows`,
  );
  const leftTitle = textOrEmpty(section.leftTitle || section.beforeTitle || section.left) || '对照 A';
  const rightTitle = textOrEmpty(section.rightTitle || section.afterTitle || section.right) || '对照 B';

  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      summary: textOrEmpty(section.summary || section.subtitle || section.description),
      leftTitle,
      rightTitle,
      leftEyebrow: textOrEmpty(section.leftEyebrow || section.leftKicker),
      rightEyebrow: textOrEmpty(section.rightEyebrow || section.rightKicker),
      rows,
      leftAccent: pickAccent(section.leftAccent, 0, 'red'),
      rightAccent: pickAccent(section.rightAccent, 1, 'green'),
    },
  };
};

const compileTerminal = (section, errors, path) => {
  const outputs = asArray(section.outputs || section.logs || section.lines).map((item) =>
    typeof item === 'string' ? item.trim() : textOrEmpty(item?.text || item?.label),
  );

  if (outputs.length === 0) {
    errors.push(`${path}.outputs: expected a non-empty array`);
  }

  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      windowTitle: textOrEmpty(section.windowTitle) || `${textOrEmpty(section.id) || 'runtime'}-panel`,
      command: requireText(errors, `${path}.command`, section.command),
      outputs,
      note: textOrEmpty(section.note || section.subtitle || section.description),
      accent: pickAccent(section.accent, 0, 'green'),
    },
  };
};

const compileEvidenceWall = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      summary: textOrEmpty(section.summary || section.subtitle || section.description),
      cards: normalizeEvidenceCards(
        section.cards || section.evidence || section.sources || section.items,
        errors,
        `${path}.cards`,
      ),
      accent: pickAccent(section.accent, 0, 'yellow'),
    },
  };
};

const compileArchitectureMap = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      centerTitle: requireText(
        errors,
        `${path}.centerTitle`,
        section.centerTitle || section.keyword || section.core || section.title,
      ),
      centerDetail: textOrEmpty(section.centerDetail || section.subtitle || section.description),
      nodes: normalizeArchitectureNodes(
        section.nodes || section.modules || section.items || section.points,
        errors,
        `${path}.nodes`,
      ),
      accent: pickAccent(section.accent, 0, 'cyan'),
      layout: textOrEmpty(section.layout) || 'radial',
    },
  };
};

const compileTagMatrix = (section, errors, path) => {
  const tabs = asArray(section.tabs).map((item) =>
    typeof item === 'string' ? item.trim() : textOrEmpty(item?.label || item?.title),
  );

  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      tabs,
      activeTab: textOrEmpty(section.activeTab) || tabs[0] || '',
      items: normalizeTagItems(section.items || section.tags || section.modules, errors, `${path}.items`),
    },
  };
};

const compileCode = (section, errors, path) => {
  const highlightLine =
    Number.isFinite(section.highlightLine) && Number(section.highlightLine) > 0
      ? Math.round(Number(section.highlightLine))
      : undefined;
  const lines = normalizeCodeLines(section.lines || section.code, highlightLine);

  if (lines.length === 0) {
    errors.push(`${path}.lines: expected a non-empty array or string`);
  }

  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      filename: textOrEmpty(section.filename),
      lines,
      highlightLine,
      footer: textOrEmpty(section.footer || section.subtitle || section.description),
      accent: pickAccent(section.accent, 0, 'purple'),
    },
  };
};

const compileMetrics = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      items: normalizeMetrics(section.metrics || section.items || section.results, errors, `${path}.items`),
    },
  };
};

const compileCta = (section, errors, path) => {
  return {
    data: {
      heading: requireText(errors, `${path}.heading`, section.heading || section.title),
      subtitle: textOrEmpty(section.subtitle || section.description || section.body),
      searchLabel: textOrEmpty(section.searchLabel || section.inputLabel) || '输入你的下一条文案',
      badge: textOrEmpty(section.badge || section.kicker),
    },
  };
};

const FAMILY_COMPILERS = {
  hero: compileHero,
  'feature-rail': compileFeatureRail,
  focus: compileFocus,
  'number-strip': compileNumberStrip,
  'step-flow': compileStepFlow,
  timeline: compileTimeline,
  'compare-board': compileCompareBoard,
  terminal: compileTerminal,
  'evidence-wall': compileEvidenceWall,
  'architecture-map': compileArchitectureMap,
  'tag-matrix': compileTagMatrix,
  code: compileCode,
  metrics: compileMetrics,
  cta: compileCta,
};

export const validateUltimateOutline = (outline) => {
  const errors = [];

  if (!outline || typeof outline !== 'object') {
    return ['outline: expected an object'];
  }

  const sections = asArray(outline.sections || outline.scenes);

  if (sections.length === 0) {
    return ['outline.sections: expected a non-empty array'];
  }

  const ids = new Set();

  sections.forEach((section, index) => {
    const path = `sections[${index}]`;

    if (!section || typeof section !== 'object') {
      errors.push(`${path}: expected an object`);
      return;
    }

    const family = resolveFamily(section);

    if (!family) {
      errors.push(`${path}.kind: unsupported kind or family`);
      return;
    }

    const sceneId = pickSceneId(section, family, index);

    if (ids.has(sceneId)) {
      errors.push(`${path}.id: must be unique`);
    }

    ids.add(sceneId);

    const compiler = FAMILY_COMPILERS[family];
    compiler(section, errors, path);
  });

  return errors;
};

export const compileUltimateOutline = (outline) => {
  const outlineErrors = validateUltimateOutline(outline);

  if (outlineErrors.length > 0) {
    const error = new Error(`Invalid outline:\n- ${outlineErrors.join('\n- ')}`);
    error.errors = outlineErrors;
    throw error;
  }

  const sections = asArray(outline.sections || outline.scenes);
  const config = {
    title: textOrEmpty(outline.title) || 'Ultimate Scene Project',
    defaultPlatformOverlay:
      outline.defaultPlatformOverlay === false || outline.platformOverlay === false
        ? false
        : {
            brand:
              textOrEmpty(outline.defaultPlatformOverlay?.brand || outline.platformOverlay?.brand || outline.brand) ||
              'SceneLab',
            account:
              textOrEmpty(
                outline.defaultPlatformOverlay?.account || outline.platformOverlay?.account || outline.account,
              ) || '@your-brand',
            searchLabel:
              textOrEmpty(
                outline.defaultPlatformOverlay?.searchLabel ||
                  outline.platformOverlay?.searchLabel ||
                  outline.searchLabel,
              ) || 'Search reusable scenes',
            watermark:
              textOrEmpty(
                outline.defaultPlatformOverlay?.watermark || outline.platformOverlay?.watermark || outline.watermark,
              ) || '1080p',
          },
    defaultTransition:
      outline.defaultTransition === false || outline.transition === false
        ? false
        : {
            preset: textOrEmpty(outline.defaultTransition?.preset || outline.transition?.preset) || 'lift',
            durationInFrames:
              Number.isFinite(outline.defaultTransition?.durationInFrames) ||
              Number.isFinite(outline.transition?.durationInFrames)
                ? Math.round(
                    Number(outline.defaultTransition?.durationInFrames ?? outline.transition?.durationInFrames),
                  )
                : 12,
            ...(textOrEmpty(outline.defaultTransition?.color || outline.transition?.color)
              ? {color: textOrEmpty(outline.defaultTransition?.color || outline.transition?.color)}
              : {}),
          },
    scenes: sections.map((section, index) => {
      const family = resolveFamily(section);
      const compiler = FAMILY_COMPILERS[family];
      const compiled = compiler(section, [], `sections[${index}]`);

      return {
        id: pickSceneId(section, family, index),
        family,
        subtitle: textOrEmpty(section.subtitle),
        durationInFrames:
          Number.isFinite(section.durationInFrames) && Number(section.durationInFrames) > 0
            ? Math.round(Number(section.durationInFrames))
            : undefined,
        warm: Boolean(section.warm),
        showGrid: Boolean(section.showGrid),
        overlay: section.overlay === false ? false : section.overlay,
        transition: section.transition === false ? false : section.transition,
        ...compiled,
      };
    }),
  };

  const configErrors = validateUltimateConfig(config);

  if (configErrors.length > 0) {
    const error = new Error(`Compiled config is invalid:\n- ${configErrors.join('\n- ')}`);
    error.errors = configErrors;
    throw error;
  }

  return config;
};
