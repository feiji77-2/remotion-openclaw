const { getWorkflowLLMCapabilities } = require('./step123/llm');
const { createLogger } = require('../utils/logger');
const { getStepSkillSpec } = require('./skillRegistry');
const { clone, toNumber, truncate, normalizeTopicResearch, getInputTopic } = require('./searchUtils');
const { ULTIMATE_TEMPLATE } = require('../../scripts/lib/index.js');

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
    constraints: Array.isArray(safe.constraints)
      ? safe.constraints.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    qualityRules: Array.isArray(safe.qualityRules)
      ? safe.qualityRules.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
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
  if (skill.constraints.length > 0) fragments.push(`constraints：${skill.constraints.join(' / ')}`);
  if (skill.qualityRules.length > 0) fragments.push(`quality：${skill.qualityRules.join(' / ')}`);

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
  const stepSkillSpec = getStepSkillSpec(stepId);
  const currentStepSkill = normalizeStepSkillConfig({
    ...(stepSkillSpec?.defaults || {}),
    constraints: stepSkillSpec?.constraints || [],
    qualityRules: stepSkillSpec?.qualityRules || [],
    ...(rawStepSkills?.[stepId] && typeof rawStepSkills[stepId] === 'object' ? rawStepSkills[stepId] : {}),
  });

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
    `你是短视频工作流里的内容导演，正在生成"${getStepDescription(stepId)}"步骤的数据。`,
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
      ? 'Step 4 必须以 copy.hook / copy.body / copy.cta 为分镜真源。每个中段场景都要能回指到具体口播段落或句子，不要只围绕标题造泛镜头。如果某一段正文里同时包含机制、数据或对比转折，允许拆成多个 shot，不要被固定 6 镜头或平均切段绑死。'
      : '',
    stepId === 5
      ? 'Step 5 的每条视觉提示词必须服务对应 shot 的 narration / sceneIntent / dataPoints / scriptExcerpt。画面要解释这句口播，不要退回标题海报式插图。每条 prompt 都要明确主体、构图、信息层、留白区和负面约束。'
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
      description: '生成 Ultimate 场景编排结果，保持 shot id 不变，并补充 script 绑定、sceneFamily、templateCandidates 和横版结构信息。',
      shape: {
        shots: shotShape.map((shot) => ({
          id: shot.id,
          title: 'string',
          narration: 'string',
          durationSeconds: 'number',
          level: 'string',
          type: 'string',
          sceneFamily: 'string',
          scriptRole: 'string',
          sceneIntent: 'string',
          evidenceAnchor: 'string',
          scriptBlockId: 'string',
          scriptBlockLabel: 'string',
          scriptSourceText: 'string',
          scriptExcerpt: 'string',
          storyboardCueZh: 'string',
          templateCandidates: ['string'],
          dataPoints: ['string'],
          keywords: ['string'],
          comparisons: ['string or object'],
          director: {
            archetype: 'string',
            cameraIntent: 'string',
            cameraMotion: 'string',
            dataEvent: 'string',
            enterFrames: 'number',
            emphasisFrames: 'number',
            staggerGap: 'number',
            revealDirection: 'string',
            directorNote: 'string',
          },
          visual: {
            description: 'string',
            focus: 'string',
          },
        })),
        scenePlan: {
          system: 'string',
          visualSystem: 'string',
          sceneCount: 'number',
          familiesUsed: ['string'],
        },
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
              comparisonSummaryZh: 'string',
              sceneFamily: 'string',
              sceneIntent: 'string',
              evidenceAnchor: 'string',
              text: 'string',
              scriptBlockId: 'string',
              scriptBlockLabel: 'string',
              scriptSourceText: 'string',
              scriptExcerpt: 'string',
              storyboardCueZh: 'string',
              templateCandidates: ['string'],
              dataPoints: ['string'],
              keywords: ['string'],
              canvasRatio: 'string',
              canvasWidth: 'number',
              canvasHeight: 'number',
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
          template: ULTIMATE_TEMPLATE,
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

module.exports = {
  getStepDescription,
  normalizeStepSkillConfig,
  buildStepSkillInstruction,
  getCurrentStepSkillFromInput,
  getWorkflowCapabilities,
  getStepCurrentPayload,
  summarizeStepPayload,
  normalizeGenerationMeta,
  normalizeWorkflowShotContext,
  buildWorkflowContext,
  buildStepSchemaPrompt,
};
