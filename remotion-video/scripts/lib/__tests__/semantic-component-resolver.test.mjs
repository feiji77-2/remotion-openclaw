import {describe, expect, it} from 'vitest';
import {
  productionComponentCatalog,
  resolveProductionComponent,
  resolveSemanticIntent,
} from '../semantic-component-resolver.mjs';

const samples = [
  ['浏览器打开页面，DevTools 显示 DOM ready。', 'browser-interaction', 'browser-demo'],
  ['终端执行 npm run build，stdout 输出完成。', 'command-execution', 'terminal-execution'],
  ['git diff 展示新增的代码行。', 'code-change', 'code-diff'],
  ['修改 JSON 配置并启用规则开关。', 'configuration', 'config-check'],
  ['用 Inspector 审计按钮的无障碍问题。', 'interface-audit', 'interface-audit'],
  ['输入经过 resolver 再流转到 renderer。', 'process-flow', 'flow-trace'],
  ['测试报告显示 42 条断言全部通过。', 'verification', 'test-report'],
  ['组件库选择与口播匹配的模板资源。', 'asset-selection', 'asset-library'],
  ['架构图连接 Prompt、Skill 和 Renderer。', 'system-architecture', 'system-map'],
  ['旧方案不是新方案，前后差异必须可见。', 'comparison', 'before-after'],
  ['效率提升 68%，并且只用 2 秒。', 'metric', 'metric-highlight'],
  ['这是一句没有技术操作的知识解释。', 'opening', 'concept-explainer'],
];

describe('semantic production component resolver', () => {
  it.each(samples)('maps caption semantics: %s', (text, intentKey, shotKind) => {
    const intent = resolveSemanticIntent(text, {sceneIndex: 0, sceneCount: 2});
    expect(intent).toMatchObject({key: intentKey, shotKind});
  });

  it('resolves every declared intent/shot pair to a production component', () => {
    for (const descriptor of productionComponentCatalog.components) {
      const intent = {key: descriptor.compatibleIntents[0], shotKind: descriptor.compatibleShotKinds[0]};
      const shot = {
        kind: descriptor.compatibleShotKinds[0],
        environment: 'test',
        target: 'target',
        before: 'before',
        after: 'after',
        command: 'npm test',
        path: 'project.json',
        metric: '42',
        evidence: ['evidence'],
      };
      const lens = {objective: 'objective'};
      expect(resolveProductionComponent({intent, shot, lens})).toMatchObject({
        componentId: descriptor.componentId,
        resolution: 'matched',
        diagnostics: [],
      });
    }
  });

  it('returns an explicit diagnostic instead of silently falling back', () => {
    const result = resolveProductionComponent({
      intent: {key: 'command-execution'},
      shot: {kind: 'terminal-execution', environment: 'Terminal', target: 'stdout', evidence: []},
      lens: {objective: 'run the command'},
    });
    expect(result).toMatchObject({componentId: 'production-fallback', resolution: 'error'});
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code: 'visual.component.data-missing'})]));
  });
});
