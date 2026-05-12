/**
 * intentInferrerPipeline.js — 将 intentInferrer 集成到 Step 4 工作流管线
 *
 * 作为 normalizeShotsPayload 之后的补充步骤运行。
 * 在每个 shot 上附加 directorIntent 字段，供 storyboardLoader 消费。
 *
 * P2 优化：优先批量 LLM 调用（1 次），失败时降级到逐镜头串行调用。
 * 不会阻塞主流程 — 失败时只 warn 并返回原始 shots。
 */

const { inferIntent } = require('./intentInferrer');

/**
 * 对 Step 4 输出的 shots 数组做导演层意图补充。
 *
 * @param {Array} shots - normalizeShotsPayload 输出的 shot 数组
 * @param {object} context - 工作流上下文
 * @param {object} context.pipeline - pipeline 状态（含 copy 等）
 * @param {object} context.generation - generation 元数据（含 skill 等）
 * @param {object} [options] - 可选参数
 * @param {Function} [options.structuredJsonFn] - generateStructuredJson 函数引用
 * @returns {Promise<Array>} 补充了 directorIntent 的 shot 数组
 */
async function enrichShotsWithIntent(shots, context, options) {
  if (!Array.isArray(shots) || shots.length === 0) {
    return shots;
  }

  const pipeline = context.pipeline || {};
  const generation = context.generation || {};

  const skill = generation.skill || pipeline.skill || {};
  const familyId =
    pipeline.familyId ||
    skill.familyId ||
    skill.presetId ||
    'step-flow';

  const structuredJsonFn = options && options.structuredJsonFn;

  // P2: 优先尝试批量 LLM 调用（所有 shots 一次推断）
  if (structuredJsonFn) {
    try {
      const batchResult = await tryBatchIntentInfer(shots, familyId, structuredJsonFn);
      if (batchResult) {
        return batchResult; // 成功，返回带 directorIntent 的 shots
      }
    } catch (batchErr) {
      console.warn(`[intentInferrer] batch mode failed, falling back to serial: ${batchErr.message}`);
    }
  }

  // 降级：逐镜头调用（原有逻辑）
  return enrichShotsSerial(shots, familyId);
}

/**
 * 批量 LLM 推断（所有 shots 一次调用）
 * @returns {Promise<Array>|null} 成功返回带 directorIntent 的 shots，失败返回 null
 */
async function tryBatchIntentInfer(shots, familyId, structuredJsonFn) {
  const BATCH_SIZE_LIMIT = 12;
  const batchShots = shots.slice(0, BATCH_SIZE_LIMIT);

  const batchPrompt = buildBatchIntentPrompt(batchShots, familyId);

  const raw = await structuredJsonFn(
    batchPrompt,
    null, // 无强制 schema
    { skill: familyId },
  );

  if (!raw || typeof raw !== 'object') {
    throw new Error('invalid batch LLM response: not an object');
  }

  // 兼容两种返回格式：{ intents: [...] } 或直接数组 [...]
  let intentArray = null;
  if (Array.isArray(raw)) {
    intentArray = raw;
  } else if (Array.isArray(raw.intents)) {
    intentArray = raw.intents;
  } else if (Array.isArray(raw.results)) {
    intentArray = raw.results;
  }

  if (!intentArray || !Array.isArray(intentArray)) {
    throw new Error(`invalid batch LLM response: expected array, got ${typeof raw}`);
  }

  return shots.map((shot, index) => {
    const intent = intentArray[index] || {};
    return {
      ...shot,
      directorIntent: {
        archetype: intent.archetype || 'inference-fallback',
        dataEvent: intent.dataEvent || null,
        cameraIntent: intent.cameraIntent || null,
        cameraMotion: intent.cameraMotion || null,
        memoryObject: intent.memoryObject || null,
        reasoning: intent.reasoning || '',
        source: 'batch-llm',
      },
    };
  });
}

/**
 * 构建批量 intent推断 prompt
 */
function buildBatchIntentPrompt(shots, familyId) {
  const shotLines = shots
    .map((shot, i) => {
      const text = (shot.narration || '').trim() || '(无旁白)';
      const duration = typeof shot.durationSeconds === 'number' ? shot.durationSeconds : 5;
      const shotFamilyId = shot.family || shot.sceneFamily || familyId;
      return `[${i}] 镜头${i + 1} | 时长${duration}s | family=${shotFamilyId}\n  旁白：${text}`;
    })
    .join('\n\n');

  return `为以下 ${shots.length} 个镜头依次推断导演意图，返回严格 JSON 数组（格式：[{"archetype","dataEvent","cameraIntent","cameraMotion","memoryObject","reasoning"}, ...]），与输入顺序一一对应。

可用的 archetype 选项：
lock-on reveal, pressure countdown, overtake race, evidence pin, threshold breach, aftershock hold, follow focus, compress compare, drift reveal, bullet train, burst spread, trace flow

可用的 dataEvent 选项：
count-up, delta-hit, overtake, threshold-cross, burst-spread, trace-flow, pin, settle, flash, none

可用的 cameraIntent 选项：
pin, compress, chase, drift, confront, linger, reveal, none

可用的 cameraMotion 选项：
slowPush, panLeft, panRight, zoomIn, zoomOut, dollyIn, tiltUp, tiltDown, none

镜头列表：
${shotLines}

返回 JSON 数组：`;
}

/**
 * 逐镜头串行推断（降级路径）
 */
async function enrichShotsSerial(shots, familyId) {
  const enrichedShots = [];
  for (const shot of shots) {
    const text = (shot.narration || '').trim();
    const duration = typeof shot.durationSeconds === 'number' ? shot.durationSeconds : 5;
    const shotFamilyId = shot.family || shot.sceneFamily;
    const effectiveFamilyId = shotFamilyId || familyId;

    // inferIntent 内部有兜底：短文本走启发式，LLM 失败也降级到启发式
    const intent = await inferIntent(text, effectiveFamilyId, duration, {
      structuredJsonFn: null, // 串行模式不再调 LLM，直接走启发式
    });

    enrichedShots.push({
      ...shot,
      directorIntent: {
        archetype: intent.archetype,
        dataEvent: intent.dataEvent,
        cameraIntent: intent.cameraIntent,
        cameraMotion: intent.cameraMotion,
        memoryObject: intent.memoryObject,
        reasoning: intent.reasoning,
        source: intent.source,
      },
    });
  }
  return enrichedShots;
}

module.exports = {
  enrichShotsWithIntent,
};
