import type {Shot, StepMeta, WorkflowStepId} from './types';

export const STEP_LIST: StepMeta[] = [
  {id: 1, label: '逻辑分析', hint: '确定受众、主命题、核心承诺'},
  {id: 2, label: '标题生成', hint: '产出标题候选并预选'},
  {id: 3, label: '内容生成', hint: '生成 Hook / Body / CTA'},
  {id: 4, label: '场景编排', hint: '按 Ultimate 20 模板组织横版场景结构'},
  {id: 5, label: '视觉提示词', hint: '为每个场景生成 16:9 横版视觉提示词'},
  {id: 6, label: '配音脚本', hint: '生成 voice preset 与分镜配音文本'},
  {id: 7, label: 'Remotion 项目生成', hint: '确认项目载体、composition 与构建状态'},
  {id: 8, label: '渲染设置', hint: '模板与质量建议'},
];

export const DEFAULT_SHOTS: Shot[] = [
  {id: 'default-1', title: '默认场景', narration: '', durationSeconds: 0, prompt: '', imageUrl: ''},
];

export function getStepOutputPreview(stepId: WorkflowStepId, pipelineState: Record<string, any>, shotsState: Shot[]) {
  if (stepId === 1) return pipelineState.analysis?.thesis || '还没有分析内容';
  if (stepId === 2) return pipelineState.titles?.options?.[0]?.title || '还没有标题候选';
  if (stepId === 3) return pipelineState.copy?.hook || '还没有文案内容';
  if (stepId === 4) return shotsState[0]?.title ? `共 ${shotsState.length} 个场景` : '还没有场景编排';
  if (stepId === 5) {
    return pipelineState.prompts?.byShotId
      ? `已生成 ${Object.keys(pipelineState.prompts.byShotId).length} 条视觉提示词`
      : '还没有视觉提示词';
  }
  if (stepId === 6) return pipelineState.voice?.preset || '还没有配音脚本';
  if (stepId === 7) return pipelineState.projectBuild?.compositionId || '还没有项目构建信息';
  if (stepId === 8) return pipelineState.render?.template || '还没有渲染设置';
  return '待生成';
}
