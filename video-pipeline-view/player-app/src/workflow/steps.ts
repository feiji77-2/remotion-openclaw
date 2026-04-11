import type {Shot, StepMeta, WorkflowStepId} from './types';

export const STEP_LIST: StepMeta[] = [
  {id: 1, label: '逻辑分析', hint: '确定受众、主命题、核心承诺'},
  {id: 2, label: '标题生成', hint: '产出标题候选并预选'},
  {id: 3, label: '内容生成', hint: '生成 Hook / Body / CTA'},
  {id: 4, label: '分镜结构', hint: '按镜头组织内容结构'},
  {id: 5, label: '分镜图提示词', hint: '为每镜生成视觉提示词'},
  {id: 6, label: '配音脚本', hint: '生成 voice preset 与分镜配音文本'},
  {id: 7, label: 'Remotion 项目生成', hint: '确认项目载体、composition 与构建状态'},
  {id: 8, label: '渲染设置', hint: '模板与质量建议'},
];

export const DEFAULT_SHOTS: Shot[] = [
  {id: 'shot-01', title: '开场钩子', narration: '先抛出一个足够抓人的问题或判断。', durationSeconds: 4},
  {id: 'shot-02', title: '核心信息 1', narration: '先给第一条关键事实。', durationSeconds: 5},
  {id: 'shot-03', title: '核心信息 2', narration: '继续推进第二条信息。', durationSeconds: 5},
  {id: 'shot-04', title: '对比拆解', narration: '把差异、判断和关键解释讲透。', durationSeconds: 6},
  {id: 'shot-05', title: '案例落地', narration: '补一个真实场景或结果落点。', durationSeconds: 5},
  {id: 'shot-06', title: '收尾互动', narration: '最后收口并推动评论或继续追更。', durationSeconds: 4},
];

export function getStepOutputPreview(stepId: WorkflowStepId, pipelineState: Record<string, any>, shotsState: Shot[]) {
  if (stepId === 1) return pipelineState.analysis?.thesis || '还没有分析内容';
  if (stepId === 2) return pipelineState.titles?.options?.[0]?.title || '还没有标题候选';
  if (stepId === 3) return pipelineState.copy?.hook || '还没有文案内容';
  if (stepId === 4) return shotsState[0]?.title ? `共 ${shotsState.length} 个镜头` : '还没有分镜结构';
  if (stepId === 5) {
    return pipelineState.prompts?.byShotId
      ? `已生成 ${Object.keys(pipelineState.prompts.byShotId).length} 条提示词`
      : '还没有提示词';
  }
  if (stepId === 6) return pipelineState.voice?.preset || '还没有配音脚本';
  if (stepId === 7) return pipelineState.projectBuild?.compositionId || '还没有项目构建信息';
  if (stepId === 8) return pipelineState.render?.template || '还没有渲染设置';
  return '待生成';
}
