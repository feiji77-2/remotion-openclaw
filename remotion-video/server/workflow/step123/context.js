function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truncate(text, max = 160) {
  const safe = String(text || '').trim();
  return safe.length > max ? `${safe.slice(0, max - 1)}…` : safe;
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripHtml(text) {
  return decodeEntities(String(text || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlValue(block, tagName) {
  const match = String(block || '').match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match ? decodeEntities(match[1].trim()) : '';
}

function parseBingRssItems(xmlText) {
  return [...String(xmlText || '').matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const block = match[1];
      return {
        title: stripHtml(extractXmlValue(block, 'title')),
        link: stripHtml(extractXmlValue(block, 'link')),
        snippet: truncate(stripHtml(extractXmlValue(block, 'description')), 180),
        publishedAt: stripHtml(extractXmlValue(block, 'pubDate')),
      };
    })
    .filter((item) => item.title || item.snippet);
}

function buildSearchTerms(query) {
  const terms = new Map();
  const rawParts = String(query || '')
    .toLowerCase()
    .replace(/[“”"'‘’]+/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  for (const part of rawParts) {
    const segments = part.match(/[\p{Script=Han}]+|[\p{L}\p{N}]+/gu) || [];
    for (const segment of segments) {
      if (/^[\p{Script=Han}]+$/u.test(segment)) {
        if (segment.length >= 2) {
          terms.set(segment, Math.max(terms.get(segment) || 0, Math.min(4, segment.length)));
        }
        for (let index = 0; index < segment.length - 1; index += 1) {
          const bigram = segment.slice(index, index + 2);
          if (bigram.length === 2) {
            terms.set(bigram, Math.max(terms.get(bigram) || 0, 2));
          }
        }
      } else {
        terms.set(segment, Math.max(terms.get(segment) || 0, segment.length >= 3 ? 2 : 1));
      }
    }
  }

  return [...terms.entries()].map(([value, weight]) => ({value, weight}));
}

function normalizeSearchText(value) {
  return stripHtml(String(value || ''))
    .toLowerCase()
    .replace(/[“”"'‘’]+/g, ' ')
    .replace(/[^\p{L}\p{N}.+-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactSearchToken(value) {
  return stripHtml(String(value || ''))
    .toLowerCase()
    .replace(/[“”"'‘’]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function inferModelSearchHint(query) {
  const safe = String(query || '').trim();
  if (!safe) {
    return null;
  }

  const mappings = [
    {
      pattern: /\bgpt\s*[- ]?(\d+(?:\.\d+)+)\b/i,
      vendor: 'OpenAI',
      buildLabel: (version) => `GPT-${version}`,
    },
    {
      pattern: /\bclaude(?:\s+([a-z0-9.+-]+(?:\s+\d+(?:\.\d+)*)?))?\b/i,
      vendor: 'Anthropic',
      buildLabel: (variant) => (variant ? `Claude ${variant}` : 'Claude'),
    },
    {
      pattern: /\bgemini(?:\s+([a-z0-9.+-]+(?:\s+\d+(?:\.\d+)*)?))?\b/i,
      vendor: 'Google',
      buildLabel: (variant) => (variant ? `Gemini ${variant}` : 'Gemini'),
    },
    {
      pattern: /\bdeepseek(?:\s+([a-z0-9.+-]+))?\b/i,
      vendor: 'DeepSeek',
      buildLabel: (variant) => (variant ? `DeepSeek ${variant}` : 'DeepSeek'),
    },
    {
      pattern: /\bkimi\s*k?\s*[- ]?(\d+(?:\.\d+)+)\b/i,
      vendor: 'Moonshot',
      buildLabel: (version) => `Kimi ${version}`,
    },
    {
      pattern: /\bqwen(?:\s+([a-z0-9.+-]+))?\b/i,
      vendor: 'Alibaba',
      buildLabel: (variant) => (variant ? `Qwen ${variant}` : 'Qwen'),
    },
    {
      pattern: /\bllama(?:\s+([a-z0-9.+-]+))?\b/i,
      vendor: 'Meta',
      buildLabel: (variant) => (variant ? `Llama ${variant}` : 'Llama'),
    },
  ];

  for (const mapping of mappings) {
    const match = safe.match(mapping.pattern);
    if (!match) {
      continue;
    }

    const variant = String(match[1] || '').trim().replace(/\s+/g, ' ');
    const modelLabel = mapping.buildLabel(variant).trim();
    if (!modelLabel) {
      continue;
    }

    return {
      vendor: mapping.vendor,
      modelLabel,
    };
  }

  return null;
}

function buildAnchorTokens(query) {
  const rawTokens = String(query || '').match(/[A-Za-z0-9][A-Za-z0-9.+-]*/g) || [];
  const stopwords = new Set(['ai']);
  const seen = new Set();
  const anchors = [];

  for (const token of rawTokens) {
    const normalized = token.toLowerCase().trim();
    if (!normalized || stopwords.has(normalized)) {
      continue;
    }
    if (!(normalized.length >= 3 || /\d/.test(normalized))) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    anchors.push(normalized);
  }

  return anchors.slice(0, 4);
}

function buildSearchQueries(query) {
  const normalizedQuery = String(query || '').trim();
  const queries = new Set();
  const anchorTokens = buildAnchorTokens(normalizedQuery);
  const modelHint = inferModelSearchHint(normalizedQuery);
  const isAiTechnicalQuery = /(openai|chatgpt|gpt|claude|anthropic|gemini|deepseek|kimi|moonshot|llama|qwen|模型|大模型|ai|llm)/i.test(normalizedQuery);
  const isReleaseQuery = /(发布|上线|更新|升级|release|launch|preview|beta|版本)/i.test(normalizedQuery);

  if (modelHint?.vendor && modelHint?.modelLabel) {
    queries.add(`${modelHint.vendor} ${modelHint.modelLabel}`);
    queries.add(`${modelHint.vendor} ${modelHint.modelLabel} 官方`);
    queries.add(`${modelHint.vendor} ${modelHint.modelLabel} release notes`);
  }

  if (modelHint?.modelLabel) {
    queries.add(modelHint.modelLabel);
    queries.add(`${modelHint.modelLabel} 官方`);
  }

  if (normalizedQuery) {
    queries.add(normalizedQuery);
  }

  if (anchorTokens.length >= 2) {
    queries.add(anchorTokens.slice(0, 2).join(' '));
    queries.add(`${anchorTokens.slice(0, 2).join(' ')} 官方`);
  }

  if (anchorTokens.length >= 3) {
    queries.add(anchorTokens.slice(0, 3).join(' '));
  }

  if (isAiTechnicalQuery) {
    queries.add(`${normalizedQuery} 官方`);
    queries.add(`${normalizedQuery} benchmark`);
    queries.add(`${normalizedQuery} API`);
  }

  if (isAiTechnicalQuery && isReleaseQuery) {
    queries.add(`${normalizedQuery} release notes`);
    queries.add(`${normalizedQuery} 开发者`);
    if (modelHint?.vendor && modelHint?.modelLabel) {
      queries.add(`${modelHint.vendor} ${modelHint.modelLabel} benchmark`);
      queries.add(`${modelHint.vendor} ${modelHint.modelLabel} API`);
      queries.add(`${modelHint.vendor} ${modelHint.modelLabel} 开发者`);
    }
  }

  return [...queries].filter(Boolean).slice(0, 10);
}

function scoreSearchResult(item, terms, anchorTokens = []) {
  const haystack = normalizeSearchText(`${item?.title || ''} ${item?.snippet || ''}`);
  const compactHaystack = compactSearchToken(haystack);
  let score = 0;
  let matches = 0;
  let anchorMatches = 0;

  for (const term of terms) {
    const normalizedTerm = String(term.value || '').toLowerCase();
    const compactTerm = compactSearchToken(term.value);
    if (
      (normalizedTerm && haystack.includes(normalizedTerm))
      || (compactTerm && compactHaystack.includes(compactTerm))
    ) {
      score += term.weight;
      matches += 1;
    }
  }

  for (const token of anchorTokens) {
    const compactToken = compactSearchToken(token);
    if (
      (token && haystack.includes(token))
      || (compactToken && compactHaystack.includes(compactToken))
    ) {
      anchorMatches += 1;
    }
  }

  return {score, matches, anchorMatches};
}

function getInputTopic(input) {
  const pipeline = input?.pipelineState && typeof input.pipelineState === 'object'
    ? input.pipelineState
    : {};
  const projectName = input?.projectState?.name;
  const candidates = [
    pipeline.inputTitleKeywords,
    pipeline.inputTopic,
    projectName && projectName !== '未命名项目' ? projectName : '',
  ];

  return candidates
    .map((value) => String(value || '').trim())
    .find(Boolean) || '';
}

function getCurrentStepPayload(stepId, input) {
  const pipeline = input?.pipelineState && typeof input.pipelineState === 'object'
    ? input.pipelineState
    : {};

  if (stepId === 1) return pipeline.analysis || null;
  if (stepId === 2) return pipeline.titles || null;
  if (stepId === 3) return pipeline.copy || null;
  return null;
}

function summarizeStepPayload(stepId, payload) {
  if (!payload) {
    return '';
  }

  if (stepId === 1) {
    const layers = Array.isArray(payload.layers) ? payload.layers.map((item) => item.label).filter(Boolean).slice(0, 4) : [];
    return truncate(`主命题：${payload.thesis || ''}；受众：${payload.audience || ''}；逻辑层：${layers.join(' / ')}`, 320);
  }

  if (stepId === 2) {
    const options = Array.isArray(payload.options) ? payload.options.map((item) => item.title).filter(Boolean).slice(0, 5) : [];
    return truncate(`当前标题池：${options.join(' / ')}；当前主标题：${payload.selectedId || ''}`, 320);
  }

  if (stepId === 3) {
    const body = Array.isArray(payload.body) ? payload.body.map((item) => item.label || item.text).filter(Boolean).slice(0, 3) : [];
    return truncate(`Hook：${payload.hook || ''}；主体：${body.join(' / ')}；CTA：${payload.cta || ''}`, 320);
  }

  return truncate(JSON.stringify(payload), 320);
}

function normalizeGenerationMeta(stepId, input) {
  const raw = input?.generationMeta && typeof input.generationMeta === 'object'
    ? input.generationMeta
    : {};
  const previousPayload = raw.previousPayload && typeof raw.previousPayload === 'object'
    ? clone(raw.previousPayload)
    : getCurrentStepPayload(stepId, input);

  return {
    mode: raw.mode === 'regenerate' ? 'regenerate' : 'generate',
    trigger: raw.trigger === 'manual' ? 'manual' : 'auto',
    attempt: Math.max(0, Math.round(toNumber(raw.attempt, 0))),
    previousPayload,
    previousOutputSummary: summarizeStepPayload(stepId, previousPayload),
  };
}

function normalizeTopicResearch(candidateResearch, input) {
  const current = input?.pipelineState?.topicResearch && typeof input.pipelineState.topicResearch === 'object'
    ? clone(input.pipelineState.topicResearch)
    : {};
  const incoming = candidateResearch && typeof candidateResearch === 'object'
    ? candidateResearch
    : {};

  const query = String(incoming.query || current.query || getInputTopic(input) || '').trim();
  const resultsSource = Array.isArray(incoming.results) && incoming.results.length > 0
    ? incoming.results
    : (Array.isArray(current.results) ? current.results : []);

  const results = resultsSource
    .slice(0, 5)
    .map((item) => ({
      title: truncate(stripHtml(item?.title), 96),
      link: String(item?.link || '').trim(),
      snippet: truncate(stripHtml(item?.snippet || item?.description), 180),
      publishedAt: String(item?.publishedAt || item?.pubDate || '').trim(),
    }))
    .filter((item) => item.title || item.snippet);

  if (!query || results.length === 0) {
    return {};
  }

  return {
    topicResearch: {
      query,
      source: String(incoming.source || current.source || 'bing-rss').trim(),
      fetchedAt: String(incoming.fetchedAt || current.fetchedAt || new Date().toISOString()).trim(),
      results,
    },
  };
}

async function fetchTopicResearchOnce(query) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return [];
  }

  const response = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(normalizedQuery)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) OpenClaw/1.0',
      'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const xml = await response.text();
  return parseBingRssItems(xml);
}

async function searchTopicResearch(query) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return null;
  }

  const queries = buildSearchQueries(normalizedQuery);
  const mergedResults = [];

  for (const currentQuery of queries) {
    try {
      const items = await fetchTopicResearchOnce(currentQuery);
      mergedResults.push(
        ...items.map((item) => ({
          ...item,
          sourceQuery: currentQuery,
        })),
      );
    } catch (error) {
      continue;
    }
  }

  const rawResults = [];
  const seen = new Set();
  for (const item of mergedResults) {
    const key = `${String(item?.link || '').trim()}|${String(item?.title || '').trim()}`.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    rawResults.push(item);
  }

  const terms = buildSearchTerms(normalizedQuery);
  const anchorTokens = buildAnchorTokens(normalizedQuery);
  const strongTokenCount = terms.filter((term) => term.weight >= 2).length;
  const minScore = strongTokenCount <= 2 ? 3 : 4;
  const minAnchorMatches = anchorTokens.length >= 2 ? 2 : anchorTokens.length;
  const scoredResults = rawResults
    .map((item) => ({
      ...item,
      ...scoreSearchResult(item, terms, anchorTokens),
    }))
    .filter((item) => {
      const anchorPass = minAnchorMatches === 0 ? true : item.anchorMatches >= minAnchorMatches;
      return anchorPass && (item.score >= minScore || item.matches >= 3 || item.anchorMatches >= minAnchorMatches);
    })
    .sort((left, right) => right.anchorMatches - left.anchorMatches || right.score - left.score || right.matches - left.matches);
  const results = (terms.length > 0 ? scoredResults : rawResults)
    .slice(0, 5)
    .map(({title, link, snippet, publishedAt}) => ({title, link, snippet, publishedAt}));

  if (results.length === 0) {
    return null;
  }

  return {
    query: normalizedQuery,
    source: 'bing-rss',
    fetchedAt: new Date().toISOString(),
    results,
  };
}

function buildStep123Context(stepId, input) {
  const shots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const pipeline = input.pipelineState && typeof input.pipelineState === 'object'
    ? input.pipelineState
    : {};
  const project = input.projectState && typeof input.projectState === 'object'
    ? input.projectState
    : {};
  const generation = normalizeGenerationMeta(stepId, input);
  const topicQuery = getInputTopic(input);
  const topicResearch = normalizeTopicResearch(pipeline.topicResearch, input).topicResearch || null;
  const titlesOptions = Array.isArray(pipeline.titles?.options) ? pipeline.titles.options : [];
  const selectedTitle = titlesOptions.find((item) => item.id === pipeline.selectedTitleId) || null;
  const rawStepSkills = pipeline.stepSkills && typeof pipeline.stepSkills === 'object'
    ? pipeline.stepSkills
    : {};
  const currentStepSkill = rawStepSkills[stepId] && typeof rawStepSkills[stepId] === 'object'
    ? rawStepSkills[stepId]
    : null;

  return {
    generation,
    topic: {
      query: topicQuery,
      inputTopic: String(pipeline.inputTopic || '').trim(),
      inputTitleKeywords: String(pipeline.inputTitleKeywords || '').trim(),
    },
    project: {
      id: project.id || 'default',
      name: project.name || '未命名项目',
      fps: project.fps || 30,
      width: project.width || 1920,
      height: project.height || 1080,
    },
    shots: shots.map((shot) => ({
      id: shot.id,
      title: shot.title,
      narration: shot.narration,
      durationSeconds: shot.durationSeconds,
      startFrame: shot.startFrame,
    })),
    pipeline: {
      analysis: pipeline.analysis || null,
      selectedAnalysis: pipeline.selectedAnalysis || null,
      titles: pipeline.titles || null,
      copy: pipeline.copy || null,
      selectedTitleId: pipeline.selectedTitleId || null,
      selectedTitle: selectedTitle ? {
        id: selectedTitle.id,
        title: selectedTitle.title,
        angle: selectedTitle.angle,
        rationale: selectedTitle.rationale,
        evidenceAnchor: selectedTitle.evidenceAnchor,
        hookStyle: selectedTitle.hookStyle,
      } : null,
      stepSkills: rawStepSkills,
      currentStepSkill,
      topicResearch,
    },
  };
}

module.exports = {
  __private: {
    buildAnchorTokens,
    buildSearchQueries,
    buildSearchTerms,
    compactSearchToken,
    inferModelSearchHint,
    scoreSearchResult,
  },
  buildStep123Context,
  clone,
  getInputTopic,
  normalizeTopicResearch,
  normalizeGenerationMeta,
  searchTopicResearch,
  stripHtml,
  truncate,
};
