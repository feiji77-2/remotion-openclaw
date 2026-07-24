import {readFileSync} from "node:fs";

const catalogUrl = new URL(
  "../../src/components/ultimate-kit/families/skill-showcase/productionComponentCatalog.json",
  import.meta.url,
);

export const productionComponentCatalog = JSON.parse(
  readFileSync(catalogUrl, "utf8"),
);

const INTENT_RULES = [
  {key: "code-change", shotKind: "code-diff", pattern: /diff|git|代码行|源码|文件变更|修改(?:代码|文件)|删除(?:旧)?(?:逻辑|代码|文件)|新增(?:代码|缓存|参数)|patch|\bPR\b/i},
  {key: "command-execution", shotKind: "terminal-execution", pattern: /终端|命令|npm|pnpm|yarn|shell|CI|执行|构建|安装|运行|stdout|exit code/i},
  {key: "configuration", shotKind: "config-check", pattern: /配置|JSON|YAML|AGENTS|env|环境变量|规则|开关|参数|schema/i},
  {key: "interface-audit", shotKind: "interface-audit", pattern: /审计|检查器|Inspector|定位|扫描|标红|问题|按钮|无障碍|A11y|布局错误/i},
  {key: "browser-interaction", shotKind: "browser-demo", pattern: /浏览器|DevTools|DOM|页面|viewport|网页|点击|交互|web/i},
  {key: "process-flow", shotKind: "flow-trace", pattern: /流程|链路|步骤|第一步|第二步|第三步|输入|输出|追踪|trace|流转|路径|阶段|先.*再/i},
  {key: "verification", shotKind: "test-report", pattern: /测试|断言|通过|失败|回归|复检|coverage|验证|验收|verify|test/i},
  {key: "asset-selection", shotKind: "asset-library", pattern: /素材库|组件库|组件|动画|模板|资源|素材|library|asset/i},
  {key: "system-architecture", shotKind: "system-map", pattern: /系统图|架构|Prompt|Skill|Token|设计系统|模块|关系图|registry|renderer/i},
  {key: "comparison", shotKind: "before-after", pattern: /对比|前后|之前|之后|旧.*新|不是.*而是|左边|右边|\bVS\b|变化|差异/i},
  {key: "metric", shotKind: "metric-highlight", pattern: /\d+(?:[.,]\d+)?\s*(?:K|万|亿|\+|%|条|套|种|个|倍|秒|分钟|帧)/i},
];

const compactText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export const resolveSemanticIntent = (captionText, {sceneIndex = 0, sceneCount = 1} = {}) => {
  const text = compactText(captionText);
  const matched = INTENT_RULES.find((rule) => rule.pattern.test(text));
  if (matched) {
    return {
      key: matched.key,
      shotKind: matched.shotKind,
      confidence: 1,
      signals: [matched.key],
      sourceText: text,
    };
  }
  const isOpening = sceneIndex === 0;
  const isConclusion = sceneIndex === Math.max(0, sceneCount - 1) || /最后|总结|结论|所以|因此|本质|核心判断/u.test(text);
  return {
    key: isConclusion ? "conclusion" : isOpening ? "opening" : "concept-explanation",
    shotKind: "concept-explainer",
    confidence: 0.72,
    signals: [isConclusion ? "conclusion" : isOpening ? "opening" : "explanation"],
    sourceText: text,
  };
};

const requiredPathPresent = (value, requiredPath) => {
  const segments = requiredPath.split(".");
  let current = value;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) return false;
    current = current[segment];
  }
  return Array.isArray(current) ? current.length > 0 : current !== undefined && current !== null && String(current).trim().length > 0;
};

export const resolveProductionComponent = ({intent, shot, lens, orientation = "portrait"}) => {
  const compatible = productionComponentCatalog.components.filter((component) =>
    component.productionReady
    && component.orientation === orientation
    && component.compatibleIntents.includes(intent.key)
    && component.compatibleShotKinds.includes(shot.kind),
  );
  const descriptor = compatible[0] ?? null;
  if (!descriptor) {
    return {
      componentId: "production-fallback",
      descriptor: null,
      resolution: "error",
      diagnostics: [{
        level: "error",
        code: "visual.component.unmatched",
        message: `No production component matches intent=${intent.key}, shot=${shot.kind}, orientation=${orientation}`,
      }],
    };
  }
  const missing = descriptor.requiredData.filter((path) => !requiredPathPresent({shot, lens}, path));
  if (missing.length > 0) {
    return {
      componentId: "production-fallback",
      descriptor: null,
      resolution: "error",
      diagnostics: missing.map((path) => ({
        level: "error",
        code: "visual.component.data-missing",
        message: `${descriptor.componentId} requires ${path}`,
      })),
    };
  }
  return {
    componentId: descriptor.componentId,
    descriptor,
    resolution: "matched",
    diagnostics: [],
  };
};

export const assertProductionComponentCatalog = () => {
  const ids = new Set();
  for (const descriptor of productionComponentCatalog.components) {
    if (!descriptor.componentId || ids.has(descriptor.componentId)) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] duplicate or empty componentId: ${descriptor.componentId}`);
    }
    ids.add(descriptor.componentId);
    if (!descriptor.rendererId || !descriptor.productionReady) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] ${descriptor.componentId} is not a production descriptor`);
    }
    if (!descriptor.compatibleIntents.length || !descriptor.compatibleShotKinds.length || !descriptor.requiredData.length) {
      throw new Error(`[PRODUCTION_COMPONENT_CATALOG_INVALID] ${descriptor.componentId} has an incomplete compatibility contract`);
    }
  }
  return productionComponentCatalog;
};

assertProductionComponentCatalog();
