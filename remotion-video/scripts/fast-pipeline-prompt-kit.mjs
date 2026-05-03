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

爆款标题公式（科技AI类主攻）：
- [具体数字/事件] + [核心变化] + [悬念/价值]
  → 例：1/89的价格，100万token上下文，DeepSeek V4怎么做到的
- [身份] + [反差行为/结果]
  → 例：程序员开始用DeepSeek V4抢产品经理的活了
- [否定/颠覆] + [常识] + [新结论]
  → 例：别再说开源模型不如闭源了，DeepSeek V4把GPT拉下神坛
- [时间/事件] + [悬念] + [具体动作]
  → 例：DeepSeek V4发布后，第一批用的团队都在用它做这件事
- [极端数据] + [反差说明]
  → 例：定价只有OpenAI的1/89，不是bug是架构创新

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

// ─── Script Length (spoken at 1.2x speed) ──────────────────────────────────────
// Chinese speaking rate: ~200 chars/min normal, ~240 chars/min at 1.2x
// 2-3 min video → 480-720 chars, 3-4 min → 720-960 chars
export const TARGET_CHARS_MIN = 720;
export const TARGET_CHARS_MAX = 1100;
export const TARGET_PARAGRAPHS = '5-7';

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
    '口播稿硬规则：',
    `1. 总字数 ${TARGET_CHARS_MIN}-${TARGET_CHARS_MAX} 字（语速1.2倍播放，对应${Math.round(TARGET_CHARS_MIN / 240)}-${Math.round(TARGET_CHARS_MAX / 240)}分钟），像真人当面讲重点，短句+硬信息`,
    '',
    '2. Hook（开场句）要求：',
    '   - 必须包含具体数字 或 反常识信息（如"1/89价格"、"2.8倍速度"）',
    '   - 制造"信息差"——说出观众不知道但瞬间感兴趣的事',
    '   - 18-40字，1-2句，不准用"大家好""今天我们来""你知道吗"',
    '',
    '3. Body（正文段落）要求：',
    `   - ${TARGET_PARAGRAPHS} 段，每段类型不能重复，按以下结构轮换：`,
    '     A. 事实锤（fact-hammer）：用搜索事实中的具体数字做冲击',
    '     B. 技术机制（tech-mechanism）：解释HOW，必须附带生活化类比',
    '     C. 对比冲击（comparison）：新旧对比/竞品对比/成本对比',
    '     D. 场景应用（scenario）：说清楚谁能用、怎么用、什么效果',
    '     E. 数据延伸（data-extension）：从已有数字推导出更深层的结论或趋势',
    '     F. 行业影响（industry-impact）：这件事对整个行业意味着什么',
    '   - 每段结构：先给判断句（一句话结论）→ 再补具体事实 → 最后推进到下一段',
    '   - 段与段之间必须有递进关系：后一段要么是前一段的"反转"要么是"深化"',
    '   - 技术类主题必须有机制解释（HOW型）段，附生活化类比，不能只说"很强"',
    '   - 每段至少埋一个具体数据点（来自搜索事实）',
    '',
    '4. CTA要求：',
    '   - 必须是互动型，引导评论区讨论',
    '   - 要结合视频内容做具体提问（如"你现在用XX模型跑什么任务？"），不能空泛',
    '   - 不准用"感谢观看""点赞关注"这类通用CTA',
    '',
    '返回以下 JSON 结构：',
    JSON.stringify({
      title: '爆款标题（25字以内）',
      titleAngle: '标题角度：结论先行/问题追问/反差拆解/解释型',
      script: {
        hook: '开场句（满足规则2，含数字或反常识）',
        body: [
          { label: '段落1-事实锤', text: '段落文案' },
          { label: '段落2-技术机制', text: '段落文案' },
          { label: '段落3-对比冲击', text: '段落文案' },
          { label: '段落4-场景应用', text: '段落文案' },
          { label: '段落5-行业影响', text: '段落文案' },
        ],
        cta: '互动型CTA（结合内容做具体提问）',
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
    '- 将口播稿按叙事动作拆成 8-14 个场景',
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
