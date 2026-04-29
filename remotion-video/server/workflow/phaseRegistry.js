/**
 * Phase Registry — 外显 6 步映射到内部 8 stepId
 * 内部 step 结果读写不受影响，前端/报告展示 phase
 */

const PHASES = {
  1: {
    phaseId: 1,
    label: '研究选题',
    description: '从公开线索中提炼事实、分析骨架与多角度切口',
    stepIds: [1],
    color: '#6366F1',
  },
  2: {
    phaseId: 2,
    label: '标题确认',
    description: '围绕已确认分析生成多角度标题池',
    stepIds: [2],
    color: '#8B5CF6',
  },
  3: {
    phaseId: 3,
    label: '口播文案',
    description: '产出口语化 Hook / Body / CTA',
    stepIds: [3],
    color: '#EC4899',
  },
  4: {
    phaseId: 4,
    label: '分镜与视觉',
    description: '把文案编排成场景计划，生成视觉提示词',
    stepIds: [4, 5],
    color: '#F59E0B',
  },
  5: {
    phaseId: 5,
    label: '配音与时长',
    description: '产出配音引擎参数、逐场景脚本与时长统计',
    stepIds: [6],
    color: '#10B981',
  },
  6: {
    phaseId: 6,
    label: '出片',
    description: '项目构建、渲染参数与最终导出',
    stepIds: [7, 8],
    color: '#3B82F6',
  },
};

const STORYBOARD_QA_BRANCH = {
  id: 'storyboard-qa',
  afterPhase: 4,
  label: 'Storyboard QA',
  description: '静态分镜检查，不阻塞主链路',
  color: '#EF4444',
};

const STEP_TO_PHASE = {};
for (const [phaseId, phase] of Object.entries(PHASES)) {
  for (const stepId of phase.stepIds) {
    STEP_TO_PHASE[stepId] = {
      phaseId: Number(phaseId),
      phaseLabel: phase.label,
    };
  }
}

/**
 * 根据 stepId 查 phase 信息
 */
function getPhaseForStep(stepId) {
  return STEP_TO_PHASE[Number(stepId)] || null;
}

/**
 * 根据 phaseId 查 phase 完整信息
 */
function getPhase(phaseId) {
  return PHASES[Number(phaseId)] || null;
}

/**
 * 返回所有 phases 列表（用于前端渲染）
 */
function getAllPhases() {
  return Object.values(PHASES);
}

/**
 * 根据 stepIds 列表聚合 phase 结果
 * stepResults: Array<{stepId, ...}>
 * 返回: Array<{phaseId, label, stepResults, status}>
 */
function aggregatePhases(stepResults) {
  const phaseMap = {};

  for (const [phaseId, phase] of Object.entries(PHASES)) {
    phaseMap[phaseId] = {
      phaseId: Number(phaseId),
      label: phase.label,
      description: phase.description,
      color: phase.color,
      stepIds: phase.stepIds,
      stepResults: [],
      status: 'pending',
    };
  }

  for (const stepResult of stepResults) {
    const info = STEP_TO_PHASE[Number(stepResult?.stepId)];
    if (!info) continue;
    const { phaseId } = info;
    if (!phaseMap[phaseId]) continue;
    phaseMap[phaseId].stepResults.push(stepResult);
    // Only mark phase done when ALL its steps are done
    const phase = phaseMap[phaseId];
    if (phase) {
      const allDone = phase.stepIds.every((sid) => {
        const found = stepResults.find((r) => Number(r.stepId) === sid);
        return found && (found.status === 'done' || found.payload);
      });
      if (allDone) {
        phaseMap[phaseId].status = 'done';
      }
    }
  }

  return Object.values(phaseMap).map((p) => ({
    ...p,
    stepResults: undefined, // 不暴露完整 step result，保持精简
    _stepCount: p.stepResults.length,
    _doneCount: p.stepResults.filter((r) => r?.status === 'done' || r?.payload).length,
  }));
}

module.exports = {
  PHASES,
  STORYBOARD_QA_BRANCH,
  STEP_TO_PHASE,
  getPhaseForStep,
  getPhase,
  getAllPhases,
  aggregatePhases,
};
