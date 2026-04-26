process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');

const {__private} = require('../workflow/step123/context');

test('buildSearchQueries expands short GPT release titles with vendor-aware queries', () => {
  const queries = __private.buildSearchQueries('gpt5.5 发布');

  assert.ok(queries.includes('OpenAI GPT-5.5'));
  assert.ok(queries.includes('OpenAI GPT-5.5 release notes'));
  assert.ok(queries.includes('GPT-5.5'));
});

test('scoreSearchResult treats compact and hyphenated model names as the same anchor', () => {
  const terms = __private.buildSearchTerms('gpt5.5 发布');
  const anchors = __private.buildAnchorTokens('gpt5.5 发布');
  const result = __private.scoreSearchResult(
    {
      title: 'OpenAI GPT-5.5 发布：智能大升级却速度不降',
      snippet: '2026年4月23日 OpenAI 正式发布 GPT-5.5。',
    },
    terms,
    anchors,
  );

  assert.ok(result.score >= 3);
  assert.ok(result.anchorMatches >= 1);
});
