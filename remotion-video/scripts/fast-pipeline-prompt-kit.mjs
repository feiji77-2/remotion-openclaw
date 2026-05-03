// fast-pipeline-prompt-kit.mjs
// Consolidated knowledge from docs/workflow-skills/*.SKILL.md
// Provides prompt builders and schema validators for the 3-step fast pipeline.

// ─── Scene Families ───────────────────────────────────────────────────────────

export const SCENE_FAMILIES = [
  'hero', 'focus', 'feature-rail', 'step-flow', 'timeline',
  'compare-board', 'number-strip', 'terminal', 'evidence-wall',
  'tag-matrix', 'code', 'architecture-map', 'metrics', 'data-stream',
  'memory-graph', 'pipeline-flow', 'benchmark-chart', 'quote-highlight',
  'glossary-term', 'cta',
];

export const SCENE_FAMILY_RULES = `硬规则：
- 第一屏固定 hero
- 最后一屏固定 cta
- 中段场景优先保持 family 多样性
- 避免连续 3 个 shot 使用同一类 family
- 如果正文有数据段，至少给一次图形型 family（如 benchmark-chart / data-stream / number-strip），不要全做文字面板`;

// ─── Title Techniques ─────────────────────────────────────────────────────────

export const TITLE_TECHNIQUES = `爆款标题手法（至少用一种）：
1. 数字法 — 具体数字制造记忆锚点（如"82.7%编码能力"）
2. 反差法 — 认知/身份反差制造矛盾（如"程序员开始抢产品经理的活"）
3. 悬念法 — 制造信息缺口让人想点开（如"OpenAI没告诉你的三个秘密"）
4. 身份标签法 — 精准人群定位（如"程序员必看"）
5. 疑问法 — 抛出观众最想问的问题（如"GPT-5.5到底强在哪？"）
6. 对话法 — 口语化制造对话感（如"凭什么卖这么贵？看完我沉默了"）

每个标题必须：
- 至少包含一种爆款手法
- 有具体数据或场景（不能泛泛而谈）
- 控制在 25 字以内
- 口语化，符合抖音/视频号传播语气`;

// ─── DeAI Rules ───────────────────────────────────────────────────────────────

export const DEAI_RULES = `【强制禁止】
1. 禁止以下 AI 词汇黑名单（出现即无效）：
   赋能、迭代、显著提升、全方位、多维度、系统性、值得关注、
   不得不说、不得不承认、本质上、显而易见、毋庸置疑、
   构建、打通、做深做透、全方位的、多维度的、立体化的

2. 禁止三段式套话（A、B和C结构，如"高效、便捷、安全"），超过 1 处即无效

3. 禁止空洞词：翻倍、碾压、大幅提升、压力变大、效率提升（不说具体数字）

4. 禁止"不只是…更是…"模板句式

5. Hook 不准用"大家好"、"今天我们来"、"如果你"、"可能"

6. CTA 不能是"感谢观看"类型，必须是互动型或关注型`;

// ─── Step 1: Search + Analysis ────────────────────────────────────────────────

export function buildStep1Prompt(topic, searchResults) {
  const searchContext = searchResults && searchResults.length > 0
    ? searchResults.map((r, i) => `${i + 1}. ${r.title} | ${r.snippet}`).join('\n')
    : '（搜索无结果，请基于自身知识生成）';

  return [
    '你为短视频工作流生成"逻辑分析"结果。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    '上下文：',
    `主题：${topic}`,
    `搜索结果：\n${searchContext}`,
    '',
    DEAI_RULES,
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      analysis: {
        thesis: '核心命题（一句话概括）',
        audience: '目标观众描述',
        corePromise: '视频核心价值',
        searchFacts: ['3-5 条从搜索结果提炼的关键事实'],
      },
    }, null, 2),
  ].join('\n');
}

export function validateStep1Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 1: payload 不是对象');
  if (!payload.analysis) throw new Error('Step 1: 缺少 analysis');
  if (!payload.analysis.thesis) throw new Error('Step 1: 缺少 analysis.thesis');
  if (!payload.analysis.audience) throw new Error('Step 1: 缺少 analysis.audience');
  return {
    analysis: {
      thesis: String(payload.analysis.thesis || '').trim(),
      audience: String(payload.analysis.audience || '').trim(),
      corePromise: String(payload.analysis.corePromise || '').trim(),
      searchFacts: Array.isArray(payload.analysis.searchFacts)
        ? payload.analysis.searchFacts.map(f => String(f || '').trim()).filter(Boolean).slice(0, 5)
        : [],
    },
  };
}

