const {generateStep123Workflow} = require('./step123/pipeline');
const {
  DEFAULT_MODEL,
  generateStructuredJson,
  getWorkflowLLMCapabilities,
  hasWorkflowLLM,
} = require('./step123/llm');
const { ensureStepSkillReady, enrichStepResult } = require('./skillRegistry');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

  return [...terms.entries()].map(([value, weight]) => ({ value, weight }));
}

function normalizeSearchText(value) {
  return stripHtml(String(value || ''))
    .toLowerCase()
    .replace(/[“”"'‘’]+/g, ' ')
    .replace(/[^\p{L}\p{N}.+-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  return [...queries].filter(Boolean).slice(0, 4);
}

function scoreSearchResult(item, terms, anchorTokens = []) {
  const haystack = normalizeSearchText(`${item?.title || ''} ${item?.snippet || ''}`);
  let score = 0;
  let matches = 0;
  let anchorMatches = 0;

  for (const term of terms) {
    if (term.value && haystack.includes(term.value.toLowerCase())) {
      score += term.weight;
      matches += 1;
    }
  }

  for (const token of anchorTokens) {
    if (token && haystack.includes(token)) {
      anchorMatches += 1;
    }
  }

  return { score, matches, anchorMatches };
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

  const dedupedResults = [];
  const seen = new Set();
  for (const item of mergedResults) {
    const key = `${String(item?.link || '').trim()}|${String(item?.title || '').trim()}`.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    dedupedResults.push(item);
  }

  const rawResults = dedupedResults;
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
    .map(({ title, link, snippet, publishedAt }) => ({ title, link, snippet, publishedAt }));

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

function getStepDescription(stepId) {
  return {
    1: '逻辑分析',
    2: '标题生成',
    3: '内容生成',
    4: '场景编排',
    5: '视觉提示词',
    6: '配音脚本',
    7: 'Remotion 项目生成',
    8: '视频渲染设置',
  }[stepId] || `步骤 ${stepId}`;
}

function normalizeStepSkillConfig(skill) {
  const safe = skill && typeof skill === 'object' ? skill : {};
  return {
    presetId: String(safe.presetId || '').trim(),
    presetLabel: String(safe.presetLabel || '').trim(),
    goal: String(safe.goal || '').trim(),
    style: String(safe.style || '').trim(),
    emphasis: String(safe.emphasis || '').trim(),
    avoid: String(safe.avoid || '').trim(),
    notes: String(safe.notes || '').trim(),
  };
}

function buildStepSkillInstruction(stepId, context) {
  const skill = normalizeStepSkillConfig(context?.pipeline?.currentStepSkill);
  const fragments = [];

  if (skill.goal) fragments.push(`goal：${skill.goal}`);
  if (skill.style) fragments.push(`style：${skill.style}`);
  if (skill.emphasis) fragments.push(`emphasis：${skill.emphasis}`);
  if (skill.avoid) fragments.push(`avoid：${skill.avoid}`);
  if (skill.notes) fragments.push(`notes：${skill.notes}`);

  if (fragments.length === 0) {
    return '';
  }

  return `当前步骤还有结构化 skill 约束，你必须优先满足：${fragments.join('；')}。`;
}

function getCurrentStepSkillFromInput(stepId, input) {
  const rawStepSkills = input?.pipelineState?.stepSkills && typeof input.pipelineState.stepSkills === 'object'
    ? input.pipelineState.stepSkills
    : {};
  return normalizeStepSkillConfig(rawStepSkills?.[stepId]);
}

function getWorkflowCapabilities() {
  return getWorkflowLLMCapabilities();
}

function getStepCurrentPayload(stepId, input) {
  const pipeline = input?.pipelineState && typeof input.pipelineState === 'object'
    ? input.pipelineState
    : {};
  const shots = Array.isArray(input?.shotsState) ? input.shotsState : [];

  if (stepId === 1) return pipeline.analysis || null;
  if (stepId === 2) return pipeline.titles || null;
  if (stepId === 3) return pipeline.copy || null;
  if (stepId === 4) return shots;
  if (stepId === 5) return pipeline.prompts || null;
  if (stepId === 6) return pipeline.voice || null;
  if (stepId === 7) return pipeline.projectBuild || null;
  if (stepId === 8) return pipeline.render || null;
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

  if (stepId === 4) {
    const shots = Array.isArray(payload) ? payload.slice(0, 6).map((shot) => `${shot.title || shot.id}(${shot.durationSeconds || 0}s)`) : [];
    return truncate(`当前场景：${shots.join(' / ')}`, 320);
  }

  if (stepId === 5) {
    const byShotId = payload.byShotId && typeof payload.byShotId === 'object' ? payload.byShotId : {};
    const prompts = Object.entries(byShotId)
      .slice(0, 3)
      .map(([shotId, item]) => `${shotId}:${truncate(item?.prompt || '', 48)}`);
    return truncate(`当前视觉提示词：${prompts.join(' / ')}`, 320);
  }

  if (stepId === 6) {
    const script = Array.isArray(payload.script) ? payload.script.slice(0, 3).map((item) => truncate(item.text || '', 36)) : [];
    return truncate(`预设：${payload.preset || ''}；脚本：${script.join(' / ')}`, 320);
  }

  if (stepId === 7) {
    return truncate(`项目：${payload.projectPath || ''}；Composition：${payload.compositionId || ''}；状态：${payload.buildStatus || ''}`, 320);
  }

  if (stepId === 8) {
    return truncate(`模板：${payload.template || ''}；质量：${payload.quality || ''}；说明：${payload.notes || ''}`, 320);
  }

  return truncate(JSON.stringify(payload), 320);
}

function normalizeGenerationMeta(stepId, input) {
  const raw = input?.generationMeta && typeof input.generationMeta === 'object'
    ? input.generationMeta
    : {};
  const previousPayload = raw.previousPayload && typeof raw.previousPayload === 'object'
    ? clone(raw.previousPayload)
    : getStepCurrentPayload(stepId, input);

  return {
    mode: raw.mode === 'regenerate' ? 'regenerate' : 'generate',
    trigger: raw.trigger === 'manual' ? 'manual' : 'auto',
    attempt: Math.max(0, Math.round(toNumber(raw.attempt, 0))),
    previousOutputSummary: summarizeStepPayload(stepId, previousPayload),
  };
}

function normalizeWorkflowShotContext(shot) {
  return {
    id: shot?.id,
    title: shot?.title,
    narration: shot?.narration,
    durationSeconds: shot?.durationSeconds,
    startFrame: shot?.startFrame,
    level: shot?.level,
    type: shot?.type,
    family: shot?.family,
    sceneFamily: shot?.sceneFamily,
    sceneIntent: shot?.sceneIntent,
    evidenceAnchor: shot?.evidenceAnchor,
    transitionToNext: shot?.transitionToNext,
    templateCandidates: Array.isArray(shot?.templateCandidates) ? shot.templateCandidates : [],
    dataPoints: Array.isArray(shot?.dataPoints) ? shot.dataPoints : [],
    keywords: Array.isArray(shot?.keywords) ? shot.keywords : [],
    comparisons: Array.isArray(shot?.comparisons) ? shot.comparisons : [],
    scriptRole: shot?.scriptRole,
    scriptBlockId: shot?.scriptBlockId,
    scriptBlockLabel: shot?.scriptBlockLabel,
    scriptSourceText: shot?.scriptSourceText,
    scriptExcerpt: shot?.scriptExcerpt,
    storyboardCueZh: shot?.storyboardCueZh,
    visual: shot?.visual && typeof shot.visual === 'object'
      ? {
          description: shot.visual.description,
          focus: shot.visual.focus,
        }
      : null,
  };
}

function buildWorkflowContext(stepId, input) {
  const shots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const pipeline = input.pipelineState && typeof input.pipelineState === 'object'
    ? input.pipelineState
    : {};
  const project = input.projectState && typeof input.projectState === 'object'
    ? input.projectState
    : {};

  const titlesOptions = Array.isArray(pipeline.titles?.options) ? pipeline.titles.options : [];
  const selectedTitle = titlesOptions.find((item) => item.id === pipeline.selectedTitleId) || null;
  const topicResearch = normalizeTopicResearch(pipeline.topicResearch, input).topicResearch || null;
  const topicQuery = getInputTopic(input);
  const generation = normalizeGenerationMeta(stepId, input);
  const rawStepSkills = pipeline.stepSkills && typeof pipeline.stepSkills === 'object'
    ? pipeline.stepSkills
    : {};
  const currentStepSkill = normalizeStepSkillConfig(rawStepSkills?.[stepId]);

  return {
    generation,
    topic: {
      query: topicQuery,
      inputTopic: String(pipeline.inputTopic || '').trim(),
      inputTitleKeywords: String(pipeline.inputTitleKeywords || '').trim(),
      researchSummary: topicResearch
        ? topicResearch.results.map((item, index) => `${index + 1}. ${item.title}｜${item.snippet}`).join('\n')
        : '',
    },
    project: {
      id: project.id || 'default',
      name: project.name || '未命名项目',
      fps: project.fps || 30,
      width: project.width || 1920,
      height: project.height || 1080,
    },
    shots: shots.map((shot) => normalizeWorkflowShotContext(shot)),
    pipeline: {
      analysis: pipeline.analysis || null,
      titles: pipeline.titles || null,
      copy: pipeline.copy || null,
      prompts: pipeline.prompts || null,
      voice: pipeline.voice || null,
      synthesis: pipeline.synthesis || null,
      projectBuild: pipeline.projectBuild || null,
      render: pipeline.render || null,
      selectedAnalysis: pipeline.selectedAnalysis || null,
      selectedTitleId: pipeline.selectedTitleId || null,
      inputTopic: String(pipeline.inputTopic || '').trim(),
      inputTitleKeywords: String(pipeline.inputTitleKeywords || '').trim(),
      topicResearch,
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
    },
  };
}

function buildStepSchemaPrompt(stepId, context) {
  const shotShape = context.shots.map((shot) => ({
    id: shot.id,
    title: shot.title,
    narration: shot.narration,
    durationSeconds: shot.durationSeconds,
  }));

  const sharedInstructions = [
    `你是短视频工作流里的内容导演，正在生成“${getStepDescription(stepId)}”步骤的数据。`,
    '你必须返回严格 JSON，不要返回 markdown，不要解释。',
    '输出要适合中文短视频工作流，风格要具体、能执行、可编辑。',
    '不要改动 shot id。',
    stepId === 1
      ? '必须优先围绕用户输入的标题关键词与搜索到的相关内容生成逻辑分析；如果搜索结果有噪音，只提炼共同主题和有效线索，不要照抄搜索标题。'
      : '如果上下文里有标题关键词和相关搜索摘要，请把它们当作事实线索辅助生成。',
    context.generation?.mode === 'regenerate'
      ? `这是第 ${context.generation.attempt} 次重新生成。你必须输出与上一版明显不同的新版本，至少改变切入角度、结构顺序、措辞风格中的两项。`
      : '首次生成时优先给出可直接进入下一步的高质量初稿。',
    context.generation?.mode === 'regenerate'
      ? ({
        1: '新的逻辑分析不能沿用上一版 thesis 的句式，必须换一个问题框架或解释路径。',
        2: '新的标题池必须和上一版明显不同，优先输出不同角度和不同主标题，不要只替换少量词语。',
        3: '新的文案必须换 Hook 句式和主体推进顺序，不要只是润色上一版。',
        4: '新的场景编排必须调整 scene family、叙事节奏或场景组织方式，不要只改个别词语。',
        5: '新的视觉提示词必须换构图、scene family、视觉焦点或氛围设定，不要只替换单个形容词。',
        6: '新的配音脚本必须调整话术节奏、语气或重音安排，不要只做同义改写。',
        8: '新的渲染建议必须给出不同的模板或质量侧重点，不要重复上一版组合。',
      }[stepId] || '新的结果必须与上一版明显不同。')
      : '如果当前步骤已有旧结果，只把它当作上下文参考，不要被旧表述绑死。',
    context.generation?.previousOutputSummary
      ? `上一版摘要：${context.generation.previousOutputSummary}`
      : '',
    stepId === 4
      ? 'Step 4 必须以 copy.hook / copy.body / copy.cta 为分镜真源。每个中段场景都要能回指到具体口播段落或句子，不要只围绕标题造泛镜头。'
      : '',
    stepId === 5
      ? 'Step 5 的每条视觉提示词必须服务对应 shot 的 narration / sceneIntent / dataPoints / scriptExcerpt。画面要解释这句口播，不要退回标题海报式插图。'
      : '',
    buildStepSkillInstruction(stepId, context),
  ].join('\n');

  const schemas = {
    1: {
      description: '生成逻辑分析结果。',
      shape: {
        analysis: {
          thesis: 'string',
          audience: 'string',
          corePromise: 'string',
          layers: [
            { id: 'keep existing ids if possible', label: 'string', insight: 'string', evidence: 'string' },
          ],
          process: [
            { id: 'optional', label: 'string', detail: 'string' },
          ],
        },
      },
    },
    2: {
      description: '生成标题候选与预选理由。',
      shape: {
        titles: {
          options: [
            { title: 'string', angle: 'string', score: '0-100 number' },
          ],
          selectedIndex: 'number',
          selectedReason: 'string',
        },
        projectName: 'string',
      },
    },
    3: {
      description: '生成 hook / body / cta 文案。',
      shape: {
        copy: {
          hook: 'string',
          body: [
            { label: 'string', text: 'string' },
          ],
          cta: 'string',
        },
      },
    },
    4: {
      description: '生成 Ultimate 场景编排结果，保持 shot id 不变，并补充 sceneFamily / templateCandidates / 横版结构信息。',
      shape: {
        shots: shotShape.map((shot) => ({
          id: shot.id,
          title: 'string',
          narration: 'string',
          durationSeconds: 'number',
          level: 'string',
          type: 'string',
          sceneFamily: 'string',
          sceneIntent: 'string',
          evidenceAnchor: 'string',
          scriptBlockId: 'string',
          scriptBlockLabel: 'string',
          scriptExcerpt: 'string',
          storyboardCueZh: 'string',
          templateCandidates: ['string'],
          dataPoints: ['string'],
          keywords: ['string'],
        })),
      },
    },
    5: {
      description: '生成每个场景对应的 16:9 横版视觉提示词。',
      shape: {
        prompts: {
          byShotId: Object.fromEntries(shotShape.map((shot) => [
            shot.id,
            {
              prompt: 'string',
              promptZh: 'string',
              negativePrompt: 'string',
              negativePromptZh: 'string',
              style: 'string',
              mood: 'string',
              visualFocus: 'string',
              visualFocusZh: 'string',
              visualSummaryZh: 'string',
              sceneFamily: 'string',
              sceneIntent: 'string',
              evidenceAnchor: 'string',
              text: 'string',
              scriptBlockId: 'string',
              scriptBlockLabel: 'string',
              scriptExcerpt: 'string',
              storyboardCueZh: 'string',
              templateCandidates: ['string'],
              dataPoints: ['string'],
              keywords: ['string'],
            },
          ])),
        },
      },
    },
    6: {
      description: '生成配音脚本和全局声音设定。',
      shape: {
        voice: {
          preset: 'string',
          emotion: 'string',
          speed: 'string like 1.0x',
          pauses: 'string',
          shots: shotShape.map((shot) => ({
            id: shot.id,
            text: 'string',
            emotion: 'string',
            emphasis: 'string',
            durationSeconds: 'number',
          })),
        },
      },
    },
    8: {
      description: '生成渲染建议。',
      shape: {
        render: {
          template: 'caption | split | fullscreen | ultimate',
          quality: 'low | medium | high',
        },
      },
    },
  };

  const schema = schemas[stepId];
  if (!schema) {
    throw new Error(`Unsupported workflow step: ${stepId}`);
  }

  return `${sharedInstructions}

任务：${schema.description}

项目上下文：
${JSON.stringify(context, null, 2)}

你必须返回这个 JSON 结构：
${JSON.stringify(schema.shape, null, 2)}`;
}

function normalizeAnalysisPayload(candidate, input) {
  const current = clone(input.pipelineState.analysis || {});
  const next = candidate.analysis && typeof candidate.analysis === 'object' ? candidate.analysis : {};
  const currentLayers = Array.isArray(current.layers) ? current.layers : [];
  const nextLayers = Array.isArray(next.layers) ? next.layers : [];
  const currentProcess = Array.isArray(current.process) ? current.process : [];
  const nextProcess = Array.isArray(next.process) ? next.process : [];
  const mergedLayers = (nextLayers.length > 0 ? nextLayers : currentLayers).slice(0, 4);

  return {
    analysis: {
      thesis: String(next.thesis || current.thesis || '').trim(),
      audience: String(next.audience || current.audience || '').trim(),
      corePromise: String(next.corePromise || current.corePromise || '').trim(),
      layers: mergedLayers.map((layer, index) => {
        const currentLayer = currentLayers[index] || {};
        const incoming = nextLayers[index] || {};
        return {
          id: incoming.id || currentLayer.id || layer.id || `analysis-${index + 1}`,
          label: String(incoming.label || currentLayer.label || layer.label || `逻辑层 ${index + 1}`).trim(),
          insight: String(incoming.insight || currentLayer.insight || layer.insight || '').trim(),
          evidence: String(incoming.evidence || currentLayer.evidence || layer.evidence || '').trim(),
        };
      }),
      process: (nextProcess.length > 0 ? nextProcess : currentProcess).slice(0, 4).map((item, index) => ({
        id: item.id || currentProcess[index]?.id || `analysis-p${index + 1}`,
        label: String(item.label || currentProcess[index]?.label || `步骤 ${index + 1}`).trim(),
        detail: String(item.detail || currentProcess[index]?.detail || '').trim(),
      })),
    },
  };
}

function normalizeTitlesPayload(candidate, input) {
  const current = clone(input.pipelineState.titles || {});
  const nextTitles = candidate.titles && typeof candidate.titles === 'object' ? candidate.titles : {};
  const rawOptions = Array.isArray(nextTitles.options) ? nextTitles.options : [];
  const previousOptions = Array.isArray(current.options) ? current.options : [];

  const normalizedOptions = (rawOptions.length > 0 ? rawOptions : previousOptions)
    .slice(0, 5)
    .map((option, index) => {
      const previous = previousOptions[index] || {};
      const fallbackId = previous.id || `title-${Date.now()}-${index + 1}`;
      return {
        id: String(option.id || previous.id || fallbackId),
        title: String(option.title || previous.title || `标题 ${index + 1}`).trim(),
        angle: String(option.angle || previous.angle || '解释型').trim(),
        score: clamp(Math.round(toNumber(option.score, previous.score || 80)), 0, 100),
      };
    });

  const selectedIndex = clamp(Math.round(toNumber(nextTitles.selectedIndex, 0)), 0, Math.max(0, normalizedOptions.length - 1));
  const requestedSelectedId = input.pipelineState?.selectedTitleId;
  const hasRequestedSelection = requestedSelectedId && normalizedOptions.some((item) => item.id === requestedSelectedId);
  const selectedId = hasRequestedSelection
    ? requestedSelectedId
    : normalizedOptions[selectedIndex]?.id || normalizedOptions[0]?.id || null;

  return {
    titles: {
      ...current,
      options: normalizedOptions,
      selectedId,
      selectedReason: String(nextTitles.selectedReason || current.selectedReason || '').trim(),
    },
    projectName: String(candidate.projectName || normalizedOptions[selectedIndex]?.title || input.projectState.name || '').trim(),
  };
}

function normalizeCopyPayload(candidate, input) {
  const current = clone(input.pipelineState.copy || {});
  const nextCopy = candidate.copy && typeof candidate.copy === 'object' ? candidate.copy : {};
  const currentBody = Array.isArray(current.body) ? current.body : [];
  const nextBody = Array.isArray(nextCopy.body) ? nextCopy.body : [];
  const mergedBody = (nextBody.length > 0 ? nextBody : currentBody)
    .slice(0, Math.max(3, currentBody.length || 3))
    .map((item, index) => ({
      id: currentBody[index]?.id || `copy-${index + 1}`,
      label: String(item.label || currentBody[index]?.label || `段落 ${index + 1}`).trim(),
      text: String(item.text || currentBody[index]?.text || '').trim(),
    }));

  return {
    copy: {
      hook: String(nextCopy.hook || current.hook || '').trim(),
      body: mergedBody,
      cta: String(nextCopy.cta || current.cta || '').trim(),
    },
  };
}

function normalizeShotsPayload(candidate, input) {
  const currentShots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const nextShots = Array.isArray(candidate.shots) ? candidate.shots : [];

  if (nextShots.length > 0) {
    return {
      shots: nextShots.map((shot) => ({
        ...(currentShots.find((item) => item.id === shot.id) || {}),
        ...(shot && typeof shot === 'object' ? shot : {}),
        id: String(shot.id || '').trim() || undefined,
        title: String(shot.title || '').trim(),
        narration: String(shot.narration || '').trim(),
        durationSeconds: Math.max(0.1, toNumber(shot.durationSeconds, 5)),
      })),
    };
  }

  return {
    shots: currentShots.map((shot) => ({
      ...shot,
      title: String(shot.title || '').trim(),
      narration: String(shot.narration || '').trim(),
      durationSeconds: Math.max(0.1, toNumber(shot.durationSeconds, 5)),
    })),
  };
}

function normalizePromptsPayload(candidate, input) {
  const current = clone(input.pipelineState.prompts || {});
  const nextPrompts = candidate.prompts && candidate.prompts.byShotId && typeof candidate.prompts.byShotId === 'object'
    ? candidate.prompts.byShotId
    : {};
  const nextByShotId = {};

  for (const shot of input.shotsState || []) {
    const currentPrompt = current.byShotId?.[shot.id] || {};
    const incoming = nextPrompts[shot.id] || {};
    nextByShotId[shot.id] = {
      ...currentPrompt,
      ...incoming,
      prompt: String(incoming.prompt || currentPrompt.prompt || '').trim(),
      negativePrompt: String(incoming.negativePrompt || currentPrompt.negativePrompt || '').trim(),
      style: String(incoming.style || currentPrompt.style || '').trim(),
      mood: String(incoming.mood || currentPrompt.mood || '').trim(),
      visualFocus: String(incoming.visualFocus || currentPrompt.visualFocus || '').trim(),
      text: String(incoming.text || currentPrompt.text || shot.narration || '').trim(),
      promptZh: String(incoming.promptZh || currentPrompt.promptZh || '').trim(),
      visualSummaryZh: String(incoming.visualSummaryZh || currentPrompt.visualSummaryZh || '').trim(),
      visualFocusZh: String(incoming.visualFocusZh || currentPrompt.visualFocusZh || '').trim(),
      negativePromptZh: String(incoming.negativePromptZh || currentPrompt.negativePromptZh || '').trim(),
      comparisonSummaryZh: String(incoming.comparisonSummaryZh || currentPrompt.comparisonSummaryZh || '').trim(),
      sceneIntent: String(incoming.sceneIntent || currentPrompt.sceneIntent || shot.sceneIntent || '').trim(),
      evidenceAnchor: String(incoming.evidenceAnchor || currentPrompt.evidenceAnchor || shot.evidenceAnchor || '').trim(),
      scriptBlockId: String(incoming.scriptBlockId || currentPrompt.scriptBlockId || shot.scriptBlockId || '').trim(),
      scriptBlockLabel: String(incoming.scriptBlockLabel || currentPrompt.scriptBlockLabel || shot.scriptBlockLabel || '').trim(),
      scriptSourceText: String(incoming.scriptSourceText || currentPrompt.scriptSourceText || shot.scriptSourceText || shot.narration || '').trim(),
      scriptExcerpt: String(incoming.scriptExcerpt || currentPrompt.scriptExcerpt || shot.scriptExcerpt || shot.narration || '').trim(),
      storyboardCueZh: String(incoming.storyboardCueZh || currentPrompt.storyboardCueZh || shot.storyboardCueZh || shot.sceneIntent || '').trim(),
      family: String(incoming.family || incoming.sceneFamily || currentPrompt.family || currentPrompt.sceneFamily || shot.family || shot.sceneFamily || '').trim(),
      sceneFamily: String(incoming.sceneFamily || incoming.family || currentPrompt.sceneFamily || currentPrompt.family || shot.sceneFamily || shot.family || '').trim(),
      templateCandidates: Array.isArray(incoming.templateCandidates)
        ? incoming.templateCandidates
        : Array.isArray(currentPrompt.templateCandidates)
          ? currentPrompt.templateCandidates
          : Array.isArray(shot.templateCandidates)
            ? shot.templateCandidates
            : [],
      canvasRatio: String(incoming.canvasRatio || currentPrompt.canvasRatio || '').trim(),
      canvasWidth: toNumber(incoming.canvasWidth || currentPrompt.canvasWidth, 0),
      canvasHeight: toNumber(incoming.canvasHeight || currentPrompt.canvasHeight, 0),
      visual: incoming.visual || currentPrompt.visual || shot.visual || null,
      dataPoints: Array.isArray(incoming.dataPoints) ? incoming.dataPoints : Array.isArray(currentPrompt.dataPoints) ? currentPrompt.dataPoints : shot.dataPoints,
      comparisons: Array.isArray(incoming.comparisons) ? incoming.comparisons : Array.isArray(currentPrompt.comparisons) ? currentPrompt.comparisons : shot.comparisons,
      keywords: Array.isArray(incoming.keywords) ? incoming.keywords : Array.isArray(currentPrompt.keywords) ? currentPrompt.keywords : shot.keywords,
      imageUrl: String(incoming.imageUrl || currentPrompt.imageUrl || '').trim(),
    };
  }

  return {
    prompts: {
      byShotId: nextByShotId,
    },
  };
}

function normalizeVoicePayload(candidate, input) {
  const currentVoice = clone(input.pipelineState.voice || {});
  const currentShots = Array.isArray(input.shotsState) ? input.shotsState : [];
  const nextVoice = candidate.voice && typeof candidate.voice === 'object' ? candidate.voice : {};
  const nextVoiceShots = Array.isArray(nextVoice.shots) ? nextVoice.shots : [];

  const nextShots = currentShots.map((shot) => {
    const incoming = nextVoiceShots.find((item) => item.id === shot.id) || {};
    const nextText = String(incoming.text || currentVoice.byShotId?.[shot.id]?.text || shot.narration || '').trim();
    return {
      ...shot,
      narration: nextText || shot.narration,
      durationSeconds: Math.max(0.1, toNumber(incoming.durationSeconds, shot.durationSeconds || 5)),
    };
  });

  const byShotId = {};
  nextShots.forEach((shot) => {
    const incoming = nextVoiceShots.find((item) => item.id === shot.id) || {};
    const currentEntry = currentVoice.byShotId?.[shot.id] || {};
    byShotId[shot.id] = {
      text: shot.narration,
      emotion: String(incoming.emotion || currentEntry.emotion || nextVoice.emotion || '').trim(),
      emphasis: String(incoming.emphasis || currentEntry.emphasis || shot.title || '').trim(),
      durationSeconds: Math.max(0.1, toNumber(incoming.durationSeconds, currentEntry.durationSeconds || shot.durationSeconds)),
    };
  });

  // Build script array from nextVoiceShots (for display)
  const script = nextVoiceShots.map((vs) => ({
    shotId: vs.id,
    text: String(vs.text || '').trim(),
    duration: Math.max(0.1, toNumber(vs.durationSeconds, 5)),
  }));
  const totalDuration = script.reduce((s, v) => s + v.duration, 0);
  const totalChars = script.reduce((s, v) => s + v.text.length, 0);

  return {
    voice: {
      preset: String(nextVoice.preset || currentVoice.preset || '').trim(),
      engine: String(nextVoice.engine || currentVoice.engine || 'qwen-tts').trim(),
      language: String(nextVoice.language || currentVoice.language || 'zh-CN').trim(),
      speed: String(nextVoice.speed || currentVoice.speed || '1.0').trim(),
      pitch: toNumber(nextVoice.pitch ?? currentVoice.pitch ?? 0, 0),
      emotion: String(nextVoice.emotion || currentVoice.emotion || '').trim(),
      pauses: String(nextVoice.pauses || currentVoice.pauses || '').trim(),
      byShotId,
      script,
      totalDuration: toNumber(nextVoice.totalDuration || Math.round(totalDuration), 0),
      totalChars: toNumber(nextVoice.totalChars || totalChars, 0),
    },
    shots: nextShots,
  };
}

function normalizeRenderPayload(candidate, input) {
  const current = clone(input.pipelineState.render || {});
  const nextRender = candidate.render && typeof candidate.render === 'object' ? candidate.render : {};

  const template = ['caption', 'split', 'fullscreen', 'ultimate'].includes(nextRender.template)
    ? nextRender.template
    : current.template || 'ultimate';
  const quality = ['low', 'medium', 'high'].includes(nextRender.quality)
    ? nextRender.quality
    : current.quality || 'high';
  const isUltimate = template === 'ultimate';

  // Compute sensible defaults from shots if LLM returned zeros/empties
  const shotsDur = (input.shotsState || []).reduce((s, sh) => s + (sh.durationSeconds || 5), 0);
  const computedDuration = shotsDur || toNumber(nextRender.estimatedDuration, 0);
  const fallbackBitrate = isUltimate ? 12000 : 8000;
  const computedMB = Math.round((toNumber(nextRender.bitrate, fallbackBitrate) * computedDuration / 8) / 1024);

  return {
    render: {
      template,
      quality,
      fps: toNumber(nextRender.fps || current.fps || 30, 30),
      width: toNumber(nextRender.width || current.width || (isUltimate ? 1920 : 1080), isUltimate ? 1920 : 1080),
      height: toNumber(nextRender.height || current.height || (isUltimate ? 1080 : 1920), isUltimate ? 1080 : 1920),
      format: String(nextRender.format || current.format || 'mp4').trim(),
      codec: String(nextRender.codec || current.codec || 'h264').trim(),
      bitrate: toNumber(nextRender.bitrate || current.bitrate || fallbackBitrate, fallbackBitrate),
      estimatedDuration: computedDuration > 0 ? computedDuration : toNumber(current.estimatedDuration, 0),
      estimatedSize: computedMB > 0 ? '~' + computedMB + 'MB' : String(current.estimatedSize || '').trim(),
      notes: (nextRender.notes || current.notes || '').trim() || (
        computedDuration > 0
          ? isUltimate
            ? `${computedDuration}s 横版 1920x1080 Ultimate 模板，适合结构化讲解和章节化信息视频`
            : `${computedDuration}s 竖屏视频，high 质量发布级输出`
          : ''
      ),
    },
  };
}

function normalizeStepPayload(stepId, candidate, input) {
  if (stepId === 1) {
    return {
      ...normalizeAnalysisPayload(candidate, input),
      ...normalizeTopicResearch(candidate.topicResearch, input),
    };
  }
  if (stepId === 2) {
    return normalizeTitlesPayload(candidate, input);
  }
  if (stepId === 3) {
    return normalizeCopyPayload(candidate, input);
  }
  if (stepId === 4) {
    return normalizeShotsPayload(candidate, input);
  }
  if (stepId === 5) {
    return normalizePromptsPayload(candidate, input);
  }
  if (stepId === 6) {
    return normalizeVoicePayload(candidate, input);
  }
  if (stepId === 8) {
    return normalizeRenderPayload(candidate, input);
  }
  throw new Error(`Unsupported workflow step: ${stepId}`);
}

function buildStep4FallbackProfile(skill, variant) {
  const presetId = skill.presetId || '';

  if (presetId === 'fast-cut') {
    return {
      labels: ['开场钩子', '核心判断', '关键动作', '补充证据', '结果落点', '行动收束'],
      prefixes: ['先抓人：', '立刻给结论：', '马上推进：', '补一条关键证据：', '结果压缩：', '最后收口：'],
      durationBias: -0.4,
      visualStyle: '快切镜头',
    };
  }

  if (presetId === 'comparison-demo') {
    return {
      labels: ['对比入口', '对象 A', '对象 B', '差异解释', '结果判断', '行动选择'],
      prefixes: ['先建立对比：', '先看这一侧：', '再看另一侧：', '把差异摊开：', '结论是：', '最后怎么选：'],
      durationBias: 0.2,
      visualStyle: '对比演示',
    };
  }

  if (presetId === 'list-rhythm') {
    return {
      labels: ['重点 01', '重点 02', '重点 03', '重点 04', '重点 05', '重点 06'],
      prefixes: ['第一点：', '第二点：', '第三点：', '第四点：', '第五点：', '最后一点：'],
      durationBias: 0,
      visualStyle: '清单节奏',
    };
  }

  if (presetId === 'explainer-structure') {
    return {
      labels: ['先给结论', '背景补充', '结构拆解', '关键证据', '价值落点', '最后收束'],
      prefixes: ['结论先说：', '背景补一句：', '结构拆开：', '证据补上：', '价值落地：', '最后收束：'],
      durationBias: 0.3,
      visualStyle: '讲解结构',
    };
  }

  return {
    labels: [
      ['开场问题', '核心结论', '路径拆解', '细节展开', '价值补充', '行动收束'],
      ['先抛结论', '回到背景', '拆成三层', '重点对照', '判断落点', '最后行动'],
      ['问题入场', '信息去噪', '关系展开', '关键证据', '价值总结', '结尾提醒'],
      ['先给观点', '补充线索', '结构重组', '场景说明', '核心判断', '收束动作'],
    ][variant],
    prefixes: [
      ['', '', '', '', '', ''],
      ['先把结论亮出来：', '再回到背景：', '接着拆结构：', '补关键细节：', '最后落判断：', '收成行动：'],
      ['先抛问题：', '再去噪：', '然后展开关系：', '再补证据：', '最后总结：', '顺手提醒：'],
      ['观点先行：', '线索补充：', '结构重排：', '场景落地：', '判断压缩：', '动作收尾：'],
    ][variant],
    durationBias: 0,
    visualStyle: skill.style || skill.presetLabel || '镜头结构',
  };
}

function buildStep5FallbackProfile(skill, variant) {
  const presetId = skill.presetId || '';

  if (presetId === 'real-scene') {
    return {
      style: '真实场景写实',
      mood: ['纪实观察', '真实工作流', '现场感', '可信细节'][variant],
      visualFocus: '人物主体 + 真实空间 + 关键设备',
      negativePrompt: '低质 CG, 漂浮 UI, 假手假脸, 过度霓虹, 夸张特效',
    };
  }

  if (presetId === 'infographic') {
    return {
      style: '信息图解',
      mood: ['理性图解', '结构解释', '信息层次', '说明感'][variant],
      visualFocus: '结构信息 + 标签图层 + 单一焦点',
      negativePrompt: '无信息承载, 画面杂乱, 元素过多, 装饰噪音, 文本不可读',
    };
  }

  if (presetId === 'tech-ui') {
    return {
      style: '科技 UI',
      mood: ['系统感', '高对比面板', '未来工作台', '信息密度'][variant],
      visualFocus: '主界面面板 + 数据层 + 核心操作区',
      negativePrompt: '廉价赛博霓虹, 过曝炫光, 主体缺失, 低端游戏感, 画面脏乱',
    };
  }

  if (presetId === 'high-contrast-cover') {
    return {
      style: '高对比封面',
      mood: ['强封面感', '首屏冲击', '高对比', '主体突出'][variant],
      visualFocus: '单一主体 + 大块留白 + 强对比背景',
      negativePrompt: '焦点分散, 灰雾感, 元素堆叠, 小主体, 平淡光线',
    };
  }

  return {
    style: skill.style || '解释类横版视觉',
    mood: ['信息张力', '冷静拆解', '强对比', '未来感解释'][variant],
    visualFocus: ['主体人物 + 结构信息', '问题标题 + 核心对象', '结论文本 + 对比画面', '产品场景 + 信息层次'][variant],
    negativePrompt: skill.avoid || '模糊主体, 低清晰度, 构图混乱',
  };
}

function createFallbackWorkflowPayload(stepId, input) {
  const shots = Array.isArray(input.shotsState) ? clone(input.shotsState) : [];
  const pipeline = clone(input.pipelineState || {});
  const generation = normalizeGenerationMeta(stepId, input);
  const variant = Math.max(0, (shots.length + stepId + generation.attempt) % 4);
  const currentSkill = getCurrentStepSkillFromInput(stepId, input);
  const topicQuery = getInputTopic(input) || '当前主题';
  const topicResearch = normalizeTopicResearch(pipeline.topicResearch, input).topicResearch || null;
  const researchResults = Array.isArray(topicResearch?.results) ? topicResearch.results : [];
  const primaryTitle = researchResults[0]?.title || topicQuery;
  const primarySnippet = researchResults[0]?.snippet || '';
  const secondaryTitle = researchResults[1]?.title || `${topicQuery} 的相关讨论`;

  if (stepId === 1) {
    return {
      ...normalizeAnalysisPayload({
        analysis: {
          thesis: [
            `围绕“${topicQuery}”做内容，关键不是复述名词，而是把搜索结果里的共性问题、人物关系和场景价值压缩成可讲清楚的结构。`,
            `“${topicQuery}”真正值得讲的，不是单一新闻点，而是它背后的产品动作、用户关注和传播切口。`,
            `如果要把“${topicQuery}”讲成短视频，核心是先从公开讨论里抽出高频焦点，再重组为清晰的叙事顺序。`,
            `“${topicQuery}”适合做内容的原因，在于它已经形成搜索线索，可以直接沉淀为受众、命题和执行结构。`,
          ][variant],
          audience: pipeline.analysis?.audience || `关注“${topicQuery}”的产品用户、行业观察者、AI 从业者与想快速理解事件背景的人`,
          corePromise: [
            `把“${topicQuery}”从零散信息压缩成可讲、可看、可执行的短视频逻辑分析。`,
            `让观众在最短时间内看懂“${topicQuery}”到底发生了什么、为什么值得关注、能得到什么判断。`,
            `基于搜索到的公开线索，输出一套适合后续标题、文案、分镜继续复用的分析骨架。`,
            `先用搜索结果收敛事实面，再把“${topicQuery}”重构成稳定的视频表达框架。`,
          ][variant],
          layers: [
            {
              label: '话题入口',
              insight: `先交代“${topicQuery}”是什么，以及用户为什么会主动搜索它。`,
              evidence: primarySnippet || primaryTitle,
            },
            {
              label: '关注焦点',
              insight: '从搜索结果里提炼高频问题、关键角色或平台关系，避免只停留在表面概念。',
              evidence: secondaryTitle,
            },
            {
              label: '内容切口',
              insight: '把搜索到的事实线索压缩成一个主命题，方便后续标题和 Hook 收敛。',
              evidence: researchResults[2]?.title || `围绕“${topicQuery}”形成稳定叙事视角`,
            },
            {
              label: '执行路径',
              insight: '为后续文案、分镜、配音提供可直接接续的结构，不让输入标题只停留在占位文本。',
              evidence: `当前关键词：${topicQuery}`,
            },
          ],
          process: [
            { label: '标题检索', detail: `先以“${topicQuery}”为检索词抓取公开搜索结果，识别相关讨论。` },
            { label: '线索去噪', detail: '过滤低相关或泛化结果，只保留可用于解释主题的共同线索。' },
            { label: '命题收敛', detail: '把搜索线索压缩成一个主命题和若干逻辑层。' },
            { label: '视频化输出', detail: '确保分析结果可以直接被 Step 2-4 继续复用。' },
          ],
        },
      }, input),
      ...normalizeTopicResearch(topicResearch, input),
    };
  }

  if (stepId === 2) {
    const titleSets = [
      [
        { title: `真正值得讲的，不只是“${topicQuery}”这个词，而是它背后的完整逻辑`, angle: '反差型', score: 91 },
        { title: `“${topicQuery}”到底在讲什么？一次拆清核心信息`, angle: '解释型', score: 89 },
        { title: `别只看标题，“${topicQuery}”真正有价值的是这几层信息`, angle: '拆解型', score: 86 },
        { title: `想看懂“${topicQuery}”，先抓这 4 个重点`, angle: '极简型', score: 84 },
      ],
      [
        { title: `为什么大家都在搜“${topicQuery}”？关键不在热度，在这条底层线索`, angle: '追问型', score: 92 },
        { title: `看懂“${topicQuery}”，别从名词开始，要从这 3 层关系开始`, angle: '结构型', score: 88 },
        { title: `“${topicQuery}”最容易被忽略的，不是信息点，而是背后的判断框架`, angle: '认知型', score: 86 },
        { title: `同样是“${topicQuery}”，为什么有人越看越乱？因为少了这一步`, angle: '痛点型', score: 84 },
      ],
      [
        { title: `如果只用一分钟解释“${topicQuery}”，我会先说这句结论`, angle: '结论先行', score: 90 },
        { title: `“${topicQuery}”值得拍成视频，不是因为新，而是因为这层价值刚被看见`, angle: '价值型', score: 88 },
        { title: `别被表面信息带偏，“${topicQuery}”真正该拆的是这条主线`, angle: '去噪型', score: 87 },
        { title: `围绕“${topicQuery}”，最适合短视频展开的，其实是这 4 个问题`, angle: '问题型', score: 85 },
      ],
      [
        { title: `“${topicQuery}”怎么讲才不空？先把人物、问题、价值这三件事对齐`, angle: '方法型', score: 91 },
        { title: `看似只是“${topicQuery}”，其实背后已经有一套完整叙事框架`, angle: '框架型', score: 89 },
        { title: `很多内容都讲不好“${topicQuery}”，因为第一刀切错了地方`, angle: '批判型', score: 87 },
        { title: `想把“${topicQuery}”讲清楚，最稳的方式是按这个顺序拆`, angle: '执行型', score: 84 },
      ],
    ];

    return normalizeTitlesPayload({
      titles: {
        options: titleSets[variant],
        selectedIndex: variant,
        selectedReason: [
          `这一版能承接“${topicQuery}”的搜索关注点，同时保留传播张力和解释力。`,
          `这一版更强调“为什么会被搜索”，适合做有追问感的主标题。`,
          `这一版先给结论再展开，更适合短视频首屏留人。`,
          `这一版偏执行和框架感，适合后续文案与分镜继续展开。`,
        ][variant],
      },
      projectName: `“${topicQuery}”主题拆解`,
    }, input);
  }

  if (stepId === 3) {
    const hookOptions = [
      `很多人第一次看到“${topicQuery}”只停留在关键词本身，但真正值得讲的，是搜索结果背后反复出现的那几个核心问题。`,
      `如果你觉得“${topicQuery}”看起来信息很多却抓不到重点，问题通常不是内容太杂，而是没人帮你先把线索排好。`,
      `“${topicQuery}”之所以值得讲，不是因为它新，而是因为搜索结果已经把观众最关心的问题暴露出来了。`,
      `别急着记“${topicQuery}”这个名词，先看它背后到底对应哪类问题、哪类人和哪种价值。`,
    ];
    const bodySets = [
      [
        { label: '破题', text: `先回答“${topicQuery}”到底是什么，为什么会被持续搜索和讨论。` },
        { label: '展开', text: primarySnippet || `再把与“${topicQuery}”相关的关键人物、产品动作或平台关系串起来，形成清晰解释。` },
        { label: '收束', text: `最后把“${topicQuery}”收敛成一个明确判断，让观众知道这件事和自己有什么关系。` },
      ],
      [
        { label: '先给判断', text: `先把“${topicQuery}”最重要的结论抛出来，让观众知道这件事到底值不值得看。` },
        { label: '再讲证据', text: primarySnippet || `再用搜索里最稳定的线索去解释，为什么大家会持续关注“${topicQuery}”。` },
        { label: '最后落地', text: `最后把“${topicQuery}”和用户的实际感知连上，避免内容停在概念层。` },
      ],
      [
        { label: '问题切入', text: `先抛出一个和“${topicQuery}”直接相关的问题，让观众快速进入状态。` },
        { label: '关系拆解', text: `再把“${topicQuery}”涉及的人物、平台和动作拆成几层关系，讲清楚为什么会形成讨论。` },
        { label: '价值总结', text: `最后用一句明确判断告诉观众，理解“${topicQuery}”后能获得什么。` },
      ],
      [
        { label: '去噪', text: `先过滤掉“${topicQuery}”外围噪音，只抓真正高频、有效的关注焦点。` },
        { label: '重组', text: `再把零散线索按逻辑顺序重新组织，让“${topicQuery}”变成能一口气讲下去的结构。` },
        { label: '行动', text: `最后把“${topicQuery}”收成一个可记忆、可转述、可继续追踪的结论。` },
      ],
    ];
    const ctaOptions = [
      `如果你也在关注“${topicQuery}”，接下来就按这个结构继续拆标题、文案和分镜。`,
      `如果这条思路讲清楚了“${topicQuery}”，下一步就可以直接把它压进标题池和场景结构。`,
      `看懂“${topicQuery}”之后，接下来就用这套逻辑继续做标题和镜头设计。`,
      `如果你想把“${topicQuery}”讲成一条能传播的视频，下一步就继续把这套判断做成标题和镜头。`,
    ];

    return normalizeCopyPayload({
      copy: {
        hook: hookOptions[variant],
        body: bodySets[variant],
        cta: ctaOptions[variant],
      },
    }, input);
  }

  if (stepId === 4) {
    // Use shotsState if available, otherwise derive from copy content
    let derivedShots = shots;
    if (derivedShots.length === 0) {
      const copy = pipeline.copy || {};
      const hookText = typeof copy.hook === 'string' ? copy.hook : (copy.hook?.text || '');
      const bodyTexts = Array.isArray(copy.body) ? copy.body.map(b => typeof b === 'string' ? b : (b?.text || '')) : [];
      const ctaText = typeof copy.cta === 'string' ? copy.cta : (copy.cta?.text || '');

      derivedShots = [];
      let shotIndex = 0;

      const SHOT_LABELS = ['开场问题', '结论亮相', '路径拆解', '细节展开', '记忆系统', '协作结构', '生态空间', '价值补充', '长期沉淀', '核心总结', '行动召唤', '品牌收尾'];

      if (hookText) {
        derivedShots.push({
          id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
          title: hookText.length > 15 ? hookText.substring(0, 15) + '…' : hookText,
          narration: hookText,
          durationSeconds: Math.max(4, Math.ceil(hookText.length / 5)),
        });
        shotIndex++;
      }

      bodyTexts.forEach((text, i) => {
        if (text) {
          derivedShots.push({
            id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
            title: SHOT_LABELS[i] || `内容块${i + 1}`,
            narration: text,
            durationSeconds: Math.max(5, Math.ceil(text.length / 5)),
          });
          shotIndex++;
        }
      });

      if (ctaText) {
        derivedShots.push({
          id: `shot-${String(shotIndex + 1).padStart(2, '0')}`,
          title: '行动召唤',
          narration: ctaText,
          durationSeconds: Math.max(4, Math.ceil(ctaText.length / 5)),
        });
      }
    }

    const profile = buildStep4FallbackProfile(currentSkill, variant);

    return normalizeShotsPayload({
      shots: derivedShots.map((shot, index) => ({
        id: shot.id,
        title: profile.labels[index] || shot.title,
        narration: `${profile.prefixes[index] || ''}${shot.narration}`.trim(),
        durationSeconds: Math.max(0.1, shot.durationSeconds + profile.durationBias + (((variant + index) % 2 === 0) ? 0 : 0.3)),
        visualStyle: profile.visualStyle,
      })),
    }, input);
  }

  if (stepId === 5) {
    const profile = buildStep5FallbackProfile(currentSkill, variant);
    const byShotId = {};
    shots.forEach((shot) => {
      const scriptExcerpt = truncate(String(shot.scriptExcerpt || shot.narration || shot.title || '').trim(), 42);
      const storyboardCue = truncate(String(shot.storyboardCueZh || shot.sceneIntent || shot.title || '').trim(), 36);
      byShotId[shot.id] = {
        prompt: [
          `为场景“${shot.title}”生成 16:9 横版视觉，必须服务口播原句“${scriptExcerpt}”，围绕 ${storyboardCue} 组织画面，采用${profile.style}表达，突出 ${currentSkill.emphasis || profile.visualFocus}，主体清晰，信息层次明确。`,
          `围绕“${shot.title}”设计 1920x1080 横版主画面，核心解释口播“${scriptExcerpt}”，用 ${storyboardCue} 做分镜抓手，整体走${profile.style}方向，保留标题留白与强视觉焦点。`,
          `给“${shot.title}”生成高识别度的 16:9 视觉，画面必须围绕口播原句“${scriptExcerpt}”展开，用${profile.style}强化首屏理解和传播感，避免做成只对应标题的泛图。`,
          `把“${shot.title}”做成适合科技讲解视频的 16:9 横版主画面，重点解释“${scriptExcerpt}”，视觉风格采用${profile.style}，分镜抓手围绕 ${storyboardCue}，重点突出 ${currentSkill.emphasis || profile.visualFocus}。`,
        ][variant],
        negativePrompt: [profile.negativePrompt, currentSkill.avoid].filter(Boolean).join(', '),
        style: profile.style,
        mood: currentSkill.style || profile.mood,
        visualFocus: currentSkill.emphasis || profile.visualFocus,
        text: String(shot.narration || '').trim(),
        sceneIntent: String(shot.sceneIntent || '').trim(),
        evidenceAnchor: String(shot.evidenceAnchor || '').trim(),
        scriptBlockId: String(shot.scriptBlockId || '').trim(),
        scriptBlockLabel: String(shot.scriptBlockLabel || '').trim(),
        scriptExcerpt: String(shot.scriptExcerpt || shot.narration || '').trim(),
        storyboardCueZh: String(shot.storyboardCueZh || shot.sceneIntent || shot.title || '').trim(),
        canvasRatio: '16:9',
        canvasWidth: 1920,
        canvasHeight: 1080,
      };
    });
    return normalizePromptsPayload({ prompts: { byShotId } }, input);
  }

  if (stepId === 6) {
    const presetOptions = ['女声·冷静解释', '男声·新闻拆解', '女声·快节奏讲解', '男声·沉稳分析'];
    const emotionOptions = ['坚定', '克制', '有力', '沉着'];
    const speedOptions = ['1.0x', '0.95x', '1.08x', '1.02x'];
    return normalizeVoicePayload({
      voice: {
        preset: presetOptions[variant],
        emotion: emotionOptions[variant],
        speed: speedOptions[variant],
        pauses: '自然停顿',
        shots: shots.map((shot) => ({
          id: shot.id,
          text: shot.narration,
          emotion: indexBasedEmotion(shot.id),
          emphasis: shot.title,
          durationSeconds: shot.durationSeconds,
        })),
      },
    }, input);
  }

  const totalDurationSec = shots.reduce((s, sh) => s + (sh.durationSeconds || 5), 0);
  const estimatedMB = Math.round((8000 * totalDurationSec / 8) / 1024);
  const renderPresets = [
    {
      template: 'caption',
      width: 1080,
      height: 1920,
      bitrate: 8000,
      notes: '9:16 竖屏适合抖音/视频号，caption 模板突出口播内容',
    },
    {
      template: 'split',
      width: 1080,
      height: 1920,
      bitrate: 8000,
      notes: '9:16 竖屏分屏模板，左侧文字右侧画面，适合对比讲解类内容',
    },
    {
      template: 'fullscreen',
      width: 1080,
      height: 1920,
      bitrate: 8000,
      notes: '全屏模板适合视觉冲击力强的演示内容，建议配合高质量图片',
    },
    {
      template: 'ultimate',
      width: 1920,
      height: 1080,
      bitrate: 12000,
      notes: 'Ultimate 1920x1080 横版模板，适合把搜索结果、文案和分镜压成章节化信息视频',
    },
  ];
  const preset = renderPresets[variant % renderPresets.length] || renderPresets[0];
  const presetEstimatedMB = Math.round((preset.bitrate * totalDurationSec / 8) / 1024);

  return normalizeRenderPayload({
    render: {
      template: preset.template,
      quality: ['high', 'medium', 'high', 'low'][variant % 4] || 'high',
      fps: 30,
      width: preset.width,
      height: preset.height,
      format: 'mp4',
      codec: 'h264',
      bitrate: preset.bitrate,
      estimatedDuration: Math.round(totalDurationSec),
      estimatedSize: '~' + presetEstimatedMB + 'MB',
      notes: preset.notes,
    },
  }, input);
}

function indexBasedEmotion(shotId) {
  if (/01|02/.test(shotId)) {
    return '有力';
  }
  if (/07|08|09/.test(shotId)) {
    return '收束';
  }
  return '平稳';
}

async function generateWithLLM(stepId, context) {
  const prompt = buildStepSchemaPrompt(stepId, context);
  const result = await generateStructuredJson({
    temperature: context.generation?.mode === 'regenerate' ? 1 : 0.7,
    topP: context.generation?.mode === 'regenerate' ? 0.95 : 1,
    messages: [
      {
        role: 'developer',
        content: 'You generate structured JSON for a short-video workflow editor. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });
  return {
    model: result.model,
    payload: result.payload,
  };
}

async function generateWorkflowStep(input) {
  const stepId = Number(input.stepId);
  if (!Number.isFinite(stepId)) {
    throw new Error('stepId is required');
  }

  if (![1, 2, 3, 4, 5, 6, 7, 8].includes(stepId)) {
    throw new Error(`Unsupported workflow step: ${stepId}`);
  }

  if ([1, 2, 3].includes(stepId)) {
    return generateStep123Workflow(input);
  }

  if (stepId === 2 && !input.pipelineState?.analysis && !input.pipelineState?.selectedAnalysis) {
    throw new Error('请先完成并确认 Step 1（逻辑分析）');
  }

  if (stepId === 3 && !input.pipelineState?.selectedTitleId) {
    throw new Error('请先在 Step 2 选择并确认标题');
  }

  const topicQuery = getInputTopic(input);
  let topicResearch = input.pipelineState?.topicResearch || null;

  if (stepId === 1 && topicQuery) {
    try {
      topicResearch = await searchTopicResearch(topicQuery);
    } catch (error) {
      console.warn(`[Workflow] Topic research failed for "${topicQuery}": ${error.message}`);
    }
  }

  const enrichedInput = {
    ...input,
    pipelineState: {
      ...(input.pipelineState || {}),
      inputTopic: input.pipelineState?.inputTopic || topicQuery,
      inputTitleKeywords: input.pipelineState?.inputTitleKeywords || topicQuery,
      ...(topicResearch ? { topicResearch } : {}),
    },
  };
  const skillSpec = ensureStepSkillReady(stepId);

  if (stepId === 7) {
    const enriched = enrichStepResult(
      stepId,
      {
        projectBuild: {
          ...(enrichedInput.pipelineState?.projectBuild || {}),
        },
      },
      enrichedInput,
      skillSpec,
    );

    return {
      stepId,
      source: 'deterministic',
      model: 'remotion-project-build',
      generatedAt: new Date().toISOString(),
      payload: enriched.payload,
      resolvedSkill: enriched.resolvedSkill,
      evaluation: enriched.evaluation,
    };
  }

  const context = buildWorkflowContext(stepId, enrichedInput);

  if (hasWorkflowLLM()) {
    try {
      const result = await generateWithLLM(stepId, context);
      const enriched = enrichStepResult(
        stepId,
        normalizeStepPayload(stepId, {
          ...result.payload,
          ...(stepId === 1 && topicResearch ? { topicResearch } : {}),
        }, enrichedInput),
        enrichedInput,
        skillSpec,
      );
      return {
        stepId,
        source: 'openai',
        model: result.model,
        generatedAt: new Date().toISOString(),
        payload: enriched.payload,
        resolvedSkill: enriched.resolvedSkill,
        evaluation: enriched.evaluation,
      };
    } catch (error) {
      console.warn(`[Workflow] LLM generation failed for step ${stepId}: ${error.message}`);
    }
  }

  const enriched = enrichStepResult(
    stepId,
    createFallbackWorkflowPayload(stepId, enrichedInput),
    enrichedInput,
    skillSpec,
  );
  return {
    stepId,
    source: 'fallback',
    model: 'local-template',
    generatedAt: new Date().toISOString(),
    payload: enriched.payload,
    resolvedSkill: enriched.resolvedSkill,
    evaluation: enriched.evaluation,
  };
}

module.exports = {
  generateWorkflowStep,
  getWorkflowCapabilities,
};
