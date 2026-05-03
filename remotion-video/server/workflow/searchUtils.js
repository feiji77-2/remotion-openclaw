const { toNumber: libToNumber, compactText: libCompactText } = require('../../scripts/lib/index.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const { createLogger } = require('../utils/logger');

const SHOULD_SKIP_EXTERNAL_SEARCH = process.execArgv.some((arg) => String(arg).startsWith('--test'))
  || process.env.DISABLE_EXTERNAL_SEARCH === '1';

// Path to the DuckDuckGo HTML search script (relative to this file)
const SCRIPT_DIR = path.resolve(__dirname, '../../scripts');
const DDG_SCRIPT = path.join(SCRIPT_DIR, 'fetch-ddg-search.py');

/**
 * Fetch search results via DuckDuckGo HTML (no API key required).
 * Falls back to empty array on error — LLM fills in from knowledge base.
 *
 * @param {string} query
 * @param {'pd'|'pw'|'pm'|'24h'} [freshness]
 * @returns {Promise<Array<{title:string, link:string, snippet:string, publishedAt:string}>>}
 */
async function fetchDDGSearch(query, freshness = 'pd') {
  if (SHOULD_SKIP_EXTERNAL_SEARCH) {
    return [];
  }
  try {
    const { stdout: raw } = await execAsync(
      `python3 "${DDG_SCRIPT}" "${query.replace(/"/g, '\\"')}" ${freshness}`,
      {
        cwd: SCRIPT_DIR,
        timeout: 20000,
        maxBuffer: 512 * 1024,
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    const parsed = JSON.parse(raw);
    if (parsed.error || !Array.isArray(parsed.results)) {
      return [];
    }
    return parsed.results.map((r) => ({
      title: String(r.title || '').trim(),
      link: String(r.link || '').trim(),
      snippet: String(r.snippet || '').trim(),
      publishedAt: '', // DDG HTML doesn't expose pub dates
    }));
  } catch {
    return [];
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Use libToNumber (imported from scripts/lib/index.js) — same logic, no duplication
// toNumber moved to lib
function toNumber(value, fallback = 0) {
  return libToNumber(value, fallback);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// truncate uses libCompactText for truncation
function truncate(text, max = 160) {
  return libCompactText(text, max);
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
      source: String(incoming.source || current.source || 'duckduckgo-html').trim(),
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

  // DuckDuckGo HTML search — no API key required, Python/urllib fallback works
  // from this sandbox environment where curl/node https calls timeout.
  const results = await fetchDDGSearch(normalizedQuery, 'pd');
  return results;
}

async function searchTopicResearch(query) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return null;
  }

  const queries = buildSearchQueries(normalizedQuery);

  const queryResults = await Promise.all(
    queries.map(
      (currentQuery) =>
        fetchTopicResearchOnce(currentQuery)
          .then((items) =>
            items.map((item) => ({
              ...item,
              sourceQuery: currentQuery,
            })),
          )
          .catch(() => []),
    ),
  );
  const mergedResults = queryResults.flat();

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
    source: 'duckduckgo-html',
    fetchedAt: new Date().toISOString(),
    results,
  };
}

module.exports = {
  fetchDDGSearch,
  clone,
  toNumber,
  clamp,
  truncate,
  decodeEntities,
  stripHtml,
  extractXmlValue,
  parseBingRssItems,
  buildSearchTerms,
  normalizeSearchText,
  buildAnchorTokens,
  buildSearchQueries,
  scoreSearchResult,
  getInputTopic,
  normalizeTopicResearch,
  fetchTopicResearchOnce,
  searchTopicResearch,
  SHOULD_SKIP_EXTERNAL_SEARCH,
  DDG_SCRIPT,
};