// ─── Step 2: Viral Title + Script ─────────────────────────────────────────────

export function buildStep2Prompt(analysis) {
  return [
    '你为短视频工作流生成"爆款标题 + 口播稿"。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    TITLE_TECHNIQUES,
    '',
    '上下文：',
    `核心命题：${analysis.thesis}`,
    `目标受众：${analysis.audience}`,
    `核心价值：${analysis.corePromise}`,
    `搜索事实：${(analysis.searchFacts || []).join('；')}`,
    '',
    DEAI_RULES,
    '',
    '口播稿要求：',
    '- 总字数 600-900 字',
    '- 像真人当面讲重点，短句+硬信息',
    '- 每段先给判断→再补事实→推进下一段',
    '- 技术类主题必须有机制解释（HOW型），不能只说"很强"',
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      title: '爆款标题（25字以内）',
      titleAngle: '标题角度：结论先行/问题追问/反差拆解/解释型',
      script: {
        hook: '开场句（1-2句，抓注意力，18-40字）',
        body: [
          { label: '段落1名称', text: '段落文案' },
          { label: '段落2名称', text: '段落文案' },
          { label: '段落3名称', text: '段落文案' },
        ],
        cta: '结尾号召/互动',
      },
    }, null, 2),
  ].join('\n');
}

export function validateStep2Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 2: payload 不是对象');
  if (!payload.title) throw new Error('Step 2: 缺少 title');
  if (!payload.script) throw new Error('Step 2: 缺少 script');
  if (!payload.script.hook) throw new Error('Step 2: 缺少 script.hook');
  return {
    title: String(payload.title || '').trim(),
    titleAngle: String(payload.titleAngle || '').trim(),
    script: {
      hook: String(payload.script.hook || '').trim(),
      body: Array.isArray(payload.script.body)
        ? payload.script.body.map(b => ({
            label: String(b.label || '').trim(),
            text: String(b.text || '').trim(),
          })).filter(b => b.label && b.text)
        : [],
      cta: String(payload.script.cta || '').trim(),
    },
  };
}

// ─── Step 3: Storyboard + Visual Prompts ──────────────────────────────────────

export function buildStep3Prompt(title, script) {
  const bodyTextSummary = (script.body || [])
    .map(b => `${b.label}：${b.text}`)
    .join('\n');

  return [
    '你为短视频生成"分镜 + 视觉提示词"。',
    '你必须返回严格 JSON，不要 markdown，不要解释。',
    '',
    SCENE_FAMILY_RULES,
    '',
    '上下文：',
    `标题：${title}`,
    `口播稿：\nHook: ${script.hook}\n${bodyTextSummary}\nCTA: ${script.cta}`,
    '',
    '分镜原则：',
    '- 将口播稿按叙事动作拆成 6-10 个场景',
    '- 每个场景绑定到具体口播原句',
    '- 一段正文如果同时包含机制、数据、对比，可拆成多个场景',
    '- 每个场景的 visualPrompt 必须是16:9横版，适合 AI 绘图',
    '- 每个场景的 visualDescription 给导演看的，用中文描述画面构成',
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      scenes: [
        {
          id: 'scene-01',
          narration: '本镜头对应的口播文本',
          visualDescription: '画面描述（中文，给导演看）',
          visualPrompt: '视觉提示词（英文，16:9 横版，给 AI 绘图用）',
          sceneFamily: 'hero|focus|compare-board|timeline|data-stream|number-strip|terminal|code|benchmark-chart|cta',
          durationSeconds: 8,
        },
      ],
      totalDurationSeconds: 60,
    }, null, 2),
  ].join('\n');
}

export function validateStep3Payload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Step 3: payload 不是对象');
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  if (scenes.length === 0) throw new Error('Step 3: 没有场景数据');
  return {
    scenes: scenes.map((s, i) => ({
      id: String(s.id || `scene-${String(i + 1).padStart(2, '0')}`).trim(),
      narration: String(s.narration || '').trim(),
      visualDescription: String(s.visualDescription || '').trim(),
      visualPrompt: String(s.visualPrompt || '').trim(),
      sceneFamily: String(s.sceneFamily || 'focus').trim(),
      durationSeconds: Math.max(1.8, Number(s.durationSeconds) || 6),
    })),
    totalDurationSeconds: Math.max(
      1,
      Number(payload.totalDurationSeconds) || scenes.reduce((s, sc) => s + (Number(sc.durationSeconds) || 6), 0),
    ),
  };
}
